// Packing supplies (boxes, envelopes) sold at the counter, most often added onto
// a shipment. These used to live inside the classic Shipping receipt as "add-ons";
// now they are their own tab in the Receipt Generator and a chat quick action.
// Kept as a shared lib module so the page and the chat use one source of truth.
import { round2 } from './simpleReceipt';
import { taxesForProvince, type TaxAmount } from './canadaTax';

export interface PackingPreset {
  type: string;   // display name, e.g. "Medium Box"
  cost: number;   // per-unit price in dollars
  custom?: boolean; // the free-entry option: name and cost are typed in
}

// The presets, matching the classic Shipping add-ons in StaffReceipts.tsx so the
// prices stay in one place conceptually.
export const PACKING_PRESETS: PackingPreset[] = [
  { type: 'Small Box', cost: 5 },
  { type: 'Medium Box', cost: 7 },
  { type: 'Large Box', cost: 10 },
  { type: 'Envelope', cost: 1 },
  { type: 'Padded Envelope', cost: 3 },
  { type: 'Custom', cost: 0, custom: true },
];

export interface PackingItem {
  name: string;      // preset type or the custom name
  cost: number;      // per-unit price
  quantity: number;  // how many
  taxable: boolean;  // charge Alberta GST on it (in-store sale)
}

export function emptyPackingItem(): PackingItem {
  return { name: '', cost: 0, quantity: 1, taxable: true };
}

// Packing sold in-store is taxed at the Calgary (Alberta) rate: GST only.
const STORE_PROVINCE = 'AB';

export function packingLineTotal(item: PackingItem): number {
  return round2((item.cost || 0) * (item.quantity || 0));
}

// Tax lines for one packing item: Alberta GST on the line total, or none when the
// item is marked not taxable.
export function packingTaxLines(item: PackingItem): TaxAmount[] {
  if (!item.taxable) return [];
  return taxesForProvince(STORE_PROVINCE, packingLineTotal(item));
}

// A short label for a packing item, used on the receipt line and in the chat.
export function packingLabel(item: PackingItem): string {
  const name = item.name.trim() || 'Packing item';
  return item.quantity > 1 ? `${name} x${item.quantity}` : name;
}

export function packingSubtotal(items: PackingItem[]): number {
  return items.reduce((sum, i) => round2(sum + packingLineTotal(i)), 0);
}

// Aggregate every item's tax by label so a receipt shows a single "GST (5%)" line.
export function aggregatePackingTax(items: PackingItem[]): TaxAmount[] {
  const byLabel = new Map<string, number>();
  const order: string[] = [];
  for (const item of items) {
    for (const t of packingTaxLines(item)) {
      if (!byLabel.has(t.label)) order.push(t.label);
      byLabel.set(t.label, round2((byLabel.get(t.label) ?? 0) + t.amount));
    }
  }
  return order.map((label) => ({ label, amount: byLabel.get(label) ?? 0 }));
}
