// The user chip at the foot of the tile rail. Click it to reveal the signed-in
// email, a Settings button (opens a stub overlay - the real settings panel is not
// built), and Logout. The light/dark toggle sits alongside. Click-to-open (not
// hover-only): Escape closes either layer, focus moves to the opened surface and
// back to its trigger on close, and the account menu closes on an outside click.
// See DESIGN-SPEC.md.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import ThemeToggleButton from '@/components/ThemeToggleButton';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { themeClasses } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const settingsCloseRef = useRef<HTMLButtonElement>(null);

  const email = user?.email ?? 'Signed in';

  // Outside click closes the account menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Escape closes the account menu and returns focus to its trigger; opening it
  // moves focus onto the first item so keyboard users land somewhere sane.
  useEffect(() => {
    if (!open) return;
    firstMenuItemRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeSettings = () => {
    setSettingsOpen(false);
    triggerRef.current?.focus();
  };

  // Escape closes the settings stub; opening it focuses its close button.
  useEffect(() => {
    if (!settingsOpen) return;
    settingsCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSettings();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  const handleLogout = async () => {
    const result = await logout();
    if (result?.success) {
      toast({ title: 'Signed out', description: 'You have left the staff portal.' });
      navigate('/');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className={`flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left ${themeClasses.card.primary} ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${themeClasses.card.secondary}`}>
            <User className={`h-4 w-4 ${themeClasses.text.secondary}`} />
          </span>
          <span className={`truncate text-[12px] font-medium ${themeClasses.text.secondary}`}>{email}</span>
        </button>
        <ThemeToggleButton />
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={`absolute bottom-[calc(100%+8px)] left-0 z-50 w-full min-w-[13rem] rounded-xl border p-1.5 shadow-lg ${themeClasses.card.primary}`}
        >
          <div className={`px-2.5 py-2 text-[12px] ${themeClasses.text.muted}`}>
            Signed in as
            <div className={`truncate text-[13px] font-medium ${themeClasses.text.primary}`}>{email}</div>
          </div>
          <div className={`my-1 h-px ${themeClasses.card.secondary}`} />
          <button
            ref={firstMenuItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setSettingsOpen(true);
              setOpen(false);
            }}
            className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium ${themeClasses.text.secondary} ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium ${themeClasses.text.secondary} ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}

      {/* Settings overlay stub (the real panel is not built yet). */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-stub-title"
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeSettings} />
          <div className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-lg ${themeClasses.card.primary}`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 id="settings-stub-title" className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                Settings
              </h2>
              <button
                ref={settingsCloseRef}
                type="button"
                onClick={closeSettings}
                aria-label="Close settings"
                className={`rounded-lg p-1.5 ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className={`text-[14px] leading-relaxed ${themeClasses.text.secondary}`}>
              Settings are on the way. This is where you will set the shop's tax rate, the receipt footer, and which tools show on the rail.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
