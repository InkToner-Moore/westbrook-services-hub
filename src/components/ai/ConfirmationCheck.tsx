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
  Package,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { AiAction, FieldValue, Intent, IntentAttachments, ReceiptSubtype } from '@/ai/types';
import { type FieldSpec, isFieldVisible, missingRequired } from '@/ai/fieldSpecs';
import { GST_RATE, grossFromNet, netFromGross, taxOf } from '@/lib/canadaTax';
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
  track: Package,
};

// Compound attachments (also charge card / also print a 4x6 label) live on the
// intent as `intent.attach` (types.ts; see PHASE-2-ARCH section 1.2).
const readAttach = (intent: Intent): IntentAttachments | undefined => intent.attach;

export interface ConfirmationDraft {
  fields: Record<string, FieldValue<unknown>>;
  editingKey: string | null;
  setEditingKey: (key: string | null) => void;
  setValue: (key: string, value: unknown) => void;
  // Per-field omit: the circle left of a row toggles it. An omitted field is
  // dropped from workingIntent.fields and excluded from the blocking check, so
  // Confirm is never blocked by an omitted field even when it is required.
  omitted: Set<string>;
  toggleOmit: (key: string) => void;
  // Compound attachments, editable so the foot's toggles can flip them before
  // Confirm. Carried onto workingIntent for the confirm chain to honor.
  attach?: IntentAttachments;
  toggleAttach: (key: keyof IntentAttachments, value: boolean) => void;
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
  const [omitted, setOmitted] = useState<Set<string>>(() => new Set());
  const [attach, setAttach] = useState<IntentAttachments | undefined>(() => readAttach(intent));

  // A reroute swaps in a freshly parsed intent (a new object each time); start
  // the draft over from its fields rather than carrying stale edits across.
  useEffect(() => {
    setFields({ ...intent.fields });
    setEditingKey(null);
    setOmitted(new Set());
    setAttach(readAttach(intent));
  }, [intent]);

