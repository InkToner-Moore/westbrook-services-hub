// Label builder seam. A confirmed intent with `attach.label` (a Record or Receipt
// with "print a label" in the ask) should also produce a 4x6 label. The real 4x6
// builder belongs to the Wave 2 Receipt work (it shares the receipt/label render
// path), so Wave 1 ships only the SEAM: a registry-backed `buildLabel` that is a
// friendly no-op until the Receipt agent registers the real builder.
//
// Wave 2 Receipt: call `registerLabelBuilder(realBuilder)` once at startup. The
// builder receives the confirmed intent and returns an ActionResult that may carry
// a `receipt` payload (the 4x6 download/print) and/or an artifact. The confirm
// chain in context.tsx calls `buildLabel(intent)` with no knowledge of whether the
// real one is wired, so nothing else changes when it lands.
import type { Intent } from '../types';
import type { ActionResult } from './types';

export type LabelBuilder = (intent: Intent) => Promise<ActionResult> | ActionResult;

// The default is a safe no-op: it prints nothing and just tells the counter the
// 4x6 label is not wired yet. Wave 2 Receipt replaces it.
const stubBuilder: LabelBuilder = () => ({
  message: 'A 4x6 label was requested. Label printing is coming soon.',
});

let builder: LabelBuilder = stubBuilder;

// Wave 2 Receipt registers the real 4x6 label builder here.
export function registerLabelBuilder(fn: LabelBuilder): void {
  builder = fn;
}

// True once a real builder is registered (the stub is not real).
export function hasLabelBuilder(): boolean {
  return builder !== stubBuilder;
}

// Build a 4x6 label for a confirmed intent. Returns an ActionResult the chat can
// render (a chat line and, later, the label download/print controls).
export function buildLabel(intent: Intent): Promise<ActionResult> | ActionResult {
  return builder(intent);
}
