# UI Rehaul - Handoff (living state)

Read `DESIGN-SPEC.md` and `PLAN.md` first. This records where the rehaul stands.

## START HERE (fresh-session brief, 2026-09-05)

**Next session is for:** Parsa's staging review + smoke-test of this session's work
on `ink-toner-moore.pages.dev` (theme reset, the Timesheet Schedule tab, real
manager mode, the slip GST rework), then folding in his feedback. Not a numbered
plan step; this is post-rehaul feature work stacked above the rehaul.

**Where things stand (verify against `but status` before trusting):**
- Branch **`manager-schedule`** stacked on `phase2-followups`, pushed. `origin/dev`
  is fast-forwarded to its tip, so Cloudflare staging rebuilds with all of it.
  **Prod (`main`) untouched.**
- Tree **clean**, local == `origin/manager-schedule` == `origin/dev`.
- Open PRs: only **#1 `docs-align-claude-md`** (pre-existing, not this session's).
- **Gate as observed:** `tsc -p tsconfig.app.json --noEmit` clean; `yarn build`
  green; `eslint` on changed files is baseline-only (pre-existing `any` in
  `firestore.ts:42/54` and `ThemeContext.tsx:6`; benign react-refresh warnings on
  `useManagerMode`/`useTheme`/`useConfirmationDraft`). No new problems.

**Already built this session - do NOT rebuild (details in the sections below):**
1. **Theme hard-reset to light** for everyone (bumped the `staff-theme` ->
   `staff-theme-v2` localStorage key in `ThemeContext.tsx`).
2. **Schedule tab** on the Timesheet page (`StaffTimesheet.tsx`, `lib/schedule.ts`,
   `scheduleShifts` collection): weekly planned shifts, staff read-only, manager
   edits.
3. **Real, server-enforced manager mode**: Worker `/manager/*`
   (`proxy/src/manager.js`) mints a Firebase `manager` claim from a correct PIN;
   client (`lib/managerAuth.ts`, `ManagerModeContext.tsx`) signs in with it; DEV
   Firestore rules require the claim to write `scheduleShifts`/`appSettings`.
   Verified end to end on dev (manager 200 / staff 403). The dialog is
   `ManagerPinDialog.tsx`.
4. **Slip GST rework** (`ConfirmationCheck.tsx`): no "tax incl." toggle; editable
   two-way "Total (incl. GST)".

**Constraints that bite (append, never trim):**
- **Prod path untouched:** never edit `.github/workflows/deploy.yml`, `public/CNAME`;
  never point anything at `main`. Prod deploys `main` -> GitHub Pages.
- **The Worker is SHARED** (`inktonermoore-ai-proxy`, serves both AI routing and
  `/manager/*`). Do not break the root routing path when editing it; re-test with a
  POST `{"utterance":"..."}` after any deploy.
- **DEV rules now require the manager claim** to write `scheduleShifts`/`appSettings`.
  A signed-in but non-manager session gets 403 on those writes - that is correct,
  not a bug.
- **No prod Firebase SA on this machine.** DEV rules/claims are done via the dev SA
  at `/home/user/Programming/InkTonerMoore/inktonermoore-dev-firebase-adminsdk-*.json`
  (outside the repo). PROD activation is a separate, manual step.
- No em dashes anywhere. Style off `themeClasses`, not raw `dark:`.
- **Wrangler is authenticated** on Parsa's Cloudflare account; `cd proxy && npx
  wrangler deploy` works from here. Worker secrets set on dev: `GEMINI_API_KEY`,
  `FIREBASE_SA`, `PIN_PEPPER`.

**Open questions (fold answers in as their own commits; do not invent one):**
- Auto-lock manager mode on reload? Today it persists until Lock/logout (footgun on
  a shared counter browser). Parsa to decide.
- Rate-limit `/manager/unlock` + enforce a longer (6+ digit) PIN? Recommended before
  this carries real weight.
- Start per-employee PINs now or later? `accessPins` already carries a `role` per
  record, so it is additive.

**Working rules:**
- Env: `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, then `corepack yarn ...`.
- Gate before every commit: `corepack yarn tsc -p tsconfig.app.json --noEmit`,
  `corepack yarn build`, and `corepack yarn eslint <changed files>` (baseline-only
  is the bar).
