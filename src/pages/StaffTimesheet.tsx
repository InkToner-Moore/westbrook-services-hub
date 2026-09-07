// The Timesheet tool page: add and deactivate employees, a punch clock (clock in /
// clock out with a live elapsed time on an open shift), a list of time entries, and
// a CSV export. Renders chromeless inside the three-pane staff shell via useShell()
// (matching the other tool pages), and as a standalone full page on a deep link.
// Signature hue is slate (DESIGN-SPEC tool colours). Reuses lib/firestore CRUD and
// the lib/timesheet data model so anything punched here matches what AI Mode writes.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { useManagerMode } from "@/contexts/ManagerModeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteDocument,
  getCollection,
  setDocument,
  updateDocument,
  generateEmployeeId,
  generateShiftId,
  generateTimeEntryId,
} from "@/lib/firestore";
import {
  EMPLOYEES_COLLECTION,
  TIME_ENTRIES_COLLECTION,
  entriesToCsv,
  entryMs,
  formatClock,
  formatDay,
  formatDuration,
  formatHoursDecimal,
  isOpen,
  isTodayEntry,
  totalMs,
  type Employee,
  type TimeEntry,
} from "@/lib/timesheet";
import {
  SCHEDULE_COLLECTION,
  addDays,
  formatDayHeading,
  formatShiftDuration,
  formatTime12,
  formatWeekRange,
  parseDateKey,
  shiftMinutes,
  shiftsOnDay,
  startOfWeek,
  toDateKey,
  weekDayKeys,
  type ScheduleShift,
} from "@/lib/schedule";
import ThemeToggleButton from "@/components/ThemeToggleButton";

// Trigger a client-side CSV download without a new dependency.
function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// The theme bag shape, borrowed from the hook so the presentational components
// below can be typed without repeating it (and without a bare `any`).
type ThemeClasses = ReturnType<typeof useTheme>["themeClasses"];

// --- Visual mode helpers -----------------------------------------------------

// One spent colour per person, so the same employee reads in the same colour
// across the schedule grid and the hours bars. Both themes are defined so the
// light/dark switch only changes value, never the layout.
const EMPLOYEE_HUES = [
  { block: { light: "bg-blue-100 text-blue-900 border-blue-300", dark: "bg-blue-500/25 text-blue-50 border-blue-400/40" }, bar: { light: "bg-blue-500", dark: "bg-blue-400" }, dot: "bg-blue-500" },
  { block: { light: "bg-emerald-100 text-emerald-900 border-emerald-300", dark: "bg-emerald-500/25 text-emerald-50 border-emerald-400/40" }, bar: { light: "bg-emerald-500", dark: "bg-emerald-400" }, dot: "bg-emerald-500" },
  { block: { light: "bg-amber-100 text-amber-900 border-amber-300", dark: "bg-amber-500/25 text-amber-50 border-amber-400/40" }, bar: { light: "bg-amber-500", dark: "bg-amber-400" }, dot: "bg-amber-500" },
  { block: { light: "bg-violet-100 text-violet-900 border-violet-300", dark: "bg-violet-500/25 text-violet-50 border-violet-400/40" }, bar: { light: "bg-violet-500", dark: "bg-violet-400" }, dot: "bg-violet-500" },
  { block: { light: "bg-rose-100 text-rose-900 border-rose-300", dark: "bg-rose-500/25 text-rose-50 border-rose-400/40" }, bar: { light: "bg-rose-500", dark: "bg-rose-400" }, dot: "bg-rose-500" },
  { block: { light: "bg-teal-100 text-teal-900 border-teal-300", dark: "bg-teal-500/25 text-teal-50 border-teal-400/40" }, bar: { light: "bg-teal-500", dark: "bg-teal-400" }, dot: "bg-teal-500" },
  { block: { light: "bg-indigo-100 text-indigo-900 border-indigo-300", dark: "bg-indigo-500/25 text-indigo-50 border-indigo-400/40" }, bar: { light: "bg-indigo-500", dark: "bg-indigo-400" }, dot: "bg-indigo-500" },
  { block: { light: "bg-orange-100 text-orange-900 border-orange-300", dark: "bg-orange-500/25 text-orange-50 border-orange-400/40" }, bar: { light: "bg-orange-500", dark: "bg-orange-400" }, dot: "bg-orange-500" },
];

// Stable colour per employee id so a person keeps their colour week to week.
function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return EMPLOYEE_HUES[h % EMPLOYEE_HUES.length];
}

