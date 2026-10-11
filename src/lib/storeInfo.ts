import { getShopSettings, type ShopSettings } from './shopSettings';

// The studio (websites for small businesses) is a separate site. This is its staging
// address; switch it to https://studio.inktonermoore.ca when that domain is live.
export const STUDIO_URL = "https://studio.ink-toner-moore.pages.dev";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Westbrook+Mall+Calgary";
export const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export const formatHour = (h: number): string => `${h % 12 || 12} ${h % 24 < 12 ? "AM" : "PM"}`;

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

export function openState(
  now = calgaryNow(), week: ShopSettings['week'] = getShopSettings().week,
): { open: boolean; label: string } {
  const today = week[now.weekday];
  const open = today.open * 60 <= now.minutes && now.minutes < today.close * 60;
  return {
    open,
    label: open
      ? `Open now until ${formatHour(today.close)}`
      : now.minutes < today.open * 60
        ? `Opens today at ${formatHour(today.open)}`
        : `Closed now. Opens tomorrow at ${formatHour(week[(now.weekday + 1) % 7].open)}`,
  };
}
