import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useManagerMode } from '@/contexts/ManagerModeContext';
import {
  enable, disable, enabledFor, isAvailable, markUnlocked, unlockedWithPassword, userKey, verify,
} from '@/lib/deviceLock';
import { useInstallState } from '@/lib/installPrompt';
import { isStandalone } from '@/lib/installPrompt';
import { useAuth } from '@/hooks/useAuth';
import { useHiddenTiles } from '@/hooks/useHiddenTiles';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import StaffLayout from '@/components/StaffLayout';
import { useShell } from '@/components/shell/ShellContext';
import { ToolPage, SegmentedTabs } from '@/components/shell/ToolPage';
import { FormSection, FieldGrid, Field, FormActions, useFormClasses } from '@/components/shell/FormKit';
import { TOOL_TILES } from '@/components/shell/tiles';
import { PHONE_DISPLAY, EMAIL, WEEK, formatHour } from '@/lib/storeInfo';
import { GST_RATE, STORE_NAME, STORE_ADDRESS, THANK_YOU } from '@/lib/simpleReceipt';

const StaffSettings = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { isManager, promptUnlock, lock } = useManagerMode();
  const { user, logout } = useAuth();
  const { inShell } = useShell();
  const { hiddenTiles, setVisible } = useHiddenTiles();
  const fc = useFormClasses();
  const install = useInstallState();
  const uid = user ? userKey(user) : null;
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(() => !!uid && enabledFor(uid));
  const [lockBusy, setLockBusy] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const passwordUnlocked = !!uid && unlockedWithPassword(uid);
  useEffect(() => {
    let active = true;
    void isAvailable().then((available) => { if (active) setLockAvailable(available); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setLockEnabled(!!uid && enabledFor(uid)); }, [uid]);
  const changeDeviceLock = async (value: boolean) => {
    if (!user || lockBusy) return;
    setLockBusy(true);
    setLockMessage('');
    try {
      if (value) {
        const success = await enable(user);
        setLockEnabled(success);
        if (!success) setLockMessage('Not turned on.');
      } else {
        const result = await verify();
        if (result.success) { disable(); setLockEnabled(false); }
        else setLockMessage('That did not work. Try again.');
      }
    } catch { setLockMessage('That did not work. Try again.'); }
    finally { setLockBusy(false); }
  };
  const repairDeviceLock = async (enrol: boolean) => {
    if (!user || !uid || lockBusy || !unlockedWithPassword(uid)) return;
    setLockBusy(true);
    setLockMessage('');
    try {
      disable();
      markUnlocked(uid);
      setLockEnabled(false);
      const success = enrol && await enable(user);
      setLockEnabled(success);
      if (!success) setLockMessage('Fingerprint unlock is off.');
    } catch { setLockMessage('Fingerprint unlock is off.'); }
    finally { setLockBusy(false); }
  };
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [shortcuts, setShortcuts] = useState<boolean | null>(() => {
    try {
      const raw = localStorage.getItem('ai-shortcuts-open');
      return raw === null ? null : raw === '1';
    } catch {
      return null;
    }
  });
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setPhone(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (result?.success) {
      toast({ title: 'Signed out', description: 'You have left the staff portal.' });
      navigate(isStandalone() ? '/staff' : '/');
    }
  };

  const content = (
    <div className="space-y-6 text-pub-ink">
      <FormSection title="Appearance">
        <SegmentedTabs value={isDarkMode ? 'dark' : 'light'} label="Appearance"
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          onChange={(value) => { if ((value === 'dark') !== isDarkMode) toggleTheme(); }} />
      </FormSection>
      <FormSection title="This device">
        <FieldGrid>
          <Field label="Install app" span={12}>
            {install.installed ? (
              <p className="text-sm">ITM Dashboard is installed on this device.</p>
            ) : install.canPrompt ? (
              <Button className={fc.primary} onClick={() => void install.prompt()}>
                Install ITM Dashboard
              </Button>
            ) : (
              <p className="text-sm">{install.isIos
                ? 'In Safari, tap Share, then Add to Home Screen.'
                : 'Open your browser menu and choose Install app or Add to Home screen.'}</p>
            )}
          </Field>
          <Field label="Unlock with fingerprint or Face ID" htmlFor="settings-device-lock" span={12}
            hint="Asks for your fingerprint or face when the app opens on this device. Your password still works.">
            {(lockAvailable || !lockEnabled) && (
              <Switch id="settings-device-lock" className="h-11" checked={lockEnabled}
                disabled={!lockAvailable || lockBusy} onCheckedChange={(value) => void changeDeviceLock(value)} />
            )}
            {lockAvailable && lockEnabled && passwordUnlocked && (
              <button type="button" disabled={lockBusy}
                className="block min-h-11 text-left text-sm text-pub-muted underline underline-offset-4"
                onClick={() => void repairDeviceLock(true)}>
                Fingerprint not working? Set it up again
              </button>
            )}
            {!lockAvailable && (
              <p className="mt-1.5 text-[13px] text-pub-muted">
                This device or browser has no fingerprint or face unlock set up.
              </p>
            )}
            {!lockAvailable && lockEnabled && (passwordUnlocked ? (
              <Button className={`min-h-11 ${fc.secondary}`} disabled={lockBusy}
                onClick={() => void repairDeviceLock(false)}>Turn off</Button>
            ) : (
              <p className="mt-1.5 text-[13px] text-pub-muted">
                Sign in with your password to turn this off.
              </p>
            ))}
            {lockMessage && <p role="status" className="mt-1.5 text-[13px] text-pub-muted">{lockMessage}</p>}
          </Field>
        </FieldGrid>
      </FormSection>
      <FormSection title="AI Mode">
        <FieldGrid>
          <Field htmlFor="settings-shortcuts" label="Show shortcuts when the chat opens" span={12}
            hint="Off keeps them behind the Shortcuts button.">
            <Switch id="settings-shortcuts" className="h-11" checked={shortcuts ?? !phone}
              onCheckedChange={(value) => {
                setShortcuts(value);
                try { localStorage.setItem('ai-shortcuts-open', value ? '1' : '0'); } catch { /* Keep the local choice. */ }
              }} />
          </Field>
        </FieldGrid>
      </FormSection>
      <FormSection title="Tools on the rail"
        description="Hidden tools still open from AI Mode or a link. This only changes this device.">
        <FieldGrid>
          {TOOL_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Field key={tile.key} htmlFor={`settings-tile-${tile.key}`}
                label={<span className="flex items-center gap-2"><Icon className="h-4 w-4" />{tile.label}</span>}>
                <Switch id={`settings-tile-${tile.key}`} className="h-11"
                  checked={!hiddenTiles.includes(tile.key)}
                  onCheckedChange={(visible) => setVisible(tile.key, visible)} />
              </Field>
            );
          })}
        </FieldGrid>
      </FormSection>
      <FormSection title="Manager" description="Needed to add, change or delete shifts.">
        <p className="mb-3 text-sm">{isManager ? 'Signed in as manager' : 'Locked'}</p>
        <FormActions>
          <Button className={fc.secondary} onClick={() => { if (isManager) void lock(); else promptUnlock(); }}>
            {isManager ? 'Lock' : 'Manager sign in'}
          </Button>
        </FormActions>
      </FormSection>
      <FormSection title="Shop details" description="These are built into the app and cannot be changed here yet.">
        <FieldGrid>
          <Field label="Phone"><p className={fc.mono}>{PHONE_DISPLAY}</p></Field>
          <Field label="Email"><p className="break-all">{EMAIL}</p></Field>
          <Field label="Weekly hours" span={12}>
            <dl className="max-w-sm space-y-2">
              {WEEK.map(({ day, open, close }) => (
                <div key={day} className="flex flex-wrap justify-between gap-2 text-sm">
                  <dt>{day}</dt><dd className={fc.mono}>{formatHour(open)} to {formatHour(close)}</dd>
                </div>
              ))}
            </dl>
          </Field>
          <Field label="GST rate" span={12}><p className={fc.mono}>{GST_RATE * 100}%</p></Field>
          <Field label="Receipt header" span={12}>
            <p>{STORE_NAME}</p>
            {STORE_ADDRESS.map((line) => <p key={line} className={fc.mono}>{line}</p>)}
          </Field>
          <Field label="Receipt thank you" span={12}><p>{THANK_YOU}</p></Field>
        </FieldGrid>
      </FormSection>
      <FormSection title="Account">
        <p className="mb-3 break-all text-sm">Signed in as {user?.email ?? 'Signed in'}</p>
        <FormActions><Button className={fc.secondary} onClick={handleLogout}>Log out</Button></FormActions>
      </FormSection>
    </div>
  );

  if (inShell) return <ToolPage tool="settings">{content}</ToolPage>;
  return <StaffLayout title="Settings" icon={Settings} iconColor="text-pub-muted">{content}</StaffLayout>;
};

export default StaffSettings;
