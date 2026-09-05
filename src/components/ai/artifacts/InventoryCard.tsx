// The Inventory artifact card (kind 'inventory'). It renders two things the
// Inventory action produces:
//
//   1. A LOOKUP RESULT  { query, keys[], refills[], total }  (from
//      executeInventoryLookup) - "is the HP 65 in stock, what's the price, where
//      is that key blank". Shows a clear in-stock / out badge (text + colour,
//      never colour alone), price(s) in mono tabular figures, and for a key a
//      LOCATION slot (a model -> cut-code map is coming later; until then it reads
//      any staff-set cut code and otherwise shows "Location coming soon").
//   2. A SAVE RESULT    { mode: 'saved', ... }  (from executeInventory) - a short
//      success slip after a key is added.
//
// Each result row also flips into a compact EDIT form so the counter can mark a
// row in / out of stock or set a price or a key's location, written straight to
// Firestore via the shared helpers (the same collections StaffInventory uses).
//
// Inventory hue is orange (DESIGN-SPEC). Registration: this file exports
// `register(reg)`; the integrator wires one import + call in artifactRegistry.tsx.
// The Body is self-contained (it writes through lib/firestore itself), so no Foot
// and no Provider are needed.
import React, { useEffect, useState } from 'react';
import { Boxes, Check, KeyRound, Droplets, MapPin, Pencil, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { updateDocument } from '@/lib/firestore';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';

// --- Result shapes (mirror StaffInventory + collections.ts) -----------------
export interface KeyResult {
  id: string;
  model: string;
  price: number | null;
  notes?: string;
  inStock: boolean;
  // Optional staff-set cut code / location. The future model -> cut-code map
  // (KEY_LOCATIONS below) is the primary source; this per-item field lets a clerk
  // set one now from the edit form.
  cutCode?: string;
}
export interface RefillResult {
  id: string;
  brand: string;
  cartridge: string;
  priceBlack: number | null;
  priceColour: number | null;
  priceXl: number | null;
  priceNote?: string;
  inStock: boolean;
}

// The lookup artifact A1 emits, plus the save-result variant executeInventory
// emits. `mode` absent means a lookup (keeps A1's exact shape working).
export interface InventoryLookupData {
  mode?: 'lookup';
  query: string;
  keys: KeyResult[];
  refills: RefillResult[];
  total: number;
}
export interface InventorySavedData {
  mode: 'saved';
  savedKind: 'key';
  item: KeyResult;
}
export type InventoryArtifactData = InventoryLookupData | InventorySavedData;

const KEY_INVENTORY_COLLECTION = 'keyInventory';
const REFILL_INVENTORY_COLLECTION = 'refillInventory';

// --- Location scaffold -------------------------------------------------------
// The model -> cut-code map is coming later (e.g. Kwikset KW1 -> "KW1",
// Schlage SC1 -> "SC1"). Fill this in when the mapping lands; the card reads it
// today and shows "Location coming soon" while it is empty. A cut code a clerk
// set on the item itself wins over the map.
export const KEY_LOCATIONS: Record<string, string> = {};

const normModel = (model: string): string => model.trim().toLowerCase();

// Resolve a key's location: an item-level cut code first, then the shared map.
// Returns null when neither is known.
export function lookupKeyLocation(item: Pick<KeyResult, 'model' | 'cutCode'>): string | null {
  if (item.cutCode && item.cutCode.trim()) return item.cutCode.trim();
  const mapped = KEY_LOCATIONS[normModel(item.model)];
  return mapped ?? null;
}

// --- formatting --------------------------------------------------------------
const fmtMoney = (n: number | null | undefined): string | null =>
  n === null || n === undefined || Number.isNaN(n) ? null : `$${n.toFixed(2)}`;

// Blank means "no price", not zero.
const parsePrice = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// --- shared bits -------------------------------------------------------------
const StockBadge: React.FC<{ inStock: boolean }> = ({ inStock }) => {
  const { themeClasses } = useTheme();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        inStock ? themeClasses.status.success : themeClasses.status.error
      }`}
    >
      {/* Shape carries the state alongside the word, so it never reads by colour
          alone: a filled dot in stock, a hollow ring out. */}
      <span
        className={`h-2 w-2 rounded-full ${inStock ? 'bg-current' : 'border-2 border-current'}`}
      />
      {inStock ? 'In stock' : 'Out of stock'}
    </span>
  );
};

const useHues = () => {
  const { isDarkMode } = useTheme();
  return {
    orangeHeader: isDarkMode
      ? 'bg-orange-900/25 border-orange-800/50 text-orange-100'
      : 'bg-orange-50 border-orange-100 text-orange-900',
    divide: isDarkMode ? 'divide-slate-700/70' : 'divide-slate-100',
    priceChip: isDarkMode
      ? 'bg-blue-500/20 text-blue-200 border-blue-400/50'
      : 'bg-blue-100 text-blue-800 border-blue-300',
    borderColor: isDarkMode ? 'border-slate-700/70' : 'border-slate-100',
  };
};

// --- edit forms --------------------------------------------------------------
const btn = (base: string) =>
  `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${base}`;

const KeyEditForm: React.FC<{
  item: KeyResult;
  onCancel: () => void;
  onSaved: (next: KeyResult) => void;
}> = ({ item, onCancel, onSaved }) => {
  const { themeClasses } = useTheme();
  const [inStock, setInStock] = useState(item.inStock);
  const [price, setPrice] = useState(item.price == null ? '' : String(item.price));
  const [cutCode, setCutCode] = useState(item.cutCode ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const next: KeyResult = { ...item, inStock, price: parsePrice(price), cutCode: cutCode.trim() };
    try {
      await updateDocument(KEY_INVENTORY_COLLECTION, item.id, {
        inStock: next.inStock,
        price: next.price,
        cutCode: next.cutCode,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Saved', description: `${item.model} updated` });
      onSaved(next);
    } catch (error) {
      console.error('Failed to update key:', error);
      toast({ title: 'Error', description: 'Could not save the change' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-2.5">
      <label className="flex items-center justify-between gap-3">
        <span className={`text-[13px] ${themeClasses.text.secondary}`}>In stock</span>
        <button
          type="button"
          role="switch"
          aria-checked={inStock}
          onClick={() => setInStock((v) => !v)}
          className={btn(inStock ? themeClasses.status.success : themeClasses.button.secondary)}
        >
          {inStock ? 'In stock' : 'Out of stock'}
        </button>
      </label>
      <label className="block">
        <span className={`mb-1 block text-[13px] ${themeClasses.text.secondary}`}>Price (before tax)</span>
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 4.99"
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-[15px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.input}`}
        />
      </label>
      <label className="block">
        <span className={`mb-1 block text-[13px] ${themeClasses.text.secondary}`}>Location / cut code</span>
        <input
          value={cutCode}
          onChange={(e) => setCutCode(e.target.value)}
          placeholder="e.g. KW1"
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.input}`}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn(themeClasses.button.ghost)}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="button" disabled={saving} onClick={save} className={btn(`font-medium disabled:opacity-40 ${themeClasses.button.primary}`)}>
          <Check className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
};

const RefillEditForm: React.FC<{
  item: RefillResult;
  onCancel: () => void;
  onSaved: (next: RefillResult) => void;
}> = ({ item, onCancel, onSaved }) => {
  const { themeClasses } = useTheme();
  const [inStock, setInStock] = useState(item.inStock);
  const [priceBlack, setPriceBlack] = useState(item.priceBlack == null ? '' : String(item.priceBlack));
  const [priceColour, setPriceColour] = useState(item.priceColour == null ? '' : String(item.priceColour));
  const [priceXl, setPriceXl] = useState(item.priceXl == null ? '' : String(item.priceXl));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const next: RefillResult = {
      ...item,
      inStock,
      priceBlack: parsePrice(priceBlack),
      priceColour: parsePrice(priceColour),
      priceXl: parsePrice(priceXl),
    };
    try {
      await updateDocument(REFILL_INVENTORY_COLLECTION, item.id, {
        inStock: next.inStock,
        priceBlack: next.priceBlack,
        priceColour: next.priceColour,
        priceXl: next.priceXl,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Saved', description: `${item.brand} ${item.cartridge} updated` });
      onSaved(next);
    } catch (error) {
      console.error('Failed to update refill:', error);
      toast({ title: 'Error', description: 'Could not save the change' });
    } finally {
      setSaving(false);
    }
  };

  const priceInput = (label: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className={`mb-1 block text-[13px] ${themeClasses.text.secondary}`}>{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-[15px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.input}`}
      />
    </label>
  );

  return (
    <div className="mt-2 space-y-2.5">
      <label className="flex items-center justify-between gap-3">
        <span className={`text-[13px] ${themeClasses.text.secondary}`}>In stock</span>
        <button
          type="button"
          role="switch"
          aria-checked={inStock}
          onClick={() => setInStock((v) => !v)}
          className={btn(inStock ? themeClasses.status.success : themeClasses.button.secondary)}
        >
          {inStock ? 'In stock' : 'Out of stock'}
        </button>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {priceInput('Black', priceBlack, setPriceBlack)}
        {priceInput('Colour', priceColour, setPriceColour)}
        {priceInput('XL', priceXl, setPriceXl)}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn(themeClasses.button.ghost)}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="button" disabled={saving} onClick={save} className={btn(`font-medium disabled:opacity-40 ${themeClasses.button.primary}`)}>
          <Check className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
};

