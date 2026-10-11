// DeterministicProvider: routes an utterance to an action and fills its fields
// with no network call. This is the always-available baseline that makes AI Mode
// work for free and offline. Every value carries provenance (explicit / guessed /
// not_provided) so the confirmation check can mark guessed fields.
// See docs/ai-mode/02-implementation-plan.md.
import type { AiAction, AiParseContext, AiProvider, FieldValue, Intent, ReceiptSubtype } from '../types';
import { getFieldSpecs } from '../fieldSpecs';
import {
  NOTE_LEAD,
  normalizeUtterance,
  extractCountry,
  bareAmounts,
  classifyTimesheetOp,
  courierLabel,
  describeKey,
  describeNote,
  describeSale,
  describeStockItem,
  domainName,
  extractAttachments,
  extractBrand,
  extractKeyMake,
  KEY_MAKES,
  cleanInventoryQuery,
  extractCartridgeStatus,
  extractCity,
  extractEmail,
  extractEmployeeName,
  extractInStock,
  extractKeyItems,
  extractKeyLocationOp,
  extractModel,
  extractMoney,
  extractName,
  extractOrderId,
  extractPacking,
  extractPhone,
  extractPrice,
  extractProvince,
  extractSaleQuantity,
  extractShiftAdjustment,
  extractShippingCost,
  extractTaxToggle,
  extractTracking,
  extractType,
  extractUrl,
  hasCue,
  provinceOfCity,
  stripPacking,
  todayIso,
} from '../extract';
import { emptyShipmentItem } from '../shipping';
import { describeDays, parseDays, parseTimeRange } from '@/lib/shiftParse';
import { formatTime12 } from '@/lib/schedule';

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
// punctuation between them ("... UPS ... $53 fedex ... $33"). Letter-boundaries
// (not \b word-boundaries) so a courier glued to digits still matches
// ("...4167382277fedex..."), while "groups"/"backups" do not.
const COURIER_TOKENS = /(?<![a-z])(ups|fed\s?ex|puro(?:lator)?|canada\s?post|dhl)(?![a-z])/gi;

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
// into items: a new item starts only when a piece names a courier while the
// current item already has one (or a second tracking number), so "UPS to Toronto
// ON $22 and FedEx to Vancouver BC $30" is two items but "to Vancouver, UPS, $22"
// and "ups, 1Z999AA10123456784, to toronto" are one. Always returns at least one
// item so the editor has a row.
function extractShipmentItems(text: string) {
  const base = emptyShipmentItem();
  const build = (piece: string) => {
    const match = extractTracking(piece);
    const { trackingNumber } = match;
    const city = extractCity(piece) ?? '';
    const country = extractCountry(piece);
    return {
      ...emptyShipmentItem(),
      courier: courierLabel(match),
      trackingNumber: trackingNumber ?? '',
      city,
      // A known Canadian city supplies its province; unknown and foreign cities do not.
      province: country && country !== 'Canada' ? '' : extractProvince(piece) ?? provinceOfCity(city) ?? (city ? '' : base.province),
      country: country ?? base.country,
      // Strip packing ("box $5") before pricing so a packing amount interleaved
      // among the shipment fields is never taken as the shipping cost.
      cost: extractShippingCost(stripPacking(piece), trackingNumber, extractPhone(piece)) ?? null,
    };
  };

  const pieces = text.split(SHIPMENT_PIECE_SPLIT).map((s) => s.trim()).filter(Boolean);
  const groups: string[] = [];
  let current: string | null = null;
  for (const piece of pieces) {
    // A courier counts when it is named in words: a "1Z..." number implies UPS,
    // but it belongs to the UPS already named, it does not start a second parcel.
    const names = (t: string) => new RegExp(COURIER_TOKENS.source, 'i').test(t);
    const nextDestination = current !== null && Boolean(extractCity(piece)) &&
      extractShippingCost(stripPacking(piece)) !== null && Boolean(extractCity(current)) &&
      extractShippingCost(stripPacking(current)) !== null;
    const inherited = current !== null ? courierLabel(extractTracking(current)) : '';
    const second =
      current !== null &&
      ((names(piece) && names(current)) || nextDestination ||
        Boolean(extractTracking(piece).trackingNumber && extractTracking(current).trackingNumber));
    if (current === null) current = piece;
    else if (second) {
      groups.push(current);
      current = !names(piece) && nextDestination && inherited ? `${inherited} ${piece}` : piece;
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
// bare parcel trace: a price (with or without the "$"), a province, a city, or a
// "to <Place>" destination. A lone courier or tracking number has none of these.
function looksLikeShipmentSale(text: string): boolean {
  const { trackingNumber } = extractTracking(text);
  return (
    extractMoney(text) !== null ||
    extractProvince(text) !== null ||
    extractCity(text) !== null ||
    bareAmounts(text, [trackingNumber]).length > 0
  );
}

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
  if (INVENTORY_WRITE_VERB.test(text) || /^\d{1,2}[x×]/i.test(t) || extractKeyItems(text).some((it) => it.qty > 1)) return false;
  // One short alphanumeric token that contains a digit: a key code (KW1, SC4) or a
  // cartridge SKU (564XL, TN660), whichever way the letters and digits fall.
  return /^[A-Za-z0-9]{2,7}$/.test(t) && /\d/.test(t) && /[A-Za-z]/.test(t);
}

// Several keys, or a key with a quantity, or the word "key" alongside a code:
// "2 kw1s 1 y1 and 2 sc4s", "2 kw1s", "kw1 x2". This is a key-cutting SALE, so it
// routes to a key receipt. A single bare code with no quantity is a lookup. A
// three-digit code ("TN660") is a cartridge far more often than a key blank, so on
// its own it is not enough to call the line a key order.
function looksLikeKeyOrder(text: string): boolean {
  const items = extractKeyItems(text).filter((it) => !/\d{3}$/.test(it.model));
  if (items.length === 0) return false;
  return items.length >= 2 || /\bkeys?\b/i.test(text) || items.some((it) => it.qty > 1) || /(?<![\d$.])\d{1,2}\s*x?\s+[A-Za-z]{1,3}\d/.test(text);
}

// --- Routing ----------------------------------------------------------------------
// One utterance, one route. The rules below are tried in order and the first that
// fits wins, so the order IS the priority: an explicit request word ("note",
// "refill", "sold") beats anything inferred from what the line happens to mention.
// Cue words match as whole words only. `weak` marks a guess made from shape alone
// (an item and a price, a brand name); those score under the trust threshold, so
// the LLM gets a say when it is on, the splitter does not treat them as a second
// action, and a slip that is already open takes them as an edit.
interface Route {
  action: AiAction;
  subtype?: ReceiptSubtype;
  confidence: number;
  weak?: boolean;
}
type Rule = (text: string) => Route | null;

const strong = (action: AiAction, confidence: number, subtype?: ReceiptSubtype): Route => ({ action, subtype, confidence });
const weak = (action: AiAction, subtype?: ReceiptSubtype): Route => ({ action, subtype, confidence: 0.6, weak: true });

const QUESTION_START = /^\s*(?:is|are|do|does|did|have|has|got|any|how|where|wheres|where's|which|what|whats|what's|check|can|could)\b/i;
const isQuestion = (text: string) => /\?\s*$/.test(text) || QUESTION_START.test(text);
const hasThing = (text: string) => extractKeyItems(text).length > 0 || extractBrand(text) !== null || extractModel(text) !== null;

const SERVICE_WORDS = [
  'print', 'printing', 'printed', 'printout', 'printouts', 'photocopy', 'photocopies', 'copies', 'fax', 'faxed',
  'faxing', 'scan', 'scanning', 'scanned', 'laminate', 'laminating', 'laminated', 'lamination', 'binding',
];

const RULES: Rule[] = [
  // A line that opens with "note" (or "remind me", "todo") is a note, whatever it
  // goes on to mention.
  (t) => (NOTE_LEAD.test(t) ? strong('note', 0.9) : null),

  (t) => hasCue(t, 'how do i', 'how do you', 'what can you do', 'can you email', 'can you make', 'could you email', 'how can i', 'email receipt', 'email receipts')
    ? strong('unknown', 0.9) : null,
  (t) => hasCue(t, 'directory', 'website', 'site', 'login', 'portal', 'login page') ||
    (hasCue(t, 'link') && pieceHasCourier(t)) ? strong('directory', 0.8) : null,
  (t) => hasCue(t, 'orders', 'refills', 'refill') &&
    (hasCue(t, 'list', 'show', 'what', 'whats', "what's", 'any', 'status') && extractMoney(t) === null)
    ? strong('cartridge_list', 0.8) : null,
  (t) => (hasCue(t, 'hours') || /^\s*swap\b/i.test(t)) ? strong('timesheet', 0.8) : null,
  (t) => hasThing(t) && (hasCue(t, 'received', 'came in') ||
    (hasCue(t, 'got') && /\b\d+\b.*\bin\b/i.test(t))) ? strong('inventory', 0.8) : null,

  // A cartridge status change: a status word plus an order id or a change verb.
  // A bare mention of "pickup" is not enough ("dropped off a Canon for pickup" is
  // a new order).
  (t) => {
    const status = extractCartridgeStatus(t);
    if (status && (extractOrderId(t) || /\b(mark|marked|set|change|update|status)\b/i.test(t))) return strong('cartridge_status', 0.8);
    return hasCue(t, 'mark ready', 'set status', 'picked up', 'is ready', 'change status', 'mark as') ? strong('cartridge_status', 0.75) : null;
  },

  // A board move/clear ("put SC1 in B3", "B3 is empty"). Before the lookup, so a
  // placing cue wins while a bare code ("B2") stays a lookup.
  (t) => (extractKeyLocationOp(t) ? strong('key_location', 0.9) : null),

  // Shifts and hours: the distinctive words, and the ways people ask who is in.
  (t) =>
    hasCue(
      t,
      'clock in', 'clock out', 'clock-in', 'clock-out', 'clocked in', 'clocked out', 'punch in', 'punch out',
      'punch the clock', 'punch clock', 'timesheet', 'time sheet', 'timecard', 'time card', 'add employee',
      'new employee', 'hire employee', 'onboard employee', 'register employee', 'create employee', 'hours for', 'shift', 'shifts', 'schedule',
    ) ||
    /\bwho(?:'?s|\s+is)?\s+(?:working|on|in|works|scheduled|here)\b/i.test(t) ||
    /\bwhen\s+(?:does|is|do|did)\s+\w+\s+work(?:ing)?\b/i.test(t) ||
    /\b(?:is|was)\s+\w+\s+(?:working|scheduled)\b/i.test(t)
      ? strong('timesheet', 0.8)
      : null,

  // A lone code is a lookup of its price / stock / spot. A lone number could be a
  // cartridge ("65") but is as likely an answer to a slip, so it is only a guess.
  (t) => {
    if (!looksLikeInventoryLookup(t)) return null;
    return /[A-Za-z]/.test(t) ? strong('inventory_lookup', 0.8) : weak('inventory_lookup');
  },

  // "where is ...": a parcel when it names a courier or a number, else a key.
  (t) => {
    if (!/\bwhere(?:'?s|\s+is|\s+are)\b/i.test(t)) return null;
    if (pieceHasCourier(t) || hasCue(t, 'package', 'parcel', 'shipment', 'order')) return strong('track', 0.8);
    return strong('inventory_lookup', 0.75);
  },

  // A question about stock or price is a lookup, never an edit.
  (t) => {
    const cue =
      hasCue(
        t,
        'do we have', 'do we carry', 'have any', 'got any', 'price of', 'price on', 'price for', 'how much',
        'how many', 'the price', 'check stock', 'stock check', 'which slot', 'which hook', 'what slot', 'location of',
      ) || /\bany\b.*\bleft\b/i.test(t);
    if (cue) return strong('inventory_lookup', 0.8);
    const make = extractKeyMake(t);
    if (make && /\b(?:keys?|blanks?)\b/i.test(t) && !INVENTORY_WRITE_VERB.test(t)) {
      // Only a bare make/noun phrase may imply stock without a question cue.
      // Extra tokens (names, codes, amounts, quantities or sale verbs) fall
      // through to the original routes. Do not strip "for" or sale verbs.
      const words = t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const bare = KEY_MAKES[make].some((alias) => {
        const rest = words.replace(new RegExp('\\b' + alias + '\\b'), ' ')
          .replace(/\b(?:the|a|an|please)\b/g, ' ').trim().split(/\s+/);
        return rest.length === 1 && /^(?:keys?|blanks?)$/.test(rest[0]);
      });
      const stockQuestion = /^(?:any)\b/i.test(words) || /\?\s*$/.test(t) ||
        /\b(?:is there|are there|in stock|what .*do we have)\b/i.test(t);
      const saleDetail = /\b(?:cut|copy|duplicate|dupe|make|made|need|needs|want|wants|sold|sell|charge|for|one|two|three|four|five|six|seven|eight|nine|ten|x\d+)\b|\d|[$£€]/i.test(t);
      // A question with extra free text can contain a customer name. Require
      // its remaining words to be stock vocabulary or the make itself.
      const stockOnly = KEY_MAKES[make].some((alias) => words
        .replace(new RegExp('\\b' + alias + '\\b'), ' ')
        .replace(/\b(?:keys?|blanks?|any|is|are|there|in|stock|left|the|a|an|please|we|have|do|what)\b/g, ' ')
        .trim() === '');
      if (bare || (stockQuestion && !saleDetail && stockOnly)) return strong('inventory_lookup', 0.8);
    }
    if (hasCue(t, 'in stock') && isQuestion(t)) return strong('inventory_lookup', 0.8);
    if (hasCue(t, 'price') && extractMoney(t) === null && !INVENTORY_WRITE_VERB.test(t) && hasThing(t)) return strong('inventory_lookup', 0.75);
    if (QUESTION_START.test(t) && /^\s*(?:is|are|do|does|have|has|got|any)\b/i.test(t) && hasThing(t) && !pieceHasCourier(t)) return strong('inventory_lookup', 0.75);
    return null;
  },

  // Telling us something ran out, or is back.
  (t) =>
    /\bno\s+more\b|\bnone\s+left\b|\bout\s+of\s+stock\b|\bsold\s+out\b|\bran\s+out\s+of\b|\b(?:we'?re|were|we\s+are|i'?m|im)\s+out\s+of\b|\bback\s+in\s+stock\b/i.test(t)
      ? strong('inventory', 0.8)
      : null,

  // The refill records: list them, change one, log a new one.
  (t) =>
    hasCue(t, 'list orders', 'show orders', 'pending orders', 'all orders', 'open orders') ||
    (/\b(?:list|show|see|pending|open|all|outstanding|what|which)\b[^.?!]*\b(?:orders|refills|records)\b/i.test(t) && extractMoney(t) === null)
      ? strong('cartridge_list', 0.8)
      : null,
  (t) => (hasCue(t, 'modify order', 'edit order', 'update order', 'change order') ? strong('cartridge_modify', 0.75) : null),
  (t) => {
    if (hasCue(t, 'new order', 'cartridge order', 'refill order', 'create order', 'log an order', 'log order', 'record a refill', 'record refill')) {
      return strong('cartridge_create', 0.8);
    }
    // A cartridge left with us to work on: "sarah dropped off an hp 65".
    const left = /\b(?:dropped|dropping|drops?|left|leaving|brought|bringing)\b/i.test(t);
    const cartridge = extractBrand(t) !== null || hasCue(t, 'cartridge', 'cartridges', 'toner', 'ink', 'refill');
    return left && cartridge && !pieceHasCourier(t) ? strong('cartridge_create', 0.8) : null;
  },

  (t) =>
    hasCue(t, 'directory', 'website', 'bookmark', 'add link', 'save link', 'add site', 'save site') ||
    (extractUrl(t) !== null && /\b(?:add|save|bookmark)\b/i.test(t))
      ? strong('directory', 0.8)
      : null,

  // An inventory write: the word itself, or a write verb aimed at a stock count
  // ("set KW1 to 10 units", "adjust the HP 65 quantity").
  (t) =>
    hasCue(t, 'inventory', 'restock', 'restocked', 'in stock', 'key model') ||
    /\b(set|add|adjust|update|change|restock|remove|reduce|mark)\b[^.?!]*\b(stock|units?|qty|quantity|count|shelf|on hand)\b/i.test(t)
      ? strong('inventory', 0.75)
      : null,

  (t) => (hasCue(t, 'note', 'notes', 'remember', 'jot', 'reminder', 'remind me') ? strong('note', 0.75) : null),

  // Only explicit tracking verbs route here. A bare courier name or a lone
  // tracking number is decided further down, after the receipt routes.
  (t) => (hasCue(t, 'track', 'trace') ? strong('track', 0.8) : null),

  (t) => (hasCue(t, 'refill', 'refills', 'refilled', 'refilling', 'refil', 're-fill') ? strong('receipt', 0.75, 'refill') : null),

  // Explicit shipment words. A bare courier name is deliberately not here: on its
  // own it is a tracking lookup, and with a sale signal it is caught further down.
  (t) =>
    hasCue(t, 'ship', 'shipping', 'shipped', 'shipment', 'courier', 'parcel', 'parcels', 'drop off', 'dropoff')
      ? strong('receipt', 0.75, 'shipping')
      : null,

  // Key cutting: the phrase, a cut/copy verb with a code, an order of several
  // codes, or a key with a price on it ("mailbox key 5 bucks").
  (t) => {
    const cutVerb = hasCue(t, 'cut', 'cutting', 'copy', 'copies', 'dup', 'dupe', 'duplicate', 'duplicated', 'duplicates');
    if (
      hasCue(t, 'key cut', 'key cutting', 'cut a key', 'key copy', 'copy a key') ||
      /\bkeys?\b[^.?!]*\b(?:cut|copy|copies|duplicat\w*|made|make)\b/i.test(t) ||
      /\b(?:cut|copy|copies|duplicat\w*)\b[^.?!]*\bkeys?\b/i.test(t) ||
      (cutVerb && extractKeyItems(t).length > 0) ||
      looksLikeKeyOrder(t)
    ) {
      return strong('receipt', 0.8, 'key');
    }
    return /\bkeys?\b/i.test(t) && extractPrice(t, 'sale') !== null ? strong('receipt', 0.7, 'key') : null;
  },

  // A sale: the word, or a counter service with a number on it ("20 copies $5").
  // "print a label" has no number, so it stays a side action of another receipt.
  (t) => {
    if (hasCue(t, 'purchase', 'purchased', 'buy', 'bought', 'sold', 'sell', 'selling', 'sale', 'supply', 'supplies')) return strong('receipt', 0.75, 'supplies');
    return hasCue(t, ...SERVICE_WORDS) && /\d/.test(t) ? strong('receipt', 0.75, 'supplies') : null;
  },

  // Someone reporting what really happened on a shift with no "shift" word in it
  // ("Parsa left at 8 instead of 7", "Sue took a 30 min break"). Down here so a
  // note or a receipt that happens to say "left at 5" keeps its own route.
  (t) =>
    /\b(?:left|stayed|finished|started|came\s+in|got\s+in|arrived)\s+(?:work\s+)?(?:at|until|till|til)\s+\d{1,2}\b/i.test(t) ||
    /\b(?:left|stayed|finished|started|came\s+in|got\s+in|arrived)\s+(?:\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)\b|\d{1,2}\s+(?:today|yesterday|tonight)\b)/i.test(t) ||
    /\b\d{1,3}\s*-?\s*(?:m|min|mins|minutes?|hours?|hrs?)\s+(?:break|lunch)\b/i.test(t) ||
    /\b(?:break|lunch)\s+(?:of|for)\s+\d{1,3}\b/i.test(t)
      ? strong('timesheet', 0.75)
      : null,

  // A name, a time range and a day with no money in it is a shift being planned
  // ("Sue 10-5:30 oct 8, 9"), even with no "shift" word.
  (t) => {
    if (/\$/.test(t)) return null;
    const range = parseTimeRange(t);
    const dated = range && (parseDays(range.rest).length > 0 || /\bworked\b/i.test(t));
    return dated && extractEmployeeName(t) ? strong('timesheet', 0.75) : null;
  },

  // "receipt"/"invoice" is an explicit intent word, most often the Receipt quick
  // action prepending it ("receipt kw1"). The subtype is picked from what the
  // text names, below.
  (t) => (hasCue(t, 'receipt', 'invoice') ? strong('receipt', 0.8) : null),

  // A courier or a tracking number with nothing else said. With a price or a
  // destination it is a shipment being rung up; bare, it is a parcel to trace
  // (which is what a Track pill sends).
  (t) => {
    if (!pieceHasCourier(t)) return null;
    return looksLikeShipmentSale(t) ? strong('receipt', 0.75, 'shipping') : strong('track', 0.75);
  },

  // From here down it is shape, not words. A brand with a price is most likely a
  // refill being rung up; a brand alone is most likely a question about it.
  (t) => {
    if (extractBrand(t) === null) return null;
    return extractPrice(t, 'loose', [extractModel(t)]) !== null ? weak('receipt', 'refill') : weak('inventory_lookup');
  },

  // Some words and a price: a sale of whatever the words are ("tape 4.99").
  (t) => {
    if (/^\s*(?:make|change|actually|its|it's|it\s+is|no|yes|ok|okay|sorry|add|and|also|plus|to|with|for)\b/i.test(t)) return null;
    return /[A-Za-z]{2,}/.test(t) && extractPrice(t, 'sale') !== null ? weak('receipt', 'supplies') : null;
  },
];

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

// The price on a flat receipt. A "$" always wins; otherwise a bare number is read
// the way that route means it. A refill has no count, so any spare number is the
// price ("hp 61xl refill 30"). On a sale a number can be a count ("3 pens 4.50").
// A key order is priced from inventory, and a refill record often has no price,
// so those two only take a price that is clearly marked as one.
function priceFor(intent: Intent, text: string): number | null {
  if (intent.action !== 'receipt') return extractMoney(text);
  if (intent.subtype === 'refill') return extractPrice(text, 'loose', [extractModel(text)]);
  if (intent.subtype === 'key' && extractKeyItems(text).length > 0) return extractMoney(text);
  return extractPrice(text, 'sale');
}

// Fill the fields declared by a spec, using the right extractor per key.
function fillFields(specKeys: string[], text: string, intent: Intent): Record<string, FieldValue<unknown>> {
  const fields: Record<string, FieldValue<unknown>> = {};
  const price = specKeys.includes('price') ? priceFor(intent, text) : null;
  const quantity = specKeys.includes('quantity') ? extractSaleQuantity(text) : null;
  // The line may lead with the customer on a shipment, a refill or a drop-off
  // ("Hannah Lemmington UPS ..."); on a sale the leading words are the item.
  const leading = intent.subtype === 'shipping' || intent.subtype === 'refill' || intent.action === 'cartridge_create';
  for (const key of specKeys) {
    switch (key) {
      case 'date':
        fields[key] = guessed(todayIso(), "today's date");
        break;
      case 'gst': {
        const said = extractTaxToggle(text);
        fields[key] = said === null ? guessed(true, 'GST applied by default') : explicit(said);
        break;
      }
      case 'quantity':
        fields[key] = fieldFrom(quantity, { value: 1, reason: 'defaulted to 1' });
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
        fields[key] = fieldFrom(price);
        break;
      case 'customerName':
        fields[key] = fieldFrom(extractName(text, { leading }));
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
      case 'inStock': {
        const said = extractInStock(text);
        fields[key] = said === null ? guessed(true, 'in stock by default') : explicit(said);
        break;
      }
      // The free-text fields: what is left once everything else is taken out.
      case 'content':
        fields[key] = fieldFrom(describeNote(text));
        break;
      case 'keyName':
        fields[key] = fieldFrom(describeStockItem(text));
        break;
      case 'supply':
        fields[key] = fieldFrom(describeSale(text, price, quantity));
        break;
      // A key order's summary is written once its blanks are priced
      // (resolveKeyPrices); a key with no code is described from the words.
      case 'keyModel':
        fields[key] = extractKeyItems(text).length > 0 ? absent() : fieldFrom(describeKey(text, price));
        break;
      // Free-text fields we cannot reliably auto-fill: leave for the user.
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
    const text = normalizeUtterance(utterance);

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

    // The first rule that fits wins. The next one that fits with a different
    // route (and is not just a shape guess) is kept as the runner-up, so the
    // slip can offer a one-tap "or did you mean ...?".
    const fits = RULES.map((rule) => rule(text)).filter((r): r is Route => r !== null);
    const winner = fits[0];
    const action: AiAction = winner?.action ?? 'unknown';
    let subtype = winner?.subtype;
    const confidence = winner?.confidence ?? 0;
    const alt = winner && !NOTE_LEAD.test(text)
      ? fits.find((r) => !r.weak && (r.action !== winner.action || r.subtype !== winner.subtype))
      : undefined;
    const runnerUp: Intent['runnerUp'] = alt ? { action: alt.action, subtype: alt.subtype } : undefined;

    // A receipt with no subtype yet ("receipt kw1"): pick one from what the text
    // names, so it does not fall through to an empty, un-fillable slip. Keys win,
    // then a courier/tracking shipment, else a plain supplies sale.
    if (action === 'receipt' && !subtype) {
      if (extractKeyItems(text).length > 0) subtype = 'key';
      else if (pieceHasCourier(text)) subtype = 'shipping';
      else if (hasCue(text, 'key', 'keys')) subtype = 'key';
      else if (extractBrand(text)) subtype = 'refill';
      else subtype = 'supplies';
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
  text = normalizeUtterance(text);
  const { action, subtype } = intent;

  // Timesheet fans into ops via a classifier; it does not use the generic
  // spec-driven filler. `op` decides both the executor branch and (for
  // add_employee) which confirmation spec getFieldSpecs returns. Handled up front
  // and returned so the generic path never runs for it.
  if (action === 'timesheet') {
    const op = classifyTimesheetOp(text);
    const name = extractEmployeeName(text);
    const fields: Intent['fields'] = {
      op: explicit(op),
      employeeName: name ? explicit(name) : absent(),
    };
    if (op === 'add_shift') {
      // Cut the time range out first so "4-9" is never read as the 4th to the 9th.
      const range = parseTimeRange(text);
      const days = parseDays(range ? range.rest : text);
      fields.days = days.length ? explicit(describeDays(days)) : guessed('Today', 'no day given');
      fields.start = range ? explicit(formatTime12(range.start)) : absent();
      fields.end = range ? explicit(formatTime12(range.end)) : absent();
      fields.note = absent();
    } else if (op === 'adjust_shift') {
      const adj = extractShiftAdjustment(text);
      // Drop the times and the break so their numbers are not read as days.
      const range = parseTimeRange(text);
      const dayText = (range ? range.rest : text)
        .replace(/\b(?:at|until|till|til|of|than)\s+\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?/gi, ' ')
        .replace(/\d{1,3}\s*-?\s*(?:m|min|mins|minutes?|hours?|hrs?)\b/gi, ' ');
      const days = parseDays(dayText);
      fields.days = days.length ? explicit(describeDays(days.slice(0, 1))) : guessed('Today', 'no day given');
      // "sue worked 10-6 today": the range is the actual start and end.
      const worked = range && (/\bworked\b/i.test(text) || (!adj.start && !adj.end)) ? range : null;
      fields.actualStart = worked ? explicit(formatTime12(worked.start)) : adj.start ? explicit(adj.start) : absent();
      fields.actualEnd = worked ? explicit(formatTime12(worked.end)) : adj.end ? explicit(adj.end) : absent();
      fields.breakMinutes = adj.breakMinutes != null ? explicit(adj.breakMinutes) : absent();
    } else if (op === 'view') {
      const days = parseDays(text);
      fields.days = days.length ? explicit(describeDays(days.slice(0, 1))) : absent();
      fields.week = /\bweek\b/i.test(text) ? explicit(true) : absent();
    }
    intent.fields = fields;
    return;
  }

  // A board move/clear carries op + position + models, filled straight from the
  // dedicated extractor. No confirmation spec: it runs immediately.
  if (action === 'key_location') {
    const loc = extractKeyLocationOp(text);
    intent.fields = {
      op: loc ? explicit(loc.op) : explicit('set'),
      position: loc?.position ? explicit(loc.position) : absent(),
      models: explicit(loc?.models ?? []),
    };
    return;
  }

  // Fill fields for actions that have a confirmation spec.
  const specs = getFieldSpecs(intent);
  if (specs) {
    intent.fields = fillFields(specs.map((s) => s.key), text, intent);
  }

  // Shipping carries a repeated item block. Seed one item from whatever the
  // utterance names (courier, tracking, province, cost); the rest is confirmed
  // in the item editor.
  if (action === 'receipt' && subtype === 'shipping') {
    intent.fields.shipmentItems = { value: extractShipmentItems(text), source: 'explicit' };
  }

  // Packing supplies ("box $4", "large box $10") can ride on any receipt, most
  // often a shipment. Captured so they are not silently dropped; they show on the
  // slip and are added to the receipt total on confirm.
  // On a plain sale the box IS the item sold, so it is not added a second time.
  if (action === 'receipt' && subtype !== 'supplies') {
    const packing = extractPacking(text);
    if (packing.length > 0) intent.fields.packing = { value: packing, source: 'explicit' };
  }

  // Keys named on a receipt become priced line items (priced from inventory in
  // resolveKeyPrices). A key can be the whole sale (subtype 'key') or ride on a
  // shipment ("... KW1" at the end of a shipping utterance). For a supplies/refill
  // sale we only treat a code as a key when the word "key" is present, so a
  // cartridge model is never mistaken for a key blank.
  if (action === 'receipt') {
    const attachKeys = subtype === 'key' || subtype === 'shipping' || /\bkeys?\b/i.test(text);
    if (attachKeys) {
      // On a shipment only a short blank code rides along ("... and 2 kw1"); a
      // longer one is more likely a cartridge or part of the address.
      const keyItems = extractKeyItems(text).filter((it) => subtype === 'key' || !/\d{3}$/.test(it.model));
      if (keyItems.length > 0) intent.fields.keyItems = { value: keyItems, source: 'explicit' };
      if (subtype === 'key' && keyItems.length > 1 && keyItems.every((it) => it.unitPrice != null)) {
        intent.fields.price = explicit(Math.round(keyItems.reduce((sum, it) => sum + it.qty * it.unitPrice!, 0) * 100) / 100);
      }
    }
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
  // scaffolding and uncertainty clauses.
  if (action === 'inventory_lookup') {
    const make = extractKeyMake(text);
    const brand = make || extractBrand(text);
    const cleaned = cleanInventoryQuery(text);
    const model = extractModel(cleaned);
    const bm = [brand, model].filter(Boolean).join(' ');
    const codes = extractKeyItems(cleaned);
    // A vehicle model alone loses its make. Printer lookups retain their
    // established brand/model spelling, while key queries keep all detail.
    const query = make ? cleaned : bm || (codes.length === 1 ? codes[0].model : cleaned);
    intent.fields = {
      query: query ? explicit(query) : absent(),
      inventoryKind: /\b(?:keys?|blanks?)\b/i.test(text) || make
        ? explicit('key')
        : /\b(?:refills?|cartridges?|ink|toner)\b/i.test(text) || extractBrand(text)
          ? explicit('refill') : absent(),
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
