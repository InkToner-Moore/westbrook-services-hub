# UI Rehaul - Implementation Plan (orchestration + file ownership)

Read `DESIGN-SPEC.md` first. This file is the build order and, critically, the
**file-ownership map** so parallel agents never edit the same file.

## Decisions (locked with the user)

- Stay on **Vite + React**. No Astro (auth-gated interaction-heavy SPA; Astro's win
  does not apply, and a live two-env deploy pipeline is not worth churning).
- **AI Mode becomes the main staff screen**, not an overlay. Three-pane shell.
- Clicking a tool tile shows **today's working tool, restyled** in the center pane.
  Reuse, do not rebuild - keeps inventory price lists, cartridge manual delete, the
  receipt flow, tracking all working.
- Confirmation of details moves from the chat into the **right artifact rail**; the
  chat just tells you to look right and confirm. Action buttons pin to the rail foot.
- Public site: **strong restyle, same structure**, mobile-first.
- Mobile staff: **single column, AI-first** (rail -> bottom bar/drawer; artifact ->
  slide-up sheet).
- Work lands on a dedicated GitButler branch for this session, promoted to
  `origin/dev` for Cloudflare staging (never `main`/prod).

## Target shell architecture

```
src/components/shell/
  StaffShell.tsx      3-pane frame; owns responsive layout + which pane shows
  TileRail.tsx        left rail: AI 1x2 hero + 8 tool tiles + rule + user/theme
  UserMenu.tsx        user chip -> email + logout + settings(stub) on hover/click
  ArtifactRail.tsx    right rail wrapper: header + scroll body + pinned action foot
  tiles.ts            the tile list (label, icon, route/key, hue, enabled)
```

- `/staff/dashboard` renders `StaffShell`. The shell decides the center pane from a
  selected-tool key: `ai` (default) -> the chat; any tool key -> that tool's page
  component rendered inline (no full-page chrome; the tool renders its content only).
- The AI Mode chat, the confirmation-in-artifact, and the cart all live inside the
  shell now, not as global overlays mounted in `App.tsx`.
- Tool pages keep their routes too (deep links still work), but when shown inside the
  shell they render without their own `StaffLayout` header (a `chromeless` prop or a
  thin content export). Reuse the existing page bodies; do not fork them.

## Waves and STRICT file ownership

