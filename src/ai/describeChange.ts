// Says, in a few plain words, what a typed follow-up changed on the open slip
// ("Price is now $25.00.", "Added Box, $5.00."), so the chat confirms the edit
// it made instead of a generic "updated". Compares the slip before and after.
import type { Intent } from './types';
import { getFieldSpecs, type FieldSpec } from './fieldSpecs';
import { toShipmentItems, type ShipmentItem } from './shipping';
import type { KeyOrderItem } from './extract';
import { packingLabel, packingLineTotal, type PackingItem } from '@/lib/packing';

const money = (n: unknown) => `$${Number(n).toFixed(2)}`;
const blank = (v: unknown) => v === null || v === undefined || v === '';

function showValue(spec: FieldSpec | undefined, value: unknown): string {
  if (spec?.kind === 'money') return money(value);
  if (spec?.kind === 'toggle' || typeof value === 'boolean') return value ? 'on' : 'off';
  return String(value);
}

const keyLine = (it: KeyOrderItem) => (it.qty > 1 ? `${it.qty}x ${it.model}` : it.model);

function parcelChanges(before: ShipmentItem[], after: ShipmentItem[]): string[] {
  const out: string[] = [];
  const many = after.length > 1;
  after.forEach((item, i) => {
    const old = before[i];
    const where = many ? `Parcel ${i + 1}` : 'Shipping';
    if (!old) {
      const bits = [item.courier, item.city && `to ${item.city}`, item.cost != null && money(item.cost)].filter(Boolean);
      out.push(`Added a parcel: ${bits.join(' ') || 'details still needed'}.`);
      return;
    }
    if (item.cost !== old.cost && item.cost != null) out.push(`${where} cost is now ${money(item.cost)}.`);
    if (item.courier !== old.courier && item.courier) out.push(`${many ? `${where} courier` : 'Courier'} is now ${item.courier}.`);
    if ((item.city !== old.city || item.province !== old.province) && item.city) {
      out.push(`${many ? `${where} goes` : 'It goes'} to ${[item.city, item.province].filter(Boolean).join(', ')}.`);
    }
    if (item.trackingNumber !== old.trackingNumber && item.trackingNumber) out.push(`Tracking number added.`);
  });
  if (after.length < before.length) out.push(`Removed a parcel.`);
  return out;
}

export function describeChange(before: Intent, after: Intent): string {
  const specs = getFieldSpecs(after) ?? [];
  const out: string[] = [];

  const beforeKeys = (before.fields.keyItems?.value as KeyOrderItem[] | undefined) ?? [];
  const afterKeys = (after.fields.keyItems?.value as KeyOrderItem[] | undefined) ?? [];
  const keysChanged = beforeKeys.map(keyLine).join() !== afterKeys.map(keyLine).join();
  if (keysChanged && afterKeys.length > 0) out.push(`Keys are now ${afterKeys.map(keyLine).join(', ')}.`);

  if (after.fields.shipmentItems || before.fields.shipmentItems) {
    out.push(
      ...parcelChanges(toShipmentItems(before.fields.shipmentItems?.value), toShipmentItems(after.fields.shipmentItems?.value)),
    );
  }

  const beforePack = (before.fields.packing?.value as PackingItem[] | undefined) ?? [];
  const afterPack = (after.fields.packing?.value as PackingItem[] | undefined) ?? [];
  for (const p of afterPack.slice(beforePack.length)) out.push(`Added ${packingLabel(p)}, ${money(packingLineTotal(p))}.`);

  for (const [key, fv] of Object.entries(after.fields)) {
    if (key === 'keyItems' || key === 'shipmentItems' || key === 'packing' || key === 'op') continue;
    // The key summary line just mirrors the key list reported above.
    if (key === 'keyModel' && keysChanged) continue;
    const old = before.fields[key]?.value;
    if (blank(fv.value) || fv.value === old || typeof fv.value === 'object') continue;
    const spec = specs.find((s) => s.key === key);
    if (!spec) continue;
    out.push(`${spec.label} is now ${showValue(spec, fv.value)}.`);
  }

  if (after.attach?.pay && !before.attach?.pay) out.push('I will charge the card too.');
  if (after.attach?.label && !before.attach?.label) out.push('I will print a 4x6 label too.');

  return out.slice(0, 4).join(' ');
}
