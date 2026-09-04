// The receipt cart, shown as a side panel whenever multi-item mode is on and the
// user is on a staff page. It stays visible across tabs so the counter can see
// what is on the open receipt while adding to it from the Packing tab, the chat,
// or the classic Receipts page. Finishing builds one combined receipt and opens
// it in AI Mode. Mounted once in App.tsx, next to the dock and the overlay.
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Receipt, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { cartSubtotal, cartTaxTotal, cartTotal } from '@/ai/cart';

const CartPanel: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { themeClasses, isDarkMode } = useTheme();
  const { cart, removeCartLine, clearCart, finalizeCart, addResult, open, artifact } = useAiMode();
  const [collapsed, setCollapsed] = useState(false);

  const onStaffPage = pathname.startsWith('/staff/');
  const artifactOpen = !!artifact && artifact.kind !== 'none';
  // Show whenever the open receipt has items. Hide while the Artifact fills the
  // right side (the finished receipt shows there).
  if (!user || !onStaffPage || cart.length === 0 || artifactOpen) return null;

  const subtotal = cartSubtotal(cart);
  const tax = cartTaxTotal(cart);
  const total = cartTotal(cart);

  const handleFinish = () => {
    if (cart.length === 0) return;
    const result = finalizeCart();
    if (result) {
      addResult(result);
      open();
    }
  };

  return (
    <div className="fixed right-3 top-24 z-[68] w-[19rem] max-w-[calc(100vw-1.5rem)] print:hidden">
      <div className={`flex max-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border shadow-xl backdrop-blur-xl ${themeClasses.header}`}>
        {/* Header: item count + total, click to collapse. */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={`flex items-center gap-2 text-sm font-semibold ${themeClasses.text.primary}`}
            aria-expanded={!collapsed}
          >
            <Receipt className="h-4 w-4" />
            <span>Open receipt</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${themeClasses.card.accent} ${themeClasses.text.accent}`}>
              {cart.length}
            </span>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>${total.toFixed(2)}</span>
        </div>

        {!collapsed && (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              <ul className="space-y-1">
                {cart.map((line) => (
                  <li
                    key={line.id}
                    className={`flex items-start justify-between gap-2 rounded-lg px-2 py-2 text-sm ${
                      isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                    }`}
                  >
                    <span className={`whitespace-pre-line ${themeClasses.text.primary}`}>{line.description}</span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className={themeClasses.text.secondary}>${(line.price || 0).toFixed(2)}</span>
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
            </div>

            {/* Totals + actions */}
            <div className={`border-t px-4 py-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`space-y-0.5 text-sm ${themeClasses.text.secondary}`}>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-semibold ${themeClasses.text.primary}`}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${themeClasses.button.primary}`}
                  >
                    Finish receipt
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    title="Clear the receipt"
                    aria-label="Clear the receipt"
                    className={`rounded-xl border px-2.5 py-2 ${themeClasses.button.secondary}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPanel;
