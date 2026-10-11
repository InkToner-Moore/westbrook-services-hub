import { useFormClasses, FieldGrid, Field, FormActions } from "@/components/shell/FormKit";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { isValidPin } from "@/lib/managerAuth";

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
  reason?: string;
  mode: "unlock" | "set";
  // In 'set' mode, whether a current PIN must be entered (changing an existing PIN).
  requireCurrent?: boolean;
  onSubmit: (pin: string, currentPin?: string) => Promise<{ ok: boolean; error?: string }>;
}

const ManagerPinDialog = ({ open, onOpenChange, mode, requireCurrent, onSubmit, onUnlocked, reason }: ManagerPinDialogProps) => {
  const { themeClasses } = useTheme();
  const fc = useFormClasses();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Clear the fields whenever the dialog opens or the mode changes, so a PIN is
  // never left sitting in an input.
  useEffect(() => {
    if (open) {
      setPin("");
      setConfirm("");
      setCurrent("");
      setError("");
      setBusy(false);
    }
  }, [open, mode]);

  const setting = mode === "set";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (setting && requireCurrent && !isValidPin(current)) {
      setError("Enter your current PIN.");
      return;
    }
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
    const result = await onSubmit(pin, setting && requireCurrent ? current : undefined);
    if (result.ok) {
      onOpenChange(false);
      onUnlocked?.();
    } else {
      setError(result.error || "That did not work. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border-pub-edge bg-pub-paper p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] font-semibold leading-tight text-pub-ink flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {setting ? (requireCurrent ? "Change the manager PIN" : "Set the manager PIN") : "Manager sign in"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-pub-muted">
            {setting
              ? "Use a PIN of 4 to 8 digits. Anyone who knows it can edit the schedule and manager settings."
              : reason ? `Enter the manager PIN ${reason}.` : "Enter the manager PIN to make changes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGrid>
            {setting && requireCurrent && (
              <Field htmlFor="manager-pin-current" label="Current PIN" span={12} required>
                <Input
                  id="manager-pin-current"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
                  placeholder="Current PIN"
                  className={`${fc.input} ${fc.mono} tracking-widest`}
                />
              </Field>
            )}
            <Field htmlFor="manager-pin" label={setting ? "New PIN" : "PIN"} span={12} required>
              <Input
                id="manager-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4 to 8 digits"
                className={`${fc.input} ${fc.mono} tracking-widest`}
              />
            </Field>

            {setting && (
              <Field htmlFor="manager-pin-confirm" label="Confirm PIN" span={12} required>
                <Input
                  id="manager-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                  placeholder="Repeat the PIN"
                  className={`${fc.input} ${fc.mono} tracking-widest`}
                />
              </Field>
            )}

          </FieldGrid>
          {error && (
            <p className={`rounded-lg border px-3 py-2 text-[13px] font-medium ${themeClasses.status.error}`}>
              {error}
            </p>
          )}

          <FormActions className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={fc.ghost}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className={fc.primary}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {setting ? "Save PIN" : "Unlock"}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerPinDialog;
