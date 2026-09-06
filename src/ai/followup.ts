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
import { populateIntentFields } from './providers/deterministic';
import { extractCity, extractPhone, extractProvince, extractShippingCost, extractTracking } from './extract';
import { emptyShipmentItem, toShipmentItems } from './shipping';

const NO_TAX = /\b(no|without|remove|drop|skip)\s+(gst|tax)\b/i;
const YES_TAX = /\b(add|with|include|apply|charge|keep)\s+(gst|tax)\b/i;
const ADD_ITEM = /\b(add|another|second|third|also|plus)\b/i;

const explicit = <T>(value: T): FieldValue<T> => ({ value, source: 'explicit' });

// True when the follow-up carries any shipment detail worth merging.
function hasShipmentDetail(text: string): boolean {
  const { courier, trackingNumber } = extractTracking(text);
  return Boolean(courier || trackingNumber || extractCity(text) || extractProvince(text) !== null || extractShippingCost(text, trackingNumber, extractPhone(text)) !== null);
}

export function applyFollowUp(active: Intent, text: string): Intent {
  const next: Intent = { ...active, fields: { ...active.fields } };

  // Re-extract for the same action and merge only explicitly-stated values. The
  // shipmentItems block is handled on its own below, so skip it here.
  const probe: Intent = { action: active.action, subtype: active.subtype, fields: {}, confidence: 1 };
  populateIntentFields(probe, text);
  for (const [key, value] of Object.entries(probe.fields)) {
    if (key === 'shipmentItems') continue;
    if (value.source === 'explicit') next.fields[key] = value;
  }

  // Tax is a phrase toggle: "no gst" / "with gst".
  if (NO_TAX.test(text)) next.fields.gst = explicit(false);
  else if (YES_TAX.test(text)) next.fields.gst = explicit(true);

  // Shipping items: merge into the last item, or append a new one when the counter
  // says "add another ...".
  if (active.action === 'receipt' && active.subtype === 'shipping' && hasShipmentDetail(text)) {
    const items = toShipmentItems(active.fields.shipmentItems?.value);
    const { courier, trackingNumber } = extractTracking(text);
    const city = extractCity(text);
    const province = extractProvince(text);
    const cost = extractShippingCost(text, trackingNumber, extractPhone(text));
    const startsNewItem = ADD_ITEM.test(text) && Boolean(courier || trackingNumber || cost != null);

    if (startsNewItem) {
      items.push({
        ...emptyShipmentItem(),
        courier: courier ?? '',
        trackingNumber: trackingNumber ?? '',
        city: city ?? '',
        province: province ?? emptyShipmentItem().province,
        cost: cost ?? null,
      });
    } else {
      const i = Math.max(0, items.length - 1);
      const last = items[i] ?? emptyShipmentItem();
      items[i] = {
        ...last,
        ...(courier ? { courier } : {}),
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(city ? { city } : {}),
        ...(province != null ? { province } : {}),
        ...(cost != null ? { cost } : {}),
      };
    }
    next.fields.shipmentItems = explicit(items);
  }

  return next;
}
