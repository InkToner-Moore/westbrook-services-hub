// The team model shared by the Timesheet page and the AI Mode executor
// (src/ai/actions/timesheet.ts). No React, no Firestore access here. Shifts and
// the hours math live in lib/schedule.ts.
//
// The punch clock is switched off: hours are counted from the schedule (a planned
// shift, corrected with the actual times and break when they differ), so the old
// `timeEntries` punch model is gone from the app. The collection name is kept so
// nothing reuses it by accident.

// Someone who can be scheduled. `active` false hides them from the pickers
// without deleting their past shifts.
export interface Employee {
  id: string;
  name: string;
  active: boolean;
  createdAt: string; // ISO
}

export const EMPLOYEES_COLLECTION = 'employees';
export const TIME_ENTRIES_COLLECTION = 'timeEntries'; // retired punch clock, unused

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
