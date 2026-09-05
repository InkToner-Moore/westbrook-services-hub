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
  { kind: 'receipt', label: 'Receipt', keyword: 'receipt', tone: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
  { kind: 'refill', label: 'Refill', keyword: 'refill', tone: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  { kind: 'purchase', label: 'Purchase', keyword: 'purchase', tone: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { kind: 'note', label: 'Note', keyword: 'note', tone: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-500' },
  { kind: 'inventory', label: 'Inventory', keyword: 'inventory', tone: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
];

const TRACK_TONE = 'bg-indigo-100 text-indigo-800 border-indigo-300';
export const TRACK_CHIP_SPECS: Record<string, ChipSpec> = {
  'track-fedex': { kind: 'track-fedex', label: 'FedEx', keyword: 'fedex', tone: TRACK_TONE, dot: 'bg-indigo-500' },
  'track-purolator': { kind: 'track-purolator', label: 'Purolator', keyword: 'purolator', tone: TRACK_TONE, dot: 'bg-indigo-500' },
  'track-ups': { kind: 'track-ups', label: 'UPS', keyword: 'ups', tone: TRACK_TONE, dot: 'bg-indigo-500' },
};
