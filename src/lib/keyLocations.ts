// The physical key board at the counter: which slot holds which blank, and which
// slots are empty or not yet identified. This is the single source of truth. The
// board map (StaffInventory) renders it slot by slot so staff can see where a key
// lives and which spots are free; the per-key location badge and the AI inventory
// card read the derived model -> slot map (KEY_LOCATIONS) below.
//
// To update the board, edit KEY_BOARD. A slot can list more than one model name
// (equivalents), and a model that sits in two slots (e.g. HR1 in both the brass
// and nickel spots) resolves to "H1 / I1" so the clerk sees both.

export type KeyBoardStatus = 'occupied' | 'empty' | 'unknown';

export interface KeyBoardSlot {
  slot: string; // the board position, e.g. "A1"
  label: string; // what to show in the cell
  models: string[]; // model codes stored here (any casing); [] when empty/unknown
  status: KeyBoardStatus;
}

// Board layout as given by the shop. B1 holds a key we have not identified yet;
// F1 is empty. C088, CO10 and LRD-1D/LD1 are on the board but are not (yet) in the
// digital key inventory, so their per-key badge will not appear until a matching
// model exists; they still show on the board map.
export const KEY_BOARD: KeyBoardSlot[] = [
  { slot: 'A1', label: '01122BE', models: ['01122BE'], status: 'occupied' },
  { slot: 'B1', label: 'Not identified', models: [], status: 'unknown' },
  { slot: 'C1', label: 'C088', models: ['C088'], status: 'occupied' },
  { slot: 'D1', label: 'CO10', models: ['CO10'], status: 'occupied' },
  { slot: 'F1', label: 'Empty', models: [], status: 'empty' },
  { slot: 'G1', label: 'CLB2', models: ['CLB2'], status: 'occupied' },
  { slot: 'H1', label: 'HR1 (Brass)', models: ['HR1 (Brass)', 'HR1'], status: 'occupied' },
  { slot: 'I1', label: 'HR1 (Nickel-Plated)', models: ['HR1 (Nickel-Plated)', 'HR1'], status: 'occupied' },
  { slot: 'J1', label: 'IN33', models: ['IN33'], status: 'occupied' },
  { slot: 'K1', label: 'LRD-1D / LD1', models: ['LRD-1D', 'LD1'], status: 'occupied' },
];

export const normModel = (model: string): string => model.trim().toLowerCase();

// Model -> slot, derived from KEY_BOARD. A model found in more than one slot
// (HR1 lives in both H1 and I1) resolves to all of them, joined with " / ".
export const KEY_LOCATIONS: Record<string, string> = (() => {
  const bySlot: Record<string, string[]> = {};
  for (const s of KEY_BOARD) {
    for (const m of s.models) {
      const k = normModel(m);
      (bySlot[k] ||= []).push(s.slot);
    }
  }
  const out: Record<string, string> = {};
  for (const k of Object.keys(bySlot)) out[k] = bySlot[k].join(' / ');
  return out;
})();

// Resolve a key's board location: a staff-set cut code on the item wins, then the
// board map. Returns null when neither is known.
export function lookupKeyLocation(item: { model: string; cutCode?: string }): string | null {
  if (item.cutCode && item.cutCode.trim()) return item.cutCode.trim();
  return KEY_LOCATIONS[normModel(item.model)] ?? null;
}
