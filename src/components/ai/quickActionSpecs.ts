// Chip specs for the composer quick actions. Kept in a data-only module so the
// component files export only components (clean fast-refresh).
import type { ComposerChip } from '@/ai/types';

export interface ChipSpec {
  kind: ComposerChip['kind'] | 'ship' | 'keys';
  label: string;
  // Keyword prepended to the prompt so the parser routes correctly.
  keyword: string;
  // Tailwind classes for the colored pill fill (used only for a primed chip
  // sitting above the input, where a full fill reads as "active").
  tone: string;
}

export const ACTION_CHIPS: ChipSpec[] = [
  { kind: 'ship', label: 'Ship', keyword: 'ship', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
  { kind: 'keys', label: 'Keys', keyword: 'key cutting', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
  { kind: 'refill', label: 'Refill', keyword: 'refill', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
  { kind: 'receipt', label: 'Sale', keyword: 'receipt', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
  { kind: 'note', label: 'Note', keyword: 'note', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
  { kind: 'inventory', label: 'Stock', keyword: 'where is', tone: 'bg-pub-sunk text-pub-ink border-pub-edge' },
];

const TRACK_TONE = 'bg-pub-sunk text-pub-ink border-pub-edge';
export const TRACK_CHIP_SPECS: Record<string, ChipSpec> = {
  'track-fedex': { kind: 'track-fedex', label: 'FedEx', keyword: 'fedex', tone: TRACK_TONE },
  'track-purolator': { kind: 'track-purolator', label: 'Purolator', keyword: 'purolator', tone: TRACK_TONE },
  'track-ups': { kind: 'track-ups', label: 'UPS', keyword: 'ups', tone: TRACK_TONE },
};
