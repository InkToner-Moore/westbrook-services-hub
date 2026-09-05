// Quick-action shortcuts for the composer, kept as one calm row so the text input
// stays the clear focus. Three quiet segments separated by hairlines:
//  - Track: FedEx / Purolator / UPS. Hovering one reveals a small field; type a
//    number and press Enter to track now. Clicking drops a courier chip instead.
//  - Pack: fixed-price packing supplies, added straight to the receipt.
//  - Actions: Receipt / Refill / Purchase / Note / Inventory drop a primed chip.
// Pills are low-weight outlines with a small colour dot, not filled tags, so they
// do not compete with the input above them.
import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ComposerChip } from '@/ai/types';
import type { Courier } from '@/ai/tracking';
import { PACKING_PRESETS, type PackingPreset } from '@/lib/packing';
import { ACTION_CHIPS, TRACK_CHIP_SPECS, type ChipSpec } from './quickActionSpecs';

const TRACKING: Array<{ courier: Courier; kind: ComposerChip['kind']; label: string }> = [
  { courier: 'FedEx', kind: 'track-fedex', label: 'FedEx' },
  { courier: 'Purolator', kind: 'track-purolator', label: 'Purolator' },
  { courier: 'UPS', kind: 'track-ups', label: 'UPS' },
];

interface QuickActionsProps {
  onAddChip: (spec: ChipSpec) => void;
  onTrack: (courier: Courier, trackingNumber: string) => void;
  // Add a packing preset straight onto the receipt cart (no confirmation needed;
  // it is a fixed-price item). Custom entry lives on the classic Packing page.
  onAddPacking: (preset: PackingPreset) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAddChip, onTrack, onAddPacking }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [hovered, setHovered] = useState<Courier | null>(null);
  const [entry, setEntry] = useState('');

  const pill = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] transition-colors ${
    isDarkMode
      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
  }`;
  const groupLabel = `text-[13px] ${themeClasses.text.muted}`;
  const divider = `mx-0.5 h-4 w-px ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
      {/* Track */}
      <span className={groupLabel}>Track</span>
      {TRACKING.map((t) => (
        <div
          key={t.courier}
          className="relative"
          onMouseEnter={() => {
            setHovered(t.courier);
            setEntry('');
          }}
          onMouseLeave={() => setHovered((h) => (h === t.courier ? null : h))}
        >
          <button type="button" onClick={() => onAddChip(TRACK_CHIP_SPECS[t.kind])} className={pill}>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {t.label}
          </button>
          {hovered === t.courier && (
            <div className={`absolute bottom-full left-0 z-10 mb-1 w-52 rounded-xl border p-1.5 shadow-lg ${themeClasses.card.primary}`}>
              <input
                autoFocus
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && entry.trim()) {
                    onTrack(t.courier, entry.trim());
                    setHovered(null);
                    setEntry('');
                  }
                }}
                placeholder={`${t.label} tracking number`}
                className={`w-full rounded-lg border px-2 py-1 text-xs outline-none ${themeClasses.input}`}
              />
            </div>
          )}
        </div>
      ))}

      <span className={divider} />

      {/* Pack: fixed-price supplies added straight to the receipt. */}
      <span className={groupLabel}>Pack</span>
      {PACKING_PRESETS.filter((p) => !p.custom).map((p) => (
        <button key={p.type} type="button" onClick={() => onAddPacking(p)} className={pill}>
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          {p.type} <span className="tabular-nums opacity-70">${p.cost}</span>
        </button>
      ))}

      <span className={divider} />

      {/* Actions */}
      {ACTION_CHIPS.map((spec) => (
        <button key={spec.kind} type="button" onClick={() => onAddChip(spec)} className={pill}>
          <span className={`h-1.5 w-1.5 rounded-full ${spec.dot}`} />
          {spec.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
