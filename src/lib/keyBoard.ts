// The physical key board at the counter, as data that lives in the app. Each
// position (A1, A2, ... J92) is one Firestore document in the `keyBoard`
// collection, so staff and AI Mode can move a blank or free a slot and it sticks
// across devices. The spreadsheet the shop dictated was a one-time seed
// (scripts/keyBoardSeed.json, loaded by scripts/seedKeyBoard.mjs); from here on
// Firestore is the source of truth, not that file.
//
// A position with no document is "not provided" (never dictated). An `empty`
// document means the slot was checked and is free. A `recorded` document holds
// the blank(s) that live there: `models` are the human names (may carry a brand,
// and a slot can list equivalents), `codes` are those names normalized for
// matching against the priced keyInventory and for spotting the same blank in two
// places.

import { getCollection, setDocument, updateDocument } from '@/lib/firestore';

export const KEY_BOARD_COLLECTION = 'keyBoard';

// Rows on the physical board, top to bottom.
export const BOARD_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export type BoardRow = (typeof BOARD_ROWS)[number];

export type KeyBoardStatus = 'recorded' | 'empty';

export interface KeyBoardPosition {
  position: string; // doc id, e.g. "A1"
  row: string; // "A"
  number: number; // 1
  status: KeyBoardStatus;
  models: string[]; // display names / equivalents ("Ilco 01122BE", "Y104")
  codes: string[]; // normalized codes for matching ("01122BE")
  entry?: string; // the original dictated text, kept for reference
  notes?: string;
  updatedAt?: string;
}

// Brand words that prefix a model name on the board but are not part of the code
// staff cut against. Stripped so "Ilco 01122BE" and "01122BE" match.
const BRANDS = [
  'ilco', 'cole', 'curtis', 'cisa', 'schlage', 'medeco', 'axxess', 'kaba',
  'silca', 'jet', 'dominion', 'esp', 'taylor', 'star', 'weiser', 'kwikset', 'yale',
];

// Normalize a model name to the code used for matching: drop a leading brand
// word, trim, upper-case. "Ilco 01122BE" -> "01122BE", " hr1 " -> "HR1".
export function normCode(model: string): string {
  let p = (model || '').trim();
  const lower = p.toLowerCase();
  for (const b of BRANDS) {
    if (lower.startsWith(b + ' ')) {
      p = p.slice(b.length + 1).trim();
      break;
    }
  }
  return p.toUpperCase();
}

