// DeterministicProvider: routes an utterance to an action with no network call.
// This is the always-available baseline that makes AI Mode work for free and
// offline. Field extraction is intentionally minimal here in Phase 1 and gets
// filled out in Phase 2. See docs/ai-mode/02-implementation-plan.md.
import type { AiAction, AiParseContext, AiProvider, Intent, ReceiptSubtype } from '../types';

// Keyword groups per action. First match wins, checked most-specific first.
const ROUTES: Array<{ action: AiAction; subtype?: ReceiptSubtype; words: string[] }> = [
  { action: 'receipt', subtype: 'refill', words: ['refill', 'refilled', 'toner refill'] },
  { action: 'receipt', subtype: 'shipping', words: ['ship', 'shipment', 'courier', 'parcel', 'drop off', 'dropoff'] },
  { action: 'receipt', subtype: 'key', words: ['key cut', 'key cutting', 'cut a key', 'key copy'] },
  { action: 'receipt', subtype: 'supplies', words: ['purchase', 'buy', 'sold', 'sale', 'supply', 'supplies'] },
  { action: 'cartridge_status', words: ['mark ready', 'set status', 'picked up', 'is ready', 'change status'] },
  { action: 'cartridge_list', words: ['list orders', 'show orders', 'pending orders', 'all orders'] },
  { action: 'cartridge_modify', words: ['modify order', 'edit order', 'update order', 'change order'] },
  { action: 'cartridge_create', words: ['new order', 'cartridge order', 'refill order', 'create order'] },
  { action: 'track', words: ['track', 'tracking', 'where is', 'fedex', 'ups', 'purolator', 'canada post', 'dhl'] },
  { action: 'note', words: ['note', 'remember', 'jot'] },
  { action: 'inventory', words: ['inventory', 'in stock', 'out of stock', 'restock'] },
  { action: 'directory', words: ['directory', 'website', 'link', 'bookmark'] },
  { action: 'followup', words: ['follow up', 'follow-up', 'call back', 'waiting list', 'request'] },
];

// A generic "receipt" mention with no clearer subtype still routes to receipt.
const RECEIPT_HINT = ['receipt', 'invoice'];

export class DeterministicProvider implements AiProvider {
  readonly name = 'deterministic';

  async parse(utterance: string, _context?: AiParseContext): Promise<Intent> {
    const text = utterance.toLowerCase();

    for (const route of ROUTES) {
      if (route.words.some((w) => text.includes(w))) {
        return {
          action: route.action,
          subtype: route.subtype,
          fields: {},
          confidence: 0.6,
        };
      }
    }

    if (RECEIPT_HINT.some((w) => text.includes(w))) {
      return { action: 'receipt', fields: {}, confidence: 0.4 };
    }

    return { action: 'unknown', fields: {}, confidence: 0 };
  }
}
