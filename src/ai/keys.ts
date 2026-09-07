// Resolve a key-cutting order's prices from the key inventory, so a slip built
// from "2 kw1s 1 y1 and 2 sc4s" shows the right per-key price and total. The
// deterministic parser only captures the models and quantities (offline, sync);
// this async step fills each key's unit price from Firestore before the slip is
// shown. Kept out of the provider so extraction stays offline and model-agnostic.
import { getCollection } from '@/lib/firestore';
import type { FieldValue, Intent } from './types';
import type { KeyOrderItem } from './extract';

interface KeyInventoryPrice {
  id: string;
  model: string;
  price: number | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const explicit = <T>(value: T): FieldValue<T> => ({ value, source: 'explicit' });

// A short summary of the key order for the slip's "Key or description" field, e.g.
// "2x KW1, Y1, 2x SC4".
export function keyOrderSummary(items: KeyOrderItem[]): string {
  return items.map((it) => (it.qty > 1 ? `${it.qty}x ${it.model}` : it.model)).join(', ');
}

// Fill each key item's unit price from the key inventory and set the receipt's
// price + key summary fields, unless the counter typed a price for a single key
// (then their price wins). No-op when the intent carries no key items. Safe when
// the inventory cannot be reached (prices stay null, total 0); staff can still
// edit on the slip.
export async function resolveKeyPrices(intent: Intent): Promise<void> {
  const raw = intent.fields.keyItems?.value;
  if (!Array.isArray(raw) || raw.length === 0) return;
  const items = raw as KeyOrderItem[];

  let inventory: KeyInventoryPrice[] = [];
  try {
    inventory = await getCollection<KeyInventoryPrice>('keyInventory', 'createdAt');
  } catch {
    inventory = [];
  }
  const byModel = new Map(inventory.map((k) => [k.model.trim().toUpperCase(), k]));

  const priceExplicit = intent.fields.price?.source === 'explicit';
  const typedPrice = priceExplicit ? Number(intent.fields.price?.value) : null;
  const singleTyped = items.length === 1 && priceExplicit && Number.isFinite(typedPrice);

  const priced: KeyOrderItem[] = items.map((it) => {
    const match = byModel.get(it.model.trim().toUpperCase());
    const unitPrice = singleTyped ? (typedPrice as number) : match?.price ?? null;
    return { ...it, unitPrice };
  });
  intent.fields.keyItems = explicit(priced);

  // Set the receipt price to the key subtotal, unless the counter typed a price
  // for a single key (that price is already on the field and wins).
  if (!singleTyped) {
    const subtotal = round2(priced.reduce((s, it) => s + (it.unitPrice ?? 0) * it.qty, 0));
    intent.fields.price =
      subtotal > 0
        ? explicit(subtotal)
        : { value: 0, source: 'guessed', reason: 'priced from inventory on confirm' };
  }

  // Seed the "Key or description" field with a readable summary if it is empty.
  const km = intent.fields.keyModel?.value;
  if (km == null || String(km).trim() === '') {
    intent.fields.keyModel = explicit(keyOrderSummary(priced));
  }
}
