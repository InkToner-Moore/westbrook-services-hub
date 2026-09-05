// Purchase recorder seam. A confirmed intent with `attach.pay` (or, later, a
// standalone 'purchase' action) needs to send the transaction to the Moneris Go
// device and record it in Firestore for reconciliation. That backend does not
// exist yet (see docs/moneris-a920-integration-research.md: semi-integrated
// cloud, backend + certification required, card data never touches the SPA), so
// Wave 1 ships only the SEAM: a registry-backed `recordPurchase` that is a
// friendly no-op until Wave 3 registers the real recorder.
//
// Wave 3: call `registerPurchaseRecorder(realRecorder)` once at startup. The
// confirm chain in context.tsx calls `recordPurchase(intent)` with no knowledge
// of whether the real one is wired, so nothing else changes when it lands.
import type { Intent } from '../types';
import type { ActionResult } from './types';

export type PurchaseRecorder = (intent: Intent) => Promise<ActionResult> | ActionResult;

// The default is a safe no-op: it never touches a card or Firestore, it just
// tells the counter the feature is not live yet. Wave 3 replaces it.
const stubRecorder: PurchaseRecorder = () => ({
  message: 'Payment recording is coming soon, so I did not charge a card. The rest is done.',
});

let recorder: PurchaseRecorder = stubRecorder;

// Wave 3 registers the real Moneris + Firestore recorder here.
export function registerPurchaseRecorder(fn: PurchaseRecorder): void {
  recorder = fn;
}

// True once a real recorder is registered (the stub is not real). Lets a caller
// skip the "coming soon" note if it prefers, though the chain runs it regardless.
export function hasPurchaseRecorder(): boolean {
  return recorder !== stubRecorder;
}

// Record a purchase for a confirmed intent. Returns an ActionResult the chat can
// render (a chat line and, later, a payment artifact).
export function recordPurchase(intent: Intent): Promise<ActionResult> | ActionResult {
  return recorder(intent);
}
