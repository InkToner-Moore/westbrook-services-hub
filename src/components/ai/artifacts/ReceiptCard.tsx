import { SegmentedTabs } from "@/components/shell/ToolPage";
// The receipt artifact card (kind 'receipt'). The slip is the hero: a paper
// counter slip rendered as HTML (not the PDF iframe, which comes up blank under a
// headless browser), previewable as a full sheet OR a 4x6 label, with money and
// IDs in mono tabular figures. Its pinned foot prints or downloads either size
// from the same builder as the preview, so nothing can drift. Receipts hue is
// emerald. Every state is designed: preview, empty, error. See
// docs/ui-rehaul/DESIGN-SPEC.md ("The slip") and PHASE-2-ARCH.md section 3.
import React, { useState } from 'react';
import { AlertTriangle, Download, FileText, Printer, Receipt, Tag } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { round2, type ReceiptSize, type SimpleReceiptOptions } from '@/lib/simpleReceipt';
import { downloadReceipt, printReceipt } from '@/ai/receiptOutput';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';

interface ReceiptCardData {
  opts?: SimpleReceiptOptions;
  // Which size the preview opens on. Labels open on 4x6; receipts on the full
  // sheet. The counter can flip it with the toggle either way.
  preferredSize?: ReceiptSize;
  // A 4x6 label rather than a sale receipt (drives the heading copy).
  labelOnly?: boolean;
}

const STORE_ADDRESS = ['1200 37 Street SW, Unit 3b', 'Calgary, AB T3C 1S2', '(403) 686-2835'];

const money = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

interface PricingRow {
  label: string;
  value: number;
  strong?: boolean;
}

// Mirror simpleReceipt's pricing block so the preview always matches the PDF.
function pricingRows(opts: SimpleReceiptOptions): PricingRow[] {
  if (opts.hidePrice) return [];
  if (opts.taxLines?.length) {
    const taxTotal = opts.taxLines.reduce((sum, t) => round2(sum + t.amount), 0);
    return [
      { label: 'Subtotal', value: opts.price },
      ...opts.taxLines.map((t) => ({ label: t.label, value: t.amount })),
      { label: 'Total', value: round2(opts.price + taxTotal), strong: true },
    ];
  }
  if (opts.gst != null) {
    return [
      { label: 'Subtotal', value: opts.price },
      { label: 'GST (5%)', value: opts.gst },
      { label: 'Total', value: round2(opts.price + opts.gst), strong: true },
    ];
  }
  return [{ label: opts.items?.length ? 'Total' : 'Price', value: opts.price, strong: true }];
}

function isValidOpts(opts: unknown): opts is SimpleReceiptOptions {
  const o = opts as SimpleReceiptOptions | undefined;
  return !!o && typeof o.price === 'number' && Array.isArray(o.rows);
}

