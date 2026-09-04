// Quick-action pills for the composer. Two groups, no nested menus:
//  - Tracking: FedEx / Purolator / UPS, visually grouped. Hovering one reveals a
//    small field; type a tracking number and press Enter to track immediately.
//    Clicking the pill instead drops a courier chip into the prompt.
//  - Actions: Receipt / Refill / Purchase / Note / Inventory drop a colored chip.
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

  const pill = `rounded-full border px-2.5 py-1 text-xs font-medium transition-colors`;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {/* Tracking group */}
      <div
        className={`flex items-center gap-1 rounded-full border px-1 py-0.5 ${
          isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <span className={`px-1.5 text-[10px] font-semibold uppercase tracking-wide ${themeClasses.text.muted}`}>
          Track
        </span>
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
            <button
              type="button"
              onClick={() => onAddChip(TRACK_CHIP_SPECS[t.kind])}
              className={`${pill} ${
                isDarkMode ? 'border-indigo-700 bg-indigo-900/40 text-indigo-200' : 'border-indigo-300 bg-indigo-50 text-indigo-800'
              }`}
            >
              {t.label}
            </button>
            {hovered === t.courier && (
              <div
                className={`absolute bottom-full left-0 z-10 mb-1 w-52 rounded-xl border p-1.5 shadow-lg ${themeClasses.card.primary}`}
              >
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
      </div>

      {/* Packing group: fixed-price supplies added straight to the receipt. */}
      <div
        className={`flex items-center gap-1 rounded-full border px-1 py-0.5 ${
          isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <span className={`px-1.5 text-[10px] font-semibold uppercase tracking-wide ${themeClasses.text.muted}`}>
          Pack
        </span>
        {PACKING_PRESETS.filter((p) => !p.custom).map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => onAddPacking(p)}
            className={`${pill} ${
              isDarkMode ? 'border-teal-700 bg-teal-900/40 text-teal-200' : 'border-teal-300 bg-teal-50 text-teal-800'
            }`}
          >
            {p.type} ${p.cost}
          </button>
        ))}
      </div>

      {/* Action group */}
      {ACTION_CHIPS.map((spec) => (
        <button
          key={spec.kind}
          type="button"
          onClick={() => onAddChip(spec)}
          className={`${pill} ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200' : spec.tone}`}
        >
          {spec.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
