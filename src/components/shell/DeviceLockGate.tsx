import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useStaffAppMeta } from '@/hooks/useStaffAppMeta';
import {
  enabledFor, isUnlocked, subscribe, userKey, verify,
} from '@/lib/deviceLock';

const DeviceLockGate = ({ children }: { children: ReactNode }) => {
  useStaffAppMeta();
  const { user, loading, logout } = useAuth();
  const { themeClasses } = useTheme();
  const navigate = useNavigate();
  const uid = user ? userKey(user) : null;
  const [, update] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const unlockButton = useRef<HTMLButtonElement>(null);
  const pending = useRef<AbortController | null>(null);
  const locked = !!uid && enabledFor(uid) && !isUnlocked(uid);

  useEffect(() => {
    const unsubscribe = subscribe(() => update((value) => value + 1));
    update((value) => value + 1);
    return () => { unsubscribe(); pending.current?.abort(); };
  }, []);
  useEffect(() => { if (locked) unlockButton.current?.focus(); }, [locked]);

  if (loading || !user) return null;
  if (!locked) return <>{children}</>;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-pub-counter p-6 text-pub-ink">
      <div className="w-full max-w-sm space-y-6 text-center">
        <p className="font-display text-[32px] font-semibold leading-[1.02]">
          <span className="block">Ink, Toner</span>
          <span className="block">&amp; Moore</span>
        </p>
        <p className="text-pub-muted">Locked</p>
        <button ref={unlockButton} type="button" aria-busy={busy}
          className={`h-12 w-full rounded-full px-6 font-semibold ${themeClasses.button.primary} ${themeClasses.interactive.focus}`}
          onClick={async () => {
            pending.current?.abort();
            const controller = new AbortController();
            pending.current = controller;
            setBusy(true);
            const result = await verify(controller.signal);
            if (controller.signal.aborted || pending.current !== controller) return;
            pending.current = null;
            setError(!result.success);
            setBusy(false);
            update((value) => value + 1);
          }}>Unlock</button>
        {error && <p role="alert" className="text-sm text-pub-muted">That did not work. Try again.</p>}
        <button type="button"
          className={`min-h-11 w-full rounded-full px-4 ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
          onClick={async () => {
            pending.current?.abort();
            pending.current = null;
            setBusy(false);
            const result = await logout();
            if (result.success) navigate('/staff', { replace: true });
            else { setError(true); setBusy(false); }
          }}>Use password instead</button>
      </div>
    </div>
  );
};

export default DeviceLockGate;
