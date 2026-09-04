// LlmProvider: an optional enhancement over the deterministic engine. It asks a
// tiny server-side proxy (which holds the Gemini key) to route an utterance, then
// hands the routing decision back to the deterministic field-filler. The model only
// improves routing; it never produces business values or runs logic. Any failure
// (proxy down, bad JSON, schema mismatch, timeout) falls back to the deterministic
// result, so AI Mode never gets worse than the free offline baseline.
// See docs/ai-mode/proxy.md and 01-design.md.
import type { AiParseContext, AiProvider, Intent } from '../types';
import { DeterministicProvider, populateIntentFields } from './deterministic';
import { routingSchema } from './routingSchema';

// Give up on the network path quickly; the deterministic fallback is instant.
const REQUEST_TIMEOUT_MS = 6000;

export class LlmProvider implements AiProvider {
  readonly name = 'llm';
  private readonly fallback = new DeterministicProvider();

  constructor(private readonly proxyUrl: string) {}

  async parse(utterance: string, context?: AiParseContext): Promise<Intent> {
    const routing = await this.route(utterance, context);

    // No usable routing: fall back to the deterministic engine entirely.
    if (!routing) return this.fallback.parse(utterance, context);

    // Build the intent from the model's routing decision, then let the shared
    // deterministic filler own extraction + provenance.
    const intent: Intent = {
      action: routing.action,
      subtype: routing.subtype ?? undefined,
      fields: {},
      confidence: routing.confidence,
      clarify: routing.clarify ?? undefined,
    };
    populateIntentFields(intent, utterance);
    return intent;
  }

  // Call the proxy once, validate; on invalid JSON/schema, retry once with a
  // repair hint; on any hard failure or a second miss, return null (-> fallback).
  private async route(utterance: string, context?: AiParseContext) {
    const first = await this.callProxy(utterance, context, false);
    if (first) {
      const parsed = routingSchema.safeParse(first);
      if (parsed.success) return parsed.data;
    }
    const second = await this.callProxy(utterance, context, true);
    if (second) {
      const parsed = routingSchema.safeParse(second);
      if (parsed.success) return parsed.data;
    }
    return null;
  }

  private async callProxy(
    utterance: string,
    context: AiParseContext | undefined,
    repair: boolean,
  ): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance,
          activeTab: context?.activeTab ?? null,
          repair,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
