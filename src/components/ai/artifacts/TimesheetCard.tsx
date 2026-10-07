// The Timesheet artifact card (kind 'timesheet'). One bespoke card per outcome of
// executeTimesheet (see src/ai/actions/timesheet.ts), all emitted as a `timesheet`
// artifact whose data carries a discriminated `state`:
//   shifts_added   shifts planned from chat, one row per day
//   shift_adjusted actual times / break logged on a shift (planned time struck through)
//   employee_added a new employee added to the team (or "already on the team")
//   summary        a day's shifts or one person's week, with the hours that count
//   locked         adding shifts needs a manager: offers the sign in
//   notice         a plain explanation (no shift that day, punch clock is off)
//   not_found      no employee matched the spoken name
//
// The tool hue is slate (DESIGN-SPEC tool signature colours). Times, durations and
// ids are mono/tabular like a real slip. The summary state offers a CSV export of
// the shown shifts in its foot. Registered via `export function register(reg)`.
import React from 'react';
import { CalendarCheck, CalendarDays, Check, Download, Info, Lock, PencilLine, SearchX, UserPlus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useManagerMode } from '@/contexts/ManagerModeContext';
import {
  formatDayHeading,
  formatHoursDecimal,
  formatShiftDuration,
  isAdjusted,
  shiftMinutes,
  shiftsToCsv,
  totalWorkedMinutes,
  workedMinutes,
  type ScheduleShift,
} from '@/lib/schedule';
import { ShiftTimes } from '@/components/ShiftTimes';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';
import type { TimesheetArtifactData } from '@/ai/actions/timesheet';

// Edge/divider colours matching the DESIGN-SPEC `edge` token, per theme.
const useEdges = () => {
  const { isDarkMode } = useTheme();
  return {
    divide: isDarkMode ? 'divide-[#2a2f3a]' : 'divide-[#e4e1d9]',
    edge: isDarkMode ? 'border-[#2a2f3a]' : 'border-[#e4e1d9]',
  };
};

// Trigger a client-side CSV download without a new dependency.
function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// One ledger row: label left, value right. `mono` sets the value in tabular figures.
const Row: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => {
  const { themeClasses } = useTheme();
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className={`text-[13px] ${themeClasses.text.secondary}`}>{label}</span>
      <span className={`text-right text-sm ${themeClasses.text.primary} ${mono ? 'font-mono tabular-nums' : ''}`}>
        {children}
      </span>
    </div>
  );
};

const CardShell: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const { edge } = useEdges();
  const badge = isDarkMode ? 'bg-slate-500/20 text-slate-200' : 'bg-slate-200 text-slate-700';
  return (
    <div className={`rounded-xl border ${themeClasses.card.primary}`}>
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${edge}`}>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${badge}`}>{icon}</span>
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${themeClasses.text.primary}`}>{title}</div>
          {subtitle && <div className={`text-[13px] ${themeClasses.text.secondary}`}>{subtitle}</div>}
        </div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
};

// --- per-state bodies -------------------------------------------------------

// One shift as a ledger line: the day (or the person) on top, the times below,
// and the hours that count on the right.
const ShiftLine: React.FC<{ shift: ScheduleShift; lead: 'day' | 'name'; muted?: boolean }> = ({ shift, lead, muted }) => {
  const { themeClasses } = useTheme();
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 ${muted ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        <div className={`truncate text-sm ${themeClasses.text.primary}`}>
          {lead === 'day' ? formatDayHeading(shift.date) : shift.employeeName || 'Unknown'}
        </div>
        <div className={`truncate text-[13px] ${themeClasses.text.secondary}`}>
          <ShiftTimes shift={shift} />
        </div>
      </div>
      <span className={`shrink-0 text-sm font-mono tabular-nums ${themeClasses.text.primary}`}>
        {formatShiftDuration(workedMinutes(shift))}
      </span>
    </div>
  );
};

const Total: React.FC<{ minutes: number }> = ({ minutes }) => {
  const { themeClasses } = useTheme();
  const { edge } = useEdges();
  return (
    <div className={`mt-1 flex items-center justify-between border-t pt-2 ${edge}`}>
      <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Total</span>
      <span className={`text-base font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
        {formatShiftDuration(minutes)}
        <span className={`ml-2 text-[13px] font-normal ${themeClasses.text.muted}`}>{formatHoursDecimal(minutes)} h</span>
      </span>
    </div>
  );
};

const ShiftsAddedBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'shifts_added' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  const n = d.shifts.length;
  return (
    <CardShell
      icon={<CalendarCheck className="h-5 w-5" />}
      title={n ? `${n} ${n === 1 ? 'shift' : 'shifts'} added` : 'Nothing to add'}
      subtitle={d.employeeName}
    >
      {n > 0 && (
        <div className={`mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] ${themeClasses.status.success}`}>
          <Check className="h-3.5 w-3.5 shrink-0" />
          On the schedule
        </div>
      )}
      <div className={`divide-y ${divide}`}>
        {d.shifts.map((s) => (
          <ShiftLine key={s.id} shift={s} lead="day" />
        ))}
        {d.skipped.map((s) => (
          <ShiftLine key={s.id} shift={s} lead="day" muted />
        ))}
      </div>
      {d.skipped.length > 0 && (
        <p className={`mt-2 text-[13px] ${themeClasses.text.muted}`}>
          Greyed days already had this shift, so they were left alone.
        </p>
      )}
      {n > 0 && <Total minutes={totalWorkedMinutes(d.shifts)} />}
    </CardShell>
  );
};

const ShiftAdjustedBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'shift_adjusted' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide, edge } = useEdges();
  const s = d.shift;
  const planned = shiftMinutes(s);
  const worked = workedMinutes(s);
  return (
    <CardShell icon={<PencilLine className="h-5 w-5" />} title="Shift updated" subtitle={s.employeeName}>
      <div className={`divide-y ${divide}`}>
        <Row label="Day">{formatDayHeading(s.date)}</Row>
        <Row label="Times">
          <ShiftTimes shift={s} showBreak={false} />
        </Row>
        <Row label="Break" mono>
          {s.breakMinutes ? `${s.breakMinutes} min` : 'None'}
        </Row>
        <Row label="Planned" mono>
          {formatShiftDuration(planned)}
        </Row>
      </div>
      <div className={`mt-1 flex items-center justify-between border-t pt-2 ${edge}`}>
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Counts as</span>
        <span className={`text-base font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
          {formatShiftDuration(worked)}
        </span>
      </div>
      {!isAdjusted(s) && (
        <p className={`mt-3 text-[13px] ${themeClasses.text.muted}`}>Back to the planned times.</p>
      )}
    </CardShell>
  );
};

const LockedBody: React.FC = () => {
  const { themeClasses } = useTheme();
  const { isManager, promptUnlock } = useManagerMode();
  return (
    <CardShell icon={<Lock className="h-5 w-5" />} title={isManager ? 'Schedule unlocked' : 'Schedule locked'}>
      <p className={`text-sm ${themeClasses.text.secondary}`}>
        {isManager
          ? 'You are signed in as manager. Send the shift again and I will add it.'
          : 'Adding shifts needs a manager. Anyone can still log the actual start, end or a break on a shift that is already planned.'}
      </p>
      {!isManager && (
        <button
          type="button"
          onClick={promptUnlock}
          className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.button.primary}`}
        >
          <Lock className="h-4 w-4" />
          Manager sign in
        </button>
      )}
    </CardShell>
  );
};

const NoticeBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'notice' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  return (
    <CardShell icon={<Info className="h-5 w-5" />} title={d.title}>
      <p className={`text-sm ${themeClasses.text.secondary}`}>{d.body}</p>
    </CardShell>
  );
};

const EmployeeAddedBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'employee_added' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  return (
    <CardShell
      icon={<UserPlus className="h-5 w-5" />}
      title={d.existed ? 'Already on the team' : 'Employee added'}
      subtitle={d.employee.name}
    >
      <div className={`mb-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] ${themeClasses.status.success}`}>
        <Check className="h-3.5 w-3.5 shrink-0" />
        {d.existed ? 'Ready to schedule' : 'Added to the team'}
      </div>
      <div className={`divide-y ${divide}`}>
        <Row label="Name">{d.employee.name}</Row>
        <Row label="Status">{d.employee.active ? 'Active' : 'Inactive'}</Row>
        <Row label="Reference" mono>
          {d.employee.id}
        </Row>
      </div>
    </CardShell>
  );
};

const SummaryBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'summary' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  if (d.shifts.length === 0) {
    return (
      <CardShell icon={<CalendarDays className="h-5 w-5" />} title={d.title} subtitle={d.subtitle}>
        <div className="flex flex-col items-center py-8 text-center">
          <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}>
            <CalendarDays className={`h-6 w-6 ${themeClasses.text.muted}`} />
          </span>
          <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>No shifts here</p>
          <p className={`mt-1 text-[13px] ${themeClasses.text.muted}`}>A manager can add shifts from here or the Timesheet page.</p>
        </div>
      </CardShell>
    );
  }
  return (
    <CardShell
      icon={<CalendarDays className="h-5 w-5" />}
      title={d.title}
      subtitle={d.subtitle ?? `${d.shifts.length} ${d.shifts.length === 1 ? 'shift' : 'shifts'}`}
    >
      <div className={`divide-y ${divide}`}>
        {d.shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className={`truncate text-sm ${themeClasses.text.primary}`}>
                {d.showDay ? `${formatDayHeading(s.date)}, ${s.employeeName}` : s.employeeName}
              </div>
              <div className={`truncate text-[13px] ${themeClasses.text.secondary}`}>
                <ShiftTimes shift={s} />
              </div>
            </div>
            <span className={`shrink-0 text-sm font-mono tabular-nums ${themeClasses.text.primary}`}>
              {formatShiftDuration(workedMinutes(s))}
            </span>
          </div>
        ))}
      </div>
      <Total minutes={totalWorkedMinutes(d.shifts)} />
    </CardShell>
  );
};

const NotFoundBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'not_found' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  return (
    <CardShell icon={<SearchX className="h-5 w-5" />} title="Employee not found">
      <div className="flex flex-col items-center py-8 text-center">
        <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}>
          <SearchX className={`h-6 w-6 ${themeClasses.text.muted}`} />
        </span>
        <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>
          No employee named{' '}
          <span className={`${themeClasses.text.primary}`}>{d.query || 'that'}</span>
        </p>
        <p className={`mt-1 text-[13px] ${themeClasses.text.muted}`}>{d.hint}</p>
      </div>
    </CardShell>
  );
};

// --- Body + Foot ------------------------------------------------------------

const TimesheetBody: React.FC<{ data: unknown }> = ({ data }) => {
  const d = data as TimesheetArtifactData;
  switch (d?.state) {
    case 'shifts_added':
      return <ShiftsAddedBody d={d} />;
    case 'shift_adjusted':
      return <ShiftAdjustedBody d={d} />;
    case 'locked':
      return <LockedBody />;
    case 'notice':
      return <NoticeBody d={d} />;
    case 'employee_added':
      return <EmployeeAddedBody d={d} />;
    case 'summary':
      return <SummaryBody d={d} />;
    case 'not_found':
      return <NotFoundBody d={d} />;
    default:
      return null;
  }
};

// The summary state offers a CSV export of the shifts it shows.
const TimesheetFoot: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const d = data as TimesheetArtifactData;
  if (d?.state !== 'summary' || d.shifts.length === 0) return null;
  const base = d.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'shifts';
  return (
    <div className={`flex flex-wrap items-center gap-2 border-t px-4 py-3 ${themeClasses.header}`}>
      <button
        type="button"
        onClick={() => downloadCsv(`hours-${base}.csv`, shiftsToCsv(d.shifts))}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.button.secondary}`}
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );
};

export function register(reg: ArtifactRegistry): void {
  reg.timesheet = { Body: TimesheetBody, Foot: TimesheetFoot };
}

export default TimesheetBody;
