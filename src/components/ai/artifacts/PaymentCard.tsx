// The Payment artifact card (kind 'payment'). Purchase is minimal for now: the
// Moneris Go device send is not built (backend + certification pending), so the
// transaction is RECORDED in Firestore for later reconciliation and this card
// lets the counter mark it approved or declined by hand after running the card on
// the physical terminal. When the device integration lands, the pending state
// becomes automatic and these manual controls can go. See
// docs/moneris-a920-integration-research.md.
//
// Registration: exports register(reg); the integrator wires one import + call in
// artifactRegistry.tsx. Self-contained Body (writes status through lib/firestore).
import React, { useState } from 'react';
import { CreditCard, Check, X, Clock } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { updateDocument } from '@/lib/firestore';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';
import type { PaymentArtifactData, TransactionStatus } from '@/ai/actions/purchaseRecorder';

const prettyWhen = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  recorded: 'Pending on terminal',
  approved: 'Approved',
  declined: 'Declined',
};

const PaymentBody: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const d = data as PaymentArtifactData | undefined;
  const tx = d?.transaction;

  const [status, setStatus] = useState<TransactionStatus>(tx?.status ?? 'recorded');
  const [saving, setSaving] = useState<TransactionStatus | null>(null);
  const [error, setError] = useState(false);

  if (!tx) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
        <div className="px-4 py-8 text-center">
          <CreditCard className={`mx-auto mb-3 h-9 w-9 ${themeClasses.text.muted}`} />
          <p className={`text-[15px] font-medium ${themeClasses.text.primary}`}>No payment to show</p>
        </div>
      </div>
    );
  }

  const mark = async (next: TransactionStatus) => {
    setSaving(next);
    setError(false);
    try {
      await updateDocument('transactions', tx.id, { status: next, updatedAt: new Date().toISOString() });
      setStatus(next);
    } catch {
      setError(true);
    } finally {
      setSaving(null);
    }
  };

  // Header hue by status, carried by icon + text as well as colour.
  const header =
    status === 'approved'
      ? isDarkMode
        ? 'bg-emerald-900/25 border-emerald-800/50 text-emerald-100'
        : 'bg-emerald-50 border-emerald-100 text-emerald-900'
      : status === 'declined'
        ? isDarkMode
          ? 'bg-rose-900/25 border-rose-800/50 text-rose-100'
          : 'bg-rose-50 border-rose-100 text-rose-900'
        : isDarkMode
          ? 'bg-indigo-900/25 border-indigo-800/50 text-indigo-100'
          : 'bg-indigo-50 border-indigo-100 text-indigo-900';

  const StatusIcon = status === 'approved' ? Check : status === 'declined' ? X : Clock;
  const divide = isDarkMode ? 'divide-slate-700/70' : 'divide-slate-100';
  const border = isDarkMode ? 'border-slate-700/70' : 'border-slate-100';

  return (
    <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${header}`}>
        <CreditCard className="h-4 w-4 shrink-0" />
        <span className="text-[15px] font-semibold tracking-tight">Card payment</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium">
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="px-4 py-3">
        {/* The amount is the hero, in mono like a real receipt total. */}
        <div className="flex items-baseline justify-between gap-3">
          <span className={`text-[13px] ${themeClasses.text.secondary}`}>Amount</span>
          <span className={`font-mono text-2xl font-semibold tabular-nums ${themeClasses.text.primary}`}>
            ${tx.amount.toFixed(2)}
          </span>
        </div>

        <ul className={`mt-4 divide-y border-t ${divide} ${border}`}>
          {tx.customerName && (
            <li className="flex items-center justify-between gap-3 py-2">
              <span className={`text-[13px] ${themeClasses.text.secondary}`}>Customer</span>
              <span className={`text-[15px] ${themeClasses.text.primary}`}>{tx.customerName}</span>
            </li>
          )}
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Method</span>
            <span className={`text-[15px] ${themeClasses.text.primary}`}>Card (terminal)</span>
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Recorded</span>
            <span className={`font-mono text-[13px] tabular-nums ${themeClasses.text.primary}`}>
              {prettyWhen(tx.createdAt)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Reference</span>
            <span className={`font-mono text-[13px] tabular-nums ${themeClasses.text.secondary}`}>{tx.id}</span>
          </li>
        </ul>

        {/* Device send is stubbed until the Moneris backend exists, so the counter
            marks the real result after running the physical terminal. */}
        <p className={`mt-3 text-[13px] ${themeClasses.text.secondary}`}>
          Run the card on the terminal, then mark the result. This is saved for reconciliation with Moneris.
        </p>

        {status === 'recorded' ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => mark('approved')}
              disabled={saving !== null}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[15px] font-medium text-white outline-none hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving === 'approved' ? 'Saving...' : 'Mark approved'}
            </button>
            <button
              type="button"
              onClick={() => mark('declined')}
              disabled={saving !== null}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 ${border} text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20`}
            >
              <X className="h-4 w-4" />
              {saving === 'declined' ? 'Saving...' : 'Mark declined'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStatus('recorded')}
            className={`mt-3 text-[13px] underline-offset-2 hover:underline ${themeClasses.text.secondary}`}
          >
            Change result
          </button>
        )}

        {error && (
          <p className="mt-2 text-[13px] text-rose-600 dark:text-rose-300">
            Could not save that just now. Try again.
          </p>
        )}
      </div>
    </div>
  );
};

// Registration hook. Integrator adds in artifactRegistry.tsx:
//   import { register as registerPayment } from '@/components/ai/artifacts/PaymentCard';
//   registerPayment(ARTIFACT_RENDERERS);
export function register(reg: ArtifactRegistry): void {
  reg.payment = { Body: PaymentBody };
}

export default PaymentBody;
