# AI Mode - Handoff (living state)

Update this at the end of every phase and before any context handoff. To resume,
read `00-research.md`, `01-design.md`, `02-implementation-plan.md`, then this file.

## Where we are
- **Phase:** 0, 1, 2 DONE. Phase 4 receipts (refill/supplies/key) DONE and
  browser-verified (real PDF + Artifact preview + chat download/print). Phase 3
  (quick-action pills) and shipping-receipt build are next.
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

## Next
- Shipping receipt: multi-item block (courier/tracking/city/province/country/cost/
  tax per item) in ConfirmationCheck + `executeReceipt` shipping branch + the
  final-sale footnote (already supported via `SimpleReceiptOptions.footnote`).
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