// 'HH:MM' to minutes past midnight, or null if malformed.
function hhmmToMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// A packed shift carries its lane and the lane count of its overlap cluster, so
// overlapping shifts sit side by side instead of stacking on top of each other.
interface PackedShift {
  shift: ScheduleShift;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

// Greedy interval packing for one day: overlapping shifts share a cluster and
// split the column into even lanes; a shift with no overlap gets the full width.
function packDay(dayShifts: ScheduleShift[]): PackedShift[] {
  const items = dayShifts
    .map((s) => {
      const start = hhmmToMin(s.start) ?? 0;
      const end = Math.max(hhmmToMin(s.end) ?? 0, start + 15);
      return { s, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: PackedShift[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf: number[] = [];
    cluster.forEach((it) => {
      let lane = laneEnds.findIndex((e) => e <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      laneOf.push(lane);
    });
    const laneCount = laneEnds.length || 1;
    cluster.forEach((it, i) => out.push({ shift: it.s, start: it.start, end: it.end, lane: laneOf[i], lanes: laneCount }));
    cluster = [];
    clusterEnd = -1;
  };
  items.forEach((it) => {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  if (cluster.length) flush();
  return out;
}

const HOUR_PX = 56;

// A segmented List / Visual switch, persisted by the caller.
function ViewToggle({
  value,
  onChange,
  themeClasses,
  isDarkMode,
}: {
  value: "list" | "visual";
  onChange: (v: "list" | "visual") => void;
  themeClasses: ThemeClasses;
  isDarkMode: boolean;
}) {
  const opt = (v: "list" | "visual", label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
        value === v
          ? `${isDarkMode ? "bg-[#171a21]" : "bg-white"} ${themeClasses.text.primary} shadow-sm`
          : themeClasses.text.secondary
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
  return (
    <div className={`inline-flex gap-1 rounded-lg border p-1 ${themeClasses.card.secondary}`}>
      {opt("list", "List", List)}
      {opt("visual", "Visual", LayoutGrid)}
    </div>
  );
}

// The weekly calendar grid: an hour rail on the left and seven day columns with
// shift blocks positioned by their start and end, colour-coded per employee.
function VisualSchedule({
  weekKeys,
  shifts,
  todayKey,
  nowMin,
  isManager,
  onEditShift,
  onAddShift,
  themeClasses,
  isDarkMode,
}: {
  weekKeys: string[];
  shifts: ScheduleShift[];
  todayKey: string;
  nowMin: number;
  isManager: boolean;
  onEditShift: (s: ScheduleShift) => void;
  onAddShift: (dayKey: string) => void;
  themeClasses: ThemeClasses;
  isDarkMode: boolean;
}) {
  const weekShifts = weekKeys.flatMap((k) => shiftsOnDay(shifts, k));

  // Time window: default 8:00 to 20:00, widened to fit the actual shifts and
  // aligned to whole hours so the rail reads cleanly.
  let winStart = 8 * 60;
  let winEnd = 20 * 60;
  weekShifts.forEach((s) => {
    const a = hhmmToMin(s.start);
    const b = hhmmToMin(s.end);
    if (a != null) winStart = Math.min(winStart, a);
    if (b != null) winEnd = Math.max(winEnd, b);
  });
  winStart = Math.floor(winStart / 60) * 60;
  winEnd = Math.ceil(winEnd / 60) * 60;
  if (winEnd - winStart < 240) winEnd = winStart + 240;

  const pxPerMin = HOUR_PX / 60;
  const gridHeight = (winEnd - winStart) * pxPerMin;
  const hours: number[] = [];
  for (let h = winStart; h <= winEnd; h += 60) hours.push(h);

  const edge = isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]";
  const todayCol = isDarkMode ? "bg-blue-500/[0.06]" : "bg-blue-50/70";
  const todayBadge = isDarkMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white";
  const hasAny = weekShifts.length > 0;

  const hourText = (min: number) =>
    formatTime12(`${String(Math.floor(min / 60)).padStart(2, "0")}:00`);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Day headers */}
        <div className="flex">
          <div className="w-14 shrink-0" />
          {weekKeys.map((dayKey) => {
            const d = parseDateKey(dayKey);
            const isToday = dayKey === todayKey;
            return (
              <div key={dayKey} className={`flex-1 min-w-[96px] border-l px-1 py-2 text-center ${edge}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? themeClasses.text.accent : themeClasses.text.secondary}`}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold ${isToday ? todayBadge : themeClasses.text.primary}`}>
                    {d.getDate()}
                  </span>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => onAddShift(dayKey)}
                      aria-label={`Add a shift on ${formatDayHeading(dayKey)}`}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${themeClasses.button.ghost}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative flex">
          {/* Hour rail */}
          <div className="relative w-14 shrink-0" style={{ height: gridHeight }}>
            {hours.map((min) => (
              <div
                key={min}
                className="absolute right-1 flex justify-end"
                style={{ top: (min - winStart) * pxPerMin - 6 }}
              >
                <span className={`text-[10px] font-mono tabular-nums ${themeClasses.text.muted}`}>{hourText(min)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekKeys.map((dayKey) => {
            const packed = packDay(shiftsOnDay(shifts, dayKey));
            const isToday = dayKey === todayKey;
            return (
              <div
                key={dayKey}
                className={`relative flex-1 min-w-[96px] border-l ${edge} ${isToday ? todayCol : ""}`}
                style={{ height: gridHeight }}
              >
                {/* Hour gridlines */}
                {hours.map((min) => (
                  <div
                    key={min}
                    className={`absolute inset-x-0 border-t ${edge}`}
                    style={{ top: (min - winStart) * pxPerMin }}
                  />
                ))}

                {/* Current-time line on today */}
                {isToday && nowMin >= winStart && nowMin <= winEnd && (
                  <div className="absolute inset-x-0 z-20" style={{ top: (nowMin - winStart) * pxPerMin }}>
                    <div className="relative h-px bg-red-500">
                      <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Shift blocks */}
                {packed.map((p) => {
                  const hue = hueFor(p.shift.employeeId);
                  const block = isDarkMode ? hue.block.dark : hue.block.light;
                  const top = (p.start - winStart) * pxPerMin;
                  const height = Math.max(22, (p.end - p.start) * pxPerMin - 2);
                  const widthPct = 100 / p.lanes;
                  const leftPct = p.lane * widthPct;
                  const tall = height >= 40;
                  const title = `${p.shift.employeeName}, ${formatTime12(p.shift.start)} to ${formatTime12(
                    p.shift.end,
                  )}${p.shift.note ? `, ${p.shift.note}` : ""}`;
                  const cls = `absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left ${block} ${
                    isManager ? "cursor-pointer transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-blue-500/40" : ""
                  }`;
                  const style = {
                    top,
                    height,
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                  };
                  const inner = (
                    <>
                      <div className="truncate text-[11px] font-semibold leading-tight">{p.shift.employeeName}</div>
                      {tall && (
                        <div className="truncate text-[10px] font-mono tabular-nums leading-tight opacity-80">
                          {formatTime12(p.shift.start)} to {formatTime12(p.shift.end)}
                        </div>
                      )}
                    </>
                  );
                  return isManager ? (
                    <button key={p.shift.id} type="button" title={title} onClick={() => onEditShift(p.shift)} className={cls} style={style}>
                      {inner}
                    </button>
                  ) : (
                    <div key={p.shift.id} title={title} className={cls} style={style}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Empty-week overlay */}
          {!hasAny && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className={`rounded-lg border px-4 py-3 text-center text-sm ${themeClasses.card.secondary} ${themeClasses.text.secondary}`}>
                No shifts this week.
                {isManager ? " Use a day's plus button to add one." : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The hours view: one horizontal bar per employee for the shown entries, longest
// first, sharing the employee colours used on the schedule grid.
function VisualTimesheet({
  entries,
  now,
  themeClasses,
  isDarkMode,
}: {
  entries: TimeEntry[];
  now: number;
  themeClasses: ThemeClasses;
  isDarkMode: boolean;
}) {
  const byEmp = new Map<string, { name: string; ms: number; open: boolean }>();
  entries.forEach((e) => {
    const cur = byEmp.get(e.employeeId) ?? { name: e.employeeName, ms: 0, open: false };
    cur.ms += entryMs(e, now);
    if (isOpen(e)) cur.open = true;
    cur.name = e.employeeName;
    byEmp.set(e.employeeId, cur);
  });
  const rows = Array.from(byEmp.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.ms - a.ms);
  const maxMs = Math.max(1, ...rows.map((r) => r.ms));
  const grand = rows.reduce((s, r) => s + r.ms, 0);
  const track = isDarkMode ? "bg-[#1f232c]" : "bg-[#f1efe9]";
  const onPill = isDarkMode ? "bg-blue-500/20 text-blue-200 border-blue-400/50" : "bg-blue-100 text-blue-800 border-blue-300";

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const hue = hueFor(r.id);
        const bar = isDarkMode ? hue.bar.dark : hue.bar.light;
        const pct = Math.max(3, Math.round((r.ms / maxMs) * 100));
        return (
          <div key={r.id} className="flex items-center gap-3">
            <div className={`flex w-32 shrink-0 items-center gap-1.5 ${themeClasses.text.primary}`}>
              <span className="truncate text-sm font-medium">{r.name}</span>
              {r.open && <span className={`shrink-0 rounded-full border px-1.5 text-[10px] ${onPill}`}>now</span>}
            </div>
            <div className={`relative h-7 flex-1 overflow-hidden rounded-md ${track}`}>
              <div className={`h-full rounded-md ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`w-24 shrink-0 text-right font-mono text-sm tabular-nums ${themeClasses.text.primary}`}>
              {formatDuration(r.ms)}
              <span className={`ml-1 text-[11px] ${themeClasses.text.muted}`}>{formatHoursDecimal(r.ms)}h</span>
            </div>
          </div>
        );
      })}
      <div className={`flex items-center justify-between border-t pt-3 ${isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]"}`}>
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Total</span>
        <span className={`font-mono text-sm font-semibold tabular-nums ${themeClasses.text.primary}`}>
          {formatDuration(grand)}
          <span className={`ml-2 text-[13px] font-normal ${themeClasses.text.muted}`}>{formatHoursDecimal(grand)} h</span>
        </span>
      </div>
    </div>
  );
}

const StaffTimesheet = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const { inShell } = useShell();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayOnly, setTodayOnly] = useState(false);
  // Ticks once a second so an open shift shows a live elapsed time.
  const [now, setNow] = useState(Date.now());

  const newEmployeeForm = useForm<{ name: string }>({ defaultValues: { name: "" } });

  // Which tab is showing: the punch clock (actual hours) or the schedule (planned).
  const [tab, setTab] = useState<"timesheet" | "schedule">("timesheet");

  // Manager mode gates every schedule edit. Staff can always view the schedule.
  const { isManager, pinIsSet, promptUnlock, promptChangePin, lock } = useManagerMode();

  // Planned shifts and the week being viewed (Sunday-start).
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  // List vs Visual for each tab, remembered per browser. Visual is the default
  // so the calendar grid and hours bars are what a clerk sees first.
  const [scheduleView, setScheduleView] = useState<"list" | "visual">(
    () => (localStorage.getItem("schedule-view") as "list" | "visual") || "visual",
  );
  const [entriesView, setEntriesView] = useState<"list" | "visual">(
    () => (localStorage.getItem("timesheet-entries-view") as "list" | "visual") || "visual",
  );
  useEffect(() => {
    localStorage.setItem("schedule-view", scheduleView);
  }, [scheduleView]);
  useEffect(() => {
    localStorage.setItem("timesheet-entries-view", entriesView);
  }, [entriesView]);

  // The add/edit shift dialog and its form.
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    employeeId: "",
    date: "",
    start: "09:00",
    end: "17:00",
    note: "",
  });
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, ents, shfts] = await Promise.all([
          getCollection<Employee>(EMPLOYEES_COLLECTION, "createdAt"),
          getCollection<TimeEntry>(TIME_ENTRIES_COLLECTION, "createdAt"),
          getCollection<ScheduleShift>(SCHEDULE_COLLECTION, "createdAt"),
        ]);
        setEmployees(emps);
        setEntries(ents);
        setShifts(shfts);
      } catch (error) {
        console.error("Failed to load timesheet:", error);
        toast({ title: "Error", description: "Failed to load timesheet from database" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const openEntryFor = (employeeId: string): TimeEntry | undefined =>
    entries.find((e) => e.employeeId === employeeId && isOpen(e));

  const shownEntries = useMemo(
    () => (todayOnly ? entries.filter((e) => isTodayEntry(e, new Date(now))) : entries),
    [entries, todayOnly, now],
  );

  const handleLogout = async () => {
    await logout();
  };

  const addEmployee = async ({ name }: { name: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = employees.find((e) => e.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!existing.active) {
        await updateDocument(EMPLOYEES_COLLECTION, existing.id, { active: true });
        setEmployees((prev) => prev.map((e) => (e.id === existing.id ? { ...e, active: true } : e)));
        toast({ title: "Reactivated", description: `${existing.name} is active again` });
      } else {
        toast({ title: "Already added", description: `${existing.name} is already on the team` });
      }
      newEmployeeForm.reset();
      return;
    }
    const employee: Employee = {
      id: generateEmployeeId(),
      name: trimmed,
      active: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDocument(EMPLOYEES_COLLECTION, employee.id, employee);
      setEmployees((prev) => [employee, ...prev]);
      newEmployeeForm.reset();
      toast({ title: "Employee added", description: `${trimmed} added to the team` });
    } catch (error) {
      console.error("Failed to add employee:", error);
      toast({ title: "Error", description: "Failed to save employee to database" });
    }
  };

  const deactivateEmployee = async (employee: Employee) => {
    try {
      await updateDocument(EMPLOYEES_COLLECTION, employee.id, { active: false });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? { ...e, active: false } : e)));
      toast({ title: "Employee removed", description: `${employee.name} is no longer on the clock list` });
    } catch (error) {
      console.error("Failed to deactivate employee:", error);
      toast({ title: "Error", description: "Failed to update employee" });
    }
  };

  const clockIn = async (employee: Employee) => {
    if (openEntryFor(employee.id)) {
      toast({ title: "Already clocked in", description: `${employee.name} is on the clock` });
      return;
    }
    const nowIso = new Date().toISOString();
    const entry: TimeEntry = {
      id: generateTimeEntryId(),
      employeeId: employee.id,
      employeeName: employee.name,
      clockIn: nowIso,
      clockOut: null,
      createdAt: nowIso,
    };
    try {
      await setDocument(TIME_ENTRIES_COLLECTION, entry.id, entry);
      setEntries((prev) => [entry, ...prev]);
      toast({ title: "Clocked in", description: `${employee.name} at ${formatClock(nowIso)}` });
    } catch (error) {
      console.error("Failed to clock in:", error);
      toast({ title: "Error", description: "Failed to record clock in" });
    }
  };

  const clockOut = async (entry: TimeEntry) => {
    const clockOutIso = new Date().toISOString();
    try {
      await updateDocument(TIME_ENTRIES_COLLECTION, entry.id, { clockOut: clockOutIso });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, clockOut: clockOutIso } : e)));
      const dur = formatDuration(new Date(clockOutIso).getTime() - new Date(entry.clockIn).getTime());
      toast({ title: "Clocked out", description: `${entry.employeeName}, ${dur} on the clock` });
    } catch (error) {
      console.error("Failed to clock out:", error);
      toast({ title: "Error", description: "Failed to record clock out" });
    }
  };

  const exportCsv = () => {
    if (shownEntries.length === 0) {
      toast({ title: "Nothing to export", description: "There are no entries to export yet" });
      return;
    }
    const base = todayOnly ? "today" : "all";
    downloadCsv(`timesheet-${base}.csv`, entriesToCsv(shownEntries));
  };

  // Open the shift dialog to add a new shift, optionally pre-set to a day.
  const openAddShift = (dayKey?: string) => {
    if (!isManager) {
      promptUnlock();
      return;
    }
    setEditingShift(null);
    setShiftForm({
      employeeId: activeEmployees[0]?.id ?? "",
      date: dayKey ?? toDateKey(new Date()),
      start: "09:00",
      end: "17:00",
      note: "",
    });
    setShiftDialogOpen(true);
  };

  // Open the shift dialog to edit an existing shift.
  const openEditShift = (shift: ScheduleShift) => {
    if (!isManager) {
      promptUnlock();
      return;
    }
    setEditingShift(shift);
    setShiftForm({
      employeeId: shift.employeeId,
      date: shift.date,
      start: shift.start,
      end: shift.end,
      note: shift.note ?? "",
    });
    setShiftDialogOpen(true);
  };

  const saveShift = async () => {
    if (!isManager) {
      promptUnlock();
      return;
    }
    const employee = employees.find((e) => e.id === shiftForm.employeeId);
    if (!employee) {
      toast({ title: "Pick an employee", description: "Choose who works this shift." });
      return;
    }
    if (!shiftForm.date || !shiftForm.start || !shiftForm.end) {
      toast({ title: "Missing details", description: "Set the day, start, and end." });
      return;
    }
    if (shiftForm.end <= shiftForm.start) {
      toast({ title: "Check the times", description: "The end time must be after the start." });
      return;
    }
    setSavingShift(true);
    const note = shiftForm.note.trim();
    try {
      if (editingShift) {
        const updated: ScheduleShift = {
          ...editingShift,
          employeeId: employee.id,
          employeeName: employee.name,
          date: shiftForm.date,
          start: shiftForm.start,
          end: shiftForm.end,
          note: note || undefined,
        };
        await updateDocument(SCHEDULE_COLLECTION, editingShift.id, {
          employeeId: updated.employeeId,
          employeeName: updated.employeeName,
          date: updated.date,
          start: updated.start,
          end: updated.end,
          note: note || "",
        });
        setShifts((prev) => prev.map((s) => (s.id === editingShift.id ? updated : s)));
        toast({ title: "Shift updated", description: `${employee.name}, ${formatDayHeading(updated.date)}` });
      } else {
        const shift: ScheduleShift = {
          id: generateShiftId(),
          employeeId: employee.id,
          employeeName: employee.name,
          date: shiftForm.date,
          start: shiftForm.start,
          end: shiftForm.end,
          note: note || undefined,
          createdAt: new Date().toISOString(),
        };
        await setDocument(SCHEDULE_COLLECTION, shift.id, {
          ...shift,
          note: note || "",
        });
        setShifts((prev) => [shift, ...prev]);
        toast({ title: "Shift added", description: `${employee.name}, ${formatDayHeading(shift.date)}` });
      }
      setShiftDialogOpen(false);
      setEditingShift(null);
    } catch (error) {
      console.error("Failed to save shift:", error);
      toast({ title: "Error", description: "Failed to save the shift to the database" });
    } finally {
      setSavingShift(false);
    }
  };

  const deleteShift = async (shift: ScheduleShift) => {
    if (!isManager) {
      promptUnlock();
      return;
    }
    try {
      await deleteDocument(SCHEDULE_COLLECTION, shift.id);
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      toast({ title: "Shift removed", description: `${shift.employeeName}, ${formatDayHeading(shift.date)}` });
    } catch (error) {
      console.error("Failed to delete shift:", error);
      toast({ title: "Error", description: "Failed to remove the shift" });
    }
  };

  const weekKeys = weekDayKeys(weekStart);
  const nowDate = new Date(now);
  const todayKey = toDateKey(nowDate);
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();

  // Slate signature accents, per theme. State is never colour-only (buttons and
  // pills carry text/icons too).
  const slateBadge = isDarkMode ? "bg-slate-500/20 text-slate-200" : "bg-slate-200 text-slate-700";
  const onClockPill = isDarkMode
    ? "bg-blue-500/20 text-blue-200 border-blue-400/50"
    : "bg-blue-100 text-blue-800 border-blue-300";

  const shownTotal = totalMs(shownEntries, now);

  const content = (
    <div className="space-y-6">
      {/* Punch clock */}
      <div className={`rounded-xl border ${themeClasses.card.primary}`}>
        <div className={`flex items-center gap-2 border-b px-4 py-3 ${isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]"}`}>
          <Users className={`h-5 w-5 ${themeClasses.text.secondary}`} />
          <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Punch clock</h2>
        </div>

        <div className="p-4">
          {/* Add employee */}
          <form
            onSubmit={newEmployeeForm.handleSubmit(addEmployee)}
            className="mb-5 flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1">
              <Label className="sr-only">Employee name</Label>
              <Input
                {...newEmployeeForm.register("name", { required: true })}
                placeholder="Add an employee, e.g. Sarah Chen"
                className={`min-h-[44px] ${themeClasses.input}`}
              />
            </div>
            <Button
              type="submit"
              className={`min-h-[44px] font-semibold rounded-lg ${themeClasses.button.primary}`}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add employee
            </Button>
          </form>

          {loading ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Loader2 className={`mb-3 h-10 w-10 animate-spin ${themeClasses.text.muted}`} />
              <p className={themeClasses.text.secondary}>Loading timesheet...</p>
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className={`mb-3 h-10 w-10 ${themeClasses.text.muted}`} />
              <h3 className={`mb-1 text-lg font-semibold ${themeClasses.text.primary}`}>No employees yet</h3>
              <p className={themeClasses.text.secondary}>Add someone above to start the punch clock.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeEmployees.map((employee) => {
                const open = openEntryFor(employee.id);
                return (
                  <div
                    key={employee.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${themeClasses.card.secondary}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${slateBadge}`}>
                        <User className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${themeClasses.text.primary}`}>{employee.name}</p>
                        {open ? (
                          <p className={`text-[13px] font-mono tabular-nums ${themeClasses.text.secondary}`}>
                            Since {formatClock(open.clockIn)}, {formatDuration(entryMs(open, now))}
                          </p>
                        ) : (
                          <p className={`text-[13px] ${themeClasses.text.muted}`}>Not on the clock</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {open && (
                        <Badge variant="outline" className={`${onClockPill} border text-xs`}>
                          On the clock
                        </Badge>
                      )}
                      {open ? (
                        <Button
                          onClick={() => clockOut(open)}
                          className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.success}`}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Clock out
                        </Button>
                      ) : (
                        <Button
                          onClick={() => clockIn(employee)}
                          className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.primary}`}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Clock in
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${employee.name}`}
                            className={`min-h-[44px] ${themeClasses.button.ghost}`}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this employee?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This takes "{employee.name}" off the punch clock. Their past time entries are
                              kept for the record and export.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deactivateEmployee(employee)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Time entries */}
      <div className={`rounded-xl border ${themeClasses.card.primary}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]"}`}>
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${themeClasses.text.secondary}`} />
            <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Time entries</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={entriesView} onChange={setEntriesView} themeClasses={themeClasses} isDarkMode={isDarkMode} />
            <Button
              variant="ghost"
              onClick={() => setTodayOnly((v) => !v)}
              className={`min-h-[44px] rounded-lg ${todayOnly ? themeClasses.button.secondary : themeClasses.button.ghost}`}
            >
              {todayOnly ? "Today only" : "All entries"}
            </Button>
            <Button
              onClick={exportCsv}
              className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.secondary}`}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Loader2 className={`mb-3 h-10 w-10 animate-spin ${themeClasses.text.muted}`} />
              <p className={themeClasses.text.secondary}>Loading entries...</p>
            </div>
          ) : shownEntries.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Clock className={`mb-3 h-10 w-10 ${themeClasses.text.muted}`} />
              <h3 className={`mb-1 text-lg font-semibold ${themeClasses.text.primary}`}>
                {todayOnly ? "No punches today" : "No time entries yet"}
              </h3>
              <p className={themeClasses.text.secondary}>Clock someone in to start the record.</p>
            </div>
          ) : entriesView === "visual" ? (
            <VisualTimesheet entries={shownEntries} now={now} themeClasses={themeClasses} isDarkMode={isDarkMode} />
          ) : (
            <>
              <div className={`divide-y ${isDarkMode ? "divide-[#2a2f3a]" : "divide-[#e4e1d9]"}`}>
                {shownEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${themeClasses.text.primary}`}>
                        {entry.employeeName}
                      </p>
                      <p className={`truncate text-[13px] ${themeClasses.text.secondary}`}>
                        {formatDay(entry.clockIn)},{" "}
                        <span className="font-mono tabular-nums">
                          {formatClock(entry.clockIn)} to {entry.clockOut ? formatClock(entry.clockOut) : "open"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOpen(entry) && (
                        <Badge variant="outline" className={`${onClockPill} border text-xs`}>
                          On the clock
                        </Badge>
                      )}
                      <span className={`text-sm font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
                        {formatDuration(entryMs(entry, now))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-2 flex items-center justify-between border-t pt-3 ${isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]"}`}>
                <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Total</span>
                <span className={`font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
                  {formatDuration(shownTotal)}
                  <span className={`ml-2 text-[13px] font-normal ${themeClasses.text.muted}`}>
                    {formatHoursDecimal(shownTotal)} h
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const edgeBorder = isDarkMode ? "border-[#2a2f3a]" : "border-[#e4e1d9]";
  const edgeDivide = isDarkMode ? "divide-[#2a2f3a]" : "divide-[#e4e1d9]";

  const scheduleContent = (
    <div className="space-y-4">
      <div className={`rounded-xl border ${themeClasses.card.primary}`}>
        {/* Header: title + manager controls */}
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${edgeBorder}`}>
          <div className="flex items-center gap-2">
            <CalendarDays className={`h-5 w-5 ${themeClasses.text.secondary}`} />
            <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Schedule</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={scheduleView} onChange={setScheduleView} themeClasses={themeClasses} isDarkMode={isDarkMode} />
            {isManager ? (
              <>
                <Button
                  onClick={() => openAddShift()}
                  className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.primary}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add shift
                </Button>
                <Button
                  variant="ghost"
                  onClick={promptChangePin}
                  className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {pinIsSet ? "Change PIN" : "Set PIN"}
                </Button>
                <Button
                  onClick={lock}
                  className={`min-h-[44px] rounded-lg ${themeClasses.button.secondary}`}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Lock
                </Button>
              </>
            ) : (
              <Button
                onClick={promptUnlock}
                className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.secondary}`}
              >
                <Lock className="mr-2 h-4 w-4" />
                Manager sign in
              </Button>
            )}
          </div>
        </div>

        {/* Week navigator */}
        <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${edgeBorder}`}>
          <Button
            variant="ghost"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}
          >
            This week
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous week"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className={`min-h-[44px] ${themeClasses.button.ghost}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className={`font-mono text-sm tabular-nums ${themeClasses.text.primary}`}>
              {formatWeekRange(weekStart)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next week"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className={`min-h-[44px] ${themeClasses.button.ghost}`}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Days of the week */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Loader2 className={`mb-3 h-10 w-10 animate-spin ${themeClasses.text.muted}`} />
              <p className={themeClasses.text.secondary}>Loading schedule...</p>
            </div>
          ) : scheduleView === "visual" ? (
            <VisualSchedule
              weekKeys={weekKeys}
              shifts={shifts}
              todayKey={todayKey}
              nowMin={nowMin}
              isManager={isManager}
              onEditShift={openEditShift}
              onAddShift={openAddShift}
              themeClasses={themeClasses}
              isDarkMode={isDarkMode}
            />
          ) : (
            <div className="space-y-3">
              {weekKeys.map((dayKey) => {
                const dayShifts = shiftsOnDay(shifts, dayKey);
                const isToday = dayKey === todayKey;
                return (
                  <div key={dayKey} className={`rounded-lg border ${themeClasses.card.secondary}`}>
                    <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${edgeBorder}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                          {formatDayHeading(dayKey)}
                        </span>
                        {isToday && (
                          <Badge variant="outline" className={`${onClockPill} border text-xs`}>
                            Today
                          </Badge>
                        )}
                      </div>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddShift(dayKey)}
                          className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </div>
                    <div className="px-3 py-1.5">
                      {dayShifts.length === 0 ? (
                        <p className={`py-1.5 text-[13px] ${themeClasses.text.muted}`}>No one scheduled</p>
                      ) : (
                        <div className={`divide-y ${edgeDivide}`}>
                          {dayShifts.map((shift) => (
                            <div key={shift.id} className="flex items-center justify-between gap-3 py-2">
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-medium ${themeClasses.text.primary}`}>
                                  {shift.employeeName}
                                </p>
                                <p className={`truncate text-[13px] ${themeClasses.text.secondary}`}>
                                  <span className="font-mono tabular-nums">
                                    {formatTime12(shift.start)} to {formatTime12(shift.end)}
                                  </span>
                                  <span className={themeClasses.text.muted}>
                                    , {formatShiftDuration(shiftMinutes(shift))}
                                  </span>
                                </p>
                                {shift.note && (
                                  <p className={`truncate text-[13px] ${themeClasses.text.muted}`}>{shift.note}</p>
                                )}
                              </div>
                              {isManager && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Edit ${shift.employeeName}'s shift`}
                                    onClick={() => openEditShift(shift)}
                                    className={`min-h-[44px] ${themeClasses.button.ghost}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Remove ${shift.employeeName}'s shift`}
                                        className={`min-h-[44px] ${themeClasses.button.ghost}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove this shift?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This removes {shift.employeeName}'s shift on{" "}
                                          {formatDayHeading(shift.date)}, {formatTime12(shift.start)} to{" "}
                                          {formatTime12(shift.end)}.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteShift(shift)}
                                          className="bg-red-600 text-white hover:bg-red-700"
                                        >
                                          Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!isManager && (
        <p className={`text-center text-[13px] ${themeClasses.text.muted}`}>
          Viewing only. Sign in as manager to add or change shifts.
        </p>
      )}
    </div>
  );

  // Segmented tab control: actual hours (Timesheet) vs planned shifts (Schedule).
  const tabButton = (key: "timesheet" | "schedule", label: string, Icon: typeof Clock) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors ${
        tab === key
          ? `${themeClasses.card.primary} ${themeClasses.text.primary} shadow-sm`
          : themeClasses.text.secondary
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const shiftDialog = (
    <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {editingShift ? "Edit shift" : "Add a shift"}
          </DialogTitle>
          <DialogDescription>Plan who works and when. Staff see this on the schedule.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="shift-employee" className={themeClasses.text.secondary}>
              Employee
            </Label>
            <select
              id="shift-employee"
              value={shiftForm.employeeId}
              onChange={(e) => setShiftForm((f) => ({ ...f, employeeId: e.target.value }))}
              className={`min-h-[44px] w-full rounded-lg border px-3 ${themeClasses.input}`}
            >
              {activeEmployees.length === 0 && <option value="">No employees yet</option>}
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift-date" className={themeClasses.text.secondary}>
              Day
            </Label>
            <Input
              id="shift-date"
              type="date"
              value={shiftForm.date}
              onChange={(e) => setShiftForm((f) => ({ ...f, date: e.target.value }))}
              className={`min-h-[44px] ${themeClasses.input}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="shift-start" className={themeClasses.text.secondary}>
                Start
              </Label>
              <Input
                id="shift-start"
                type="time"
                value={shiftForm.start}
                onChange={(e) => setShiftForm((f) => ({ ...f, start: e.target.value }))}
                className={`min-h-[44px] font-mono tabular-nums ${themeClasses.input}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift-end" className={themeClasses.text.secondary}>
                End
              </Label>
              <Input
                id="shift-end"
                type="time"
                value={shiftForm.end}
                onChange={(e) => setShiftForm((f) => ({ ...f, end: e.target.value }))}
                className={`min-h-[44px] font-mono tabular-nums ${themeClasses.input}`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift-note" className={themeClasses.text.secondary}>
              Note (optional)
            </Label>
            <Input
              id="shift-note"
              value={shiftForm.note}
              onChange={(e) => setShiftForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. opening, covering Sam"
              className={`min-h-[44px] ${themeClasses.input}`}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {editingShift && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={`min-h-[44px] rounded-lg text-red-600 hover:text-red-700 sm:mr-auto ${themeClasses.button.ghost}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this shift?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {editingShift.employeeName}'s shift on {formatDayHeading(editingShift.date)},{" "}
                    {formatTime12(editingShift.start)} to {formatTime12(editingShift.end)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const target = editingShift;
                      if (target) await deleteShift(target);
                      setShiftDialogOpen(false);
                      setEditingShift(null);
                    }}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShiftDialogOpen(false)}
            className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveShift}
            disabled={savingShift}
            className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.primary}`}
          >
            {savingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingShift ? "Save changes" : "Add shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const body = (
    <>
      <div className={`mb-5 inline-flex gap-1 rounded-lg border p-1 ${themeClasses.card.secondary}`}>
        {tabButton("timesheet", "Timesheet", Clock)}
        {tabButton("schedule", "Schedule", CalendarDays)}
      </div>
      {tab === "timesheet" ? content : scheduleContent}
      {shiftDialog}
    </>
  );

  if (inShell) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${slateBadge}`}>
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>Timesheet</h1>
            <p className={`text-sm ${themeClasses.text.secondary}`}>The punch clock, hours, and the schedule</p>
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${themeClasses.header}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <Link to="/staff/dashboard" className={`mr-4 group transition-colors ${themeClasses.link}`}>
                <ArrowLeft className="mr-2 inline h-6 w-6 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </Link>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${slateBadge}`}>
                <Clock className="h-6 w-6" />
              </span>
              <div>
                <h1 className={`text-xl font-semibold tracking-tight lg:text-2xl ${themeClasses.text.primary}`}>
                  Timesheet
                </h1>
                <p className={`text-xs font-medium ${themeClasses.text.secondary}`}>Staff Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <ThemeToggleButton />
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-full px-4 py-2 ${themeClasses.button.ghost}`}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${themeClasses.text.primary}`}>
            Timesheet
          </h2>
          <p className={`mx-auto mt-2 max-w-2xl ${themeClasses.text.secondary}`}>
            Punch the clock, export hours, and plan the week's schedule.
          </p>
        </div>
        {body}
      </main>
    </div>
  );
};

export default StaffTimesheet;
