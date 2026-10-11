// Picker values use explicit local date keys so months and years never depend
// on when the executor reads the slip. parseDays is also used by daysFrom.
import { describeDays, parseDays } from '@/lib/shiftParse';

export function pickedDays(value: string, multiple: boolean, ref: Date = new Date()): string[] {
  const days = parseDays(value, ref);
  return multiple ? days.sort() : days.slice(0, 1);
}

export function formatPickedDays(days: string[]): string {
  return [...new Set(days)].sort().join(', ');
}

export function pickDay(days: string[], day: string, multiple: boolean): string {
  if (!multiple) return day;
  const next = days.includes(day) ? days.filter((key) => key !== day) : [...days, day];
  return formatPickedDays(next);
}

export function pickedDaysSummary(days: string[], raw: string): string {
  if (!days.length) return raw.trim() || 'No day picked';
  const labels = describeDays(days).split(', ');
  if (labels.length < 2) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
