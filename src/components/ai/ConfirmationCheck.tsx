// The in-chat confirmation check: the moment a proposed action is confirmed or
// edited before anything happens. This is the centrepiece of AI Mode, so it is
// styled as what it becomes: a counter slip. A titled header names the action, the
// fields read as a ledger (label left, value right, figures aligned), and a total
// rule sits above Confirm. Markers: "?" = needed, "i" = optional; guessed values
// are called out so staff can trust what was inferred. See docs/ai-mode/01-design.md.
import React, { useMemo, useState } from 'react';
import {
  Check,
  Pencil,
  HelpCircle,
  Receipt,
  Printer,
  StickyNote,
  Boxes,
  BookMarked,
  ClipboardList,
  Package,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { AiAction, FieldValue, Intent, ReceiptSubtype } from '@/ai/types';
import { type FieldSpec, isFieldVisible, missingRequired } from '@/ai/fieldSpecs';
import { isItemComplete, toShipmentItems, type ShipmentItem } from '@/ai/shipping';
import ShipmentItemsEditor from './ShipmentItemsEditor';
import IntentSuggestions from './IntentSuggestions';
import { routeLabel } from '@/ai/intentOptions';

// One icon per action for the slip header. Cartridge actions share the printer.
const ACTION_ICON: Partial<Record<AiAction, LucideIcon>> = {
  receipt: Receipt,
  cartridge_create: Printer,
  cartridge_modify: Printer,
  cartridge_status: Printer,
  note: StickyNote,
  inventory: Boxes,
  directory: BookMarked,
  followup: ClipboardList,
  track: Package,
};

interface ConfirmationCheckProps {
  intent: Intent;
  specs: FieldSpec[];
  confirmLabel?: string;
  onConfirm: (finalIntent: Intent) => void;
  onDismiss?: () => void;
  // Re-route this utterance to a different action when the router guessed wrong.
  onReroute?: (action: AiAction, subtype?: ReceiptSubtype) => void;
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
  onReroute,
  readOnly,
}) => {
  const { themeClasses, isDarkMode } = useTheme();
  // A low-confidence route is worth a gentle "double-check" nudge. The model
  // returns 0..1; the deterministic engine uses coarse buckets (<= 0.5 is a
  // weak keyword hit). Only nudge while the check is still actionable.
  const lowConfidence = !readOnly && typeof intent.confidence === 'number' && intent.confidence > 0 && intent.confidence < 0.5;
  // A close-call route gives us a concrete second guess: offer it as one tap
  // instead of the generic "not sure" nudge or the full grid.
  const runnerUpLabel =
    !readOnly && onReroute && intent.runnerUp ? routeLabel(intent.runnerUp.action, intent.runnerUp.subtype) : null;
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

    const alignFigures = spec.kind === 'money' || spec.kind === 'quantity';
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setEditingKey(spec.key)}
        className={`group inline-flex items-center gap-1 text-[15px] ${alignFigures ? 'tabular-nums' : ''} ${
          isEmpty ? themeClasses.text.muted : themeClasses.text.primary
        }`}
      >
        <span className={isEmpty && !readOnly ? 'underline decoration-dotted underline-offset-4' : ''}>{display}</span>
        {!readOnly && <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />}
      </button>
    );
  };

  const HeaderIcon = ACTION_ICON[intent.action] ?? FileText;
  const heading = routeLabel(intent.action, intent.subtype) ?? 'Check and confirm';
  // The ink accent (from Ink, Toner & Moore) marks this slip apart from the plain
  // chat around it. Blue stays the action colour so Confirm reads consistently.
  const inkHeader = isDarkMode
    ? 'bg-indigo-900/25 border-indigo-800/50 text-indigo-100'
    : 'bg-indigo-50 border-indigo-100 text-indigo-900';
  const divide = isDarkMode ? 'divide-slate-700/70' : 'divide-slate-100';
  const footerBorder = isDarkMode ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-md ${themeClasses.card.primary}`}>
      {/* Slip header: names what is being confirmed. */}
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${inkHeader}`}>
        <HeaderIcon className="h-4 w-4 shrink-0" />
        <span className="text-[15px] font-semibold tracking-tight">{heading}</span>
        {readOnly && <Check className="ml-auto h-4 w-4 shrink-0 opacity-70" />}
      </div>

      <div className="px-4 py-3">
        {runnerUpLabel ? (
          <div
            className={`mb-3 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${
              isDarkMode ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Or did you mean</span>
            <button
              type="button"
              onClick={() => onReroute?.(intent.runnerUp!.action, intent.runnerUp!.subtype)}
              className={`rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${
                isDarkMode ? 'border-amber-600/60 hover:bg-amber-800/40' : 'border-amber-300 hover:bg-amber-100'
              }`}
            >
              {runnerUpLabel}
            </button>
            <span>?</span>
          </div>
        ) : (
          lowConfidence && (
            <div
              className={`mb-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${
                isDarkMode ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              <span>I wasn't fully sure this is right. Give it a quick look.</span>
            </div>
          )
        )}

        {/* Ledger: label left, value right, ruled between rows like a slip. */}
        <ul className={`divide-y ${divide}`}>
          {visibleSpecs.map((spec) => {
            const fv = fields[spec.key];
            const isGuessed = fv?.source === 'guessed';
            return (
              <li key={spec.key} className="flex items-center justify-between gap-3 py-2">
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
      </div>

      {/* Total rule + actions, like the tear line at the foot of a slip. */}
      {!readOnly && (
        <div className={`border-t px-4 py-3 ${footerBorder}`}>
          <div className="flex items-center justify-between gap-2">
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
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium disabled:opacity-40 ${themeClasses.button.primary}`}
              >
                <Check className="h-4 w-4" />
                {confirmLabel}
              </button>
            </div>
          </div>

          {onReroute && (
            <IntentSuggestions
              variant="inline"
              currentAction={intent.action}
              currentSubtype={intent.subtype}
              onPick={onReroute}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ConfirmationCheck;
