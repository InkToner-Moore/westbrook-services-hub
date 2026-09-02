// Field specifications for the in-chat confirmation check. These encode the
// brief's field tables exactly: which fields show, their necessity marker, and
// whether they show when blank. The confirmation UI renders from these specs; the
// deterministic/LLM providers fill values into the matching keys.
//
// Marker legend (from the brief):
//   'required' -> shown as "?"  = needed. If it is always-shown and still blank,
//                 Confirm is blocked until it is filled.
//   'optional' -> shown as "i"  = nice to have, never blocks.
//
// Visibility:
//   alwaysShown true  -> always in the check, even blank (an invitation to fill).
//   alwaysShown false -> "No-show if blank": only appears once it has a value.
import type { AiAction, Intent, ReceiptSubtype } from './types';

export type FieldKind = 'text' | 'phone' | 'email' | 'money' | 'date' | 'quantity' | 'toggle';

export interface FieldSpec {
  key: string;
  label: string;
  marker: 'required' | 'optional';
  alwaysShown: boolean;
  kind: FieldKind;
  // When true and empty, Confirm is blocked. Kept separate from the marker so a
  // field can read as "needed" (?) without forcing the counter to have it on hand
  // (e.g. a phone at cartridge intake). Only the genuine must-haves block.
  blocking?: boolean;
  // Optional hint shown as placeholder when the field is empty and editable.
  hint?: string;
}

// Shared across all four receipt types. Receipt Number is deliberately absent:
// it is system-generated and system-checked only, never shown for user check.
const RECEIPT_SHARED_TAIL: FieldSpec[] = [
  { key: 'notes', label: 'Notes', marker: 'required', alwaysShown: false, kind: 'text' },
  { key: 'gst', label: 'GST (5%)', marker: 'required', alwaysShown: true, kind: 'toggle' },
];

const CUSTOMER_FIELDS_NOSHOW: FieldSpec[] = [
  { key: 'customerName', label: 'Customer Name', marker: 'required', alwaysShown: false, kind: 'text' },
  { key: 'customerPhone', label: 'Customer Phone', marker: 'required', alwaysShown: false, kind: 'phone' },
  { key: 'customerEmail', label: 'Customer Email', marker: 'required', alwaysShown: false, kind: 'email' },
];

const DATE_FIELD: FieldSpec = { key: 'date', label: 'Date', marker: 'required', alwaysShown: true, kind: 'date' };

// Keyed by a spec id derived from action (+ receipt subtype).
export const FIELD_SPECS: Record<string, FieldSpec[]> = {
  'receipt:refill': [
    DATE_FIELD,
    { key: 'model', label: 'Model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'brand', label: 'Brand', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money', blocking: true },
    ...CUSTOMER_FIELDS_NOSHOW,
    ...RECEIPT_SHARED_TAIL,
  ],
  'receipt:supplies': [
    DATE_FIELD,
    { key: 'supply', label: 'Supply', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'quantity', label: 'Quantity', marker: 'optional', alwaysShown: true, kind: 'quantity' },
    { key: 'model', label: 'Model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money', blocking: true },
    ...CUSTOMER_FIELDS_NOSHOW,
    ...RECEIPT_SHARED_TAIL,
  ],
  'receipt:key': [
    DATE_FIELD,
    { key: 'keyModel', label: 'Key Model / Description', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money', blocking: true },
    ...CUSTOMER_FIELDS_NOSHOW,
    ...RECEIPT_SHARED_TAIL,
  ],
  // Shipping's per-item fields (courier, tracking, city, province, country, cost,
  // taxes) live in a repeated item block (ShipmentItemsEditor), not flat fields.
  // "Charge Tax" is the master toggle; per-item tax defaults to the destination
  // province's rate (GST/PST/HST) and stays editable in the item block.
  'receipt:shipping': [
    DATE_FIELD,
    { key: 'customerName', label: 'Customer Name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'customerPhone', label: 'Customer Phone', marker: 'required', alwaysShown: true, kind: 'phone' },
    { key: 'customerEmail', label: 'Customer Email', marker: 'required', alwaysShown: false, kind: 'email' },
    { key: 'gst', label: 'Charge Tax', marker: 'required', alwaysShown: true, kind: 'toggle' },
  ],
  'cartridge_create': [
    { key: 'customerName', label: 'Customer Name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'customerPhone', label: 'Customer Phone', marker: 'required', alwaysShown: true, kind: 'phone' },
    { key: 'brand', label: 'Brand', marker: 'required', alwaysShown: true, kind: 'text' },
    { key: 'model', label: 'Model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'type', label: 'Type', marker: 'required', alwaysShown: true, kind: 'text' },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money' },
    { key: 'notes', label: 'Notes', marker: 'required', alwaysShown: false, kind: 'text' },
  ],
  'cartridge_status': [
    { key: 'orderId', label: 'Order', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'status', label: 'New Status', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
  ],
  'note': [
    { key: 'content', label: 'Note', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'noteCategory', label: 'Category', marker: 'optional', alwaysShown: true, kind: 'text' },
  ],
  'inventory': [
    { key: 'keyName', label: 'Key Model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'inStock', label: 'In Stock', marker: 'optional', alwaysShown: true, kind: 'toggle' },
  ],
  'directory': [
    { key: 'linkName', label: 'Name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'url', label: 'URL', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'linkCategory', label: 'Category', marker: 'optional', alwaysShown: true, kind: 'text' },
    { key: 'linkDescription', label: 'Description', marker: 'optional', alwaysShown: false, kind: 'text' },
  ],
  'followup': [
    { key: 'customerName', label: 'Customer Name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'item', label: 'Item / Request', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'customerPhone', label: 'Customer Phone', marker: 'optional', alwaysShown: true, kind: 'phone' },
  ],
};

// Derive the spec id from an intent.
export function specIdFor(action: AiAction, subtype?: ReceiptSubtype): string | null {
  if (action === 'receipt') return subtype ? `receipt:${subtype}` : null;
  if (action === 'cartridge_create') return 'cartridge_create';
  if (action === 'cartridge_status') return 'cartridge_status';
  if (action === 'note') return 'note';
  if (action === 'inventory') return 'inventory';
  if (action === 'directory') return 'directory';
  if (action === 'followup') return 'followup';
  return null;
}

export function getFieldSpecs(intent: Intent): FieldSpec[] | null {
  const id = specIdFor(intent.action, intent.subtype);
  return id ? FIELD_SPECS[id] ?? null : null;
}

// A field is currently visible in the check if it is always-shown or has a value.
export function isFieldVisible(spec: FieldSpec, value: unknown): boolean {
  if (spec.alwaysShown) return true;
  return value !== null && value !== undefined && value !== '';
}

// Confirm is blocked while any blocking field is still empty.
export function missingRequired(specs: FieldSpec[], intent: Intent): FieldSpec[] {
  return specs.filter((s) => {
    if (!s.blocking) return false;
    if (s.kind === 'toggle') return false; // toggles always have a boolean value
    const v = intent.fields[s.key]?.value;
    return v === null || v === undefined || v === '';
  });
}
