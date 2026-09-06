// DeterministicProvider: routes an utterance to an action and fills its fields
// with no network call. This is the always-available baseline that makes AI Mode
// work for free and offline. Every value carries provenance (explicit / guessed /
// not_provided) so the confirmation check can mark guessed fields.
// See docs/ai-mode/02-implementation-plan.md.
import type { AiAction, AiParseContext, AiProvider, FieldValue, Intent, ReceiptSubtype } from '../types';
import { getFieldSpecs } from '../fieldSpecs';
import {
  classifyTimesheetOp,
  cleanRemainder,
  domainName,
  extractAttachments,
  extractBrand,
  extractCartridgeStatus,
  extractCity,
  extractEmail,
  extractEmployeeName,
  extractModel,
  extractMoney,
  extractName,
  extractOrderId,
  extractPhone,
  extractProvince,
  extractQuantity,
  extractShippingCost,
  extractTracking,
  extractType,
  extractUrl,
  todayIso,
} from '../extract';
import { emptyShipmentItem } from '../shipping';

// Keyword groups per action. First match wins. Explicit noun-intents (orders,
// notes, inventory, directory) are checked before the receipt subtypes so a
// category word like "shipping" inside "add directory link ... shipping" does not
// get mistaken for a shipping receipt.
const ROUTES: Array<{ action: AiAction; subtype?: ReceiptSubtype; words: string[]; patterns?: RegExp[] }> = [
  { action: 'cartridge_status', words: ['mark ready', 'set status', 'picked up', 'is ready', 'change status', 'mark as'] },
  { action: 'cartridge_list', words: ['list orders', 'show orders', 'pending orders', 'all orders', 'open orders'] },
  { action: 'cartridge_modify', words: ['modify order', 'edit order', 'update order', 'change order'] },
  // "record a refill" is the Phase-2 presentation name for logging a cartridge
  // order (the id and Firestore stay cartridge_*). Kept specific ("record a
  // refill", not bare "record") so "record a note" still routes to note.
  { action: 'cartridge_create', words: ['new order', 'cartridge order', 'refill order', 'create order', 'log an order', 'record a refill', 'record refill'] },
  // Timesheet cues are distinctive (punch/clock verbs, "timesheet", "add
  // employee"), so this sits with the other explicit noun-intents. The single
  // action fans into punch_in / punch_out / view / add_employee in
  // populateIntentFields (classifyTimesheetOp). See PHASE-2.md item 6.
  {
    action: 'timesheet',
    words: [
      'clock in', 'clock out', 'clock-in', 'clock-out', 'clocked in', 'clocked out',
      'punch in', 'punch out', 'punch the clock', 'punch clock', 'punch',
      'timesheet', 'time sheet', 'timecard', 'time card',
      'add employee', 'new employee', 'on the clock', 'hours for',
    ],
  },
  { action: 'directory', words: ['directory', 'website', 'bookmark', 'add link', 'save link'] },
  // A READ lookup ("is the HP 65 in stock?", "do we have", "price of", "where is
  // that key") must be checked BEFORE the inventory WRITE and before track, so a
  // stock/price/key question is answered instead of opening an edit or a parcel
  // trace. Its cues are question-shaped so a write like "mark X in stock" still
  // routes to inventory.
  {
    action: 'inventory_lookup',
    words: [
      'in stock?',
      'do we have',
      'do we carry',
      'have any',
      'price of',
      'how much is',
      'how much for',
      "what's the price",
      'whats the price',
      'where is the key',
      "where's the key",
      'where is that key',
      'location of',
    ],
  },
  {
    action: 'inventory',
    words: ['inventory', 'in stock', 'out of stock', 'restock', 'key model'],
    // A write verb aimed at a stock count, so "set KW1 to 10 units" or "adjust the
    // HP 65 quantity" route to the inventory editor.
    patterns: [/\b(set|add|adjust|update|change|restock|remove|reduce)\b[^.?!]*\b(stock|units?|qty|quantity|count|shelf|on hand)\b/i],
  },
  { action: 'note', words: ['note', 'remember', 'jot'] },
  // Only explicit tracking verbs route here. A bare courier name (from a Track
  // pill) or a lone tracking number falls back to track after the receipt routes,
  // so a shipping receipt that names its courier is not mistaken for a lookup.
  { action: 'track', words: ['track', 'where is', 'trace'] },
  { action: 'receipt', subtype: 'refill', words: ['refill', 'refilled', 'toner refill'] },
  // Explicit shipment words only. A bare courier name is deliberately NOT here: on
  // its own it is a tracking lookup ("UPS 2818387529719764"), and a courier named
  // with a real sale signal (price/province/destination) is caught as a shipping
  // receipt by the courier+sale-signal fallback further down. Putting the courier
  // here would misroute every parcel trace into a receipt.
  { action: 'receipt', subtype: 'shipping', words: ['ship', 'shipment', 'courier', 'parcel', 'drop off', 'dropoff'] },
  {
    action: 'receipt',
    subtype: 'key',
    words: ['key cut', 'key cutting', 'cut a key', 'key copy', 'copy a key'],
    // Phrase-tolerant: any cut/copy/duplicate verb near "key(s)", so "cut 2 keys"
    // and "make me 3 key copies" both land here.
    patterns: [
      /\bkeys?\b[^.?!]*\b(?:cut|copy|copies|duplicat\w*|made|make)\b/i,
      /\b(?:cut|copy|copies|duplicat\w*)\b[^.?!]*\bkeys?\b/i,
    ],
  },
  { action: 'receipt', subtype: 'supplies', words: ['purchase', 'buy', 'bought', 'sold', 'sale', 'supply', 'supplies'] },
];

