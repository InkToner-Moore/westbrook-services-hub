// The shipment-item model behind a shipping receipt. A shipment can carry several
// items, each to its own destination with its own courier, cost, and province-
// derived tax. Kept separate from the flat field specs because it is a repeated
// block, not a single field. See docs/ai-mode/01-design.md (shipping-specific).
import { round2 } from '@/lib/simpleReceipt';
import { taxesForProvince, type TaxAmount } from '@/lib/canadaTax';

export interface ShipmentItem {
  courier: string;        // company + service, e.g. "Purolator Express"
  trackingNumber: string;
  city: string;
  province: string;       // two-letter code
  country: string;
  cost: number | null;
  // Manual tax override in dollars. When null/undefined, tax is computed from the
  // province. Lets the counter change the tax the brief calls "changeable".
  taxOverride?: number | null;
}

export const COUNTRY_DEFAULT = 'Canada';
export const PROVINCE_DEFAULT = 'AB';

export function emptyShipmentItem(): ShipmentItem {
  return {
    courier: '',
    trackingNumber: '',
    city: '',
    province: PROVINCE_DEFAULT,
    country: COUNTRY_DEFAULT,
    cost: null,
    taxOverride: null,
  };
}

// Read a possibly-loose value (from intent fields) into a normalized item list.
// Always returns at least one item so the editor has a row to show.
export function toShipmentItems(value: unknown): ShipmentItem[] {
  if (!Array.isArray(value) || value.length === 0) return [emptyShipmentItem()];
  return value.map((raw) => ({ ...emptyShipmentItem(), ...(raw as Partial<ShipmentItem>) }));
}

// An item is complete enough to print when it has a courier and a cost. The other
// fields read as needed in the check but do not hard-block, matching the app's
// "blocking is only the genuine must-haves" rule.
export function isItemComplete(item: ShipmentItem): boolean {
  return item.courier.trim() !== '' && item.cost != null && Number.isFinite(item.cost);
}

// The tax lines for one item: the manual override as a single line, otherwise the
// province-derived breakdown on its cost.
export function itemTaxLines(item: ShipmentItem): TaxAmount[] {
  const cost = item.cost ?? 0;
  if (item.taxOverride != null && Number.isFinite(item.taxOverride)) {
    return [{ label: 'Tax', amount: round2(item.taxOverride) }];
  }
  return taxesForProvince(item.province, cost);
}

export function itemTaxTotal(item: ShipmentItem): number {
  return itemTaxLines(item).reduce((sum, t) => round2(sum + t.amount), 0);
}

// Sum shipping costs across items.
export function itemsSubtotal(items: ShipmentItem[]): number {
  return items.reduce((sum, i) => round2(sum + (i.cost ?? 0)), 0);
}

// Aggregate every item's tax lines into a single breakdown, merged by label so a
// two-item Alberta shipment shows one "GST (5%)" line, not two.
export function aggregateTaxLines(items: ShipmentItem[]): TaxAmount[] {
  const byLabel = new Map<string, number>();
  const order: string[] = [];
  for (const item of items) {
    for (const line of itemTaxLines(item)) {
      if (!byLabel.has(line.label)) order.push(line.label);
      byLabel.set(line.label, round2((byLabel.get(line.label) ?? 0) + line.amount));
    }
  }
  return order.map((label) => ({ label, amount: byLabel.get(label) ?? 0 }));
}
