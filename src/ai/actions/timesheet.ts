// Timesheet actions over chat. The single `timesheet` AiAction fans into four
// internal ops carried on intent.fields.op (set by the deterministic router):
//   punch_in      clock an employee in            (immediate)
//   punch_out     clock an employee out           (immediate)
//   view          today's punches / one person's hours (immediate)
//   add_employee  add a new employee              (confirmable: has a field spec)
//
// Every op emits a `timesheet` artifact with a discriminated `state` so
// TimesheetCard renders a purpose-built card per outcome. Reuses the shared
// Firestore helpers and the lib/timesheet data model, so anything punched here
// shows up on the Timesheet page unchanged. See docs/ui-rehaul/PHASE-2.md item 6.
import {
  generateEmployeeId,
  generateTimeEntryId,
  getCollection,
  setDocument,
  updateDocument,
} from '@/lib/firestore';
import {
  EMPLOYEES_COLLECTION,
  TIME_ENTRIES_COLLECTION,
  findEmployeeByName,
  formatDuration,
  isOpen,
  isTodayEntry,
  type Employee,
  type TimeEntry,
} from '@/lib/timesheet';
import type { Intent } from '../types';
import type { ActionResult } from './types';

// What a 'timesheet' artifact carries. TimesheetCard switches on `state` and
// renders a bespoke card for each; the page and card format durations from the
// raw entries using lib/timesheet helpers, so nothing is precomputed here.
export type TimesheetArtifactData =
  | { state: 'punched_in'; employeeName: string; entry: TimeEntry; already: boolean }
  | { state: 'punched_out'; employeeName: string; entry: TimeEntry }
  | { state: 'employee_added'; employee: Employee; existed: boolean }
  | {
      state: 'summary';
      scope: 'today' | 'employee';
      title: string;
      employeeName?: string;
      entries: TimeEntry[];
      openCount: number;
    }
  | { state: 'not_found'; query: string; hint: string };

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function nowIso(): string {
  return new Date().toISOString();
}

// Newest-first, matching how the collections were created.
async function loadEmployees(): Promise<Employee[]> {
  return getCollection<Employee>(EMPLOYEES_COLLECTION, 'createdAt');
}
async function loadEntries(): Promise<TimeEntry[]> {
  return getCollection<TimeEntry>(TIME_ENTRIES_COLLECTION, 'createdAt');
}

// Add an employee. If the name already exists (case-insensitive), reuse it and
// reactivate if needed rather than creating a duplicate.
async function addEmployee(name: string): Promise<ActionResult> {
  if (!name) {
    return { message: 'Who should I add? Tell me the employee name, like "add employee Sarah Chen".' };
  }
  const employees = await loadEmployees();
  const existing = employees.find((e) => e.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) {
    if (!existing.active) {
      await updateDocument(EMPLOYEES_COLLECTION, existing.id, { active: true });
    }
    const reactivated: Employee = { ...existing, active: true };
    return {
      message: `${existing.name} is already on the team${existing.active ? '' : ', reactivated'}.`,
      artifact: {
        kind: 'timesheet',
        title: 'Employee',
        data: { state: 'employee_added', employee: reactivated, existed: true } satisfies TimesheetArtifactData,
      },
    };
  }
  const employee: Employee = {
    id: generateEmployeeId(),
    name,
    active: true,
    createdAt: nowIso(),
  };
  await setDocument(EMPLOYEES_COLLECTION, employee.id, employee);
  return {
    message: `Added ${employee.name} to the team.`,
    artifact: {
      kind: 'timesheet',
      title: 'Employee added',
      data: { state: 'employee_added', employee, existed: false } satisfies TimesheetArtifactData,
    },
  };
}

function notFound(query: string): ActionResult {
  return {
    message: query
      ? `I could not find an employee named "${query}". Add them first, then punch the clock.`
      : 'Which employee? Say a name, like "clock in Sarah".',
    artifact: {
      kind: 'timesheet',
      title: 'Employee not found',
      data: {
        state: 'not_found',
        query,
        hint: 'Add the employee on the Timesheet page or say "add employee <name>".',
      } satisfies TimesheetArtifactData,
    },
  };
}

