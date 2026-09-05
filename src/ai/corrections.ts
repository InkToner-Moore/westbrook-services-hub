// A tiny local log of routing corrections: every time a staff member re-routes a
// misrouted utterance, that is a labeled example of what the router got wrong. We
// only capture it (capped, in localStorage) so the signal exists. Nothing reads it
// yet; it is the fuel for a future offline improvement (e.g. an on-device
// nearest-neighbour example bank), and it never leaves the browser.
const KEY = 'ai-corrections';
const CAP = 200;

export interface Correction {
  utterance: string;
  from: string; // the action the router proposed
  to: string; // the action the user chose instead
  ts: number;
}

export function logCorrection(entry: Omit<Correction, 'ts'>): void {
  if (!entry.utterance || entry.from === entry.to) return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: Correction[] = raw ? JSON.parse(raw) : [];
    list.push({ ...entry, ts: Date.now() });
    while (list.length > CAP) list.shift();
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable; corrections are best-effort telemetry, so drop it.
  }
}

export function readCorrections(): Correction[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
