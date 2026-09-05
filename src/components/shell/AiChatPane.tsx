// The center pane when AI Mode is the active tool: the chat. This is the main
// staff surface now, not an overlay, so it fills the shell's center column
// (h-full, its own scroll), with no backdrop and no close chrome. It routes an
// utterance, then either runs it immediately (tracking, listing), asks a quick
// "did you mean" when it could not tell, or (when there is something to check
// over) puts the details on the right and just points there. The open receipt
// shows as a compact strip above the composer.
import React, { useEffect, useRef } from 'react';
import { Eraser, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { getFieldSpecs } from '@/ai/fieldSpecs';
import { getExecutor } from '@/ai/actions';
import { packingToCartLine } from '@/ai/actions/cartLines';
import { emptyPackingItem, type PackingPreset } from '@/lib/packing';
import type { Intent } from '@/ai/types';
import type { Courier } from '@/ai/tracking';
import Composer from '@/components/ai/Composer';
import IntentSuggestions from '@/components/ai/IntentSuggestions';
import CartPanel from '@/components/ai/CartPanel';

// A few one-tap starters shown on an empty thread. They teach the shape of a
// good utterance and save typing at a busy counter.
const EXAMPLES = [
  'Refill for Sarah, HP 65, $34',
  'Ship to Vancouver, UPS, $22',
  'Track UPS 1Z999AA10123456784',
  'Record a refill for John, Canon 137',
  'Clock in Sarah',
];

const AiChatPane: React.FC = () => {
  const { themeClasses, isDarkMode } = useTheme();
  const {
    turns,
    busy,
    sendUtterance,
    rerouteIntent,
    clear,
    addUserTurn,
    addResult,
    addCartLines,
    addAssistantTurn,
  } = useAiMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view, including the thinking indicator.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, busy]);

  const ink = isDarkMode ? 'text-indigo-300' : 'text-indigo-700';

  // Hover-to-type on a courier pill tracks immediately.
  const handleTrack = async (courier: Courier, trackingNumber: string) => {
    addUserTurn(`Track ${courier} ${trackingNumber}`);
    const executor = getExecutor('track');
    if (!executor) return;
    const intent: Intent = {
      action: 'track',
      fields: {
        courier: { value: courier, source: 'explicit' },
        trackingNumber: { value: trackingNumber, source: 'explicit' },
      },
      confidence: 1,
    };
    addResult(await executor(intent));
  };

  // A packing pill adds a fixed-price supply straight onto the receipt cart.
  const handleAddPacking = (preset: PackingPreset) => {
    const line = packingToCartLine({ ...emptyPackingItem(), name: preset.type, cost: preset.cost });
    addCartLines([line]);
    addAssistantTurn(`Added ${preset.type} ($${preset.cost.toFixed(2)}) to the receipt.`);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <div className={`flex items-center gap-2.5 ${themeClasses.text.primary}`}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
            <Sparkles className={`h-5 w-5 ${ink}`} />
          </span>
          <span className="text-2xl font-semibold tracking-tight">AI Mode</span>
        </div>
        <button
          type="button"
          onClick={clear}
          title="Clear"
          aria-label="Clear conversation"
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
        >
          <Eraser className="h-5 w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {turns.length === 0 && (
          <div className="pt-6">
            <p className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
              What can I help with?
            </p>
            <p className={`mt-2 max-w-md text-[15px] leading-relaxed ${themeClasses.text.secondary}`}>
              Say it in plain words. I make receipts, record refills, track
              packages, and keep your notes and inventory in order.
            </p>
            <div className="mt-5 flex items-start gap-2">
              <span className={`mt-1.5 text-[13px] ${themeClasses.text.muted}`}>Try</span>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => sendUtterance(ex)}
                    className={`rounded-full border px-3 py-1.5 text-left text-[13px] transition-colors ${
                      isDarkMode
                        ? 'border-slate-700 text-slate-300 hover:border-indigo-700 hover:bg-indigo-900/20'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {turns.map((turn) => {
          const showSuggestions =
            turn.role === 'assistant' && turn.intent && !getFieldSpecs(turn.intent) && turn.status === 'pending';
          return (
            <div key={turn.id} className="space-y-2">
              {turn.text &&
                (turn.role === 'user' ? (
                  // The user's words: a calm filled bubble, clearly theirs.
                  <div className="flex justify-end">
                    <div
                      className={`max-w-[88%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed ${
                        isDarkMode ? 'bg-slate-700 text-slate-50' : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      {turn.text}
                    </div>
                  </div>
                ) : (
                  // The assistant speaks as plain text; the slip and results live
                  // in the artifact rail, not as another card in the thread.
                  <div className={`max-w-[92%] text-[15px] leading-relaxed ${themeClasses.text.primary}`}>
                    {turn.text}
                  </div>
                ))}

              {showSuggestions && (
                <IntentSuggestions
                  variant="card"
                  onPick={(action, subtype) => rerouteIntent(turn.id, turn.sourceText, action, subtype)}
                />
              )}
            </div>
          );
        })}

        {busy && (
          <div className={`flex items-center gap-2 text-[15px] ${themeClasses.text.muted}`} aria-live="polite" aria-label="Working on it">
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${ink}`} style={{ animationDelay: '0ms', backgroundColor: 'currentColor' }} />
              <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${ink}`} style={{ animationDelay: '120ms', backgroundColor: 'currentColor' }} />
              <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${ink}`} style={{ animationDelay: '240ms', backgroundColor: 'currentColor' }} />
            </span>
            Reading that
          </div>
        )}
      </div>

      <div className="mt-3">
        <CartPanel />
        <Composer onSend={sendUtterance} onTrack={handleTrack} onAddPacking={handleAddPacking} disabled={busy} />
      </div>
    </div>
  );
};

export default AiChatPane;
