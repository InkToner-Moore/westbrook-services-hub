# UI Rehaul - Handoff (living state)

Read `DESIGN-SPEC.md` and `PLAN.md` first. This records where the rehaul stands.

## At a glance (2026-09-05)
- **Done and shipped to staging.** Branch `ui-rehaul`, stacked above
  `ai-mode-overhaul`, pushed to `origin/ui-rehaul`. `origin/dev` was
  fast-forwarded to the `ui-rehaul` tip (`f0fd840`), so Cloudflare Pages rebuilds
  `https://ink-toner-moore.pages.dev` with the rehaul. **Prod (`main`) untouched.**
- **Two commits:** `chore(cleanup)` (remove Lovable scaffolding, dead code, unused
  deps) and `feat(ui)` (the whole rehaul).
- **Gate:** `corepack yarn build` GREEN. Lint is the documented baseline only
  (pre-existing `any` in `firestore.ts`/`validation.ts`/`tailwind.config.ts`/some
  `ui/*`, plus benign react-refresh warnings from shared-hook exports). No new
  errors introduced.
- **Browser-verified locally (dev server + auth bypass), light and dark:** the
  3-pane staff shell; the confirmation-in-artifact flow (utterance -> slip on the
  right rail with a pinned Confirm/Not now foot, extraction correct); tools render
  chromeless in the center (Cartridges, Receipts checked); the public site
  restyle; mobile single-column AI-first with the tile drawer.

## What changed
- **AI Mode is the main staff screen, not an overlay.** New shell in
  `src/components/shell/`: `StaffShell` (3-pane frame + responsive: rail drawer +
  artifact sheet on mobile), `TileRail` (AI 1x2 hero + 8 tool tiles that flood
  with a tool colour when active + `UserMenu` with email/logout/settings-stub +
  theme toggle), `ArtifactRail` (header / scroll body / pinned action foot),
  `AiChatPane` (the de-overlayed chat), `tiles.ts`, `ShellContext` (the
  `inShell` chromeless signal).
- **Routing:** `/staff/*` renders inside `StaffShell` via a layout route
  (`App.tsx`); `/staff/dashboard` redirects to `/staff/ai`. `FeatureProtectedRoute`
  (no-op) and the old `StaffDashboard` grid were removed.
- **Confirmation moved into the artifact rail.** The chat posts a short pointer
  line; the slip + its actions live on the right (`ArtifactRail` +
  `ArtifactActions`; `ConfirmationCheck` refactored to a shared `useConfirmationDraft`
  hook). `ArtifactKind` gained `'confirmation'`. The old `AiOverlay`, `TabDock`,
  and `ReceiptControls` are deleted; `CartPanel` is now an open-receipt strip.
- **Design tokens** refreshed in `ThemeContext` (counter/paper palette, IBM Plex
  via `index.html` + `tailwind.config.ts`). Two Lovable tells are neutralised at
  the token so they vanish app-wide: `gradient.title` is now solid,
  `backgroundFloating` is invisible.
- **Tools restyled** into the shell (chromeless via `useShell()`), Lovable tells
  stripped, slip data in `font-mono tabular-nums`. All firestore/logic preserved.
- **Public site** strong restyle, mobile-first, structure kept.

## Watch-outs / follow-ups
- **Not yet browser-verified on real staging** (needs the dev staff login) and the
  Firestore-writing actions still cannot be exercised against the demo config
  locally (expected permission errors in dev). Smoke-test on
  `ink-toner-moore.pages.dev` after the rebuild: log in, run the receipt/cartridge/
  confirmation flows, confirm writes land in DEV Firestore.
- **Deep-linked standalone tool pages** (not in the shell) have a minor cosmetic
  `iconColor` mismatch on `StaffHeader` (tool hue passed as a text colour, not a
  gradient). In-shell (the primary path) is correct. Low priority.
- `src/ai/actions/index.ts` has one stale comment mentioning `AiOverlay`. Harmless.
- Settings overlay is a stub (seam wired, no content). Timesheet tile is present
  but disabled ("Soon"), not built.
- To revert the staging promotion: point `origin/dev` back to `f1edae6` (its prior
  tip) via the GitHub refs API. `main`/prod was never touched.
