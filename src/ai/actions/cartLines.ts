// Turn a confirmed receipt Intent into one or more cart lines, so multi-mode can
// collect it onto the shared receipt instead of printing it on its own. The per
// line tax mirrors what each receipt type would have charged: Alberta GST on the
// flat types (when GST is on), province-derived tax per shipment item. Packing
// lines are added directly by the packing UI, not through here.
import { GST_RATE, round2 } from '@/lib/simpleReceipt';
import { taxesForProvince, type TaxAmount } from '@/lib/canadaTax';
import type { Intent, ReceiptSubtype } from '../types';
import type { KeyOrderItem } from '../extract';
import { isItemComplete, itemTaxLines, toShipmentItems } from '../shipping';
import { packingLabel, packingLineTotal, packingTaxLines, type PackingItem } from '@/lib/packing';
import type { CartLine, CartLineSource } from '../cart';

let lineCounter = 0;
const lineId = () => {
  lineCounter += 1;
  return `line-${lineCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function num(intent: Intent, key: string): number {
  const v = intent.fields[key]?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function albertaGst(price: number, gstOn: boolean): TaxAmount[] {
  if (!gstOn) return [];
  return [{ label: `GST (${(GST_RATE * 100).toFixed(0)}%)`, amount: round2(price * GST_RATE) }];
}

function flatLine(intent: Intent, subtype: ReceiptSubtype): CartLine[] {
  const price = round2(num(intent, 'price'));
  const gstOn = intent.fields.gst?.value === true;
  const parts: string[] = [];
  if (subtype === 'refill') {
    parts.push('Cartridge Refill');
    const bm = [str(intent, 'brand'), str(intent, 'model')].filter(Boolean).join(' ');
    if (bm) parts.push(bm);
  } else if (subtype === 'supplies') {
    const supply = str(intent, 'supply') || 'Supplies';
    const qty = str(intent, 'quantity');
    parts.push(qty ? `${supply} x${qty}` : supply);
  } else if (subtype === 'key') {
    parts.push(`Key Cutting${str(intent, 'keyModel') ? `: ${str(intent, 'keyModel')}` : ''}`);
  }
  return [
    {
      id: lineId(),
      description: parts.join('\n') || subtype,
      price,
      taxLines: albertaGst(price, gstOn),
      source: subtype as CartLineSource,
    },
  ];
}

function shippingLines(intent: Intent): CartLine[] {
  const items = toShipmentItems(intent.fields.shipmentItems?.value).filter(isItemComplete);
  const gstOn = intent.fields.gst?.value === true;
  return items.map((item) => {
    const parts = [item.courier.trim() || 'Shipment'];
    if (item.trackingNumber.trim()) parts.push(`Tracking: ${item.trackingNumber.trim()}`);
    const dest = [item.city.trim(), item.province.trim(), item.country.trim()].filter(Boolean).join(', ');
    if (dest) parts.push(`To: ${dest}`);
    return {
      id: lineId(),
      description: parts.join('\n'),
      price: round2(item.cost ?? 0),
      taxLines: gstOn ? itemTaxLines(item) : [],
      source: 'shipping' as CartLineSource,
    };
  });
}

// Key-cutting line items, one per key, priced from inventory (resolveKeyPrices
// filled unitPrice before confirm). A key can be the whole receipt or ride on a
// shipment, so this is called for both.
function keyLines(intent: Intent): CartLine[] {
  const raw = intent.fields.keyItems?.value;
  if (!Array.isArray(raw)) return [];
  const gstOn = intent.fields.gst?.value === true;
  return (raw as KeyOrderItem[])
    .filter((it) => it && it.model)
    .map((it) => {
      const price = round2((it.unitPrice ?? 0) * (it.qty || 1));
      const desc = `Key Cutting: ${it.model}${it.qty > 1 ? ` x${it.qty}` : ''}`;
      return {
        id: lineId(),
        description: desc,
        price,
        taxLines: albertaGst(price, gstOn),
        source: 'key' as CartLineSource,
      };
    });
}

// A packing item (from the packing page or a chat pill) as one cart line.
export function packingToCartLine(item: PackingItem): CartLine {
  return {
    id: lineId(),
    description: packingLabel(item),
    price: packingLineTotal(item),
    taxLines: packingTaxLines(item),
    source: 'packing',
  };
}

// Packing supplies captured on the intent ("box $4") as their own cart lines, so
// they land on the receipt and its total alongside the shipment or sale.
function packingLines(intent: Intent): CartLine[] {
  const raw = intent.fields.packing?.value;
  if (!Array.isArray(raw)) return [];
  return (raw as PackingItem[])
    .filter((item) => item && (item.cost ?? 0) > 0)
    .map((item) => packingToCartLine(item));
}

// Convert a confirmed receipt intent to cart lines. Returns [] for anything that
// is not a receipt type or has nothing complete to add.
export function receiptIntentToCartLines(intent: Intent): CartLine[] {
  if (intent.action !== 'receipt') return [];
  const subtype = (intent.subtype ?? 'refill') as ReceiptSubtype;
  const hasKeys = Array.isArray(intent.fields.keyItems?.value) && (intent.fields.keyItems!.value as unknown[]).length > 0;
  let base: CartLine[];
  if (subtype === 'shipping') base = shippingLines(intent);
  else if (subtype === 'key' && hasKeys) base = keyLines(intent);
  else base = flatLine(intent, subtype);
  // Keys can also ride a shipment ("... KW1" on a shipping receipt).
  const ridingKeys = subtype === 'shipping' ? keyLines(intent) : [];
  return [...base, ...ridingKeys, ...packingLines(intent)];
}
