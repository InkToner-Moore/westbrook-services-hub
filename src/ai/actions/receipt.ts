// Receipt executor: turns a confirmed receipt Intent into a real PDF (via the
// shared simpleReceipt generator) plus an Artifact preview and chat download/print
// controls. Refill, Supplies, and Key are handled here; Shipping's multi-item
// build lands with the Packing/shipping work. See docs/ai-mode/01-design.md.
import {
  GST_RATE,
  formatReceiptDate,
  generateReceiptNumber,
  round2,
  type ReceiptItem,
  type ReceiptRow,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
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
function shipmentItemLine(item: ShipmentItem, index: number): ReceiptItem {
  const parts = [item.courier.trim() || 'Shipment'];
  if (item.trackingNumber.trim()) parts.push(`Tracking: ${item.trackingNumber.trim()}`);
  const dest = [item.city.trim(), item.province.trim(), item.country.trim()].filter(Boolean).join(', ');
  if (dest) parts.push(`To: ${dest}`);
  return { description: parts.join('\n'), price: round2(item.cost ?? 0) };
}

function executeShipping(intent: Intent): ActionResult {
  const items = toShipmentItems(intent.fields.shipmentItems?.value).filter(isItemComplete);
  if (items.length === 0) {
    return {
      message: 'A shipping receipt needs at least one item with a courier and a cost. Add one and try again.',
    };
  }

  const gstOn = intent.fields.gst?.value === true;
  const subtotal = itemsSubtotal(items);
  const taxLines = gstOn ? aggregateTaxLines(items) : [];
  const taxTotal = taxLines.reduce((sum, t) => round2(sum + t.amount), 0);
  const total = round2(subtotal + taxTotal);
  const receiptNumber = generateReceiptNumber('SH');
  const dateIso = intent.fields.date?.value ? String(intent.fields.date.value) : '';
  const who = intent.fields.customerName?.value ? String(intent.fields.customerName.value).trim() : '';
  const phone = intent.fields.customerPhone?.value ? String(intent.fields.customerPhone.value).trim() : '';
  const email = intent.fields.customerEmail?.value ? String(intent.fields.customerEmail.value).trim() : '';

  const opts: SimpleReceiptOptions = {
    title: 'Shipping Receipt',
    identifierLabel: 'Receipt #',
    identifierValue: receiptNumber,
    date: formatReceiptDate(dateIso) || dateIso,
    rows: [
      { label: 'Customer', value: who },
      { label: 'Phone', value: phone },
      { label: 'Email', value: email },
    ],
    items: items.map(shipmentItemLine),
    price: subtotal,
    taxLines: taxLines.length ? taxLines : undefined,
    footnote: SHIPPING_FOOTNOTE,
    fileNameBase: `shipping-receipt-${receiptNumber}`,
  };

  const count = items.length === 1 ? 'shipping receipt' : `shipping receipt with ${items.length} items`;
  const message = `Here is the ${count}${who ? ` for ${who}` : ''}, total $${total.toFixed(2)}. Download or print it below.`;

  return {
    message,
    artifact: { kind: 'receipt', title: opts.title, data: { opts } },
    receipt: { opts },
  };
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

const TITLES: Record<ReceiptSubtype, string> = {
  refill: 'Cartridge Refill Receipt',
  supplies: 'Supplies Receipt',
  key: 'Key Cutting Receipt',
  shipping: 'Shipping Receipt',
};

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

function rowsFor(subtype: ReceiptSubtype, intent: Intent): ReceiptRow[] {
  switch (subtype) {
    case 'refill':
      return [
        { label: 'Brand', value: str(intent, 'brand') },
        { label: 'Model', value: str(intent, 'model') },
        ...customerRows(intent),
        { label: 'Notes', value: str(intent, 'notes') },
      ];
    case 'supplies':
      return [
        { label: 'Supply', value: str(intent, 'supply') },
        { label: 'Quantity', value: str(intent, 'quantity') },
        { label: 'Brand', value: str(intent, 'brand') },
        { label: 'Model', value: str(intent, 'model') },
        ...customerRows(intent),
        { label: 'Notes', value: str(intent, 'notes') },
      ];
    case 'key':
      return [
        { label: 'Key', value: str(intent, 'keyModel') },
        ...customerRows(intent),
      ];
    default:
      return [];
  }
}

export function executeReceipt(intent: Intent): ActionResult {
  const subtype = (intent.subtype ?? 'refill') as ReceiptSubtype;

  if (subtype === 'shipping') {
    return executeShipping(intent);
  }

  const price = round2(num(intent, 'price'));
  const gstOn = truthy(intent, 'gst');
  const gst = gstOn ? round2(price * GST_RATE) : undefined;
  const receiptNumber = generateReceiptNumber(PREFIXES[subtype]);
  const dateIso = str(intent, 'date');

  const opts: SimpleReceiptOptions = {
    title: TITLES[subtype],
    identifierLabel: 'Receipt #',
    identifierValue: receiptNumber,
    date: formatReceiptDate(dateIso) || dateIso,
    rows: rowsFor(subtype, intent),
    price,
    gst,
    fileNameBase: `${subtype}-receipt-${receiptNumber}`,
  };

  const who = str(intent, 'customerName');
  const total = gst != null ? round2(price + gst) : price;
  const message = `Here is the ${subtype} receipt${who ? ` for ${who}` : ''}, total $${total.toFixed(2)}. Download or print it below.`;

  return {
    message,
    artifact: { kind: 'receipt', title: opts.title, data: { opts } },
    receipt: { opts },
  };
}
