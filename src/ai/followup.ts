// Apply a conversational follow-up to the confirmation slip that is already open.
// When the counter has a slip up and then says "make it $40", "no GST", "the phone
// is 403 555 1212", "change the courier to FedEx", or "add another FedEx to Calgary
// $20", that message should EDIT the open slip, not start a new task. The caller
// decides it is a follow-up (there is an active slip and the message does not route
// to an action of its own); this module does the merge.
//
// The rule for merging: re-run the same action's field extractor on just the
// follow-up and take only the values it states explicitly (never its defaults), so
// untouched fields are left alone. Tax is a phrase toggle, and shipping items merge
// into the last item or append a new one.
import type { FieldValue, Intent } from './types';
import { DeterministicProvider, populateIntentFields } from './providers/deterministic';
import {
  courierLabel,
  normalizeUtterance,
  extractCountry,
  extractEmployeeName,
  extractKeyItems,
  hasCue,
  extractAttachments,
  extractCity,
  extractPacking,
  extractPhone,
  extractProvince,
  extractSaleQuantity,
  extractShippingCost,
  extractTaxToggle,
  extractTracking,
  nameFrom,
  provinceOfCity,
  stripPacking,
} from './extract';
import { emptyShipmentItem, isItemComplete, toShipmentItems } from './shipping';
import { getFieldSpecs, missingRequired } from './fieldSpecs';
import { parseClockTime } from '@/lib/shiftParse';
import { formatTime12, parseHhmm } from '@/lib/schedule';
import type { PackingItem } from '@/lib/packing';

const ADD_ITEM = /\b(add|and|another|second|third|also|plus|one more)\b/i;
// The free-text fields. A follow-up never rewrites one from its own leftover
// words ("make it 40" is not an item called "make it"); it only fills one that is
// still empty when the message is a bare answer.
const DESCRIPTIVE = new Set(['supply', 'keyModel', 'keyName', 'content', 'item', 'notes', 'linkName', 'linkDescription']);

const explicit = <T>(value: T): FieldValue<T> => ({ value, source: 'explicit' });
const probe = new DeterministicProvider();

// Whether a message typed while a slip is open edits that slip, or is a new ask.
// It is an edit unless it is clearly an action of its own: "kw1?" or "who is
// working today" start something new, while "40", "hp 65", "sarah jones" or "add a
// box $5" (which on their own would only be a guess) change the slip. On an open
// shipping slip, anything about a parcel or a courier is about that slip.
export async function isFollowUp(active: Intent, text: string): Promise<boolean> {
  text = normalizeUtterance(text);
  if (active.action === 'timesheet' && (hasCue(text, 'break', 'actually', 'it was') || /\bfor\s+\w+\s+not\b/i.test(text))) return true;
  if (active.action === 'receipt' && active.subtype === 'key' && hasCue(text, 'add', 'and', 'plus') && /^(?:add|and|plus)\b/i.test(text.trim()) && extractKeyItems(text).length > 0) return true;
  const route = await probe.parse(text);
  if (route.action === 'unknown' || route.confidence < 0.7) return true;
  if (active.action === 'receipt' && active.subtype === 'shipping') {
    if (route.action === 'receipt' && route.subtype === 'shipping') return true;
    // A courier or a tracking number with no "track" said is the parcel's detail.
    if (route.action === 'track' && !/\b(?:track|trace|where)\b/i.test(text)) return true;
  }
  return false;
}

// True when the follow-up carries any shipment detail worth merging.
function hasShipmentDetail(text: string): boolean {
  const { courier, trackingNumber } = extractTracking(text);
  return Boolean(courier || trackingNumber || extractCity(text) || extractProvince(text) !== null || extractShippingCost(text, trackingNumber, extractPhone(text)) !== null);
}

