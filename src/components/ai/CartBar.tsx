// The receipt cart bar shown in the chat when multi-mode has items collected. It
// says how many items are on the open receipt, lists them with a way to drop one,
// and finishes the combined receipt into one PDF (chat controls + Artifact).
import React, { useState } from 'react';
import { Receipt, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { cartTotal } from '@/ai/cart';

const CartBar: React.FC = () => {
  const { themeClasses } = useTheme();
  const { cart, removeCartLine, clearCart, finalizeCart, addResult } = useAiMode();
  const [expanded, setExpanded] = useState(false);

  if (cart.length === 0) return null;

  const total = cartTotal(cart);

  const handleFinish = () => {
    const result = finalizeCart();
    if (result) addResult(result);
  };

  return (
    <div className={`rounded-2xl border p-3 ${themeClasses.card.accent}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.primary}`}
          aria-expanded={expanded}
        >
          <Receipt className="h-4 w-4" />
          <span>
            {cart.length} {cart.length === 1 ? 'item' : 'items'} on receipt
          </span>
          <span className={themeClasses.text.secondary}>${total.toFixed(2)}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={clearCart}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${themeClasses.button.primary}`}
          >
            Finish receipt
          </button>
        </div>
      </div>

      {expanded && (
        <ul className="mt-2 space-y-1">
          {cart.map((line) => (
            <li
              key={line.id}
              className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${themeClasses.text.secondary}`}
            >
              <span className="whitespace-pre-line">{line.description}</span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span>${(line.price || 0).toFixed(2)}</span>
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
      )}
    </div>
  );
};

export default CartBar;
