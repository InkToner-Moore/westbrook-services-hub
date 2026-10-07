// A shift's time span, shown the same way everywhere: when the actual start or
// end differs from the plan, the planned time is struck through and the actual
// one sits beside it ("4:00 PM to 7:00 PM 8:00 PM"), and a break is named after.
import React from 'react';
import {
  breakMinutesOf,
  endChanged,
  formatTime12,
  startChanged,
  workedEnd,
  workedStart,
  type ScheduleShift,
} from '@/lib/schedule';

type Times = Pick<ScheduleShift, 'start' | 'end' | 'actualStart' | 'actualEnd' | 'breakMinutes'>;

// '17:30' as '5:30p', '10:00' as '10a': the short form for a narrow calendar block.
function shortTime(hhmm: string): string {
  const [h, m] = formatTime12(hhmm).replace(/\s?(AM|PM)$/, '').split(':');
  const suffix = /PM$/.test(formatTime12(hhmm)) ? 'p' : 'a';
  return `${h}${m && m !== '00' ? `:${m}` : ''}${suffix}`;
}

const One: React.FC<{ planned: string; actual: string; changed: boolean; fmt: (t: string) => string }> = ({
  planned,
  actual,
  changed,
  fmt,
}) =>
  changed ? (
    <>
      <s className="opacity-55" aria-label={`planned ${formatTime12(planned)}`}>
        {fmt(planned)}
      </s>{' '}
      <span className="font-semibold">{fmt(actual)}</span>
    </>
  ) : (
    <>{fmt(planned)}</>
  );

export const ShiftTimes: React.FC<{ shift: Times; showBreak?: boolean; compact?: boolean; className?: string }> = ({
  shift,
  showBreak = true,
  compact = false,
  className = '',
}) => {
  const brk = breakMinutesOf(shift);
  const fmt = compact ? shortTime : formatTime12;
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      <One planned={shift.start} actual={workedStart(shift)} changed={startChanged(shift)} fmt={fmt} />
      {compact ? ' - ' : ' to '}
      <One planned={shift.end} actual={workedEnd(shift)} changed={endChanged(shift)} fmt={fmt} />
      {showBreak && brk > 0 && <span className="opacity-75">{compact ? ` · ${brk}m break` : `, ${brk} min break`}</span>}
    </span>
  );
};

export default ShiftTimes;
