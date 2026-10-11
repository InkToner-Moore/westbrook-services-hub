// Timesheet actions over chat. The single `timesheet` AiAction fans into ops
// carried on intent.fields.op (set by the deterministic router):
//   add_shift     plan a shift, or the same shift on several days  (manager; slip)
//   adjust_shift  log actual start / end and break on a shift      (any staff; slip)
//   add_employee  add a new employee                               (slip)
//   view          today's shifts, or one person's week             (immediate)
//   punch_off     a punch phrase: the punch clock is switched off  (immediate)
//
// Hours come from the schedule: a planned shift, corrected with the actual times
// and break when they differ. Every op emits a `timesheet` artifact with a
// discriminated `state` so TimesheetCard renders a purpose-built card per
// outcome. Reuses the shared Firestore helpers and the lib/schedule model, so
// anything written here shows up on the Timesheet page unchanged.
import {
  generateEmployeeId,
  generateShiftId,
  getCollection,
  setDocument,
  updateDocument,
} from '@/lib/firestore';
import { EMPLOYEES_COLLECTION, findEmployeeByName, type Employee } from '@/lib/timesheet';
import {
  SCHEDULE_COLLECTION,
  addDays,
  breakMinutesOf,
  formatDayHeading,
  formatShiftDuration,
  formatTime12,
  parseHhmm,
  shiftsInRange,
  shiftsOnDay,
  startOfWeek,
  toDateKey,
  totalWorkedMinutes,
  workedEnd,
  workedMinutes,
  workedStart,
  type ScheduleShift,
} from '@/lib/schedule';
import { parseBreakMinutes, parseClockTime, parseDays, parseTimeRange } from '@/lib/shiftParse';
import { managerUnlocked } from '@/lib/managerAuth';
import type { Intent } from '../types';
import type { ActionResult } from './types';

// What a 'timesheet' artifact carries. TimesheetCard switches on `state`.
export type TimesheetArtifactData =
  | { state: 'shifts_added'; employeeName: string; shifts: ScheduleShift[]; skipped: ScheduleShift[] }
  | { state: 'shift_adjusted'; shift: ScheduleShift }
  | { state: 'employee_added'; employee: Employee; existed: boolean }
  | { state: 'summary'; title: string; subtitle?: string; shifts: ScheduleShift[]; showDay: boolean }
  | { state: 'locked'; what: string; intent: Intent }
  | { state: 'notice'; title: string; body: string }
  | { state: 'not_found'; query: string; hint: string };

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function nowIso(): string {
  return new Date().toISOString();
}
const card = (title: string, data: TimesheetArtifactData) => ({ kind: 'timesheet' as const, title, data });

async function loadEmployees(): Promise<Employee[]> {
  return getCollection<Employee>(EMPLOYEES_COLLECTION, 'createdAt');
}
async function loadShifts(): Promise<ScheduleShift[]> {
  return getCollection<ScheduleShift>(SCHEDULE_COLLECTION, 'createdAt');
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
      artifact: card('Employee', { state: 'employee_added', employee: reactivated, existed: true }),
    };
  }
  const employee: Employee = { id: generateEmployeeId(), name, active: true, createdAt: nowIso() };
  await setDocument(EMPLOYEES_COLLECTION, employee.id, employee);
  return {
    message: `Added ${employee.name} to the team.`,
    artifact: card('Employee added', { state: 'employee_added', employee, existed: false }),
  };
}

function notFound(query: string): ActionResult {
  return {
    message: query
      ? `I could not find anyone named "${query}" on the team.`
      : 'Who is this for? Say a name, like "Sue left at 6 today".',
    artifact: card('Employee not found', {
      state: 'not_found',
      query,
      hint: 'Add them on the Timesheet page (Team), or say "add employee <name>".',
    }),
  };
}

// The day a slip's "Day(s)" field names. Blank or "Today" is today.
function daysFrom(text: string): string[] {
  const days = parseDays(text);
  return days.length ? days : /^\s*$|today/i.test(text) ? [toDateKey(new Date())] : [];
}

