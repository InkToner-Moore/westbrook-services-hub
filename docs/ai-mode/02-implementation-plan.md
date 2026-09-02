# AI Mode - Implementation Plan

Built on `00-research.md` + `01-design.md`. Phased so each phase is shippable,
non-breaking, and independently reviewable. Sonnet subagents implement; the
orchestrator reviews. Handoff state lives in `HANDOFF.md` (update it every phase).

## Guardrails (apply to every phase)
- Do not edit production deploy: leave `.github/workflows/deploy.yml`, `public/CNAME`
  untouched. Staging deploy is a separate target (Phase 8).
- New code lives under `src/ai/` (engine, providers, intents), `src/components/ai/`
  (overlay, chat, artifact, pills, confirmation), and small additive edits to
  `App.tsx` (mount the dock) and `simpleReceipt.ts` (extend, do not rewrite).
- Never modify existing page components' behavior. The dock/overlay is additive.
- After each phase: `yarn lint` + `yarn build` clean; commit; update `HANDOFF.md`.
- No em dashes. Theme via `themeClasses`. Reuse existing helpers.

## Phase 0 - Foundation (orchestrator does this first)
- Session branch, `docs/ai-mode/` committed, `HANDOFF.md` seeded.
- `src/ai/types.ts`: `Intent`, `FieldValue<T>` ({value, source}), `AiProvider`,
  action/subtype enums, `ChatTurn`, `Artifact` types.
- `src/ai/context.tsx`: `AiModeProvider` React context holding chat turns, current
  artifact, open/closed state, receipt-cart (multi-mode), customer memory. Mounted
  high (in `App.tsx`) so the dock and overlay share state.

## Phase 1 - Shell: tab dock + AI overlay scaffold
- `src/components/ai/TabDock.tsx`: fixed dock, visible only on `/staff/*`, routes to
  mini-apps + opens AI overlay. Themed, calm, keyboard-accessible.
- `src/components/ai/AiOverlay.tsx`: full-height overlay with chat column + artifact
  slot (empty for now). Open/close, Clear, scroll.
- `src/components/ai/Composer.tsx`: text input + chip state (add/remove colored
  chips), send. Quick-action pills stubbed (Phase 3 wires behavior).
- Mount both once in `App.tsx` inside `BrowserRouter`, outside `Routes`.
- Deliverable: you can open AI Mode over any staff page, type, see turns echoed by a
  stub provider; every classic page still works untouched.

## Phase 2 - Engine: deterministic provider + confirmation UI
- `src/ai/providers/deterministic.ts`: intent router (keyword/regex) + field
  extractors (phone, email, money, date, courier+tracking, brand/model, qty,
  city/province/country) with provenance marking + guessed defaults.
- `src/ai/providers/index.ts`: provider selection (deterministic default; LLM if
  configured) with fallback.
- `src/components/ai/ConfirmationCheck.tsx`: renders fields with `?`/`i` markers,
  Always-shown vs No-show-if-blank rules, guessed (amber/dashed) vs explicit, inline
  Edit, Confirm gated on required fields.
- Deliverable: a vague prompt routes to a feature and shows a correct confirmation.

## Phase 3 - Quick-action pills
- `src/components/ai/QuickActions.tsx`: tracking group (FedEx/Purolator/UPS,
  hover-to-type tracking# + Enter) and action group (Receipt/Refill/Purchase/Note/
  Inventory) as chips. Wire into Composer.

## Phase 4 - Receipts (all four types) via chat
- Extend `src/lib/simpleReceipt.ts`: add `generateShippingReceiptPdf` and
  `generateKeyReceiptPdf` (4x6 + letter), including the multi-item shipping model and
  the final-sale **footnote** (write it well, no em dashes). Refactor
  `StaffReceipts.tsx`'s inline shipping/key PDF logic to call these (behavior parity
  kept) so both the classic page and chat share one generator.
- `src/ai/actions/receipt.ts`: intent -> `SimpleReceiptOptions`, tax by province,
  GST setting. Artifact = preview; chat confirmation carries 4x6/full-page/print.
- Wire Refill, Supplies, Shipping, Key end to end with their exact field markers.

## Phase 5 - Packing tab + multi-mode receipt cart
- New Packing tab: move Shipping add-ons here (from `StaffReceipts.tsx` presets).
- Receipt-cart in `AiModeProvider`: accumulate items across tabs into one open
  receipt; dashboard toggle to enable multi-mode; chat surfaces "N items on receipt".

## Phase 6 - Cartridge manager + customer memory
- `src/ai/actions/cartridge.ts`: create / modify / list / change-status via chat
  (no delete), multi-cartridge, reuse `cartridges.ts` + `syncOrderStatus`. Artifact =
  order receipt.
- `src/ai/customerMemory.ts`: local grouped {name, phone, email} store; similar-name
  autofill offer. Never public-readable.

## Phase 7 - Notes / Inventory / Directory / Follow-Ups + Tracking
- `src/ai/actions/*.ts` for each: chat CRUD via existing collections/helpers.
  Rename Customer Requests -> Customer Follow-Ups in copy (collection unchanged).
- `src/ai/tracking.ts`: courier detection (research regex) + deep-link builder.
  `src/components/ai/TrackingArtifact.tsx`: detected-courier card + "Open on carrier"
  (new tab). WhereParcel adapter interface stubbed for later.

## Phase 8 - LLM provider + proxy + staging deploy
- `src/ai/providers/llm.ts`: Gemini Flash-Lite via proxy, strict `responseSchema` ->
  `Intent`, Zod validate + one repair retry, fallback to deterministic. Env-gated.
- Minimal proxy (Cloudflare Worker or Firebase Function), deployed separately, key
  server-side. Documented in `docs/ai-mode/proxy.md`.
- Staging deploy target (separate from prod): a `staging` build/deploy that does not
  touch `main`/CNAME. Documented in `docs/ai-mode/deploy-staging.md`.

## Phase 9 - Review + polish
- Orchestrator self-review: backward-compat sweep (every classic route/page still
  works), data-boundary check (`orderStatus` intact, no public leakage), UX pass
  (uncluttered, guessed-field marking correct), code quality, `yarn lint`+`build`.

## Handoff mechanism (baked in per brief)
- `HANDOFF.md` in this folder is the living state: current phase, what is done, what
  is next, open questions, how to resume. Update it at the end of every phase and
  before any context handoff.
- Resuming = read `00-research.md`, `01-design.md`, this plan, then `HANDOFF.md`.
- `/proj-handoff` writes the handoff on exit; `/proj-continue` restores it. For now
  the human-readable `HANDOFF.md` is the source of truth so the flow works even
  without those skills wired to this repo.
