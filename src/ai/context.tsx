// AiModeProvider holds all AI Mode UI state: the chat thread, the single Artifact
// (including a pending confirmation, now a kind of artifact), and the open
// receipt. AI Mode is the staff shell's center pane, not an overlay, so this
// provider also owns the routing glue that used to live in the chat component:
// parsing an utterance, proposing or running the result, and re-routing a
// misroute, so both the chat (send) and the artifact rail (reroute, confirm) can
// share one source of truth. See docs/ui-rehaul/DESIGN-SPEC.md.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { AiAction, ArtifactState, ChatTurn, Intent, ReceiptSubtype } from './types';
import type { ActionResult } from './actions/types';
import type { CartCustomer, CartLine } from './cart';
import { buildCartReceiptOpts } from './cart';
import { getProvider } from './providers';
import { getFieldSpecs } from './fieldSpecs';
import { getExecutor, isImmediate } from './actions';
import { receiptIntentToCartLines } from './actions/cartLines';
import { recordPurchase } from './actions/purchase';
import { buildLabel } from './actions/label';
import { logCorrection } from './corrections';
import { routeLabel } from './intentOptions';

// The open receipt survives a page refresh (sessionStorage) so the counter does
// not lose a half-built receipt to an accidental reload. It clears when the tab
// or browser is closed, which is the right lifetime for a walk-up counter.
const CART_KEY = 'ai-open-receipt';
const readCart = (): CartLine[] => {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let turnCounter = 0;
const nextId = (prefix: string) => {
  turnCounter += 1;
  return `${prefix}-${turnCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

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
  '/staff/timesheet': 'Timesheet',
};

// A short, warm line describing what the engine understood.
function describeIntent(intent: Intent): string {
  switch (intent.action) {
    case 'receipt':
      return `Let's make a ${intent.subtype ?? ''} receipt.`.replace('  ', ' ');
    case 'cartridge_create':
      return 'New refill record, coming right up.';
    case 'cartridge_modify':
      return "Let's update that record.";
    case 'cartridge_status':
      return "I'll change the record's status for you.";
    case 'cartridge_list':
      return 'Here are the refill records.';
    case 'note':
      return "I'll save that as a note.";
    case 'inventory':
      return "Let's update the inventory.";
    case 'inventory_lookup':
      return "Let me check the inventory.";
    case 'directory':
      return "I'll take care of that directory entry.";
    case 'timesheet': {
      const op = intent.fields?.op?.value;
      if (op === 'add_employee') return "Let's add an employee.";
      if (op === 'punch_in') return 'Clocking in.';
      if (op === 'punch_out') return 'Clocking out.';
      return 'Here is the timesheet.';
    }
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

// The line the chat posts once a proposal's details move to the rail. Plain
// words, pointing right, per the brief.
function pointToArtifact(intent: Intent): string {
  const lead = describeIntent(intent);
  return `${lead} I put the details on the right. Take a look and confirm.`.trim();
}

// Data carried on a 'confirmation' artifact: the proposed intent plus enough to
// re-route or resolve the chat turn it came from.
export interface ConfirmationArtifactData {
  turnId: string;
  intent: Intent;
  sourceText?: string;
}

interface AiModeContextValue {
  // Chat thread.
  turns: ChatTurn[];
  addUserTurn: (text: string) => ChatTurn;
  addAssistantTurn: (text: string, intent?: Intent, sourceText?: string) => ChatTurn;
  // Merge a partial update into one turn (used to re-route a misrouted proposal
  // in place: new text, new intent, back to pending).
  patchTurn: (id: string, patch: Partial<ChatTurn>) => void;
  // Add an assistant turn from an executed action's result (message + optional
  // receipt), opening its Artifact if it carries one.
  addResult: (result: ActionResult) => void;
  setTurnStatus: (id: string, status: ChatTurn['status']) => void;
  updateTurnIntent: (id: string, intent: Intent) => void;
  clear: () => void;

  // True while an utterance is being parsed or re-routed. Drives the chat's
  // thinking indicator and disables the rail's reroute controls mid-flight.
  busy: boolean;
  // Parse an utterance and either run it immediately, propose it (details go to
  // the rail as a 'confirmation' artifact), or offer a "did you mean" pick.
  sendUtterance: (text: string) => Promise<void>;
  // Re-parse a turn's original text under a corrected action (a misroute fix,
  // from the rail's slip or the chat's "did you mean" card).
  rerouteIntent: (
    turnId: string,
    sourceText: string | undefined,
    action: AiAction,
    subtype?: ReceiptSubtype,
  ) => Promise<void>;
  // The counter confirmed the slip in the rail: run it (receipts drop onto the
  // open receipt; everything else runs its executor) and clear the slip.
  confirmArtifactIntent: (turnId: string, finalIntent: Intent) => Promise<void>;
  // "Not now": the turn is dismissed and the slip clears without running anything.
  dismissArtifactIntent: (turnId: string) => void;

  // The single Artifact panel (a receipt, tracking, an order list, or a pending
  // confirmation slip).
  artifact: ArtifactState | null;
  showArtifact: (artifact: ArtifactState) => void;
  hideArtifact: () => void;

  // The open receipt: items collected from any tab or the chat before it prints.
  // One item is just a one-item receipt; there is no separate mode.
  cart: CartLine[];
  addCartLines: (lines: CartLine[]) => void;
  removeCartLine: (id: string) => void;
  clearCart: () => void;
  // Build the receipt for the whole cart and open it as an Artifact, returning
  // its result so the caller can attach chat download/print controls.
  finalizeCart: (customer?: CartCustomer) => ActionResult | null;
}

const AiModeContext = createContext<AiModeContextValue | undefined>(undefined);

export const AiModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const activeTab = TAB_NAMES[pathname];
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [cart, setCart] = useState<CartLine[]>(readCart);
  const [busy, setBusy] = useState(false);

  // Persist the open receipt across reloads.
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable; the in-memory receipt still works for this session.
    }
  }, [cart]);

  const addUserTurn = useCallback((text: string) => {
    const turn: ChatTurn = { id: nextId('u'), role: 'user', text, createdAt: Date.now() };
    setTurns((prev) => [...prev, turn]);
    return turn;
  }, []);

  const addAssistantTurn = useCallback((text: string, intent?: Intent, sourceText?: string) => {
    const turn: ChatTurn = {
      id: nextId('a'),
      role: 'assistant',
      text,
      intent,
      sourceText,
      status: intent ? 'pending' : undefined,
      createdAt: Date.now(),
    };
    setTurns((prev) => [...prev, turn]);
    return turn;
  }, []);

  const patchTurn = useCallback((id: string, patch: Partial<ChatTurn>) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addResult = useCallback((result: ActionResult) => {
    const turn: ChatTurn = {
      id: nextId('a'),
      role: 'assistant',
      text: result.message,
      receipt: result.receipt,
      createdAt: Date.now(),
    };
    setTurns((prev) => [...prev, turn]);
    if (result.artifact) setArtifact(result.artifact);
  }, []);

  const setTurnStatus = useCallback((id: string, status: ChatTurn['status']) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const updateTurnIntent = useCallback((id: string, intent: Intent) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, intent } : t)));
  }, []);

  const clear = useCallback(() => {
    setTurns([]);
    setArtifact(null);
  }, []);

  const showArtifact = useCallback((next: ArtifactState) => setArtifact(next), []);
  const hideArtifact = useCallback(() => setArtifact(null), []);

  const addCartLines = useCallback((lines: CartLine[]) => {
    if (!lines.length) return;
    setCart((prev) => [...prev, ...lines]);
  }, []);
  const removeCartLine = useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);
  const clearCart = useCallback(() => setCart([]), []);

  const finalizeCart = useCallback(
    (customer: CartCustomer = {}): ActionResult | null => {
      if (cart.length === 0) return null;
      const opts = buildCartReceiptOpts(cart, customer);
      const result: ActionResult = {
        message: `Here is the combined receipt with ${cart.length} ${
          cart.length === 1 ? 'item' : 'items'
        }. Download or print it from the panel on the right.`,
        artifact: { kind: 'receipt', title: opts.title, data: { opts } },
        receipt: { opts },
      };
      setArtifact(result.artifact);
      setCart([]);
      return result;
    },
    [cart],
  );

  // Run an already-built intent: immediate actions execute; anything with a
  // confirmation spec is proposed (its details go to the rail); the rest becomes
  // a "did you mean" card in the chat.
  const presentIntent = useCallback(
    (intent: Intent, sourceText: string) => {
      const executor = getExecutor(intent.action);
      if (executor && isImmediate(intent)) {
        return Promise.resolve(executor(intent))
          .then(addResult)
          .catch(() => addAssistantTurn('Something went wrong with that. Please try again.'));
      }
      const specs = getFieldSpecs(intent);
      if (specs) {
        const turn = addAssistantTurn(pointToArtifact(intent), intent, sourceText);
        const data: ConfirmationArtifactData = { turnId: turn.id, intent, sourceText };
        setArtifact({ kind: 'confirmation', title: routeLabel(intent.action, intent.subtype) ?? 'Confirm details', data });
      } else {
        addAssistantTurn(describeUnsure(intent), intent, sourceText);
      }
      return Promise.resolve();
    },
    [addAssistantTurn, addResult],
  );

  const sendUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      addUserTurn(trimmed);
      setBusy(true);
      try {
        const intent = await getProvider().parse(trimmed, { activeTab });
        await presentIntent(intent, trimmed);
      } finally {
        setBusy(false);
      }
    },
    [activeTab, addUserTurn, presentIntent],
  );

  // The user corrected a route (from the rail's slip or a "did you mean" card).
  // Re-parse the same text under the chosen action and update that turn (and its
  // confirmation artifact, if any) in place.
  const rerouteIntent = useCallback(
    async (turnId: string, sourceText: string | undefined, action: AiAction, subtype?: ReceiptSubtype) => {
      if (!sourceText) return;
      // Capture the correction (what the router guessed vs what the user chose) as
      // a local, private training signal for a future offline improvement.
      const prev = turns.find((t) => t.id === turnId)?.intent?.action;
      if (prev) logCorrection({ utterance: sourceText, from: prev, to: action });
      setBusy(true);
      try {
        const intent = await getProvider().parse(sourceText, { activeTab, forceAction: action, forceSubtype: subtype });

        // A route with no confirmation (tracking, listing) runs now; the old turn
        // steps aside and the pending slip (if any) clears.
        if (isImmediate(intent)) {
          patchTurn(turnId, { intent: undefined, status: 'dismissed', text: describeIntent(intent) || 'On it.' });
          setArtifact(null);
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

        const specs = getFieldSpecs(intent);
        if (specs) {
          patchTurn(turnId, { intent, status: 'pending', text: pointToArtifact(intent), sourceText });
          const data: ConfirmationArtifactData = { turnId, intent, sourceText };
          setArtifact({ kind: 'confirmation', title: routeLabel(intent.action, intent.subtype) ?? 'Confirm details', data });
        } else {
          patchTurn(turnId, { intent, status: 'pending', text: describeUnsure(intent), sourceText });
          setArtifact(null);
        }
      } finally {
        setBusy(false);
      }
    },
    [activeTab, turns, patchTurn, addAssistantTurn, addResult],
  );

  const confirmArtifactIntent = useCallback(
    async (turnId: string, finalIntent: Intent) => {
      updateTurnIntent(turnId, finalIntent);
      setTurnStatus(turnId, 'confirmed');
      setArtifact(null);

      // The compound chain: after the primary action, run any attached side
      // actions in order (pay, then label). Each is a registry-backed seam that
      // is a friendly no-op until Wave 2/3 registers the real one, so this runs
      // safely today. See PHASE-2-ARCH section 1.2.
      const runAttachments = async () => {
        const attach = finalIntent.attach;
        if (!attach) return;
        if (attach.pay) {
          try {
            addResult(await recordPurchase(finalIntent));
          } catch {
            addAssistantTurn('Could not record the payment just now. The rest is done.');
          }
        }
        if (attach.label) {
          try {
            addResult(await buildLabel(finalIntent));
          } catch {
            addAssistantTurn('Could not build the label just now. The rest is done.');
          }
        }
      };

      // A confirmed receipt drops its lines onto the open receipt. One item or
      // many, it is the same flow; Finish builds the combined receipt.
      if (finalIntent.action === 'receipt') {
        const lines = receiptIntentToCartLines(finalIntent);
        if (lines.length === 0) {
          addAssistantTurn('That receipt has nothing complete to add yet. Fill in a price and try again.');
          return;
        }
        addCartLines(lines);
        const count = cart.length + lines.length;
        addAssistantTurn(
          `Added to the receipt. ${count} ${count === 1 ? 'item' : 'items'} so far. Finish it from the open receipt when you are ready.`,
        );
        await runAttachments();
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
      await runAttachments();
    },
    [updateTurnIntent, setTurnStatus, addAssistantTurn, addCartLines, cart, addResult],
  );

  const dismissArtifactIntent = useCallback(
    (turnId: string) => {
      setTurnStatus(turnId, 'dismissed');
      setArtifact(null);
      addAssistantTurn('Okay, not now.');
    },
    [setTurnStatus, addAssistantTurn],
  );

  const value = useMemo<AiModeContextValue>(
    () => ({
      turns,
      addUserTurn,
      addAssistantTurn,
      patchTurn,
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
      busy,
      sendUtterance,
      rerouteIntent,
      confirmArtifactIntent,
      dismissArtifactIntent,
      artifact,
      showArtifact,
      hideArtifact,
      cart,
      addCartLines,
      removeCartLine,
      clearCart,
      finalizeCart,
    }),
    [
      turns,
      addUserTurn,
      addAssistantTurn,
      patchTurn,
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
      busy,
      sendUtterance,
      rerouteIntent,
      confirmArtifactIntent,
      dismissArtifactIntent,
      artifact,
      showArtifact,
      hideArtifact,
      cart,
      addCartLines,
      removeCartLine,
      clearCart,
      finalizeCart,
    ],
  );

  return <AiModeContext.Provider value={value}>{children}</AiModeContext.Provider>;
};

export const useAiMode = () => {
  const ctx = useContext(AiModeContext);
  if (ctx === undefined) {
    throw new Error('useAiMode must be used within an AiModeProvider');
  }
  return ctx;
};
