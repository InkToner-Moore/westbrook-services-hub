// Zod schema for what the LLM provider is allowed to return: a routing decision
// plus optional field CANDIDATES. The candidates are suggestions only: the
// deterministic engine still runs first and owns every explicit value, the client
// merges a candidate in only where deterministic extraction left a field empty, and
// anything so filled is marked `guessed` so the confirmation slip flags it for a
// human. The model never overwrites a value the counter actually stated, and never
// executes anything. This is the contract the proxy's Gemini responseSchema mirrors;
// the client validates against it and falls back to the deterministic engine on any
// mismatch.
import { z } from 'zod';

// Coerce the model's candidate values defensively: numbers may arrive as strings,
// blank strings mean "not stated". A candidate that cannot be coerced is dropped
// (treated as absent), never forced through.
const candidateString = z.preprocess((v) => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}, z.string().optional());

const candidateNumber = z.preprocess((v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && v.trim() !== '' ? n : undefined;
  }
  return undefined;
}, z.number().optional());

// The fields the model may propose. Keys match the domain field keys the
// deterministic filler uses (see fillFields in deterministic.ts) so the merge is a
// plain key match. Deliberately NOT here: system-generated or regex-reliable fields
// (date, gst, orderId, status, url, categories) where the model adds risk, not help.
export const candidateSchema = z
  .object({
    customerName: candidateString,
    customerPhone: candidateString,
    brand: candidateString,
    model: candidateString,
    type: candidateString,
    quantity: candidateNumber,
    price: candidateNumber,
    supply: candidateString,
    keyModel: candidateString,
    item: candidateString,
    content: candidateString,
  })
  .partial()
  .optional()
  .nullable();

export const routingSchema = z.object({
  action: z.enum([
    'receipt',
    'cartridge_create',
    'cartridge_modify',
    'cartridge_status',
    'cartridge_list',
    'note',
    'inventory',
    'inventory_lookup',
    'directory',
    'purchase',
    // The model only routes to `timesheet`; the deterministic filler decides the
    // op (punch in/out, view, add employee) from the words and owns the values.
    'timesheet',
    'track',
    'clarify',
    'unknown',
  ]),
  subtype: z.enum(['refill', 'supplies', 'shipping', 'key']).optional().nullable(),
  // Coarse bucket from the model (a weak model's raw float is poorly calibrated).
  // A plain number is still accepted so an older proxy response keeps validating;
  // llm.ts maps either form onto the app's 0..1 scale.
  confidence: z.union([z.enum(['high', 'medium', 'low']), z.number().min(0).max(1)]),
  clarify: z.string().optional().nullable(),
  // The routes a clarify is choosing between, so the picker shows just those.
  // Older proxies omit this; the client falls back to the full menu then.
  clarifyOptions: z
    .array(
      z.object({
        action: z.string(),
        subtype: z.enum(['refill', 'supplies', 'shipping', 'key']).optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  // Optional field candidates (older proxies omit this; still validates).
  fields: candidateSchema,
});

export type Routing = z.infer<typeof routingSchema>;
export type Candidates = z.infer<typeof candidateSchema>;

// The candidate keys, as the merge in llm.ts iterates them. Kept here next to the
// schema so the two never drift.
export const CANDIDATE_KEYS = [
  'customerName',
  'customerPhone',
  'brand',
  'model',
  'type',
  'quantity',
  'price',
  'supply',
  'keyModel',
  'item',
  'content',
] as const;
