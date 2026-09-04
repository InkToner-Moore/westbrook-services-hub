// The receipt cart behind multi-mode: several lines from different tabs (a
// shipment, some packing, a refill) collected onto one receipt before it is
// printed. Each line already carries its own price and tax so the combined
// receipt just sums them. See docs/ai-mode/02-implementation-plan.md (phase 5).
import {
  formatReceiptDate,
  generateReceiptNumber,
  round2,
  type ReceiptItem,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
import type { TaxAmount } from '@/lib/canadaTax';

export type CartLineSource = 'packing' | 'shipping' | 'refill' | 'supplies' | 'key';

export interface CartLine {
  id: string;
  // Line description as printed (may be multi-line for a shipment).
  description: string;
  price: number;
  // Per-line tax already computed. Empty means the line is untaxed.
  taxLines: TaxAmount[];
  source: CartLineSource;
}

export interface CartCustomer {
  name?: string;
  phone?: string;
  email?: string;
}

// Sum the line prices.
export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => round2(sum + (l.price || 0)), 0);
}

// Merge every line's tax by label so, e.g., three GST-taxed lines show one
// "GST (5%)" line on the receipt rather than three.
export function aggregateCartTax(lines: CartLine[]): TaxAmount[] {
  const byLabel = new Map<string, number>();
  const order: string[] = [];
  for (const line of lines) {
    for (const t of line.taxLines) {
      if (!byLabel.has(t.label)) order.push(t.label);
      byLabel.set(t.label, round2((byLabel.get(t.label) ?? 0) + t.amount));
    }
  }
  return order.map((label) => ({ label, amount: byLabel.get(label) ?? 0 }));
}

export function cartTaxTotal(lines: CartLine[]): number {
  return aggregateCartTax(lines).reduce((sum, t) => round2(sum + t.amount), 0);
}

export function cartTotal(lines: CartLine[]): number {
  return round2(cartSubtotal(lines) + cartTaxTotal(lines));
}

// Build the combined receipt for the whole cart. One receipt, one number, one
// customer block, every line itemized, tax aggregated by label.
export function buildCartReceiptOpts(
  lines: CartLine[],
  customer: CartCustomer = {},
): SimpleReceiptOptions {
  const subtotal = cartSubtotal(lines);
  const taxLines = aggregateCartTax(lines);
  const receiptNumber = generateReceiptNumber('RC');
  const todayIso = new Date().toISOString().split('T')[0];
  const items: ReceiptItem[] = lines.map((l) => ({ description: l.description, price: round2(l.price || 0) }));

  return {
    title: 'Receipt',
    identifierLabel: 'Receipt #',
    identifierValue: receiptNumber,
    date: formatReceiptDate(todayIso),
    rows: [
      { label: 'Customer', value: customer.name ?? '' },
      { label: 'Phone', value: customer.phone ?? '' },
      { label: 'Email', value: customer.email ?? '' },
    ],
    items,
    price: subtotal,
    taxLines: taxLines.length ? taxLines : undefined,
    fileNameBase: `receipt-${receiptNumber}`,
  };
}
