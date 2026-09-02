// Built-in package tracking. For now the Artifact shows a clean detected-courier
// card that opens the official carrier page in a new tab, because every carrier
// blocks iframe embedding (see docs/ai-mode/00-research.md). A live-status adapter
// (WhereParcel or a better option) can slot in behind this same shape later.

export type Courier = 'FedEx' | 'Purolator' | 'UPS' | 'Canada Post' | 'DHL';

// Verified deep-link patterns (docs/ai-mode/00-research.md).
const CARRIER_URLS: Record<Courier, (n: string) => string> = {
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  Purolator: (n) => `https://www.purolator.com/en/shipping/tracker?pins=${encodeURIComponent(n)}`,
  UPS: (n) => `https://www.ups.com/track?trackingNumber=${encodeURIComponent(n)}`,
  'Canada Post': (n) =>
    `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${encodeURIComponent(n)}`,
  DHL: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}&brand=DHL`,
};

export const COURIERS: Courier[] = ['FedEx', 'Purolator', 'UPS', 'Canada Post', 'DHL'];

export interface TrackingCard {
  courier: Courier | null;
  trackingNumber: string;
  url: string | null;
}

export function buildTrackingCard(courier: Courier | null, trackingNumber: string): TrackingCard {
  const url = courier ? CARRIER_URLS[courier](trackingNumber) : null;
  return { courier, trackingNumber, url };
}

export function carrierUrl(courier: Courier, trackingNumber: string): string {
  return CARRIER_URLS[courier](trackingNumber);
}
