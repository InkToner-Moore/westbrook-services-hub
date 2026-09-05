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
  Clock,
  Download,
  Loader2,
  LogIn,
  LogOut,
  User,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import {
  getCollection,
  setDocument,
  updateDocument,
  generateEmployeeId,
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

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, ents] = await Promise.all([
          getCollection<Employee>(EMPLOYEES_COLLECTION, "createdAt"),
          getCollection<TimeEntry>(TIME_ENTRIES_COLLECTION, "createdAt"),
        ]);
        setEmployees(emps);
        setEntries(ents);
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
          <div className="flex items-center gap-2">
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

  if (inShell) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${slateBadge}`}>
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>Timesheet</h1>
            <p className={`text-sm ${themeClasses.text.secondary}`}>Employees, the punch clock, and hours</p>
          </div>
        </div>
        {content}
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
            Add employees, punch the clock, and export hours.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
};

export default StaffTimesheet;
