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
import {
  formatReceiptDate,
  generateReceiptNumber,
  round2,
  type ReceiptRow,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';
import type { Intent } from '../types';
import type { ActionResult } from './types';
import { buildReceiptOpts } from './receipt';

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

// --- The real 4x6 label builder (Wave 2 Receipt) ----------------------------
// Turns any confirmed intent into a 4x6 label ActionResult. A receipt intent
// reuses the receipt's own options so the label mirrors the sale; any other
// intent (a Record/refill, say) gets a generic label built from the common
// fields. Either way the ReceiptCard renders it and its foot prints/downloads at
// 4x6, so there is ONE label render path shared with the receipt card.
function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function num(intent: Intent, key: string): number {
  const v = intent.fields[key]?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// A generic label for a non-receipt intent (e.g. a cartridge refill record). The
// price line is hidden when there is no price, so a refill label prints cleanly
// before the price is known.
function buildGenericLabelOpts(intent: Intent): SimpleReceiptOptions {
  const number = generateReceiptNumber('LB');
  const todayIso = new Date().toISOString().split('T')[0];
  const price = round2(num(intent, 'price'));
  const item =
    [str(intent, 'brand'), str(intent, 'model')].filter(Boolean).join(' ') ||
    str(intent, 'supply') ||
    str(intent, 'keyModel');

  const rows: ReceiptRow[] = [
    { label: 'Customer', value: str(intent, 'customerName') },
    { label: 'Phone', value: str(intent, 'customerPhone') },
    { label: 'Item', value: item },
    { label: 'Notes', value: str(intent, 'notes') },
  ];

  return {
    title: 'Label',
    identifierLabel: 'Ref #',
    identifierValue: number,
    date: formatReceiptDate(todayIso),
    rows,
    price,
    hidePrice: price <= 0,
    fileNameBase: `label-${number}`,
  };
}

// The SimpleReceiptOptions behind a 4x6 label for a confirmed intent.
export function buildLabelOpts(intent: Intent): SimpleReceiptOptions {
  if (intent.action === 'receipt') {
    const base = buildReceiptOpts(intent);
    if (base) {
      const number = generateReceiptNumber('LB');
      return { ...base, title: 'Label', fileNameBase: `label-${number}` };
    }
  }
  return buildGenericLabelOpts(intent);
}

// The real builder registered by registerReceiptSeams below.
const realLabelBuilder: LabelBuilder = (intent) => {
  const opts = buildLabelOpts(intent);
  return {
    message: 'Here is the 4x6 label. Print or download it from the panel on the right.',
    artifact: { kind: 'receipt', title: 'Label', data: { opts, preferredSize: '4x6', labelOnly: true } },
    receipt: { opts },
  };
};

// Wave 2 Receipt startup hook: the integrator calls this ONCE at app init so the
// confirm chain's `buildLabel` produces a real 4x6 label instead of the no-op
// stub. See PHASE-2-ARCH.md section 6b (W2-Receipt).
export function registerReceiptSeams(): void {
  registerLabelBuilder(realLabelBuilder);
}