// Separators between shipment pieces: "and"/"plus"/"+", a semicolon, a newline, or
// a comma that is NOT inside a number (so "$1,299.99" stays whole). A comma also
// separates fields within one item ("to Vancouver, UPS, $22"), so the pieces are
// regrouped below, not taken as items one-for-one.
const SHIPMENT_PIECE_SPLIT = /\s*(?:,(?!\d)|\band\b|\bplus\b|\+|;|\n)\s*/i;

const pieceHasCourier = (piece: string): boolean => {
  const { courier, trackingNumber } = extractTracking(piece);
  return Boolean(courier || trackingNumber);
};

// Courier names, used to break a run-on shipment into items when there is no
// punctuation between them ("... UPS ... $53 fedex ... $33").
const COURIER_TOKENS = /\b(ups|fedex|fed\s?ex|purolator|canada\s?post|dhl)\b/gi;

// Split one chunk at each courier name after the first, so several parcels typed
// with no separator still become separate items. Text before the first courier
// (a leading customer name) is dropped from the items; receipt-level name/phone
// extraction reads the whole utterance separately. Returns the chunk unchanged
// when it names fewer than two couriers.
function splitByCourier(chunk: string): string[] {
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  COURIER_TOKENS.lastIndex = 0;
  while ((m = COURIER_TOKENS.exec(chunk)) !== null) starts.push(m.index);
  if (starts.length < 2) return [chunk];
  return starts.map((start, i) => chunk.slice(start, starts[i + 1] ?? chunk.length).trim()).filter(Boolean);
}

// Parse one or more shipment items from a shipping utterance. Pieces are grouped
// into items: a new item starts only when a piece names a NEW courier/tracking
// while the current item already has one, so "UPS to Toronto ON $22 and FedEx to
// Vancouver BC $30" is two items but "to Vancouver, UPS, $22" is one. Always
// returns at least one item so the editor has a row.
function extractShipmentItems(text: string) {
  const base = emptyShipmentItem();
  const build = (piece: string) => {
    const { courier, trackingNumber } = extractTracking(piece);
    return {
      ...emptyShipmentItem(),
      courier: courier ?? '',
      trackingNumber: trackingNumber ?? '',
      city: extractCity(piece) ?? '',
      province: extractProvince(piece) ?? base.province,
      cost: extractShippingCost(piece, trackingNumber, extractPhone(piece)) ?? null,
    };
  };

  const pieces = text.split(SHIPMENT_PIECE_SPLIT).map((s) => s.trim()).filter(Boolean);
  const groups: string[] = [];
  let current: string | null = null;
  for (const piece of pieces) {
    if (current === null) current = piece;
    else if (pieceHasCourier(piece) && pieceHasCourier(current)) {
      groups.push(current);
      current = piece;
    } else current = `${current} ${piece}`;
  }
  if (current !== null) groups.push(current);

  // Each grouped piece may still name several couriers with no separator between
  // them; break those apart so every parcel is its own item.
  const chunks = groups.flatMap(splitByCourier);
  const items = chunks
    .map(build)
    .filter((it) => it.courier || it.trackingNumber || it.cost != null || it.city);
  return items.length > 0 ? items : [build(text)];
}