- VC via GitButler, one branch per session, coherent commits. Git + dev promotion
  are handled autonomously for this project (per the user).
- Firestore rules are console-managed (not in repo); deploy to dev by minting an SA
  token and calling the Rules REST API (a working script pattern was used this
  session).

**Still placeholder / not customer-ready:** no manager PIN is set on dev yet (first
"Manager sign in" runs the set-PIN flow); Moneris device-send remains stubbed
(pre-existing).

---

## Real manager protection + slip GST (2026-09-05, same session cont.)

All on branch `manager-schedule`, pushed, and `origin/dev` fast-forwarded to it
(Cloudflare staging rebuilds). Prod untouched. The user asked to (a) handle git
and dev promotion autonomously (see the WESTBROOK memory), (b) make manager
protection REAL, not just a client PIN, keeping one shared login + a PIN.

- **Slip GST rework** (`ConfirmationCheck.tsx`): removed the confusing "tax incl."
  toggle. The price field is just the pre-tax price. When GST is on, the
  "Total (incl. GST)" row is itself editable and two-way with the price (type the
  after-GST total and the price back-solves, and vice versa) using
  `netFromGross`/`grossFromNet`. Browser-verified both directions.

- **Real manager mode (server-enforced).** A client PIN can't be a security
  boundary, so:
  - **Worker** `proxy/src/manager.js` (routed under `/manager/*` in `worker.js`,
    AI routing untouched): verifies the PIN server-side (SHA-256 with a
    `PIN_PEPPER` secret; hashes stored in Firestore `accessPins`, which clients
    cannot read) and mints a Firebase custom token with a `manager` claim for the
    caller's uid. Endpoints: `status`, `set-pin` (change needs the current PIN),
    `unlock`, `lock`. Secrets set on the worker: `FIREBASE_SA` (dev admin SA),
    `PIN_PEPPER`. Deployed to `inktonermoore-ai-proxy` (URL
    `https://inktonermoore-ai-proxy.inktonermoore.workers.dev`).
  - **Client** (`lib/managerAuth.ts`, `ManagerModeContext.tsx`): unlock calls the
    worker then `signInWithCustomToken`, so the session's ID token gains the
    claim; `isManager` is read from the claim via `onIdTokenChanged`. Lock mints a
    claimless token. Dev bypass keeps a local toggle. `ManagerPinDialog` gained a
    current-PIN field for changes.
  - **DEV Firestore rules** (console, not in repo) now: `scheduleShifts` and
    `appSettings` writes require `request.auth.token.manager == true` (reads still
    any authed staff); `accessPins` is admin-only (`if false`). Verified end to
    end on dev: manager token writes 200, staff token 403, staff read of
    accessPins 403. Current released ruleset `791d84cc-...`.
  - **Manager mode persists until Lock or logout** (the claim rides the session).
    Noted as a possible footgun on a shared counter browser; auto-lock-on-reload
    is a easy follow-up if wanted.

**Still open / follow-ups:**
- **PROD**: none of this is on prod. When the rehaul ships to `main`, mirror the
  DEV rules to PROD, deploy the worker with the PROD service account + a
  `PIN_PEPPER`, and confirm `VITE_AI_PROXY_URL` is set for prod. There is no prod
  SA on this machine.
- **Brute-force**: `/manager/unlock` has no rate limiting yet. Recommend a 6+
  digit PIN and add per-IP/uid throttling (KV or Durable Object) as hardening.
- **Employee PINs (maybe later, per the user):** `accessPins` carries a `role`
  per record and the worker matches by PIN, so per-employee PINs/roles can be
  added without changing the client/worker contract.
- No PIN is set on dev yet (test data cleaned up); first "Manager sign in" runs
  the set-PIN flow.

## Schedule + manager PIN (2026-09-05, later session)

