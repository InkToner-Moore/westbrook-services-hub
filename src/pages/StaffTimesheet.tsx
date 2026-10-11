import { useFormClasses, FieldGrid, Field, FormActions } from "@/components/shell/FormKit";
// The Timesheet tool page. Three tabs:
//   Schedule  the week's planned shifts, as a calendar or a list. Managers plan
//             them; anyone can open a shift and log what really happened (a
//             different start or end, a break), which strikes the planned time.
//   Hours     the hours that count for a week or a month, per person and per
//             shift, with a CSV export. Counted from the schedule.
//   Team      who can be scheduled.
// The punch clock is switched off, so there is no clock in / clock out here.
// Renders chromeless inside the staff shell and as a full page on a deep link
// (StaffLayout handles both). Signature hue is slate.
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart3,
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
  LockOpen,
  PencilLine,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { useManagerMode } from "@/contexts/ManagerModeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/lib/firestore";
import { EMPLOYEES_COLLECTION, type Employee } from "@/lib/timesheet";
import {
  SCHEDULE_COLLECTION,
  addDays,
  breakMinutesOf,
  formatDayHeading,
  formatHoursDecimal,
  formatShiftDuration,
  formatTime12,
  formatWeekRange,
  isAdjusted,
  parseDateKey,
  shiftMinutes,
  shiftsInRange,
  shiftsOnDay,
  shiftsToCsv,
  startOfWeek,
  toDateKey,
  totalWorkedMinutes,
  weekDayKeys,
  workedEnd,
  workedMinutes,
  workedStart,
  type ScheduleShift,
} from "@/lib/schedule";
import StaffLayout from "@/components/StaffLayout";
import { SegmentedTabs } from "@/components/shell/ToolPage";
import { ShiftTimes } from "@/components/ShiftTimes";

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
      // Drawn where the shift really ran: the actual times when they were logged.
      const start = hhmmToMin(workedStart(s)) ?? 0;
      const end = Math.max(hhmmToMin(workedEnd(s)) ?? 0, start + 15);
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

const HOUR_PX = 52;

type Tab = "schedule" | "hours" | "team";
type ScheduleView = "calendar" | "list";
type HoursRange = "week" | "month";

