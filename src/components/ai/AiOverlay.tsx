// The AI Mode surface: a calm full-height overlay with a chat column and a single
// Artifact panel that slides over it on demand. Mounted once in App.tsx. The chat
// echoes routed intents for now; the confirmation check lands in Phase 2 and the
// Artifact renderers in later phases.
import React, { useEffect, useRef } from 'react';
import { X, Eraser, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { getProvider } from '@/ai/providers';
import { getFieldSpecs } from '@/ai/fieldSpecs';
import { getExecutor, isImmediate } from '@/ai/actions';
import type { Intent } from '@/ai/types';
import Composer from './Composer';
import ConfirmationCheck from './ConfirmationCheck';
import ReceiptControls from './ReceiptControls';
import ArtifactPanel from './ArtifactPanel';

// A short, warm line describing what the engine understood. Real confirmation
// checks replace this in Phase 2.
function describeIntent(intent: Intent): string {
  switch (intent.action) {
    case 'receipt':
      return `Let's make a ${intent.subtype ?? ''} receipt. I'll pull the details together.`.replace('  ', ' ');
    case 'cartridge_create':
      return "New cartridge order, coming right up.";
    case 'cartridge_modify':
      return "Let's update that order.";
    case 'cartridge_status':
      return "I'll change the order status for you.";
    case 'cartridge_list':
      return "Here are the cartridge orders.";
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
    case 'clarify':
      return intent.clarify ?? "Could you tell me a little more?";
    default:
      return "I'm not sure what you need yet. Try naming the task, for example a refill, a receipt, or tracking.";
  }
}

const AiOverlay: React.FC = () => {
  const { themeClasses } = useTheme();
  const {
    isOpen,
    close,
    turns,
    addUserTurn,
    addAssistantTurn,
    addResult,
    updateTurnIntent,
    setTurnStatus,
    clear,
    artifact,
  } = useAiMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (text: string) => {
    addUserTurn(text);
    const provider = getProvider();
    const intent = await provider.parse(text);

    // Read-only actions (tracking, listing) run immediately, no confirmation.
    const executor = getExecutor(intent.action);
    if (executor && isImmediate(intent.action)) {
      try {
        addResult(await executor(intent));
      } catch {
        addAssistantTurn('Something went wrong with that. Please try again.');
      }
      return;
    }

    addAssistantTurn(describeIntent(intent), intent.action === 'unknown' ? undefined : intent);
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

  const artifactOpen = !!artifact && artifact.kind !== 'none';

  return (
    <div className={`fixed inset-0 z-[60] flex print:hidden ${artifactOpen ? 'md:justify-start md:pl-[4%]' : 'justify-center'}`}>
      {/* Backdrop over the classic page. */}
      <div className={`absolute inset-0 backdrop-blur-sm ${themeClasses.background} opacity-95`} />

      {/* Chat column. Bottom padding leaves room for the dock. */}
      <div className="relative flex w-full max-w-2xl flex-col px-4 pt-4 pb-24">
        <header className="mb-3 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${themeClasses.text.primary}`}>
            <Sparkles className="h-5 w-5" />
            <span className="text-lg font-semibold">AI Mode</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clear}
              title="Clear"
              aria-label="Clear conversation"
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
            >
              <Eraser className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={close}
              title="Close"
              aria-label="Close AI Mode"
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 && (
            <div className={`rounded-2xl border p-4 ${themeClasses.card.primary}`}>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Tell me what you need in plain words. I can make receipts, manage
                cartridge orders, track packages, and keep your notes, inventory,
                and follow-ups in order.
              </p>
            </div>
          )}

          {turns.map((turn) => {
            const specs = turn.intent ? getFieldSpecs(turn.intent) : null;
            return (
              <div key={turn.id} className="space-y-2">
                <div className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm ${
                      turn.role === 'user'
                        ? themeClasses.button.primary
                        : `${themeClasses.card.primary} ${themeClasses.text.primary}`
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>

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
                    onConfirm={async (finalIntent) => {
                      updateTurnIntent(turn.id, finalIntent);
                      setTurnStatus(turn.id, 'confirmed');
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
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Composer onSend={handleSend} onTrack={handleTrack} />
        </div>
      </div>

      {/* The single Artifact panel slides in over the chat when opened. */}
      <ArtifactPanel />
    </div>
  );
};

export default AiOverlay;
