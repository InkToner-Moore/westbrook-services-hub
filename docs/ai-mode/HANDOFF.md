# AI Mode - Handoff (living state)

Update this at the end of every phase and before any context handoff. To resume,
read `00-research.md`, `01-design.md`, `02-implementation-plan.md`, then this file.

## Exit state (2026-09-05, phase 8 deploy + dev environment session)
- **Next session is for:** finishing the staging smoke-test on the dev DB (in
  progress when this session ended), then phase 9 (final review). Phase 8 code AND
  infra are done and live. No phase-8 code left to write.
- **Where things stand:** branch `ai-mode-overhaul`, tree CLEAN, local == origin at
  `331f6e9`. `corepack yarn build` GREEN; `corepack yarn eslint` on the provider
  files = 0 errors, 0 warnings. A long-lived `dev` branch exists on origin
  (`01ba552`, = ai-mode-overhaul tip + one empty commit that triggers Cloudflare
  builds). This session's commits on ai-mode-overhaul: `pto ttk pmp psx wnq lty mxs`,
  all pushed.
- **LIVE INFRA now stood up (do NOT rebuild or re-provision):**
  - **Proxy Worker:** deployed at `https://inktonermoore-ai-proxy.inktonermoore.workers.dev`.
    Holds `GEMINI_API_KEY` as a Worker secret. `ALLOWED_ORIGIN` in `proxy/wrangler.toml`
    is `https://ink-toner-moore.pages.dev`. Verified end to end with curl: routing JSON
    comes back from Gemini. Cloudflare account: `parsa-cloudflare-acc@laketrouthq.com`,
    account id `73a4f935ed801ea9299664d719bb9180`, workers.dev subdomain `inktonermoore`.
  - **Staging site:** Cloudflare Pages project `ink-toner-moore`, production branch set
    to `dev`, stable URL `https://ink-toner-moore.pages.dev` (per-deploy URLs look like
    `<hash>.ink-toner-moore.pages.dev` and will NOT pass the proxy CORS check - always
    test on the stable URL).
  - **Dev Firebase project:** a SEPARATE Firebase project (isolated from prod) with
    Email/Password auth, a test staff user, Firestore (Standard edition, production
    rules copied from prod), and `ink-toner-moore.pages.dev` added to authorized
    domains. Its `VITE_FIREBASE_*` values are set as Cloudflare Pages env vars
    (production/`dev`). Prod Firebase is untouched.
- **NEW two-environment model (documented in `docs/ENVIRONMENTS.md` - read it):**
  `main -> GitHub Pages -> PROD Firebase -> inktonermoore.ca` and
  `dev -> Cloudflare Pages -> DEV Firebase -> ink-toner-moore.pages.dev`. Feature work
  merges into `dev` to test on staging, then into `main` to ship. `deploy-staging.md`
  updated to deploy from `dev`. NEVER point Pages at `main`; NEVER put prod Firebase
  values in Cloudflare.
- **Build trap fixed this session:** Cloudflare auto-detected `bun.lockb` and ran a
  frozen bun install that failed. Removed `bun.lockb` + `package-lock.json` (vestigial;
  CLAUDE.md says yarn is authoritative) and pinned `"packageManager": "yarn@1.22.22"`
  in package.json. Do NOT re-add those lockfiles. `proxy/` has its own npm lockfile,
  which is correct (the Worker uses npm/wrangler).
- **KNOWN ROUTING QUIRK to tune in phase 9 (not a bug):** the LLM routes "refill for
  Sarah, HP 65, $34" to `cartridge_create` (conf 1), while the deterministic engine
  routes "refill" to `receipt:refill`. "Refill" is genuinely ambiguous (refill receipt
  vs logging a refill order). Fix is a one-line-ish edit to `SYSTEM_PROMPT` in
  `proxy/src/worker.js` + `npx wrangler deploy` (no SPA change). Watch for other odd
  routings while testing and tune them in one pass.