Branch **`manager-schedule`** stacked on `phase2-followups`, pushed to
`origin/manager-schedule` (tip `41e5a72`). Two commits:
- `fix(theme): hard-reset the default to light for everyone` - bumps the theme
  localStorage key (`staff-theme` -> `staff-theme-v2`) so every browser's saved
  preference is dropped once and lands on light. This closes the long-open
  "theme force-reset" question. A later toggle persists under the new key.
- `feat(timesheet): manager-PIN-gated weekly schedule` - answers "timesheets
  should be doable through classic too" (they already were; the real ask was a
  manager-built schedule).

What landed for the feature:
- A **reusable manager mode** (soft gate): `src/lib/managerAuth.ts` (SHA-256 of a
  salt + PIN via Web Crypto, stored in a single `appSettings/manager` Firestore
  doc as `pinHash`), `src/contexts/ManagerModeContext.tsx` (`useManagerMode()`
  exposing `isManager`, `pinIsSet`, `promptUnlock`, `promptChangePin`, `lock`;
  renders the dialog itself), and `src/components/ManagerPinDialog.tsx` (set-PIN
  / unlock modal). Mounted in `App.tsx` wrapping the app. `isManager` is
  session-only React state (clears on reload). Built generic on purpose so the
  future site-content editor and settings can gate the same way.
- A **Schedule tab** on the Timesheet page (`src/pages/StaffTimesheet.tsx`): a
  Sunday-start weekly view (prev/next/this-week) of planned shifts grouped by
  day; all staff read it. Add / edit / delete shifts show only in manager mode;
  a locked user sees "Manager sign in". Shifts: `src/lib/schedule.ts` model +
  helpers, new `scheduleShifts` collection, `generateShiftId` (`SHF-`) in
  `lib/firestore.ts`. AI Mode is untouched (this is the classic-page path).
- Gate: `tsc -p tsconfig.app.json --noEmit` clean, `yarn build` green, lint on
  changed files is baseline-only (pre-existing `any` in `firestore.ts`/
  `ThemeContext.tsx`, plus the benign react-refresh warning on `useManagerMode`,
  same pattern as ThemeContext/AiContext). Browser-verified locally (auth
  bypass, light theme default confirmed): tab switch, schedule week view,
  read-only lock state, and the set-PIN dialog all render with no React errors.
  Firestore reads/writes are permission-denied on the demo config (expected).

**BLOCKERS before this works on staging (needs Parsa):**
1. **Two new Firestore collections need auth-gated rules on DEV** (and later
   PROD): `appSettings` and `scheduleShifts` both need
   `allow read, write: if request.auth != null`, like the earlier
   `employees`/`timeEntries`/`transactions` fix. No Firebase service account is
   in keyvault this session, so this must be added in the Firebase console.
   Without it the schedule loads empty and the PIN cannot be set.
2. **Not promoted to `origin/dev`.** `origin/dev` is still at `phase2-followups`
   (`4958ca2`). Promoting is a clean fast-forward to `41e5a72` once the rules
   are in; left as Parsa's call.

**Design note (flagged to Parsa):** the PIN is a SOFT gate - it stops accidental
edits by counter staff, but any signed-in user with devtools can bypass it while
Firestore rules still allow any authed write. Real enforcement means a rule keyed
on a manager identity (a manager-UID allowlist or a custom claim). Harden when
ready. Open follow-up: the schedule is not exposed through AI Mode (classic only,
as asked); add a `schedule` action later if wanted.

## Phase 2 follow-ups (2026-09-05, later session)

Cleared several of the "watch-outs" the Phase 2 build left. Two new branches, both
pushed:
- **`phase2-followups`** (stacked on `ui-rehaul-phase2`, tip `40a2336`): fixes the
  deep-linked standalone tool-page icon badge (StaffHeader used `iconColor` as a
  gradient, but the pages pass a text-color class matching the in-shell path, so
  the badge rendered as a stopless/broken gradient - now a neutral badge with the
  icon in its tool hue, consistent both paths), and drops the stale `AiOverlay`
  comment in `src/ai/actions/index.ts`. Gate: `tsc -p tsconfig.app.json --noEmit`
  clean, `yarn build` green, lint clean on changed files.
