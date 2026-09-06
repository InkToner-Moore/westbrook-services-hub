// LlmProvider: an optional enhancement over the deterministic engine. It asks a
// tiny server-side proxy (which holds the Gemini key) to route an utterance, then
// hands the routing decision back to the deterministic field-filler. The model only
// improves routing; it never produces business values or runs logic. Any failure
// (proxy down, bad JSON, schema mismatch, timeout) falls back to the deterministic
// result, so AI Mode never gets worse than the free offline baseline.
// See docs/ai-mode/proxy.md and 01-design.md.
import type { AiParseContext, AiProvider, FieldValue, Intent } from '../types';
import { getFieldSpecs, missingRequired } from '../fieldSpecs';
import { DeterministicProvider, populateIntentFields } from './deterministic';
import { CANDIDATE_KEYS, routingSchema, type Candidates } from './routingSchema';

// Give up on the network path quickly; the deterministic fallback is instant and
// this runs at a walk-up counter where dead air reads as broken.
const REQUEST_TIMEOUT_MS = 4000;

// Trust the offline router at or above this confidence and skip the network. The
// weak model earns its call only on the cases the keyword router is unsure about
// (unknown, a lone weak keyword, or a cross-action tie). This keeps the common
// case instant and free, and spends the model where it actually helps.
const LOCAL_TRUST_THRESHOLD = 0.7;

// Map the model's coarse confidence bucket onto the 0..1 scale the app uses. A
// small model's self-reported float is poorly calibrated, so the proxy returns a
// bucket instead (see docs/ai-mode/proxy.md); older numeric responses still pass.
function bucketToConfidence(raw: unknown): number {
  if (typeof raw === 'number') return Math.max(0, Math.min(1, raw));
  switch (String(raw).toLowerCase()) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.65;
    case 'low':
      return 0.4;
    default:
      return 0.6;
  }
}

export class LlmProvider implements AiProvider {
  readonly name = 'llm';
  private readonly fallback = new DeterministicProvider();

  constructor(private readonly proxyUrl: string) {}

  async parse(utterance: string, context?: AiParseContext): Promise<Intent> {
    // A user-corrected misroute never needs the model; route deterministically.
    if (context?.forceAction) return this.fallback.parse(utterance, context);

    // Run the instant offline router first. It is the floor: it owns routing when
    // it is confident, and it owns every value it extracts, always.
    const local = await this.fallback.parse(utterance, context);
    const localConfident = local.action !== 'unknown' && local.confidence >= LOCAL_TRUST_THRESHOLD;

    // The model earns a call in two cases: (1) local routing is unsure, or (2)
    // local routed fine but a required field the counter needs is still empty and
    // the model might read it from vague phrasing. Otherwise stay instant and free.
    if (localConfident && !hasFillableGap(local)) return local;

    const routing = await this.route(utterance, context);

    // No usable routing: keep the deterministic result (already computed).
    if (!routing) return local;

    // Local routed confidently; we only called out for extraction help. Trust the
    // local routing and borrow the model's field candidates for the empty gaps.
    if (localConfident) {
      mergeCandidates(local, routing.fields);
      return local;
    }

    // The model disagreeing with a keyword hit is a genuine ambiguity, so keep the
    // local guess as the runner-up for the "did you mean ...?" one-tap correction.
    const runnerUp =
      local.action !== 'unknown' && local.action !== routing.action
        ? { action: local.action, subtype: local.subtype }
        : local.runnerUp;

    // Build the intent from the model's routing decision, then let the shared
    // deterministic filler own extraction + provenance, then fill only the gaps it
    // left from the model's candidates.
    const intent: Intent = {
      action: routing.action,
      subtype: routing.subtype ?? undefined,
      fields: {},
      confidence: bucketToConfidence(routing.confidence),
      clarify: routing.clarify ?? undefined,
      clarifyOptions: routing.clarifyOptions
        ? routing.clarifyOptions.map((o) => ({
            action: o.action as Intent['action'],
            subtype: o.subtype ?? undefined,
          }))
        : undefined,
      runnerUp,
    };
    populateIntentFields(intent, utterance);
    mergeCandidates(intent, routing.fields);
    return intent;
  }

  // Call the proxy once and validate. The repair retry only fires when we got a
  // response that failed the schema (the model can fix that). A hard failure
  // (proxy down, timeout, non-2xx) returns null immediately so we do not burn a
  // second full timeout before falling back to the instant deterministic engine.
  private async route(utterance: string, context?: AiParseContext) {
    const first = await this.callProxy(utterance, context, false);
    if (first === null) return null;
    const parsedFirst = routingSchema.safeParse(first);
    if (parsedFirst.success) return parsedFirst.data;

    const second = await this.callProxy(utterance, context, true);
    if (second === null) return null;
    const parsedSecond = routingSchema.safeParse(second);
    return parsedSecond.success ? parsedSecond.data : null;
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

// True when local routed to a spec'd action but a blocking field the counter needs
// is still empty AND that field is one the model is allowed to propose. This is the
// only reason to spend the model when local routing was already confident: to read a
// value the regex extractors missed in vague phrasing.
function hasFillableGap(intent: Intent): boolean {
  const specs = getFieldSpecs(intent);
  if (!specs) return false;
  const candidateKeys = new Set<string>(CANDIDATE_KEYS);
  return missingRequired(specs, intent).some((s) => candidateKeys.has(s.key));
}

// Merge the model's field candidates into the intent. The rule is strict: fill a
// field ONLY if it exists on the intent (declared by the spec) and deterministic
// extraction left it not_provided. Never overwrite an explicit or guessed value the
// deterministic engine already set. Everything filled here is marked `guessed` so
// the confirmation slip flags it for a human to check.
function mergeCandidates(intent: Intent, candidates: Candidates): void {
  if (!candidates) return;
  for (const key of CANDIDATE_KEYS) {
    const value = candidates[key];
    if (value === undefined || value === null || value === '') continue;
    const current = intent.fields[key] as FieldValue<unknown> | undefined;
    // Only fields the spec declared, and only where deterministic found nothing.
    if (!current || current.source !== 'not_provided') continue;
    intent.fields[key] = { value, source: 'guessed', reason: 'read by the assistant' };
  }
}
