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
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    action: { type: 'STRING', enum: ACTIONS },
    subtype: { type: 'STRING', enum: SUBTYPES, nullable: true },
    confidence: { type: 'NUMBER' },
    clarify: { type: 'STRING', nullable: true },
  },
  required: ['action', 'confidence'],
};

const SYSTEM_PROMPT = `You route a single staff utterance from an office-services shop's counter tool into one action. Return ONLY the structured object.

Actions:
- receipt: build a customer receipt. Set subtype: refill (toner refill), supplies (buying/selling a product), shipping (courier/parcel drop-off), key (key cutting).
- cartridge_create: log a new toner/cartridge refill order.
- cartridge_modify: edit an existing cartridge order.
- cartridge_status: change an order's status (e.g. mark ready, picked up).
- cartridge_list: list/show cartridge orders.
- note: save an internal staff note.
- inventory: add or update an inventory / stock item.
- directory: save a website link / bookmark to the internal directory.
- followup: log a customer follow-up / call-back.
- track: look up a parcel by courier and/or tracking number.
- clarify: the request is a real task but too ambiguous to route; put your one short question in "clarify".
- unknown: not a task this tool handles.

confidence is 0..1. Do not extract field values, names, prices, or numbers; only choose the action, the subtype when action is receipt, and confidence.`;

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
