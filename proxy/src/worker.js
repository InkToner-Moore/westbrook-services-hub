import { handleManager } from './manager.js';

// AI Mode routing proxy (Cloudflare Worker).
//
// Holds the Gemini key server-side and does one job: take a staff utterance and
// return a routing decision (action + optional receipt subtype + confidence +
// optional clarify) plus OPTIONAL field candidates. The candidates are suggestions
// only. The SPA's deterministic engine still runs first and owns every value it can
// extract; the client fills a candidate in only where deterministic extraction left
// a field empty, marks it "guessed", and shows it for human confirmation. So this
// proxy never sets a value the counter must accept, and business logic (IDs, tax,
// Firestore writes) stays in the SPA. If Gemini fails, the client falls back to the
// deterministic engine.
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
  'inventory_lookup',
  'directory',
  'purchase',
  'timesheet',
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
    clarifyOptions: {
      type: 'ARRAY',
      nullable: true,
      description:
        'Only when action is clarify: the 2 or 3 routes you are choosing between, so the counter can pick with one tap. Each is an action (and subtype for receipts). Null otherwise.',
      items: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ACTIONS },
          subtype: { type: 'STRING', enum: SUBTYPES, nullable: true },
        },
        propertyOrdering: ['action', 'subtype'],
      },
    },
    // Optional field CANDIDATES. Suggestions only: the client fills one in only
    // where its own extraction found nothing, marks it "guessed", and asks a human
    // to confirm. Copy values verbatim from the utterance; never invent one.
    fields: {
      type: 'OBJECT',
      nullable: true,
      description:
        'Field values stated in the utterance, to help fill the form. Copy exactly from the words; set a field to null if it is not stated. NEVER guess a phone number, a price, or a name that is not in the text.',
      properties: {
        customerName: { type: 'STRING', nullable: true, description: "The customer's name, if stated. Null otherwise." },
        customerPhone: { type: 'STRING', nullable: true, description: 'A phone number, copied digit for digit. Null if none.' },
        brand: { type: 'STRING', nullable: true, description: 'Cartridge/product brand, e.g. HP, Canon, Brother. Null if none.' },
        model: { type: 'STRING', nullable: true, description: 'Model or SKU, e.g. 65XL, TN660. Null if none.' },
        type: { type: 'STRING', nullable: true, description: 'Cartridge type/colour, e.g. black, tri-color, toner. Null if none.' },
        quantity: { type: 'NUMBER', nullable: true, description: 'A stated count/quantity. Null if none.' },
        price: { type: 'NUMBER', nullable: true, description: 'A stated price/amount as a number, no currency symbol. Null if none.' },
        supply: { type: 'STRING', nullable: true, description: 'The product bought/sold on a supplies receipt. Null if none.' },
        keyModel: { type: 'STRING', nullable: true, description: 'Key model or description on a key-cutting receipt. Null if none.' },
        item: { type: 'STRING', nullable: true, description: 'A generic item name stated in the utterance. Null if none.' },
        content: { type: 'STRING', nullable: true, description: 'The body text of a note. Null if none.' },
      },
      propertyOrdering: ['customerName', 'customerPhone', 'brand', 'model', 'type', 'quantity', 'price', 'supply', 'keyModel', 'item', 'content'],
    },
  },
  required: ['action', 'confidence'],
  propertyOrdering: ['action', 'subtype', 'confidence', 'clarify', 'clarifyOptions', 'fields'],
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
- inventory_lookup: a READ-ONLY question about stock, price, or a key's location, e.g. "is the HP 65 in stock?", "do we have Kwikset KW1?", "what's the price of a Canon 137?", "where is that key?". Choose this over inventory when the words ask a question rather than tell you to add or change stock.
- directory: save a website link / bookmark to the internal directory.
- purchase: send a payment to the card machine and record the transaction. Only when the words are about taking a payment on its own (e.g. "charge $40 to a card"). A priced receipt that also says "charge her card" is still a receipt; the payment rides along as an attachment, not this action.
- timesheet: employee punch-in / punch-out clock, adding an employee, or viewing today's punches or a person's hours, e.g. "clock in Sarah", "clock out Dave", "add employee Priya", "who is on the clock?", "hours for Sarah".
- track: look up a parcel by courier and/or tracking number.
- clarify: the request is a real task but too ambiguous to route; put your one short question in "clarify" AND list the 2 or 3 routes you are torn between in "clarifyOptions".
- unknown: not a task this tool handles.

Disambiguation rules:
- "refill for <name>, <model>, <price>" with a price is a receipt (subtype refill), NOT cartridge_create. Choose cartridge_create only when the words say to log/create an order.
- A bare courier name or tracking number is track. But if there is ALSO a price, it is a shipping SALE being rung up: receipt (subtype shipping), not track. A named courier plus a customer and a dollar amount is a shipping receipt.
- A lone SKU or key code with no verb (e.g. "KW1", "KW1?", "SC4") is a price/stock/location question: inventory_lookup, not inventory. Inventory (the write) always has a verb like add, set, mark, restock, out of stock.
- Whenever you choose clarify, fill clarifyOptions with the exact routes in question (e.g. [{action:"receipt",subtype:"refill"},{action:"cartridge_create"}]).
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
- "is the HP 65 in stock?" -> inventory_lookup
- "what's the price of a Canon 137?" -> inventory_lookup
- "where is that key?" -> inventory_lookup
- "KW1?" -> inventory_lookup
- "SC4" -> inventory_lookup
- "Hannah Lemmington UPS express saver 2818387529719764 ontario 53$ 4167382277" -> receipt/shipping
- "clock in Sarah" -> timesheet
- "clock out Dave" -> timesheet
- "add employee Priya" -> timesheet
- "who is on the clock?" -> timesheet

confidence is high, medium, or low.

After choosing the action, also fill "fields" with any values the utterance clearly states, to help the counter fill the form faster:
- Copy each value exactly from the words. Do not reformat, expand, or invent.
- Set a field to null when it is not stated. Most fields will be null; that is fine.
- NEVER guess a phone number, a price, or a name. If it is not written, it is null.
- These are only suggestions. A person verifies every one before it is used, and your own extraction is never the final value.
Examples:
- "refill for Sarah, HP 65XL black, $34" -> fields: {customerName:"Sarah", brand:"HP", model:"65XL", type:"black", price:34}
- "sold 2 reams of paper $12" -> fields: {supply:"paper", quantity:2, price:12}
- "new order for Dave 403-555-1212, HP 65" -> fields: {customerName:"Dave", customerPhone:"403-555-1212", brand:"HP", model:"65"}`;

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

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400, corsOrigin);
    }

    // Manager-session endpoints live under /manager/* and are independent of the
    // AI routing path below (they do not need the Gemini key).
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/manager/')) {
      try {
        const { status, body } = await handleManager(pathname, payload, env);
        return json(body, status, corsOrigin);
      } catch {
        return json({ error: 'manager_failed' }, 500, corsOrigin);
      }
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: 'not_configured' }, 500, corsOrigin);
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
        // Routing is tiny, but the optional field candidates add a handful of short
        // strings; keep the cap tight enough to bound Flash-Lite latency.
        maxOutputTokens: 320,
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
