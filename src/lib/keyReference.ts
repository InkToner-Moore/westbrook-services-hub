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

import { cleanInventoryQuery, extractKeyMake, matchesKeyMake } from '@/ai/extract';
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
    const key = normCode(r.code).replace(/[\s-]+/g, '');
    if (key) idx.set(key, r);
    for (const equivalent of r.equivalents ?? []) {
      const code = normCode(equivalent.ref).replace(/[\s-]+/g, '');
      // A direct reference takes precedence over another blank's equivalent.
      if (code && !idx.has(code)) idx.set(code, r);
    }
  }
  for (const r of refs) {
    const code = normCode(r.code).replace(/[\s-]+/g, '');
    if (code) idx.set(code, r);
  }
  return idx;
}

// The reference for a model string, or null when we have none. Matches on the
// normalized code so a brand-prefixed model ("Ilco 01122BE") still resolves.
export function referenceFor(model: string, index: Map<string, KeyReference>): KeyReference | null {
  return index.get(normCode(model).replace(/[\s-]+/g, '')) ?? null;
}

// Share one collection read, including concurrent lookups, for this session.
// Failed reads are not cached so reconnecting can recover reference help.
let referenceLoad: Promise<KeyReference[]> | null = null;
export async function getKeyReferences(): Promise<KeyReference[]> {
  if (!referenceLoad) {
    referenceLoad = getCollection<KeyReference>(KEY_REFERENCE_COLLECTION).catch((error) => {
      referenceLoad = null;
      throw error;
    });
  }
  return referenceLoad;
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

interface SearchableInventory {
  model?: string;
  cutCode?: string;
  brand?: string;
  cartridge?: string;
  notes?: string;
  priceNote?: string;
  inStock?: boolean;
}

const searchWords = (text: string): string[] =>
  text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

// Pure relevance gate: notes never admit a row, even for an uncleaned question.
// Reference equivalence is indexed once rather than scanned for every row.
export function rankInventory<T extends SearchableInventory>(
  rows: T[], references: KeyReference[], query: string,
): T[] {
  const cleaned = cleanInventoryQuery(query);
  const tokens = searchWords(cleaned);
  if (!tokens.length) return [];
  const make = extractKeyMake(cleaned);
  const codeKey = (code: string) => normCode(code).replace(/[\s-]+/g, '');
  const refIndex = new Map<string, KeyReference[]>();
  for (const ref of references) {
    for (const code of [ref.code, ...(ref.equivalents ?? []).map((eq) => eq.ref)]) {
      const key = codeKey(code);
      if (key) refIndex.set(key, [...(refIndex.get(key) ?? []), ref]);
    }
  }
  const compact = (text: string) => normCode(text).toLowerCase().replace(/[\s-]+/g, '');
  const queryCode = compact(cleaned);
  const confidence = { high: 3, medium: 2, low: 1 };
  return rows.map((row) => {
    const primary = row.model ?? [row.brand, row.cartridge].filter(Boolean).join(' ');
    const identities = [primary, row.cutCode ?? ''].filter(Boolean);
    const words = identities.flatMap(searchWords);
    const exact = identities.some((identity) => compact(identity) === queryCode);
    const whole = tokens.filter((token) => words.includes(token)).length;
    const prefix = tokens.filter((token) => words.some((word) => word.startsWith(token))).length;
    // Any fit reference can qualify an equivalent, even when its own direct
    // reference is an unidentified shell.
    const rowRefs = [
      ...(refIndex.get(codeKey(primary)) ?? []),
      ...(refIndex.get(codeKey(row.cutCode ?? '')) ?? []),
    ];
    const fitRefs = rowRefs.filter((ref) =>
      make && matchesKeyMake([ref.fits, ref.brandSystem].filter(Boolean).join(' '), make),
    );
    const refMake = fitRefs.length > 0;
    const refText = fitRefs.map((ref) => ref.fits ?? '').join(' ');
    const ownMake = Boolean(make && matchesKeyMake(primary, make));
    // With a make present, a generic model token cannot admit another make.
    const qualified = make ? exact || refMake || ownMake : exact || whole > 0 || prefix > 0;
    const detailTokens = tokens.filter((token) => !make || !matchesKeyMake(token, make));
    const refWords = searchWords(refText);
    const modelDetail = refMake
      ? detailTokens.filter((token) => refWords.includes(token)).length : 0;
    const refConfidence = Math.max(0, ...fitRefs.map((ref) =>
      confidence[ref.confidence ?? 'low'],
    ));
    const notes = searchWords(row.notes ?? row.priceNote ?? '');
    const noteHits = tokens.filter((token) => notes.includes(token)).length;
    return {
      row, qualified,
      order: [
        Number(exact), Number(refMake), modelDetail,
        refConfidence,
        Number(ownMake), whole, prefix, Number(row.inStock === true), noteHits,
      ],
    };
  }).filter((match) => match.qualified).sort((a, b) => {
    for (let i = 0; i < a.order.length; i += 1) {
      const difference = b.order[i] - a.order[i];
      if (difference) return difference;
    }
    return 0;
  }).map((match) => match.row);
}

export function inventoryEmptyMessage(query: string, references: KeyReference[] = []): string {
  const cleaned = cleanInventoryQuery(query);
  const make = extractKeyMake(cleaned);
  if (!make) return `I could not find "${cleaned}" in the key or refill inventory.`;
  const codes = [...new Set(references.filter((ref) =>
    ref.confidence === 'high' && !ref.needsReview &&
    matchesKeyMake(ref.fits ?? '', make),
  ).map((ref) => ref.code))].slice(0, 2);
  const hint = codes.length ? ` ${make} usually takes ${codes.join(' or ')}.` : '';
  return `No ${make} keys on file.${hint}`;
}
