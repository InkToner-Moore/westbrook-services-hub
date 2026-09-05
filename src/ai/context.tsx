// AiModeProvider holds all AI Mode UI state so the tab dock, the overlay, the
// chat, and the Artifact can share it. Mounted high in the tree (App.tsx) but
// only ever active on /staff routes. See docs/ai-mode/01-design.md.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ArtifactState, ChatTurn, Intent } from './types';
import type { ActionResult } from './actions/types';
import type { CartCustomer, CartLine } from './cart';
import { buildCartReceiptOpts } from './cart';

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

interface AiModeContextValue {
  // Overlay open/closed.
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

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

  // The single Artifact panel.
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
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [cart, setCart] = useState<CartLine[]>(readCart);

  // Persist the open receipt across reloads.
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable; the in-memory receipt still works for this session.
    }
  }, [cart]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

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
        }. Download or print it below.`,
        artifact: { kind: 'receipt', title: opts.title, data: { opts } },
        receipt: { opts },
      };
      setArtifact(result.artifact);
      setCart([]);
      return result;
    },
    [cart],
  );

  const value = useMemo<AiModeContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      turns,
      addUserTurn,
      addAssistantTurn,
      patchTurn,
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
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
      isOpen,
      open,
      close,
      toggle,
      turns,
      addUserTurn,
      addAssistantTurn,
      patchTurn,
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
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
