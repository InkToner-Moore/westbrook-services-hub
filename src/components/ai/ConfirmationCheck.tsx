// The confirmation slip: the moment a proposed action is checked over before
// anything happens. It lives in the artifact rail now (the chat just points at
// it); this is still the centrepiece of AI Mode, so it stays styled as what it
// is: a counter slip. A titled header names the action, the fields read as a
// ledger (label left, value right, figures aligned), and guessed values are
// called out so staff can trust what was inferred. Markers: "?" = needed,
// "i" = optional. The pinned Confirm / Not now controls live in the rail's foot
// (ArtifactActions); this component owns the ledger and, via
// `useConfirmationDraft`, the field-edit state both the slip and the foot read.
import React, { useEffect, useMemo, useState } from 'react';
import {
  HelpCircle,
  Pencil,
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

export interface ConfirmationDraft {
  fields: Record<string, FieldValue<unknown>>;
  editingKey: string | null;
  setEditingKey: (key: string | null) => void;
  setValue: (key: string, value: unknown) => void;
  // The intent as currently edited; what Confirm hands off to run.
  workingIntent: Intent;
  missing: FieldSpec[];
  isShipping: boolean;
  shipmentItems: ShipmentItem[];
  canConfirm: boolean;
}

// Local editable copy of a proposed intent's fields, shared by the slip body (the
// ledger, rendered by <ConfirmationCheck>) and the rail's pinned Confirm / Not
// now foot (<ArtifactActions>), so both read the same draft. Own this in the
// common parent (the artifact rail) and pass it to each.
export function useConfirmationDraft(intent: Intent, specs: FieldSpec[]): ConfirmationDraft {
  const [fields, setFields] = useState<Record<string, FieldValue<unknown>>>(() => ({ ...intent.fields }));
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // A reroute swaps in a freshly parsed intent (a new object each time); start
  // the draft over from its fields rather than carrying stale edits across.
  useEffect(() => {
    setFields({ ...intent.fields });
    setEditingKey(null);
  }, [intent]);

  const setValue = (key: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [key]: { value, source: 'explicit' } }));
  };

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

  return { fields, editingKey, setEditingKey, setValue, workingIntent, missing, isShipping, shipmentItems, canConfirm };
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

interface ConfirmationCheckProps {
  intent: Intent;
  specs: FieldSpec[];
  draft: ConfirmationDraft;
  // Re-route this utterance to a different action when the router guessed wrong.
  onReroute?: (action: AiAction, subtype?: ReceiptSubtype) => void;
}

const ConfirmationCheck: React.FC<ConfirmationCheckProps> = ({ intent, specs, draft, onReroute }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const { fields, editingKey, setEditingKey, setValue, isShipping, shipmentItems } = draft;

  // A low-confidence route is worth a gentle "double-check" nudge. The model
  // returns 0..1; the deterministic engine uses coarse buckets (<= 0.5 is a
  // weak keyword hit).
  const lowConfidence = typeof intent.confidence === 'number' && intent.confidence > 0 && intent.confidence < 0.5;
  // A close-call route gives us a concrete second guess: offer it as one tap
  // instead of the generic "not sure" nudge or the full grid.
  const runnerUpLabel = onReroute && intent.runnerUp ? routeLabel(intent.runnerUp.action, intent.runnerUp.subtype) : null;

  const visibleSpecs = specs.filter((s) => isFieldVisible(s, fields[s.key]?.value));

  const renderValue = (spec: FieldSpec, fv: FieldValue<unknown> | undefined) => {
    const value = fv?.value;
    const isEmpty = value === null || value === undefined || value === '';

    if (spec.kind === 'toggle') {
      const on = value === true;
      return (
        <button
          type="button"
          onClick={() => setValue(spec.key, !on)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            on ? themeClasses.status.success : themeClasses.status.warning
          }`}
        >
          {on ? 'On' : 'Off'}
        </button>
      );
    }

    if (editingKey === spec.key) {
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
        onClick={() => setEditingKey(spec.key)}
        className={`group inline-flex items-center gap-1 text-[15px] ${alignFigures ? 'tabular-nums' : ''} ${
          isEmpty ? themeClasses.text.muted : themeClasses.text.primary
        }`}
      >
        <span className={isEmpty ? 'underline decoration-dotted underline-offset-4' : ''}>{display}</span>
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  };

  const HeaderIcon = ACTION_ICON[intent.action] ?? FileText;
  const heading = routeLabel(intent.action, intent.subtype) ?? 'Check and confirm';
  // The ink accent (from Ink, Toner & Moore) marks this slip apart from the plain
  // chat that pointed here. Blue stays the action colour for Confirm.
  const inkHeader = isDarkMode
    ? 'bg-indigo-900/25 border-indigo-800/50 text-indigo-100'
    : 'bg-indigo-50 border-indigo-100 text-indigo-900';
  const divide = isDarkMode ? 'divide-slate-700/70' : 'divide-slate-100';

  return (
    <div className={`overflow-hidden rounded-2xl border ${themeClasses.card.primary}`}>
      {/* Slip header: names what is being confirmed. */}
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${inkHeader}`}>
        <HeaderIcon className="h-4 w-4 shrink-0" />
        <span className="text-[15px] font-semibold tracking-tight">{heading}</span>
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
              onChange={(items) => setValue('shipmentItems', items)}
            />
          </div>
        )}

        {onReroute && (
          <div className="mt-3">
            <IntentSuggestions variant="inline" currentAction={intent.action} currentSubtype={intent.subtype} onPick={onReroute} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmationCheck;
