// Pure timesheet data model + formatting helpers, shared by the Timesheet page,
// the AI Mode executor (src/ai/actions/timesheet.ts), and the artifact card
// (TimesheetCard.tsx). No React, no Firestore access here: this is the one place
// the two Firestore shapes and the duration/CSV math are defined, mirroring how
// lib/cartridges.ts holds the cartridge model. See docs/ui-rehaul/PHASE-2.md item 6.

// An employee who can punch in and out. `active` false hides them from the punch
// clock without deleting their history.
export interface Employee {
  id: string;
  name: string;
  active: boolean;
  createdAt: string; // ISO
}

// One punch pair. `clockOut` null means the employee is still on the clock. `note`
// is optional free text (e.g. "left early").
export interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: string; // ISO
  clockOut: string | null; // ISO or null while open
  note?: string;
  createdAt: string; // ISO
}

export const EMPLOYEES_COLLECTION = 'employees';
export const TIME_ENTRIES_COLLECTION = 'timeEntries';

// Whether an entry is still open (clocked in, not yet out).
export const isOpen = (entry: TimeEntry): boolean => entry.clockOut == null;

// Milliseconds an entry has run. For an open entry, measured to `now` so the punch
// clock can show a live elapsed time. Guards bad dates and a clock-out before the
// clock-in (returns 0 rather than a negative duration).
export function entryMs(entry: TimeEntry, now: number = Date.now()): number {
  const start = new Date(entry.clockIn).getTime();
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : now;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start;
}

// A short human duration like "3h 12m", "45m", or "0m".
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Decimal hours for a slip / CSV, like "3.20".
export function formatHoursDecimal(ms: number): string {
  return (ms / 3600000).toFixed(2);
}

// A local clock time like "2:05 PM". Falls back to the raw string on a bad date.
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// A local day like "Sep 5, 2026". Falls back to the raw string on a bad date.
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Whether an ISO timestamp falls on the same calendar day as `ref` (local time).
export function isSameDay(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

// An entry "belongs to today" when it was clocked in today or is still open.
export function isTodayEntry(entry: TimeEntry, ref: Date = new Date()): boolean {
  if (isOpen(entry)) return true;
  return isSameDay(entry.clockIn, ref);
}

// Sum the durations of a set of entries (open entries measured to `now`).
export function totalMs(entries: TimeEntry[], now: number = Date.now()): number {
  return entries.reduce((sum, e) => sum + entryMs(e, now), 0);
}

// Resolve an employee by a spoken name: exact case-insensitive match first, then a
// first-name / startsWith match, preferring active employees. Returns null on no
// match so a caller can prompt to add the person.
export function findEmployeeByName(employees: Employee[], name: string): Employee | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const active = employees.filter((e) => e.active);
  const pools = [active, employees];
  for (const pool of pools) {
    const exact = pool.find((e) => e.name.trim().toLowerCase() === q);
    if (exact) return exact;
  }
  for (const pool of pools) {
    const starts = pool.find((e) => {
      const n = e.name.trim().toLowerCase();
      return n.startsWith(q) || n.split(/\s+/)[0] === q || n.includes(q);
    });
    if (starts) return starts;
  }
  return null;
}

// Escape one CSV cell: quote when it contains a comma, quote, or newline.
function csvCell(value: unknown): string {
  const v = value == null ? '' : String(value);
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Build the timesheet CSV: employee, date, clock in, clock out, hours. An open
// entry shows "(open)" for clock out and a blank for hours. CRLF line endings so
// Excel opens it cleanly.
export function entriesToCsv(entries: TimeEntry[]): string {
  const header = ['Employee', 'Date', 'Clock in', 'Clock out', 'Hours'];
  const rows = entries.map((e) => [
    e.employeeName,
    formatDay(e.clockIn),
    formatClock(e.clockIn),
    e.clockOut ? formatClock(e.clockOut) : '(open)',
    e.clockOut ? formatHoursDecimal(entryMs(e)) : '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