// Signals that a courier/tracking utterance is a shipment SALE (a receipt), not a
// bare parcel trace: a stated price, a Canadian province, a decimal amount, or a
// "to <Place>" destination. A lone courier or tracking number has none of these.
function looksLikeShipmentSale(text: string): boolean {
  return (
    extractMoney(text) !== null ||
    extractProvince(text) !== null ||
    /\b\d{1,4}\.\d{2}\b/.test(text) ||
    /\bto\s+[A-Z][a-z]+/.test(text)
  );
}

const RECEIPT_HINT = ['receipt', 'invoice'];

// Words that make an inventory utterance a WRITE (add or change stock). Their
// absence, on a lone code, is what marks a read lookup.
const INVENTORY_WRITE_VERB =
  /\b(add|added|set|mark|marked|restock|restocked|remove|removed|update|updated|change|changed|received|count|counted|out of stock|in stock)\b/i;

// A lone SKU / key code, optionally ending in "?", e.g. "KW1", "KW1?", "SC4",
// "564XL", "5268". This is a price / stock / location lookup, not a stock edit,
// so it routes to inventory_lookup. Requires the whole utterance to be that one
// token (so a real sentence is never swallowed) and no write verb present.
function looksLikeInventoryLookup(text: string): boolean {
  const t = text.trim().replace(/\?+$/, '').trim();
  if (INVENTORY_WRITE_VERB.test(text)) return false;
  // One short alphanumeric token that contains a digit: a key code (KW1, SC4) or a
  // cartridge SKU (564XL, TN660), whichever way the letters and digits fall.
  return /^[A-Za-z0-9]{2,7}$/.test(t) && /\d/.test(t);
}

// Provenance helpers.
const explicit = <T>(value: T): FieldValue<T> => ({ value, source: 'explicit' });
const guessed = <T>(value: T, reason: string): FieldValue<T> => ({ value, source: 'guessed', reason });
const absent = (): FieldValue<unknown> => ({ value: null, source: 'not_provided' });

// Try an explicit extraction; fall back to a guessed default; else not_provided.
function fieldFrom<T>(found: T | null, fallback?: { value: T; reason: string }): FieldValue<unknown> {
  if (found !== null && found !== undefined) return explicit(found);
  if (fallback) return guessed(fallback.value, fallback.reason);
  return absent();
}

// Fill the fields declared by a spec, using the right extractor per key.
function fillFields(specKeys: string[], text: string): Record<string, FieldValue<unknown>> {
  const fields: Record<string, FieldValue<unknown>> = {};
  for (const key of specKeys) {
    switch (key) {
      case 'date':
        fields[key] = guessed(todayIso(), "today's date");
        break;
      case 'gst':
        fields[key] = guessed(true, 'GST applied by default');
        break;
      case 'quantity':
        fields[key] = fieldFrom(extractQuantity(text), { value: 1, reason: 'defaulted to 1' });
        break;
      case 'brand':
        fields[key] = fieldFrom(extractBrand(text));
        break;
      case 'type':
        fields[key] = fieldFrom(extractType(text));
        break;
      case 'model':
        fields[key] = fieldFrom(extractModel(text));
        break;
      case 'price':
        fields[key] = fieldFrom(extractMoney(text));
        break;
      case 'customerName':
        fields[key] = fieldFrom(extractName(text));
        break;
      case 'customerPhone':
        fields[key] = fieldFrom(extractPhone(text));
        break;
      case 'customerEmail':
        fields[key] = fieldFrom(extractEmail(text));
        break;
      case 'orderId':
        fields[key] = fieldFrom(extractOrderId(text));
        break;
      case 'status':
        fields[key] = fieldFrom(extractCartridgeStatus(text));
        break;
      case 'url':
        fields[key] = fieldFrom(extractUrl(text));
        break;
      case 'linkName':
        fields[key] = fieldFrom(domainName(extractUrl(text) ?? ''));
        break;
      case 'noteCategory':
        fields[key] = guessed('General', 'default category');
        break;
      case 'linkCategory':
        fields[key] = guessed('other', 'default category');
        break;
      case 'inStock':
        fields[key] = guessed(true, 'in stock by default');
        break;
      // Free-text bodies: seed from the leftover words, else leave for the user.
      case 'content':
      case 'item':
      case 'keyName':
        fields[key] = fieldFrom(cleanRemainder(text));
        break;
      // Free-text fields we cannot reliably auto-fill: leave for the user.
      case 'supply':
      case 'keyModel':
      case 'notes':
      case 'linkDescription':
      default:
        fields[key] = absent();
        break;
    }
  }
  return fields;
}

