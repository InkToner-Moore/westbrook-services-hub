// Manager mode: whether the current session may perform manager-only actions
// (editing the schedule and app settings today; more later). This is now backed by
// a REAL server gate: unlocking verifies the PIN with the worker and upgrades this
// browser's Firebase session to carry a `manager` claim, which Firestore rules
// enforce. See lib/managerAuth.ts and proxy/src/manager.js.
//
//   const { isManager, promptUnlock } = useManagerMode();
//   {isManager ? <EditControls/> : <Button onClick={promptUnlock}>Manager sign in</Button>}
//
// Manager mode stays on until Lock or logout (the claim rides the session). In the
// local dev bypass (no real Firebase auth) it degrades to a local toggle so the UI
// is still demoable.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "@/lib/firebase";
import ManagerPinDialog from "@/components/ManagerPinDialog";
import {
  currentUserIsManager,
  fetchPinStatus,
  lockManagerSession,
  managerConfigured,
  setManagerPin,
  unlockManagerSession,
} from "@/lib/managerAuth";
import { toast } from "@/hooks/use-toast";

interface ManagerModeContextValue {
  isManager: boolean;
  pinIsSet: boolean;
  loading: boolean;
  promptUnlock: () => void;
  promptChangePin: () => void;
  lock: () => void;
}

const ManagerModeContext = createContext<ManagerModeContextValue | undefined>(undefined);

// Local dev bypass: no real Firebase auth, so manager mode is a local toggle.
const DEV_BYPASS =
  import.meta.env.VITE_NODE_ENV === "development" &&
  import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export const ManagerModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isManager, setIsManager] = useState(false);
  const [pinIsSet, setPinIsSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"unlock" | "set">("unlock");

  const refreshPinStatus = useCallback(async () => {
    if (DEV_BYPASS || !managerConfigured()) return;
    try {
      setPinIsSet(await fetchPinStatus());
    } catch {
      setPinIsSet(false);
    }
  }, []);

  // Track the manager claim on the live Firebase session.
  useEffect(() => {
    if (DEV_BYPASS) {
      setLoading(false);
      return;
    }
    const unsub = auth.onIdTokenChanged(async () => {
      setIsManager(await currentUserIsManager());
    });
    (async () => {
      await refreshPinStatus();
      setIsManager(await currentUserIsManager());
      setLoading(false);
    })();
    return unsub;
  }, [refreshPinStatus]);

  const promptUnlock = useCallback(() => {
    setDialogMode(pinIsSet ? "unlock" : "set");
    setDialogOpen(true);
  }, [pinIsSet]);

  const promptChangePin = useCallback(() => {
    setDialogMode("set");
    setDialogOpen(true);
  }, []);

  const lock = useCallback(async () => {
    if (DEV_BYPASS) {
      setIsManager(false);
      return;
    }
    await lockManagerSession();
    setIsManager(await currentUserIsManager());
  }, []);

  const handleSubmit = useCallback(
    async (pin: string, currentPin?: string): Promise<{ ok: boolean; error?: string }> => {
      // Dev bypass: accept locally so the flow is demoable without a backend.
      if (DEV_BYPASS) {
        if (dialogMode === "set") setPinIsSet(true);
        setIsManager(true);
        return { ok: true };
      }
      if (!managerConfigured()) {
        return { ok: false, error: "Manager service is not set up (no proxy URL)." };
      }

      if (dialogMode === "set") {
        const res = await setManagerPin(pin, currentPin);
        if (!res.ok) {
          const msg =
            res.error === "wrong_current_pin"
              ? "That current PIN is not right."
              : "Could not save the PIN. Try again.";
          return { ok: false, error: msg };
        }
        await refreshPinStatus();
        // First-time set: go straight into manager mode with the new PIN.
        const unlock = await unlockManagerSession(pin);
        if (unlock.ok) setIsManager(true);
        toast({ title: "Manager PIN saved", description: "Manager mode is on." });
        return { ok: true };
      }

      // Unlock.
      const res = await unlockManagerSession(pin);
      if (!res.ok) {
        const msg =
          res.error === "wrong_pin"
            ? "Incorrect PIN."
            : res.error === "not_signed_in"
              ? "Sign in first, then unlock manager mode."
              : "Could not unlock. Try again.";
        return { ok: false, error: msg };
      }
      setIsManager(true);
      return { ok: true };
    },
    [dialogMode, refreshPinStatus],
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
        requireCurrent={dialogMode === "set" && pinIsSet}
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