// --- result rows -------------------------------------------------------------
const KeyRow: React.FC<{ item: KeyResult; onSaved: (next: KeyResult) => void }> = ({ item, onSaved }) => {
  const { themeClasses } = useTheme();
  const [editing, setEditing] = useState(false);
  const price = fmtMoney(item.price);
  const location = lookupKeyLocation(item);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <KeyRound className={`h-4 w-4 shrink-0 ${themeClasses.text.secondary}`} />
          <div className="min-w-0">
            <p className={`truncate text-[15px] font-medium ${themeClasses.text.primary}`}>{item.model}</p>
            {item.notes ? (
              <p className={`truncate text-[13px] ${themeClasses.text.muted}`}>{item.notes}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {price ? (
            <span className={`font-mono text-[15px] font-semibold tabular-nums ${themeClasses.text.primary}`}>{price}</span>
          ) : (
            <span className={`text-[13px] ${themeClasses.text.muted}`}>No price</span>
          )}
          <StockBadge inStock={item.inStock} />
        </div>
      </div>

      {/* Location slot: reads the future cut-code map / any staff-set code. */}
      <div className="mt-1.5 flex items-center gap-1.5 pl-6">
        <MapPin className={`h-3.5 w-3.5 shrink-0 ${themeClasses.text.muted}`} />
        {location ? (
          <span className={`font-mono text-[13px] tabular-nums ${themeClasses.text.secondary}`}>{location}</span>
        ) : (
          <span className={`text-[13px] italic ${themeClasses.text.muted}`}>Location coming soon</span>
        )}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] ${themeClasses.button.ghost}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {editing && (
        <KeyEditForm
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            onSaved(next);
          }}
        />
      )}
    </li>
  );
};

