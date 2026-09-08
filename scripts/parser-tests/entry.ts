// The surface the harness exercises. Bundled by run.mjs (esbuild) with the `@`
// alias pointed at src, and jspdf / firestore stubbed, so it loads under plain
// Node with no network and no browser globals. Keep this to the offline,
// deterministic pieces: routing, extraction, segmentation, and the pure receipt
// charge math. Anything that talks to Firestore or the LLM proxy at call time
// (resolveKeyPrices, the LlmProvider) does NOT belong here.
export { DeterministicProvider } from '@/ai/providers/deterministic';
export { segmentUtterance, probeRoute } from '@/ai/segment';
export {
  extractMoney,
  extractPhone,
  extractTracking,
  extractCity,
  extractProvince,
  extractKeyItems,
  extractPacking,
  extractShippingCost,
  stripPacking,
  classifyTimesheetOp,
  extractEmployeeName,
  extractKeyLocationOp,
} from '@/ai/extract';
export { chargeAmount } from '@/ai/actions/purchaseRecorder';
export { receiptIntentToCartLines } from '@/ai/actions/cartLines';
export { cartTotal } from '@/ai/cart';
