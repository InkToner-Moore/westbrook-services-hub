// Composer shortcuts prime a chip, send a common question, or open counter tools.
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  CalendarClock, ClipboardList, Droplets, Key, Package, PackageSearch,
  Search, ShoppingBag, StickyNote, Truck,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { Courier } from '@/ai/tracking';
import { PACKING_PRESETS, type PackingPreset } from '@/lib/packing';
import { ACTION_CHIPS, TRACK_CHIP_SPECS, type ChipSpec } from './quickActionSpecs';

const ACTION_ICONS = [Truck, Key, Droplets, ShoppingBag, StickyNote, Search];
const COURIERS: Courier[] = ['FedEx', 'Purolator', 'UPS'];
const QUESTIONS = [
  { label: 'Open orders', icon: ClipboardList, text: 'open orders' },
  { label: 'Who is in', icon: CalendarClock, text: 'who is working today' },
];

interface QuickActionsProps {
  onAddChip: (spec: ChipSpec) => void;
  onTrack: (courier: Courier, trackingNumber: string) => void;
  onAddPacking: (preset: PackingPreset) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddChip, onTrack, onAddPacking, onSend, disabled,
}) => {
  const { themeClasses } = useTheme();
  const [openRow, setOpenRow] = useState<'track' | 'packing' | null>(null);
  const [entry, setEntry] = useState('');
  const trackRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const trackId = `${id}-track`;
  const packingId = `${id}-packing`;

  useEffect(() => {
    if (openRow === 'track') inputRef.current?.focus({ preventScroll: true });
  }, [openRow]);

  const closeTrack = () => {
    setOpenRow(null);
    setEntry('');
    trackRef.current?.focus({ preventScroll: true });
  };
  const toggleRow = (row: 'track' | 'packing') => {
    if (openRow === 'track') closeTrack();
    setOpenRow(openRow === row ? null : row);
  };
  const track = (courier: Courier) => {
    const number = entry.trim();
    if (!number) {
      onAddChip(TRACK_CHIP_SPECS[`track-${courier.toLowerCase()}`]);
      return;
    }
    onTrack(courier, number);
    closeTrack();
  };

  const pill = `inline-flex h-11 min-w-0 items-center justify-start gap-2 rounded-full border px-3
    text-[13px] sm:h-10 sm:text-sm transition-colors disabled:opacity-40
    ${themeClasses.interactive.focus}`;
  const quiet = `border-pub-edge bg-pub-paper text-pub-ink ${themeClasses.interactive.hover}`;
  const icon = 'h-4 w-4 shrink-0 text-pub-muted';

  return (
    <div role="group" aria-label="Shortcuts" className="min-w-0 space-y-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && openRow === 'track') {
          event.preventDefault();
          closeTrack();
        }
      }}>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {ACTION_CHIPS.map((spec, index) => {
          const Icon = ACTION_ICONS[index];
          return (
            <button key={spec.kind} type="button" disabled={disabled}
              onClick={() => onAddChip(spec)} className={`${pill} ${quiet}`}>
              <Icon aria-hidden="true" className={icon} />
              {spec.label}
            </button>
          );
        })}
        {QUESTIONS.map(({ label, icon: Icon, text }) => (
          <button key={label} type="button" disabled={disabled}
            onClick={() => onSend(text)} className={`${pill} ${quiet}`}>
            <Icon aria-hidden="true" className={icon} />
            {label}
          </button>
        ))}
        <button ref={trackRef} type="button" disabled={disabled}
          aria-expanded={openRow === 'track'} aria-controls={trackId}
          onClick={() => toggleRow('track')}
          className={`${pill} ${openRow === 'track' ? themeClasses.ink.fill : quiet}`}>
          <PackageSearch aria-hidden="true" className={openRow === 'track' ? 'h-4 w-4 shrink-0' : icon} />
          Track
        </button>
        <button type="button" disabled={disabled}
          aria-expanded={openRow === 'packing'} aria-controls={packingId}
          onClick={() => toggleRow('packing')}
          className={`${pill} ${openRow === 'packing' ? themeClasses.ink.fill : quiet}`}>
          <Package aria-hidden="true" className={openRow === 'packing' ? 'h-4 w-4 shrink-0' : icon} />
          Packing
        </button>
      </div>
      <div id={trackId} hidden={openRow !== 'track'}>
        {openRow === 'track' && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <input ref={inputRef} value={entry} disabled={disabled}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                // Courier selection is explicit in this shared input.
                if (event.key === 'Enter') event.preventDefault();
              }}
              inputMode="text" autoCapitalize="characters"
              placeholder="Tracking number" aria-label="Tracking number"
              className={`h-11 w-full min-w-0 rounded-lg border px-3 text-base outline-none
                sm:h-10 sm:w-52 sm:text-sm ${themeClasses.input}`} />
            {COURIERS.map((courier) => (
              <button key={courier} type="button" disabled={disabled}
                onClick={() => track(courier)} className={`${pill} ${quiet}`}>
                {courier}
              </button>
            ))}
          </div>
        )}
      </div>
      <div id={packingId} hidden={openRow !== 'packing'}>
        {openRow === 'packing' && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {PACKING_PRESETS.filter((preset) => !preset.custom).map((preset) => (
              <button key={preset.type} type="button" disabled={disabled}
                onClick={() => onAddPacking(preset)} className={`${pill} ${quiet}`} title={preset.type}>
                {preset.type.replace(' Box', '').replace('Padded Envelope', 'Padded')}
                <span className="tabular-nums text-pub-muted">${preset.cost}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickActions;
