// Pure, deterministic field extractors. Each returns a value or null; the caller
// decides provenance (found -> explicit, defaulted -> guessed, absent ->
// not_provided). Heuristic by design: everything is confirmable and editable in
// the check, and the optional LLM improves recall later without changing this.
import { CARTRIDGE_BRANDS, CARTRIDGE_TYPES } from '@/lib/cartridges';
import type { PackingItem } from '@/lib/packing';
import type { IntentAttachments } from './types';

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractEmail(text: string): string | null {
  const m = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0] : null;
}

// North American 10-digit phone, tolerant of separators and a leading 1. The
// digit-boundary guards (no digit immediately before or after) stop it from
// slicing a 10-digit run out of a longer number, like a 16-digit tracking
// number, so a real trailing phone is picked instead.
export function extractPhone(text: string): string | null {
  const m = text.match(/(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  return digits.length >= 10 ? m[0].trim() : null;
}

// A number with optional thousands commas and up to two decimals, e.g. "34",
// "34.5", "1,299.99". Used as the money capture group.
const AMOUNT = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
const toAmount = (raw: string): number => Number(raw.replace(/,/g, ''));

// A money amount, however staff type it. Explicit money signals win over a bare
// number after a price cue, and the "$" is accepted on either side, so "$20",
// "20$", "20 bucks", "20.00", "1,299.99", and "for 20" all read as 20. Bare
// numbers with no signal are left alone (they are usually a model or quantity),
// and everything is confirmable in the check.
export function extractMoney(text: string): number | null {
  // $ before the number: "$20", "$ 20.00". The lookbehind keeps a TRAILING "$"
  // (as in "53$") from being read as a leading one for a later number, so
  // "53$ 4167382277" does not price at the phone number.
  const dollarBefore = text.match(new RegExp(`(?<!\\d)\\$\\s?${AMOUNT}`));
  if (dollarBefore) return toAmount(dollarBefore[1]);
  // $ after the number: "20$", "20.00 $".
  const dollarAfter = text.match(new RegExp(`${AMOUNT}\\s?\\$`));
  if (dollarAfter) return toAmount(dollarAfter[1]);
  // Spoken: "20 dollars", "20 bucks".
  const spoken = text.match(new RegExp(`${AMOUNT}\\s*(?:dollars?|bucks)\\b`, 'i'));
  if (spoken) return toAmount(spoken[1]);
  // A price cue word then a number: "price 20", "for 20", "costs 20", "is 20",
  // "at 20", "each 20", "@ 20".
  const priced = text.match(new RegExp(`(?:price|priced|cost|costs|for|is|at|each|@)\\s+\\$?${AMOUNT}`, 'i'));
  if (priced) return toAmount(priced[1]);
  return null;
}

// The shipping cost from an utterance, tolerant of a missing "$". A shipping line
// almost always states a price, but staff rarely type the symbol ("...NS 12.99").
// Tries the strict money extractor first (a $ or a price cue always wins), then
// falls back to a plausible bare amount, after removing the tracking number and
// phone so a long id or a 10-digit phone is never mistaken for the cost.
export function extractShippingCost(
  text: string,
  trackingNumber?: string | null,
  phone?: string | null,
): number | null {
  const strict = extractMoney(text);
  if (strict !== null) return strict;

  let t = ` ${text} `;
  if (trackingNumber) t = t.split(trackingNumber).join(' ');
  if (phone) t = t.split(phone).join(' ');
  // Strip any remaining long digit run (an unknown tracking id) and any bare
  // 10-digit run (a phone we did not capture), so only real amounts remain.
  t = t.replace(/\d[\d\s.-]{9,}\d/g, ' ').replace(/(?<!\d)\d{7,}(?!\d)/g, ' ');

  const decimal = t.match(/(?<!\d)\d{1,4}\.\d{1,2}(?!\d)/);
  if (decimal) return Number(decimal[0]);
  const integer = t.match(/(?<!\d)(\d{1,4})(?!\d)/);
  if (integer) return Number(integer[1]);
  return null;
}

export function extractQuantity(text: string): number | null {
  const qty = text.match(/(?:qty|quantity|x)\s*[:=]?\s*(\d{1,3})\b/i);
  if (qty) return Number(qty[1]);
  const num = text.match(/\b(\d{1,3})\s*(?:pcs|pieces|units|pack|packs)\b/i);
  if (num) return Number(num[1]);
  return null;
}

export function extractBrand(text: string): string | null {
  const lower = text.toLowerCase();
  const hit = CARTRIDGE_BRANDS.find((b) => lower.includes(b.toLowerCase()));
  return hit ?? null;
}

export function extractType(text: string): string | null {
  const lower = text.toLowerCase();
  const hit = CARTRIDGE_TYPES.find((t) => lower.includes(t.label.toLowerCase()));
  return hit ? hit.label : null;
}

// A cartridge model looks like an alphanumeric token that contains a digit, e.g.
// "65", "564XL", "CE278A", "TN660". Prefer a token following a known brand.
export function extractModel(text: string): string | null {
  const brand = extractBrand(text);
  if (brand) {
    const re = new RegExp(`${brand}\\s+([A-Za-z]*\\d[A-Za-z0-9-]*)`, 'i');
    const m = text.match(re);
    if (m) return m[1].toUpperCase();
  }
  const generic = text.match(/\b([A-Za-z]{0,3}\d[A-Za-z0-9]{1,7})\b/);
  // Avoid catching a bare price/phone: require at least one letter, or 3+ digits
  // with a trailing letter (XL etc).
  if (generic && /[A-Za-z]/.test(generic[1])) return generic[1].toUpperCase();
  return null;
}

// Words that follow a name cue but are never a name: brands, cartridge types,
// couriers, and common service nouns. Guards the lowercase fallback and the
// leading-name heuristic below from grabbing "for hp 65" as a customer named
// "hp", or "Canada Post to ..." as a customer named "Canada Post".
const NAME_STOPWORDS = new Set(
  [
    ...CARTRIDGE_BRANDS.map((b) => b.toLowerCase()),
    ...CARTRIDGE_TYPES.map((t) => t.label.toLowerCase()),
    'a',
    'an',
    'the',
    'toner',
    'ink',
    'refill',
    'cartridge',
    'key',
    'shipping',
    'pickup',
    'pick',
    'receipt',
    'order',
    'today',
    'tomorrow',
    // Couriers and shipment nouns, so a shipping utterance's carrier is not read
    // as the customer's name.
    'ups',
    'fedex',
    'purolator',
    'canada',
    'post',
    'dhl',
    'express',
    'saver',
    'ground',
    'parcel',
    'package',
    'ship',
    'shipment',
  ].flatMap((w) => w.split(/\s+/)),
);

function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// A customer name after "for" / "customer" / "name". First tries the strict
// capitalized form (the verified path), then a lowercase fallback so a fast,
// lowercase "refill for sarah chen" still fills the name. The fallback rejects
// stopwords and any token with a digit so a model or price is never read as a
// name. Everything here is confirmable in the check.
export function extractName(text: string): string | null {
  const strict = text.match(/\b(?:for|customer|name(?:d)?(?:\s+is)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (strict) return strict[1].trim();

  // A capitalized "First Last" (up to three words) at the very start, when the
  // first word is not a stopword. Staff often type the customer name first, with
  // no cue word, e.g. "Hannah Lemmington UPS ...". Requires at least two words so
  // a lone leading verb like "Refill" is never taken as a name.
  const leading = text.match(/^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  if (leading) {
    const words = leading[1].trim().split(/\s+/);
    if (!words.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) return words.join(' ');
  }

  const loose = text.match(/\b(?:for|customer|name(?:d)?(?:\s+is)?)\s+([a-z]{2,}(?:\s+[a-z]{2,})?)/i);
  if (!loose) return null;
  const candidate = loose[1].trim();
  const first = candidate.split(/\s+/)[0].toLowerCase();
  if (NAME_STOPWORDS.has(first) || /\d/.test(candidate)) return null;
  return titleCase(candidate);
}

export interface CourierMatch {
  courier: 'FedEx' | 'Purolator' | 'UPS' | 'Canada Post' | 'DHL' | null;
  // The service level named after the courier, e.g. "Express Saver", "Ground".
  // Empty when none was stated. Kept separate from `courier` so the track action
  // can still key its tracking URL off the bare company.
  service: string;
  trackingNumber: string | null;
}

// Service-level words that can follow a courier name ("UPS Express Saver",
// "FedEx Ground", "Canada Post Expedited Parcel"). Read only immediately after the
// courier, so a city or a number ends the run.
const SERVICE_WORDS = new Set([
  'express', 'saver', 'ground', 'standard', 'priority', 'overnight', 'expedited',
  'economy', 'regular', 'worldwide', 'international', 'next', 'day', 'nextday',
  '2day', '3day', 'am', 'home', 'delivery', 'xpresspost', 'tracked', 'packet',
  'small', 'parcel', 'select', 'plus', 'air', 'sameday', 'same', 'freight',
]);

// The service phrase stated right after `keyword` in `text` (up to four words),
// title cased. Stops at the first word that is not a service word.
function serviceAfter(text: string, keyword: string): string {
  const idx = text.toLowerCase().indexOf(keyword);
  if (idx < 0) return '';
  const after = text.slice(idx + keyword.length);
  const tokens = after.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const picked: string[] = [];
  for (const tok of tokens) {
    if (!SERVICE_WORDS.has(tok.toLowerCase())) break;
    picked.push(tok);
    if (picked.length >= 4) break;
  }
  return picked.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// The courier plus its service level as one label ("UPS Express Saver"), or the
// bare company, or "" when no courier is named.
export function courierLabel(m: CourierMatch): string {
  if (!m.courier) return '';
  return m.service ? `${m.courier} ${m.service}` : m.courier;
}

// Detect a courier and/or a tracking number. Patterns from research
// (docs/ai-mode/00-research.md). Purolator has no reliable public pattern, so it
// is only matched when named explicitly.
export function extractTracking(text: string): CourierMatch {
  const lower = text.toLowerCase();
  let courier: CourierMatch['courier'] = null;
  let keyword = '';
  if (lower.includes('fedex')) { courier = 'FedEx'; keyword = 'fedex'; }
  else if (lower.includes('purolator')) { courier = 'Purolator'; keyword = 'purolator'; }
  else if (lower.includes('ups')) { courier = 'UPS'; keyword = 'ups'; }
  else if (lower.includes('canada post') || lower.includes('canadapost')) {
    courier = 'Canada Post';
    keyword = lower.includes('canada post') ? 'canada post' : 'canadapost';
  } else if (lower.includes('dhl')) { courier = 'DHL'; keyword = 'dhl'; }

  const service = keyword ? serviceAfter(text, keyword) : '';

  // Candidate tracking tokens, whitespace-stripped.
  const compact = text.replace(/\s+/g, ' ');
  const ups = compact.match(/\b1Z[0-9A-Z]{16}\b/i);
  const canadaPost = compact.match(/\b([A-Z]{2}\d{9}CA|\d{16})\b/i);
  const fedex = compact.match(/\b(\d{15}|\d{12})\b/);

  let trackingNumber: string | null = null;
  if (ups) {
    trackingNumber = ups[0].toUpperCase();
    if (!courier) courier = 'UPS';
  } else if (canadaPost) {
    trackingNumber = canadaPost[0].toUpperCase();
    if (!courier) courier = 'Canada Post';
  } else if (fedex) {
    trackingNumber = fedex[0];
    if (!courier) courier = 'FedEx';
  }

  return { courier, service, trackingNumber };
}

// One key blank on a key-cutting order: the model and how many to cut. `unitPrice`
// is filled later from inventory (resolveKeyPrices); it is absent at parse time.
export interface KeyOrderItem {
  model: string;
  qty: number;
  unitPrice?: number | null;
}

// Key codes on an order, each with an optional leading quantity: "kw1",
// "2 kw1s", "2 kw1s 1 y1 and 2 sc4s". A key code is 1-3 letters then 1-3 digits
// (KW1, SC4, Y1, WR5, CO10, IN33), as a standalone token. The lookarounds keep it
// from matching a fragment inside a tracking number ("1Z999AA10..." never yields
// "Z999") or a phone/price run. Plural "s" is tolerated and dropped.
const KEY_ORDER_RE = /(?:(\d{1,3})\s*(?:x|×)?\s+)?(?<![A-Za-z0-9])([A-Za-z]{1,3}\d{1,3})s?(?![A-Za-z0-9])/gi;

export function extractKeyItems(text: string): KeyOrderItem[] {
  const items: KeyOrderItem[] = [];
  KEY_ORDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEY_ORDER_RE.exec(text)) !== null) {
    const qty = m[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
    items.push({ model: m[2].toUpperCase(), qty });
  }
  return items;
}

// A board move/clear from an utterance: "put SC1 in B3", "move HR1 to H1",
// "B3 is empty", "clear A7". Returns null unless there is a clear board cue, so a
// bare key code ("B2") stays an inventory lookup and never gets read as a slot.
// The destination is a position preceded by a placing cue (a preposition or the
// word slot/position/spot/board); the key(s) are read from the rest of the text.
export interface KeyLocationOp {
  op: 'set' | 'clear';
  position: string; // "B3"
  models: string[]; // for set; [] for clear
}

const POS = '([A-Ja-j])\\s?-?\\s?(\\d{1,2})';

export function extractKeyLocationOp(text: string): KeyLocationOp | null {
  // Clear: "B3 is empty/free", or "clear/empty/free/remove ... B3".
  const isEmpty = new RegExp(`\\b${POS}\\b\\s+is\\s+(?:now\\s+)?(?:empty|free|clear|open|mt)\\b`, 'i').exec(text);
  if (isEmpty) return { op: 'clear', position: `${isEmpty[1].toUpperCase()}${isEmpty[2]}`, models: [] };
  const clearVerb = new RegExp(`\\b(?:clear|empty|free|vacate)\\b[^A-Za-z0-9]*(?:slot|position|spot)?\\s*${POS}\\b`, 'i').exec(text);
  if (clearVerb) return { op: 'clear', position: `${clearVerb[1].toUpperCase()}${clearVerb[2]}`, models: [] };

  // Set: a destination position after a placing cue.
  let dest: RegExpExecArray | null = null;
  for (const cue of ['(?:to|into|onto)', '(?:in|at)', '(?:slot|position|spot|board)']) {
    const re = new RegExp(`\\b${cue}\\s+${POS}\\b`, 'i');
    const m = re.exec(text);
    if (m) {
      dest = m;
      break;
    }
  }
  if (!dest) return null;
  const position = `${dest[1].toUpperCase()}${dest[2]}`;
  // Read the key(s) from the text with the destination token removed, so a
  // letter+digit destination ("H1") is not itself read as a key model.
  const without = text.slice(0, dest.index) + ' ' + text.slice(dest.index + dest[0].length);
  const models = extractKeyItems(without).map((it) => it.model);
  if (models.length === 0) return null;
  return { op: 'set', position, models };
}

// A URL or bare domain in the text.
export function extractUrl(text: string): string | null {
  const m = text.match(/\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|ca|net|org|io|co)\b[^\s]*/i);
  return m ? m[0] : null;
}

// Strip leading action words so the remainder can seed a free-text field (a note
// body or a key model). Returns null when nothing meaningful is left.
const LEADING_WORDS =
  /^(?:please\s+)?(?:add|log|create|make|new|note|remember|jot|down|a|an|the|to|inventory|directory|key|link)\b[\s:,-]*/i;
export function cleanRemainder(text: string): string | null {
  let out = text.trim();
  // Peel leading action words a few times.
  for (let i = 0; i < 4; i += 1) {
    const next = out.replace(LEADING_WORDS, '').trim();
    if (next === out) break;
    out = next;
  }
  return out.length > 0 ? out : null;
}

// The hostname's first label, as a friendly default name for a directory link.
export function domainName(url: string): string | null {
  const m = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').match(/^([a-z0-9-]+)\./i);
  if (!m) return null;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

// An order id like ORD-AB12CD.
export function extractOrderId(text: string): string | null {
  const m = text.match(/\bORD-[A-Z0-9]{6}\b/i);
  return m ? m[0].toUpperCase() : null;
}

// A cartridge order's target status from natural language. Returns the stored
// enum value the app uses (in_progress | ready | picked_up).
export function extractCartridgeStatus(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bpick(ed)?\s*up\b|\bpicked\b|\bcollected\b/.test(lower)) return 'picked_up';
  if (/\bready\b|\bdone\b|\bcomplete[d]?\b/.test(lower)) return 'ready';
  if (/\bin\s*progress\b|\bworking\b|\bstarted\b/.test(lower)) return 'in_progress';
  return null;
}

// Canadian province from a name or two-letter code in the text.
const PROVINCES: Array<{ code: string; names: string[] }> = [
  { code: 'AB', names: ['alberta'] },
  { code: 'BC', names: ['british columbia'] },
  { code: 'MB', names: ['manitoba'] },
  { code: 'NB', names: ['new brunswick'] },
  { code: 'NL', names: ['newfoundland'] },
  { code: 'NS', names: ['nova scotia'] },
  { code: 'NT', names: ['northwest territories'] },
  { code: 'NU', names: ['nunavut'] },
  { code: 'ON', names: ['ontario'] },
  { code: 'PE', names: ['prince edward island'] },
  { code: 'QC', names: ['quebec', 'québec'] },
  { code: 'SK', names: ['saskatchewan'] },
  { code: 'YT', names: ['yukon'] },
];

export function extractProvince(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of PROVINCES) {
    if (p.names.some((n) => lower.includes(n))) return p.code;
    if (new RegExp(`\\b${p.code}\\b`).test(text)) return p.code;
  }
  return null;
}

// Courier names, so "change courier to FedEx" is not read as a city called FedEx.
const COURIER_WORDS = new Set(['ups', 'fedex', 'purolator', 'dhl', 'canada', 'post']);

// Known Canadian destinations, so a city is recognized however it is typed
// (lowercase, no "to" cue): "... toronto ontario ...". Multi-word names are listed
// with single spaces and matched with flexible whitespace. Longest first so
// "quebec city" wins over the "quebec" province word. Not exhaustive, but covers
// the destinations a Westbrook counter actually ships to; the "to <City>" fallback
// still catches anything not listed.
const CANADIAN_CITIES = [
  'quebec city', 'thunder bay', 'red deer', 'grande prairie', 'prince george',
  'niagara falls', 'st johns', "st john's", 'st catharines', 'sault ste marie',
  'toronto', 'vancouver', 'calgary', 'edmonton', 'ottawa', 'montreal', 'winnipeg',
  'halifax', 'victoria', 'hamilton', 'kitchener', 'waterloo', 'london', 'windsor',
  'saskatoon', 'regina', 'kelowna', 'barrie', 'guelph', 'kingston', 'moncton',
  'sudbury', 'burnaby', 'richmond', 'surrey', 'mississauga', 'brampton', 'markham',
  'vaughan', 'laval', 'gatineau', 'longueuil', 'oshawa', 'whitby', 'ajax',
  'lethbridge', 'kamloops', 'nanaimo', 'abbotsford', 'fredericton', 'charlottetown',
  'yellowknife', 'whitehorse', 'iqaluit', 'brandon', 'medicine hat', 'airdrie',
  'okotoks', 'cochrane', 'sherbrooke', 'trois rivieres', 'peterborough', 'belleville',
];

// A destination city. First matches a known Canadian city however it is typed, then
// falls back to a "to <Capitalized>" phrase. Rejects a province name ("to Ontario")
// and a courier name ("to FedEx").
export function extractCity(text: string): string | null {
  for (const city of CANADIAN_CITIES) {
    const re = new RegExp(`\\b${city.replace(/\s+/g, '\\s+').replace(/'/g, "'?")}\\b`, 'i');
    if (re.test(text)) return titleCase(city);
  }

  const m = text.match(/\bto\s+([A-Z][A-Za-z]*(?:\s+[A-Z][a-z]+)?)/);
  if (!m) return null;
  const city = m[1].trim();
  const lower = city.toLowerCase();
  if (PROVINCES.some((p) => p.names.includes(lower))) return null;
  if (city.split(/\s+/).some((w) => COURIER_WORDS.has(w.toLowerCase()))) return null;
  return city;
}

// Packing supplies named in an utterance ("box $4", "large box $10", "padded
// envelope $3", "bubble wrap"), most often added onto a shipment. Each is matched
// most-specific first so "large box" is not also read as a generic "box". The price
// is taken from a money amount right after the keyword, else the preset price.
const PACKING_MATCHERS: Array<{ re: RegExp; name: string; preset: number }> = [
  { re: /\bsmall\s*box\b/i, name: 'Small Box', preset: 5 },
  { re: /\b(?:medium|med)\s*box\b/i, name: 'Medium Box', preset: 7 },
  { re: /\b(?:large|lg)\s*box\b/i, name: 'Large Box', preset: 10 },
  { re: /\bpadded\s*(?:envelope|mailer)?\b/i, name: 'Padded Envelope', preset: 3 },
  { re: /\benvelope\b/i, name: 'Envelope', preset: 1 },
  { re: /\bbubble\s*wrap\b/i, name: 'Bubble Wrap', preset: 2 },
  { re: /\bmailer\b/i, name: 'Mailer', preset: 3 },
  { re: /\bbox\b/i, name: 'Box', preset: 5 },
];

// Remove packing phrases (each keyword plus a price attached to it) from a piece
// of text. A shipment piece may name a box or envelope anywhere among its fields,
// and its price must not be mistaken for the shipping cost. Packing is captured
// from the whole utterance separately, so removing it here only affects the
// per-item shipping-field extraction, which makes packing position-independent.
export function stripPacking(text: string): string {
  let t = text;
  for (const matcher of PACKING_MATCHERS) {
    // Keyword plus an adjacent price ("box $5", "large box 10$"), then the bare
    // keyword if no price rode with it.
    t = t.replace(
      new RegExp(`${matcher.re.source}\\s*\\$?\\s?\\d{1,4}(?:\\.\\d{1,2})?\\s?\\$?`, 'i'),
      ' ',
    );
    t = t.replace(matcher.re, ' ');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

function priceNear(text: string, fromIndex: number): number | null {
  const window = text.slice(fromIndex, fromIndex + 16);
  const m = window.match(/\$?\s?(\d{1,4}(?:\.\d{1,2})?)\s?\$/) || window.match(/\$\s?(\d{1,4}(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

export function extractPacking(text: string): PackingItem[] {
  const items: PackingItem[] = [];
  let anyBox = false;
  let anyEnvelope = false;
  for (const matcher of PACKING_MATCHERS) {
    // Generic "box"/"envelope" only when a specific size was not already matched.
    if (matcher.name === 'Box' && anyBox) continue;
    if (matcher.name === 'Envelope' && anyEnvelope) continue;
    const m = matcher.re.exec(text);
    if (!m) continue;
    if (/box/i.test(matcher.name)) anyBox = true;
    if (/envelope/i.test(matcher.name)) anyEnvelope = true;
    const price = priceNear(text, m.index + m[0].length);
    items.push({ name: matcher.name, cost: price ?? matcher.preset, quantity: 1, taxable: true });
  }
  return items;
}

// Side-action cues for the compound "chain around one transaction". A pay cue
// ("charge her card", "tap", "moneris") means also send the amount to the payment
// device and record it (Purchase); a label cue ("print a label", "4x6", "sticker")
// means also produce a 4x6 label. Returns undefined when neither is present, so an
// intent stays clean unless the counter actually asked for a side action. These are
// only defaults: the confirmation slip renders them as toggles the counter can flip
// before Confirm. See PHASE-2-ARCH section 1.2.
const PAY_CUES = /\b(?:charge|pay|paid|card|tap|debit|credit|moneris)\b/i;
const LABEL_CUES = /\b(?:label|4\s?x\s?6|sticker)\b/i;

export function extractAttachments(text: string): IntentAttachments | undefined {
  const pay = PAY_CUES.test(text);
  const label = LABEL_CUES.test(text);
  if (!pay && !label) return undefined;
  const attach: IntentAttachments = {};
  if (pay) attach.pay = true;
  if (label) attach.label = true;
  return attach;
}

// The four timesheet operations the single `timesheet` action fans into. Decided
// here from the words so the executor and the confirm/immediate split (add_employee
// confirms, the rest run immediately) both key off one classifier. Order matters:
// add_employee is checked before the punch verbs, and clock-OUT before clock-IN so
// "clock out" is never mistaken for "clock in".
export type TimesheetOp = 'punch_in' | 'punch_out' | 'add_employee' | 'view';

export function classifyTimesheetOp(text: string): TimesheetOp {
  const lower = text.toLowerCase();
  if (/\bemployee\b/.test(lower) && /\b(?:add|new|register|create|hire|onboard)\b/.test(lower)) {
    return 'add_employee';
  }
  if (/\b(?:clock|punch|sign|check)\s*out\b|\b(?:clock|punch)\s*off\b|\bclocking out\b/.test(lower)) {
    return 'punch_out';
  }
  if (/\b(?:clock|punch|sign|check)\s*in\b|\b(?:clock|punch)\s*on\b|\bstart(?:ing)?\s+(?:shift|work)\b|\bclocking in\b/.test(lower)) {
    return 'punch_in';
  }
  return 'view';
}

// Words that follow a timesheet cue but are never a name (shift nouns, adverbs).
const TIMESHEET_NAME_STOPWORDS = new Set([
  'in', 'out', 'off', 'on', 'now', 'today', 'for', 'of', 'lunch', 'break',
  'shift', 'work', 'the', 'a', 'an', 'me', 'myself', 'please', 'employee',
  'again', 'early', 'late', 'is', 'and',
]);

// An employee name spoken in a timesheet utterance: after a punch verb ("clock in
// Sarah"), after "add employee ...", after "hours for ...", or the capitalized
// "for <Name>" fallback. Rejects stopwords and any token with a digit, so a shift
// noun or a time is never read as a name. Confirmable in the check for add_employee;
// used directly for the immediate punch/view ops.
export function extractEmployeeName(text: string): string | null {
  const nameToken = "([A-Za-z][A-Za-z'.-]*(?:\\s+[A-Za-z][A-Za-z'.-]*)?)";
  const m1 = text.match(new RegExp(`\\b(?:clock|punch|sign|check)\\s*(?:in|out|off|on)\\s+(?:for\\s+)?${nameToken}`, 'i'));
  const m2 = text.match(new RegExp(`\\b(?:add|new|register|create|hire|onboard)\\s+(?:an?\\s+)?employee\\s+(?:named\\s+|called\\s+)?${nameToken}`, 'i'));
  const m3 = text.match(new RegExp(`\\b(?:hours?|timesheet|time|shifts?|punches?)\\s+(?:for|of)\\s+${nameToken}`, 'i'));
  const m4 = text.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const raw = (m1?.[1] || m2?.[1] || m3?.[1] || m4?.[1] || '').trim();
  if (!raw) return null;
  const tokens = raw
    .split(/\s+/)
    .filter((t) => !TIMESHEET_NAME_STOPWORDS.has(t.toLowerCase()) && !/\d/.test(t));
  if (tokens.length === 0) return null;
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
}
