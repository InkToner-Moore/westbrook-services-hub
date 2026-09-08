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
import { NOTE_CATEGORIES } from '../fieldSpecs';
import {
  getKeyBoard,
  buildLocationIndex,
  boardLocationFor,
  clearPosition,
  setPositionModels,
  type KeyBoardPosition,
} from '@/lib/keyBoard';

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

export async function executeNote(intent: Intent): Promise<ActionResult> {
  const content = str(intent, 'content');
  // Match the counter's dropdown choice (fieldSpecs NOTE_CATEGORIES) case
  // insensitively and store the canonical cased form; fall back to the first.
  const rawCategory = str(intent, 'noteCategory');
  const category =
    NOTE_CATEGORIES.find((c) => c.toLowerCase() === rawCategory.toLowerCase()) ?? NOTE_CATEGORIES[0];
  const title = content.length > 42 ? `${content.slice(0, 42).trim()}...` : content || 'Note';
  const id = generateNoteId();
  const now = nowIso();

  await setDocument('notes', id, {
    id,
    title,
    content,
    category,
    createdAt: now,
    updatedAt: now,
  });

  // The 'note' artifact the NoteCard renders as a saved note slip.
  return {
    message: `Saved a ${category} note.`,
    artifact: {
      kind: 'note',
      title: 'Note',
      data: { saved: true, id, title, content, category, createdAt: now },
    },
  };
}

export async function executeInventory(intent: Intent): Promise<ActionResult> {
  const model = str(intent, 'keyName');
  const inStock = intent.fields.inStock ? bool(intent, 'inStock') : true;
  const id = generateInventoryId();
  const now = nowIso();

  await setDocument('keyInventory', id, {
    id,
    model,
    inStock,
    createdAt: now,
    updatedAt: now,
  });

  // The 'inventory' artifact (save variant) the InventoryCard renders as a
  // success slip with an inline edit for price / stock / location.
  return {
    message: `Added ${model} to key inventory, ${inStock ? 'in stock' : 'out of stock'}.`,
    artifact: {
      kind: 'inventory',
      title: 'Inventory',
      data: {
        mode: 'saved',
        savedKind: 'key',
        item: { id, model, price: null, inStock },
      },
    },
  };
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

  // Rank matches so an exact hit wins: a full-string match ranks highest, then a
  // whole-token match, then a prefix, then a loose substring. This is what puts a
  // searched "Y1" at the top instead of burying it under everything that merely
  // contains "y1". `primary` is the item's identifying text (a key's model, a
  // refill's name); `extra` is secondary text (notes) that only breaks ties.
  const q = query.toLowerCase().trim();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rank = (primary: string, extra = ''): number => {
    const p = primary.toLowerCase().trim();
    if (p === q) return 10000;
    let s = 0;
    for (const t of tokens) {
      if (p === t) s += 500;
      else if (new RegExp(`(?:^|[^a-z0-9])${esc(t)}(?:[^a-z0-9]|$)`, 'i').test(p)) s += 100;
      else if (p.startsWith(t)) s += 40;
      else if (p.includes(t)) s += 10;
      if (extra && extra.toLowerCase().includes(t)) s += 2;
    }
    return s;
  };

  const keyMatches = keys
    .map((k) => ({ k, s: rank(k.model, k.notes ?? '') }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((m) => m.k);
  const refillMatches = refills
    .map((r) => ({ r, s: rank(`${r.brand} ${r.cartridge}`.trim(), r.priceNote ?? '') }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((m) => m.r);

  // Attach each key's live board location so the card shows where it lives.
  let board: KeyBoardPosition[] = [];
  try {
    board = await getKeyBoard();
  } catch {
    board = [];
  }
  const index = buildLocationIndex(board);
  const keyMatchesWithLocation = keyMatches.map((k) => ({
    ...k,
    location: boardLocationFor(k.model, index),
  }));

  const total = keyMatchesWithLocation.length + refillMatches.length;
  const data = { query, keys: keyMatchesWithLocation, refills: refillMatches, total };

  let message: string;
  if (total === 0) {
    message = `I could not find "${query}" in the key or refill inventory.`;
  } else {
    const leadKey = keyMatchesWithLocation[0];
    const lead = leadKey
      ? `${summariseKey(leadKey)}${leadKey.location ? ` Board ${leadKey.location}.` : ''}`
      : summariseRefill(refillMatches[0]);
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

// Set or clear a key's spot on the physical board from AI Mode: "put SC1 in B3",
// "move HR1 to H1", "B3 is empty". Writes the keyBoard collection (lib/keyBoard),
// the same data the Inventory board renders and edits. Immediate: it runs on the
// spot and shows a short confirmation card, since a location edit is low-risk and
// the board editor is the safety net.
export async function executeKeyLocation(intent: Intent): Promise<ActionResult> {
  const op = str(intent, 'op') || 'set';
  const position = str(intent, 'position').toUpperCase();
  const modelsRaw = intent.fields.models?.value;
  const models = Array.isArray(modelsRaw) ? (modelsRaw as string[]) : [];

  if (!position) {
    return { message: 'Which board slot? Tell me a spot like B3 or H1.' };
  }

  try {
    if (op === 'clear') {
      await clearPosition(position);
      return {
        message: `Freed slot ${position} on the board.`,
        artifact: {
          kind: 'inventory',
          title: 'Board updated',
          data: { mode: 'saved', savedKind: 'key', item: { id: position, model: `${position} is now empty`, price: null, inStock: true } },
        },
      };
    }
    if (models.length === 0) {
      return { message: `Which key goes in ${position}? Say something like "put SC1 in ${position}".` };
    }
    await setPositionModels(position, models);
    return {
      message: `Put ${models.join(' / ')} in ${position} on the board.`,
      artifact: {
        kind: 'inventory',
        title: 'Board updated',
        data: { mode: 'saved', savedKind: 'key', item: { id: position, model: `${models.join(' / ')} - ${position}`, price: null, inStock: true } },
      },
    };
  } catch (e) {
    console.error('Failed to update board from AI:', e);
    return { message: `I could not update ${position} just now. Try the board editor on the Inventory page.` };
  }
}
