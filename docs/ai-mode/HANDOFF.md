# AI Mode - Handoff (living state)

Update this at the end of every phase and before any context handoff. To resume,
read `00-research.md`, `01-design.md`, `02-implementation-plan.md`, then this file.

## Exit state (2026-09-03)
- **Next session is for:** phase 8 (LLM provider + proxy + staging deploy) and
  phase 9 (final review). Phase 5 is done. See the "Phase 5 decision to flag"
  note below before phase 8: the classic StaffReceipts shipping form still has no
  "add to receipt" button, so a shipment started on the classic Receipts page
  cannot join the cart (chat + Packing page can). User asked for this; decide
  whether to add it (additive, gated behind multi-mode) as a phase 5 follow-up.
- **Just landed (browser-verified):** phase 5, packing tab + multi-item receipt
  cart. Commit `zyy` on `ai-mode-overhaul`. Verified end to end in the browser
  (dev server, auth bypass):
  - Classic Packing page: presets add rows, qty +/- and tax toggle recompute
    (Medium Box x2 + Envelope = $15.00 + $0.75 GST = $15.75), Add to receipt /
    Download / Print all work.
  - Cross-tab cart: items added on the Packing page appear in the chat cart bar
    ("N items on receipt $X.XX"), and PACK chips in the chat add supplies too
    (running total correct through 3 items = $26.25, then a fresh 2 items =
    $12.60).
  - Finish receipt builds one combined PDF: chat message + 4x6/full-page/print
    controls + Artifact panel. (Artifact iframe renders blank under headless
    Playwright, a PDF-plugin limitation; same code path as the verified shipping
    receipt. Re-check the preview in a real browser if in doubt.)
  - Multi-mode toggle persists (localStorage `ai-multi-mode`), reachable from both
    the dashboard header and the AI overlay header. When OFF, nothing changes:
    confirmed receipts finalize immediately as before.
- **Bug fixed during verification:** `finalizeCart` first read its result from
  inside a `setCart` updater (which React does not run synchronously), so the
  combined receipt never rendered. Now computes from `cart` directly. If you
  touch it, keep the deps on `cart`.
- **Phase 5 decision to flag (user asked, not built):** the classic StaffReceipts
  page was left untouched (invariant), so its shipping form has no cart hook. The
  user's note: "if someone wants to add it to a shipment using classic view they
  can just make the receipt multi, and add the packaging stuff." The cross-tab
  cart covers this via chat + Packing page, but a classic-Receipts "Add to
  receipt" button (gated behind multi-mode) would honor it literally. Additive,
  keeps the off-state identical. Confirm scope with the user before building.

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
  Possible phase 5 follow-up: classic StaffReceipts "add to receipt" button
  (see the exit-state note).
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
- Nothing existing breaks; classic pages stay reachable and identical.
- `orderStatus` never widened; cartridge 3-status enum intact.
- Model never runs business logic; it only emits typed intent + provenance.
- No em dashes. Theme via `themeClasses`. Reuse existing lib helpers.
