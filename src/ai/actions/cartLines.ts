// Turn a confirmed receipt Intent into one or more cart lines, so multi-mode can
// collect it onto the shared receipt instead of printing it on its own. The per
// line tax mirrors what each receipt type would have charged: Alberta GST on the
// flat types (when GST is on), province-derived tax per shipment item. Packing
// lines are added directly by the packing UI, not through here.
import { GST_RATE, round2 } from '@/lib/simpleReceipt';
import { taxesForProvince, type TaxAmount } from '@/lib/canadaTax';
import type { Intent, ReceiptSubtype } from '../types';
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

// Convert a confirmed receipt intent to cart lines. Returns [] for anything that
// is not a receipt type or has nothing complete to add.
export function receiptIntentToCartLines(intent: Intent): CartLine[] {
  if (intent.action !== 'receipt') return [];
  const subtype = (intent.subtype ?? 'refill') as ReceiptSubtype;
  if (subtype === 'shipping') return shippingLines(intent);
  return flatLine(intent, subtype);
}
