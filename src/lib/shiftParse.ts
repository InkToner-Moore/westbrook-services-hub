// Turns the way people type shifts into the schedule model: "4-9", "10 to 5:30",
// "4pm to 7pm", "oct 8, oct9, 13, 15", "the 5th", "today", "30 min break". Pure
// (no React, no Firestore) so the chat router, the timesheet executor and the
// parser tests all share one reading. Times come back as 'HH:MM' 24-hour and
// days as 'YYYY-MM-DD', matching lib/schedule.
import { parseHhmm, toDateKey } from './schedule';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const WEEKDAY_RE = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|');

const TIME = '(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.|a|p)?';
const RANGE_RE = new RegExp(`(?<![\\d:])${TIME}\\s*(?:-|–|to|till|until|til)\\s*${TIME}(?!\\d|:\\d)`, 'i');

type Meridiem = 'am' | 'pm' | null;
const meridiem = (raw?: string): Meridiem => (raw ? (raw.toLowerCase().startsWith('a') ? 'am' : 'pm') : null);

function toMinutes(h: number, min: number, mer: Meridiem): number | null {
  if (min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    return ((h % 12) + (mer === 'pm' ? 12 : 0)) * 60 + min;
  }
  if (h > 23) return null;
  return h * 60 + min;
}

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// The shop is a daytime counter (roughly 10:00 to 21:00), so a bare hour reads
// the way staff mean it: 8 to 11 is the morning, 12 and 1 to 7 are the afternoon.
function guessStart(h: number, min: number): number {
  if (h >= 13 || h === 0) return h * 60 + min;
  if (h === 12) return 12 * 60 + min;
  return (h >= 8 ? h : h + 12) * 60 + min;
}

// A time range from free text ("4-9", "10 to 5:30", "4pm to 7pm", "16:00-21:00").
// A bare end hour is read as the first time after the start. Returns null when no
// range is present; `text` is what is left once the range is cut out.
export function parseTimeRange(text: string): { start: string; end: string; rest: string } | null {
  let from = 0;
  for (;;) {
    const slice = text.slice(from);
    const m = RANGE_RE.exec(slice);
    if (!m) return null;
    const at = from + m.index;
    // "oct 5-9" is a span of days, not a time: skip a range that follows a month.
    const before = text.slice(0, at).toLowerCase();
    if (new RegExp(`(?:${MONTH_RE})\\.?\\s*$`).test(before)) {
      from = at + m[0].length;
      continue;
    }
    const sh = Number(m[1]);
    const sm = m[2] ? Number(m[2]) : 0;
    const eh = Number(m[4]);
    const em = m[5] ? Number(m[5]) : 0;
    let sMer = meridiem(m[3]);
    const eMer = meridiem(m[6]);
    // "4-9pm": a single trailing pm covers the start too when that keeps it in order.
    if (!sMer && eMer === 'pm' && sh < 12 && sh < (eh === 12 ? 0 : eh)) sMer = 'pm';
    const start = sMer ? toMinutes(sh, sm, sMer) : guessStart(sh, sm);
    if (start == null) return null;
    let end = eMer ? toMinutes(eh, em, eMer) : eh * 60 + em;
    if (end == null) return null;
    if (!eMer && end <= start && eh <= 12) end += 12 * 60;
    if (end <= start || end > 24 * 60 - 1) return null;
    return { start: hhmm(start), end: hhmm(end), rest: `${text.slice(0, at)} ${text.slice(at + m[0].length)}` };
  }
}

