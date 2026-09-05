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

export type FieldKind = 'text' | 'phone' | 'email' | 'money' | 'date' | 'quantity' | 'toggle' | 'select';

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
  // For kind 'select': the fixed list of choices shown in the dropdown. The stored
  // value is the chosen string exactly as it appears here.
  options?: readonly string[];
}

// The fixed Note categories. Free text is gone: a note is filed under one of
// these so the counter picks from a short list instead of inventing a label.
// Exported so the note executor and any other reader share one source of truth.
export const NOTE_CATEGORIES = ['General', 'Customer', 'Supplier', 'Repair', 'Reminder', 'Other'] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

// Shared across all four receipt types. Receipt Number is deliberately absent:
// it is system-generated and system-checked only, never shown for user check.
const RECEIPT_SHARED_TAIL: FieldSpec[] = [
  { key: 'notes', label: 'Notes', marker: 'required', alwaysShown: false, kind: 'text' },
  { key: 'gst', label: 'Charge GST (5%)', marker: 'required', alwaysShown: true, kind: 'toggle' },
];

const CUSTOMER_FIELDS_NOSHOW: FieldSpec[] = [
  { key: 'customerName', label: 'Customer name', marker: 'required', alwaysShown: false, kind: 'text' },
  { key: 'customerPhone', label: 'Customer phone', marker: 'required', alwaysShown: false, kind: 'phone' },
  { key: 'customerEmail', label: 'Customer email', marker: 'required', alwaysShown: false, kind: 'email' },
];

const DATE_FIELD: FieldSpec = { key: 'date', label: 'Date', marker: 'required', alwaysShown: true, kind: 'date' };

// Keyed by a spec id derived from action (+ receipt subtype).
export const FIELD_SPECS: Record<string, FieldSpec[]> = {
  'receipt:refill': [
    DATE_FIELD,
    // A toner refill: the model and brand describe the cartridge, so name them
    // that way instead of a bare "Model" that reads like a device.
    { key: 'brand', label: 'Cartridge brand', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'model', label: 'Cartridge model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money', blocking: true },
    ...CUSTOMER_FIELDS_NOSHOW,
    ...RECEIPT_SHARED_TAIL,
  ],
  // A plain supplies sale (a box, packing tape, a custom item). It has no "Model":
  // the one item field is a free "Item or description" so selling a box never asks
  // for a device model.
  'receipt:supplies': [
    DATE_FIELD,
    { key: 'supply', label: 'Item or description', marker: 'required', alwaysShown: true, kind: 'text', blocking: true, hint: 'e.g. large moving box' },
    { key: 'quantity', label: 'Quantity', marker: 'optional', alwaysShown: true, kind: 'quantity' },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money', blocking: true },
    ...CUSTOMER_FIELDS_NOSHOW,
    ...RECEIPT_SHARED_TAIL,
  ],
  'receipt:key': [
    DATE_FIELD,
    { key: 'keyModel', label: 'Key or description', marker: 'required', alwaysShown: true, kind: 'text', blocking: true, hint: 'e.g. house key, KW1' },
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
    { key: 'customerName', label: 'Customer name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'customerPhone', label: 'Customer phone', marker: 'required', alwaysShown: true, kind: 'phone' },
    { key: 'customerEmail', label: 'Customer email', marker: 'required', alwaysShown: false, kind: 'email' },
    { key: 'gst', label: 'Charge tax', marker: 'required', alwaysShown: true, kind: 'toggle' },
  ],
  // Record a NEW refill (the cartridge intake). Brand/model/type describe the
  // cartridge, so they are named as such; the customer's contact rides along.
  'cartridge_create': [
    { key: 'customerName', label: 'Customer name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'customerPhone', label: 'Customer phone', marker: 'required', alwaysShown: true, kind: 'phone' },
    { key: 'brand', label: 'Cartridge brand', marker: 'required', alwaysShown: true, kind: 'text' },
    { key: 'model', label: 'Cartridge model', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'type', label: 'Cartridge type', marker: 'required', alwaysShown: true, kind: 'text', hint: 'e.g. black, colour, drum' },
    { key: 'price', label: 'Price', marker: 'required', alwaysShown: true, kind: 'money' },
    { key: 'notes', label: 'Notes', marker: 'required', alwaysShown: false, kind: 'text' },
  ],
  'cartridge_status': [
    { key: 'orderId', label: 'Order number', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'status', label: 'New status', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
  ],
  'note': [
    { key: 'content', label: 'Note', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'noteCategory', label: 'Category', marker: 'optional', alwaysShown: true, kind: 'select', options: NOTE_CATEGORIES },
  ],
  'inventory': [
    { key: 'keyName', label: 'Item name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'inStock', label: 'In stock', marker: 'optional', alwaysShown: true, kind: 'toggle' },
  ],
  'directory': [
    { key: 'linkName', label: 'Name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'url', label: 'URL', marker: 'required', alwaysShown: true, kind: 'text', blocking: true },
    { key: 'linkCategory', label: 'Category', marker: 'optional', alwaysShown: true, kind: 'text' },
    { key: 'linkDescription', label: 'Description', marker: 'optional', alwaysShown: false, kind: 'text' },
  ],
  // The only confirmable timesheet variant: adding an employee. Punch in/out and
  // the read views run immediately, with no slip. See PHASE-2.md item 6.
  'timesheet_add_employee': [
    { key: 'employeeName', label: 'Employee name', marker: 'required', alwaysShown: true, kind: 'text', blocking: true, hint: 'e.g. Sarah Chen' },
  ],
};

// Derive the spec id from an intent. `op` is the timesheet operation carried on
// intent.fields.op; only add_employee is confirmable, so the other timesheet ops
// return null (they run immediately with no slip).
export function specIdFor(action: AiAction, subtype?: ReceiptSubtype, op?: string): string | null {
  if (action === 'receipt') return subtype ? `receipt:${subtype}` : null;
  if (action === 'cartridge_create') return 'cartridge_create';
  if (action === 'cartridge_status') return 'cartridge_status';
  if (action === 'note') return 'note';
  if (action === 'inventory') return 'inventory';
  if (action === 'directory') return 'directory';
  if (action === 'timesheet') return op === 'add_employee' ? 'timesheet_add_employee' : null;
  return null;
}

export function getFieldSpecs(intent: Intent): FieldSpec[] | null {
  const op = intent.fields.op?.value != null ? String(intent.fields.op.value) : undefined;
  const id = specIdFor(intent.action, intent.subtype, op);
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
