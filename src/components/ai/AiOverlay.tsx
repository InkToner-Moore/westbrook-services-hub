// The AI Mode surface: a calm full-height overlay with a chat column and a single
// Artifact panel that slides over it on demand. Mounted once in App.tsx. The chat
// routes an utterance, then shows an editable confirmation before anything happens.
// When routing is unsure or wrong, the user re-routes in one tap instead of
// retyping, which matters because the optional LLM router is a weak model.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Eraser, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { getProvider } from '@/ai/providers';
import { getFieldSpecs } from '@/ai/fieldSpecs';
import { getExecutor, isImmediate } from '@/ai/actions';
import { packingToCartLine, receiptIntentToCartLines } from '@/ai/actions/cartLines';
import { emptyPackingItem, type PackingPreset } from '@/lib/packing';
import type { AiAction, Intent, ReceiptSubtype } from '@/ai/types';
import { logCorrection } from '@/ai/corrections';
import Composer from './Composer';
import ConfirmationCheck from './ConfirmationCheck';
import ReceiptControls from './ReceiptControls';
import ArtifactPanel from './ArtifactPanel';
import IntentSuggestions from './IntentSuggestions';

// Friendly name for the current staff page, handed to the router as a hint. On
// the weak LLM this disambiguates ("they are on the Cartridges page") without
// ever overriding what the words actually say.
const TAB_NAMES: Record<string, string> = {
  '/staff/tracking': 'Tracking',
  '/staff/receipts': 'Receipts',
  '/staff/cartridges': 'Cartridges',
  '/staff/notes': 'Notes',
  '/staff/inventory': 'Inventory',
  '/staff/directory': 'Directory',
  '/staff/requests': 'Follow-Ups',
};

// A few one-tap starters shown on an empty thread. They teach the shape of a
// good utterance and save typing at a busy counter.
const EXAMPLES = [
  'Refill for Sarah, HP 65, $34',
  'Ship to Vancouver, UPS, $22',
  'Track UPS 1Z999AA10123456784',
  'New cartridge order for John, Canon 137',
];

// A short, warm line describing what the engine understood.
function describeIntent(intent: Intent): string {
  switch (intent.action) {
    case 'receipt':
      return `Let's make a ${intent.subtype ?? ''} receipt. I'll pull the details together.`.replace('  ', ' ');
    case 'cartridge_create':
      return 'New cartridge order, coming right up.';
    case 'cartridge_modify':
      return "Let's update that order.";
    case 'cartridge_status':
      return "I'll change the order status for you.";
    case 'cartridge_list':
      return 'Here are the cartridge orders.';
    case 'note':
      return "I'll save that as a note.";
    case 'inventory':
      return "Let's update the inventory.";
    case 'directory':
      return "I'll take care of that directory entry.";
    case 'followup':
      return "I'll log that follow-up.";
    case 'track':
      return "Let's track that package.";
    default:
      return '';
  }
}

// The line above the "did you mean" chips for an unroutable or ambiguous ask.
function describeUnsure(intent: Intent): string {
  if (intent.action === 'clarify' && intent.clarify) return intent.clarify;
  return "I'm not sure which task that is.";
}

