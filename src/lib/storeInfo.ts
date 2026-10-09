export const PHONE_DISPLAY = "(403) 686-2835";
export const PHONE_HREF = "tel:4036862835";
export const EMAIL = "inktonerandmoore@gmail.com";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Westbrook+Mall+Calgary";
// One entry per JS weekday, starting with Sunday. Hours use the 24-hour clock.
export const WEEK = [
  { day: "Sunday", open: 11, close: 17 },
  { day: "Monday", open: 10, close: 19 },
  { day: "Tuesday", open: 10, close: 19 },
  { day: "Wednesday", open: 10, close: 21 },
  { day: "Thursday", open: 10, close: 21 },
  { day: "Friday", open: 10, close: 21 },
  { day: "Saturday", open: 10, close: 18 },
];

export const formatHour = (h: number): string => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

// The shop's clock, not the visitor's: another time zone still sees Calgary's today.
export function calgaryNow(date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday")),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function openState(now = calgaryNow()): { open: boolean; label: string } {
  const today = WEEK[now.weekday];
  const open = today.open * 60 <= now.minutes && now.minutes < today.close * 60;
  return {
    open,
    label: open
      ? `Open now until ${formatHour(today.close)}`
      : now.minutes < today.open * 60
        ? `Opens today at ${formatHour(today.open)}`
        : `Closed now. Opens tomorrow at ${formatHour(WEEK[(now.weekday + 1) % 7].open)}`,
  };
}
