// The artifact rail's pinned action foot. Only the buttons that matter for the
// artifact currently open show here: Confirm / Not now for a pending
// confirmation slip, Download 4x6 / full page / Print for a receipt, Open on
// carrier for tracking. An artifact with nothing to do (an order list) renders
// no foot at all. See docs/ui-rehaul/DESIGN-SPEC.md.
import React from 'react';
import { Check, CreditCard, Download, ExternalLink, Printer, Tag } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ArtifactKind } from '@/ai/types';
import type { FieldSpec } from '@/ai/fieldSpecs';
import type { IntentAttachments } from '@/ai/types';
import type { SimpleReceiptOptions } from '@/lib/simpleReceipt';
import type { TrackingCard } from '@/ai/tracking';
import { downloadReceipt, printReceipt } from '@/ai/receiptOutput';

interface ConfirmationFootProps {
  canConfirm: boolean;
  missing: FieldSpec[];
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  // Compound attachments on the intent. When present, the foot shows a toggle
  // per attachment so the counter can flip them before Confirm. Undefined means
  // this intent has no attachments and no extra controls render.
  attach?: IntentAttachments;
  onToggleAttach?: (key: keyof IntentAttachments, value: boolean) => void;
}

interface ArtifactActionsProps {
  kind: ArtifactKind;
  data?: unknown;
  confirmation?: ConfirmationFootProps;
}

const ArtifactActions: React.FC<ArtifactActionsProps> = ({ kind, data, confirmation }) => {
  const { themeClasses } = useTheme();

  if (kind === 'confirmation' && confirmation) {
    const { canConfirm, missing, busy, onConfirm, onDismiss, attach, onToggleAttach } = confirmation;
    const attachToggle = (on: boolean, label: string, Icon: typeof CreditCard, onClick: () => void) => (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          on ? themeClasses.status.success : themeClasses.button.secondary
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
    return (
      <div className={`border-t px-4 py-3 ${themeClasses.header}`}>
        {attach && onToggleAttach && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachToggle(attach.pay === true, 'Also charge card', CreditCard, () =>
              onToggleAttach('pay', !(attach.pay === true)),
            )}
            {attachToggle(attach.label === true, 'Also print 4x6 label', Tag, () =>
              onToggleAttach('label', !(attach.label === true)),
            )}
          </div>
        )}
        <p className={`mb-2.5 text-sm ${themeClasses.text.muted}`}>
          {canConfirm
            ? 'Ready when you are.'
            : missing.length > 0
              ? `Add ${missing.map((m) => m.label).join(', ')} to continue.`
              : 'Add a courier and cost to at least one item to continue.'}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 text-sm ${themeClasses.button.ghost}`}
          >
            Not now
          </button>
          <button
            type="button"
            disabled={!canConfirm || busy}
            onClick={onConfirm}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40 ${themeClasses.button.primary}`}
          >
            <Check className="h-4 w-4" />
            Confirm
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'receipt') {
    const opts = (data as { opts?: SimpleReceiptOptions } | undefined)?.opts;
    if (!opts) return null;
    return (
      <div className={`flex flex-wrap items-center gap-2 border-t px-4 py-3 ${themeClasses.header}`}>
        <button
          type="button"
          onClick={() => downloadReceipt(opts, '4x6')}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm ${themeClasses.button.secondary}`}
        >
          <Download className="h-4 w-4" />
          4x6 label
        </button>
        <button
          type="button"
          onClick={() => downloadReceipt(opts, 'letter')}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm ${themeClasses.button.secondary}`}
        >
          <Download className="h-4 w-4" />
          Full page
        </button>
        <button
          type="button"
          onClick={() => printReceipt(opts, 'letter')}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${themeClasses.button.primary}`}
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
    );
  }

  if (kind === 'tracking') {
    const card = data as TrackingCard | undefined;
    if (!card?.url) return null;
    return (
      <div className={`border-t px-4 py-3 ${themeClasses.header}`}>
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${themeClasses.button.primary}`}
        >
          <ExternalLink className="h-4 w-4" />
          Open on {card.courier}
        </a>
      </div>
    );
  }

  return null;
};

export default ArtifactActions;