- **`docs-rehaul-drift`** (stacked on Parsa's `docs-align-claude-md`, tip
  `422da28`): fixes doc drift in `CLAUDE.md` and `README.md` to match the shipped
  rehaul (AI Mode as the main screen via the shell layout route, StaffDashboard /
  FeatureProtectedRoute / customer Requests gone, only `yarn.lock`, html2canvas /
  recharts removed, real type-check command, new timesheet/transactions
  collections + console-rules note). It went on its own branch because CLAUDE.md's
  content lives on `docs-align-claude-md`, not on the rehaul stack, so the doc edit
  depends on that branch while the code fix depends on the rehaul stack. The
  WESTBROOK project entry (`~/.claude/projects.d/WESTBROOK.md`, not in the repo)
  was updated the same way.

Resolved from the Phase 2 watch-out list below:
1. **Proxy redeployed** by Parsa (`cd proxy && npx wrangler deploy`), version
   `996712c4`. The LLM path now routes to the new actions.
2. **DEV Firestore rules added** for `employees`, `timeEntries`, `transactions`
   (auth-gated read/write) via the Firebase Rules API using the dev service
   account. New DEV ruleset `37ff7ca4-d89d-4700-99fa-dbbb9a3db910` released.
   **PROD still needs the same three rules added when the rehaul ships to `main`.**

Public-home polish (same `phase2-followups` branch, also on `origin/dev`): the
Track-a-parcel and refill-status cards now fill their width (were pinned to a
narrow left column, leaving a big empty right gap) and sit in a 2-col grid on
desktop; public content widened to `max-w-6xl`; the contact email wraps
(`break-all`) so its `.com` no longer spills under the store map; the map zooms
slightly on hover/focus. Theme default confirmed **light** for a fresh visitor
(verified: no `dark` class, `colorScheme: light`) - any dark view is a saved
`staff-theme` toggle in that browser, not the default.

