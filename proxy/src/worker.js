// AI Mode routing proxy (Cloudflare Worker).
//
// Holds the Gemini key server-side and does one job: take a staff utterance and
// return a routing decision (action + optional receipt subtype + confidence +
// optional clarify), nothing more. Field extraction and all business logic live in
// the SPA's deterministic engine, so this proxy can never emit customer data or run
// store logic. If Gemini fails, the client falls back to the deterministic engine.
//
// Secrets / vars (set with `wrangler secret put` or in wrangler.toml [vars]):
//   GEMINI_API_KEY   (secret, required)  the Google AI Studio key
//   ALLOWED_ORIGIN   (var, required)     exact staging origin allowed via CORS
//   GEMINI_MODEL     (var, optional)     defaults to gemini-flash-lite-latest

const ACTIONS = [
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
];
const SUBTYPES = ['refill', 'supplies', 'shipping', 'key'];

// Mirrors src/ai/providers/routingSchema.ts. Gemini enforces this shape.
// propertyOrdering makes the model commit to the coarse action first, then the
// subtype, then confidence. Per-field descriptions carry the tie-break rules
// right where the choice is made, which a weak model attends to better than a
// rule buried in the system prompt. Confidence is a coarse bucket, not a float:
// a small model's self-reported number is poorly calibrated.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    action: {
      type: 'STRING',
      enum: ACTIONS,
      description:
        'The single best action. A priced "refill for <name>" is receipt (not cartridge_create). A bare courier/tracking number is track. Use clarify only when the task is real but genuinely ambiguous; unknown when it is not a task here.',
    },
    subtype: {
      type: 'STRING',
      enum: SUBTYPES,
      nullable: true,
      description: 'Only when action is receipt: refill, supplies, shipping, or key. Null otherwise.',
    },
    confidence: {
      type: 'STRING',
      enum: ['high', 'medium', 'low'],
      description: 'high: the action is obvious. medium: likely but arguable. low: a guess.',
    },
    clarify: {
      type: 'STRING',
      nullable: true,
      description: 'Only when action is clarify: one short question to disambiguate. Null otherwise.',
    },
  },
  required: ['action', 'confidence'],
  propertyOrdering: ['action', 'subtype', 'confidence', 'clarify'],
};

const SYSTEM_PROMPT = `You route a single staff utterance from an office-services shop's counter tool into one action. Return ONLY the structured object.

Actions:
- receipt: build a customer receipt for something happening now. Set subtype: refill (a toner refill being sold), supplies (buying/selling a product), shipping (courier/parcel drop-off), key (key cutting).
- cartridge_create: log a NEW cartridge order to work on later (a drop-off the customer will pick up). Only when the utterance clearly means logging/creating an order, e.g. "new order", "log an order", "order for pickup".
- cartridge_modify: edit an existing cartridge order.
- cartridge_status: change an existing order's status (e.g. mark ready, picked up, mark ORD-... ready).
- cartridge_list: list/show cartridge orders.
- note: save an internal staff note.
- inventory: add or update an inventory / stock item.
- directory: save a website link / bookmark to the internal directory.
- followup: log a customer follow-up / call-back.
- track: look up a parcel by courier and/or tracking number.
- clarify: the request is a real task but too ambiguous to route; put your one short question in "clarify".
- unknown: not a task this tool handles.

Disambiguation rules:
- "refill for <name>, <model>, <price>" with a price is a receipt (subtype refill), NOT cartridge_create. Choose cartridge_create only when the words say to log/create an order.
- A bare courier name or tracking number is track. But a shipping receipt names a courier too, so "ship this / parcel drop-off / shipping for <name>" is a receipt (subtype shipping).
- Use the active tab, if given, only as a tiebreaker when the words are ambiguous; the words always win.

Examples (utterance -> action[/subtype]):
- "refill for Sarah, HP 65, $34" -> receipt/refill
- "new cartridge order for John, Canon 240" -> cartridge_create
- "mark ORD-AB12CD ready" -> cartridge_status
- "sold a ream of paper $12" -> receipt/supplies
- "cut 2 keys $8" -> receipt/key
- "ship to Vancouver, UPS, $22" -> receipt/shipping
- "track UPS 1Z999AA10123456784" -> track
- "note: front printer jams on cardstock" -> note
- "add staples.ca to the directory" -> directory
- "call back Dave about his order" -> followup

confidence is high, medium, or low. Do not extract field values, names, prices, or numbers; only choose the action, the subtype when action is receipt, and confidence.`;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || '';
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = origin && origin === allowed ? origin : allowed;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, corsOrigin);
    }
    // Reject cross-origin callers that are not the configured staging site.
    if (allowed && origin && origin !== allowed) {
      return json({ error: 'forbidden_origin' }, 403, corsOrigin);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'not_configured' }, 500, corsOrigin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400, corsOrigin);
    }
    const utterance = typeof payload?.utterance === 'string' ? payload.utterance.slice(0, 2000) : '';
    if (!utterance.trim()) {
      return json({ error: 'empty_utterance' }, 400, corsOrigin);
    }
    const repair = payload?.repair === true;
    const activeTab = typeof payload?.activeTab === 'string' ? payload.activeTab : null;

    const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const userText =
      (activeTab ? `Active tab: ${activeTab}\n` : '') +
      (repair ? 'Your previous answer did not match the required schema. Return only the valid object.\n' : '') +
      `Utterance: ${utterance}`;

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        candidateCount: 1,
        // The payload is tiny (action + subtype + bucket + short clarify); a tight
        // cap bounds worst-case latency on Flash-Lite.
        maxOutputTokens: 120,
      },
    };

    let geminiRes;
    try {
      geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      });
    } catch {
      return json({ error: 'upstream_unreachable' }, 502, corsOrigin);
    }
    if (!geminiRes.ok) {
      return json({ error: 'upstream_error', status: geminiRes.status }, 502, corsOrigin);
    }

    let data;
    try {
      data = await geminiRes.json();
    } catch {
      return json({ error: 'upstream_bad_json' }, 502, corsOrigin);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json({ error: 'upstream_empty' }, 502, corsOrigin);
    }

    // The model returns JSON text (responseMimeType). Parse and pass it straight
    // through; the client validates it against routingSchema.
    let routing;
    try {
      routing = JSON.parse(text);
    } catch {
      return json({ error: 'routing_parse_failed' }, 502, corsOrigin);
    }
    return json(routing, 200, corsOrigin);
  },
};