async function punchIn(name: string): Promise<ActionResult> {
  const employees = await loadEmployees();
  const employee = findEmployeeByName(employees, name);
  if (!employee) return notFound(name);

  const entries = await loadEntries();
  const open = entries.find((e) => e.employeeId === employee.id && isOpen(e));
  if (open) {
    return {
      message: `${employee.name} is already clocked in.`,
      artifact: {
        kind: 'timesheet',
        title: 'Already clocked in',
        data: { state: 'punched_in', employeeName: employee.name, entry: open, already: true } satisfies TimesheetArtifactData,
      },
    };
  }

  const entry: TimeEntry = {
    id: generateTimeEntryId(),
    employeeId: employee.id,
    employeeName: employee.name,
    clockIn: nowIso(),
    clockOut: null,
    createdAt: nowIso(),
  };
  await setDocument(TIME_ENTRIES_COLLECTION, entry.id, entry);
  return {
    message: `${employee.name} is clocked in.`,
    artifact: {
      kind: 'timesheet',
      title: 'Clocked in',
      data: { state: 'punched_in', employeeName: employee.name, entry, already: false } satisfies TimesheetArtifactData,
    },
  };
}

async function punchOut(name: string): Promise<ActionResult> {
  const employees = await loadEmployees();
  const employee = findEmployeeByName(employees, name);
  if (!employee) return notFound(name);

  const entries = await loadEntries();
  const open = entries.find((e) => e.employeeId === employee.id && isOpen(e));
  if (!open) {
    return {
      message: `${employee.name} is not clocked in right now.`,
      artifact: {
        kind: 'timesheet',
        title: `${employee.name}'s hours`,
        data: {
          state: 'summary',
          scope: 'employee',
          title: `${employee.name}'s hours`,
          employeeName: employee.name,
          entries: entries.filter((e) => e.employeeId === employee.id),
          openCount: 0,
        } satisfies TimesheetArtifactData,
      },
    };
  }

  const clockOut = nowIso();
  await updateDocument(TIME_ENTRIES_COLLECTION, open.id, { clockOut });
  const entry: TimeEntry = { ...open, clockOut };
  const dur = formatDuration(new Date(clockOut).getTime() - new Date(open.clockIn).getTime());
  return {
    message: `${employee.name} is clocked out. ${dur} on the clock.`,
    artifact: {
      kind: 'timesheet',
      title: 'Clocked out',
      data: { state: 'punched_out', employeeName: employee.name, entry } satisfies TimesheetArtifactData,
    },
  };
}

// A read view: one employee's hours when a name is given, else today's punches.
async function viewSummary(name: string): Promise<ActionResult> {
  const [employees, entries] = await Promise.all([loadEmployees(), loadEntries()]);

  if (name) {
    const employee = findEmployeeByName(employees, name);
    if (!employee) return notFound(name);
    const mine = entries.filter((e) => e.employeeId === employee.id);
    const openCount = mine.filter(isOpen).length;
    return {
      message: openCount
        ? `${employee.name} is on the clock now, ${mine.length} ${mine.length === 1 ? 'entry' : 'entries'} total.`
        : `${employee.name} has ${mine.length} ${mine.length === 1 ? 'entry' : 'entries'}.`,
      artifact: {
        kind: 'timesheet',
        title: `${employee.name}'s hours`,
        data: {
          state: 'summary',
          scope: 'employee',
          title: `${employee.name}'s hours`,
          employeeName: employee.name,
          entries: mine,
          openCount,
        } satisfies TimesheetArtifactData,
      },
    };
  }

  const today = entries.filter((e) => isTodayEntry(e));
  const openCount = today.filter(isOpen).length;
  return {
    message: today.length
      ? `${today.length} ${today.length === 1 ? 'punch' : 'punches'} today, ${openCount} still on the clock.`
      : 'No punches yet today.',
    artifact: {
      kind: 'timesheet',
      title: "Today's punches",
      data: {
        state: 'summary',
        scope: 'today',
        title: "Today's punches",
        entries: today,
        openCount,
      } satisfies TimesheetArtifactData,
    },
  };
}

export async function executeTimesheet(intent: Intent): Promise<ActionResult> {
  const op = str(intent, 'op') || 'view';
  const name = str(intent, 'employeeName');
  try {
    switch (op) {
      case 'add_employee':
        return await addEmployee(name);
      case 'punch_in':
        return await punchIn(name);
      case 'punch_out':
        return await punchOut(name);
      case 'view':
      default:
        return await viewSummary(name);
    }
  } catch {
    return { message: 'I could not reach the timesheet just now. Please try again.' };
  }
}
