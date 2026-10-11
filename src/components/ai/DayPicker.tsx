import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toDateKey } from '@/lib/schedule';
import { pickDay, pickedDays, pickedDaysSummary } from './dayPickerValue';

interface DayPickerProps {
  value: string;
  multiple?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
}

function monthOf(key?: string): Date {
  if (!key) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export default function DayPicker({
  value, multiple = false, disabled = false, label, onChange,
}: DayPickerProps) {
  const { themeClasses } = useTheme();
  const days = pickedDays(value, multiple);
  const first = days[0];
  const [month, setMonth] = useState(() => monthOf(first));
  // Follow typed day changes too, without resetting month navigation on a tap
  // that leaves the first selected day unchanged.
  useEffect(() => setMonth(monthOf(first)), [first]);
  const year = month.getFullYear();
  const mo = month.getMonth();
  const count = new Date(year, mo + 1, 0).getDate();
  const today = toDateKey(new Date());
  const focus = themeClasses.interactive.focus;
  const cell = 'flex min-h-11 min-w-11 items-center justify-center rounded-lg border';
  const desktop = 'xl:min-h-[40px] xl:min-w-[40px]';

  return (
    <fieldset disabled={disabled} aria-label={label} className="min-w-0 w-full">
      <div className="flex items-center justify-between text-pub-ink">
        <button type="button" aria-label="Previous month"
          onClick={() => setMonth(new Date(year, mo - 1, 1))}
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${focus}`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" aria-label="Next month"
          onClick={() => setMonth(new Date(year, mo + 1, 1))}
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${focus}`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-pub-muted" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <span key={i} className="py-1">{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7" role="group" aria-label="Pick days">
        {Array.from({ length: month.getDay() }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const date = new Date(year, mo, i + 1);
          const key = toDateKey(date);
          const selected = days.includes(key);
          const color = selected ? themeClasses.ink.fill :
            'border-transparent text-pub-ink hover:bg-pub-sunk';
          const mark = key === today ? 'ring-1 ring-inset ring-pub-accent' : '';
          return (
            <button key={key} type="button" aria-pressed={selected}
              aria-current={key === today ? 'date' : undefined}
              aria-label={date.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              onClick={() => onChange(pickDay(days, key, multiple))}
              className={`${cell} ${desktop} ${focus} ${color} ${mark} text-sm tabular-nums`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-pub-muted">
        <span className="min-w-0 flex-1 break-words" aria-live="polite">
          {pickedDaysSummary(days, value)}
        </span>
        {multiple && days.length > 0 && (
          <button type="button" onClick={() => onChange('')}
            className={`min-h-11 shrink-0 rounded px-1 underline ${focus}`}>
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}
