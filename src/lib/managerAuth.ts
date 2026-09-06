// Manager PIN: a soft gate for manager-only actions (editing the schedule now,
// and later site-content editing and settings). One shared PIN for the shop, set
// in-app and stored HASHED in a single Firestore settings doc, never in plain
// text. Unlocking flips a browser-session "manager mode" (held in React state, so
// it resets on reload). This is a guardrail against accidental edits by counter
// staff, NOT a security boundary: any signed-in user with devtools can bypass it
// until Firestore rules enforce a manager identity. See ManagerModeContext.
import { getDocument, setDocument } from './firestore';

// A single settings collection we reuse for app-wide config (manager PIN today,
// site content and settings later). One doc per concern; the manager PIN is here.
export const APP_SETTINGS_COLLECTION = 'appSettings';
export const MANAGER_DOC_ID = 'manager';

// Fixed app salt so the stored hash is not a bare SHA-256 of a short PIN. This is
// a soft gate, not real key derivation; it just keeps the plaintext PIN out of
// Firestore and off a trivial rainbow table.
const PIN_SALT = 'itm-manager-pin-v1';

export interface ManagerSettings {
  id?: string;
  pinHash: string;
  updatedAt: string; // ISO
}

// SHA-256 of salt + PIN, hex encoded. Web Crypto is available in every browser
// the staff use; no new dependency.
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_SALT}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function loadManagerSettings(): Promise<ManagerSettings | null> {
  return getDocument<ManagerSettings>(APP_SETTINGS_COLLECTION, MANAGER_DOC_ID);
}

// Set or change the manager PIN (create-or-overwrite of the single manager doc).
export async function saveManagerPin(pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await setDocument(APP_SETTINGS_COLLECTION, MANAGER_DOC_ID, {
    pinHash,
    updatedAt: new Date().toISOString(),
  });
}

// True when the entered PIN matches the stored hash.
export async function verifyManagerPin(
  pin: string,
  settings: ManagerSettings | null,
): Promise<boolean> {
  if (!settings?.pinHash) return false;
  return (await hashPin(pin)) === settings.pinHash;
}

// Shared PIN format rule (4 to 8 digits). Kept here so the dialog and any future
// caller validate the same way.
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
