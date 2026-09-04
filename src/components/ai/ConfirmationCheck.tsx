// The in-chat confirmation check: a clean, scannable summary of a proposed action
// where the user confirms or edits before anything happens. This is the "magic"
// moment, so it stays quiet and uncluttered. Markers: "?" = needed, "i" =
// optional. Guessed values are marked so the user can trust what was inferred.
// See docs/ai-mode/01-design.md.
import React, { useMemo, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { FieldValue, Intent } from '@/ai/types';
import { type FieldSpec, isFieldVisible, missingRequired } from '@/ai/fieldSpecs';
import { isItemComplete, toShipmentItems, type ShipmentItem } from '@/ai/shipping';
import ShipmentItemsEditor from './ShipmentItemsEditor';

interface ConfirmationCheckProps {
  intent: Intent;
  specs: FieldSpec[];
  confirmLabel?: string;
  onConfirm: (finalIntent: Intent) => void;
  onDismiss?: () => void;
  // When already resolved, the check renders read-only.
  readOnly?: boolean;
}

function Marker({ marker }: { marker: FieldSpec['marker'] }) {
  const { isDarkMode } = useTheme();
  if (marker === 'required') {
    return (
      <span
        title="Needed"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          isDarkMode ? 'bg-amber-800/70 text-amber-200' : 'bg-amber-100 text-amber-800'
        }`}
      >
        ?
      </span>
    );
  }
  return (
    <span
      title="Optional"
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
        isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
      }`}
    >
      i
    </span>
  );
}

const ConfirmationCheck: React.FC<ConfirmationCheckProps> = ({
  intent,
  specs,
  confirmLabel = 'Confirm',
  onConfirm,
  onDismiss,
  readOnly,
}) => {
  const { themeClasses, isDarkMode } = useTheme();
  // Local editable copy of field values; edits mark the field explicit.
  const [fields, setFields] = useState<Record<string, FieldValue<unknown>>>(() => ({ ...intent.fields }));
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const workingIntent = useMemo<Intent>(() => ({ ...intent, fields }), [intent, fields]);
  const missing = useMemo(() => missingRequired(specs, workingIntent), [specs, workingIntent]);

  // Shipping carries a repeated item block instead of flat item fields.
  const isShipping = intent.action === 'receipt' && intent.subtype === 'shipping';
  const shipmentItems = useMemo<ShipmentItem[]>(
    () => (isShipping ? toShipmentItems(fields.shipmentItems?.value) : []),
    [isShipping, fields.shipmentItems],
  );
  const shipmentReady = !isShipping || shipmentItems.some(isItemComplete);
  const canConfirm = missing.length === 0 && shipmentReady;

  const setValue = (key: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [key]: { value, source: 'explicit' } }));
  };

  const visibleSpecs = specs.filter((s) => isFieldVisible(s, fields[s.key]?.value));

  const renderValue = (spec: FieldSpec, fv: FieldValue<unknown> | undefined) => {
    const value = fv?.value;
    const isEmpty = value === null || value === undefined || value === '';

    if (spec.kind === 'toggle') {
      const on = value === true;
      return (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setValue(spec.key, !on)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            on ? themeClasses.status.success : themeClasses.status.warning
          }`}
        >
          {on ? 'On' : 'Off'}
        </button>
      );
    }

    if (editingKey === spec.key && !readOnly) {
      return (
        <input
          autoFocus
          defaultValue={value == null ? '' : String(value)}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const next = spec.kind === 'money' || spec.kind === 'quantity' ? (raw === '' ? null : Number(raw)) : raw || null;
            setValue(spec.key, next);
            setEditingKey(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditingKey(null);
          }}
          placeholder={spec.hint}
          className={`w-40 rounded-lg border px-2.5 py-1 text-[15px] outline-none ${themeClasses.input}`}
        />
      );
    }

    const display =
      spec.kind === 'money' && !isEmpty
        ? `$${Number(value).toFixed(2)}`
        : isEmpty
          ? spec.marker === 'required'
            ? 'Add'
            : 'Optional'
          : String(value);

    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setEditingKey(spec.key)}
        className={`group inline-flex items-center gap-1 text-[15px] ${
          isEmpty ? themeClasses.text.muted : themeClasses.text.primary
        }`}
      >
        <span>{display}</span>
        {!readOnly && <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />}
      </button>
    );
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${themeClasses.card.primary}`}>
      <ul className="space-y-1.5">
        {visibleSpecs.map((spec) => {
          const fv = fields[spec.key];
          const isGuessed = fv?.source === 'guessed';
          return (
            <li
              key={spec.key}
              className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 ${
                isGuessed ? (isDarkMode ? 'border border-dashed border-amber-600/60' : 'border border-dashed border-amber-400') : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Marker marker={spec.marker} />
                <span className={`text-[15px] ${themeClasses.text.secondary}`}>{spec.label}</span>
                {isGuessed && (
                  <span
                    title={fv?.reason}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      isDarkMode ? 'bg-amber-800/60 text-amber-200' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    guessed
                  </span>
                )}
              </div>
              <div className="text-right">{renderValue(spec, fv)}</div>
            </li>
          );
        })}
      </ul>

      {isShipping && (
        <div className="mt-3">
          <p className={`mb-1.5 text-xs font-medium ${themeClasses.text.secondary}`}>Shipment items</p>
          <ShipmentItemsEditor
            items={shipmentItems}
            taxEnabled={fields.gst?.value === true}
            readOnly={readOnly}
            onChange={(items) => setValue('shipmentItems', items)}
          />
        </div>
      )}

      {!readOnly && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`text-sm ${themeClasses.text.muted}`}>
            {canConfirm
              ? 'Ready when you are.'
              : missing.length > 0
                ? `Add ${missing.map((m) => m.label).join(', ')} to continue.`
                : 'Add a courier and cost to at least one item to continue.'}
          </span>
          <div className="flex items-center gap-2">
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className={`rounded-xl px-3 py-1.5 text-sm ${themeClasses.button.ghost}`}
              >
                Not now
              </button>
            )}
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => onConfirm(workingIntent)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${themeClasses.button.primary}`}
            >
              <Check className="h-4 w-4" />
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationCheck;
