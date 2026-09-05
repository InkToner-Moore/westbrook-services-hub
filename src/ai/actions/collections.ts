// Chat actions for the simpler collections: a staff note, a key inventory model,
// a website directory link, and a read-only inventory lookup. Each reuses the same
// Firestore helpers and document shapes the corresponding page uses, so items
// added here show up there unchanged. Listing/editing stay on the pages for now.
import {
  generateInventoryId,
  generateNoteId,
  getCollection,
  setDocument,
} from '@/lib/firestore';
import type { Intent } from '../types';
import type { ActionResult } from './types';

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function bool(intent: Intent, key: string): boolean {
  return intent.fields[key]?.value === true;
}
function nowIso(): string {
  return new Date().toISOString();
}

const NOTE_CATEGORIES = ['general', 'customer', 'inventory', 'shipping', 'urgent'];

export async function executeNote(intent: Intent): Promise<ActionResult> {
  const content = str(intent, 'content');
  const rawCategory = str(intent, 'noteCategory').toLowerCase();
  const category = NOTE_CATEGORIES.includes(rawCategory) ? rawCategory : 'general';
  const title = content.length > 42 ? `${content.slice(0, 42).trim()}...` : content || 'Note';
  const id = generateNoteId();

  await setDocument('notes', id, {
    id,
    title,
    content,
    category,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Saved a ${category} note.` };
}

export async function executeInventory(intent: Intent): Promise<ActionResult> {
  const model = str(intent, 'keyName');
  const inStock = intent.fields.inStock ? bool(intent, 'inStock') : true;
  const id = generateInventoryId();

  await setDocument('keyInventory', id, {
    id,
    model,
    inStock,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Added ${model} to key inventory, ${inStock ? 'in stock' : 'out of stock'}.` };
}

// The two inventory record shapes, mirroring StaffInventory.tsx. Kept minimal to
// what the lookup reads and returns.
interface KeyInventoryItem {
  id: string;
  model: string;
  price: number | null;
  notes?: string;
  inStock: boolean;
}
interface RefillItem {
  id: string;
  brand: string;
  cartridge: string;
  priceBlack: number | null;
  priceColour: number | null;
  priceXl: number | null;
  priceNote?: string;
  inStock: boolean;
}

const fmtMoney = (n: number | null | undefined): string | null =>
  n === null || n === undefined || Number.isNaN(n) ? null : `$${n.toFixed(2)}`;

// A short spoken summary of one match, for the chat line. The card on the right
// (Wave 2) renders the full detail from the artifact data.
function summariseKey(k: KeyInventoryItem): string {
  const price = fmtMoney(k.price);
  return `${k.model} is ${k.inStock ? 'in stock' : 'out of stock'}${price ? `, ${price}` : ''}.`;
}
function summariseRefill(r: RefillItem): string {
  const prices = [fmtMoney(r.priceBlack) && `Black ${fmtMoney(r.priceBlack)}`, fmtMoney(r.priceColour) && `Colour ${fmtMoney(r.priceColour)}`, fmtMoney(r.priceXl) && `XL ${fmtMoney(r.priceXl)}`].filter(Boolean).join(', ');
  const name = `${r.brand ? `${r.brand} ` : ''}${r.cartridge}`.trim();
  return `${name} is ${r.inStock ? 'in stock' : 'out of stock'}${prices ? `, ${prices}` : ''}.`;
}

// A READ lookup: "is the HP 65 in stock / what's the price / where is that key".
// Reads keyInventory and refillInventory via the shared helpers, ranks matches by
// how many query tokens they contain, and returns an 'inventory' artifact the
// Wave-2 Inventory card renders. Immediate: no confirmation step. See
// PHASE-2-ARCH section 1 and PHASE-2 spec item 5.
export async function executeInventoryLookup(intent: Intent): Promise<ActionResult> {
  const query = str(intent, 'query');
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

  if (!query || tokens.length === 0) {
    return {
      message: 'What would you like me to check the stock or price of?',
      artifact: { kind: 'inventory', title: 'Inventory lookup', data: { query, keys: [], refills: [], total: 0 } },
    };
  }

  let keys: KeyInventoryItem[] = [];
  let refills: RefillItem[] = [];
  try {
    [keys, refills] = await Promise.all([
      getCollection<KeyInventoryItem>('keyInventory', 'createdAt'),
      getCollection<RefillItem>('refillInventory', 'createdAt'),
    ]);
  } catch {
    return { message: 'I could not reach the inventory just now. Please try again.' };
  }

  const score = (hay: string): number =>
    tokens.reduce((n, t) => (hay.toLowerCase().includes(t) ? n + 1 : n), 0);

  const keyMatches = keys
    .map((k) => ({ k, s: score(`${k.model} ${k.notes ?? ''}`) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((m) => m.k);
  const refillMatches = refills
    .map((r) => ({ r, s: score(`${r.brand} ${r.cartridge} ${r.priceNote ?? ''}`) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((m) => m.r);

  const total = keyMatches.length + refillMatches.length;
  const data = { query, keys: keyMatches, refills: refillMatches, total };

  let message: string;
  if (total === 0) {
    message = `I could not find "${query}" in the key or refill inventory.`;
  } else {
    const lead = keyMatches[0] ? summariseKey(keyMatches[0]) : summariseRefill(refillMatches[0]);
    const more = total > 1 ? ` Plus ${total - 1} more on the right.` : '';
    message = `${lead}${more}`;
  }

  return { message, artifact: { kind: 'inventory', title: 'Inventory lookup', data } };
}

const DIRECTORY_CATEGORIES = ['courier', 'admin', 'shipping', 'other'];

// Directory ids follow the page's DIR- scheme (that generator is page-local).
function generateDirectoryId(): string {
  let s = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return `DIR-${s}`;
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function executeDirectory(intent: Intent): Promise<ActionResult> {
  const name = str(intent, 'linkName');
  const url = normalizeUrl(str(intent, 'url'));
  const rawCategory = str(intent, 'linkCategory').toLowerCase();
  const category = DIRECTORY_CATEGORIES.includes(rawCategory) ? rawCategory : 'other';
  const id = generateDirectoryId();

  await setDocument('directoryLinks', id, {
    id,
    name,
    description: str(intent, 'linkDescription'),
    url,
    category,
    iconKey: 'link',
    colorKey: 'blue',
    isAdmin: false,
    // Append to the end; the page sorts by this ascending.
    order: Date.now(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Added ${name} to the website directory.` };
}