const RefillRow: React.FC<{ item: RefillResult; onSaved: (next: RefillResult) => void }> = ({ item, onSaved }) => {
  const { themeClasses } = useTheme();
  const [editing, setEditing] = useState(false);
  const name = `${item.brand ? `${item.brand} ` : ''}${item.cartridge}`.trim();
  const parts = [
    fmtMoney(item.priceBlack) && `Black ${fmtMoney(item.priceBlack)}`,
    fmtMoney(item.priceColour) && `Colour ${fmtMoney(item.priceColour)}`,
    fmtMoney(item.priceXl) && `XL ${fmtMoney(item.priceXl)}`,
  ].filter(Boolean) as string[];

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Droplets className={`h-4 w-4 shrink-0 ${themeClasses.text.secondary}`} />
          <div className="min-w-0">
            <p className={`truncate text-[15px] font-medium ${themeClasses.text.primary}`}>{name}</p>
            {parts.length > 0 ? (
              <p className={`truncate font-mono text-[13px] tabular-nums ${themeClasses.text.secondary}`}>
                {parts.join('   ')}
              </p>
            ) : item.priceNote ? (
              <p className={`truncate text-[13px] ${themeClasses.text.muted}`}>{item.priceNote}</p>
            ) : (
              <p className={`text-[13px] ${themeClasses.text.muted}`}>No price</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StockBadge inStock={item.inStock} />
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] ${themeClasses.button.ghost}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {editing && (
        <RefillEditForm
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            onSaved(next);
          }}
        />
      )}
    </li>
  );
};

