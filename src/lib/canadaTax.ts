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
