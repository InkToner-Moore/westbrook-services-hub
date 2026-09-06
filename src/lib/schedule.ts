// Pure model + helpers for the staff schedule (planned shifts), the forward-looking
// counterpart to the timesheet (punched hours). No React, no Firestore access here.
// A shift is one person planned to work a date from `start` to `end` (local wall
// clock). The Timesheet page's Schedule tab reads and writes these. See
// docs/ui-rehaul/PHASE-2.md and lib/timesheet.ts for the sibling model.

// One planned shift. `date` is a local calendar day 'YYYY-MM-DD'; `start`/`end`
// are 'HH:MM' 24-hour wall-clock times. `note` is optional free text ("open",
// "till close", "covering Sam").
export interface ScheduleShift {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // 'YYYY-MM-DD'
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
  note?: string;
  createdAt: string; // ISO
}

export const SCHEDULE_COLLECTION = 'scheduleShifts';

// A local calendar-day key 'YYYY-MM-DD'. Built from local parts (not toISOString)
// so a shift lands on the day the clerk means, regardless of timezone.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a 'YYYY-MM-DD' key to a Date at local midnight.
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Add days to a date, returning a new Date.
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// The Sunday that starts the week containing `date`, at local midnight.
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay()); // getDay: 0 = Sunday
  return d;
}

// The seven date keys of the week starting at `weekStart` (Sunday to Saturday).
export function weekDayKeys(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i)));
}

// Minutes in a shift. Guards a missing/reversed time (returns 0), so a half-typed
// shift never shows a negative or NaN duration. Same-day only; no overnight span.
export function shiftMinutes(shift: Pick<ScheduleShift, 'start' | 'end'>): number {
  const s = parseHhmm(shift.start);
  const e = parseHhmm(shift.end);
  if (s == null || e == null || e <= s) return 0;
  return e - s;
}

// 'HH:MM' to minutes past midnight, or null if malformed.
function parseHhmm(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// '14:30' to a friendly '2:30 PM'. Falls back to the raw string if malformed.
export function formatTime12(hhmm: string): string {
  const mins = parseHhmm(hhmm);
  if (mins == null) return hhmm || '';
  const h24 = Math.floor(mins / 60);
  const min = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

// A short human duration like "6h 30m", "45m", or "0m".
export function formatShiftDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// A day header label like "Mon, Sep 8" from a 'YYYY-MM-DD' key.
export function formatDayHeading(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// A week-range label like "Sep 8 to Sep 14".
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} to ${fmt(end)}`;
}

// Shifts on a given day key, earliest start first.
export function shiftsOnDay(shifts: ScheduleShift[], dayKey: string): ScheduleShift[] {
  return shifts
    .filter((s) => s.date === dayKey)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.employeeName.localeCompare(b.employeeName)));
}