Follow-up redesign (Parsa's review of the above): the courier picker in
`SmartTracker` was three large stacked buttons, so Track-a-parcel overflowed the
viewport and towered over the short refill card. Now the couriers are a compact
3-across row of logo tiles (fits without scrolling), the two self-serve cards are
equal height (`lg:items-stretch` + `h-full`), and the refill form is vertically
centered so the pair reads as a balanced set. Verified in-browser at 1280px and
390px, both cards ~equal height, mobile couriers in one row. **This is the state
Parsa will review next session; open question is still the theme force-reset (see
below) - the default is already light, but existing browsers with a saved dark
toggle keep it until they toggle back or we bump the `staff-theme` storage key.**

Still open: single artifact slot in compound flows (design decision, needs Parsa);
`KEY_LOCATIONS` map in InventoryCard is empty (needs Parsa's A1:KW1-style data);
standalone `purchase` action has no route/executor (only `attach.pay` is wired).
Not pushed to `origin/dev` - staging promotion of these follow-ups is Parsa's call
during his review.

## PHASE 2 BUILT (2026-09-05) - the latest track

Parsa lifted the review gate and asked to build Phase 2 in one session. It is
built and on staging. Architecture contract for the whole phase:
`docs/ui-rehaul/PHASE-2-ARCH.md` (read it before touching the AI layer - it
defines the action model, the artifact-renderer registry, and the compound-attach
seam). Built foundation-first, then fanned out to per-action agents.

- **Branch `ui-rehaul-phase2`** (stacked on `ui-rehaul`), pushed, tip `3f5506c`.
  `origin/dev` fast-forwarded to it, so `ink-toner-moore.pages.dev` rebuilds with
  Phase 2. **Prod (`main`) untouched.** Six commits (contract, Wave-1 foundation,
  Wave-2 docs, Wave-2 slip, Wave-2 cards, Wave-3).
- **Gate:** `corepack yarn build` GREEN and the REAL type-check
  `corepack yarn tsc -p tsconfig.app.json --noEmit` clean. NOTE: the root
  `tsconfig.json` is solution-style with empty `files`, so plain
  `corepack yarn tsc --noEmit` is a NO-OP - always type-check with `-p
  tsconfig.app.json`. Lint: no new errors; only the documented baseline
  (`firestore.ts:42/54` any) and benign `react-refresh/only-export-components`
  warnings inherent to the card `register()` hook pattern.
- **What landed:**
  - New six-action AI model (Purchase, Receipt, Record, Note, Inventory,
    Timesheet). Internal cartridge_* ids kept and surfaced as "Record". Added
    `inventory_lookup` (read, immediate). **Follow-Ups removed end to end.**
  - **Compound `attach`** (pay + 4x6 label) chained around one transaction, with
    toggles on the confirmation slip foot.
  - **Artifact renderer registry** (`src/components/shell/artifactRegistry.tsx`):
    each action-state has a bespoke card in its own file under
    `src/components/ai/artifacts/` (ReceiptCard, RecordCard, NoteCard,
    InventoryCard, TimesheetCard, PaymentCard), registered one line each.
  - **Bug fixes:** both-sidebars-open no longer deforms the tool pages; the
    artifact persists after leaving AI Mode (with "show last"); tracking page UI
    fixed in the shell; the confusing "Model" field is gone from a supplies sale.
  - **Confirmation slip:** per-field OMIT toggle (circle left of a row, omits even
    a required field); GST two-way pricing (type pre-tax or tax-inclusive, other
    auto-derives, after-GST total shown); Note category is a fixed dropdown.
  - **Timesheet** feature end to end: `employees` + `timeEntries` collections,
    punch clock, CSV export, AI add/punch/view, tile enabled + route + card.
  - **Purchase (minimal, per Parsa's "simply note"):** a confirmed "charge card"
    attachment records the transaction to a `transactions` collection for later
    Moneris reconciliation and shows a payment card the counter marks approved or
    declined by hand. Device send is STUBBED (Moneris backend + certification not
    built - see `docs/moneris-a920-integration-research.md`).
- **NEXT SESSION is Parsa's staging review + smoke test** (needs the dev staff
  login; Firestore writes and the LLM path could not be exercised locally). Log in
  on `ink-toner-moore.pages.dev`, run each action, and confirm writes land in DEV
  Firestore. Watch-outs / follow-ups:
  1. **Proxy not redeployed.** `proxy/src/worker.js` gained the new actions in its
     prompt/schema but was NOT deployed (needs `cd proxy && npx wrangler deploy`,
     Cloudflare account). The deterministic router handles every new action offline,
     so staging works; the LLM path just will not route to the new actions until
     redeployed. A stale `followup` LLM response now fails schema and degrades to
     deterministic (fine).
  2. **New Firestore collections need rules + edition on DEV (and later PROD):**
     `employees`, `timeEntries`, `transactions` need `allow read, write: if
     request.auth != null` added to the ruleset (managed in Firebase, not in the
     repo), like the earlier `refillInventory` fix. Without it the timesheet and
     purchase writes will be permission-denied.
  3. **Single artifact slot:** in a compound "refill + charge + label" flow the
     chain runs primary -> pay -> label and each `addResult` replaces the one
     artifact, so the last step's card wins the rail (the chat carries the full
     trail). Fine for now; revisit if Parsa wants all three visible at once.
  4. **Key location map:** InventoryCard scaffolds a model -> cut-code lookup
     (`KEY_LOCATIONS` in InventoryCard.tsx, empty). Fill it when Parsa provides the
     A1:KW1 / A2:SC1 style map; the location edit persists a `cutCode` field on
     `keyInventory` docs (additive, StaffInventory ignores it).
  5. **Standalone `purchase` action** is in the union/schema but has no route or
     executor - only the `attach.pay` path is wired. Add one only if needed.
  6. **CLAUDE.md + the WESTBROOK entry** still describe the pre-rehaul overlay
     design; update them as part of the eventual merge-to-main PR (as the earlier
     handoff already flagged).

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