// The paper slip. Reads as something that could be torn off and handed over.
const Slip: React.FC<{ opts: SimpleReceiptOptions; size: ReceiptSize }> = ({ opts, size }) => {
  const { themeClasses } = useTheme();
  const isLabel = size === '4x6';
  const divide = 'divide-pub-edge';
  const rule = 'border-pub-edge';

  const rows = opts.rows.filter((r) => r.value != null && String(r.value).trim() !== '');
  const items = opts.items ?? [];
  const prices = pricingRows(opts);

  return (
    <div
      className={`mx-auto w-full ${isLabel ? 'max-w-[300px]' : 'max-w-[440px]'} overflow-hidden rounded-xl border bg-pub-paper border-pub-edge`}
    >
      {/* Emerald counter-slip cap (the Receipts tool hue). */}
      <div className="h-1 w-full bg-pub-accent" />

      <div className="px-5 py-4">
        {/* Header */}
        <div className="text-center">
          <p className="font-display text-[15px] font-semibold tracking-tight text-pub-ink">
            Ink, Toner & Moore
          </p>
          {!isLabel && (
            <div className="mt-1 space-y-0.5 text-[11px] text-pub-muted">
              {STORE_ADDRESS.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
          <p className="mt-2 text-[13px] font-medium text-pub-muted">{opts.title}</p>
          {opts.date && (
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-pub-muted">{opts.date}</p>
          )}
        </div>

        <div className={`my-3 border-t ${rule}`} />

        {/* Detail ledger: label left, value right; the id in mono. */}
        <div className={`divide-y ${divide}`}>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-[13px] text-pub-muted">{opts.identifierLabel}</span>
            <span className="font-mono text-[13px] tabular-nums text-pub-ink">
              {opts.identifierValue}
            </span>
          </div>
          {rows.map((row, i) => (
            <div key={`${row.label}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="text-[13px] text-pub-muted">{row.label}</span>
              <span className="text-right text-[13px] text-pub-ink">{String(row.value)}</span>
            </div>
          ))}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <>
            <div className={`my-3 border-t ${rule}`} />
            <p className="mb-1 text-[13px] font-semibold text-pub-muted">
              Items
            </p>
            <div className={`divide-y ${divide}`}>
              {items.map((item, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="whitespace-pre-line text-[13px] text-pub-ink">
                    {item.description}
                  </span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-pub-ink">
                    {money(item.price)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pricing block */}
        {prices.length > 0 && (
          <>
            <div className={`my-3 border-t ${rule}`} />
            <div className="space-y-1">
              {prices.map((p, i) => (
                <div key={`${p.label}-${i}`} className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-[13px] ${p.strong ? `font-semibold text-pub-ink` : themeClasses.text.secondary}`}
                  >
                    {p.label}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${p.strong ? `text-base font-semibold text-pub-ink` : `text-[13px] text-pub-ink`}`}
                  >
                    {money(p.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footnote small print (full sheet only). */}
        {!isLabel && opts.footnote?.length ? (
          <>
            <div className={`my-3 border-t ${rule}`} />
            <div className="space-y-1 text-[10px] leading-snug text-pub-muted">
              {opts.footnote.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

const SegmentedToggle: React.FC<{ size: ReceiptSize; onChange: (s: ReceiptSize) => void }> = ({ size, onChange }) => (
  <SegmentedTabs<ReceiptSize> size="sm" label="Receipt size" value={size} onChange={onChange} options={[
    { value: 'letter', label: 'Full sheet', icon: FileText },
    { value: '4x6', label: '4x6 label', icon: Tag },
  ]} />
);

const EmptyState: React.FC = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pub-sunk border-pub-edge">
        <Receipt className="h-6 w-6 text-pub-accent" />
      </div>
      <p className="text-sm font-medium text-pub-muted">Nothing on this receipt yet</p>
      <p className="mt-1 max-w-[16rem] text-[13px] text-pub-muted">
        Add an item and a price, then confirm, and the slip shows up here to print or download.
      </p>
    </div>
  );
};

const ErrorState: React.FC = () => {
  const { themeClasses } = useTheme();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.status.error}`}>
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-pub-muted">This receipt could not be built</p>
      <p className="mt-1 max-w-[16rem] text-[13px] text-pub-muted">
        Something is off with its details. Go back and confirm it again, and it will render here.
      </p>
    </div>
  );
};

const ReceiptBody: React.FC<{ data: unknown }> = ({ data }) => {
  const d = (data ?? {}) as ReceiptCardData;
  const [size, setSize] = useState<ReceiptSize>(d.preferredSize ?? 'letter');

  if (d.opts === undefined || d.opts === null) return <EmptyState />;
  if (!isValidOpts(d.opts)) return <ErrorState />;
  const opts = d.opts;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-pub-accent" />
        <span className="text-[13px] font-medium text-pub-muted">
          {d.labelOnly ? '4x6 label preview' : 'Receipt preview'}
        </span>
      </div>
      <SegmentedToggle size={size} onChange={setSize} />
      <Slip opts={opts} size={size} />
    </div>
  );
};

const ReceiptFoot: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const opts = ((data ?? {}) as ReceiptCardData).opts;
  if (!isValidOpts(opts)) return null;

  const action = (
    Icon: typeof Printer,
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary',
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-pub-accent ${ variant === 'primary' ? themeClasses.button.primary : themeClasses.button.secondary }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="border-t px-4 py-3 bg-pub-paper border-pub-edge">
      <div className="grid grid-cols-2 gap-2">
        {action(Printer, 'Print full sheet', () => printReceipt(opts, 'letter'), 'primary')}
        {action(Printer, 'Print 4x6', () => printReceipt(opts, '4x6'), 'secondary')}
        {action(Download, 'Download full sheet', () => downloadReceipt(opts, 'letter'), 'secondary')}
        {action(Download, 'Download 4x6', () => downloadReceipt(opts, '4x6'), 'secondary')}
      </div>
    </div>
  );
};

// Registration hook. The integrator adds one import + call in artifactRegistry.tsx:
//   import { register as registerReceipt } from '@/components/ai/artifacts/ReceiptCard';
//   registerReceipt(ARTIFACT_RENDERERS);
export function register(reg: ArtifactRegistry) {
  reg.receipt = { Body: ReceiptBody, Foot: ReceiptFoot };
}

export default ReceiptBody;
