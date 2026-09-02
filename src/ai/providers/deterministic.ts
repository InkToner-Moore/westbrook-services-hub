// DeterministicProvider: routes an utterance to an action and fills its fields
// with no network call. This is the always-available baseline that makes AI Mode
// work for free and offline. Every value carries provenance (explicit / guessed /
// not_provided) so the confirmation check can mark guessed fields.
// See docs/ai-mode/02-implementation-plan.md.
import type { AiAction, AiParseContext, AiProvider, FieldValue, Intent, ReceiptSubtype } from '../types';
import { getFieldSpecs } from '../fieldSpecs';
import {
  extractBrand,
  extractEmail,
  extractModel,
  extractMoney,
  extractName,
  extractPhone,
  extractQuantity,
  extractTracking,
  extractType,
  todayIso,
} from '../extract';

// Keyword groups per action. First match wins, checked most-specific first.
const ROUTES: Array<{ action: AiAction; subtype?: ReceiptSubtype; words: string[] }> = [
  { action: 'receipt', subtype: 'refill', words: ['refill', 'refilled', 'toner refill'] },
  { action: 'receipt', subtype: 'shipping', words: ['ship', 'shipment', 'courier', 'parcel', 'drop off', 'dropoff'] },
  { action: 'receipt', subtype: 'key', words: ['key cut', 'key cutting', 'cut a key', 'key copy', 'copy a key'] },
  { action: 'receipt', subtype: 'supplies', words: ['purchase', 'buy', 'bought', 'sold', 'sale', 'supply', 'supplies'] },
  { action: 'cartridge_status', words: ['mark ready', 'set status', 'picked up', 'is ready', 'change status', 'mark as'] },
  { action: 'cartridge_list', words: ['list orders', 'show orders', 'pending orders', 'all orders', 'open orders'] },
  { action: 'cartridge_modify', words: ['modify order', 'edit order', 'update order', 'change order'] },
  { action: 'cartridge_create', words: ['new order', 'cartridge order', 'refill order', 'create order', 'log an order'] },
  { action: 'track', words: ['track', 'tracking', 'where is', 'fedex', 'ups', 'purolator', 'canada post', 'dhl'] },
  { action: 'note', words: ['note', 'remember', 'jot'] },
  { action: 'inventory', words: ['inventory', 'in stock', 'out of stock', 'restock'] },
  { action: 'directory', words: ['directory', 'website', 'link', 'bookmark'] },
  { action: 'followup', words: ['follow up', 'follow-up', 'call back', 'waiting list', 'customer request'] },
];

const RECEIPT_HINT = ['receipt', 'invoice'];

// Provenance helpers.
const explicit = <T>(value: T): FieldValue<T> => ({ value, source: 'explicit' });
const guessed = <T>(value: T, reason: string): FieldValue<T> => ({ value, source: 'guessed', reason });
const absent = (): FieldValue<unknown> => ({ value: null, source: 'not_provided' });

// Try an explicit extraction; fall back to a guessed default; else not_provided.
function fieldFrom<T>(found: T | null, fallback?: { value: T; reason: string }): FieldValue<unknown> {
  if (found !== null && found !== undefined) return explicit(found);
  if (fallback) return guessed(fallback.value, fallback.reason);
  return absent();
}

// Fill the fields declared by a spec, using the right extractor per key.
function fillFields(specKeys: string[], text: string): Record<string, FieldValue<unknown>> {
  const fields: Record<string, FieldValue<unknown>> = {};
  for (const key of specKeys) {
    switch (key) {
      case 'date':
        fields[key] = guessed(todayIso(), "today's date");
        break;
      case 'gst':
        fields[key] = guessed(true, 'GST applied by default');
        break;
      case 'quantity':
        fields[key] = fieldFrom(extractQuantity(text), { value: 1, reason: 'defaulted to 1' });
        break;
      case 'brand':
        fields[key] = fieldFrom(extractBrand(text));
        break;
      case 'type':
        fields[key] = fieldFrom(extractType(text));
        break;
      case 'model':
        fields[key] = fieldFrom(extractModel(text));
        break;
      case 'price':
        fields[key] = fieldFrom(extractMoney(text));
        break;
      case 'customerName':
        fields[key] = fieldFrom(extractName(text));
        break;
      case 'customerPhone':
        fields[key] = fieldFrom(extractPhone(text));
        break;
      case 'customerEmail':
        fields[key] = fieldFrom(extractEmail(text));
        break;
      // Free-text fields we cannot reliably auto-fill: leave for the user.
      case 'supply':
      case 'keyModel':
      case 'notes':
      default:
        fields[key] = absent();
        break;
    }
  }
  return fields;
}

export class DeterministicProvider implements AiProvider {
  readonly name = 'deterministic';

  async parse(utterance: string, _context?: AiParseContext): Promise<Intent> {
    const text = utterance;
    const lower = utterance.toLowerCase();

    let action: AiAction = 'unknown';
    let subtype: ReceiptSubtype | undefined;
    let confidence = 0;

    for (const route of ROUTES) {
      if (route.words.some((w) => lower.includes(w))) {
        action = route.action;
        subtype = route.subtype;
        confidence = 0.6;
        break;
      }
    }

    if (action === 'unknown' && RECEIPT_HINT.some((w) => lower.includes(w))) {
      action = 'receipt';
      confidence = 0.4;
    }

    const intent: Intent = { action, subtype, fields: {}, confidence };

    // Fill fields for actions that have a confirmation spec.
    const specs = getFieldSpecs(intent);
    if (specs) {
      intent.fields = fillFields(specs.map((s) => s.key), text);
    }

    // Tracking has no confirmation spec; fill courier + number directly.
    if (action === 'track') {
      const { courier, trackingNumber } = extractTracking(text);
      intent.fields = {
        courier: courier
          ? { value: courier, source: 'explicit' }
          : { value: null, source: 'not_provided' },
        trackingNumber: trackingNumber
          ? { value: trackingNumber, source: 'explicit' }
          : { value: null, source: 'not_provided' },
      };
    }

    return intent;
  }
}