// The weekly calendar grid: an hour rail on the left and seven day columns with
// shift blocks positioned by when the shift ran, colour-coded per employee. Every
// block opens the shift: a manager edits the plan, anyone logs the actual times.
function VisualSchedule({
  weekKeys,
  shifts,
  todayKey,
  nowMin,
  isManager,
  onOpenShift,
  onAddShift,
  themeClasses,
  isDarkMode,
}: {
  weekKeys: string[];
  shifts: ScheduleShift[];
  todayKey: string;
  nowMin: number;
  isManager: boolean;
  onOpenShift: (s: ScheduleShift) => void;
  onAddShift: (dayKey: string) => void;
  themeClasses: ThemeClasses;
  isDarkMode: boolean;
}) {
  const weekShifts = weekKeys.flatMap((k) => shiftsOnDay(shifts, k));

  // Time window: default 10:00 to 19:00 (the counter's usual day), widened to fit
  // the actual shifts and aligned to whole hours so the rail reads cleanly.
  let winStart = 10 * 60;
  let winEnd = 19 * 60;
  weekShifts.forEach((s) => {
    [s.start, workedStart(s)].forEach((t) => {
      const a = hhmmToMin(t);
      if (a != null) winStart = Math.min(winStart, a);
    });
    [s.end, workedEnd(s)].forEach((t) => {
      const b = hhmmToMin(t);
      if (b != null) winEnd = Math.max(winEnd, b);
    });
  });
  winStart = Math.floor(winStart / 60) * 60;
  winEnd = Math.ceil(winEnd / 60) * 60;

  const pxPerMin = HOUR_PX / 60;
  const gridHeight = (winEnd - winStart) * pxPerMin;
  const hours: number[] = [];
  for (let h = winStart; h <= winEnd; h += 60) hours.push(h);

  const edge = "border-pub-edge";
  const todayCol = themeClasses.accent.soft;
  const todayBadge = themeClasses.ink.fill;

  const hourText = (min: number) => {
    const h24 = Math.floor(min / 60);
    return `${h24 % 12 === 0 ? 12 : h24 % 12} ${h24 >= 12 ? "PM" : "AM"}`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Day headers */}
        <div className="flex">
          <div className="w-12 shrink-0" />
          {weekKeys.map((dayKey) => {
            const d = parseDateKey(dayKey);
            const isToday = dayKey === todayKey;
            return (
              <div key={dayKey} className={`flex min-w-[92px] flex-1 items-center justify-center gap-1.5 border-l px-1 py-2 ${edge}`}>
                <span className={`text-[13px] font-medium ${isToday ? themeClasses.text.accent : 'text-pub-muted'}`}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold ${isToday ? todayBadge : 'text-pub-ink'}`}>
                  {d.getDate()}
                </span>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => onAddShift(dayKey)}
                    aria-label={`Add a shift on ${formatDayHeading(dayKey)}`}
                    title="Add a shift"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${themeClasses.button.ghost}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative flex">
          {/* Hour rail */}
          <div className="relative w-12 shrink-0" style={{ height: gridHeight }}>
            {hours.map((min) => (
              <div key={min} className="absolute right-1.5 flex justify-end" style={{ top: (min - winStart) * pxPerMin - 7 }}>
                <span className="text-[10px] font-mono tabular-nums text-pub-muted">{hourText(min)}</span>
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
                className={`relative min-w-[92px] flex-1 border-l ${edge} ${isToday ? todayCol : ""}`}
                style={{ height: gridHeight }}
              >
                {hours.map((min) => (
                  <div key={min} className={`absolute inset-x-0 border-t ${edge}`} style={{ top: (min - winStart) * pxPerMin }} />
                ))}

                {/* Current-time line on today */}
                {isToday && nowMin >= winStart && nowMin <= winEnd && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (nowMin - winStart) * pxPerMin }}>
                    <div className="relative h-px bg-red-500">
                      <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {packed.map((p) => {
                  const hue = hueFor(p.shift.employeeId);
                  const block = isDarkMode ? hue.block.dark : hue.block.light;
                  const height = Math.max(24, (p.end - p.start) * pxPerMin - 2);
                  const widthPct = 100 / p.lanes;
                  const adjusted = isAdjusted(p.shift);
                  const brk = breakMinutesOf(p.shift);
                  const title = `${p.shift.employeeName}, ${formatTime12(workedStart(p.shift))} to ${formatTime12(workedEnd(p.shift))}${
                    adjusted ? ` (planned ${formatTime12(p.shift.start)} to ${formatTime12(p.shift.end)})` : ""
                  }${brk ? `, ${brk} min break` : ""}${p.shift.note ? `, ${p.shift.note}` : ""}`;
                  return (
                    <button
                      key={p.shift.id}
                      type="button"
                      title={title}
                      onClick={() => onOpenShift(p.shift)}
                      className={`absolute z-10 flex flex-col items-stretch justify-start overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-pub-accent ${block}`}
                      style={{
                        top: (p.start - winStart) * pxPerMin,
                        height,
                        left: `calc(${p.lane * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
                        <span className="truncate">{p.shift.employeeName}</span>
                        {adjusted && <PencilLine className="h-3 w-3 shrink-0 opacity-70" aria-label="Actual times logged" />}
                      </div>
                      {height >= 40 && (
                        <div className="text-[10px] leading-snug opacity-90">
                          <ShiftTimes shift={p.shift} compact showBreak={height >= 64} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {weekShifts.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border px-4 py-3 text-center text-sm bg-pub-sunk border-pub-edge text-pub-muted">
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

// Hours per person for the shown shifts: one bar each, longest first, in the
// same colours as the calendar. The bar is the hours that count; a faint outline
// behind it marks what was planned when the two differ.
function HoursBars({
  shifts,
  themeClasses,
  isDarkMode,
}: {
  shifts: ScheduleShift[];
  themeClasses: ThemeClasses;
  isDarkMode: boolean;
}) {
  const byEmp = new Map<string, { name: string; worked: number; planned: number; count: number }>();
  shifts.forEach((s) => {
    const cur = byEmp.get(s.employeeId) ?? { name: s.employeeName, worked: 0, planned: 0, count: 0 };
    cur.worked += workedMinutes(s);
    cur.planned += shiftMinutes(s);
    cur.count += 1;
    cur.name = s.employeeName;
    byEmp.set(s.employeeId, cur);
  });
  const rows = Array.from(byEmp.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.worked - a.worked);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.worked, r.planned)));
  const track = "bg-pub-sunk";
  const plannedMark = "border-pub-muted";

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const hue = hueFor(r.id);
        const bar = isDarkMode ? hue.bar.dark : hue.bar.light;
        return (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <div className="truncate text-sm font-medium text-pub-ink">{r.name}</div>
              <div className="text-[11px] text-pub-muted">
                {r.count} {r.count === 1 ? "shift" : "shifts"}
              </div>
            </div>
            <div className={`relative h-7 flex-1 overflow-hidden rounded-md ${track}`}>
              <div className={`h-full rounded-md ${bar}`} style={{ width: `${Math.max(2, (r.worked / max) * 100)}%` }} />
              {r.planned !== r.worked && (
                <div
                  className={`absolute inset-y-0 left-0 rounded-md border border-dashed ${plannedMark}`}
                  style={{ width: `${(r.planned / max) * 100}%` }}
                  title={`Planned ${formatShiftDuration(r.planned)}`}
                />
              )}
            </div>
            <div className="w-28 shrink-0 text-right font-mono text-sm tabular-nums text-pub-ink">
              {formatShiftDuration(r.worked)}
              <div className="text-[11px] text-pub-muted">{formatHoursDecimal(r.worked)} h</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// A blank shift form. The actual-times fields stay empty until something differs.
const blankForm = { employeeId: "", date: "", start: "10:00", end: "17:00", note: "", actualStart: "", actualEnd: "", breakMinutes: "" };

const StaffTimesheet = () => {
  const { themeClasses, isDarkMode } = useTheme();
  const fc = useFormClasses();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [loading, setLoading] = useState(true);
  // Ticks once a minute so "today" and the current-time line stay right.
  const [now, setNow] = useState(Date.now());

  const newEmployeeForm = useForm<{ name: string }>({ defaultValues: { name: "" } });

  const [tab, setTab] = useState<Tab>("schedule");

  // Manager mode gates planning (add, move, delete a shift). Logging the actual
  // times on a shift is open to everyone.
  const { isManager, pinIsSet, promptUnlock, promptChangePin, lock } = useManagerMode();

  // The week being viewed (Sunday-start), shared by Schedule and Hours.
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [hoursRange, setHoursRange] = useState<HoursRange>("week");

  // Calendar vs list for the schedule, remembered per browser. A phone starts on
  // the list, since seven day columns do not fit a narrow screen.
  const [scheduleView, setScheduleView] = useState<ScheduleView>(() => {
    const saved = localStorage.getItem("schedule-view");
    if (saved === "list" || saved === "calendar") return saved;
    return window.innerWidth < 640 ? "list" : "calendar";
  });
  useEffect(() => {
    localStorage.setItem("schedule-view", scheduleView);
  }, [scheduleView]);

  // The shift dialog. `editingShift` null means a new shift (manager only).
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [shiftForm, setShiftForm] = useState(blankForm);
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, shfts] = await Promise.all([
          getCollection<Employee>(EMPLOYEES_COLLECTION, "createdAt"),
          getCollection<ScheduleShift>(SCHEDULE_COLLECTION, "createdAt"),
        ]);
        setEmployees(emps);
        setShifts(shfts);
      } catch (error) {
        console.error("Failed to load timesheet:", error);
        toast({ title: "Error", description: "Failed to load the schedule from the database" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );
  const inactiveEmployees = useMemo(
    () => employees.filter((e) => !e.active).sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const addEmployee = async ({ name }: { name: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = employees.find((e) => e.name.trim().toLowerCase() === trimmed.toLowerCase());
    try {
      if (existing) {
        if (!existing.active) {
          await setEmployeeActive(existing, true);
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
      await setDocument(EMPLOYEES_COLLECTION, employee.id, employee);
      setEmployees((prev) => [employee, ...prev]);
      newEmployeeForm.reset();
      toast({ title: "Employee added", description: `${trimmed} added to the team` });
    } catch (error) {
      console.error("Failed to add employee:", error);
      toast({ title: "Error", description: "Failed to save employee to database" });
    }
  };

  const setEmployeeActive = async (employee: Employee, active: boolean) => {
    try {
      await updateDocument(EMPLOYEES_COLLECTION, employee.id, { active });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? { ...e, active } : e)));
      toast(
        active
          ? { title: "Back on the team", description: `${employee.name} can be scheduled again` }
          : { title: "Removed from the team", description: `${employee.name}'s past shifts are kept` },
      );
    } catch (error) {
      console.error("Failed to update employee:", error);
      toast({ title: "Error", description: "Failed to update employee" });
    }
  };

  // Open the dialog for a new shift, optionally pre-set to a day. Manager only.
  const openAddShift = (dayKey?: string) => {
    if (!isManager) {
      promptUnlock();
      return;
    }
    setEditingShift(null);
    setShiftForm({ ...blankForm, employeeId: activeEmployees[0]?.id ?? "", date: dayKey ?? toDateKey(new Date()) });
    setShiftDialogOpen(true);
  };

  // Open an existing shift. Everyone can: a manager sees the plan and the actual
  // times, everyone else only the actual times.
  const openShift = (shift: ScheduleShift) => {
    setEditingShift(shift);
    setShiftForm({
      employeeId: shift.employeeId,
      date: shift.date,
      start: shift.start,
      end: shift.end,
      note: shift.note ?? "",
      actualStart: shift.actualStart ?? "",
      actualEnd: shift.actualEnd ?? "",
      breakMinutes: breakMinutesOf(shift) ? String(breakMinutesOf(shift)) : "",
    });
    setShiftDialogOpen(true);
  };

  const saveShift = async () => {
    const breakMinutes = Math.max(0, Math.round(Number(shiftForm.breakMinutes) || 0));
    // The actual times, stored empty when they match the plan.
    const planStart = isManager || !editingShift ? shiftForm.start : editingShift.start;
    const planEnd = isManager || !editingShift ? shiftForm.end : editingShift.end;
    const actualStart = shiftForm.actualStart && shiftForm.actualStart !== planStart ? shiftForm.actualStart : "";
    const actualEnd = shiftForm.actualEnd && shiftForm.actualEnd !== planEnd ? shiftForm.actualEnd : "";
    if ((actualEnd || planEnd) <= (actualStart || planStart)) {
      toast({ title: "Check the times", description: "The end time must be after the start." });
      return;
    }
    if (breakMinutes > 600) {
      toast({ title: "Check the break", description: "The break is in minutes, like 30." });
      return;
    }
    const adjust = { actualStart, actualEnd, breakMinutes, adjustedAt: new Date().toISOString() };

    setSavingShift(true);
    try {
      // Locked: only the actual times and break are written.
      if (editingShift && !isManager) {
        await updateDocument(SCHEDULE_COLLECTION, editingShift.id, adjust);
        const updated: ScheduleShift = { ...editingShift, ...adjust };
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast({ title: "Shift updated", description: `${updated.employeeName}, counts ${formatShiftDuration(workedMinutes(updated))}` });
        setShiftDialogOpen(false);
        return;
      }
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
      const note = shiftForm.note.trim();
      const plan = {
        employeeId: employee.id,
        employeeName: employee.name,
        date: shiftForm.date,
        start: shiftForm.start,
        end: shiftForm.end,
        note,
      };
      if (editingShift) {
        const updated: ScheduleShift = { ...editingShift, ...plan, ...adjust, note: note || undefined };
        await updateDocument(SCHEDULE_COLLECTION, editingShift.id, { ...plan, ...adjust });
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast({ title: "Shift updated", description: `${employee.name}, ${formatDayHeading(updated.date)}` });
      } else {
        const shift: ScheduleShift = {
          id: generateShiftId(),
          ...plan,
          note: note || undefined,
          createdAt: new Date().toISOString(),
        };
        await setDocument(SCHEDULE_COLLECTION, shift.id, { ...shift, note });
        setShifts((prev) => [shift, ...prev]);
        toast({ title: "Shift added", description: `${employee.name}, ${formatDayHeading(shift.date)}` });
      }
      setShiftDialogOpen(false);
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
  const onThisWeek = toDateKey(weekStart) === toDateKey(startOfWeek(nowDate));

  // The Hours range: the viewed week, or the month that week starts in.
  const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
  const rangeFrom = hoursRange === "week" ? weekKeys[0] : toDateKey(monthStart);
  const rangeTo = hoursRange === "week" ? weekKeys[6] : toDateKey(monthEnd);
  const rangeLabel =
    hoursRange === "week"
      ? formatWeekRange(weekStart)
      : monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const rangeShifts = useMemo(() => shiftsInRange(shifts, rangeFrom, rangeTo), [shifts, rangeFrom, rangeTo]);
  const rangeTotal = totalWorkedMinutes(rangeShifts);
  // The Hours shift list, grouped by week and then by day so each gets its own heading.
  const rangeWeeks = useMemo(() => {
    const weeks: { weekKey: string; days: { dayKey: string; shifts: ScheduleShift[] }[] }[] = [];
    for (const shift of rangeShifts) {
      const weekKey = toDateKey(startOfWeek(parseDateKey(shift.date)));
      let week = weeks[weeks.length - 1];
      if (!week || week.weekKey !== weekKey) {
        week = { weekKey, days: [] };
        weeks.push(week);
      }
      let day = week.days[week.days.length - 1];
      if (!day || day.dayKey !== shift.date) {
        day = { dayKey: shift.date, shifts: [] };
        week.days.push(day);
      }
      day.shifts.push(shift);
    }
    return weeks;
  }, [rangeShifts]);

  const step = (dir: 1 | -1) => {
    if (tab === "hours" && hoursRange === "month") {
      setWeekStart(startOfWeek(new Date(weekStart.getFullYear(), weekStart.getMonth() + dir, 7)));
    } else {
      setWeekStart((w) => addDays(w, dir * 7));
    }
  };

  const exportCsv = () => {
    if (rangeShifts.length === 0) {
      toast({ title: "Nothing to export", description: "There are no shifts in this range" });
      return;
    }
    downloadCsv(`hours-${rangeFrom}-to-${rangeTo}.csv`, shiftsToCsv(rangeShifts));
  };

  const edgeBorder = "border-pub-edge";
  const edgeDivide = "divide-pub-edge";
  const slateBadge = "bg-pub-sunk text-pub-muted";
  const todayPill = `rounded-full border px-2 py-0.5 text-[11px] font-medium ${themeClasses.status.info}`;

  const loadingBlock = (
    <div className="flex flex-col items-center py-10 text-center">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-pub-muted" />
      <p className="text-sm text-pub-muted">Loading...</p>
    </div>
  );

  // Previous / range label / next, with a jump back to now. Shared by both tabs.
  const rangeNav = (label: string) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" aria-label="Previous" onClick={() => step(-1)} className={`min-h-[44px] ${themeClasses.button.ghost}`}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="min-w-[9.5rem] text-center text-sm font-semibold tabular-nums text-pub-ink">{label}</span>
      <Button variant="ghost" size="sm" aria-label="Next" onClick={() => step(1)} className={`min-h-[44px] ${themeClasses.button.ghost}`}>
        <ChevronRight className="h-5 w-5" />
      </Button>
      {!onThisWeek && (
        <Button variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))} className={`min-h-[44px] rounded-lg text-sm ${themeClasses.button.ghost}`}>
          Today
        </Button>
      )}
    </div>
  );

  const scheduleContent = (
    <div className="rounded-xl border bg-pub-paper border-pub-edge">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${edgeBorder}`}>
        {rangeNav(formatWeekRange(weekStart))}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs<ScheduleView>
            size="sm"
            label="Schedule view"
            value={scheduleView}
            onChange={setScheduleView}
            options={[
              { value: "calendar", label: "Calendar", icon: LayoutGrid },
              { value: "list", label: "List", icon: List },
            ]}
          />
          {isManager && (
            <Button onClick={() => openAddShift()} className={`min-h-[44px] rounded-full font-semibold ${themeClasses.button.primary}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add shift
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          loadingBlock
        ) : scheduleView === "calendar" ? (
          <VisualSchedule
            weekKeys={weekKeys}
            shifts={shifts}
            todayKey={todayKey}
            nowMin={nowMin}
            isManager={isManager}
            onOpenShift={openShift}
            onAddShift={openAddShift}
            themeClasses={themeClasses}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className={`divide-y ${edgeDivide}`}>
            {weekKeys.map((dayKey) => {
              const dayShifts = shiftsOnDay(shifts, dayKey);
              return (
                <div key={dayKey} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
                  <div className="flex w-36 shrink-0 items-center gap-2 sm:items-start sm:pt-2">
                    <span className="text-sm font-semibold text-pub-ink">{formatDayHeading(dayKey)}</span>
                    {dayKey === todayKey && <span className={todayPill}>Today</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    {dayShifts.length === 0 && <p className="py-2 text-[13px] text-pub-muted">No one scheduled</p>}
                    {dayShifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => openShift(shift)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hueFor(shift.employeeId).dot}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-pub-ink">{shift.employeeName}</span>
                            <span className="block truncate text-[13px] text-pub-muted">
                              <ShiftTimes shift={shift} />
                              {shift.note ? <span className="text-pub-muted">, {shift.note}</span> : null}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-pub-ink">
                          {formatShiftDuration(workedMinutes(shift))}
                        </span>
                      </button>
                    ))}
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => openAddShift(dayKey)}
                        className={`mt-0.5 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[13px] text-pub-muted ${themeClasses.interactive.hover}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add shift
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className={`border-t px-4 py-2.5 text-[13px] ${edgeBorder} text-pub-muted`}>
        {isManager
          ? "Tap a shift to change it. Staff can log their actual times and breaks even when this is locked."
          : "Tap a shift to log the actual start, end or a break. Adding or moving shifts needs a manager."}
      </p>
    </div>
  );

  const hoursContent = (
    <div className="rounded-xl border bg-pub-paper border-pub-edge">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${edgeBorder}`}>
        {rangeNav(rangeLabel)}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs<HoursRange>
            size="sm"
            label="Range"
            value={hoursRange}
            onChange={setHoursRange}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <Button onClick={exportCsv} className={`min-h-[44px] rounded-full font-semibold ${themeClasses.button.secondary}`}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          loadingBlock
        ) : rangeShifts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Clock className="mb-3 h-8 w-8 text-pub-muted" />
            <h3 className="font-display font-semibold text-pub-ink mb-1 text-base">No shifts in this range</h3>
            <p className="text-sm text-pub-muted">Hours are counted from the schedule.</p>
          </div>
        ) : (
          <>
            <HoursBars shifts={rangeShifts} themeClasses={themeClasses} isDarkMode={isDarkMode} />
            <div className={`mt-3 flex items-center justify-between border-t pt-3 ${edgeBorder}`}>
              <span className="text-sm font-semibold text-pub-ink">Total</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-pub-ink">
                {formatShiftDuration(rangeTotal)}
                <span className="ml-2 text-[13px] font-normal text-pub-muted">{formatHoursDecimal(rangeTotal)} h</span>
              </span>
            </div>

            <h3 className="font-display font-semibold text-pub-ink mb-2 mt-6 text-sm">Shifts</h3>
            <div className="space-y-4">
              {rangeWeeks.map((week) => (
                <section key={week.weekKey} aria-label={`Week of ${formatWeekRange(parseDateKey(week.weekKey))}`}>
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-pub-sunk border-pub-edge px-3 py-2">
                    <span className="text-[13px] font-semibold text-pub-ink">
                      Week of {formatWeekRange(parseDateKey(week.weekKey))}
                    </span>
                    <span className="font-mono text-[13px] font-semibold tabular-nums text-pub-ink">
                      {formatShiftDuration(totalWorkedMinutes(week.days.flatMap((day) => day.shifts)))}
                    </span>
                  </div>
                  <div className={`divide-y ${edgeDivide}`}>
                    {week.days.map((day) => (
                      <div key={day.dayKey} className="flex flex-col py-1.5 sm:flex-row sm:gap-4">
                        <div className="flex w-36 shrink-0 items-center gap-2 px-1 pt-2 sm:items-start sm:pt-3">
                          <span className="text-[13px] font-semibold text-pub-ink">{formatDayHeading(day.dayKey)}</span>
                          {day.dayKey === todayKey && <span className={todayPill}>Today</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          {day.shifts.map((shift) => (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => openShift(shift)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left ${themeClasses.interactive.hover} ${themeClasses.interactive.focus}`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hueFor(shift.employeeId).dot}`} />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-pub-ink">{shift.employeeName}</span>
                                  <span className="block truncate text-[13px] text-pub-muted">
                                    <ShiftTimes shift={shift} />
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-pub-ink">
                                {formatShiftDuration(workedMinutes(shift))}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const teamContent = (
    <div className="rounded-xl border bg-pub-paper border-pub-edge">
      <div className="p-4">
        <form onSubmit={newEmployeeForm.handleSubmit(addEmployee)} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Label className="sr-only">Employee name</Label>
            <Input
              {...newEmployeeForm.register("name", { required: true })}
              placeholder="Add someone, e.g. Sarah Chen"
              className={`${fc.input} flex-1`}
            />
          </div>
          <Button type="submit" className={fc.primary}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add employee
          </Button>
        </form>

        {loading ? (
          loadingBlock
        ) : activeEmployees.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Users className="mb-3 h-8 w-8 text-pub-muted" />
            <h3 className="font-display font-semibold text-pub-ink mb-1 text-base">No one on the team yet</h3>
            <p className="text-sm text-pub-muted">Add someone above so they can be scheduled.</p>
          </div>
        ) : (
          <div className={`divide-y ${edgeDivide}`}>
            {activeEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${slateBadge}`}>
                    <User className="h-5 w-5" />
                  </span>
                  <span className="truncate font-medium text-pub-ink">{employee.name}</span>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hueFor(employee.id).dot}`} title="Colour on the schedule" />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${employee.name}`} className={`min-h-[44px] hover:text-red-600 ${themeClasses.button.ghost}`}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-md rounded-xl border-pub-edge bg-pub-paper p-5 sm:p-6">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-[19px] font-semibold leading-tight text-pub-ink">Remove {employee.name}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-pub-muted">
                        They come off the list for new shifts. Their past shifts and hours are kept, and you can bring them back any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FormActions className="mt-2">
                      <AlertDialogCancel type="button" className={fc.ghost}>Cancel</AlertDialogCancel>
                      <AlertDialogAction type="button" onClick={() => setEmployeeActive(employee, false)} className={fc.primary}>
                        Remove
                      </AlertDialogAction>
                    </FormActions>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {inactiveEmployees.length > 0 && (
          <div className={`mt-4 border-t pt-3 ${edgeBorder}`}>
            <h3 className="font-display font-semibold text-pub-ink mb-1 text-[13px]">No longer on the team</h3>
            {inactiveEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between gap-3 py-1">
                <span className="truncate text-sm text-pub-muted">{employee.name}</span>
                <Button variant="ghost" onClick={() => setEmployeeActive(employee, true)} className={`min-h-[44px] rounded-lg text-sm ${themeClasses.button.ghost}`}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Bring back
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // The manager lock, shown once beside the tabs so its state is always visible.
  const managerControl = isManager ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium ${themeClasses.status.success}`}>
        <LockOpen className="h-3.5 w-3.5" />
        Manager
      </span>
      <Button variant="ghost" onClick={promptChangePin} className={`min-h-[44px] rounded-lg ${themeClasses.button.ghost}`}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        {pinIsSet ? "Change PIN" : "Set PIN"}
      </Button>
      <Button onClick={lock} className={`min-h-[44px] rounded-lg ${themeClasses.button.secondary}`}>
        <Lock className="mr-2 h-4 w-4" />
        Lock
      </Button>
    </div>
  ) : (
    <Button onClick={() => promptUnlock()} className={`min-h-[44px] rounded-lg font-semibold ${themeClasses.button.secondary}`}>
      <Lock className="mr-2 h-4 w-4" />
      Manager sign in
    </Button>
  );

  // What the dialog is doing: planning (manager) or only logging actual times.
  const planning = isManager || !editingShift;
  const preview = {
    start: planning ? shiftForm.start : editingShift?.start ?? "",
    end: planning ? shiftForm.end : editingShift?.end ?? "",
    actualStart: shiftForm.actualStart,
    actualEnd: shiftForm.actualEnd,
    breakMinutes: Number(shiftForm.breakMinutes) || 0,
  };
  const formAdjusted = isAdjusted(preview);

  const shiftDialog = (
    <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
      <DialogContent className="sm:max-w-md rounded-xl border-pub-edge bg-pub-paper p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] font-semibold leading-tight text-pub-ink flex items-center gap-2">
            {editingShift ? <PencilLine className="h-5 w-5" /> : <CalendarPlus className="h-5 w-5" />}
            {!editingShift ? "Add a shift" : isManager ? "Edit shift" : "Log actual times"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-pub-muted">
            {!editingShift
              ? "Plan who works and when. Staff see this on the schedule."
              : isManager
                ? "Change the plan, or log what really happened."
                : `${editingShift.employeeName}, ${formatDayHeading(editingShift.date)}. Planned ${formatTime12(editingShift.start)} to ${formatTime12(editingShift.end)}.`}
          </DialogDescription>
        </DialogHeader>

        {/* noValidate: saveShift does the checking; the browser's step check would refuse a 12 minute break. */}
        <form noValidate className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveShift(); }}>
        <FieldGrid>
            {planning && (
              <>
                <Field htmlFor="shift-employee" label="Employee" span={12} required>
                  <select
                    id="shift-employee"
                    value={shiftForm.employeeId}
                    onChange={(e) => setShiftForm((f) => ({ ...f, employeeId: e.target.value }))}
                    className={`${fc.input} w-full`}
                  >
                    {activeEmployees.length === 0 && <option value="">No employees yet</option>}
                    {editingShift && !activeEmployees.some((e) => e.id === editingShift.employeeId) && (
                      <option value={editingShift.employeeId}>{editingShift.employeeName}</option>
                    )}
                    {activeEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field htmlFor="shift-date" label="Day" span={6} required>
                  <Input
                    id="shift-date"
                    type="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm((f) => ({ ...f, date: e.target.value }))}
                    className={fc.input}
                  />
                </Field>

                <>
                  <Field htmlFor="shift-start" label="Start" span={3} half required>
                    <Input
                      id="shift-start"
                      type="time"
                      value={shiftForm.start}
                      onChange={(e) => setShiftForm((f) => ({ ...f, start: e.target.value }))}
                      className={`${fc.input} ${fc.mono}`}
                    />
                  </Field>
                  <Field htmlFor="shift-end" label="End" span={3} half required>
                    <Input
                      id="shift-end"
                      type="time"
                      value={shiftForm.end}
                      onChange={(e) => setShiftForm((f) => ({ ...f, end: e.target.value }))}
                      className={`${fc.input} ${fc.mono}`}
                    />
                  </Field>
                </>

                <Field htmlFor="shift-note" label="Note (optional)" span={12}>
                  <Input
                    id="shift-note"
                    value={shiftForm.note}
                    onChange={(e) => setShiftForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="e.g. opening, covering Sam"
                    className={fc.input}
                  />
                </Field>
              </>
            )}

            {editingShift && (
              <div className="col-span-2 space-y-3 rounded-lg border border-pub-edge bg-pub-paper p-3 sm:col-span-12">
                <div>
                  <p className="font-display text-sm font-semibold text-pub-ink">What actually happened</p>
                  <p className="text-[13px] text-pub-muted">Optional. Fill in only what was different from the plan.</p>
                </div>
                <FieldGrid>
                  <Field htmlFor="shift-actual-start" label="Started at" span={3} half>
                    <Input
                      id="shift-actual-start"
                      type="time"
                      value={shiftForm.actualStart}
                      onChange={(e) => setShiftForm((f) => ({ ...f, actualStart: e.target.value }))}
                      className={`${fc.input} ${fc.mono}`}
                    />
                  </Field>
                  <Field htmlFor="shift-actual-end" label="Left at" span={3} half>
                    <Input
                      id="shift-actual-end"
                      type="time"
                      value={shiftForm.actualEnd}
                      onChange={(e) => setShiftForm((f) => ({ ...f, actualEnd: e.target.value }))}
                      className={`${fc.input} ${fc.mono}`}
                    />
                  </Field>
                <Field htmlFor="shift-break" label="Break (minutes)" span={4} half>
                  <Input
                    id="shift-break"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={600}
                    step={5}
                    value={shiftForm.breakMinutes}
                    onChange={(e) => setShiftForm((f) => ({ ...f, breakMinutes: e.target.value }))}
                    placeholder="0"
                    className={`${fc.input} ${fc.mono}`}
                  />
                </Field>
                </FieldGrid>
                <div className={`flex items-center justify-between gap-3 border-t pt-2 text-sm ${edgeBorder}`}>
                  <span className="text-pub-muted">
                    <ShiftTimes shift={preview} />
                  </span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-pub-ink">
                    {formatShiftDuration(workedMinutes(preview))}
                  </span>
                </div>
                {formAdjusted && (
                  <button
                    type="button"
                    onClick={() => setShiftForm((f) => ({ ...f, actualStart: "", actualEnd: "", breakMinutes: "" }))}
                    className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] underline-offset-2 hover:underline text-pub-muted"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Back to the planned times
                  </button>
                )}
              </div>
            )}
        </FieldGrid>

        <FormActions className="mt-2">
          {editingShift && isManager && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className={`h-11 w-full rounded-full px-5 text-[15px] font-medium sm:w-auto sm:mr-auto ${themeClasses.button.ghost} ${themeClasses.text.danger}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md rounded-xl border-pub-edge bg-pub-paper p-5 sm:p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-[19px] font-semibold leading-tight text-pub-ink">Remove this shift?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-pub-muted">
                    This removes {editingShift.employeeName}'s shift on {formatDayHeading(editingShift.date)},{" "}
                    {formatTime12(editingShift.start)} to {formatTime12(editingShift.end)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <FormActions className="mt-2">
                  <AlertDialogCancel type="button" className={fc.ghost}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    onClick={async () => {
                      await deleteShift(editingShift);
                      setShiftDialogOpen(false);
                    }}
                    className={fc.primary}
                  >
                    Remove
                  </AlertDialogAction>
                </FormActions>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button type="button" variant="ghost" onClick={() => setShiftDialogOpen(false)} className={fc.ghost}>
            Cancel
          </Button>
          <Button type="submit" disabled={savingShift} className={fc.primary}>
            {savingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingShift ? "Save" : "Add shift"}
          </Button>
        </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <StaffLayout
      actions={managerControl}
      tabs={
        <SegmentedTabs<Tab>
          label="Timesheet sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "schedule", label: "Schedule", icon: CalendarDays },
            { value: "hours", label: "Hours", icon: BarChart3 },
            { value: "team", label: "Team", icon: Users },
          ]}
        />
      }
      tool="timesheet"
      title="Timesheet"
      subtitle="The schedule, the hours, and the team"
      icon={Clock}
      iconColor="text-pub-ink"
      backTo="/staff/ai"
      backLabel="Back"
    >
      {tab === "schedule" ? scheduleContent : tab === "hours" ? hoursContent : teamContent}
      {shiftDialog}
    </StaffLayout>
  );
};

export default StaffTimesheet;