// One clock time from a field or phrase ("8", "8pm", "7:30", "19:30"). With no
// am/pm, the reading nearest `near` (minutes past midnight, e.g. the planned end)
// wins, so "left at 8" on a shift ending 19:00 is 20:00.
export function parseClockTime(raw: string, near?: number | null): string | null {
  const m = new RegExp(`^\\s*(?:at\\s+)?${TIME}\\s*$`, 'i').exec(raw || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const mer = meridiem(m[3]);
  if (mer) {
    const v = toMinutes(h, min, mer);
    return v == null ? null : hhmm(v);
  }
  if (h > 23 || min > 59) return null;
  if (h >= 13 || h === 0) return hhmm(h * 60 + min);
  const am = (h % 12) * 60 + min;
  const pm = am + 12 * 60;
  if (near == null) return hhmm(guessStart(h, min));
  return hhmm(Math.abs(am - near) <= Math.abs(pm - near) ? am : pm);
}

// Break minutes from a phrase ("30 min break", "break of 45", "1 hour break",
// "half hour break") or a bare number in a field. Null when none is named.
export function parseBreakMinutes(text: string): number | null {
  const t = (text || '').toLowerCase();
  if (/^\s*\d{1,3}\s*$/.test(t)) return Number(t);
  if (/\bhalf(?:\s+an?)?\s+hour\b/.test(t) && /\b(?:break|lunch)\b/.test(t)) return 30;
  const unit = '(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)';
  const a = new RegExp(`(\\d{1,3}(?:\\.\\d)?)\\s*-?\\s*${unit}\\b[^.;]{0,20}\\b(?:break|lunch)\\b`).exec(t);
  const b = new RegExp(`\\b(?:break|lunch)\\b[^.;\\d]{0,16}(\\d{1,3}(?:\\.\\d)?)\\s*${unit}?\\b`).exec(t);
  const hit = a || b;
  if (!hit) return null;
  const n = Number(hit[1]);
  const mins = /^h/.test(hit[2] || '') ? n * 60 : n;
  return Number.isFinite(mins) && mins >= 0 && mins <= 600 ? Math.round(mins) : null;
}

// Every day named in free text, as date keys, in the order given, no repeats.
// Understands "oct 8, oct9, 13, 15" (the month carries on to the bare numbers),
// "the 5th", "10/8", "2026-10-08", "today", "tomorrow", "yesterday" and weekday
// names (the next one coming, or "last friday"). A bare number with no month
// means that day of the current month. Returns [] when no day is named.
export function parseDays(text: string, ref: Date = new Date()): string[] {
  const out: string[] = [];
  const push = (d: Date) => {
    const k = toDateKey(d);
    if (!out.includes(k)) out.push(k);
  };
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const plus = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  // "oct9" is typed as often as "oct 9": split a month glued to its day.
  let t = ` ${(text || '').toLowerCase()} `.replace(new RegExp(`\\b(${MONTH_RE})(\\d)`, 'g'), '$1 $2');

  t = t.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => {
    push(new Date(Number(y), Number(m) - 1, Number(d)));
    return ' ';
  });
  t = t.replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (_, m, d, y) => {
    const year = y ? (Number(y) < 100 ? 2000 + Number(y) : Number(y)) : today.getFullYear();
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) push(new Date(year, Number(m) - 1, Number(d)));
    return ' ';
  });
  if (/\btoday\b|\btonight\b/.test(t)) push(today);
  if (/\btomorrow\b/.test(t)) push(plus(1));
  if (/\byesterday\b/.test(t)) push(plus(-1));
  t = t.replace(new RegExp(`\\b(last\\s+|next\\s+|this\\s+)?(${WEEKDAY_RE})\\b`, 'g'), (_, mod, name) => {
    const target = WEEKDAYS[name];
    const diff = (target - today.getDay() + 7) % 7;
    if (mod && mod.trim() === 'last') push(plus(diff === 0 ? -7 : diff - 7));
    else if (mod && mod.trim() === 'next') push(plus(diff === 0 ? 7 : diff));
    else push(plus(diff));
    return ' ';
  });

  // Month names and day numbers, left to right. A month sets the month for the
  // numbers that follow it; numbers before any month use the current month.
  let month = today.getMonth();
  let year = today.getFullYear();
  const tok = new RegExp(`\\b(${MONTH_RE})\\b\\.?|(?<![\\d:.$])\\b(\\d{1,2})(?:st|nd|rd|th)?\\b(?![\\d:%]|\\s*(?:am|pm|min|mins|minutes?|hours?|hrs?)\\b)`, 'g');
  let m: RegExpExecArray | null;
  while ((m = tok.exec(t))) {
    if (m[1]) {
      month = MONTHS[m[1]];
      // A month well behind today means next year ("jan 3" said in November).
      year = month < today.getMonth() - 5 ? today.getFullYear() + 1 : today.getFullYear();
    } else {
      const day = Number(m[2]);
      if (day >= 1 && day <= 31) {
        const d = new Date(year, month, day);
        if (d.getMonth() === month) push(d);
      }
    }
  }
  return out;
}

// A short label for a list of day keys, like "Oct 8, 9, 15" (month named once per
// run), for the confirmation slip and chat lines.
export function describeDays(keys: string[]): string {
  let lastMonth = -1;
  return keys
    .map((k) => {
      const [y, mo, d] = k.split('-').map(Number);
      const date = new Date(y, mo - 1, d);
      const label = mo - 1 === lastMonth ? String(d) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      lastMonth = mo - 1;
      return label;
    })
    .join(', ');
}

// Whether 'HH:MM' strings are a valid, ordered pair.
export function validSpan(start: string, end: string): boolean {
  const s = parseHhmm(start);
  const e = parseHhmm(end);
  return s != null && e != null && e > s;
}

// Whether a fragment is nothing but days ("21", "oct 9", "the 15th", "friday").
// The chat splitter uses it to keep a comma-separated day list with its shift
// instead of reading a stray "21" as a new request.
export function isDayList(text: string): boolean {
  const t = (text || '').toLowerCase().replace(new RegExp(`\\b(${MONTH_RE})(\\d)`, 'g'), '$1 $2');
  if (!/[a-z0-9]/.test(t)) return false;
  const rest = t
    .replace(new RegExp(`\\b(?:${MONTH_RE}|${WEEKDAY_RE}|today|tomorrow|yesterday|the|and|on)\\b\\.?`, 'g'), ' ')
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\b/g, ' ')
    .replace(/[\s,;:&.]+/g, '');
  return rest === '';
}
