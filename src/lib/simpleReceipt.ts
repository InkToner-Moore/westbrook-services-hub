import { jsPDF } from 'jspdf';

// Shared helpers + PDF generator for the store's receipts (cartridge refill,
// toner/supplies sale, key cutting, shipping) and 4x6 labels. One render path,
// two sizes: a full letter page and a 4x6 label.
//
// Design notes: the layout is built to look clean when PRINTED IN BLACK AND
// WHITE on a laser printer, and to use as little toner as possible. There are no
// heavy dark fills anywhere; structure comes from thin hairline rules, generous
// spacing, and a handful of very light gray tints (236-247 on 0-255) used only on
// small areas (the table header row and the totals box). Text is a soft near
// black. The engine also paginates: a long list of items flows onto extra pages
// with the table header repeated and a "Page X of Y" footer, and it picks a
// denser row size automatically so it fits on one page whenever it can.

export const GST_RATE = 0.05;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Receipt number like "CR2605131432": prefix + YYMMDDHHmm.
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

export interface ReceiptItem {
  description: string;
  price: number;
}

export interface SimpleReceiptOptions {
  title: string;             // e.g. "Sales Receipt"
  identifierLabel: string;   // "Order ID" or "Receipt #"
  identifierValue: string;
  date: string;              // already formatted for display
  rows: ReceiptRow[];        // blank values are skipped
  items?: ReceiptItem[];     // itemized lines; `price` must be their subtotal
  price: number;
  gst?: number;              // present => GST/Subtotal/Total lines are shown
  // Multi-line tax breakdown (e.g. GST + PST, or HST). When present it replaces
  // the single `gst` line: Subtotal, each tax line, then Total. Used by shipping
  // receipts where tax depends on the destination province.
  taxLines?: { label: string; amount: number }[];
  fileNameBase: string;      // e.g. "cartridge-receipt-ORD-AB12"
  footnote?: string[];       // small print at the foot (e.g. shipping final-sale terms)
  // When true, no pricing block is drawn at all. Used by 4x6 labels that carry no
  // price (a refill label handed over before the price is known). The rest of the
  // slip (customer, item, id) still prints.
  hidePrice?: boolean;
}

const STORE_NAME = 'Ink, Toner & Moore';
const STORE_ADDRESS = ['1200 37 Street SW, Unit 3b', 'Calgary, AB T3C 1S2', '(403) 686-2835'];
const THANK_YOU = 'Thank you for choosing Ink, Toner & Moore at Westbrook Mall.';

// The file name a saved receipt gets, matching the historical scheme.
export const receiptFileName = (fileNameBase: string, size: ReceiptSize) =>
  `${fileNameBase}-${size === 'letter' ? 'fullpage' : '4x6'}.pdf`;

// --- layout theme ------------------------------------------------------------
// Grayscale palette (0 = black, 255 = white). Kept intentionally light so a B&W
// print lays down little toner.
const INK = 45; // primary text
const MUTED = 120; // labels, secondary text
const FAINT = 165; // tracked micro labels
const RULE = 205; // hairline rules
const RULE_STRONG = 95; // the one accent rule under the header
const FILL_HEADER = 237; // table header band
const FILL_TOTALS = 244; // totals box

interface Density {
  body: number;
  sub: number;
  lineH: number;
  subLineH: number;
  padT: number;
  padB: number;
}

interface Theme {
  pageW: number;
  pageH: number;
  margin: number;
  storeSize: number;
  addrSize: number;
  typeSize: number; // the "SALES RECEIPT" doc-type label
  metaSize: number; // receipt # / date
  sectionSize: number; // "DETAILS" micro heading
  rowLabelW: number; // width of the label column in the details block
  numColW: number;
  amountColW: number;
  colGap: number;
  footerSize: number;
  footnoteSize: number;
  bottomReserve: number; // space kept for the footer at the page foot
  normal: Density;
  compact: Density;
}

const LETTER: Theme = {
  pageW: 8.5,
  pageH: 11,
  margin: 0.62,
  storeSize: 19,
  addrSize: 9,
  typeSize: 11,
  metaSize: 9.5,
  sectionSize: 8,
  rowLabelW: 1.15,
  numColW: 0.34,
  amountColW: 1.15,
  colGap: 0.12,
  footerSize: 8.5,
  footnoteSize: 8,
  bottomReserve: 0.7,
  normal: { body: 10.5, sub: 9, lineH: 0.185, subLineH: 0.155, padT: 0.08, padB: 0.08 },
  compact: { body: 9, sub: 8, lineH: 0.15, subLineH: 0.13, padT: 0.05, padB: 0.05 },
};

