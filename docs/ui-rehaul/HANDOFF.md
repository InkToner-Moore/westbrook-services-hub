# UI Rehaul - Handoff (living state)

Read `DESIGN-SPEC.md` and `PLAN.md` first. This records where the rehaul stands.

## At a glance (2026-09-05, session close)
- **Done and shipped to staging, awaiting Parsa's review.** Branch `ui-rehaul`,
  stacked above `ai-mode-overhaul`, pushed to `origin/ui-rehaul` (tip `a627dac`).
  `origin/dev` is fast-forwarded to that same tip, so Cloudflare Pages rebuilds
  `https://ink-toner-moore.pages.dev` with the rehaul. **Prod (`main`) untouched.**
- **Four commits:** `chore(cleanup)` (remove Lovable scaffolding, dead code, unused
  deps), `feat(ui)` (the whole rehaul), a docs handoff, and `feat(ui)` revisions
  (below).
- **Revisions after first review (commit `sxn`):** AI Mode tile is now a wide 2x1
  hero (was 1x2 tall); tool tiles redesigned with soft hue-tinted icon badges; the
  rail got an "Ink, Toner & Moore / Staff Dashboard" header; both side rails
  collapse on desktop to a slim reopen strip (state persisted in localStorage under
  `shell-left-collapsed` / `shell-right-collapsed`); the composer Pack quick-actions
  no longer wrap a lone pill (labels shortened, wrapped pills align under the first).
- **Parsa is reviewing next.** He verified the rail iteration; the rest of the
  redesign still needs his eye, plus the staging smoke-test.
- **Phase 2 is specified and waiting in `docs/ui-rehaul/PHASE-2.md`** (do not
  build it before Parsa's review lands). It reworks the AI Mode actions into
  Purchase / Receipt / Record / Note / Inventory / Timesheet (each with a
  purpose-built artifact card), builds the Timesheet feature, removes Follow-Ups,
  and carries a bug list (both-rails-open deforms tools, tracking UI, artifact not
  shown after leaving AI Mode, confusing receipt "Model" label, GST two-way /
  after-tax). Read that doc for the full spec.
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
- **Doc drift to fix before merging the rehaul to `main`.** The repo `CLAUDE.md`
  and the WESTBROOK project entry still describe AI Mode as an additive overlay
  that "mounts once in App.tsx outside <Routes> and touches no page component" and
  list the classic dashboard - all of which the rehaul deliberately replaced (with
  the user's go-ahead): AI Mode is the main screen via a shell layout route, tools
  render inside it, `StaffDashboard` and `FeatureProtectedRoute` are gone. Left
  those binding docs alone this session on purpose (they are still accurate for
  `main`, and rewriting the contract's invariants is Parsa's call). README's
  dep line was corrected (html2canvas/recharts removed); `CLAUDE.md` lines 48
  (lockfiles: only `yarn.lock` exists now) and 68-69 (html2canvas/recharts) are
  still stale. Update `CLAUDE.md` + the entry as part of the merge-to-main PR.
