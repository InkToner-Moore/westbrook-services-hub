// Pure, deterministic field extractors. Each returns a value or null; the caller
// decides provenance (found -> explicit, defaulted -> guessed, absent ->
// not_provided). Heuristic by design: everything is confirmable and editable in
// the check, and the optional LLM improves recall later without changing this.
import { CARTRIDGE_BRANDS, CARTRIDGE_TYPES } from '@/lib/cartridges';
import type { PackingItem } from '@/lib/packing';
import type { IntentAttachments } from './types';
import { parseBreakMinutes, parseTimeRange } from '@/lib/shiftParse';

export function normalizeUtterance(text: string): string {
  const cues: Record<string, string> = {
    refil: 'refill', reffil: 'refill', reciept: 'receipt', recipt: 'receipt',
    receit: 'receipt', reciet: 'receipt', recept: 'receipt', shiping: 'shipping',
    trakcing: 'tracking', trackng: 'tracking', inventry: 'inventory',
  };
  return text.replace(/\b(?:refil|reffil|reciept|recipt|receit|reciet|recept|shiping|trakcing|trackng|inventry)\b/gi,
    (word) => cues[word.toLowerCase()]).replace(/\bh\s+p\b/gi, 'HP')
    .replace(/\b(\d+[a-z]*)\s+(xx?l)\b/gi, '$1$2');
}

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

// A cue word or phrase as a whole word (no letter on either side), so "ups" is
// not found inside "cups", "note" inside "notebook" or "ship" inside "membership".
const cueCache = new Map<string, RegExp>();
export function hasCue(text: string, ...phrases: string[]): boolean {
  return phrases.some((phrase) => {
    let re = cueCache.get(phrase);
    if (!re) {
      const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      re = new RegExp(`(?<![a-z])${body}(?![a-z])`, 'i');
      cueCache.set(phrase, re);
    }
    return re.test(text);
  });
}

