// The real purchase recorder, registered at app init (registerPurchaseSeams).
//
// Scope for now (Parsa, keep it minimal): the Moneris Go device integration is
// not built (see docs/moneris-a920-integration-research.md: semi-integrated
// cloud, a backend + certification are required, card data never touches the
// SPA). So this does NOT send anything to a terminal. It RECORDS the intended
// transaction in Firestore so it can be reconciled against the Moneris data
// later, and returns a payment card the counter can mark approved or declined by
// hand once the physical terminal is used. When the backend lands, the device
// send slots in where `deviceStubbed` is set.
import { generateTransactionId, setDocument } from '@/lib/firestore';
import { GST_RATE, grossFromNet } from '@/lib/canadaTax';
import type { Intent } from '../types';
import type { ActionResult } from './types';
import { registerPurchaseRecorder } from './purchase';

export type TransactionStatus = 'recorded' | 'approved' | 'declined';

export interface TransactionRecord {
  id: string;
  amount: number; // what the customer pays, incl. GST when GST is on
  currency: 'CAD';
  status: TransactionStatus;
  method: 'card';
  customerName: string;
  customerPhone: string;
  source: 'ai-mode';
  // Which primary action this payment rode along with (receipt, refill, ...).
  relatedAction: string;
  deviceStubbed: boolean;
  createdAt: string;
  updatedAt: string;
}

// What the PaymentCard renders.
export interface PaymentArtifactData {
  transaction: TransactionRecord;
}

function fieldValue(intent: Intent, key: string): unknown {
  return intent.fields[key]?.value ?? null;
}
function fieldStr(intent: Intent, key: string): string {
  const v = fieldValue(intent, key);
  return v == null ? '' : String(v).trim();
}
function fieldNum(intent: Intent, key: string): number | null {
  const v = fieldValue(intent, key);
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

// The amount to charge: the price field (net), grossed up when the GST toggle is
// on, so the card shows the real total a customer pays.
function chargeAmount(intent: Intent): number {
  const net = fieldNum(intent, 'price') ?? 0;
  const gstOn = intent.fields.gst?.value === true;
  return gstOn ? grossFromNet(net, GST_RATE) : net;
}

async function realRecorder(intent: Intent): Promise<ActionResult> {
  const id = generateTransactionId();
  const now = new Date().toISOString();
  const transaction: TransactionRecord = {
    id,
    amount: chargeAmount(intent),
    currency: 'CAD',
    status: 'recorded',
    method: 'card',
    customerName: fieldStr(intent, 'customerName'),
    customerPhone: fieldStr(intent, 'customerPhone'),
    source: 'ai-mode',
    relatedAction: intent.subtype ? `${intent.action}:${intent.subtype}` : intent.action,
    deviceStubbed: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDocument('transactions', id, { ...transaction });

  const data: PaymentArtifactData = { transaction };
  return {
    message:
      `Recorded a $${transaction.amount.toFixed(2)} card payment (${id}) for reconciliation. ` +
      'Run the card on the terminal, then mark it approved or declined on the right.',
    artifact: { kind: 'payment', title: 'Card payment', data },
  };
}

// Called once at startup from App.tsx.
export function registerPurchaseSeams(): void {
  registerPurchaseRecorder(realRecorder);
}
