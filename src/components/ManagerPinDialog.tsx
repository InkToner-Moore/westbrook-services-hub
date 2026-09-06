// The reusable manager-PIN modal. Two modes:
//   'unlock' - enter the PIN to turn on manager mode.
//   'set'    - choose a PIN (first-time setup, or changing it): PIN + confirm.
// Presentational and controlled: the ManagerModeProvider owns the open state and
// passes onSubmit, which verifies or saves and returns { ok, error }. Styled off
// themeClasses to match the rest of the staff UI.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { isValidPin } from "@/lib/managerAuth";

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "unlock" | "set";
  onSubmit: (pin: string) => Promise<{ ok: boolean; error?: string }>;
}

const ManagerPinDialog = ({ open, onOpenChange, mode, onSubmit }: ManagerPinDialogProps) => {
  const { themeClasses } = useTheme();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Clear the fields whenever the dialog opens or the mode changes, so a PIN is
  // never left sitting in an input.
  useEffect(() => {
    if (open) {
      setPin("");
      setConfirm("");
      setError("");
      setBusy(false);
    }
  }, [open, mode]);

  const setting = mode === "set";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!isValidPin(pin)) {
      setError("Use 4 to 8 digits.");
      return;
    }
    if (setting && pin !== confirm) {
      setError("The two PINs do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await onSubmit(pin);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error || "That did not work. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {setting ? "Set the manager PIN" : "Manager sign in"}
          </DialogTitle>
          <DialogDescription>
            {setting
              ? "Choose a PIN of 4 to 8 digits. Anyone who knows it can edit the schedule and manager settings."
              : "Enter the manager PIN to make changes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manager-pin" className={themeClasses.text.secondary}>
              {setting ? "New PIN" : "PIN"}
            </Label>
            <Input
              id="manager-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4 to 8 digits"
              className={`min-h-[44px] font-mono tabular-nums tracking-widest ${themeClasses.input}`}
            />
          </div>

          {setting && (
            <div className="space-y-1.5">
              <Label htmlFor="manager-pin-confirm" className={themeClasses.text.secondary}>
                Confirm PIN
              </Label>
              <Input
                id="manager-pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="Repeat the PIN"
                className={`min-h-[44px] font-mono tabular-nums tracking-widest ${themeClasses.input}`}
              />
            </div>
          )}

          {error && (
            <p className={`rounded-lg border px-3 py-2 text-sm ${themeClasses.status.error}`}>
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.primary}`}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {setting ? "Save PIN" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerPinDialog;
