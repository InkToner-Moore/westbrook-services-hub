// This is a device lock over the saved Firebase session, not biometric sign-in.
// WebAuthn requires device user verification here. No server verifies the signature;
// real passkey login needs a server.
const RECORD_KEY = 'staff-device-lock';
const SESSION_KEY = 'staff-device-unlocked';
const METHOD_KEY = 'staff-device-unlock-method';
const HIDDEN_KEY = 'staff-device-hidden-at';
export const DEVICE_LOCK_IDLE_MS = 5 * 60 * 1000;
let unlockedUid: string | null = null;
let unlockMethod: 'password' | 'biometric' | null = null;
let hiddenAt: number | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

type LockRecord = { uid: string; credentialId: string; createdAt: number };
export type LockUser = { uid?: string; email: string | null };
export const userKey = (user: LockUser) => user.uid || user.email;

const readRecord = (): LockRecord | null => {
  try {
    const record = JSON.parse(localStorage.getItem(RECORD_KEY) || 'null');
    return record && typeof record.uid === 'string' &&
      typeof record.credentialId === 'string' && typeof record.createdAt === 'number'
      ? record : null;
  } catch { return null; }
};
const encode = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
    (char) => char.charCodeAt(0));
};
export const markUnlocked = (uid: string, method: 'password' | 'biometric' = 'password') => {
  unlockedUid = uid;
  unlockMethod = method;
  try {
    sessionStorage.setItem(SESSION_KEY, uid);
    sessionStorage.setItem(METHOD_KEY, method);
  } catch { /* Memory still works. */ }
  notify();
};
export const clearUnlocked = () => {
  let changed = unlockedUid !== null;
  try { changed = changed || sessionStorage.getItem(SESSION_KEY) !== null; }
  catch { /* Use the in-memory state. */ }
  unlockedUid = null;
  unlockMethod = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(METHOD_KEY);
  } catch { /* Memory is cleared. */ }
  if (changed) notify();
};
const checkExpiry = () => {
  let started = hiddenAt;
  try {
    const saved = sessionStorage.getItem(HIDDEN_KEY);
    if (saved) started = Number(saved);
  } catch { /* Use the in-memory time. */ }
  if (started !== null && Date.now() - started > DEVICE_LOCK_IDLE_MS) clearUnlocked();
};
export const isUnlocked = (uid: string) => {
  checkExpiry();
  try { return unlockedUid === uid || sessionStorage.getItem(SESSION_KEY) === uid; }
  catch { return unlockedUid === uid; }
};
export const unlockedWithPassword = (uid: string) => {
  if (!isUnlocked(uid)) return false;
  try { return (unlockMethod || sessionStorage.getItem(METHOD_KEY)) === 'password'; }
  catch { return unlockMethod === 'password'; }
};
if (typeof document !== 'undefined') {
  const onVisibility = () => {
    if (document.hidden) {
      if (hiddenAt === null) {
        try { hiddenAt = Number(sessionStorage.getItem(HIDDEN_KEY)) || Date.now(); }
        catch { hiddenAt = Date.now(); }
      }
      try { sessionStorage.setItem(HIDDEN_KEY, String(hiddenAt)); }
      catch { /* Use the in-memory time. */ }
    } else {
      checkExpiry();
      hiddenAt = null;
      try { sessionStorage.removeItem(HIDDEN_KEY); }
      catch { /* Memory is cleared. */ }
    }
  };
  onVisibility();
  document.addEventListener('visibilitychange', onVisibility);
}
export const enabledFor = (uid: string) => readRecord()?.uid === uid;
export const isAvailable = async () => {
  try {
    return !!window.PublicKeyCredential && window.isSecureContext &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
};
export const enable = async (user: LockUser) => {
  const uid = userKey(user);
  if (!uid || !user.email) return false;
  try {
    const credential = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'ITM Dashboard', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: user.email, displayName: user.email },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged',
      },
      timeout: 60000, attestation: 'none',
    } }) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(RECORD_KEY, JSON.stringify({
      uid, credentialId: encode(credential.rawId), createdAt: Date.now(),
    }));
    markUnlocked(uid, unlockedWithPassword(uid) ? 'password' : 'biometric');
    return true;
  } catch { return false; }
};
export const verify = async (signal?: AbortSignal): Promise<{
  success: boolean; reason?: 'cancelled' | 'failed';
}> => {
  const record = readRecord();
  if (!record) return { success: false, reason: 'failed' };
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout>;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const interrupted = new Promise<null>((resolve) => {
    controller.signal.addEventListener('abort', () => resolve(null), { once: true });
    if (controller.signal.aborted) resolve(null);
    timer = setTimeout(() => { timedOut = true; abort(); }, 65000);
  });
  try {
    if (controller.signal.aborted) return { success: false, reason: 'cancelled' };
    const credential = await Promise.race([
      navigator.credentials.get({ signal: controller.signal, publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: decode(record.credentialId), transports: ['internal'] }],
        userVerification: 'required', timeout: 60000,
      } }),
      interrupted,
    ]);
    if (controller.signal.aborted || !credential) {
      return { success: false, reason: timedOut ? 'failed' : 'cancelled' };
    }
    markUnlocked(record.uid, 'biometric');
    return { success: true };
  } catch (error) {
    const cancelled = error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'AbortError');
    return { success: false, reason: !timedOut && cancelled ? 'cancelled' : 'failed' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
};
export const disable = () => {
  localStorage.removeItem(RECORD_KEY);
  clearUnlocked();
};
