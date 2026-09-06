// Manager mode: a browser-session flag that unlocks manager-only actions once the
// shared manager PIN is entered. Held in React state (not persisted), so it clears
// on reload. The provider owns the PIN dialog and exposes prompts so any component
// can gate an action behind it:
//
//   const { isManager, promptUnlock } = useManagerMode();
//   {isManager ? <EditControls/> : <Button onClick={promptUnlock}>Manager sign in</Button>}
//
// This is a soft guardrail against accidental edits, not a security boundary; see
// lib/managerAuth.ts. Reused later for site-content editing and settings.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ManagerPinDialog from "@/components/ManagerPinDialog";
import {
  loadManagerSettings,
  saveManagerPin,
  verifyManagerPin,
  type ManagerSettings,
} from "@/lib/managerAuth";
import { toast } from "@/hooks/use-toast";

interface ManagerModeContextValue {
  // Unlocked for this browser session.
  isManager: boolean;
  // A manager PIN exists in Firestore (false = first-time setup needed).
  pinIsSet: boolean;
  // Initial load of the PIN state is in flight.
  loading: boolean;
  // Open the dialog to unlock (or to set the PIN on first use).
  promptUnlock: () => void;
  // Open the dialog to set or change the PIN (used from manager mode).
  promptChangePin: () => void;
  // Drop back out of manager mode.
  lock: () => void;
}

const ManagerModeContext = createContext<ManagerModeContextValue | undefined>(undefined);

export const ManagerModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ManagerSettings | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"unlock" | "set">("unlock");

  const refreshSettings = useCallback(async (): Promise<ManagerSettings | null> => {
    try {
      const s = await loadManagerSettings();
      setSettings(s);
      return s;
    } catch {
      // Demo config or a read error: treat as "no PIN set yet" rather than crash.
      setSettings(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshSettings();
      setLoading(false);
    })();
  }, [refreshSettings]);

  const pinIsSet = !!settings?.pinHash;

  const promptUnlock = useCallback(() => {
    // First time (no PIN yet): go straight to the set flow, which also unlocks.
    setDialogMode(pinIsSet ? "unlock" : "set");
    setDialogOpen(true);
  }, [pinIsSet]);

  const promptChangePin = useCallback(() => {
    setDialogMode("set");
    setDialogOpen(true);
  }, []);

  const lock = useCallback(() => setIsManager(false), []);

  const handleSubmit = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string }> => {
      if (dialogMode === "set") {
        try {
          await saveManagerPin(pin);
          await refreshSettings();
          setIsManager(true);
          toast({ title: "Manager PIN set", description: "Manager mode is on." });
          return { ok: true };
        } catch {
          return { ok: false, error: "Could not save the PIN. Check your connection and try again." };
        }
      }
      // Unlock: verify against the current stored hash, reloading once if we have
      // nothing cached (e.g. set on another device this session).
      let current = settings;
      if (!current) current = await refreshSettings();
      const ok = await verifyManagerPin(pin, current);
      if (ok) {
        setIsManager(true);
        return { ok: true };
      }
      return { ok: false, error: "Incorrect PIN." };
    },
    [dialogMode, settings, refreshSettings],
  );

  const value = useMemo<ManagerModeContextValue>(
    () => ({ isManager, pinIsSet, loading, promptUnlock, promptChangePin, lock }),
    [isManager, pinIsSet, loading, promptUnlock, promptChangePin, lock],
  );

  return (
    <ManagerModeContext.Provider value={value}>
      {children}
      <ManagerPinDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={handleSubmit}
      />
    </ManagerModeContext.Provider>
  );
};

export const useManagerMode = (): ManagerModeContextValue => {
  const ctx = useContext(ManagerModeContext);
  if (ctx === undefined) {
    throw new Error("useManagerMode must be used within a ManagerModeProvider");
  }
  return ctx;
};
