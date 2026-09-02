// Chip specs for the composer quick actions. Kept in a data-only module so the
// component files export only components (clean fast-refresh).
import type { ComposerChip } from '@/ai/types';

export interface ChipSpec {
  kind: ComposerChip['kind'];
  label: string;
  // Keyword prepended to the prompt so the parser routes correctly.
  keyword: string;
  // Tailwind classes for the colored pill (light mode; dark handled inline).
  tone: string;
}

export const ACTION_CHIPS: ChipSpec[] = [
  { kind: 'receipt', label: 'Receipt', keyword: 'receipt', tone: 'bg-green-100 text-green-800 border-green-300' },
  { kind: 'refill', label: 'Refill', keyword: 'refill', tone: 'bg-purple-100 text-purple-800 border-purple-300' },
  { kind: 'purchase', label: 'Purchase', keyword: 'purchase', tone: 'bg-blue-100 text-blue-800 border-blue-300' },
  { kind: 'note', label: 'Note', keyword: 'note', tone: 'bg-amber-100 text-amber-900 border-amber-300' },
  { kind: 'inventory', label: 'Inventory', keyword: 'inventory', tone: 'bg-rose-100 text-rose-800 border-rose-300' },
];

const TRACK_TONE = 'bg-indigo-100 text-indigo-800 border-indigo-300';
export const TRACK_CHIP_SPECS: Record<string, ChipSpec> = {
  'track-fedex': { kind: 'track-fedex', label: 'FedEx', keyword: 'fedex', tone: TRACK_TONE },
  'track-purolator': { kind: 'track-purolator', label: 'Purolator', keyword: 'purolator', tone: TRACK_TONE },
  'track-ups': { kind: 'track-ups', label: 'UPS', keyword: 'ups', tone: TRACK_TONE },
};