  const setValue = (key: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [key]: { value, source: 'explicit' } }));
  };

  const toggleOmit = (key: string) => {
    setOmitted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAttach = (key: keyof IntentAttachments, value: boolean) => {
    setAttach((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  // Omitted keys are DELETED from the built intent so downstream builders never
  // see them (the encoding chosen per PHASE-2-ARCH section 2.1).
  const workingIntent = useMemo<Intent>(() => {
    const nextFields: Record<string, FieldValue<unknown>> = { ...fields };
    omitted.forEach((key) => {
      delete nextFields[key];
    });
    const base = { ...intent, fields: nextFields };
    if (attach) (base as Record<string, unknown>).attach = attach;
    return base as Intent;
  }, [intent, fields, omitted, attach]);

  // Dropping a key from fields alone would read as "missing" to missingRequired,
  // so also drop omitted specs from the enforced set: an omitted required field
  // must not block Confirm.
  const activeSpecs = useMemo(() => specs.filter((s) => !omitted.has(s.key)), [specs, omitted]);
  const missing = useMemo(() => missingRequired(activeSpecs, workingIntent), [activeSpecs, workingIntent]);

  // Shipping carries a repeated item block instead of flat item fields.
  const isShipping = intent.action === 'receipt' && intent.subtype === 'shipping';
  const shipmentItems = useMemo<ShipmentItem[]>(
    () => (isShipping ? toShipmentItems(fields.shipmentItems?.value) : []),
    [isShipping, fields.shipmentItems],
  );
  const shipmentReady = !isShipping || shipmentItems.some(isItemComplete);
  const canConfirm = missing.length === 0 && shipmentReady;

  return {
    fields,
    editingKey,
    setEditingKey,
    setValue,
    omitted,
    toggleOmit,
    attach,
    toggleAttach,
    workingIntent,
    missing,
    isShipping,
    shipmentItems,
    canConfirm,
  };
}

// The circle to the left of a field row. Filled = included, empty = omitted.
// State is carried by shape (fill) and by the struck-through row, not colour
// alone, per the accessibility floor.
function OmitToggle({ omitted, onToggle, label }: { omitted: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!omitted}
      aria-label={omitted ? `Include ${label} on the slip` : `Omit ${label} from the slip`}
      title={omitted ? 'Omitted. Click to include.' : 'Included. Click to omit.'}
      onClick={onToggle}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <span
        className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
          omitted ? 'border-slate-400' : 'border-blue-600 bg-blue-600'
        }`}
      />
    </button>
  );
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
  const { fields, editingKey, setEditingKey, setValue, omitted, toggleOmit, isShipping, shipmentItems } = draft;

  // Tax context for the money field. When the slip carries a GST toggle and it is
  // on, a money field becomes two-way: the counter can type the pre-tax price OR
  // the tax-inclusive price and the other derives from it. The stored value is
  // always the pre-tax (net) amount, since that is what the receipt builder taxes.
  const gstSpec = specs.find((s) => s.key === 'gst' && s.kind === 'toggle');
  const gstOn = gstSpec ? fields.gst?.value === true : false;
  // Which money fields the counter is currently entering tax-inclusive. A field
  // not in the set is entered pre-tax (the default). Keyed so it generalises past
  // the single 'price' field, though today only that field is money-on-a-receipt.
  const [taxInclKeys, setTaxInclKeys] = useState<Set<string>>(() => new Set());
  const toggleTaxIncl = (key: string) =>
    setTaxInclKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A low-confidence route is worth a gentle "double-check" nudge. The model
  // returns 0..1; the deterministic engine uses coarse buckets (<= 0.5 is a
  // weak keyword hit).
  const lowConfidence = typeof intent.confidence === 'number' && intent.confidence > 0 && intent.confidence < 0.5;
  // A close-call route gives us a concrete second guess: offer it as one tap
  // instead of the generic "not sure" nudge or the full grid.
  const runnerUpLabel = onReroute && intent.runnerUp ? routeLabel(intent.runnerUp.action, intent.runnerUp.subtype) : null;

  const visibleSpecs = specs.filter((s) => isFieldVisible(s, fields[s.key]?.value));

  // The two-way money field. `value` in fields is always the pre-tax (net) price.
  // When GST is on the counter can flip a "tax incl." toggle to type the tax-
  // inclusive figure instead; we convert back to net on entry so downstream never
  // changes. When GST is off it is a plain price field.
  const renderMoney = (spec: FieldSpec, fv: FieldValue<unknown> | undefined) => {
    const value = fv?.value;
    const isEmpty = value === null || value === undefined || value === '';
    const net = isEmpty ? null : Number(value);
    const twoWay = gstOn; // only offer the incl/excl choice when GST applies
    const taxIncl = twoWay && taxInclKeys.has(spec.key);
    // Primary figure follows the chosen mode; the secondary line shows the other.
    const primary = net == null ? null : taxIncl ? grossFromNet(net) : net;
    const secondary = net == null ? null : taxIncl ? net : grossFromNet(net);

    const taxToggle = twoWay ? (
      <button
        type="button"
        role="switch"
        aria-checked={taxIncl}
        onClick={() => toggleTaxIncl(spec.key)}
        title={taxIncl ? 'Entering the tax-inclusive price. Click for pre-tax.' : 'Entering the pre-tax price. Click for tax-inclusive.'}
        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${
          taxIncl
            ? isDarkMode
              ? 'border-amber-600/60 bg-amber-800/50 text-amber-200'
              : 'border-amber-300 bg-amber-100 text-amber-800'
            : isDarkMode
              ? 'border-[#2a2f3a] text-[#9aa4b2] hover:bg-[#1f232c]'
              : 'border-[#e4e1d9] text-[#5b6270] hover:bg-[#f1efe9]'
        }`}
      >
        tax incl.
      </button>
    ) : null;

    if (editingKey === spec.key) {
      return (
        <div className="flex flex-col items-end gap-1.5">
          <input
            autoFocus
            inputMode="decimal"
            defaultValue={primary == null ? '' : primary.toFixed(2)}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (raw === '') {
                setValue(spec.key, null);
                setEditingKey(null);
                return;
              }
              const typed = Number(raw);
              const nextNet = Number.isFinite(typed) ? (taxIncl ? netFromGross(typed) : typed) : null;
              setValue(spec.key, nextNet);
              setEditingKey(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditingKey(null);
            }}
            placeholder={taxIncl ? 'tax-inclusive price' : spec.hint ?? 'pre-tax price'}
            className={`w-32 rounded-lg border px-2.5 py-1.5 text-right font-mono text-[15px] tabular-nums outline-none ${themeClasses.input}`}
          />
          {taxToggle}
        </div>
      );
    }

    const display = isEmpty ? (spec.marker === 'required' ? 'Add' : 'Optional') : `$${primary!.toFixed(2)}`;
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setEditingKey(spec.key)}
          className={`group inline-flex items-center gap-1 font-mono text-[15px] tabular-nums ${
            isEmpty ? themeClasses.text.muted : themeClasses.text.primary
          }`}
        >
          <span className={isEmpty ? 'font-sans underline decoration-dotted underline-offset-4' : ''}>{display}</span>
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
        {twoWay && (
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <span className={`font-mono text-[11px] tabular-nums ${themeClasses.text.muted}`}>
                {taxIncl ? `$${secondary!.toFixed(2)} before GST` : `$${secondary!.toFixed(2)} with GST`}
              </span>
            )}
            {taxToggle}
          </div>
        )}
      </div>
    );
  };

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

    if (spec.kind === 'money') {
      return renderMoney(spec, fv);
    }

    if (spec.kind === 'select') {
      // A fixed dropdown. Match the stored value to an option case-insensitively so
      // a seeded default like 'general' still selects "General"; the option chosen
      // is stored verbatim.
      const current = spec.options?.find((o) => o.toLowerCase() === String(value ?? '').toLowerCase()) ?? '';
      return (
        <select
          value={current}
          onChange={(e) => setValue(spec.key, e.target.value || null)}
          className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-[15px] outline-none ${themeClasses.input}`}
        >
          {!current && <option value="">Choose...</option>}
          {spec.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (editingKey === spec.key) {
      return (
        <input
          autoFocus
          defaultValue={value == null ? '' : String(value)}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const next = spec.kind === 'quantity' ? (raw === '' ? null : Number(raw)) : raw || null;
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

    const display = isEmpty ? (spec.marker === 'required' ? 'Add' : 'Optional') : String(value);
    const alignFigures = spec.kind === 'quantity';
    return (
      <button
        type="button"
        onClick={() => setEditingKey(spec.key)}
        className={`group inline-flex items-center gap-1 text-[15px] ${alignFigures ? 'font-mono tabular-nums' : ''} ${
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
  const rule = isDarkMode ? 'border-[#2a2f3a]' : 'border-[#e4e1d9]';

  // One total rule at the foot of the ledger, like a real slip: when the slip has
  // a price and a GST toggle, show the tax and the after-GST total (or just the
  // total when GST is off). An omitted or empty price drops out of the total.
  const moneySpec = specs.find((s) => s.kind === 'money');
  const priceRaw = moneySpec ? fields[moneySpec.key]?.value : undefined;
  const priceNet =
    moneySpec && gstSpec && !omitted.has(moneySpec.key) && priceRaw !== null && priceRaw !== undefined && priceRaw !== ''
      ? Number(priceRaw)
      : null;
  const showTotal = priceNet != null && Number.isFinite(priceNet);
  const totalTax = showTotal && gstOn ? taxOf(priceNet) : 0;
  const totalDue = showTotal ? (gstOn ? grossFromNet(priceNet) : priceNet) : 0;

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
            const isOmitted = omitted.has(spec.key);
            return (
              <li key={spec.key} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <OmitToggle omitted={isOmitted} onToggle={() => toggleOmit(spec.key)} label={spec.label} />
                  <Marker marker={spec.marker} />
                  <span
                    className={`text-[15px] ${themeClasses.text.secondary} ${
                      isOmitted ? 'line-through opacity-50' : ''
                    }`}
                  >
                    {spec.label}
                  </span>
                  {isGuessed && !isOmitted && (
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
                <div className={`text-right ${isOmitted ? 'pointer-events-none line-through opacity-40' : ''}`}>
                  {renderValue(spec, fv)}
                </div>
              </li>
            );
          })}
        </ul>

        {showTotal && (
          <div className={`mt-1 space-y-1 border-t pt-2.5 ${rule}`}>
            {gstOn && (
              <div className={`flex items-center justify-between text-[13px] ${themeClasses.text.secondary}`}>
                <span>{`GST (${GST_RATE * 100}%)`}</span>
                <span className="font-mono tabular-nums">${totalTax.toFixed(2)}</span>
              </div>
            )}
            <div className={`flex items-center justify-between text-[15px] font-semibold ${themeClasses.text.primary}`}>
              <span>{gstOn ? 'Total (incl. GST)' : 'Total'}</span>
              <span className="font-mono tabular-nums">${totalDue.toFixed(2)}</span>
            </div>
          </div>
        )}

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