const AiOverlay: React.FC = () => {
  const { themeClasses, isDarkMode } = useTheme();
  const { pathname } = useLocation();
  const activeTab = TAB_NAMES[pathname];
  const {
    isOpen,
    close,
    turns,
    addUserTurn,
    addAssistantTurn,
    patchTurn,
    addResult,
    updateTurnIntent,
    setTurnStatus,
    clear,
    artifact,
    cart,
    addCartLines,
  } = useAiMode();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Keep the newest turn in view, including the thinking indicator.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, busy, isOpen]);

  // Escape closes the overlay, unless the user is mid-edit in a field.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      if (!typing) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const parseContext = useMemo(() => ({ activeTab }), [activeTab]);

  if (!isOpen) return null;

  // Run an already-built intent: immediate actions execute; anything else with a
  // confirmation spec is proposed; the rest becomes a "did you mean" card.
  const presentIntent = (intent: Intent, sourceText: string) => {
    const executor = getExecutor(intent.action);
    if (executor && isImmediate(intent.action)) {
      return executor(intent)
        .then(addResult)
        .catch(() => addAssistantTurn('Something went wrong with that. Please try again.'));
    }
    const proposable = !!getFieldSpecs(intent);
    if (proposable) {
      addAssistantTurn(describeIntent(intent), intent, sourceText);
    } else {
      // clarify / unknown: keep the intent so the card can offer routes, and hold
      // the source text so a pick re-parses without retyping.
      addAssistantTurn(describeUnsure(intent), intent, sourceText);
    }
    return Promise.resolve();
  };

  const handleSend = async (text: string) => {
    addUserTurn(text);
    setBusy(true);
    try {
      const intent = await getProvider().parse(text, parseContext);
      await presentIntent(intent, text);
    } finally {
      setBusy(false);
    }
  };

  // The user corrected a route (from a proposal or a "did you mean" card). Re-parse
  // the same text under the chosen action and update that turn in place.
  const handleReroute = async (turnId: string, sourceText: string | undefined, action: AiAction, subtype?: ReceiptSubtype) => {
    if (!sourceText) return;
    // Capture the correction (what the router guessed vs what the user chose) as a
    // local, private training signal for a future offline improvement.
    const prev = turns.find((t) => t.id === turnId)?.intent?.action;
    if (prev) logCorrection({ utterance: sourceText, from: prev, to: action });
    setBusy(true);
    try {
      const intent = await getProvider().parse(sourceText, { ...parseContext, forceAction: action, forceSubtype: subtype });

      // A route with no confirmation (tracking, listing) runs now; the old turn
      // steps aside.
      if (isImmediate(intent.action)) {
        patchTurn(turnId, { intent: undefined, status: 'dismissed', text: describeIntent(intent) || 'On it.' });
        const executor = getExecutor(intent.action);
        if (executor) {
          try {
            addResult(await executor(intent));
          } catch {
            addAssistantTurn('Something went wrong with that. Please try again.');
          }
        }
        return;
      }

      patchTurn(turnId, { intent, status: 'pending', text: describeIntent(intent), sourceText });
    } finally {
      setBusy(false);
    }
  };

  // Hover-to-type on a courier pill tracks immediately.
  const handleTrack = async (courier: string, trackingNumber: string) => {
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

  const artifactOpen = !!artifact && artifact.kind !== 'none';
  // The ink accent (from Ink, Toner & Moore) is AI Mode's signature, used only on
  // the wordmark and the confirmation slip; blue stays the action colour.
  const ink = isDarkMode ? 'text-indigo-300' : 'text-indigo-700';

  return (
    <div className={`fixed inset-0 z-[60] flex print:hidden ${artifactOpen ? 'md:justify-start md:pl-[4%]' : 'justify-center'}`}>
      {/* Backdrop over the classic page. */}
      <div className={`absolute inset-0 backdrop-blur-sm ${themeClasses.background} opacity-95`} />

      {/* Chat column. Bottom padding leaves room for the dock. */}
      <div className="relative flex w-full max-w-2xl flex-col px-4 pt-5 pb-24">
        <header className="mb-4 flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${themeClasses.text.primary}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
              <Sparkles className={`h-5 w-5 ${ink}`} />
            </span>
            <span className="text-2xl font-semibold tracking-tight">AI Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clear}
              title="Clear"
              aria-label="Clear conversation"
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
            >
              <Eraser className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={close}
              title="Close"
              aria-label="Close AI Mode"
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
          {turns.length === 0 && (
            <div className="pt-6">
              <p className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
                What can I help with?
              </p>
              <p className={`mt-2 max-w-md text-[15px] leading-relaxed ${themeClasses.text.secondary}`}>
                Say it in plain words. I make receipts, manage cartridge orders, track
                packages, and keep your notes, inventory, and follow-ups in order.
              </p>
              <div className="mt-5 flex items-start gap-2">
                <span className={`mt-1.5 text-[13px] ${themeClasses.text.muted}`}>Try</span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => handleSend(ex)}
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
            const specs = turn.intent ? getFieldSpecs(turn.intent) : null;
            const showSuggestions =
              turn.role === 'assistant' && turn.intent && !specs && turn.status === 'pending';
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
                    // The assistant speaks as plain text, not another card, so the
                    // slip and results are the only framed things in the thread.
                    <div className={`max-w-[92%] text-[15px] leading-relaxed ${themeClasses.text.primary}`}>
                      {turn.text}
                    </div>
                  ))}

                {turn.receipt && (
                  <div className="pl-1">
                    <ReceiptControls receipt={turn.receipt} />
                  </div>
                )}

                {turn.intent && specs && (
                  <ConfirmationCheck
                    intent={turn.intent}
                    specs={specs}
                    readOnly={turn.status !== 'pending'}
                    onReroute={(action, subtype) => handleReroute(turn.id, turn.sourceText, action, subtype)}
                    onConfirm={async (finalIntent) => {
                      updateTurnIntent(turn.id, finalIntent);
                      setTurnStatus(turn.id, 'confirmed');

                      // A confirmed receipt drops its lines onto the open receipt.
                      // One item or many, it is the same flow; Finish prints it.
                      if (finalIntent.action === 'receipt') {
                        const lines = receiptIntentToCartLines(finalIntent);
                        if (lines.length === 0) {
                          addAssistantTurn('That receipt has nothing complete to add yet. Fill in a price and try again.');
                          return;
                        }
                        addCartLines(lines);
                        const count = cart.length + lines.length;
                        addAssistantTurn(
                          `Added to the receipt. ${count} ${count === 1 ? 'item' : 'items'} so far. Finish it from the receipt panel on the right when you are ready.`,
                        );
                        return;
                      }

                      const executor = getExecutor(finalIntent.action);
                      if (executor) {
                        try {
                          addResult(await executor(finalIntent));
                        } catch {
                          addAssistantTurn('Something went wrong finishing that. Please try again.');
                        }
                      } else {
                        addAssistantTurn('Done. That is all set.');
                      }
                    }}
                    onDismiss={() => setTurnStatus(turn.id, 'dismissed')}
                  />
                )}

                {showSuggestions && (
                  <IntentSuggestions
                    variant="card"
                    onPick={(action, subtype) => handleReroute(turn.id, turn.sourceText, action, subtype)}
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
          <Composer onSend={handleSend} onTrack={handleTrack} onAddPacking={handleAddPacking} disabled={busy} />
        </div>
      </div>

      {/* The single Artifact panel slides in over the chat when opened. */}
      <ArtifactPanel />
    </div>
  );
};

export default AiOverlay;