export class DeterministicProvider implements AiProvider {
  readonly name = 'deterministic';

  async parse(utterance: string, context?: AiParseContext): Promise<Intent> {
    const text = utterance;
    const lower = utterance.toLowerCase();

    // The user corrected a misroute: take the forced action as given and only
    // run extraction. Confidence 1 because the human chose it.
    if (context?.forceAction) {
      const forced: Intent = {
        action: context.forceAction,
        subtype: context.forceSubtype,
        fields: {},
        confidence: 1,
      };
      populateIntentFields(forced, text);
      return forced;
    }

    let action: AiAction = 'unknown';
    let subtype: ReceiptSubtype | undefined;
    let confidence = 0;
    let runnerUp: Intent['runnerUp'];

    // Content-based routing for a cartridge status change: a status word, plus an
    // order id or a clear "mark/set/order/status" cue. This catches phrasings the
    // fixed keyword list misses (e.g. "mark ORD-AB12CD as ready"). Strong signal.
    // A status CHANGE needs an order id or an explicit change verb. A bare mention
    // of "pickup" is not enough (e.g. "dropped off a Canon for pickup" is a new
    // order, not a status change), so the guard no longer fires on "order"/"pickup"
    // alone.
    const statusHint = extractCartridgeStatus(text);
    if (statusHint && (extractOrderId(text) || /\b(mark|marked|set|change|update|status)\b/i.test(lower))) {
      action = 'cartridge_status';
      confidence = 0.8;
    }

    // A lone SKU / key code, with or without a trailing "?", is a READ lookup of
    // its price / stock / location, not a stock edit. Inventory WRITES always carry
    // a verb (add, mark, restock, set, out of stock); a bare code does not. This
    // decides it deterministically so "KW1" and "KW1?" never depend on the model,
    // which tends to guess the write. See the inventory_lookup route below.
    if (action === 'unknown' && looksLikeInventoryLookup(text)) {
      action = 'inventory_lookup';
      confidence = 0.8;
    }

    if (action === 'unknown') {
      // Score every route by how many of its keywords hit. The DECISION is
      // unchanged from the original first-match-wins: the winner is the earliest
      // matching route in priority order. Scores only grade confidence and pick a
      // runner-up (the next matching route of a different action), so the
      // confirmation card can offer a one-tap correction on a close call.
      const matches = ROUTES.map((route) => ({
        route,
        hits:
          route.words.filter((w) => lower.includes(w)).length +
          (route.patterns?.filter((re) => re.test(text)).length ?? 0),
      })).filter((m) => m.hits > 0);

      if (matches.length > 0) {
        const winner = matches[0];
        action = winner.route.action;
        subtype = winner.route.subtype;

        const alt = matches.find((m) => m.route.action !== action);
        const closeCall = !!alt && alt.hits >= winner.hits;
        // Base trust for a keyword hit, plus a little for extra corroborating
        // words; a genuine cross-action ambiguity pulls it down so the LLM gate
        // and the top-2 prompt both engage.
        confidence = Math.min(0.92, 0.7 + 0.08 * (winner.hits - 1));
        if (closeCall) {
          confidence = Math.min(confidence, 0.5);
          runnerUp = { action: alt.route.action, subtype: alt.route.subtype };
        }
      }
    }

    if (action === 'unknown' && RECEIPT_HINT.some((w) => lower.includes(w))) {
      action = 'receipt';
      confidence = 0.4;
    }

    // Bare courier name or lone tracking number, with no other intent: a lookup.
    // This is what a Track pill (which prepends just the courier) relies on. A
    // courier or a full tracking number is unambiguous, so trust it. But a price in
    // the same breath means this is a shipping SALE being rung up (a receipt), not a
    // parcel trace, so route it to a shipping receipt instead.
    if (action === 'unknown') {
      const { courier, trackingNumber } = extractTracking(text);
      if (courier || trackingNumber) {
        if (looksLikeShipmentSale(text)) {
          action = 'receipt';
          subtype = 'shipping';
          confidence = 0.75;
        } else {
          action = 'track';
          confidence = 0.75;
        }
      }
    }

    const intent: Intent = { action, subtype, fields: {}, confidence, runnerUp };
    populateIntentFields(intent, text);
    return intent;
  }
}

