// A visual map of the physical key board: every slot with the blank it holds, and
// the spots that are empty or not yet identified. Reads KEY_BOARD (the single
// source of truth in lib/keyLocations). Clicking an occupied slot calls onSelect
// with its key model, so the Inventory page can search it. Read-only for now;
// editing the board is a later feature.
import React from 'react';
import { KeyRound, MapPin, HelpCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { KEY_BOARD, type KeyBoardStatus } from '@/lib/keyLocations';

interface Props {
  onSelect?: (model: string) => void;
}

export const KeyBoardMap: React.FC<Props> = ({ onSelect }) => {
  const { themeClasses, isDarkMode } = useTheme();

  const cellBase = 'flex flex-col gap-1 rounded-lg border p-3 text-left transition-all duration-200';
  const styleFor = (status: KeyBoardStatus): string => {
    if (status === 'empty') {
      return isDarkMode
        ? 'border-dashed border-slate-700 bg-slate-900/30'
        : 'border-dashed border-slate-300 bg-slate-50';
    }
    if (status === 'unknown') {
      return isDarkMode
        ? 'border-amber-800/50 bg-amber-900/15'
        : 'border-amber-200 bg-amber-50';
    }
    return isDarkMode
      ? 'border-slate-700 bg-slate-800/50 hover:border-orange-500/60 hover:bg-slate-800'
      : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50';
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-orange-500" />
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Key board</span>
        <span className={`text-xs ${themeClasses.text.muted}`}>where each blank lives, and which spots are free</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KEY_BOARD.map((s) => {
          const occupied = s.status === 'occupied';
          const clickable = occupied && !!onSelect;
          return (
            <button
              key={s.slot}
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onSelect!(s.models[0]) : undefined}
              className={`${cellBase} ${styleFor(s.status)} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-[11px] font-mono font-bold tracking-wide ${themeClasses.text.muted}`}>{s.slot}</span>
              <span className="flex items-center gap-1.5">
                {s.status === 'occupied' && <KeyRound className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                {s.status === 'empty' && <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-current opacity-40" />}
                {s.status === 'unknown' && <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                <span
                  className={
                    s.status === 'occupied'
                      ? `text-sm font-semibold ${themeClasses.text.primary}`
                      : `text-sm italic ${themeClasses.text.muted}`
                  }
                >
                  {s.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KeyBoardMap;
