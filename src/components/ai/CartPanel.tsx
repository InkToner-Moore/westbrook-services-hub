// The open receipt: a compact strip above the composer, in the chat pane rather
// than a floating panel. Items collected from the chat, the Pack pills, or the
// classic Packing/Receipts page all land here so the counter can see what is on
// the open receipt while adding to it from anywhere. Finish builds one combined
// receipt and opens it in the artifact rail. sessionStorage persistence and all
// cart math live in the shared AiMode context; this is display only.
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Receipt, Trash2, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { cartTotal } from '@/ai/cart';

const CartPanel: React.FC = () => {
  const { themeClasses, isDarkMode } = useTheme();
  const { cart, removeCartLine, clearCart, finalizeCart, addResult } = useAiMode();
  const [collapsed, setCollapsed] = useState(true);

  if (cart.length === 0) return null;

  const total = cartTotal(cart);

  const handleFinish = () => {
    const result = finalizeCart();
    if (result) addResult(result);
  };

  return (
    <div className={`mb-3 overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 py-2"
      >
        <span className={`flex items-center gap-2 text-sm font-semibold ${themeClasses.text.primary}`}>
          <Receipt className="h-4 w-4" />
          Open receipt
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${themeClasses.card.accent} ${themeClasses.text.accent}`}>
            {cart.length}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`font-mono text-sm tabular-nums ${themeClasses.text.primary}`}>${total.toFixed(2)}</span>
          {collapsed ? (
            <ChevronDown className={`h-4 w-4 ${themeClasses.text.secondary}`} />
          ) : (
            <ChevronUp className={`h-4 w-4 ${themeClasses.text.secondary}`} />
          )}
        </span>
      </button>

      {!collapsed && (
        <div className={`border-t px-3 py-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {cart.map((line) => (
              <li
                key={line.id}
                className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}
              >
                <span className={`whitespace-pre-line ${themeClasses.text.primary}`}>{line.description}</span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`font-mono tabular-nums ${themeClasses.text.secondary}`}>${(line.price || 0).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeCartLine(line.id)}
                    title="Remove"
                    aria-label="Remove item"
                    className={`rounded p-1 ${themeClasses.interactive.hover}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
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
              onClick={clearCart}
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
