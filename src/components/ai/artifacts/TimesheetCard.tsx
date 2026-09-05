// The Timesheet artifact card (kind 'timesheet'). One bespoke card per outcome of
// executeTimesheet (see src/ai/actions/timesheet.ts), all emitted as a `timesheet`
// artifact whose data carries a discriminated `state`:
//   punched_in     an employee clocked in, as a punch slip (or "already in")
//   punched_out    an employee clocked out, with the duration for that shift
//   employee_added a new employee added to the team (or "already on the team")
//   summary        today's punches, or one employee's hours, with a total
//   not_found      no employee matched the spoken name
//
// The tool hue is slate (DESIGN-SPEC tool signature colours). Times, durations and
// ids are mono/tabular like a real slip. The summary state offers a CSV export of
// the shown entries in its foot. Registered via `export function register(reg)`.
import React from 'react';
import { Check, Clock, Download, LogIn, LogOut, SearchX, UserPlus, Users } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  entriesToCsv,
  entryMs,
  formatClock,
  formatDay,
  formatDuration,
  formatHoursDecimal,
  isOpen,
  totalMs,
  type TimeEntry,
} from '@/lib/timesheet';
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

// On-the-clock / done chip. Never colour-only: it always carries text too.
const OnClockPill: React.FC<{ open: boolean }> = ({ open }) => {
  const { themeClasses } = useTheme();
  const tone = open ? themeClasses.status.info : themeClasses.status.success;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${tone}`}>
      {open ? 'On the clock' : 'Done'}
    </span>
  );
};

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

// The punch slip shared by the in/out states: who, in, out (or open), duration.
const PunchSlip: React.FC<{ entry: TimeEntry; banner?: React.ReactNode }> = ({ entry, banner }) => {
  const { themeClasses } = useTheme();
  const { divide, edge } = useEdges();
  const open = isOpen(entry);
  return (
    <>
      {banner}
      <div className={`divide-y ${divide}`}>
        <Row label="Employee">{entry.employeeName || '--'}</Row>
        <Row label="Clocked in" mono>
          {formatClock(entry.clockIn)}
        </Row>
        <Row label="Clocked out" mono>
          {entry.clockOut ? formatClock(entry.clockOut) : 'Open'}
        </Row>
        <Row label="Date">{formatDay(entry.clockIn)}</Row>
        <Row label="Status">
          <OnClockPill open={open} />
        </Row>
        {entry.note && <Row label="Note">{entry.note}</Row>}
      </div>
      <div className={`mt-1 flex items-center justify-between border-t pt-2 ${edge}`}>
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
          {open ? 'Elapsed' : 'Hours'}
        </span>
        <span className={`text-base font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
          {formatDuration(entryMs(entry))}
        </span>
      </div>
      <p className={`mt-3 text-[13px] ${themeClasses.text.muted}`}>
        <span className="font-mono tabular-nums">{entry.id}</span>
      </p>
    </>
  );
};

// --- per-state bodies -------------------------------------------------------

const PunchedInBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'punched_in' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const banner = (
    <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${themeClasses.status.info}`}>
      <LogIn className="h-4 w-4" />
      {d.already ? `${d.employeeName} was already on the clock.` : `${d.employeeName} is on the clock.`}
    </div>
  );
  return (
    <CardShell
      icon={<LogIn className="h-5 w-5" />}
      title={d.already ? 'Already clocked in' : 'Clocked in'}
      subtitle={d.employeeName}
    >
      <PunchSlip entry={d.entry} banner={banner} />
    </CardShell>
  );
};

const PunchedOutBody: React.FC<{ d: Extract<TimesheetArtifactData, { state: 'punched_out' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const banner = (
    <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${themeClasses.status.success}`}>
      <LogOut className="h-4 w-4" />
      {`${d.employeeName} clocked out, ${formatDuration(entryMs(d.entry))} on the clock.`}
    </div>
  );
  return (
    <CardShell icon={<LogOut className="h-5 w-5" />} title="Clocked out" subtitle={d.employeeName}>
      <PunchSlip entry={d.entry} banner={banner} />
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
        {d.existed ? 'Ready to punch the clock' : 'Added to the team'}
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
  const { divide, edge } = useEdges();
  if (d.entries.length === 0) {
    return (
      <CardShell icon={<Clock className="h-5 w-5" />} title={d.title}>
        <div className="flex flex-col items-center py-8 text-center">
          <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}>
            <Users className={`h-6 w-6 ${themeClasses.text.muted}`} />
          </span>
          <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>
            {d.scope === 'today' ? 'No punches yet today' : 'No entries yet'}
          </p>
          <p className={`mt-1 text-[13px] ${themeClasses.text.muted}`}>
            Clock someone in from AI Mode or the Timesheet page.
          </p>
        </div>
      </CardShell>
    );
  }
  const total = totalMs(d.entries);
  return (
    <CardShell
      icon={<Clock className="h-5 w-5" />}
      title={d.title}
      subtitle={`${d.entries.length} ${d.entries.length === 1 ? 'entry' : 'entries'}, ${d.openCount} on the clock`}
    >
      <div className={`divide-y ${divide}`}>
        {d.entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className={`truncate text-sm ${themeClasses.text.primary}`}>
                {d.scope === 'employee' ? formatDay(e.clockIn) : e.employeeName || 'Unknown'}
              </div>
              <div className={`truncate text-[13px] font-mono tabular-nums ${themeClasses.text.secondary}`}>
                {formatClock(e.clockIn)} to {e.clockOut ? formatClock(e.clockOut) : 'open'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono tabular-nums ${themeClasses.text.primary}`}>
                {formatDuration(entryMs(e))}
              </span>
              {isOpen(e) && <OnClockPill open />}
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-1 flex items-center justify-between border-t pt-2 ${edge}`}>
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Total</span>
        <span className={`text-base font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
          {formatDuration(total)}
          <span className={`ml-2 text-[13px] font-normal ${themeClasses.text.muted}`}>
            {formatHoursDecimal(total)} h
          </span>
        </span>
      </div>
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
    case 'punched_in':
      return <PunchedInBody d={d} />;
    case 'punched_out':
      return <PunchedOutBody d={d} />;
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

// The summary state offers a CSV export of the entries it shows.
const TimesheetFoot: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const d = data as TimesheetArtifactData;
  if (d?.state !== 'summary' || d.entries.length === 0) return null;
  const base = d.scope === 'employee' && d.employeeName ? d.employeeName.replace(/\s+/g, '-').toLowerCase() : 'today';
  return (
    <div className={`flex flex-wrap items-center gap-2 border-t px-4 py-3 ${themeClasses.header}`}>
      <button
        type="button"
        onClick={() => downloadCsv(`timesheet-${base}.csv`, entriesToCsv(d.entries))}
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