- **IN PROGRESS when session ended:** user was about to (1) confirm the new `dev` Pages
  build went green, (2) log in on staging with the dev test account, (3) create a
  throwaway note and confirm it lands in DEV Firestore (not prod). Pick up here.
- **UNVERIFIED / watch-outs for next session:**
  - Confirm the proxy CORS redeploy (`cd proxy && npx wrangler deploy` after the
    `ALLOWED_ORIGIN` change) actually completed. If the AI router 403s on staging,
    that redeploy is the likely cause; also re-check the stable Pages domain really is
    `ink-toner-moore.pages.dev` and matches `ALLOWED_ORIGIN`.
  - The LLM path and all Firestore-writing actions have NOT been exercised against real
    config yet (couldn't be, locally). That is exactly what the staging smoke-test is
    for. Deterministic routing WAS re-verified in the browser after the refactor.
- **How to trigger a staging build:** push to `dev`. This session used a gh-API empty
  commit to fire the webhook because GitButler pushes to `origin/ai-mode-overhaul`, not
  `origin/dev`. To promote new work: fast-forward/merge `ai-mode-overhaul` into `dev`
  (e.g. `gh api -X PATCH .../git/refs/heads/dev -f sha=<new tip>` when it's a
  fast-forward, or a PR into `dev`).

## Exit state (2026-09-04, phase 8 build session)
- **Next session is for:** finishing the phase 8 deploy STEPS (user-run: Cloudflare
  account, Gemini key, Worker deploy, Pages project), then phase 9 (final review).
  All phase 8 CODE is written, built, and pushed. Nothing left to build for 8.
- **Where things stand:** branch `ai-mode-overhaul`, tree CLEAN after commits `pto`
  and `ttk` (pushed). `corepack yarn build` GREEN; `corepack yarn eslint` on the new
  provider files = 0 errors, 0 warnings. Deterministic routing re-verified in the
  browser after the refactor (refill utterance -> correct fields + guessed markers).
- **Host decision (user, 2026-09-04):** Cloudflare Worker for the proxy + Cloudflare
  Pages for staging. Both free tier, no card. See proxy.md / deploy-staging.md.
- **What landed this session (phase 8):**
  - `src/ai/providers/llm.ts` `LlmProvider`: POSTs the utterance to the proxy, gets a
    routing decision, then reuses the deterministic field-filler. 6s timeout, one
    repair retry, falls back to deterministic on ANY failure. Gated on
    `VITE_AI_PROXY_URL` (unset = deterministic only, unchanged behavior).
  - `src/ai/providers/routingSchema.ts`: Zod schema the client validates against;
    mirrors the Worker's `RESPONSE_SCHEMA`. Keep them in sync.
  - `src/ai/providers/deterministic.ts`: extracted `populateIntentFields(intent,text)`
    (was inline in `parse`); both providers share it. Pure refactor, behavior same.
  - `src/ai/providers/index.ts`: selects LlmProvider when `VITE_AI_PROXY_URL` is set.
  - `proxy/` Cloudflare Worker (`src/worker.js`, `wrangler.toml`, `package.json`,
    `.dev.vars.example`, `.gitignore`). Holds `GEMINI_API_KEY` secret; CORS locked to
    `ALLOWED_ORIGIN`; model `gemini-flash-lite-latest` (configurable). Routing only,
    never field values, never Firestore.
  - `public/_redirects`: SPA fallback for Cloudflare Pages. INERT on GitHub Pages, so
    prod is unchanged (verify this stays true if you touch it).
  - `.env.example`: added `VITE_AI_PROXY_URL`.
  - Docs: `docs/ai-mode/proxy.md`, `docs/ai-mode/deploy-staging.md` (full step-by-step).
- **DESIGN NOTE (important):** the LLM only decides ROUTING. Extraction + provenance
  stay in the deterministic engine. This keeps the "model never runs business logic"
  invariant and means a bad LLM response == the deterministic result. Do not move
  field extraction into the model or the proxy.
- **CANNOT be verified locally:** the actual LLM path needs the deployed Worker + a
  real Gemini key (user's steps in proxy.md). Locally, no proxy URL is set, so the
  deterministic engine runs (verified). The fallback logic (fetch fail -> null ->
  deterministic) is by construction; confirm end to end once the Worker is up.

## Exit state (2026-09-03, evening session)
- **Next session is for:** phase 8 (LLM provider + proxy + staging deploy) and
  phase 9 (final review). All building phases (0-7) are done; phase 5 was
  reworked this session into the "open receipt" model below.
- **Where things stand:** branch `ai-mode-overhaul`, tree CLEAN, in sync with
  origin (`ed3d2ea`). `corepack yarn build` GREEN; `corepack yarn eslint` on this
  session's files = 0 errors, 1 benign react-refresh warning (context.tsx, same
  pattern as ThemeContext). Full-repo `yarn lint` still fails only on pre-existing
  baseline files (dataExport.ts, validation.ts, tailwind.config.ts) - not ours.
  This session's commits: `twu`, `ytx`, `ymq` (plus `zyy`/`som` earlier same day),
  all pushed.
- **BIG DESIGN CHANGE - the "open receipt" model (replaces phase-5 multi-mode).**
  Multi-mode and its toggle are GONE. There is always exactly one open receipt;
  a single item is just a one-item receipt. Do NOT reintroduce a mode/toggle.
  - The open receipt is the cart in `src/ai/context.tsx` (state `cart`,
    `addCartLines`/`removeCartLine`/`clearCart`/`finalizeCart`), persisted to
    `sessionStorage` under key `ai-open-receipt` so a refresh does not lose it.
  - `src/components/ai/CartPanel.tsx`: global side panel, shows on any staff page
    whenever the open receipt has items, hidden while the Artifact is open.
    Finish -> builds one combined PDF (title "Sales Receipt") via
    `buildCartReceiptOpts` and opens it in AI Mode. Replaced the old in-overlay
    CartBar (deleted).
  - `src/ai/actions/cartLines.ts`: `receiptIntentToCartLines` (chat confirm ->
    cart) and `packingToCartLine`. AI confirm always routes receipt intents into
    the open receipt now (no mode check).
- **Receipt Generator is now the one place to build receipts.** `StaffReceipts.tsx`
  has FIVE tabs: Shipping, Key Cutting, Cartridge Refill, Toner Sale, Packing.
  Every tab has a single "Add to receipt" button. All Download / Generate-PDF
  buttons were removed and the dead PDF builders (`generateShippingPDF`,
  `generateKeyPDF`, the `onSubmit*` download handlers) deleted. The standalone
  Packing page, its `/staff/packing` route, the dock Packing tab, the dashboard
  Packing card, and `buildPackingReceiptOpts` were all removed - Packing lives in
  the tab now.
- **Receipt titles generalized:** all sales receipts read "Sales Receipt"; the
  cartridge order intake reads "Order Receipt" (`StaffCartridges.tsx` +
  `actions/cartridge.ts`). Specifics live in the line items, like a real receipt.
- **AI Mode readability pass:** larger text/spacing across AiOverlay, Composer,
  QuickActions, ConfirmationCheck.
- **Do NOT rebuild (built + browser-verified this session):** the open-receipt
  layer (context cart + `finalizeCart` + sessionStorage; `src/ai/cart.ts`;
  `actions/cartLines.ts`; `CartPanel.tsx`) and the Receipt Generator tab
  integration (all five tabs feed the cart). See "Constraints" for what changed.
- **Bug fixed earlier this day:** `finalizeCart` first read its result from inside
  a `setCart` updater (React does not run that synchronously) so the combined
  receipt never rendered. Now computes from `cart` directly; keep its deps on
  `cart` if you touch it.
- **Browser-verified (dev server + auth bypass):** Packing tab (Medium Box $7 +
  $0.35 GST = $7.35); classic Shipping "Add to receipt" (UPS Ground $15 -> $15.75);
  cross-tab accumulation via in-app SPA nav (FedEx $30 from the Shipping tab +
  Large Box $10 from the Packing tab = $42); Finish -> one "Sales Receipt". The
  Artifact PDF iframe renders BLANK under headless Playwright (PDF-plugin
  limitation, not a bug) - re-check the preview in a real browser.

## Prior exit state (2026-09-03, earlier - superseded by the open-receipt model)
- Phase 5 first landed as a multi-mode toggle + packing tab + cart (commit `zyy`).
  The evening session above removed the toggle entirely. Ignore any "multi-mode"
  or `ai-multi-mode` localStorage references; that key and concept no longer exist.

## Prior exit state (2026-09-02, later session)
- **Just landed (browser-verified):** the shipping multi-item receipt. Commit
  `vyv` on `ai-mode-overhaul`. Verified end to end in the browser: single item
  (Purolator to BC, GST+PST), and two items across provinces (ON HST + BC GST/PST)
  aggregating to the right total, correct footnote, PDF preview + download/print.
- **Branch:** `ai-mode-overhaul`, 11 commits. The shipping commit `vyv` is NOT yet
  pushed as of writing (push it); everything before it is on origin.
  Working tree CLEAN after the commit.
- **Shipping design notes (read before touching it):**
  - Per-item tax comes from `src/lib/canadaTax.ts` (province -> GST/PST/HST),
    a new module deliberately separate from StaffReceipts.tsx so the classic page
    is untouched. The item's tax is editable (manual override) in the editor.
  - The receipt's tax breakdown aggregates per-item tax lines by label, so a
    two-item Alberta shipment shows one "GST (5%)" line.
  - `SimpleReceiptOptions.taxLines` (new, optional) drives the multi-line tax
    block; flat receipts still use the single `gst` line, unchanged.
  - The `gst` field on the shipping spec is relabeled "Charge Tax" and acts as the
    master on/off for all per-item tax.
  - ROUTING FIX: bare courier names no longer route to `track`. Only the verbs
    track/where is/trace route there up front; a bare courier or lone tracking
    number falls back to track after the receipt routes. This is what the Track
    pills (which prepend just the courier name) rely on, and it stops a shipping
    receipt that names a courier from being read as a lookup. Re-verify tracking
    pills still work if you touch the router.
- **Gate as observed:** `yarn build` GREEN. `yarn eslint src/ai src/components/ai`
  = 0 errors, 1 benign fast-refresh warning (context.tsx, same pattern as
  ThemeContext). Full-repo `yarn lint` FAILS, but only on pre-existing baseline
  files this work never touched (dataExport.ts, validation.ts, tailwind.config.ts) -
  it failed identically before this session. Do not "fix" those as part of this work.
- **Open PR not from this work:** #1 "Align docs with the real Firebase + GitHub
  Pages stack" (branch docs-align-claude-md). Leave it alone.
- **Tooling:** node is not on the sandbox PATH. Use
  `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  then `corepack yarn <cmd>` with `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`. Dev server
  with auth bypass: `VITE_NODE_ENV=development VITE_DEV_BYPASS_AUTH=true corepack yarn dev`.
- **Do NOT rebuild (already built, verified):** the whole AI Mode layer under
  `src/ai/` and `src/components/ai/` plus the `simpleReceipt.ts` builder split. See
  the per-phase notes below before touching any of it.

## Where we are
- **DONE + browser-verified:** phases 0,1,2,3(pills),4(flat + shipping receipts),
  5(packing tab + multi-item receipt cart),6(cartridge),7(tracking +
  notes/inventory/directory/followup). Customer Requests renamed to Customer
  Follow-Ups in the dashboard card + page copy.
- **Remaining:** LLM provider + proxy + staging deploy (8); final review (9).
- **Confirmation gating decoupled:** FieldSpec has `blocking?` separate from the
  `?`/`i` marker, so a field can read as "needed" without forcing the counter to
  have it (e.g. price/phone at intake). Only genuine must-haves block Confirm.
- **Routing:** explicit noun-intents (cartridge/note/inventory/directory/followup)
  are matched before receipt subtypes so a category word like "shipping" in a
  directory command is not mistaken for a shipping receipt. Cartridge status also
  routes by content (order id + status word).
- **Firestore caveat:** create/status executors write to real collections and reuse
  the pages' exact shapes, but cannot be exercised against the demo Firebase project
  (permissions). Verify writes on staging with real config. Confirmation flows for
  all of them are browser-verified.
- **Branch:** ai-mode-overhaul (session branch, off main via GitButler).
- **Prod:** untouched by design. Do not modify `deploy.yml` or `public/CNAME`.
- **Build/lint:** `yarn build` green. New AI files lint-clean (one benign
  react-refresh warning on context.tsx, same pattern as existing ThemeContext).
  NOTE: the repo's baseline `yarn lint` already fails on pre-existing files
  (dataExport.ts, validation.ts, tailwind.config.ts) - not ours, do not "fix"
  as part of this work unless asked.
- **Tooling note:** node is not on PATH in the sandbox. Use
  `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  then `corepack yarn <cmd>` (set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`).

## Done
- Research, design, plan docs (`00`/`01`/`02`).
- User decisions locked: full build now at lowest cost; deterministic core +
  pluggable Gemini Flash-Lite; tracking deep-links now, WhereParcel later; prod
  stays as-is, overhaul deploys to a separate staging target.
- Phase 0: `src/ai/types.ts` (Intent, FieldValue, AiProvider, ChatTurn, Artifact),
  `src/ai/context.tsx` (AiModeProvider + useAiMode: chat turns, artifact, open state).
- Phase 1: `src/components/ai/TabDock.tsx` (fixed dock, staff-only, routes + AI toggle),
  `AiOverlay.tsx` (chat column, echoes routed intent), `Composer.tsx` (input + send).
  `src/ai/providers/deterministic.ts` (keyword router) + `providers/index.ts` (selector).
  Mounted once in `App.tsx` inside BrowserRouter, outside Routes. Non-breaking.

## Phase 2 (done)
- `src/ai/extract.ts`: pure extractors (email, phone, money, quantity, brand, type,
  model, name, tracking+courier, province, todayIso).
- `src/ai/fieldSpecs.ts`: confirmation field specs encoding the brief's tables
  (refill/supplies/key/shipping-toplevel/cartridge_create) with marker + alwaysShown;
  helpers isFieldVisible, missingRequired, specIdFor, getFieldSpecs.
- `src/ai/providers/deterministic.ts`: routes + fills fields with provenance
  (explicit/guessed/not_provided) and guessed defaults (date=today, gst=on, qty=1).
- `src/components/ai/ConfirmationCheck.tsx`: renders visible fields, "?"/"i" markers,
  guessed=amber/dashed + tag, inline Edit, toggle for GST, Confirm gated on
  always-shown required fields. Wired into AiOverlay for pending intents.
- Also fixed overlay/dock z-index: overlay z-[60] (above staff sticky headers at
  z-50), dock z-[70] (above overlay so the AI toggle stays clickable).
- Browser-verified end to end: "refill for Sarah Chen, HP 65XL black, $34,
  403-555-1212" routes to refill, extracts fields, marks date/gst guessed, hides
  blank email/notes, Confirm -> done + read-only. Classic pages render untouched.

## Phase 4 (done, flat receipts)
- `src/lib/simpleReceipt.ts`: refactored into `buildSimpleReceiptPdf` (returns the
  jsPDF doc) + `generateSimpleReceiptPdf` (builds + saves, unchanged behavior) +
  `receiptFileName`; added optional `footnote` for shipping terms. Also removed an
  em dash from the existing footer copy (project rule). StaffReceipts still works.
- Action layer: `src/ai/actions/{types,receipt,index}.ts` (executor registry;
  `executeReceipt` handles refill/supplies/key; shipping returns a placeholder msg).
- `src/ai/receiptOutput.ts`: download/print/previewUri helpers.
- `src/components/ai/ReceiptControls.tsx` (chat: 4x6 / full page / print) and
  `ArtifactPanel.tsx` (right-side sheet previewing the PDF in an iframe).
- Context gained `addResult(result)`; AiOverlay runs the executor on Confirm,
  renders receipt controls, mounts ArtifactPanel, and shifts the chat left when the
  Artifact is open.
- Verified: refill prompt -> confirm -> correct PDF (Subtotal/GST/Total), both-size
  downloads, print, live Artifact preview.

## Phase 3 + tracking (done)
- `src/components/ai/QuickActions.tsx` + `quickActionSpecs.ts`: TRACK group
  (FedEx/Purolator/UPS, hover reveals a tracking-number field, Enter tracks; click
  drops a courier chip) and action chips (Receipt/Refill/Purchase/Note/Inventory).
- `Composer.tsx`: holds chips, prepends their keywords to the prompt on send.
- Tracking module: `src/ai/tracking.ts` (courier deep-links), `actions/track.ts`
  (immediate, no confirmation), `ArtifactPanel` TrackingArtifact card ("Open on
  <carrier>" new tab). `actions/index.ts` gained `isImmediate` (track, cartridge_list
  run without a confirmation step); deterministic provider fills track courier+number.
- Verified: pills add chips; "track UPS 1Z999AA10123456784" -> UPS card + correct
  deep link; chat shifts left when the Artifact opens.

## Next
- Cartridge manager (6): `actions/cartridge.ts` create (has spec already) + modify/
  status/list; reuse `lib/cartridges.ts` + `syncOrderStatus`; Artifact = order
  receipt. Add cartridge specs to fieldSpecs for modify. No delete.
- Notes/Inventory/Directory/Follow-Ups executors (7): chat CRUD via existing
  collections/helpers; rename Customer Requests -> Customer Follow-Ups in copy.
- Shipping receipt: DONE (commit `vyv`). Multi-item block in ConfirmationCheck via
  ShipmentItemsEditor, `executeReceipt` shipping branch, per-province tax, and the
  final-sale footnote. See the shipping design notes in the exit state above.
- Phase 3: `src/components/ai/QuickActions.tsx` (tracking group FedEx/Purolator/UPS
  with hover-to-type tracking#; action chips Receipt/Refill/Purchase/Note/Inventory)
  wired into Composer.
- Phases 5-9 per `02-implementation-plan.md`. Executors for cartridge/note/inventory/
  directory/followup/track follow the `src/ai/actions/` pattern established here.

## Open questions / watch-outs
- Exact staging host (Cloudflare Pages vs Firebase Hosting vs separate gh-pages
  branch) - decide at Phase 8; build stays host-agnostic until then.
- Proxy host for the LLM (Cloudflare Worker vs Firebase Function) - Phase 8.
- Dock placement (bottom rail vs side rail) - decide during Phase 1 build against
  the real theme; keep it calm and uncluttered.

## Invariants (do not violate)
- Nothing existing breaks; classic pages stay reachable. NOTE (changed this
  session, with user approval): the old "classic pages stay identical" invariant
  is relaxed for `StaffReceipts.tsx`. It now feeds the open receipt via "Add to
  receipt" and no longer downloads PDFs directly; that is intentional. Do not
  restore the removed Download/Generate buttons without asking. `StaffCartridges`
  (Order Receipt intake) still prints directly and was left alone.
- `orderStatus` never widened; cartridge 3-status enum intact.
- Model never runs business logic; it only emits typed intent + provenance.
- No em dashes. Theme via `themeClasses`. Reuse existing lib helpers.
- One receipt path only: everything is the open receipt, Finish prints it. Do not
  add a second "download now" path or a multi-mode toggle.
