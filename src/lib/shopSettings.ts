import { useSyncExternalStore } from 'react';
import { getDocument, setDocument } from '@/lib/firestore';

export interface ShopSettings {
  phone: string;
  email: string;
  week: { open: number; close: number }[];
  addressLines: string[];
  thankYou: string;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  phone: '(403) 686-2835',
  email: 'contact@inktonermoore.ca',
  week: [
    { open: 11, close: 17 },
    { open: 10, close: 19 },
    { open: 10, close: 19 },
    { open: 10, close: 19 },
    { open: 10, close: 21 },
    { open: 10, close: 21 },
    { open: 10, close: 18 },
  ],
  addressLines: ['1200 37 Street SW, Unit 3b', 'Calgary, AB T3C 1S2'],
  thankYou: 'Thank you for choosing Ink, Toner & Moore at Westbrook Mall.',
};

const validString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 120;

export function sanitizeShopSettings(raw: unknown): ShopSettings {
  try {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<ShopSettings>;
    const week = data.week;
    const validWeek = Array.isArray(week) && week.length === 7 && Array.from(week).every((day) =>
      day && Number.isInteger(day.open) && Number.isInteger(day.close)
      && day.open >= 0 && day.open < day.close && day.close <= 24);
    const address = data.addressLines;
    const validAddress = Array.isArray(address) && address.length >= 1 && address.length <= 3
      && Array.from(address).every(validString);
    return {
      phone: validString(data.phone) ? data.phone : DEFAULT_SHOP_SETTINGS.phone,
      email: validString(data.email) ? data.email : DEFAULT_SHOP_SETTINGS.email,
      week: (validWeek ? week : DEFAULT_SHOP_SETTINGS.week)
        .map(({ open, close }) => ({ open, close })),
      addressLines: [...(validAddress ? address : DEFAULT_SHOP_SETTINGS.addressLines)],
      thankYou: validString(data.thankYou) ? data.thankYou : DEFAULT_SHOP_SETTINGS.thankYou,
    };
  } catch {
    return DEFAULT_SHOP_SETTINGS;
  }
}

const CACHE_KEY = 'shop-settings-cache';
let current = DEFAULT_SHOP_SETTINGS;
try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached !== null) current = sanitizeShopSettings(JSON.parse(cached));
} catch { /* Storage may be unavailable. */ }

const listeners = new Set<() => void>();
export const getShopSettings = (): ShopSettings => current;
export function subscribeShopSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useShopSettings(): ShopSettings {
  return useSyncExternalStore(subscribeShopSettings, getShopSettings, getShopSettings);
}

function update(next: ShopSettings, clearCache = false) {
  current = next;
  try {
    if (clearCache) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch { /* Keep the in-memory settings. */ }
  listeners.forEach((listener) => listener());
}

let loadPromise: Promise<void> | undefined;
export function loadShopSettings(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const data = await getDocument<unknown>('settings', 'shop');
        if (data === null) update(DEFAULT_SHOP_SETTINGS, true);
        else update(sanitizeShopSettings(data));
      } catch { /* Keep cached settings on permission or connection errors. */ }
    })();
  }
  return loadPromise;
}

export async function saveShopSettings(next: ShopSettings): Promise<void> {
  const settings = sanitizeShopSettings(next);
  await setDocument('settings', 'shop', { ...settings, updatedAt: new Date().toISOString() });
  update(settings);
}

export const phoneHref = (phone: string): string => `tel:${phone.replace(/\D/g, '')}`;