export function applyFollowUp(active: Intent, text: string): Intent {
  text = normalizeUtterance(text);
  const next: Intent = { ...active, fields: { ...active.fields } };
  let changed = false;
  if (active.action === 'note') {
    next.fields.content = explicit([active.fields.content?.value, text.trim()].filter(Boolean).join(' '));
    return next;
  }
  if (active.action === 'receipt' && hasCue(text, 'free', 'no charge', 'on the house') && !hasCue(text, 'tax free', 'gst free')) {
    next.fields.price = explicit(0);
    if (active.subtype === 'shipping') next.fields.shipmentItems = explicit(toShipmentItems(active.fields.shipmentItems?.value).map((item) => ({ ...item, cost: 0 })));
    return next;
  }
  if (active.action === 'timesheet') {
    const nameCorrection = hasCue(text, 'it was') || /\bfor\s+\w+\s+not\b/i.test(text);
    if (nameCorrection) {
      const name = extractEmployeeName(text);
      if (name) next.fields.employeeName = explicit(name);
      return next;
    }
    const time = text.trim().match(/^(?:actually\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);
    if (time) {
      const start = parseClockTime(String(active.fields.actualStart?.value || active.fields.start?.value || ''));
      const end = parseClockTime(String(active.fields.actualEnd?.value || active.fields.end?.value || ''));
      const startMinutes = start ? parseHhmm(start) : null;
      const endMinutes = end ? parseHhmm(end) : null;
      const nearStart = parseClockTime(time[1], startMinutes);
      const nearEnd = parseClockTime(time[1], endMinutes);
      const startDistance = nearStart && startMinutes != null ? Math.abs(parseHhmm(nearStart)! - startMinutes) : Infinity;
      const endDistance = nearEnd && endMinutes != null ? Math.abs(parseHhmm(nearEnd)! - endMinutes) : Infinity;
      const value = startDistance <= endDistance ? nearStart : nearEnd;
      if (value) next.fields[startDistance <= endDistance ? 'actualStart' : 'actualEnd'] = explicit(formatTime12(value));
      return next;
    }
  }

  // Re-extract for the same action and merge only explicitly-stated values. The
  // shipmentItems block is handled on its own below, so skip it here.
  const reread: Intent = { action: active.action, subtype: active.subtype, fields: {}, confidence: 1 };
  populateIntentFields(reread, text);
  for (const [key, value] of Object.entries(reread.fields)) {
    if (active.action === 'timesheet' && (key === 'op' || key === 'employeeName')) continue;
    if (key === 'shipmentItems' || key === 'packing' || DESCRIPTIVE.has(key)) continue;
    if (value.source === 'explicit') {
      if (key === 'keyItems' && active.subtype === 'key' && ADD_ITEM.test(text) && Array.isArray(value.value)) {
        const existing = Array.isArray(active.fields.keyItems?.value) ? active.fields.keyItems.value : [];
        const items = existing.map((item) => ({ ...item }));
        for (const item of value.value) {
          const previous = items.find((it) => it.model === item.model);
          if (previous) previous.qty += item.qty;
          else items.push(item);
        }
        next.fields[key] = explicit(items);
      } else next.fields[key] = value;
      changed = true;
    }
  }

  const quantity = extractSaleQuantity(text);
  if (active.action === 'receipt' && active.subtype === 'key' && quantity !== null) {
    const items = active.fields.keyItems?.value;
    if (Array.isArray(items) && items.length === 1 && !reread.fields.keyItems) {
      next.fields.keyItems = explicit(items.map((item) => ({ ...item, qty: quantity })));
      changed = true;
    }
  }

  // Tax is a phrase toggle: "no gst" / "tax free" / "with gst".
  const tax = extractTaxToggle(text);
  if (tax !== null) {
    next.fields.gst = explicit(tax);
    changed = true;
  }

  // "charge her card" / "print a label" turn the side actions on.
  const attach = extractAttachments(text);
  if (attach) {
    next.attach = { ...active.attach, ...attach };
    changed = true;
  }

  // Packing named in the follow-up ("add a box $4") is appended to any already on
  // the slip.
  const newPacking = active.action === 'receipt' && active.subtype !== 'supplies' ? extractPacking(text) : [];
  if (newPacking.length > 0) {
    const existing = Array.isArray(active.fields.packing?.value)
      ? (active.fields.packing!.value as PackingItem[])
      : [];
    next.fields.packing = explicit([...existing, ...newPacking]);
    changed = true;
  }

  // Shipping items: merge into the last item, or append a new one when the counter
  // says "add another ..." or types a whole second parcel. Packing is taken out
  // first, so "add a box $5" is a box and not a $5 shipment.
  const parcelText = stripPacking(text);
  if (active.action === 'receipt' && active.subtype === 'shipping' && hasShipmentDetail(parcelText)) {
    const items = toShipmentItems(active.fields.shipmentItems?.value);
    const match = extractTracking(parcelText);
    const { trackingNumber } = match;
    const courier = courierLabel(match) || null;
    const city = extractCity(parcelText);
    const country = extractCountry(parcelText);
    const province = country && country !== 'Canada' ? '' : extractProvince(parcelText) ?? provinceOfCity(city) ?? (city ? '' : null);
    const cost = extractShippingCost(parcelText, trackingNumber, extractPhone(parcelText));
    const i = Math.max(0, items.length - 1);
    const last = items[i] ?? emptyShipmentItem();
    const wholeParcel = Boolean(courier) && cost != null && Boolean(city || province) && isItemComplete(last);
    const startsNewItem = (ADD_ITEM.test(text) && Boolean(courier || trackingNumber || city)) || wholeParcel;

    if (startsNewItem) {
      items.push({
        ...emptyShipmentItem(),
        courier: courier ?? last.courier,
        trackingNumber: trackingNumber ?? '',
        city: city ?? '',
        province: province ?? emptyShipmentItem().province,
        country: country ?? last.country,
        cost: cost ?? null,
      });
    } else {
      items[i] = {
        ...last,
        ...(country ? { country } : {}),
        ...(courier ? { courier } : {}),
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(city ? { city } : {}),
        ...(province != null ? { province } : {}),
        ...(cost != null ? { cost } : {}),
      };
    }
    next.fields.shipmentItems = explicit(items);
    changed = true;
  }

  // A bare answer ("sarah jones", "phone case"): nothing above recognized it, so
  // it answers the first needed field that is still empty, else the customer name
  // when it reads as one.
  if (!changed) {
    const words = text.trim().replace(/^(?:its|it's|it\s+is|name\s+is|for)\s+/i, '');
    const specs = getFieldSpecs(next) ?? [];
    const gap = missingRequired(specs, next).find((s) => s.kind === 'text');
    const name = nameFrom(words);
    const wholeName = name && name.split(' ').length === words.split(/\s+/).length ? name : null;
    if (gap && words) next.fields[gap.key] = explicit(gap.key === 'customerName' ? wholeName ?? words : words);
    else if (wholeName && specs.some((s) => s.key === 'customerName') && !next.fields.customerName?.value) {
      next.fields.customerName = explicit(wholeName);
    }
  }

  return next;
}