// Parse a free-typed models field ("Ilco 01122BR / Y104") into display names.
export function parseModelsInput(input: string): string[] {
  return input
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const codesFor = (models: string[]): string[] =>
  Array.from(new Set(models.map(normCode).filter(Boolean)));

export function splitPosition(position: string): { row: string; number: number } | null {
  const m = /^([A-Za-z]+)\s*(\d+)$/.exec(position.trim());
  if (!m) return null;
  return { row: m[1].toUpperCase(), number: Number(m[2]) };
}

// Load the whole board. Positions come back in board order (row, then number).
export async function getKeyBoard(): Promise<KeyBoardPosition[]> {
  const rows = await getCollection<KeyBoardPosition>(KEY_BOARD_COLLECTION);
  return rows.slice().sort(comparePositions);
}

export function comparePositions(a: KeyBoardPosition, b: KeyBoardPosition): number {
  if (a.row !== b.row) return a.row < b.row ? -1 : 1;
  return (a.number ?? 0) - (b.number ?? 0);
}

// code (normalized) -> the positions that hold it. Feeds the location badge and
// the duplicate check.
export function buildLocationIndex(board: KeyBoardPosition[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const p of board) {
    if (p.status !== 'recorded') continue;
    for (const code of p.codes ?? []) {
      const arr = idx.get(code) ?? [];
      arr.push(p.position);
      idx.set(code, arr);
    }
  }
  return idx;
}

// Where a model lives on the board, joined with " / " when it sits in more than
// one slot. Returns null when the board does not place it.
export function boardLocationFor(model: string, index: Map<string, string[]>): string | null {
  const positions = index.get(normCode(model));
  return positions && positions.length > 0 ? positions.join(' / ') : null;
}

const nowIso = () => new Date().toISOString();

// Write a recorded blank into a position (create or overwrite). Used by the board
// editor and by AI Mode ("put SC1 in B3").
export async function setPositionModels(
  position: string,
  models: string[],
  opts?: { notes?: string; entry?: string },
): Promise<KeyBoardPosition> {
  const parts = splitPosition(position);
  const doc: KeyBoardPosition = {
    position: position.toUpperCase(),
    row: parts?.row ?? '',
    number: parts?.number ?? 0,
    status: 'recorded',
    models,
    codes: codesFor(models),
    entry: opts?.entry ?? models.join(' / '),
    notes: opts?.notes ?? '',
    updatedAt: nowIso(),
  };
  await setDocument(KEY_BOARD_COLLECTION, doc.position, doc);
  return doc;
}

// Mark a position free. Kept as an `empty` document (not deleted) so the board
// shows it was checked, distinct from a never-dictated slot.
export async function clearPosition(position: string): Promise<KeyBoardPosition> {
  const parts = splitPosition(position);
  const doc: KeyBoardPosition = {
    position: position.toUpperCase(),
    row: parts?.row ?? '',
    number: parts?.number ?? 0,
    status: 'empty',
    models: [],
    codes: [],
    entry: 'Empty',
    notes: '',
    updatedAt: nowIso(),
  };
  await setDocument(KEY_BOARD_COLLECTION, doc.position, doc);
  return doc;
}

export async function updatePositionNotes(position: string, notes: string): Promise<void> {
  await updateDocument(KEY_BOARD_COLLECTION, position.toUpperCase(), { notes, updatedAt: nowIso() });
}

// ---- Review checks -------------------------------------------------------

export type ReviewKind = 'duplicate' | 'no_price' | 'flagged' | 'unidentified' | 'not_placed';

export interface ReviewAlert {
  kind: ReviewKind;
  severity: 'warn' | 'info';
  title: string;
  detail: string;
  positions: string[]; // board positions to jump to
  model?: string; // the code/model this is about, for a search jump
}

export interface PricedModel {
  model: string;
  price: number | null;
}

// Everything the Review tab flags, computed from the board and the priced key
// inventory. Ordered by how much it wants a human: duplicates and missing prices
// first, then sheet flags, then the softer "not placed" notes.
export function computeReviews(board: KeyBoardPosition[], priced: PricedModel[]): ReviewAlert[] {
  const alerts: ReviewAlert[] = [];
  const index = buildLocationIndex(board);
  const pricedCodes = new Map<string, number | null>();
  for (const k of priced) pricedCodes.set(normCode(k.model), k.price ?? null);

  // 1. Same blank recorded in more than one position.
  for (const [code, positions] of index) {
    const uniq = Array.from(new Set(positions));
    if (uniq.length > 1) {
      alerts.push({
        kind: 'duplicate',
        severity: 'warn',
        title: `${code} is on the board in ${uniq.length} spots`,
        detail: `Recorded at ${uniq.join(', ')}. Keep it in one place, or note why it is doubled.`,
        positions: uniq,
        model: code,
      });
    }
  }

  // 2. A blank on the board that has no price in the key inventory.
  const seenNoPrice = new Set<string>();
  for (const p of board) {
    if (p.status !== 'recorded') continue;
    for (const code of p.codes ?? []) {
      if (seenNoPrice.has(code)) continue;
      const has = pricedCodes.has(code) && pricedCodes.get(code) != null;
      if (!has) {
        seenNoPrice.add(code);
        alerts.push({
          kind: 'no_price',
          severity: 'warn',
          title: `${code} has no price`,
          detail: pricedCodes.has(code)
            ? `${code} is in the key list but its price is blank. Add a price so it rings up.`
            : `${code} is on the board but not in the priced key list. Add it so it rings up.`,
          positions: index.get(code) ?? [p.position],
          model: code,
        });
      }
    }
  }

  // 3. Positions the source sheet flagged for a human (uncertain markings,
  //    several keys at one spot).
  for (const p of board) {
    if (p.notes && /FLAGGED:/i.test(p.notes)) {
      alerts.push({
        kind: 'flagged',
        severity: 'warn',
        title: `${p.position} needs a look`,
        detail: p.notes.replace(/^.*FLAGGED:\s*/i, ''),
        positions: [p.position],
        model: p.codes?.[0],
      });
    }
  }

  // 4. Recorded slots with no identifiable model code (brand-only, "keychains",
  //    valets). Info, not a blocker.
  for (const p of board) {
    if (p.status === 'recorded' && (p.codes?.length ?? 0) === 0) {
      alerts.push({
        kind: 'unidentified',
        severity: 'info',
        title: `${p.position} has no model number`,
        detail: p.entry ? `Recorded as "${p.entry}". Identify it when you can.` : 'Identify it when you can.',
        positions: [p.position],
      });
    }
  }

  // 5. A priced key that is not placed anywhere on the board. Soft note.
  for (const k of priced) {
    const code = normCode(k.model);
    if (code && !index.has(code)) {
      alerts.push({
        kind: 'not_placed',
        severity: 'info',
        title: `${code} is priced but not on the board`,
        detail: `The key list has ${code} but no board slot points to it. Add its slot so staff can find it.`,
        positions: [],
        model: code,
      });
    }
  }

  const rank: Record<ReviewKind, number> = {
    duplicate: 0, no_price: 1, flagged: 2, unidentified: 3, not_placed: 4,
  };
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind]);
}
