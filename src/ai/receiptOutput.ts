// Output helpers for a generated receipt: download at either size, print, or a
// data URI for previewing in the Artifact. All build from the same
// SimpleReceiptOptions so the preview and the downloads always match.
import {
  buildSimpleReceiptPdf,
  generateSimpleReceiptPdf,
  type ReceiptSize,
  type SimpleReceiptOptions,
} from '@/lib/simpleReceipt';

export function downloadReceipt(opts: SimpleReceiptOptions, size: ReceiptSize) {
  generateSimpleReceiptPdf(opts, size);
}

export function printReceipt(opts: SimpleReceiptOptions, size: ReceiptSize = 'letter') {
  const doc = buildSimpleReceiptPdf(opts, size);
  doc.autoPrint();
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}

export function receiptPreviewUri(opts: SimpleReceiptOptions, size: ReceiptSize = 'letter'): string {
  const doc = buildSimpleReceiptPdf(opts, size);
  return doc.output('datauristring');
}