// Plan one shift per named day. Manager only: the rule on scheduleShifts rejects
// the write otherwise, so a locked session is told to sign in instead.
async function addShifts(intent: Intent): Promise<ActionResult> {
  if (!managerUnlocked()) {
    return {
      message: 'The schedule is locked. A manager needs to sign in before shifts can be added. You can still log actual times or a break on an existing shift.',
      artifact: card('Schedule locked', { state: 'locked', what: 'add shifts', intent }),
    };
  }
  const name = str(intent, 'employeeName');
  const employees = await loadEmployees();
  const employee = findEmployeeByName(employees, name);
  if (!employee) return notFound(name);

  const range = parseTimeRange(`${str(intent, 'start')} to ${str(intent, 'end')}`);
  if (!range) {
    return { message: 'I could not read those times. Try something like "10 to 5:30" or "4pm to 9pm".' };
  }
  const days = daysFrom(str(intent, 'days'));
  if (days.length === 0) {
    return { message: 'Which day or days? Try "Oct 8, 9, 15" or "tomorrow".' };
  }

  const existing = await loadShifts();
  const note = str(intent, 'note');
  const added: ScheduleShift[] = [];
  const skipped: ScheduleShift[] = [];
  for (const date of days) {
    const dupe = existing.find(
      (s) => s.employeeId === employee.id && s.date === date && s.start === range.start && s.end === range.end,
    );
    if (dupe) {
      skipped.push(dupe);
      continue;
    }
    const shift: ScheduleShift = {
      id: generateShiftId(),
      employeeId: employee.id,
      employeeName: employee.name,
      date,
      start: range.start,
      end: range.end,
      note: note || undefined,
      createdAt: nowIso(),
    };
    await setDocument(SCHEDULE_COLLECTION, shift.id, { ...shift, note: note || '' });
    added.push(shift);
  }
  if (!employee.active && added.length > 0) {
    await updateDocument(EMPLOYEES_COLLECTION, employee.id, { active: true });
  }
  const span = `${formatTime12(range.start)} to ${formatTime12(range.end)}`;
  const count = `${added.length} ${added.length === 1 ? 'shift' : 'shifts'}`;
  const message =
    added.length === 0
      ? `${employee.name} already has ${skipped.length === 1 ? 'that shift' : 'those shifts'}. Nothing added.`
      : `Added ${count} for ${employee.name}, ${span}.${skipped.length ? ` ${skipped.length} already there, left alone.` : ''}`;
  return {
    message,
    artifact: card('Shifts added', { state: 'shifts_added', employeeName: employee.name, shifts: added, skipped }),
  };
}

// Log what really happened on a planned shift: a different start or end, and/or
// break minutes. Open to any signed-in staff, locked or not. Only the fields the
// slip carries are written, so a break does not wipe an earlier time change.
async function adjustShift(intent: Intent): Promise<ActionResult> {
  const name = str(intent, 'employeeName');
  const employees = await loadEmployees();
  const employee = findEmployeeByName(employees, name);
  if (!employee) return notFound(name);

  const [date] = daysFrom(str(intent, 'days'));
  if (!date) return { message: 'Which day was that? Try "today", "yesterday" or "Oct 8".' };

  const rawStart = str(intent, 'actualStart');
  const rawEnd = str(intent, 'actualEnd');
  const rawBreak = str(intent, 'breakMinutes');
  if (!rawStart && !rawEnd && !rawBreak) {
    return { message: 'Tell me what changed: when they started, when they left, or how long the break was.' };
  }

  const mine = shiftsOnDay(await loadShifts(), date).filter((s) => s.employeeId === employee.id);
  if (mine.length === 0) {
    return {
      message: `${employee.name} has no shift on ${formatDayHeading(date)}. A manager can add one, then the times can be logged.`,
      artifact: card('No shift that day', {
        state: 'notice',
        title: `No shift for ${employee.name} on ${formatDayHeading(date)}`,
        body: 'Actual times and breaks are logged against a planned shift. Ask a manager to add the shift first.',
      }),
    };
  }
  // With two shifts in a day, take the one whose planned end is nearest the time named.
  const hint = parseHhmm(parseClockTime(rawEnd || rawStart) ?? '') ?? null;
  const shift =
    mine.length === 1 || hint == null
      ? mine[mine.length - 1]
      : mine.reduce((best, s) =>
          Math.abs((parseHhmm(s.end) ?? 0) - hint) < Math.abs((parseHhmm(best.end) ?? 0) - hint) ? s : best,
        );

  const patch: Partial<ScheduleShift> = {};
  if (rawStart) {
    const t = parseClockTime(rawStart, parseHhmm(shift.start));
    if (!t) return { message: `I could not read "${rawStart}" as a time. Try "10:30" or "4pm".` };
    patch.actualStart = t === shift.start ? '' : t;
  }
  if (rawEnd) {
    const t = parseClockTime(rawEnd, parseHhmm(shift.end));
    if (!t) return { message: `I could not read "${rawEnd}" as a time. Try "8" or "7:30pm".` };
    patch.actualEnd = t === shift.end ? '' : t;
  }
  if (rawBreak) {
    const b = parseBreakMinutes(rawBreak);
    if (b == null) return { message: `I could not read "${rawBreak}" as break minutes. Try a number like 30.` };
    patch.breakMinutes = b;
  }
  const next: ScheduleShift = { ...shift, ...patch };
  if ((parseHhmm(workedEnd(next)) ?? 0) <= (parseHhmm(workedStart(next)) ?? 0)) {
    return { message: 'That would put the end before the start. Check the times and try again.' };
  }
  patch.adjustedAt = nowIso();
  await updateDocument(SCHEDULE_COLLECTION, shift.id, patch);
  const updated: ScheduleShift = { ...next, adjustedAt: patch.adjustedAt };

  const bits: string[] = [];
  if (rawStart) bits.push(`started ${formatTime12(workedStart(updated))}`);
  if (rawEnd) bits.push(`left ${formatTime12(workedEnd(updated))}`);
  if (rawBreak) bits.push(`${breakMinutesOf(updated)} min break`);
  return {
    message: `Logged for ${employee.name} on ${formatDayHeading(date)}: ${bits.join(', ')}. That shift now counts ${formatShiftDuration(workedMinutes(updated))}.`,
    artifact: card('Shift updated', { state: 'shift_adjusted', shift: updated }),
  };
}