// --- lookup card -------------------------------------------------------------
const LookupCard: React.FC<{ data: InventoryLookupData }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const { orangeHeader, divide } = useHues();
  // Local, editable copy so an inline save reflects immediately in the card.
  const [keys, setKeys] = useState<KeyResult[]>(data.keys ?? []);
  const [refills, setRefills] = useState<RefillResult[]>(data.refills ?? []);

  useEffect(() => {
    setKeys(data.keys ?? []);
    setRefills(data.refills ?? []);
  }, [data]);

  const total = keys.length + refills.length;
  const query = data.query ?? '';

  const header = (
    <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${orangeHeader}`}>
      <Boxes className="h-4 w-4 shrink-0" />
      <span className="text-[15px] font-semibold tracking-tight">Inventory</span>
      {query ? <span className="ml-auto truncate text-[13px] opacity-80">"{query}"</span> : null}
    </div>
  );

  // Empty query: the lookup ran with nothing to search on.
  if (!query.trim()) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
        {header}
        <div className="px-4 py-8 text-center">
          <Search className={`mx-auto mb-3 h-9 w-9 ${themeClasses.text.muted}`} />
          <p className={`text-[15px] font-medium ${themeClasses.text.primary}`}>What should I look up?</p>
          <p className={`mt-1 text-[13px] ${themeClasses.text.secondary}`}>
            Ask for a key blank or a cartridge to see stock, price, and location.
          </p>
        </div>
      </div>
    );
  }

  // No match for a real query.
  if (total === 0) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
        {header}
        <div className="px-4 py-8 text-center">
          <Search className={`mx-auto mb-3 h-9 w-9 ${themeClasses.text.muted}`} />
          <p className={`text-[15px] font-medium ${themeClasses.text.primary}`}>No match for "{query}"</p>
          <p className={`mt-1 text-[13px] ${themeClasses.text.secondary}`}>
            Nothing in the key or refill inventory matched. Try a different name.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
      {header}
      <div className="px-4 py-2">
        <p className={`py-1 text-[13px] ${themeClasses.text.secondary}`}>
          {total} {total === 1 ? 'match' : 'matches'}
        </p>

        {keys.length > 0 && (
          <>
            <p className={`pt-1 text-[11px] font-semibold uppercase tracking-wide ${themeClasses.text.muted}`}>Keys</p>
            <ul className={`divide-y ${divide}`}>
              {keys.map((k) => (
                <KeyRow
                  key={k.id}
                  item={k}
                  onSaved={(next) => setKeys((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
                />
              ))}
            </ul>
          </>
        )}

        {refills.length > 0 && (
          <>
            <p className={`pt-3 text-[11px] font-semibold uppercase tracking-wide ${themeClasses.text.muted}`}>Refills</p>
            <ul className={`divide-y ${divide}`}>
              {refills.map((r) => (
                <RefillRow
                  key={r.id}
                  item={r}
                  onSaved={(next) => setRefills((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

// --- saved card --------------------------------------------------------------
const SavedCard: React.FC<{ data: InventorySavedData }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const { orangeHeader, divide, borderColor } = useHues();
  const [item, setItem] = useState<KeyResult>(data.item);
  const [editing, setEditing] = useState(false);

  useEffect(() => setItem(data.item), [data]);

  const price = fmtMoney(item.price);
  const location = lookupKeyLocation(item);

  return (
    <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${orangeHeader}`}>
        <Boxes className="h-4 w-4 shrink-0" />
        <span className="text-[15px] font-semibold tracking-tight">Inventory</span>
        <span className="ml-auto text-[13px] opacity-80">Key added</span>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <KeyRound className={`h-5 w-5 shrink-0 ${themeClasses.text.secondary}`} />
          <p className={`text-[17px] font-semibold ${themeClasses.text.primary}`}>{item.model}</p>
        </div>

        <ul className={`mt-3 divide-y border-t ${divide} ${borderColor}`}>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Stock</span>
            <StockBadge inStock={item.inStock} />
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Price</span>
            {price ? (
              <span className={`font-mono text-[15px] font-semibold tabular-nums ${themeClasses.text.primary}`}>{price}</span>
            ) : (
              <span className={`text-[13px] ${themeClasses.text.muted}`}>No price</span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className={`text-[13px] ${themeClasses.text.secondary}`}>Location</span>
            {location ? (
              <span className={`font-mono text-[13px] tabular-nums ${themeClasses.text.secondary}`}>{location}</span>
            ) : (
              <span className={`text-[13px] italic ${themeClasses.text.muted}`}>Location coming soon</span>
            )}
          </li>
        </ul>

        {!editing ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] ${themeClasses.status.success}`}>
              <Check className="h-3.5 w-3.5 shrink-0" />
              Added to inventory
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] ${themeClasses.button.ghost}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        ) : (
          <KeyEditForm
            item={item}
            onCancel={() => setEditing(false)}
            onSaved={(next) => {
              setEditing(false);
              setItem(next);
            }}
          />
        )}
      </div>
    </div>
  );
};

const InventoryBody: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const d = data as InventoryArtifactData | undefined;

  if (!d) {
    return (
      <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
        <div className="px-4 py-8 text-center">
          <Boxes className={`mx-auto mb-3 h-9 w-9 ${themeClasses.text.muted}`} />
          <p className={`text-[15px] font-medium ${themeClasses.text.primary}`}>Nothing to show yet</p>
        </div>
      </div>
    );
  }

  if (d.mode === 'saved') return <SavedCard data={d} />;
  return <LookupCard data={d} />;
};

// Registration hook. The integrator adds, in artifactRegistry.tsx:
//   import { register as registerInventory } from '@/components/ai/artifacts/InventoryCard';
//   registerInventory(ARTIFACT_RENDERERS);
export function register(reg: ArtifactRegistry): void {
  reg.inventory = { Body: InventoryBody };
}

export default InventoryBody;