const LABEL: Theme = {
  pageW: 4,
  pageH: 6,
  margin: 0.26,
  storeSize: 13,
  addrSize: 7,
  typeSize: 8,
  metaSize: 8,
  sectionSize: 6.5,
  rowLabelW: 0.8,
  numColW: 0.26,
  amountColW: 0.82,
  colGap: 0.09,
  footerSize: 6.5,
  footnoteSize: 6.2,
  bottomReserve: 0.42,
  normal: { body: 9, sub: 8, lineH: 0.155, subLineH: 0.13, padT: 0.05, padB: 0.05 },
  compact: { body: 7.6, sub: 6.8, lineH: 0.125, subLineH: 0.11, padT: 0.032, padB: 0.032 },
};

// Build the receipt and return the jsPDF document without saving it, so callers
// can preview it (doc.output(...)), print it, or save it.
export const buildSimpleReceiptPdf = (opts: SimpleReceiptOptions, size: ReceiptSize) => {
  const t = size === 'letter' ? LETTER : LABEL;
  const doc = new jsPDF({ unit: 'in', orientation: 'portrait', format: size === 'letter' ? 'letter' : [4, 6] });

  const { pageW, pageH, margin } = t;
  const contentW = pageW - margin * 2;
  const right = pageW - margin;
  const pageBottom = pageH - t.bottomReserve;
  let y = 0; // pen top; every text call uses baseline 'top' so y is the top edge

  // Small typed text helper. Draws with the top of the glyphs at `y` so vertical
  // math stays simple. Returns nothing; callers advance y themselves.
  const put = (
    text: string,
    x: number,
    yy: number,
    o: { size: number; bold?: boolean; color?: number; align?: 'left' | 'right' | 'center'; track?: number; maxW?: number } = { size: t.normal.body },
  ) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size);
    doc.setTextColor(o.color ?? INK);
    const opt: Record<string, unknown> = { baseline: 'top' };
    if (o.align) opt.align = o.align;
    if (o.track) opt.charSpace = o.track;
    if (o.maxW) opt.maxWidth = o.maxW;
    doc.text(text, x, yy, opt);
  };

  const hairline = (yy: number, gray = RULE, w = 0.008) => {
    doc.setDrawColor(gray);
    doc.setLineWidth(w);
    doc.line(margin, yy, right, yy);
  };

  const wrap = (text: string, fontSize: number, width: number): string[] => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    return doc.splitTextToSize(text, width) as string[];
  };

  // Tracked micro label like "SALES RECEIPT" / "DETAILS".
  const microLabel = (text: string, x: number, yy: number, align: 'left' | 'right' = 'left') =>
    put(text.toUpperCase(), x, yy, { size: t.sectionSize, bold: true, color: FAINT, track: 0.014, align });

  // --- header (page 1) -------------------------------------------------------
  const drawHeader = (): void => {
    y = size === 'letter' ? 0.62 : 0.3;
    const top = y;

    // Left: store name + address.
    put(STORE_NAME, margin, y, { size: t.storeSize, bold: true, color: INK });
    let leftY = y + t.storeSize / 72 + 0.06;
    STORE_ADDRESS.forEach((line) => {
      put(line, margin, leftY, { size: t.addrSize, color: MUTED });
      leftY += t.addrSize / 72 + 0.045;
    });

    // Right: document type, receipt number, date, right aligned.
    let rightY = top + 0.02;
    microLabel(opts.title, right, rightY, 'right');
    rightY += t.typeSize / 72 + 0.08;
    const idLine = `${opts.identifierLabel} ${opts.identifierValue}`.trim();
    if (idLine) {
      put(idLine, right, rightY, { size: t.metaSize, bold: true, color: INK, align: 'right' });
      rightY += t.metaSize / 72 + 0.055;
    }
    if (opts.date) {
      put(opts.date, right, rightY, { size: t.metaSize, color: MUTED, align: 'right' });
      rightY += t.metaSize / 72 + 0.055;
    }

    y = Math.max(leftY, rightY) + 0.06;
    // Double rule: one firm, one faint, for a printed-stationery feel at low ink.
    hairline(y, RULE_STRONG, 0.016);
    y += 0.035;
    hairline(y, RULE, 0.007);
    y += size === 'letter' ? 0.22 : 0.14;
  };

  // Slim running header for continuation pages.
  const drawRunningHeader = (): void => {
    y = size === 'letter' ? 0.5 : 0.26;
    put(STORE_NAME, margin, y, { size: t.addrSize + 1.5, bold: true, color: MUTED });
    const cont = `${opts.identifierValue} (continued)`.trim();
    put(cont, right, y, { size: t.addrSize, color: MUTED, align: 'right' });
    y += (t.addrSize + 1.5) / 72 + 0.08;
    hairline(y, RULE, 0.007);
    y += size === 'letter' ? 0.16 : 0.1;
  };

  const newPage = (): void => {
    doc.addPage();
    drawRunningHeader();
  };

  // --- details rows ----------------------------------------------------------
  const drawDetails = (): void => {
    const rows = opts.rows.filter((r) => r.value != null && String(r.value).trim() !== '');
    if (rows.length === 0) return;
    microLabel('Details', margin, y);
    y += t.sectionSize / 72 + 0.09;
    const valueX = margin + t.rowLabelW;
    const valueW = contentW - t.rowLabelW;
    rows.forEach((r) => {
      const lineTop = y;
      put(r.label, margin, lineTop, { size: t.normal.body, color: MUTED });
      const lines = wrap(String(r.value).trim(), t.normal.body, valueW);
      lines.forEach((ln, i) => put(ln, valueX, lineTop + i * t.normal.lineH, { size: t.normal.body, color: INK }));
      y = lineTop + Math.max(1, lines.length) * t.normal.lineH + 0.02;
    });
    y += size === 'letter' ? 0.12 : 0.07;
  };

  // --- items -----------------------------------------------------------------
  // A price-less label (hidePrice) drops the whole amount column so the item
  // never prints a misleading "$0.00".
  const priceless = !!opts.hidePrice;
  const numRight = margin + t.numColW - t.colGap * 0.4;
  const descX = margin + t.numColW;
  const descW = contentW - t.numColW - (priceless ? 0 : t.amountColW + t.colGap);

  interface Prepped {
    num: string;
    main: string[];
    subs: string[];
    priceText: string;
    height: (d: Density) => number;
  }

  const prepItems = (d: Density): Prepped[] =>
    (opts.items ?? []).map((item, i) => {
      const segs = item.description.split('\n').map((s) => s.trim()).filter(Boolean);
      const first = segs.shift() ?? '';
      const main = wrap(first, d.body, descW);
      const subs = segs.flatMap((s) => wrap(s, d.sub, descW));
      return {
        num: `${i + 1}`,
        main,
        subs,
        priceText: `$${item.price.toFixed(2)}`,
        height: (dd: Density) => dd.padT + main.length * dd.lineH + subs.length * dd.subLineH + dd.padB,
      };
    });

  const tableHeaderH = t.normal.body / 72 + 0.14;

  const drawTableHeader = (d: Density): void => {
    doc.setFillColor(FILL_HEADER, FILL_HEADER, FILL_HEADER);
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.006);
    doc.rect(margin, y, contentW, tableHeaderH, 'F');
    const ty = y + 0.045;
    put('#', numRight, ty, { size: t.sectionSize, bold: true, color: MUTED, align: 'right' });
    put('DESCRIPTION', descX, ty, { size: t.sectionSize, bold: true, color: MUTED, track: 0.01 });
    if (!priceless) put('AMOUNT', right, ty, { size: t.sectionSize, bold: true, color: MUTED, align: 'right' });
    y += tableHeaderH;
  };

  const drawItems = (prepped: Prepped[], d: Density): void => {
    if (prepped.length === 0) return;
    drawTableHeader(d);
    prepped.forEach((p) => {
      const rowH = p.height(d);
      if (y + rowH > pageBottom) {
        newPage();
        drawTableHeader(d);
      }
      const rowTop = y;
      let ly = rowTop + d.padT;
      const firstLineY = ly;
      put(p.num, numRight, ly, { size: d.body, color: MUTED, align: 'right' });
      p.main.forEach((ln) => {
        put(ln, descX, ly, { size: d.body, color: INK });
        ly += d.lineH;
      });
      p.subs.forEach((ln) => {
        put(ln, descX, ly, { size: d.sub, color: MUTED });
        ly += d.subLineH;
      });
      if (!priceless) put(p.priceText, right, firstLineY, { size: d.body, color: INK, align: 'right' });
      y = rowTop + rowH;
      hairline(y, RULE, 0.006);
    });
  };

  // --- totals ----------------------------------------------------------------
  interface TotalLine {
    label: string;
    value: string;
    strong?: boolean;
  }

  const buildTotalLines = (): TotalLine[] => {
    const lines: TotalLine[] = [];
    if (opts.taxLines?.length) {
      const taxTotal = opts.taxLines.reduce((s, x) => round2(s + x.amount), 0);
      lines.push({ label: 'Subtotal', value: `$${opts.price.toFixed(2)}` });
      opts.taxLines.forEach((x) => lines.push({ label: x.label, value: `$${x.amount.toFixed(2)}` }));
      lines.push({ label: 'Total', value: `$${round2(opts.price + taxTotal).toFixed(2)}`, strong: true });
    } else if (opts.gst != null) {
      lines.push({ label: 'Subtotal', value: `$${opts.price.toFixed(2)}` });
      lines.push({ label: `GST (${(GST_RATE * 100).toFixed(0)}%)`, value: `$${opts.gst.toFixed(2)}` });
      lines.push({ label: 'Total', value: `$${round2(opts.price + opts.gst).toFixed(2)}`, strong: true });
    } else {
      lines.push({ label: opts.items?.length ? 'Total' : 'Price', value: `$${opts.price.toFixed(2)}`, strong: true });
    }
    return lines;
  };

  const totalsRowH = t.normal.lineH + 0.03;
  const totalsPad = size === 'letter' ? 0.12 : 0.08;

  const drawTotals = (lines: TotalLine[]): void => {
    const boxW = size === 'letter' ? 3.0 : 1.95;
    const boxX = right - boxW;
    const boxH = totalsPad * 2 + lines.length * totalsRowH + 0.04;
    if (y + boxH + 0.14 > pageBottom) newPage();
    y += size === 'letter' ? 0.16 : 0.1;
    doc.setFillColor(FILL_TOTALS, FILL_TOTALS, FILL_TOTALS);
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.007);
    doc.rect(boxX, y, boxW, boxH, 'FD');
    let ry = y + totalsPad;
    const labelX = boxX + totalsPad;
    const valX = boxX + boxW - totalsPad;
    lines.forEach((ln) => {
      if (ln.strong) {
        doc.setDrawColor(RULE_STRONG);
        doc.setLineWidth(0.009);
        doc.line(boxX + totalsPad * 0.6, ry, boxX + boxW - totalsPad * 0.6, ry);
        ry += 0.05;
        put(ln.label, labelX, ry, { size: t.normal.body + 1.5, bold: true, color: INK });
        put(ln.value, valX, ry, { size: t.normal.body + 1.5, bold: true, color: INK, align: 'right' });
        ry += totalsRowH + 0.02;
      } else {
        put(ln.label, labelX, ry, { size: t.normal.body, color: MUTED });
        put(ln.value, valX, ry, { size: t.normal.body, color: INK, align: 'right' });
        ry += totalsRowH;
      }
    });
    y += boxH;
  };

  // --- footnote --------------------------------------------------------------
  const drawFootnote = (): void => {
    if (!opts.footnote?.length) return;
    y += size === 'letter' ? 0.2 : 0.12;
    if (y > pageBottom) newPage();
    microLabel('Please note', margin, y);
    y += t.sectionSize / 72 + 0.07;
    opts.footnote.forEach((para) => {
      const lines = wrap(para, t.footnoteSize, contentW);
      const paraH = lines.length * (t.footnoteSize / 72 + 0.035) + 0.05;
      if (y + paraH > pageBottom) newPage();
      lines.forEach((ln) => {
        put(ln, margin, y, { size: t.footnoteSize, color: MUTED });
        y += t.footnoteSize / 72 + 0.035;
      });
      y += 0.05;
    });
  };

  // --- footer + page numbers (stamped after everything is laid out) ----------
  const stampFooters = (): void => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const fy = pageH - t.bottomReserve + (size === 'letter' ? 0.24 : 0.14);
      doc.setDrawColor(RULE);
      doc.setLineWidth(0.006);
      doc.line(margin, fy, right, fy);
      const ty = fy + 0.06;
      put(THANK_YOU, margin, ty, { size: t.footerSize, color: MUTED });
      if (pages > 1) {
        put(`Page ${i} of ${pages}`, right, ty, { size: t.footerSize, color: MUTED, align: 'right' });
      }
    }
  };

  // --- compose ---------------------------------------------------------------
  drawHeader();
  drawDetails();

  if ((opts.items ?? []).length > 0) {
    // Pick the densest row size that keeps the whole receipt on one page; fall
    // back to compact (and let it paginate) when it cannot fit.
    const reserve = 0.16 + (opts.hidePrice ? 0 : buildTotalLines().length * totalsRowH + totalsPad * 2 + 0.2);
    const normalItemsH = tableHeaderH + prepItems(t.normal).reduce((s, p) => s + p.height(t.normal), 0);
    const fits = y + normalItemsH + reserve <= pageBottom;
    const density = fits ? t.normal : t.compact;
    drawItems(prepItems(density), density);
  }

  if (!opts.hidePrice) drawTotals(buildTotalLines());
  drawFootnote();
  stampFooters();

  return doc;
};

export const generateSimpleReceiptPdf = (opts: SimpleReceiptOptions, size: ReceiptSize) => {
  const doc = buildSimpleReceiptPdf(opts, size);
  doc.save(receiptFileName(opts.fileNameBase, size));
};
