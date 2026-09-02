// Receipt executor: turns a confirmed receipt Intent into a real PDF (via the
// shared simpleReceipt generator) plus an Artifact preview and chat download/print
// controls. Refill, Supplies, and Key are handled here; Shipping's multi-item
// build lands with the Packing/shipping work. See docs/ai-mode/01-design.md.
import {
  GST_RATE,
  formatReceiptDate,
  generateReceiptNumber,
  round2,
  type ReceiptRow,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
import type { Intent, ReceiptSubtype } from '../types';
import type { ActionResult } from './types';

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
    return {
      message:
        "Shipping receipts take one or more shipment items (courier, tracking, destination, cost). That builder is coming next; for now use the Receipts page for shipping.",
    };
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