// A number the counter labelled as a tracking number ("tracking 1234567890"), or
// the ten digits right after "DHL" (a DHL waybill). Without the label a ten-digit
// run reads as a phone, so the label is what tells them apart.
const TRACKING_CUE = /\b(?:tracking|trk)(?:\s*(?:number|num|no\.?|#|is|:))*\s*([A-Z0-9]{8,30})\b|(?<![a-z])dhl\s+(\d{10})(?!\d)/i;
function cuedTracking(text: string): string | null {
  const m = TRACKING_CUE.exec(text);
  const hit = m?.[1] ?? m?.[2];
  return hit && /\d/.test(hit) ? hit.toUpperCase() : null;
}

// North American 10-digit phone, tolerant of separators and a leading 1. The
// boundary guards (no letter or digit right before, no digit right after) stop it
// from slicing a 10-digit run out of a longer id, like a 16-digit tracking number
// or the tail of "1Z999AA10123456784", so a real trailing phone is picked instead.
export function extractPhone(text: string): string | null {
  const tracking = extractTracking(text).trackingNumber;
  const t = tracking ? text.replace(new RegExp(tracking, 'i'), ' ') : text;
  const m = t.match(/(?<![A-Za-z0-9])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  return digits.length >= 10 ? m[0].trim() : null;
}

// A number with optional thousands commas and up to two decimals, e.g. "34",
// "34.5", "1,299.99". Used as the money capture group.
const AMOUNT = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
const toAmount = (raw: string): number => Number(raw.replace(/,/g, ''));
// A number followed by one of these is counting something, not pricing it.
const NOT_A_COUNT =
  '(?!\\s*(?:x\\b|%|pages?\\b|copies\\b|keys?\\b|sheets?\\b|pcs\\b|pieces\\b|units?\\b|packs?\\b|boxes\\b|parcels?\\b|packages?\\b|items?\\b|labels?\\b|envelopes?\\b|kgs?\\b|lbs?\\b|pounds?\\b|days?\\b|mins?\\b|minutes?\\b|hours?\\b|hrs?\\b|of\\b))';

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
  // A price cue word then a number: "price 20", "price is 20", "for 20", "costs
  // 20", "each 20", "@ 20". A bare "is" or "at" is not a price cue ("her number is
  // 4035551212", "left at 8"), and a count ("for 20 pages") is not a price.
  const priced = text.match(
    new RegExp(
      `(?:\\b(?:price|priced|cost|costs|total|for|each)|@)(?:\\s+(?:is|of|was))?\\s+\\$?${AMOUNT}(?![\\d.,]*\\d|[A-Za-z])${NOT_A_COUNT}`,
      'i',
    ),
  );
  if (priced && toAmount(priced[1]) < 100000) return toAmount(priced[1]);
  return null;
}

// Numbers typed with no "$" that could be an amount: a standalone number of up to
// four digits, once the phone, email, order id, tracking number and anything in
// `exclude` (a cartridge model, say) are out of the way. A number glued to letters
// ("65xl", "4x6", "T2P") or counting something ("2 parcels", "15 pages") is left out.
export interface BareAmount {
  value: number;
  decimal: boolean;
  // True when item words follow the number ("3 pens"), which reads as a count.
  beforeWord: boolean;
}
const AFTER_AMOUNT_WORDS = new Set([
  'no', 'gst', 'tax', 'taxes', 'cash', 'each', 'dollars', 'dollar', 'bucks', 'for', 'and', 'with', 'plus', 'then',
  'paid', 'charge', 'card', 'debit', 'credit', 'total', 'please', 'tax-free', 'instead', 'now', 'today',
]);
export function bareAmounts(text: string, exclude: Array<string | null | undefined> = []): BareAmount[] {
  let t = ` ${text} `;
  const drop = [extractPhone(text), extractEmail(text), extractOrderId(text), extractTracking(text).trackingNumber, ...exclude];
  for (const x of drop) {
    if (x) t = t.replace(new RegExp(String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  t = t
    .replace(/\b[a-z]\d[a-z]\s*\d[a-z]\d\b/gi, ' ')
    .replace(/\b\d+\s+(?:(?:[a-z]+\s+){0,3})(?:(?:st|street|ave|avenue|rd|road|blvd|dr|drive|way|cres|crt|court|pl|lane|hwy|unit|apt|suite)\b|#)/gi, ' ')
    .replace(/\b2\s+(?=[a-z])/gi, (m, offset) => CANADIAN_CITIES.some((city) => new RegExp(`^${city}\\b`, 'i').test(t.slice(offset + m.length))) ? ' ' : m)
    .replace(/\d[\d\s.-]{9,}\d/g, ' ')
    .replace(/(?<!\d)\d{6,}(?!\d)/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\s*(?:am|pm)\b/gi, ' ');
  const out: BareAmount[] = [];
  const re = new RegExp(`(?<![A-Za-z0-9.#$-])(\\d{1,4}(?:\\.\\d{1,2})?)(?![A-Za-z0-9$]|\\.\\d)${NOT_A_COUNT}(\\s+[A-Za-z'-]+)?`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const next = (m[2] ?? '').trim().toLowerCase();
    out.push({ value: Number(m[1]), decimal: m[1].includes('.'), beforeWord: next !== '' && !AFTER_AMOUNT_WORDS.has(next) });
  }
  return out;
}

// The price on a receipt, tolerant of a missing "$". A "$" or a price cue always
// wins. Otherwise a bare number is taken: in a 'sale' (where a number can also be
// a count, "3 pens 4.50") only one that no item word follows, and elsewhere any
// that is not a count. A decimal is preferred, then the last one typed.
export function extractPrice(
  text: string,
  mode: 'sale' | 'loose' = 'loose',
  exclude: Array<string | null | undefined> = [],
): number | null {
  const strict = extractMoney(text);
  if (strict !== null) return strict;
  const amounts = text.replace(/(?<![A-Za-z0-9])x\s?\d{1,3}\b/gi, ' ').replace(/\b(?:qty|quantity)\s*(?:is\s+|[:=]\s*)?\d{1,3}\b/gi, ' ');
  const all = bareAmounts(amounts, exclude);
  const nums = mode === 'sale' ? all.filter((n) => !n.beforeWord) : all;
  if (nums.length === 0) return null;
  const decimal = nums.find((n) => n.decimal);
  return (decimal ?? nums[nums.length - 1]).value;
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
  const nums = bareAmounts(text, [trackingNumber, phone]);
  if (nums.length === 0) return null;
  return (nums.find((n) => n.decimal) ?? nums[0]).value;
}

// Number words staff type for a count ("two kw1s", "a couple of pens").
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, pair: 2,
};
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'gi');
const digitsForWords = (text: string): string => text.replace(NUMBER_WORD_RE, (w) => String(NUMBER_WORDS[w.toLowerCase()]));

// How many of an item on a sale: "qty 3", "x3", "3 pcs", "2 of them", or a number
// with the item named after it ("3 pens", "20 copies"). Null when none is stated.
export function extractSaleQuantity(text: string): number | null {
  const t = digitsForWords(text);
  const stated =
    t.match(/\b(?:qty|quantity)\s*(?:is\s+|[:=]\s*)?(\d{1,3})\b/i) ||
    t.match(/(?<![A-Za-z0-9])x\s?(\d{1,3})\b/i) ||
    t.match(/(?<![A-Za-z0-9$.])(\d{1,3})\s*x(?![A-Za-z0-9])/i) ||
    t.match(/(?<![A-Za-z0-9$.])(\d{1,3})\s+of\s+(?:em|them|those|these)\b/i);
  if (stated) return Number(stated[1]);
  const counted = /(?<![A-Za-z0-9.#$-])(\d{1,3})(?![A-Za-z0-9$]|\.\d)\s+([A-Za-z'-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = counted.exec(t)) !== null) {
    if (!AFTER_AMOUNT_WORDS.has(m[2].toLowerCase())) return Number(m[1]);
  }
  return null;
}

// Printer brands beyond the ones the refill form lists, so "samsung 111" still
// reads as a brand and a model.
const OTHER_BRANDS = ['Samsung', 'Dell', 'Xerox', 'Kyocera', 'Ricoh', 'Pantum', 'OKI'];
const ALL_BRANDS = [...CARTRIDGE_BRANDS, ...OTHER_BRANDS];

// Vehicle vocabulary includes the requested common makes and aliases. Lock
// brands and additional vehicle names come from vetted keyReference fits text.
// Keep aliases here so routing and reference matching use the same vocabulary.
export const KEY_MAKES: Record<string, string[]> = {
  Ford: ['ford'], Toyota: ['toyota'], Honda: ['honda'],
  Nissan: ['nissan', 'datsun'], GM: ['gm', 'general motors', 'chevy', 'chevrolet'],
  GMC: ['gmc'], Buick: ['buick'], Cadillac: ['cadillac'], Pontiac: ['pontiac'],
  Chrysler: ['chrysler'], Dodge: ['dodge'], Jeep: ['jeep'], Ram: ['ram'],
  Hyundai: ['hyundai'], Kia: ['kia'], Mazda: ['mazda'], Subaru: ['subaru'],
  VW: ['volkswagen', 'vw'], Mitsubishi: ['mitsubishi'], Lexus: ['lexus'],
  Acura: ['acura'], Infiniti: ['infiniti'], BMW: ['bmw'],
  Mercedes: ['mercedes', 'mercedes benz'], Audi: ['audi'], Volvo: ['volvo'],
  Suzuki: ['suzuki'], Isuzu: ['isuzu'], Saturn: ['saturn'],
  Lincoln: ['lincoln'], Mercury: ['mercury'], Oldsmobile: ['oldsmobile'],
  Geo: ['geo'], Daewoo: ['daewoo'], Saab: ['saab'], Yamaha: ['yamaha'],
  Freightliner: ['freightliner'], International: ['international'],
  'John Deere': ['john deere'],
  Kwikset: ['kwikset'], Schlage: ['schlage'], Weiser: ['weiser'],
  Master: ['master', 'master lock'], Yale: ['yale'], Weslock: ['weslock'],
  Dexter: ['dexter'], Arrow: ['arrow'], Best: ['best'], Falcon: ['falcon'],
  Corbin: ['corbin'], Russwin: ['russwin'], Sargent: ['sargent'],
  Slaymaker: ['slaymaker'], Clinton: ['clinton'], Welch: ['welch'],
};

// Token boundaries prevent a make such as Ram from matching a longer word.
export function matchesKeyMake(text: string, make: string): boolean {
  const aliases = KEY_MAKES[make] ?? [make.toLowerCase()];
  const words = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  return aliases.some((alias) => (' ' + words + ' ').includes(' ' + alias + ' '));
}

export function extractKeyMake(text: string): string | null {
  return Object.keys(KEY_MAKES).find((make) => matchesKeyMake(text, make)) ?? null;
}

export const INVENTORY_KIND_WORDS = new Set([
  'key', 'keys', 'blank', 'blanks', 'refill', 'refills', 'cartridge',
  'cartridges', 'ink', 'toner',
]);

const INVENTORY_FILLER = new Set((
  'is are do does did we the a an any have has carry sell got in out of on stock ' +
  'price priced cost costs how much many for where wheres located location whats ' +
  'what which slot hook spot there left check that this it some please i you our us'
).split(' '));

export function cleanInventoryQuery(text: string): string {
  return text.toLowerCase()
    // An uncertain model is not a search term. Stop at punctuation so a later
    // substantive clause is preserved.
    .replace(/\b(?:i\s+(?:do\s+not|don't|dont)\s+know|not\s+sure|no\s+idea|idk)\b[^?.;!]*/gi, ' ')
    .replace(/['?.,!;]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !INVENTORY_FILLER.has(word) && !INVENTORY_KIND_WORDS.has(word))
    .join(' ');
}

export function extractBrand(text: string): string | null {
  return ALL_BRANDS.find((b) => hasCue(text, b)) ?? null;
}

export function extractType(text: string): string | null {
  const find = (value: string) => CARTRIDGE_TYPES.find((t) => t.value === value)?.label ?? null;
  if (/\bphoto\s+black\b/i.test(text)) return find('Photo Black');
  if (/\b(?:tri[\s-]?colou?r|colou?r)\b/i.test(text)) return find('Color');
  for (const value of ['Black', 'Cyan', 'Magenta', 'Yellow']) {
    if (hasCue(text, value)) return find(value);
  }
  return null;
}

// Tokens with a digit and a letter that are never a cartridge model: a label
// size, a time, an ordinal, a unit.
const NOT_A_MODEL = /^\d+(?:x\d+|am|pm|st|nd|rd|th|day|min|mins|hr|hrs|pcs|pk|kg|kgs|lb|lbs)$/i;

// A cartridge model looks like an alphanumeric token that contains a digit, e.g.
// "65", "564XL", "CE278A", "TN660". Prefer a token following a known brand.
export function extractModel(text: string): string | null {
  text = normalizeUtterance(text);
  const stated = text.match(/\bmodel\s*(?:is\s+|[:=]\s*)?([A-Za-z-]*\d[A-Za-z0-9-]*)\b/i);
  if (stated) return stated[1].toUpperCase();
  const brand = extractBrand(text);
  if (brand) {
    const m = text.match(new RegExp(`(?<![a-z])${brand}\\s*([A-Za-z-]*\\d[A-Za-z0-9-]*)`, 'i'));
    if (m) return m[1].toUpperCase();
  }
  // No brand: a token with both a letter and a digit, once ids are out of the way.
  let t = text;
  for (const x of [extractOrderId(text), extractPhone(text), extractTracking(text).trackingNumber]) {
    if (x) t = t.replace(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
  }
  for (const m of t.matchAll(/\b([A-Za-z-]{0,6}\d[A-Za-z0-9-]{1,7})\b/g)) {
    if (/[A-Za-z]/.test(m[1]) && !NOT_A_MODEL.test(m[1])) return m[1].toUpperCase();
  }
  if (hasCue(text, 'refill', 'refilled', 'refilling')) {
    const number = t.match(/(?<![$\w])\d{1,4}(?![\w.]|\$)/);
    if (number) return number[0];
  }
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
  return name.toLowerCase().replace(/(^|[\s-])([\p{L}])/gu, (_, lead, ch) => lead + ch.toUpperCase())
    .replace(/\b([od])(['’])([\p{L}])/giu, (_, lead, apostrophe, ch) => lead.toUpperCase() + apostrophe + ch.toUpperCase());
}

// More words that are never part of a customer's name: joiners, field labels,
// payment and tax words, verbs that lead a request.
const NOT_A_NAME = new Set([
  ...NAME_STOPWORDS,
  'actually', 'wait', 'oops', 'sorry', 'um', 'uh', 'ok', 'okay', 'nvm', 'cancel', 'swap', 'delete', 'remove', 'change', 'pls', 'thanks', 'une', 'pour', 'need', 'can', 'u', 'could', 'you', 'make', 'gimme', 'give', 'not', 'more', 'another',
  ...OTHER_BRANDS.map((b) => b.toLowerCase()),
  'and', 'to', 'at', 'in', 'on', 'with', 'no', 'tax', 'gst', 'by', 'from', 'then', 'please', 'cash', 'card', 'paid',
  'phone', 'number', 'email', 'him', 'her', 'his', 'them', 'me', 'us', 'it', 'this', 'that', 'free', 'now', 'later',
  'sale', 'printing', 'copies', 'delivery', 'keys', 'customer', 'colour', 'color', 'tri', 'photo', 'new', 'is', 'was',
  'wants', 'needs', 'who', 'he', 'she', 'they', 'someone', 'lady', 'guy', 'client', 'we', 'i', 'supplied', 'name',
  'named', 'charge', 'print', 'label', 'drop', 'off', 'dropped', 'record', 'log', 'refilled', 'got', 'have', 'any',
  'check', 'restock', 'sold', 'bought', 'add', 'cut', 'track', 'trace', 'where', 'mark', 'set', 'note', 'yesterday',
  'each', 'all', 'both', 'pages', 'units', 'instead', 'tracking', 'box', 'boxes', 'label', 'labels',
]);
const isNameWord = (w: string): boolean => /^\p{L}[\p{L}\p{M}'’-]*$/u.test(w) && !NOT_A_NAME.has(w.toLowerCase());

// The name at the front of `words`: up to three name-like words, stopping at the
// first word that is not one ("sarah hp 65" gives Sarah). Null when the first word
// is not a name.
export function nameFrom(words: string, max = 3): string | null {
  words = normalizeUtterance(words);
  const picked: string[] = [];
  // A comma or colon ends the name ("for Sarah, HP 65").
  for (const w of words.trim().split(/[,;:\n]/)[0].split(/\s+/)) {
    if (!isNameWord(w) || picked.length >= max) break;
    picked.push(w);
  }
  return picked.length > 0 ? titleCase(picked.join(' ')) : null;
}

// A customer name. Reads it after a cue ("for sarah chen", "name is priya"), from
// someone doing something at the counter ("sarah dropped off ..."), or, when
// `leading` is set, from the front of the line ("Hannah Lemmington UPS ...",
// "sarah chen hp 65 refill"). However it is typed, upper or lower case. Brands,
// couriers and field words are never taken as a name, and everything here is
// confirmable in the check.
const NAME_CUE = /\b(?:for|name(?:d)?(?:\s+is)?|customer(?:\s+name)?\s+is|customer\s+name)\s+(?=\p{L})/giu;
export function extractName(text: string, opts: { leading?: boolean } = {}): string | null {
  text = normalizeUtterance(text);
  const possessive = text.match(/\b([a-z]+?)(?:['’]s|s)\s+refills?\b/i);
  if (possessive && isNameWord(possessive[1])) return titleCase(possessive[1]);
  text = text.replace(/^\s*intake\s*:\s*/i, '');
  NAME_CUE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAME_CUE.exec(text)) !== null) {
    const name = nameFrom(text.slice(m.index + m[0].length));
    if (name) return name;
  }

  const actor = text.match(/^\s*((?:[A-Za-z][A-Za-z'’-]+\s+){1,3})(?:dropped|dropping|drops|left|brought|wants|needs|came)\b/);
  if (actor && actor[1].trim().split(/\s+/).every(isNameWord)) return titleCase(actor[1].trim());

  if (!opts.leading) return null;
  // A city or phone after two words makes an action-led name unambiguous.
  const actionName = text.match(/^\s*(?:receipt|ship|shipping|refill)\s+(\p{L}[\p{L}\p{M}'’-]*\s+\p{L}[\p{L}\p{M}'’-]*)\s+(.+)$/iu);
  if (actionName && actionName[1].split(/\s+/).every(isNameWord)) {
    const after = actionName[2];
    const city = CANADIAN_CITIES.some((c) => new RegExp(`^${c}\\b`, 'i').test(after));
    const phone = extractPhone(after);
    if (city || (phone && after.startsWith(phone))) return titleCase(actionName[1]);
  }
  // A capitalized "First Last" at the very start, or lowercase words right before
  // a brand or a courier.
  const capital = text.match(/^\s*([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){1,2})\b/);
  if (capital && capital[1].split(/\s+/).every(isNameWord)) return capital[1].trim();
  const lead = text.match(/^\s*((?:[A-Za-z][A-Za-z'’-]+\s+){1,3})(?=(?:hp|canon|epson|brother|lexmark|ups|fedex|fed\s?ex|purolator|canada\s?post|dhl)\b)/i);
  if (lead && lead[1].trim().split(/\s+/).every(isNameWord)) return titleCase(lead[1].trim());
  return null;
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

// The service phrase stated right after the courier name (up to four words),
// title cased. Stops at the first word that is not a service word.
function serviceAfter(after: string): string {
  const tokens = after.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const picked: string[] = [];
  for (const tok of tokens) {
    if (!SERVICE_WORDS.has(tok.toLowerCase())) break;
    picked.push(tok);
    if (picked.length >= 4) break;
  }
  return picked.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Courier names as whole words, so "cups" and "backups" never name UPS. A digit
// may touch the name ("...4167382277fedex"), a letter may not.
export const COURIER_NAMES: Array<{ name: NonNullable<CourierMatch['courier']>; re: RegExp }> = [
  { name: 'FedEx', re: /(?<![a-z])fed\s?ex(?![a-z])/i },
  { name: 'Purolator', re: /(?<![a-z])puro(?:lator)?(?![a-z])/i },
  { name: 'UPS', re: /(?<![a-z])ups(?![a-z])/i },
  { name: 'Canada Post', re: /(?<![a-z])canada\s?post(?![a-z])/i },
  { name: 'DHL', re: /(?<![a-z])dhl(?![a-z])/i },
];

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
  // The courier named first in the text.
  let courier: CourierMatch['courier'] = null;
  let service = '';
  let at = Infinity;
  for (const c of COURIER_NAMES) {
    const m = c.re.exec(text);
    if (m && m.index < at) {
      at = m.index;
      courier = c.name;
      service = serviceAfter(text.slice(m.index + m[0].length));
    }
  }

  // Candidate tracking tokens, whitespace-stripped.
  const compact = text.replace(/\s+/g, ' ');
  const cued = cuedTracking(compact);
  const ups = compact.match(/\b1Z[0-9A-Z]{16}\b/i);
  // Keep mistyped UPS ids on the slip, but reject short or mostly letter codes.
  const looseUps = [...compact.matchAll(/\b1Z[0-9A-Z]{8,20}\b/gi)]
    .find((m) => (m[0].slice(2).match(/\d/g) ?? []).length >= 6);
  const canadaPost = compact.match(/\b([A-Z]{2}\d{9}CA|\d{16})\b/i);
  const fedex = compact.match(/\b(\d{15}|\d{12})\b/);

  let trackingNumber: string | null = null;
  if (ups || looseUps) {
    trackingNumber = (ups ?? looseUps)[0].toUpperCase();
    if (!courier) courier = 'UPS';
  } else if (cued) {
    trackingNumber = cued;
  } else if (canadaPost) {
    trackingNumber = canadaPost[0].toUpperCase();
    if (!courier) courier = 'Canada Post';
  } else if (fedex) {
    trackingNumber = fedex[0];
    if (!courier) courier = 'FedEx';
  }

  // Clerks may type a courier PIN that does not fit the known tracking patterns.
  // Keep phone-shaped tokens as phones without calling extractPhone recursively.
  if (!trackingNumber && (courier || hasCue(text,
    'ship', 'shipping', 'shipped', 'shipment', 'courier', 'parcel', 'parcels',
    'drop off', 'dropoff', 'track', 'trace', 'package'))) {
    const candidates = [...text.matchAll(/(?<![A-Za-z0-9])([A-Za-z0-9]{9,34})(?![A-Za-z0-9])/g)]
      .filter((m) => {
        const token = m[1];
        if ((token.match(/\d/g) ?? []).length < 7 || NOT_A_MODEL.test(token)) return false;
        if (/^(?:\d{10}|1\d{10})$/.test(token)) return false;
        const before = text.slice(0, m.index);
        const after = text.slice(m.index + token.length);
        // Do not take an order id, money, or a piece of a date/time/phone group.
        return !/(?:\bORD-\S*|[$.,:/+-])\s*$/i.test(before) &&
          !/^\s*\$|^[.,:/+-]\d/.test(after);
      });
    let longest = '';
    for (const m of candidates) {
      if (m[1].length > longest.length) longest = m[1];
    }
    trackingNumber = longest ? longest.toUpperCase() : null;
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
const KEY_ORDER_RE = /(?<![A-Za-z0-9$.])(?:(\d{1,2})(?:\s*(?:x|×)\s*|\s+))?([A-Za-z]{1,3}\d{1,3})s?(?![A-Za-z0-9])/gi;

// The count may also come after the code ("kw1 x2"), as a word ("two kw1s"), or
// on the word "keys" ("3 keys kw1", "made 3 copies of a kw1"). A price is never a
// count ("kw1 $5 sc1"), "x2" is a count and not a blank, and a code named as a
// place ("from B3") is a spot on the board, not something to cut.
export function extractKeyItems(text: string): KeyOrderItem[] {
  const t = digitsForWords(text);
  const items: KeyOrderItem[] = [];
  KEY_ORDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEY_ORDER_RE.exec(t)) !== null) {
    const model = m[2].toUpperCase();
    if (/^X\d+$/.test(model)) continue;
    const codeStart = m.index + m[0].toUpperCase().lastIndexOf(model);
    if (/\b(?:from|slot|position|spot|hook|row)\s+$/i.test(t.slice(0, codeStart))) continue;
    const tail = t.slice(m.index + m[0].length);
    const after = /^\s*(?:(?:x|×|\*)\s*|(?:qty|quantity)\s*(?:is\s+|[:=]\s*)?)(\d{1,2})\b/i.exec(tail) ||
      /^\s*\((\d{1,2})\)/.exec(tail) ||
      /^\s*(\d{1,2})\s+times\b/i.exec(tail);
    const qty = after ? parseInt(after[1], 10) : m[1] ? parseInt(m[1], 10) : 1;
    const nextCode = tail.search(new RegExp(KEY_ORDER_RE.source, 'i'));
    const unitPrice = extractMoney(nextCode < 0 ? tail : tail.slice(0, nextCode));
    items.push({ model, qty: Math.max(1, qty), ...(unitPrice !== null ? { unitPrice } : {}) });
  }
  if (items.length === 1 && items[0].qty === 1) {
    const counted = /(?<![\d$.])(\d{1,2})\s+(?:keys?|copies|copy|cuts?|duplicates?)\b/i.exec(t);
    if (counted) items[0].qty = Math.max(1, parseInt(counted[1], 10));
  }
  if (items.length === 1 && items[0].qty === 1) {
    const qty = extractSaleQuantity(t);
    if (qty !== null) items[0].qty = qty;
  }
  const merged: KeyOrderItem[] = [];
  for (const item of items) {
    const previous = merged.find((it) => it.model === item.model && it.unitPrice === item.unitPrice);
    if (previous) previous.qty += item.qty;
    else merged.push(item);
  }
  return merged;
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
  if (hasCue(text, 'ready')) return 'ready';
  if (hasCue(text, 'picked up', 'collected')) return 'picked_up';
  if (hasCue(text, 'done', 'complete', 'completed')) return 'ready';
  if (/\bin\s*progress\b|\bworking\b|\bstarted\b/.test(lower)) return 'in_progress';
  return null;
}

const COUNTRIES: Array<[string, string[]]> = [
  ['United Kingdom', ['uk', 'england', 'united kingdom', 'britain']],
  ['United States', ['usa', 'us', 'united states']],
  ['France', ['france']], ['Germany', ['germany']], ['China', ['china']],
  ['India', ['india']], ['Mexico', ['mexico']], ['Australia', ['australia']],
  ['Philippines', ['philippines']], ['Japan', ['japan']], ['Italy', ['italy']],
  ['Canada', ['canada']],
];
export function extractCountry(text: string): string | null {
  return COUNTRIES.find(([, names]) => names.some((name) => hasCue(text, name)))?.[0] ?? null;
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

// The province a known city is in, so "ups to toronto 22" is taxed as Ontario
// without the counter typing "ON".
const CITY_PROVINCE: Record<string, string> = {};
const inProvince = (code: string, cities: string) => cities.split(',').forEach((c) => (CITY_PROVINCE[c.trim()] = code));
inProvince('AB', 'calgary, edmonton, red deer, lethbridge, medicine hat, grande prairie, airdrie, okotoks, cochrane, canmore, banff, chestermere, strathmore, fort mcmurray, lloydminster, camrose, st albert, sherwood park, leduc, spruce grove, high river, brooks, drumheller, olds, lacombe, jasper, cold lake');
inProvince('BC', 'vancouver, victoria, kelowna, burnaby, richmond, surrey, kamloops, nanaimo, abbotsford, prince george, langley, coquitlam, chilliwack, penticton, vernon, whistler');
inProvince('ON', 'toronto, ottawa, hamilton, kitchener, waterloo, london, windsor, barrie, guelph, kingston, sudbury, mississauga, brampton, markham, vaughan, oshawa, whitby, ajax, thunder bay, niagara falls, st catharines, sault ste marie, peterborough, belleville, scarborough, etobicoke, north york, oakville, burlington, cambridge');
inProvince('QC', 'montreal, quebec city, laval, gatineau, longueuil, sherbrooke, trois rivieres');
inProvince('MB', 'winnipeg, brandon');
inProvince('SK', 'saskatoon, regina, moose jaw, prince albert');
inProvince('NS', 'halifax, dartmouth, sydney');
inProvince('NB', 'moncton, fredericton, saint john');
inProvince('NL', "st johns, st john's");
inProvince('PE', 'charlottetown');
inProvince('YT', 'whitehorse');
inProvince('NT', 'yellowknife');
inProvince('NU', 'iqaluit');

export function provinceOfCity(city: string | null | undefined): string | null {
  return city ? CITY_PROVINCE[city.trim().toLowerCase().replace(/\./g, '')] ?? null : null;
}

// A province from its name or its two-letter code, upper or lower case ("calgary
// ab"). A lowercase "on" is the word unless it sits right after a city ("toronto
// on 22").
export function extractProvince(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of PROVINCES) {
    if (p.names.some((n) => lower.includes(n))) return p.code;
    if (new RegExp(`\\b${p.code}\\b`).test(text)) return p.code;
  }
  for (const p of PROVINCES) {
    if (p.code === 'ON') continue;
    if (new RegExp(`(?<![a-z0-9'])${p.code.toLowerCase()}(?![a-z0-9'])`).test(lower)) return p.code;
  }
  const afterCity = /([a-z.' ]+?)\s+on(?![a-z0-9'])/g;
  let m: RegExpExecArray | null;
  while ((m = afterCity.exec(lower)) !== null) {
    if (CANADIAN_CITIES.some((c) => m![1].trim().endsWith(c))) return 'ON';
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
const CANADIAN_CITIES = Object.keys(CITY_PROVINCE).sort((a, b) => b.length - a.length);

// A destination city. First matches a known Canadian city however it is typed, then
// falls back to a "to <Capitalized>" phrase. Rejects a province name ("to Ontario")
// and a courier name ("to FedEx").
export function extractCity(text: string): string | null {
  // Every known city in the text; the one after "to" is the destination, one
  // after "from" is where it came from.
  const hits: Array<{ city: string; index: number }> = [];
  for (const city of CANADIAN_CITIES) {
    const re = new RegExp(`\\b${city.replace(/\s+/g, '\\s+').replace(/'/g, "'?")}\\b`, 'i');
    const m = re.exec(text);
    if (m && !hits.some((h) => m.index >= h.index && m.index < h.index + h.city.length)) hits.push({ city, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  const before = (h: { index: number }) => text.slice(0, h.index);
  const dest = hits.find((h) => /\bto\s+$/i.test(before(h))) ?? hits.find((h) => !/\bfrom\s+$/i.test(before(h)));
  if (dest) return /^st john'?s$/i.test(dest.city) ? "St. John's" : titleCase(dest.city);

  const destination = text.replace(/\b(?:united states|united kingdom)\b/gi, '');
  const m = destination.match(/\bto\s+([a-z][a-z'’.]*(?:\s+[a-z][a-z'’.]*){0,3})/i);
  if (!m) return null;
  const words: string[] = [];
  for (const word of m[1].trim().split(/\s+/)) {
    if (PROVINCES.some((p) => p.names.includes(word.toLowerCase()) || p.code.toLowerCase() === word.toLowerCase()) ||
      COURIER_WORDS.has(word.toLowerCase()) || extractCountry(word) || (NOT_A_NAME.has(word.toLowerCase()) && word.toLowerCase() !== 'new')) break;
    words.push(word);
  }
  return words.length ? titleCase(words.join(' ')) : null;
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

// The price typed right after a packing word ("box $4", "large box 10$"). Only an
// amount with a "$" that directly follows counts, so the shipping price further
// along the line is never borrowed.
function priceNear(text: string, fromIndex: number): number | null {
  const m = /^\s*(?:for\s+|@\s*)?(?:\$\s?(\d{1,4}(?:\.\d{1,2})?)|(\d{1,4}(?:\.\d{1,2})?)\s?\$)/.exec(text.slice(fromIndex));
  return m ? Number(m[1] ?? m[2]) : null;
}

// "no box", "customer supplied box", "their own envelope": packing the shop is
// not selling.
const NOT_OUR_PACKING = /\b(?:no|without|own|their|his|her|customer'?s?|supplied|provided|brought)\s+(?:(?:own|supplied|provided)\s+)?$/i;

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
    if (NOT_OUR_PACKING.test(text.slice(0, m.index))) continue;
    const price = priceNear(text, m.index + m[0].length);
    items.push({ name: matcher.name, cost: price ?? matcher.preset, quantity: 1, taxable: true });
  }
  return items;
}

// "no gst", "tax free", "with gst": whether the counter said to charge tax. Null
// when they did not say.
export function extractTaxToggle(text: string): boolean | null {
  if (/\b(?:no|without|remove|drop|skip|minus)\s+(?:the\s+)?(?:gst|tax|taxes)\b|\b(?:gst|tax)[\s-]?(?:free|exempt)\b/i.test(text)) return false;
  if (/\b(?:add|with|include|apply|charge|keep|plus)\s+(?:the\s+)?(?:gst|tax)\b/i.test(text)) return true;
  return null;
}

// Side-action cues for the compound "chain around one transaction". A pay cue
// ("charge her card", "tap", "moneris") means also send the amount to the payment
// device and record it (Purchase); a label cue ("print a label", "4x6", "sticker")
// means also produce a 4x6 label. Returns undefined when neither is present, so an
// intent stays clean unless the counter actually asked for a side action. These are
// only defaults: the confirmation slip renders them as toggles the counter can flip
// before Confirm. See PHASE-2-ARCH section 1.2.
// A bare "card" is not a pay cue ("membership card", "business cards"); it needs
// its own little phrase ("by card", "her card").
const PAY_CUES =
  /\b(?:charge|charged|pay|paid|paying|tap|tapped|debit|credit|moneris|visa|mastercard|interac)\b|\b(?:by|on|with|her|his|their|the)\s+card\b/i;
const LABEL_CUES = /\b(?:label|sticker)\b|\b4\s?x\s?6\b(?!\s+labels)/i;

export function extractAttachments(text: string): IntentAttachments | undefined {
  const pay = PAY_CUES.test(text);
  const label = LABEL_CUES.test(text);
  if (!pay && !label) return undefined;
  const attach: IntentAttachments = {};
  if (pay) attach.pay = true;
  if (label) attach.label = true;
  return attach;
}

// The timesheet operations the single `timesheet` action fans into. Decided here
// from the words so the executor and the confirm/immediate split both key off one
// classifier. The punch clock is switched off: hours come from the schedule, so a
// punch phrase is answered with a pointer (punch_off) instead of writing anything.
//   add_shift     plan a shift, or several days at once   (manager, confirmable)
//   adjust_shift  log what really happened on a shift:
//                 a different start / end, or a break       (any staff, confirmable)
//   add_employee  add someone to the team                  (confirmable)
//   view          today's shifts or one person's week      (immediate)
export type TimesheetOp = 'add_shift' | 'adjust_shift' | 'add_employee' | 'view' | 'punch_off';

// Cues that someone is reporting what really happened on a shift.
const ADJUST_CUES =
  /\b(?:left|leave|leaving|stayed|staying|finished|worked|came\s+in|got\s+in|arrived|started|showed\s+up|instead\s+of|break|lunch|actually)\b/;

export function classifyTimesheetOp(text: string): TimesheetOp {
  const lower = text.toLowerCase();
  if (/\bemployee\b/.test(lower) && /\b(?:add|new|register|create|hire|onboard)\b/.test(lower)) {
    return 'add_employee';
  }
  if (/\b(?:clock|punch|sign|check)(?:ed|ing)?\s*-?\s*(?:in|out|on|off)\b|\bpunch(?:\s+the)?\s+clock\b/.test(lower)) {
    return 'punch_off';
  }
  if (hasCue(text, 'hours', 'how many hours')) return 'view';
  const hasRange = parseTimeRange(text) != null;
  // A planning verb with a time range is a new shift, even one that names a break.
  if (ADJUST_CUES.test(lower) && !(hasRange && /\b(?:add|new|schedule|book|put)\b/.test(lower))) {
    return 'adjust_shift';
  }
  if (hasRange || /\b(?:add|new|book|put|give|create)\b[^.]*\bshifts?\b|\bschedule\s+[a-z]+\s+(?:for|on|from)\b/.test(lower)) {
    return 'add_shift';
  }
  return 'view';
}

// The clock time that follows one of `cues` ("left at 8", "started 10:30am").
function timeAfter(text: string, cues: string): string | null {
  const m = new RegExp(`\\b(?:${cues})\\s+(?:work\\s+)?(?:at|until|till|til|to|around|by)?\\s*(\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)?)(?![\\d:]|\\s*(?:min|mins|minutes?|hours?|hrs?)\\b)`, 'i').exec(text);
  return m ? m[1].trim() : null;
}

// What an "actual times" utterance names: a different start, a different end
// and/or break minutes. "instead of 7" is dropped first so the planned time is
// never read as the actual one. Times stay as typed ("8", "8pm"); the executor
// resolves a bare hour against the planned shift.
export function extractShiftAdjustment(text: string): { start: string | null; end: string | null; breakMinutes: number | null } {
  const t = text.replace(/\b(?:instead|rather)\s+(?:of|than)\s+(?:at\s+)?\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?/gi, ' ');
  return {
    start: timeAfter(t, 'started|start|came\\s+in|got\\s+in|arrived|showed\\s+up|in'),
    end: timeAfter(t, 'left|leave|leaving|stayed|finished|worked|done|out|off'),
    breakMinutes: parseBreakMinutes(t),
  };
}

// Words that follow a timesheet cue but are never a name (shift nouns, adverbs).
const TIMESHEET_NAME_STOPWORDS = new Set([
  ...NOT_A_NAME,
  'how', 'many', 'not', 'it', 'wait',
  'in', 'out', 'off', 'on', 'now', 'today', 'for', 'of', 'lunch', 'break',
  'shift', 'work', 'the', 'a', 'an', 'me', 'myself', 'please', 'employee',
  'again', 'early', 'late', 'is', 'and', 'at', 'from', 'to', 'until', 'till',
  'today', 'tomorrow', 'yesterday', 'tonight', 'this', 'next', 'last', 'week',
  'shifts', 'schedule', 'hours', 'left', 'started', 'stayed', 'took', 'had',
  'add', 'new', 'put', 'book', 'give', 'i', 'my', 'who', 'working', 'works',
  'when', 'does', 'do', 'did', 'what', 'whos', 'are', 'was', 'be', 'off', 'scheduled', 'here', 'with', 'instead',
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'min', 'mins', 'minute', 'minutes', 'hour', 'hours', 'am', 'pm', 'th', 'st', 'nd', 'rd',
]);

// An employee name spoken in a timesheet utterance: after a punch verb ("clock in
// Sarah"), after "add employee ...", after "hours for ...", or the capitalized
// "for <Name>" fallback. Rejects stopwords and any token with a digit, so a shift
// noun or a time is never read as a name. Confirmable in the check for add_employee;
// used directly for the immediate punch/view ops.
export function extractEmployeeName(text: string): string | null {
  text = normalizeUtterance(text).replace(/\b([a-z]+?)(?:['’]s|s)(?=\s+(?:shift|hours))/gi, '$1');
  const correction = text.match(/\b(?:it\s+was|for)\s+([a-z]+)(?:\s+not\b|$)/i);
  if (correction && !TIMESHEET_NAME_STOPWORDS.has(correction[1].toLowerCase())) return titleCase(correction[1]);
  const nameToken = "([A-Za-z][A-Za-z'.-]*(?:\\s+[A-Za-z][A-Za-z'.-]*)?)";
  const m1 = text.match(new RegExp(`\\b(?:clock|punch|sign|check)\\s*(?:in|out|off|on)\\s+(?:for\\s+)?${nameToken}`, 'i'));
  const m2 = text.match(new RegExp(`\\b(?:add|new|register|create|hire|onboard)\\s+(?:an?\\s+)?employee\\s+(?:named\\s+|called\\s+)?${nameToken}`, 'i'));
  const m3 = text.match(new RegExp(`\\b(?:hours?|timesheet|time|shifts?|punches?)\\s+(?:for|of)\\s+${nameToken}`, 'i'));
  const m4 = text.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  // Shift phrasing: "add a shift for sue", "schedule Parsa 4-9", "Sue left at 8",
  // "Parsa took a 30 min break", or a line that simply leads with the name
  // ("Parsa 4pm to 7pm: 5th, 6, 7").
  const m5 = text.match(new RegExp(`\\bshifts?\\s+(?:for\\s+)?${nameToken}`, 'i'));
  const m6 = text.match(new RegExp(`\\b(?:schedule|book|put|give)\\s+${nameToken}`, 'i'));
  const m7 = text.match(new RegExp(`${nameToken}\\s+(?:left|stayed|started|came|got|arrived|finished|took|had|worked|is\\s+working|works)\\b`, 'i'));
  const m8 = text.match(new RegExp(`\\b(?:for|by)\\s+${nameToken}`, 'i'));
  // "when does sue work", "is sue working friday".
  const m10 = text.match(new RegExp(`\\b(?:does|is|did|was)\\s+${nameToken}\\s+(?:work|working|on|in|scheduled)\\b`, 'i'));
  const m9 = text.match(new RegExp(`^\\s*${nameToken}`));
  const candidates = [m1, m2, m3, m4, m5, m6, m7, m10, m8, m9].map((m) => (m?.[1] || '').trim()).filter(Boolean);
  const raw = candidates.find((c) =>
    c.split(/\s+/).some((t) => !TIMESHEET_NAME_STOPWORDS.has(t.toLowerCase()) && !/\d/.test(t)),
  );
  if (!raw) return null;
  const tokens = raw
    .split(/\s+/)
    .filter((t) => !TIMESHEET_NAME_STOPWORDS.has(t.toLowerCase()) && !/\d/.test(t));
  if (tokens.length === 0) return null;
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
}

// --- Describing the thing itself ------------------------------------------------
// The free-text fields (what was sold, which key, what the note says) are read by
// taking away everything that is something else: the request words, the price,
// the count, the customer, how they paid. What is left is the item.

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MONEY_PHRASE =
  /(?:\b(?:for|at|price|cost|costs|total)\s+|@\s*)?(?:\$\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?\$|\d+(?:\.\d{1,2})?\s*(?:dollars?|bucks)\b)/gi;
const SIDE_PHRASES = [
  /\b(?:and\s+)?(?:charge|charged)\s+(?:it\s+)?(?:(?:to|on)\s+)?(?:her|his|their|the|a)?\s*(?:card|debit|credit|visa|mastercard)?\b/gi,
  /\bpaid\s+(?:by|with|in)\s+\w+\b/gi,
  /\b(?:by|on|with)\s+(?:card|cash|debit|credit|visa|mastercard|interac)\b/gi,
  /\b(?:cash|debit|credit|tap|tapped|moneris|visa|mastercard|interac|paid|pay)\b/gi,
  /\b(?:and\s+)?print\s+(?:a\s+)?(?:4\s?x\s?6\s+)?label\b/gi,
  /\b(?:no|without|remove|drop|skip|minus|add|with|include|apply|plus)\s+(?:the\s+)?(?:gst|tax|taxes)\b/gi,
  /\b(?:gst|tax)[\s-]?(?:free|exempt|included|incl)\b/gi,
];

// Take the customer, contact details, payment, tax and price words out of a line.
function withoutSideDetails(text: string, price: number | null, quantity: number | null): string {
  let t = ` ${text} `;
  const name = extractName(text);
  if (name) t = t.replace(new RegExp(`\\b(?:for|name(?:d)?(?:\\s+is)?|customer(?:\\s+name)?(?:\\s+is)?)\\s+${escapeRe(name)}`, 'i'), ' ');
  for (const x of [extractPhone(text), extractEmail(text)]) if (x) t = t.replace(x, ' ');
  for (const re of SIDE_PHRASES) t = t.replace(re, ' ');
  t = t.replace(/\b(?:qty|quantity)\s*(?:is\s+|[:=]\s*)?\d{1,3}\b|(?<![A-Za-z0-9])x\s?\d{1,3}\b/gi, ' ');
  t = t.replace(MONEY_PHRASE, ' ');
  // The bare price (last time it appears) and the count (first time).
  if (price != null) {
    const re = new RegExp(`(?<![A-Za-z0-9.])${escapeRe(String(price))}0?(?![A-Za-z0-9]|\\.\\d)`, 'g');
    const hits = [...t.matchAll(re)];
    const last = hits[hits.length - 1];
    if (last) t = `${t.slice(0, last.index)} ${t.slice(last.index! + last[0].length)}`;
  }
  if (quantity != null) t = t.replace(new RegExp(`(?<![A-Za-z0-9.$])${quantity}(?:\\s*x)?(?![A-Za-z0-9])`), ' ');
  return t.replace(/\s+/g, ' ').trim();
}

const tidy = (t: string): string | null => {
  const out = t
    .replace(/^(?:(?:a|an|the|some|of|and|with|for|one)\b\s*)+/i, '')
    .replace(/(?:\s*\b(?:and|with|for|plus|at|each)\b)+\s*$/i, '')
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out.length > 0 ? out : null;
};

// What was sold on a supplies receipt: "sold a phone case for $10" gives "phone
// case", "sale 3 pens 4.50" gives "pens".
export function describeSale(text: string, price: number | null, quantity: number | null): string | null {
  const t = withoutSideDetails(digitsForWords(text), price, quantity)
    .replace(/^(?:please\s+)?(?:(?:customer|they|he|she|i|we)\s+)?(?:(?:sold|sell|selling|sale|bought|buy|buying|purchase|purchased|receipt|invoice|rang\s+up|ring\s+up)\b[\s:,-]*)+/i, '');
  return tidy(t);
}

// A key with no blank code on it: "house key copy $4" gives "house key".
export function describeKey(text: string, price: number | null): string | null {
  const t = withoutSideDetails(digitsForWords(normalizeUtterance(text)), price, extractSaleQuantity(text)).replace(
    /\b(?:lady|guy|customer|he|she|wants|needs|need|can|u|could|you|pls|me|gimme|give|her|his|my|for|receipt|invoice|cut|cutting|copy|copies|copied|dup|dupe|duplicate[ds]?|made|make|please|a|an|of)\b/gi,
    ' ',
  );
  return tidy(t.replace(/\bkeys\b/gi, 'key'));
}

// The item an inventory change is about: a key code ("KW1"), a cartridge ("HP
// 65"), else the words left once the stock phrasing is taken out.
export function describeStockItem(text: string): string | null {
  const brand = extractBrand(text);
  if (brand) {
    const model = extractModel(text);
    return model ? `${brand} ${model}` : brand;
  }
  const codes = extractKeyItems(text);
  if (codes.length > 0) return codes[0].model;
  const t = text.replace(
    /\b(?:please|mark|marked|set|add|added|restock|restocked|update|we'?re|were|we|are|is|im|i'm|out\s+of\s+stock|back\s+in\s+stock|in\s+stock|out\s+of|sold\s+out|ran|run|running|low\s+on|to\s+(?:the\s+)?inventory|inventory|as|now|again|back|all|blanks?)\b/gi,
    ' ',
  );
  return tidy(t);
}

// Whether an inventory change says the item is in or out. Null when it says neither.
export function extractInStock(text: string): boolean | null {
  if (/\bout\s+of\b|\bsold\s+out\b|\bran\s+out\b|\bno\s+more\b|\bnone\s+left\b/i.test(text)) return false;
  if (/\bin\s+stock\b|\brestock/i.test(text)) return true;
  return null;
}

// The words that open a note. Everything after them is the note, whatever it
// goes on to mention.
export const NOTE_LEAD =
  /^\s*(?:please\s+)?(?:(?:leave|add|make|take|save|write|jot)\s+(?:down\s+)?(?:a\s+)?)?(?:notes?|memo|reminder|remember|remind\s+me|todo|to\s+do|jot\s+down|jot|write\s+down)\b\s*[:,-]?\s*/i;

export function describeNote(text: string): string | null {
  if (!NOTE_LEAD.test(text)) return cleanRemainder(text);
  const body = text.replace(NOTE_LEAD, '').replace(/^(?:that|to)\s+/i, '');
  return body.trim().length > 0 ? body.trim() : null;
}