An agent edits ONLY the files under its "owns" list. If it needs a change in a file
another agent owns, it writes a note in its report for the orchestrator to reconcile.
Shared foundational files (ThemeContext, App.tsx, tailwind.config, index.html,
index.css, StaffShell + shell/*) are owned by the **orchestrator** and edited before
any wave that depends on them.

### Wave 0 - Foundation (orchestrator, serial, before everything)
Owns: `src/contexts/ThemeContext.tsx`, `tailwind.config.ts`, `index.html`,
`src/index.css`, `src/App.tsx`, `src/components/shell/*` (skeleton),
`src/components/StaffLayout.tsx`.
Does: refresh `themeClasses` to the new tokens + add keys (tile, slip, fonts);
wire IBM Plex in index.html + tailwind; build the `StaffShell`/`TileRail`/
`ArtifactRail`/`UserMenu` skeletons with clear slot props and a `chromeless` path
for tool pages; point `/staff/dashboard` at the shell; keep AI chat working inside
it. Land + commit so every later agent builds on a stable base and a real token set.

### Wave A - runs in parallel after Wave 0 (disjoint files)

**Agent A1 - Cleanup** (can start immediately, independent of Wave 0)
Owns: deletes only + `package.json`, `vite.config.ts` (lovable-tagger),
`index.html` META TAGS ONLY (coordinate: orchestrator owns the font `<link>` in the
same file - A1 touches only the og/twitter meta lines, orchestrator adds fonts;
to avoid a clash, **orchestrator does the index.html meta-tag removal as part of
Wave 0** and A1 leaves index.html alone). A1 owns: delete the ~30 unused `ui/`
components + cascade-dead (`sidebar`, `sheet`, `skeleton`, `separator`, `toggle`,
`toggle-group`, `print-button`, `undo-redo-controls`, `use-toast` shim, etc. per the
audit), delete dead components (`AdvancedSearch`, `BulkActions`, `SkeletonCard`,
`LoadingSpinner`, `ErrorBoundary`, `AnalyticsDashboard`, `feature-toggle`), dead
hooks (`useKeyboardShortcuts`, `use-mobile`, `usePrint`), `utils/dataExport.ts`,
`src/App.css`, `src/styles/print.css` (and its import in index.css - COORDINATE:
leave the index.css import line to the orchestrator), drop unused deps from
package.json (`html2canvas`, `recharts`, `embla-carousel-react`, `vaul`,
`input-otp`, `react-resizable-panels`, `cmdk`, `react-day-picker`, and the radix
packages that backed only-deleted components), rename package.json `name`.
Must NOT touch: App.tsx, FeatureProtectedRoute, ThemeContext, any shell file, any
tool page. Verify `yarn build` after.

**Agent A2 - Public site** (independent of staff)
Owns: `src/pages/PublicHome.tsx`, `src/components/SmartTracker.tsx` (styling only,
keep its logic + the shared usage on staff intact), a new
`src/components/public/PublicHeader.tsx` + `PublicFooter.tsx` if it helps.
Does: the strong restyle per DESIGN-SPEC, mobile-first. Keep all data logic
(refill lookup, tracker) exactly. Do NOT change `orderStatus`/firestore reads.

### Wave B - runs in parallel after Wave 0 (shell-dependent, disjoint files)

**Agent B1 - Tile rail + user menu**
Owns: `src/components/shell/TileRail.tsx`, `UserMenu.tsx`, `tiles.ts`,
`src/components/ThemeToggleButton.tsx` (restyle to match). Fills the shell's left
slot. Timesheet tile present but disabled with a quiet "Soon" state. Settings button
opens a stub overlay (a simple modal saying it is coming; wire the seam, no content).

**Agent B2 - Artifact rail + confirmation-in-artifact**
Owns: `src/components/ai/ArtifactPanel.tsx` (-> becomes the rail body via the shell
slot), `src/components/ai/ConfirmationCheck.tsx`, `src/components/ai/ReceiptControls.tsx`,
`src/ai/context.tsx` (artifact/confirmation state), and a new
`src/components/ai/ArtifactActions.tsx` for the pinned foot. Moves the confirmation
slip into the artifact; the chat posts a short "I have put the details on the right,
give them a look and confirm." Action buttons (Confirm/Submit, Not now/Cancel,
Download 4x6 / full / Print) pin to the rail foot. Broaden artifact kinds to include
`confirmation`. Keep receipts + tracking in the artifact.

**Agent B3 - Center chat + tool restyle**
Owns: `src/components/ai/AiOverlay.tsx` (-> center chat panel, de-overlayed),
`src/components/ai/Composer.tsx`, `QuickActions.tsx`, `IntentSuggestions.tsx`,
`CartPanel.tsx` (-> integrates with shell), and the tool page BODIES for restyle:
`src/pages/StaffReceipts.tsx`, `StaffCartridges.tsx`, `StaffInventory.tsx`,
`StaffNotes.tsx`, `StaffDirectory.tsx`, `StaffRequests.tsx`, `StaffTracking.tsx`,
`StaffDashboard.tsx` (its body is replaced by the shell; keep the file as a thin
mount). Restyle to tokens; strip Lovable tells; add the `chromeless` render path so
each renders cleanly inside the center pane. Preserve every feature and firestore call.

B2 and B3 both read `context.tsx` but only B2 EDITS it. B3 consumes the context API;
if B3 needs a new context method, it notes it for the orchestrator/B2.

### Wave C - Integration (orchestrator)
Reconcile, `yarn build` + `yarn lint`, browser-verify light+dark on desktop and a
mobile width, fix regressions, confirm tool functionality, commit coherently, update
HANDOFF, promote to `origin/dev`.

## Verification gate (every agent runs before reporting done)
- `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  then `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack yarn build` is GREEN.
- `corepack yarn eslint <files you changed>` clean (baseline `any` errors in
  `lib/firestore.ts:42,54` are pre-existing - do not touch).
- Report: files changed, any dep added/removed, anything needing another agent's
  file, and anything you could not verify.

## Non-negotiables (repeat from spec)
No em dashes. No Lovable tells. Do not widen `orderStatus`. Model never runs business
logic. Prod deploy path untouched. Keep `themeClasses`; extend, do not replace.
