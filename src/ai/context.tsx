// AiModeProvider holds all AI Mode UI state so the tab dock, the overlay, the
// chat, and the Artifact can share it. Mounted high in the tree (App.tsx) but
// only ever active on /staff routes. See docs/ai-mode/01-design.md.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ArtifactState, ChatTurn, Intent } from './types';

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
  setTurnStatus: (id: string, status: ChatTurn['status']) => void;
  updateTurnIntent: (id: string, intent: Intent) => void;
  clear: () => void;

  // The single Artifact panel.
  artifact: ArtifactState | null;
  showArtifact: (artifact: ArtifactState) => void;
  hideArtifact: () => void;
}

const AiModeContext = createContext<AiModeContextValue | undefined>(undefined);

export const AiModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);

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

  const value = useMemo<AiModeContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      turns,
      addUserTurn,
      addAssistantTurn,
      setTurnStatus,
      updateTurnIntent,
      clear,
      artifact,
      showArtifact,
      hideArtifact,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      turns,
      addUserTurn,
      addAssistantTurn,
      setTurnStatus,
      updateTurnIntent,
      clear,
      artifact,
      showArtifact,
      hideArtifact,
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
