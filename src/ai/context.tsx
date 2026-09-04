// AiModeProvider holds all AI Mode UI state so the tab dock, the overlay, the
// chat, and the Artifact can share it. Mounted high in the tree (App.tsx) but
// only ever active on /staff routes. See docs/ai-mode/01-design.md.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ArtifactState, ChatTurn, Intent } from './types';
import type { ActionResult } from './actions/types';
import type { CartCustomer, CartLine } from './cart';
import { buildCartReceiptOpts } from './cart';

// Multi-item receipt mode is a shop-wide preference, persisted so it survives a
// refresh. The dashboard toggle and the in-chat toggle both drive this.
const MULTI_MODE_KEY = 'ai-multi-mode';
const readMultiMode = (): boolean => {
  try {
    return localStorage.getItem(MULTI_MODE_KEY) === 'true';
  } catch {
    return false;
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
  addAssistantTurn: (text: string, intent?: Intent) => ChatTurn;
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

  // Multi-item receipt mode + the shared receipt cart.
  multiMode: boolean;
  setMultiMode: (on: boolean) => void;
  cart: CartLine[];
  addCartLines: (lines: CartLine[]) => void;
  removeCartLine: (id: string) => void;
  clearCart: () => void;
  // Build the combined receipt for the whole cart and open it as an Artifact,
  // returning its result so the caller can attach chat download/print controls.
  finalizeCart: (customer?: CartCustomer) => ActionResult | null;
}

const AiModeContext = createContext<AiModeContextValue | undefined>(undefined);

export const AiModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [multiMode, setMultiModeState] = useState<boolean>(readMultiMode);
  const [cart, setCart] = useState<CartLine[]>([]);

  // Keep the persisted preference in sync when the toggle flips.
  useEffect(() => {
    try {
      localStorage.setItem(MULTI_MODE_KEY, multiMode ? 'true' : 'false');
    } catch {
      // Storage unavailable (private mode, etc.); the in-memory value still works.
    }
  }, [multiMode]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const addUserTurn = useCallback((text: string) => {
    const turn: ChatTurn = { id: nextId('u'), role: 'user', text, createdAt: Date.now() };
    setTurns((prev) => [...prev, turn]);
    return turn;
  }, []);

  const addAssistantTurn = useCallback((text: string, intent?: Intent) => {
    const turn: ChatTurn = {
      id: nextId('a'),
      role: 'assistant',
      text,
      intent,
      status: intent ? 'pending' : undefined,
      createdAt: Date.now(),
    };
    setTurns((prev) => [...prev, turn]);
    return turn;
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

  const setMultiMode = useCallback((on: boolean) => setMultiModeState(on), []);
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
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
      artifact,
      showArtifact,
      hideArtifact,
      multiMode,
      setMultiMode,
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
      addResult,
      setTurnStatus,
      updateTurnIntent,
      clear,
      artifact,
      showArtifact,
      hideArtifact,
      multiMode,
      setMultiMode,
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
