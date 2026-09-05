// Canadian sales tax by province, used by the shipping receipt. Rates match the
// classic Receipts page (StaffReceipts.tsx). Kept as its own module so AI Mode
// shares one source of truth without changing that page's behavior.
import { round2 } from './simpleReceipt';

export interface TaxLine {
  name: string;        // 'GST' | 'PST' | 'HST'
  percentage: number;  // e.g. 5, 7, 13
}

export interface Province {
  code: string;  // two-letter code, e.g. 'AB'
  name: string;  // display name
  taxes: TaxLine[];
}

// Ordered for the province picker. Rates are current Canadian sales tax.
export const PROVINCES: Province[] = [
  { code: 'AB', name: 'Alberta', taxes: [{ name: 'GST', percentage: 5 }] },
  { code: 'BC', name: 'British Columbia', taxes: [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 7 }] },
  { code: 'MB', name: 'Manitoba', taxes: [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 7 }] },
  { code: 'NB', name: 'New Brunswick', taxes: [{ name: 'HST', percentage: 15 }] },
  { code: 'NL', name: 'Newfoundland and Labrador', taxes: [{ name: 'HST', percentage: 15 }] },
  { code: 'NS', name: 'Nova Scotia', taxes: [{ name: 'HST', percentage: 14 }] },
  { code: 'NT', name: 'Northwest Territories', taxes: [{ name: 'GST', percentage: 5 }] },
  { code: 'NU', name: 'Nunavut', taxes: [{ name: 'GST', percentage: 5 }] },
  { code: 'ON', name: 'Ontario', taxes: [{ name: 'HST', percentage: 13 }] },
  { code: 'PE', name: 'Prince Edward Island', taxes: [{ name: 'HST', percentage: 15 }] },
  { code: 'QC', name: 'Quebec', taxes: [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 9.975 }] },
  { code: 'SK', name: 'Saskatchewan', taxes: [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 6 }] },
  { code: 'YT', name: 'Yukon', taxes: [{ name: 'GST', percentage: 5 }] },
];

const BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

export function provinceByCode(code?: string | null): Province | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export interface TaxAmount {
  label: string;   // 'GST (5%)'
  amount: number;
}

// The tax lines for a subtotal in a province, defaulting to Alberta (GST only)
// when the code is unknown. Amounts are rounded to cents.
export function taxesForProvince(code: string | null | undefined, subtotal: number): TaxAmount[] {
  const province = provinceByCode(code) ?? provinceByCode('AB')!;
  return province.taxes.map((t) => ({
    label: `${t.name} (${t.percentage}%)`,
    amount: round2((subtotal * t.percentage) / 100),
  }));
}

// GST two-way math for the Receipt tool: the counter can type EITHER the pre-tax
// (net) price OR the tax-inclusive (gross) price and derive the other. These are
// pure and cents-rounded. A null, non-finite, or zero-or-negative amount returns
// 0 rather than NaN, so a half-typed field never shows garbage. `rate` defaults to
// the 5% federal GST but is overridable for a different single-tax rate.
export const GST_RATE = 0.05;

const safeAmount = (n: number | null | undefined): number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
const safeRate = (rate?: number): number =>
  typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : GST_RATE;

// Gross (tax-inclusive) total from a net (pre-tax) amount: net + tax.
export function grossFromNet(net: number, rate?: number): number {
  return round2(safeAmount(net) * (1 + safeRate(rate)));
}

// Net (pre-tax) amount from a gross (tax-inclusive) total: gross / (1 + rate).
export function netFromGross(gross: number, rate?: number): number {
  const r = safeRate(rate);
  return round2(safeAmount(gross) / (1 + r));
}

// The tax portion of a net (pre-tax) amount: net * rate.
export function taxOf(net: number, rate?: number): number {
  return round2(safeAmount(net) * safeRate(rate));
}
