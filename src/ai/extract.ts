// Pure, deterministic field extractors. Each returns a value or null; the caller
// decides provenance (found -> explicit, defaulted -> guessed, absent ->
// not_provided). Heuristic by design: everything is confirmable and editable in
// the check, and the optional LLM improves recall later without changing this.
import { CARTRIDGE_BRANDS, CARTRIDGE_TYPES } from '@/lib/cartridges';

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

// North American 10-digit phone, tolerant of separators and a leading 1.
export function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  return digits.length >= 10 ? m[0].trim() : null;
}

// A money amount, preferring one prefixed with $ or the word price/for.
export function extractMoney(text: string): number | null {
  const dollar = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  if (dollar) return Number(dollar[1]);
  const priced = text.match(/(?:price|for|costs?|is)\s+\$?(\d+(?:\.\d{1,2})?)/i);
  if (priced) return Number(priced[1]);
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

// A customer name after "for" / "customer" / "name". Captures 1-2 capitalized
// words; falls back to a single following word.
export function extractName(text: string): string | null {
  const m = text.match(/\b(?:for|customer|name(?:d)?(?:\s+is)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  return m ? m[1].trim() : null;
}

export interface CourierMatch {
  courier: 'FedEx' | 'Purolator' | 'UPS' | 'Canada Post' | 'DHL' | null;
  trackingNumber: string | null;
}

// Detect a courier and/or a tracking number. Patterns from research
// (docs/ai-mode/00-research.md). Purolator has no reliable public pattern, so it
// is only matched when named explicitly.
export function extractTracking(text: string): CourierMatch {
  const lower = text.toLowerCase();
  let courier: CourierMatch['courier'] = null;
  if (lower.includes('fedex')) courier = 'FedEx';
  else if (lower.includes('purolator')) courier = 'Purolator';
  else if (lower.includes('ups')) courier = 'UPS';
  else if (lower.includes('canada post') || lower.includes('canadapost')) courier = 'Canada Post';
  else if (lower.includes('dhl')) courier = 'DHL';

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

  return { courier, trackingNumber };
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