// A read view: one person's week when a name is given, else one day's shifts
// (today unless a day is named), or the whole week when asked for "this week".
async function viewSchedule(intent: Intent): Promise<ActionResult> {
  const name = str(intent, 'employeeName');
  const [employees, shifts] = await Promise.all([loadEmployees(), loadShifts()]);
  const today = new Date();
  const weekStart = startOfWeek(today);
  const from = toDateKey(weekStart);
  const to = toDateKey(addDays(weekStart, 6));

  if (name) {
    const employee = findEmployeeByName(employees, name);
    if (!employee) return notFound(name);
    const mine = shiftsInRange(shifts, from, to).filter((s) => s.employeeId === employee.id);
    return {
      message: mine.length
        ? `${employee.name} has ${mine.length} ${mine.length === 1 ? 'shift' : 'shifts'} this week, ${formatShiftDuration(totalWorkedMinutes(mine))}.`
        : `${employee.name} has no shifts this week.`,
      artifact: card(`${employee.name}'s week`, {
        state: 'summary',
        title: `${employee.name}'s week`,
        subtitle: 'This week',
        shifts: mine,
        showDay: true,
      }),
    };
  }

  if (intent.fields.week?.value === true) {
    const week = shiftsInRange(shifts, from, to);
    return {
      message: week.length ? `${week.length} ${week.length === 1 ? 'shift' : 'shifts'} on the schedule this week.` : 'Nothing on the schedule this week.',
      artifact: card('This week', { state: 'summary', title: 'This week', shifts: week, showDay: true }),
    };
  }

  const [day] = daysFrom(str(intent, 'days'));
  const key = day ?? toDateKey(today);
  const isToday = key === toDateKey(today);
  const dayShifts = shiftsOnDay(shifts, key);
  const label = isToday ? 'today' : `on ${formatDayHeading(key)}`;
  return {
    message: dayShifts.length
      ? `${dayShifts.map((s) => s.employeeName).join(', ')} ${dayShifts.length === 1 ? 'is' : 'are'} on ${label}.`
      : `No one is scheduled ${label}.`,
    artifact: card(isToday ? "Today's shifts" : formatDayHeading(key), {
      state: 'summary',
      title: isToday ? "Today's shifts" : formatDayHeading(key),
      shifts: dayShifts,
      showDay: false,
    }),
  };
}

export async function executeTimesheet(intent: Intent): Promise<ActionResult> {
  const op = str(intent, 'op') || 'view';
  try {
    switch (op) {
      case 'add_employee':
        return await addEmployee(str(intent, 'employeeName'));
      case 'add_shift':
        return await addShifts(intent);
      case 'adjust_shift':
        return await adjustShift(intent);
      case 'punch_off':
        return {
          message: 'The punch clock is switched off. Hours come from the schedule now: tell me what changed on a shift, like "Sue left at 6 today" or "Parsa took a 30 min break".',
          artifact: card('Punch clock is off', {
            state: 'notice',
            title: 'The punch clock is switched off',
            body: 'Hours are counted from the schedule. If a shift ran differently, log the actual start, end or break on it.',
          }),
        };
      case 'view':
      default:
        return await viewSchedule(intent);
    }
  } catch (err) {
    // A schedule write that fails silently invites a duplicate on retry, so log
    // the real cause even though the counter sees a plain message.
    console.error('[ai] timesheet action failed', err);
    return { message: 'I could not reach the schedule just now. Please try again.' };
  }
}
