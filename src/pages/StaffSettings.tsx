import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useManagerMode } from '@/contexts/ManagerModeContext';
import {
  enable, disable, enabledFor, isAvailable, markUnlocked, unlockedWithPassword, userKey, verify,
} from '@/lib/deviceLock';
import { useInstallState } from '@/lib/installPrompt';
import { canSwitchToV1, switchToV1, leaveToPublicSite } from '@/lib/staffVersion';
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
import { DAY_NAMES, formatHour } from '@/lib/storeInfo';
import { GST_RATE, STORE_NAME } from '@/lib/simpleReceipt';

import { useShopSettings, saveShopSettings, type ShopSettings } from '@/lib/shopSettings';

const StaffSettings = () => {
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();
  const { isManager, promptUnlock, lock } = useManagerMode();
  const { user, logout } = useAuth();
  const { inShell } = useShell();
  const { hiddenTiles, setVisible } = useHiddenTiles();
  const fc = useFormClasses();
  const settings = useShopSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ShopSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (!isManager) setEditing(false); }, [isManager]);
  const startEditing = () => {
    setDraft({ ...settings, week: settings.week.map((day) => ({ ...day })),
      addressLines: [...settings.addressLines] });
    setErrors({});
    setSaveError('');
    setEditing(true);
  };
  const saveDetails = async () => {
    if (!isManager || saving) return;
    const problems: Record<string, string> = {};
    const checkText = (key: string, value: string, required = true) => {
      if (required && !value.trim()) problems[key] = 'Enter a value.';
      else if (value.length > 120) problems[key] = 'Use 120 characters or fewer.';
    };
    checkText('phone', draft.phone);
    const digits = draft.phone.replace(/\D/g, '').length;
    if (digits !== 10 && digits !== 11) problems.phone = 'Use 10 or 11 digits.';
    checkText('email', draft.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      problems.email = 'Enter a valid email address.';
    }
    draft.week.forEach((day, i) => {
      if (day.close <= day.open) problems[`day${i}`] = 'Closes must be after opens.';
    });
    draft.addressLines.forEach((line, i) => checkText(`address${i}`, line, i === 0));
    checkText('thankYou', draft.thankYou);
    setErrors(problems);
    setSaveError('');
    if (Object.keys(problems).length) return;
    setSaving(true);
    try {
      await saveShopSettings({ ...draft,
        addressLines: draft.addressLines.filter((line) => line.trim()) });
      setEditing(false);
      toast({ title: 'Shop details saved' });
    } catch {
      setSaveError('Could not save. Check the connection, '
        + 'or the settings rule may not be set up in Firebase yet.');
    } finally { setSaving(false); }
  };
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
      if (isStandalone()) navigate('/staff');
      else leaveToPublicSite(navigate);
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
          <div className="col-span-2 sm:col-span-12">
            <div className="flex min-h-11 items-center gap-3">
              <label htmlFor="settings-device-lock" className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-5 text-pub-ink">
                  Unlock with fingerprint or Face ID
                </span>
                <span className="mt-1.5 block text-[13px] text-pub-muted">
                  Asks for your fingerprint or face when the app opens on this device.
                  {' '}Your password still works.
                </span>
              </label>
              {(lockAvailable || !lockEnabled) && (
                <Switch id="settings-device-lock" checked={lockEnabled}
                  disabled={!lockAvailable || lockBusy}
                  onCheckedChange={(value) => void changeDeviceLock(value)} />
              )}
            </div>
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
          </div>
        </FieldGrid>
      </FormSection>
      <FormSection title="AI Mode">
        <FieldGrid>
          <div className="col-span-2 flex min-h-11 items-center gap-3 sm:col-span-12">
            <label htmlFor="settings-shortcuts" className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-5 text-pub-ink">
                Show shortcuts when the chat opens
              </span>
              <span className="mt-1.5 block text-[13px] text-pub-muted">
                Off keeps them behind the Shortcuts button.
              </span>
            </label>
            <Switch id="settings-shortcuts" checked={shortcuts ?? !phone}
              onCheckedChange={(value) => {
                setShortcuts(value);
                try {
                  localStorage.setItem('ai-shortcuts-open', value ? '1' : '0');
                } catch { /* Keep the local choice. */ }
              }} />
          </div>
        </FieldGrid>
      </FormSection>
      <FormSection title="Tools on the rail"
        description={'Tap a tool to hide or show it. Hidden tools still open from AI Mode or a link. '
          + 'This only changes this device.'}>
        <div className="flex flex-wrap gap-2">
          {TOOL_TILES.map((tile) => {
            const Icon = tile.icon;
            const visible = !hiddenTiles.includes(tile.key);
            const color = visible ? themeClasses.ink.fill :
              'bg-pub-paper border-pub-edge text-pub-muted hover:text-pub-ink';
            const chip = 'inline-flex min-h-11 sm:min-h-[40px] items-center gap-1.5 '
              + 'rounded-full border px-3.5 text-sm font-medium transition-colors';
            return (
              <button key={tile.key} type="button" aria-pressed={visible}
                aria-label={`${tile.label}, ${visible ? 'shown on the rail' : 'hidden'}`}
                onClick={() => setVisible(tile.key, !visible)}
                className={`${chip} ${themeClasses.interactive.focus} ${color}`}>
                <Icon className="h-4 w-4" />
                <span className={visible ? undefined : 'line-through'}>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </FormSection>
      <FormSection title="Manager" description="Needed to add, change or delete shifts.">
        <p className="mb-3 text-sm">{isManager ? 'Signed in as manager' : 'Locked'}</p>
        <FormActions>
          <Button className={fc.secondary} onClick={() => { if (isManager) void lock(); else promptUnlock(); }}>
            {isManager ? 'Lock' : 'Manager sign in'}
          </Button>
        </FormActions>
      </FormSection>
      <FormSection title="Shop details"
        description={!isManager ? 'A manager can change these.' : undefined}>
        {editing && isManager ? (
          <form noValidate onSubmit={(event) => { event.preventDefault(); void saveDetails(); }}>
            <fieldset disabled={saving} className="min-w-0">
              <FieldGrid>
                <Field label="Phone" htmlFor="shop-phone" error={errors.phone}>
                  <input id="shop-phone" inputMode="tel" className={`${fc.input} w-full tabular-nums`}
                    value={draft.phone}
                    onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                </Field>
                <Field label="Email" htmlFor="shop-email" error={errors.email}>
                  <input id="shop-email" type="email" className={`${fc.input} w-full`}
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                </Field>
                <Field label="Weekly hours" span={12}>
                  <div className="space-y-3">
                    {draft.week.map((day, i) => (
                      <Field key={DAY_NAMES[i]} label={DAY_NAMES[i]} error={errors[`day${i}`]}>
                        <div className="grid grid-cols-2 gap-3">
                          {(['open', 'close'] as const).map((kind) => (
                            <label key={kind} className="min-w-0 text-[13px] text-pub-muted">
                              {kind === 'open' ? 'Opens' : 'Closes'}
                              <select className={`${fc.input} mt-1 block w-full`}
                                value={day[kind]}
                                onChange={(event) => setDraft({ ...draft,
                                  week: draft.week.map((entry, index) => index === i
                                    ? { ...entry, [kind]: Number(event.target.value) } : entry) })}>
                                {Array.from({ length: 19 }, (_, hour) =>
                                  hour + (kind === 'open' ? 5 : 6)).map((hour) => (
                                  <option key={hour} value={hour}>{formatHour(hour)}</option>
                                ))}
                                {day[kind] < (kind === 'open' ? 5 : 6) && (
                                  <option value={day[kind]}>{formatHour(day[kind])}</option>
                                )}
                              </select>
                            </label>
                          ))}
                        </div>
                      </Field>
                    ))}
                  </div>
                </Field>
                {Array.from({ length: Math.max(2, draft.addressLines.length) }, (_, i) => (
                  <Field key={i} label={`Address line ${i + 1}`} htmlFor={`shop-address-${i}`}
                    error={errors[`address${i}`]}>
                    <input id={`shop-address-${i}`} className={`${fc.input} w-full`}
                      value={draft.addressLines[i] ?? ''}
                      onChange={(event) => {
                        const addressLines = [...draft.addressLines];
                        addressLines[i] = event.target.value;
                        setDraft({ ...draft, addressLines });
                      }} />
                  </Field>
                ))}
                <Field label="Receipt thank-you line" htmlFor="shop-thanks" span={12}
                  error={errors.thankYou}>
                  <input id="shop-thanks" className={`${fc.input} w-full`} value={draft.thankYou}
                    onChange={(event) => setDraft({ ...draft, thankYou: event.target.value })} />
                </Field>
              </FieldGrid>
              <FormActions>
                <Button type="button" className={fc.secondary} disabled={saving}
                  onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" className={fc.primary} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </FormActions>
            </fieldset>
            {saveError && <p role="alert" className="mt-3 text-sm text-pub-muted">{saveError}</p>}
          </form>
        ) : (
          <>
            <FieldGrid>
              <Field label="Phone"><p className="tabular-nums">{settings.phone}</p></Field>
              <Field label="Email"><p className="break-all">{settings.email}</p></Field>
              <Field label="Weekly hours" span={12}>
                <dl className="max-w-sm space-y-2">
                  {settings.week.map(({ open, close }, i) => (
                    <div key={DAY_NAMES[i]} className="flex flex-wrap justify-between gap-2 text-sm">
                      <dt>{DAY_NAMES[i]}</dt>
                      <dd className={fc.mono}>{formatHour(open)} to {formatHour(close)}</dd>
                    </div>
                  ))}
                </dl>
              </Field>
              <Field label="Receipt address" span={12}>
                {settings.addressLines.map((line, i) => <p key={i}>{line}</p>)}
                <p className="tabular-nums">{settings.phone}</p>
              </Field>
              <Field label="Receipt thank you" span={12}><p>{settings.thankYou}</p></Field>
            </FieldGrid>
            <FormActions>
              <Button className={fc.secondary} onClick={() => { if (isManager) startEditing(); else promptUnlock(); }}>
                {isManager ? 'Edit' : 'Manager sign in to edit'}
              </Button>
            </FormActions>
          </>
        )}
        <FieldGrid className="mt-4">
          <Field label="GST rate" hint="Fixed in the app.">
            <p className={fc.mono}>{GST_RATE * 100}%</p>
          </Field>
          <Field label="Receipt header" hint="Fixed in the app."><p>{STORE_NAME}</p></Field>
        </FieldGrid>
      </FormSection>
      {canSwitchToV1() && (
        <FormSection title="Version"
          description="Not comfortable with the new screens yet? Switch this device back to the old version. You can come back any time.">
          <FormActions>
            <Button className={fc.secondary} onClick={switchToV1}>Use the old version</Button>
          </FormActions>
        </FormSection>
      )}
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
