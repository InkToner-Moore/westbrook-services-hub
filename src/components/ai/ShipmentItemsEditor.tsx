// The repeated shipment-item block inside a shipping receipt's confirmation check.
// One card per item: courier, tracking, destination, cost, and a province-derived
// tax that stays editable. Add or remove items; a shipment can hold several. See
// docs/ai-mode/01-design.md (shipping-specific) and src/ai/shipping.ts.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { PROVINCES } from '@/lib/canadaTax';
import {
  emptyShipmentItem,
  itemTaxLines,
  itemTaxTotal,
  type ShipmentItem,
} from '@/ai/shipping';

interface ShipmentItemsEditorProps {
  items: ShipmentItem[];
  // Whether the master tax toggle is on; drives the tax readout so it matches
  // what the receipt will charge.
  taxEnabled: boolean;
  readOnly?: boolean;
  onChange: (items: ShipmentItem[]) => void;
}

const ShipmentItemsEditor: React.FC<ShipmentItemsEditorProps> = ({
  items,
  taxEnabled,
  readOnly,
  onChange,
}) => {
  const { themeClasses } = useTheme();

  const update = (index: number, patch: Partial<ShipmentItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const addItem = () => onChange([...items, emptyShipmentItem()]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  const fieldClass = `min-h-[44px] w-full rounded-lg border px-2.5 py-1 text-[15px] outline-none xl:min-h-[34px] xl:px-2 xl:text-sm ${themeClasses.input}`;
  const labelClass = `mb-0.5 block text-xs font-medium text-pub-muted`;

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const taxLines = itemTaxLines(item);
        const taxTotal = taxEnabled ? itemTaxTotal(item) : 0;
        return (
          <div key={index} className="rounded-xl border p-2.5 bg-pub-sunk border-pub-edge">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-pub-muted">
                Item {index + 1}
              </span>
              {!readOnly && items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  title="Remove item"
                  aria-label={`Remove item ${index + 1}`}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg xl:h-7 xl:w-7 text-pub-muted ${themeClasses.interactive.hover}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={labelClass}>Courier service</label>
                <input
                  className={fieldClass}
                  disabled={readOnly}
                  value={item.courier}
                  placeholder="e.g. Purolator Express"
                  onChange={(e) => update(index, { courier: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className={labelClass}>Tracking number</label>
                <input
                  className={`${fieldClass} font-mono tabular-nums`}
                  disabled={readOnly}
                  value={item.trackingNumber}
                  onChange={(e) => update(index, { trackingNumber: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Destination city</label>
                <input
                  className={fieldClass}
                  disabled={readOnly}
                  value={item.city}
                  onChange={(e) => update(index, { city: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Province</label>
                <select
                  className={fieldClass}
                  disabled={readOnly}
                  value={item.province}
                  onChange={(e) => update(index, { province: e.target.value })}
                >
                  {/* Empty when the destination is outside Canada or not known yet. */}
                  <option value="">None</option>
                  {PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Country</label>
                <input
                  className={fieldClass}
                  disabled={readOnly}
                  value={item.country}
                  onChange={(e) => update(index, { country: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Shipping cost</label>
                <input
                  className={`${fieldClass} font-mono tabular-nums`}
                  disabled={readOnly}
                  inputMode="decimal"
                  value={item.cost == null ? '' : String(item.cost)}
                  placeholder="0.00"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    update(index, { cost: raw === '' ? null : Number(raw) });
                  }}
                />
              </div>

              <div className="col-span-2">
                <label className={labelClass}>
                  Shipping taxes{' '}
                  <span className="font-normal">
                    {taxEnabled
                      ? item.taxOverride != null
                        ? '(manual)'
                        : `(${taxLines.map((t) => t.label).join(' + ') || 'none'})`
                      : '(tax off)'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className={fieldClass}
                    disabled={readOnly || !taxEnabled}
                    inputMode="decimal"
                    value={
                      item.taxOverride != null
                        ? String(item.taxOverride)
                        : taxEnabled
                          ? taxTotal.toFixed(2)
                          : '0.00'
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      update(index, { taxOverride: raw === '' ? null : Number(raw) });
                    }}
                  />
                  {!readOnly && taxEnabled && item.taxOverride != null && (
                    <button
                      type="button"
                      onClick={() => update(index, { taxOverride: null })}
                      className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs ${themeClasses.button.ghost}`}
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={addItem}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm xl:min-h-[36px] border-pub-edge text-pub-accent ${themeClasses.interactive.hover}`}
        >
          <Plus className="h-4 w-4" />
          Add another item
        </button>
      )}
    </div>
  );
};

export default ShipmentItemsEditor;
