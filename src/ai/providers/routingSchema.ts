// Zod schema for what the LLM provider is allowed to return: a routing decision
// only (action + optional receipt subtype + confidence + optional clarify text).
// Field extraction and provenance are not the model's job (see populateIntentFields
// in deterministic.ts), so the model cannot emit business values here. This is the
// contract the proxy's Gemini responseSchema mirrors; the client validates against
// it and falls back to the deterministic engine on any mismatch.
import { z } from 'zod';

export const routingSchema = z.object({
  action: z.enum([
    'receipt',
    'cartridge_create',
    'cartridge_modify',
    'cartridge_status',
    'cartridge_list',
    'note',
    'inventory',
    'directory',
    'followup',
    'track',
    'clarify',
    'unknown',
  ]),
  subtype: z.enum(['refill', 'supplies', 'shipping', 'key']).optional().nullable(),
  confidence: z.number().min(0).max(1),
  clarify: z.string().optional().nullable(),
});

export type Routing = z.infer<typeof routingSchema>;
