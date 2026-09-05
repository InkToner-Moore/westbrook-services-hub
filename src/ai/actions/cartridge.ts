// Cartridge manager actions over chat, presented in the app as "Record" (refill
// records): create, change status, view, and list. No delete (that stays manual
// in the dashboard, per the brief). Reuses the same Firestore helpers and the
// public orderStatus mirror the Cartridges page uses; the page remains the
// canonical editor, so this mirrors its write shape rather than importing
// page-local code.
//
// Each executor emits a `refill` artifact with a discriminated `state` so the
// RecordCard renders a purpose-built card per outcome (created, status changed,
// view, list, not found). The internal ids stay cartridge_* and the Firestore
// collections/orderStatus mirror are unchanged; "Record" is a presentation name.
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
  isFilledNumber,
  readCartridgeLines,
  toStoredCartridge,
  type CartridgeLine,
} from '@/lib/cartridges';
import { todayIso } from '../extract';
import type { Intent } from '../types';
import type { ActionResult } from './types';

const ORDERS_COLLECTION = 'cartridgeOrders';

// The three statuses are load-bearing on the public refill page. Never widen
// this enum: the orderStatus mirror and the customer lookup both key off it.
export type OrderStatus = 'in_progress' | 'ready' | 'picked_up';

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

export const STATUS_LABEL: Record<OrderStatus, string> = {
  in_progress: 'in progress',
  ready: 'ready',
  picked_up: 'picked up',
};

// A ready-to-render view of one order for the RecordCard: cartridge lines
// normalized, subtotal precomputed, status carried with its display label.
export interface RefillOrderView {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cartridges: CartridgeLine[];
  status: OrderStatus;
  statusLabel: string;
  dateReceived: string;
  dateCompleted?: string;
  notes: string;
  subtotal: number;
  hasPrice: boolean;
}

// What a 'refill' artifact carries. The RecordCard switches on `state` and
// renders a bespoke card for each; a 4x6 label is offered on every state that
// has an order, price or not.
export type RefillArtifactData =
  | { state: 'created'; order: RefillOrderView }
  | {
      state: 'status';
      order: RefillOrderView;
      before: OrderStatus;
      after: OrderStatus;
      beforeLabel: string;
      afterLabel: string;
    }
  | { state: 'view'; order: RefillOrderView }
  | { state: 'list'; orders: RefillOrderView[]; openCount: number }
  | { state: 'not_found'; orderId: string };

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function num(intent: Intent, key: string): number | undefined {
  const v = intent.fields[key]?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && String(v).trim() !== '' ? n : undefined;
}

// Build the card-ready view from a stored order (or a legacy single-cartridge
// order, which readCartridgeLines normalizes to a one-line array).
function toView(order: CartridgeOrder): RefillOrderView {
  const cartridges = readCartridgeLines(order);
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    cartridges,
    status: order.status,
    statusLabel: STATUS_LABEL[order.status] ?? order.status,
    dateReceived: order.dateReceived,
    dateCompleted: order.dateCompleted,
    notes: order.notes ?? '',
    subtotal: cartridgesSubtotal(cartridges),
    hasPrice: cartridges.some((c) => isFilledNumber(c.price)),
  };
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

  return {
    message: `Order ${order.id} is logged for ${order.customerName}, marked in progress.`,
    artifact: {
      kind: 'refill',
      title: 'New refill record',
      data: { state: 'created', order: toView(order) } satisfies RefillArtifactData,
    },
  };
}

export async function executeCartridgeStatus(intent: Intent): Promise<ActionResult> {
  const orderId = str(intent, 'orderId').toUpperCase();
  const status = str(intent, 'status') as OrderStatus;

  // Never write anything outside the three-status enum, even if the field was
  // hand-edited to free text.
  if (!(status in STATUS_LABEL)) {
    return { message: 'Status must be one of: in progress, ready, picked up.' };
  }

  const order = await getDocument<CartridgeOrder>(ORDERS_COLLECTION, orderId);
  if (!order) {
    return {
      message: `I could not find order ${orderId}. Check the ID and try again.`,
      artifact: {
        kind: 'refill',
        title: 'Refill not found',
        data: { state: 'not_found', orderId } satisfies RefillArtifactData,
      },
    };
  }

  const before = order.status;
  const updates: Partial<CartridgeOrder> = { status };
  if (status === 'picked_up') updates.dateCompleted = todayIso();
  await updateDocument(ORDERS_COLLECTION, orderId, updates);
  const updated: CartridgeOrder = { ...order, ...updates };
  await syncOrderStatus(updated, status);

  return {
    message: `Order ${orderId} is now ${STATUS_LABEL[status]}.`,
    artifact: {
      kind: 'refill',
      title: 'Status changed',
      data: {
        state: 'status',
        order: toView(updated),
        before,
        after: status,
        beforeLabel: STATUS_LABEL[before] ?? before,
        afterLabel: STATUS_LABEL[status],
      } satisfies RefillArtifactData,
    },
  };
}

export async function executeCartridgeList(_intent: Intent): Promise<ActionResult> {
  const orders = await getCollection<CartridgeOrder>(ORDERS_COLLECTION, 'dateReceived');
  const views = orders.map(toView);
  const openCount = views.filter((o) => o.status !== 'picked_up').length;

  return {
    message: openCount
      ? `${openCount} open order${openCount === 1 ? '' : 's'}.`
      : 'No open orders right now.',
    artifact: {
      kind: 'refill',
      title: 'Refill records',
      data: { state: 'list', orders: views, openCount } satisfies RefillArtifactData,
    },
  };
}

// "Modify" with an order id looks the record up and shows it as a VIEW card so
// the counter can read it and then say the new status. With no id, it just
// prompts. Actual edits go through cartridge_status or the Cartridges page.
export async function executeCartridgeModify(intent: Intent): Promise<ActionResult> {
  const orderId = str(intent, 'orderId').toUpperCase();
  if (!orderId) {
    return {
      message:
        'Tell me the order ID (like ORD-AB12CD) and what to change, or edit it on the Cartridges page.',
    };
  }

  const order = await getDocument<CartridgeOrder>(ORDERS_COLLECTION, orderId);
  if (!order) {
    return {
      message: `I could not find order ${orderId}. Check the ID and try again.`,
      artifact: {
        kind: 'refill',
        title: 'Refill not found',
        data: { state: 'not_found', orderId } satisfies RefillArtifactData,
      },
    };
  }

  return {
    message: `Here is ${orderId}. Tell me the new status (ready, picked up, in progress) to change it.`,
    artifact: {
      kind: 'refill',
      title: 'Refill record',
      data: { state: 'view', order: toView(order) } satisfies RefillArtifactData,
    },
  };
}
