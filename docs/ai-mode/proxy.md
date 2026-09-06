# AI Mode routing proxy

The proxy is a tiny Cloudflare Worker that holds the Gemini API key server-side and
turns a staff utterance into a routing decision: it picks an action (and receipt
subtype). For routing it never extracts names, prices, or any field value, and it
never touches Firestore. (The same Worker also serves manager-session endpoints
under `/manager/*`, a separate concern documented at the end of this file.) Field extraction and all business logic stay in the SPA's
deterministic engine (`src/ai/providers/deterministic.ts`), so the model cannot emit
customer data or run store logic. If the proxy or Gemini fails for any reason, the
client falls back to the deterministic engine and AI Mode keeps working, for free.

Code: `proxy/` (`src/worker.js`, `wrangler.toml`).
Client: `src/ai/providers/llm.ts`, selected in `src/ai/providers/index.ts` when
`VITE_AI_PROXY_URL` is set.

## What runs where

```
Staff browser ── POST {utterance} ──▶ Cloudflare Worker ── generateContent ──▶ Gemini Flash-Lite
   (staging SPA)                        (holds GEMINI_API_KEY)                  (routing JSON)
        ▲                                       │
        └──────────── routing JSON ◀────────────┘
        │
   deterministic engine fills fields + provenance, runs the action
```

## Cost (why this is effectively free)

- **Cloudflare Workers free tier:** 100,000 requests/day. One staff query = one
  request. No card required.
- **Gemini Flash-Lite:** cheapest Gemini model, chosen deliberately. The free API
  tier has per-minute and per-day rate limits rather than a dollar cap; at counter
  volume you stay inside it. If you ever exceed the free limits you can enable
  billing (Flash-Lite is a fraction of a cent per call). If the model is rate-limited
  or down, the client falls back to the deterministic engine, so nothing breaks.

Check current free-tier limits at https://ai.google.dev/gemini-api/docs/rate-limits
before assuming headroom; Google adjusts them.

## One-time setup (what you do)

You need a free Cloudflare account and a Google AI Studio (Gemini) API key.

1. **Get a Gemini key.** Go to https://aistudio.google.com/apikey, create an API
   key, copy it. Do not paste it into any file in this repo.

2. **Install wrangler and log in** (from the repo root):
   ```sh
   cd proxy
   npm install
   npx wrangler login      # opens a browser to authorize Cloudflare
   ```

3. **Set the allowed origin.** Edit `proxy/wrangler.toml` and set `ALLOWED_ORIGIN`
   to your exact staging origin (e.g. `https://inktonermoore-staging.pages.dev`).
   This is the only site allowed to call the proxy. You will know this value after
   the first Pages deploy (see `deploy-staging.md`); you can deploy the Worker now
   with a placeholder and update it after.

4. **Store the Gemini key as a secret** (never in a file):
   ```sh
   npx wrangler secret put GEMINI_API_KEY
   # paste the key when prompted
   ```

5. **Deploy the Worker:**
   ```sh
   npx wrangler deploy
   ```
   Wrangler prints the Worker URL, e.g. `https://inktonermoore-ai-proxy.<you>.workers.dev`.
   That URL is what the SPA's `VITE_AI_PROXY_URL` must point at.

6. **Point the SPA at it.** Set `VITE_AI_PROXY_URL` to the Worker URL in the staging
   build environment (see `deploy-staging.md`). Locally, add it to `.env`.

## Local development

```sh
cd proxy
cp .dev.vars.example .dev.vars     # then put your Gemini key in .dev.vars (gitignored)
npx wrangler dev                   # serves the Worker on http://localhost:8787
```

Then run the SPA with `VITE_AI_PROXY_URL=http://localhost:8787` so the browser calls
your local Worker. For local dev, set `ALLOWED_ORIGIN` in `.dev.vars` to your dev
origin (e.g. `http://localhost:8080`) or leave it empty to allow any origin locally.

## Updating the routing behavior

The system prompt, the model, and the response schema live in `proxy/src/worker.js`.
Change them there and `npx wrangler deploy` again. No SPA redeploy is needed, since
the client only sends the utterance and validates whatever routing comes back against
`src/ai/providers/routingSchema.ts`. Keep that schema and the Worker's
`RESPONSE_SCHEMA` in sync.

## Security notes

- The Gemini key exists only as a Worker secret. It is never in the repo, never in
  the client bundle, never logged.
- The Worker only accepts POSTs from `ALLOWED_ORIGIN`. This is a light guard, not a
  hard security boundary; the free tier and the deterministic fallback mean abuse
  has little upside.
- The proxy sees only the raw utterance a staff member typed. It returns only a
  routing label. No customer records pass through it.

## Manager sessions (added later)

The same Worker also serves manager-session endpoints under `/manager/*`
(`proxy/src/manager.js`), separate from and independent of the routing path above.
Manager-only actions (editing the schedule, app settings) cannot be enforced by a
client PIN, so the Worker turns a correct PIN into a real, server-enforced manager
session: it verifies the PIN, then mints a Firebase custom token carrying a
`manager: true` claim for the caller's uid. The client signs in with it, and
Firestore rules that require `request.auth.token.manager == true` then allow the
write. See `src/lib/managerAuth.ts` and `src/contexts/ManagerModeContext.tsx`.

Endpoints (all POST, JSON, same CORS as routing):
`/manager/status` -> `{pinSet}`; `/manager/set-pin {newPin, currentPin?}` (change
needs the current PIN); `/manager/unlock {pin, uid}` -> `{token}`;
`/manager/lock {uid}` -> a claimless `{token}`.

PIN hashes live in the Firestore `accessPins` collection (locked to admin-only in
the rules; clients never read them), hashed with a server pepper. Each record has a
`role`, leaving room for per-employee PINs later.

Two extra Worker secrets are required for these endpoints (routing works without
them):
```sh
# the Firebase Admin service account JSON for the project, as one line
node -e "process.stdout.write(JSON.stringify(require('./sa.json')))" | npx wrangler secret put FIREBASE_SA
# a random, stable pepper mixed into every PIN hash
npx wrangler secret put PIN_PEPPER
```
Rules are managed in the Firebase console (not in this repo); mirror the manager
rules to each environment. There is no rate limiting on `/manager/unlock` yet: use
a longer PIN and add throttling before this carries real weight.
