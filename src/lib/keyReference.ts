// Reference help for a key blank: what it is, what it fits, its keyway, and the
// manufacturer cross-references (Ilco / Cole / Curtis / Silca / JMA equivalents)
// a clerk can cut instead. This is reference data only, never price or stock.
//
// One Firestore document per blank in the `keyReference` collection, keyed by the
// normalized code (the same normCode used for the board and inventory matching,
// so "Ilco 01122BE" and "01122BE" resolve to the same reference). The data was
// built by cross-checking two independent deep-research passes (ChatGPT + Gemini)
// against a third (our own), keeping only what agreed and flagging the rest for a
// human. See scripts/mergeKeyResearch.mjs and docs/ui-rehaul/key-research-prompts.md.
//
// The single rule that matters: a wrong equivalent is a miscut key. When the
// passes disagreed or nothing was found, the row is marked needsReview and carries
// no confident equivalent, rather than guessing.

import { getCollection } from '@/lib/firestore';
import { normCode } from '@/lib/keyBoard';

export const KEY_REFERENCE_COLLECTION = 'keyReference';

export type RefConfidence = 'high' | 'medium' | 'low';

export interface KeyEquivalent {
  brand: string; // "Ilco", "Silca", "JMA", "Cole", "Curtis"
  ref: string; // the equivalent blank number, e.g. "1145"
  confidence: RefConfidence;
  source?: string; // URL or catalog name backing this cross-reference
}

export interface KeyReference {
  code: string; // doc id, normalized ("SC1", "01122BE")
  displayNames?: string; // how the shop wrote it, verbatim
  identified: boolean; // false when the passes could not say what it is
  brandSystem?: string; // the lock/blank system ("Schlage", "Kwikset", "Ilco")
  fits?: string; // plain description of the locks it fits
  category?: string; // residential | commercial | padlock | mailbox | automotive | cabinet/furniture | unknown
  keyway?: string; // the keyway name ("Schlage C")
  keywayFamily?: string; // the blank family ("SC1/SC4 (Schlage C)")
  interchangeableKeyways?: string[]; // blanks that physically enter the same lock
  equivalents?: KeyEquivalent[]; // sourced cross-references, highest confidence first
  explanation?: string; // 1-2 sentences a clerk can read out
  cautions?: string; // restricted / high-security / look-alike warnings
  confidence?: RefConfidence; // overall, from how much the passes agreed
  sources?: string[]; // URLs / catalogs used
  notes?: string; // anything a human should confirm
  needsReview?: boolean; // passes disagreed, or only one identified it
  agreement?: number; // how many of the research passes identified this blank (0-3)
  updatedAt?: string;
}

// code (normalized) -> reference. Built once from the collection and reused for
// every lookup on a card, the same shape as the board's location index.
export function buildReferenceIndex(refs: KeyReference[]): Map<string, KeyReference> {
  const idx = new Map<string, KeyReference>();
  for (const r of refs) {
    const key = normCode(r.code);
    if (key) idx.set(key, r);
  }
  return idx;
}

// The reference for a model string, or null when we have none. Matches on the
// normalized code so a brand-prefixed model ("Ilco 01122BE") still resolves.
export function referenceFor(model: string, index: Map<string, KeyReference>): KeyReference | null {
  return index.get(normCode(model)) ?? null;
}

// Load the whole reference table. Small (a few hundred rows) and read rarely, so a
// full read is fine; callers cache it per lookup.
export async function getKeyReferences(): Promise<KeyReference[]> {
  return getCollection<KeyReference>(KEY_REFERENCE_COLLECTION);
}

// True when a reference carries something worth showing (more than a bare
// "unidentified" shell). Keeps the card from opening an empty help panel.
export function hasReferenceContent(ref: KeyReference | null | undefined): boolean {
  if (!ref) return false;
  return Boolean(
    (ref.explanation && ref.explanation.trim()) ||
      (ref.fits && ref.fits.trim()) ||
      (ref.keyway && ref.keyway.trim()) ||
      (ref.equivalents && ref.equivalents.length > 0) ||
      (ref.cautions && ref.cautions.trim()),
  );
}

// A one-line summary for the chat message ("Schlage C keyway; cuts as Ilco 1145,
// Silca SC1."). Kept short; the full detail lives on the card.
export function referenceSummary(ref: KeyReference | null | undefined): string {
  if (!hasReferenceContent(ref)) return '';
  const parts: string[] = [];
  if (ref!.keyway) parts.push(`${ref!.keyway} keyway`);
  const eq = (ref!.equivalents ?? []).slice(0, 3).map((e) => `${e.brand} ${e.ref}`.trim());
  if (eq.length) parts.push(`cuts as ${eq.join(', ')}`);
  return parts.join('; ') + (parts.length ? '.' : '');
}
