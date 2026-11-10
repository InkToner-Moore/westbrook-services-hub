// The open receipt: a compact strip above the composer or below a tool page.
// Items collected from the chat, the Pack pills, or the
// classic Packing/Receipts page all land here so the counter can see what is on
// the open receipt while adding to it from anywhere. Finish builds one combined
// receipt and opens it in the artifact rail. sessionStorage persistence and all
// cart math live in the shared AiMode context; this is display only.
import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Receipt, Trash2, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { cartTotal } from '@/ai/cart';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SHIPPING_FOOTNOTE } from '@/lib/simpleReceipt';

const CartPanel: React.FC<{ className?: string }> = ({ className = 'mb-3' }) => {
  const { themeClasses } = useTheme();
  const { cart, removeCartLine, clearCart, finalizeCart, addResult } = useAiMode();
  const [collapsed, setCollapsed] = useState(true);

  const [addTerms, setAddTerms] = useState(false);
  const [termsText, setTermsText] = useState(SHIPPING_FOOTNOTE.join('\n\n'));
  const termsId = useId();
  const hasShipping = cart.some((l) => l.source === 'shipping');
  const resetTerms = () => {
    setAddTerms(false);
    setTermsText(SHIPPING_FOOTNOTE.join('\n\n'));
  };

  if (cart.length === 0) return null;

  const total = cartTotal(cart);

  const handleFinish = () => {
    const result = !hasShipping && addTerms
      ? finalizeCart(undefined, {
          footnote: termsText.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean),
        })
      : finalizeCart();
    if (result) addResult(result);
    resetTerms();
  };

  return (
    <div className={`overflow-hidden rounded-2xl border bg-pub-paper border-pub-edge ${className}`}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 py-2"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-pub-ink">
          <Receipt className="h-4 w-4" />
          Open receipt
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${themeClasses.card.accent} text-pub-accent`}>
            {cart.length}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums text-pub-ink">${total.toFixed(2)}</span>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-pub-muted" />
          ) : (
            <ChevronUp className="h-4 w-4 text-pub-muted" />
          )}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t px-3 py-3 border-pub-edge">
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {cart.map((line) => (
              <li
                key={line.id}
                className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  'bg-pub-sunk'
                }`}
              >
                <span className="whitespace-pre-line text-pub-ink">{line.description}</span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-mono tabular-nums text-pub-muted">${(line.price || 0).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeCartLine(line.id)}
                    title="Remove"
                    aria-label="Remove item"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${themeClasses.interactive.hover}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <div className="flex min-h-[44px] items-center gap-2">
              <Checkbox
                id={termsId}
                checked={hasShipping || addTerms}
                disabled={hasShipping}
                onCheckedChange={(checked) => setAddTerms(checked === true)}
                className="border-pub-edge data-[state=checked]:bg-pub-ink data-[state=checked]:text-pub-paper"
              />
              <label htmlFor={termsId} className="flex min-h-[44px] flex-1 cursor-pointer items-center text-sm text-pub-ink">
                Add terms to this receipt
              </label>
            </div>
            {hasShipping ? (
              <p className="text-xs text-pub-muted">Always printed when the receipt has shipping.</p>
            ) : addTerms ? (
              <Textarea
                rows={5}
                value={termsText}
                onChange={(event) => setTermsText(event.target.value)}
                aria-label="Terms text"
                className="border-pub-edge bg-pub-paper text-base text-pub-ink sm:text-sm"
              />
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${themeClasses.button.primary}`}
            >
              Finish receipt
            </button>
            <button
              type="button"
              onClick={() => {
                clearCart();
                resetTerms();
              }}
              title="Clear the receipt"
              aria-label="Clear the receipt"
              className={`flex min-h-[44px] items-center justify-center rounded-xl border px-3 ${themeClasses.button.secondary}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel;
