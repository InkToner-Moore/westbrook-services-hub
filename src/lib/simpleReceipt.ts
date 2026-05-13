import jsPDF from 'jspdf';

// Shared helpers + PDF generator for the "simple" thermal-style receipts
// (cartridge refill, toner sale). Can render at 4"x6" or full letter size.

export const GST_RATE = 0.05;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Receipt number like "CR2605131432" — prefix + YYMMDDHHmm.
export const generateReceiptNumber = (prefix: string) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const hh = now.getHours().toString().padStart(2, '0');
  const mi = now.getMinutes().toString().padStart(2, '0');
  return `${prefix}${yy}${mm}${dd}${hh}${mi}`;
};

// Format an ISO date (yyyy-mm-dd) as "May 13, 2026"; returns the input on failure.
export const formatReceiptDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export type ReceiptSize = '4x6' | 'letter';

export interface ReceiptRow {
  label: string;
  value?: string | number | null;
}

export interface SimpleReceiptOptions {
  title: string;             // e.g. "Cartridge Refill Receipt"
  identifierLabel: string;   // "Order ID" or "Receipt #"
  identifierValue: string;
  date: string;              // already formatted for display
  rows: ReceiptRow[];        // blank values are skipped
  price: number;
  gst?: number;              // present => GST/Subtotal/Total lines are shown
  fileNameBase: string;      // e.g. "cartridge-receipt-ORD-AB12"
}

const STORE_NAME = 'Ink, Toner & Moore';
const STORE_ADDRESS = ['1200 37 Street SW, Unit 3b', 'Calgary, AB T3C 1S2', '(403) 686-2835'];

export const generateSimpleReceiptPdf = (opts: SimpleReceiptOptions, size: ReceiptSize) => {
  const isLetter = size === 'letter';
  const doc = new jsPDF({
    unit: 'in',
    orientation: 'portrait',
    format: isLetter ? 'letter' : [4, 6],
  });

  const pageWidth = isLetter ? 8.5 : 4;
  const margin = isLetter ? 0.7 : 0.3;
  const contentWidth = pageWidth - margin * 2;
  const titleSize = isLetter ? 20 : 15;
  const subtitleSize = isLetter ? 12 : 10.5;
  const bodySize = isLetter ? 11.5 : 11;
  const lineHeight = isLetter ? 0.26 : 0.21;
  let y = isLetter ? 0.85 : 0.46;

  // Store name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleSize);
  doc.text(STORE_NAME, pageWidth / 2, y, { align: 'center' });
  y += isLetter ? 0.28 : 0.2;

  // Business address (full-page only)
  if (isLetter) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    STORE_ADDRESS.forEach((line) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 0.16;
    });
    y += 0.06;
  }

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(subtitleSize);
  doc.text(opts.title, pageWidth / 2, y, { align: 'center' });
  y += isLetter ? 0.24 : 0.2;

  // Date
  doc.setFontSize(isLetter ? 10 : 9.5);
  doc.text(opts.date, pageWidth / 2, y, { align: 'center' });
  y += isLetter ? 0.16 : 0.1;

  // Divider under the header
  doc.setLineWidth(0.012);
  doc.line(margin, y, pageWidth - margin, y);
  y += isLetter ? 0.34 : 0.3;

  // Detail rows: bold label, normal value, on one line, with wrapping.
  doc.setFontSize(bodySize);
  const addRow = (label: string, value?: string | number | null, boldValue = false) => {
    const text = value == null ? '' : String(value).trim();
    if (!text) return;
    const labelText = `${label}: `;
    doc.setFont('helvetica', 'bold');
    doc.text(labelText, margin, y);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
    const wrapped = doc.splitTextToSize(text, contentWidth - labelWidth) as string[];
    doc.text(wrapped, margin + labelWidth, y);
    y += lineHeight * wrapped.length;
  };

  addRow(opts.identifierLabel, opts.identifierValue);
  opts.rows.forEach((row) => addRow(row.label, row.value));

  // Pricing block
  y += isLetter ? 0.1 : 0.06;
  doc.setLineWidth(0.008);
  doc.line(margin, y, pageWidth - margin, y);
  y += isLetter ? 0.3 : 0.24;

  if (opts.gst != null) {
    addRow('Subtotal', `$${opts.price.toFixed(2)}`);
    addRow(`GST (${(GST_RATE * 100).toFixed(0)}%)`, `$${opts.gst.toFixed(2)}`);
    addRow('Total', `$${round2(opts.price + opts.gst).toFixed(2)}`, true);
  } else {
    addRow('Price', `$${opts.price.toFixed(2)}`, true);
  }

  // Footer (full-page only)
  if (isLetter) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Thank you for choosing Ink, Toner & Moore — Westbrook Mall', pageWidth / 2, 10.6, {
      align: 'center',
    });
  }

  doc.save(`${opts.fileNameBase}-${isLetter ? 'fullpage' : '4x6'}.pdf`);
};
