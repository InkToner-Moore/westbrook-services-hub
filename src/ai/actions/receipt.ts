// Receipt executor: turns a confirmed receipt Intent into a real PDF (via the
// shared simpleReceipt generator) plus an Artifact preview and chat download/print
// controls. Refill, Supplies, Key, and Shipping are handled here. The receipt is
// built from one contextual item line (a custom box reads as "Custom box", not a
// "Model") plus detail rows, with an after-GST total when GST is on. See
// docs/ui-rehaul/PHASE-2-ARCH.md sections 3, 4, 6b.
import {
  formatReceiptDate,
  generateReceiptNumber,
  round2,
  type ReceiptItem,
  type ReceiptRow,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
import { taxOf } from '@/lib/canadaTax';
import type { Intent, ReceiptSubtype } from '../types';
import type { ActionResult } from './types';
import {
  aggregateTaxLines,
  isItemComplete,
  itemsSubtotal,
  toShipmentItems,
  type ShipmentItem,
} from '../shipping';

// Small print printed on every shipping receipt (brief: final-sale terms).
const SHIPPING_FOOTNOTE: string[] = [
  'All shipping sales are final. There are no refunds once a shipment is dropped off with the carrier.',
  "It is the customer's responsibility to make sure their shipping information is correct and checked, including names, addresses, and any commercial invoices or customs paperwork.",
  'Ink, Toner & Moore is not responsible for shipments once they are handed to the carrier and has no refund policy. If something goes wrong, we will do our best to work with the carrier (for example Purolator, FedEx, or UPS) to help however we can.',
];

// One shipment item as a printed line: courier and destination stacked under the
// description, cost on the right.
function shipmentItemLine(item: ShipmentItem): ReceiptItem {
  const parts = [item.courier.trim() || 'Shipment'];
  if (item.trackingNumber.trim()) parts.push(`Tracking: ${item.trackingNumber.trim()}`);
  const dest = [item.city.trim(), item.province.trim(), item.country.trim()].filter(Boolean).join(', ');
  if (dest) parts.push(`To: ${dest}`);
  return { description: parts.join('\n'), price: round2(item.cost ?? 0) };
}

// Read a field's value as a trimmed string ('' when absent).
function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function num(intent: Intent, key: string): number {
  const v = intent.fields[key]?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function truthy(intent: Intent, key: string): boolean {
  return intent.fields[key]?.value === true;
}

// One general title on every printed receipt. What was sold shows in the line
// item and the detail rows, the way a real store receipt reads.
const RECEIPT_TITLE = 'Sales Receipt';

const PREFIXES: Record<ReceiptSubtype, string> = {
  refill: 'CR',
  supplies: 'SP',
  key: 'KY',
  shipping: 'SH',
};

// Customer rows shared across the flat receipt types (blank ones are skipped by
// the generator, matching "only whatever exists is shown" on the printed receipt).
function customerRows(intent: Intent): ReceiptRow[] {
  return [
    { label: 'Customer', value: str(intent, 'customerName') },
    { label: 'Phone', value: str(intent, 'customerPhone') },
    { label: 'Email', value: str(intent, 'customerEmail') },
  ];
}

// The single itemized line for a flat receipt, named for what was actually sold.
// This is the fix for the confusing "Model" label: a custom box sold as supplies
// reads as "Custom box", a refill reads as "Cartridge Refill - HP 65".
function flatItemDescription(subtype: ReceiptSubtype, intent: Intent): string {
  switch (subtype) {
    case 'refill': {
      const bm = [str(intent, 'brand'), str(intent, 'model')].filter(Boolean).join(' ');
      return bm ? `Cartridge Refill - ${bm}` : 'Cartridge Refill';
    }
    case 'supplies': {
      const supply = str(intent, 'supply') || 'Supplies';
      const qty = str(intent, 'quantity');
      return qty ? `${supply} x${qty}` : supply;
    }
    case 'key': {
      const km = str(intent, 'keyModel');
      return km ? `Key Cutting: ${km}` : 'Key Cutting';
    }
    default:
      return 'Item';
  }
}

// Detail rows that are NOT already in the item line, so nothing reads twice. For
// supplies, Brand/Model stay as detail (they are skipped when blank, so a custom
// box never shows an empty "Model").
function detailRowsFor(subtype: ReceiptSubtype, intent: Intent): ReceiptRow[] {
  switch (subtype) {
    case 'refill':
      return [...customerRows(intent), { label: 'Notes', value: str(intent, 'notes') }];
    case 'supplies':
      return [
        { label: 'Brand', value: str(intent, 'brand') },
        { label: 'Model', value: str(intent, 'model') },
        ...customerRows(intent),
        { label: 'Notes', value: str(intent, 'notes') },
      ];
    case 'key':
      return customerRows(intent);
    default:
      return [];
  }
}

// Build the receipt options for a flat (non-shipping) receipt.
function buildFlatOpts(intent: Intent, subtype: ReceiptSubtype): SimpleReceiptOptions {
  const price = round2(num(intent, 'price'));
  const gstOn = truthy(intent, 'gst');
  const gst = gstOn ? taxOf(price) : undefined;
  const receiptNumber = generateReceiptNumber(PREFIXES[subtype]);
  const dateIso = str(intent, 'date');

  return {
    title: RECEIPT_TITLE,
    identifierLabel: 'Receipt #',
    identifierValue: receiptNumber,
    date: formatReceiptDate(dateIso) || dateIso,
    rows: detailRowsFor(subtype, intent),
    items: [{ description: flatItemDescription(subtype, intent), price }],
    price,
    gst,
    fileNameBase: `${subtype}-receipt-${receiptNumber}`,
  };
}

// Build the receipt options for a shipping receipt, or null when no item is
// complete enough to bill.
function buildShippingOpts(intent: Intent): SimpleReceiptOptions | null {
  const items = toShipmentItems(intent.fields.shipmentItems?.value).filter(isItemComplete);
  if (items.length === 0) return null;

  const gstOn = intent.fields.gst?.value === true;
  const subtotal = itemsSubtotal(items);
  const taxLines = gstOn ? aggregateTaxLines(items) : [];
  const receiptNumber = generateReceiptNumber('SH');
  const dateIso = intent.fields.date?.value ? String(intent.fields.date.value) : '';

  return {
    title: RECEIPT_TITLE,
    identifierLabel: 'Receipt #',
    identifierValue: receiptNumber,
    date: formatReceiptDate(dateIso) || dateIso,
    rows: customerRows(intent),
    items: items.map(shipmentItemLine),
    price: subtotal,
    taxLines: taxLines.length ? taxLines : undefined,
    footnote: SHIPPING_FOOTNOTE,
    fileNameBase: `shipping-receipt-${receiptNumber}`,
  };
}

// Public: build the SimpleReceiptOptions for any receipt intent (used by the
// executor here and by the 4x6 label builder in actions/label.ts). Returns null
// only for a shipping receipt with nothing complete to bill.
export function buildReceiptOpts(intent: Intent): SimpleReceiptOptions | null {
  const subtype = (intent.subtype ?? 'refill') as ReceiptSubtype;
  if (subtype === 'shipping') return buildShippingOpts(intent);
  return buildFlatOpts(intent, subtype);
}

function executeShipping(intent: Intent): ActionResult {
  const opts = buildShippingOpts(intent);
  if (!opts) {
    return {
      message: 'A shipping receipt needs at least one item with a courier and a cost. Add one and try again.',
    };
  }

  const taxTotal = (opts.taxLines ?? []).reduce((sum, t) => round2(sum + t.amount), 0);
  const total = round2(opts.price + taxTotal);
  const itemCount = opts.items?.length ?? 0;
  const label = itemCount === 1 ? 'shipping receipt' : `shipping receipt with ${itemCount} items`;
  const who = str(intent, 'customerName');
  const message = `Here is the ${label}${who ? ` for ${who}` : ''}, total $${total.toFixed(2)}. Download or print it below.`;

  return {
    message,
    artifact: { kind: 'receipt', title: opts.title, data: { opts } },
    receipt: { opts },
  };
}

export function executeReceipt(intent: Intent): ActionResult {
  const subtype = (intent.subtype ?? 'refill') as ReceiptSubtype;

  if (subtype === 'shipping') {
    return executeShipping(intent);
  }

  const opts = buildFlatOpts(intent, subtype);
  const who = str(intent, 'customerName');
  const total = round2(opts.price + (opts.gst ?? 0));
  const message = `Here is the ${subtype} receipt${who ? ` for ${who}` : ''}, total $${total.toFixed(2)}. Download or print it below.`;

  return {
    message,
    artifact: { kind: 'receipt', title: opts.title, data: { opts } },
    receipt: { opts },
  };
}
