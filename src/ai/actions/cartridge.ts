// Cartridge manager actions over chat: create, change status, and list. No delete
// (that stays manual in the dashboard, per the brief). Reuses the same Firestore
// helpers and the public orderStatus mirror the Cartridges page uses; the page
// remains the canonical editor, so this mirrors its write shape rather than
// importing page-local code.
import {
  generateOrderId,
  getCollection,
  getDocument,
  setDocument,
  updateDocument,
} from '@/lib/firestore';
import {
  ORDER_STATUS_COLLECTION,
  lastNameOf,
  type OrderStatusDoc,
} from '@/lib/orderStatus';
import {
  cartridgesSubtotal,
  describeCartridge,
  readCartridgeLines,
  toStoredCartridge,
  type CartridgeLine,
} from '@/lib/cartridges';
import {
  formatReceiptDate,
  generateReceiptNumber,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
import { todayIso } from '../extract';
import type { Intent } from '../types';
import type { ActionResult } from './types';

const ORDERS_COLLECTION = 'cartridgeOrders';

type OrderStatus = 'in_progress' | 'ready' | 'picked_up';

export interface CartridgeOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cartridges: CartridgeLine[];
  status: OrderStatus;
  dateReceived: string;
  dateCompleted?: string;
  notes: string;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  in_progress: 'in progress',
  ready: 'ready',
  picked_up: 'picked up',
};

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function num(intent: Intent, key: string): number | undefined {
  const v = intent.fields[key]?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && String(v).trim() !== '' ? n : undefined;
}

// Write the public-read mirror, exactly as the Cartridges page does.
async function syncOrderStatus(order: CartridgeOrder, status: string) {
  const mirror: OrderStatusDoc = {
    orderId: order.id,
    customerPhone: order.customerPhone,
    customerLastName: lastNameOf(order.customerName),
    status,
  };
  await setDocument(ORDER_STATUS_COLLECTION, order.id, mirror);
}

// The order's receipt Artifact, similar to the Receipt Generator's output.
function orderReceiptOptions(order: CartridgeOrder): SimpleReceiptOptions {
  const items = order.cartridges.map((c) => ({
    description: describeCartridge(c),
    price: typeof c.price === 'number' ? c.price : 0,
  }));
  return {
    title: 'Cartridge Order',
    identifierLabel: 'Order ID',
    identifierValue: order.id,
    date: formatReceiptDate(order.dateReceived) || order.dateReceived,
    rows: [
      { label: 'Customer', value: order.customerName },
      { label: 'Phone', value: order.customerPhone },
      { label: 'Status', value: STATUS_LABEL[order.status] },
      { label: 'Notes', value: order.notes },
    ],
    items,
    price: cartridgesSubtotal(order.cartridges),
    fileNameBase: `cartridge-order-${order.id}`,
  };
}

export async function executeCartridgeCreate(intent: Intent): Promise<ActionResult> {
  const line = toStoredCartridge({
    brand: str(intent, 'brand'),
    model: str(intent, 'model'),
    type: str(intent, 'type'),
    price: num(intent, 'price'),
  });

  const order: CartridgeOrder = {
    id: generateOrderId(),
    customerName: str(intent, 'customerName'),
    customerPhone: str(intent, 'customerPhone'),
    cartridges: [line],
    status: 'in_progress',
    dateReceived: todayIso(),
    notes: str(intent, 'notes'),
  };

  await setDocument(ORDERS_COLLECTION, order.id, order);
  await syncOrderStatus(order, order.status);

  const opts = orderReceiptOptions(order);
  return {
    message: `Order ${order.id} is logged for ${order.customerName}, marked in progress.`,
    artifact: { kind: 'receipt', title: 'Cartridge Order', data: { opts } },
    receipt: { opts },
  };
}

export async function executeCartridgeStatus(intent: Intent): Promise<ActionResult> {
  const orderId = str(intent, 'orderId').toUpperCase();
  const status = str(intent, 'status') as OrderStatus;

  // The three statuses are load-bearing on the public refill page, so never write
  // anything else, even if the field was hand-edited to free text.
  if (!(status in STATUS_LABEL)) {
    return { message: 'Status must be one of: in progress, ready, picked up.' };
  }

  const order = await getDocument<CartridgeOrder>(ORDERS_COLLECTION, orderId);
  if (!order) {
    return { message: `I could not find order ${orderId}. Check the ID and try again.` };
  }

  const updates: Partial<CartridgeOrder> = { status };
  if (status === 'picked_up') updates.dateCompleted = todayIso();
  await updateDocument(ORDERS_COLLECTION, orderId, updates);
  await syncOrderStatus({ ...order, ...updates }, status);

  return { message: `Order ${orderId} is now ${STATUS_LABEL[status] ?? status}.` };
}

export async function executeCartridgeList(_intent: Intent): Promise<ActionResult> {
  const orders = await getCollection<CartridgeOrder>(ORDERS_COLLECTION, 'dateReceived');
  const normalized = orders.map((o) => ({ ...o, cartridges: readCartridgeLines(o) }));
  const open = normalized.filter((o) => o.status !== 'picked_up');

  return {
    message: open.length
      ? `${open.length} open order${open.length === 1 ? '' : 's'}.`
      : 'No open orders right now.',
    artifact: { kind: 'list', title: 'Cartridge orders', data: { orders: normalized } },
  };
}

export function executeCartridgeModify(intent: Intent): ActionResult {
  const orderId = str(intent, 'orderId').toUpperCase();
  return {
    message: orderId
      ? `To change ${orderId}, tell me the new status (ready, picked up, in progress), or edit the order on the Cartridges page.`
      : 'Tell me the order ID (like ORD-AB12CD) and what to change, or edit it on the Cartridges page.',
  };
}
