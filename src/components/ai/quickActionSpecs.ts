// Chip specs for the composer quick actions. Kept in a data-only module so the
// component files export only components (clean fast-refresh).
import type { ComposerChip } from '@/ai/types';

export interface ChipSpec {
  kind: ComposerChip['kind'];
  label: string;
  // Keyword prepended to the prompt so the parser routes correctly.
  keyword: string;
  // Tailwind classes for the colored pill fill (used only for a primed chip
  // sitting above the input, where a full fill reads as "active").
  tone: string;
  // A single dot colour for the quiet quick-action pill, so the category reads
  // at a glance without a loud fill competing with the input.
  dot: string;
}

export const ACTION_CHIPS: ChipSpec[] = [
  { kind: 'receipt', label: 'Receipt', keyword: 'receipt', tone: 'bg-pub-sunk text-pub-ink border-pub-edge', dot: 'bg-pub-ink' },
  { kind: 'refill', label: 'Refill', keyword: 'refill', tone: 'bg-pub-sunk text-pub-ink border-pub-edge', dot: 'bg-pub-ink' },
  { kind: 'purchase', label: 'Purchase', keyword: 'purchase', tone: 'bg-pub-sunk text-pub-ink border-pub-edge', dot: 'bg-pub-ink' },
  { kind: 'note', label: 'Note', keyword: 'note', tone: 'bg-pub-sunk text-pub-ink border-pub-edge', dot: 'bg-pub-ink' },
  { kind: 'inventory', label: 'Inventory', keyword: 'inventory', tone: 'bg-pub-sunk text-pub-ink border-pub-edge', dot: 'bg-pub-ink' },
];

const TRACK_TONE = 'bg-pub-sunk text-pub-ink border-pub-edge';
export const TRACK_CHIP_SPECS: Record<string, ChipSpec> = {
  'track-fedex': { kind: 'track-fedex', label: 'FedEx', keyword: 'fedex', tone: TRACK_TONE, dot: 'bg-pub-ink' },
  'track-purolator': { kind: 'track-purolator', label: 'Purolator', keyword: 'purolator', tone: TRACK_TONE, dot: 'bg-pub-ink' },
  'track-ups': { kind: 'track-ups', label: 'UPS', keyword: 'ups', tone: TRACK_TONE, dot: 'bg-pub-ink' },
};
