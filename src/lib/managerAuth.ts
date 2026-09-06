// Manager session (client side). Manager-only actions are enforced by the SERVER:
// a correct PIN is checked by the Cloudflare Worker (proxy/src/manager.js), which
// mints a Firebase custom token carrying a `manager: true` claim for the current
// user. We sign in with it, so Firestore rules that require
// request.auth.token.manager == true then allow manager writes. The PIN hash never
// reaches the browser. Locking mints a token without the claim. See the worker for
// the storage model (Firestore `accessPins`, hashed with a server pepper) which
// also leaves room for per-employee PINs/roles later.
import { auth } from './firebase';
import { signInWithCustomToken } from 'firebase/auth';

// The worker base URL is the same one AI Mode already uses. Manager endpoints hang
// off /manager/*. When unset (no proxy configured), real manager mode is
// unavailable and callers fall back (dev bypass) or surface an error.
const PROXY = (import.meta.env.VITE_AI_PROXY_URL as string | undefined)?.replace(/\/$/, '') || '';

export function managerConfigured(): boolean {
  return !!PROXY;
}

// Shared PIN format rule (4 to 8 digits), matched by the worker.
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PROXY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  return { ok: res.ok, status: res.status, data: data as Record<string, unknown> };
}

// Whether a manager PIN has been set for the shop yet.
export async function fetchPinStatus(): Promise<boolean> {
  const { ok, data } = await post('/manager/status', {});
  return ok && data.pinSet === true;
}

// Set or change the manager PIN. Changing requires the current PIN (enforced by
// the worker); the first-time set does not.
export async function setManagerPin(
  newPin: string,
  currentPin?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { ok, data } = await post('/manager/set-pin', { newPin, currentPin });
  if (ok && data.ok) return { ok: true };
  return { ok: false, error: (data.error as string) || 'set_failed' };
}

// Verify the PIN with the worker and, on success, upgrade this browser session to
// a manager session (the ID token gains the manager claim).
export async function unlockManagerSession(pin: string): Promise<{ ok: boolean; error?: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, error: 'not_signed_in' };
  const { ok, data } = await post('/manager/unlock', { pin, uid });
  if (!ok || !data.token) return { ok: false, error: (data.error as string) || 'unlock_failed' };
  await signInWithCustomToken(auth, data.token as string);
  await auth.currentUser?.getIdToken(true); // refresh so the claim is live now
  return { ok: true };
}

// Drop the manager claim from this session (no PIN needed to give up privilege).
export async function lockManagerSession(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { ok, data } = await post('/manager/lock', { uid });
  if (ok && data.token) {
    await signInWithCustomToken(auth, data.token as string);
    await auth.currentUser?.getIdToken(true);
  }
}

// Read the manager claim from the current ID token.
export async function currentUserIsManager(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    const res = await u.getIdTokenResult();
    return res.claims.manager === true;
  } catch {
    return false;
  }
}
