// The routes a user can choose by hand when correcting a misroute or answering a
// "did you mean" prompt. Kept out of the component file so both the picker UI and
// the confirmation card can import the data and the label helper without tripping
// react-refresh.
import type { AiAction, ReceiptSubtype } from './types';

export interface RouteOption {
  label: string;
  action: AiAction;
  subtype?: ReceiptSubtype;
}

// Order is calm and grouped: receipts, cartridge orders, then the standalone tools.
export const ROUTE_OPTIONS: RouteOption[] = [
  { label: 'Refill receipt', action: 'receipt', subtype: 'refill' },
  { label: 'Sale receipt', action: 'receipt', subtype: 'supplies' },
  { label: 'Shipping receipt', action: 'receipt', subtype: 'shipping' },
  { label: 'Key receipt', action: 'receipt', subtype: 'key' },
  // "Record" is the user-facing name for the cartridge-refill workflow. The
  // internal ids stay cartridge_* (Firestore and lib/cartridges.ts key off them);
  // only the presentation says "Record". See PHASE-2-ARCH section 1.
  { label: 'Record a refill', action: 'cartridge_create' },
  { label: 'Update refill status', action: 'cartridge_status' },
  { label: 'Note', action: 'note' },
  { label: 'Check inventory', action: 'inventory_lookup' },
  { label: 'Update inventory', action: 'inventory' },
  { label: 'Directory link', action: 'directory' },
  // The only confirmable timesheet variant; punch/view run immediately. Used as
  // the slip title for an add-employee proposal and as a "did you mean" choice.
  { label: 'Add employee', action: 'timesheet' },
  { label: 'Track a parcel', action: 'track' },
];

export const sameRoute = (o: RouteOption, action?: AiAction, subtype?: ReceiptSubtype): boolean =>
  o.action === action && (o.action !== 'receipt' || o.subtype === subtype);

// A friendly label for a route, for the "did you mean ...?" prompt.
export function routeLabel(action: AiAction, subtype?: ReceiptSubtype): string | null {
  return ROUTE_OPTIONS.find((o) => sameRoute(o, action, subtype))?.label ?? null;
}