// Fill an intent's fields from the utterance, given its action/subtype are already
// set. Shared by the deterministic provider and the LLM provider: the LLM only
// decides routing; extraction and provenance stay here so a bad LLM response
// degrades to exactly the deterministic result and the model never touches
// business values. Mutates intent.fields in place.
export function populateIntentFields(intent: Intent, text: string): void {
  const { action, subtype } = intent;

  // Timesheet fans into ops via a classifier; it does not use the generic
  // spec-driven filler. `op` decides both the executor branch and (for
  // add_employee) which confirmation spec getFieldSpecs returns. Handled up front
  // and returned so the generic path never runs for it.
  if (action === 'timesheet') {
    const op = classifyTimesheetOp(text);
    const name = extractEmployeeName(text);
    intent.fields = {
      op: explicit(op),
      employeeName: name ? explicit(name) : absent(),
    };
    return;
  }

  // Fill fields for actions that have a confirmation spec.
  const specs = getFieldSpecs(intent);
  if (specs) {
    intent.fields = fillFields(specs.map((s) => s.key), text);
  }

  // Shipping carries a repeated item block. Seed one item from whatever the
  // utterance names (courier, tracking, province, cost); the rest is confirmed
  // in the item editor.
  if (action === 'receipt' && subtype === 'shipping') {
    intent.fields.shipmentItems = { value: extractShipmentItems(text), source: 'explicit' };
  }

  // Tracking has no confirmation spec; fill courier + number directly.
  if (action === 'track') {
    const { courier, trackingNumber } = extractTracking(text);
    intent.fields = {
      courier: courier
        ? { value: courier, source: 'explicit' }
        : { value: null, source: 'not_provided' },
      trackingNumber: trackingNumber
        ? { value: trackingNumber, source: 'explicit' }
        : { value: null, source: 'not_provided' },
    };
  }

  // Inventory lookup is a read with no confirmation spec; fill a search term the
  // executor uses to match keyInventory / refillInventory. Prefer a brand/model
  // the extractors found, else the salient words left after removing the question
  // scaffolding. The executor tokenizes and matches, so this need not be exact.
  if (action === 'inventory_lookup') {
    const brand = extractBrand(text);
    const model = extractModel(text);
    const bm = [brand, model].filter(Boolean).join(' ');
    const cleaned = text
      .toLowerCase()
      .replace(
        /\b(?:is|are|do|does|did|we|the|a|an|any|have|carry|got|in|out|of|stock|price|priced|cost|costs|how|much|for|where|located|location|whats|what)\b/gi,
        ' ',
      )
      .replace(/['?.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const query = bm || cleaned;
    intent.fields = {
      query: query ? explicit(query) : absent(),
      brand: brand ? explicit(brand) : absent(),
      model: model ? explicit(model) : absent(),
    };
  }

  // The compound chain: note any pay/label side actions the utterance asked for.
  // The confirmation slip renders these as toggles; on Confirm, the chain runs
  // them after the primary action. Left unset when neither cue is present.
  const attach = extractAttachments(text);
  if (attach) intent.attach = attach;
}
