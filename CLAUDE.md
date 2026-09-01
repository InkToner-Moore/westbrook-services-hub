# CLAUDE.md

Guidance for Claude Code working in this repository. Read it before making changes.

## What this is

The web app for **Ink Toner & Moore**, an office-services shop in Westbrook Mall,
Calgary (print, toner refills, key cutting, shipping/courier drop-off). One React
SPA serves two audiences:

- **Public portal** (`/`) — customers track packages, check whether a refill is
  ready, look up services, find the store.
- **Staff portal** (`/staff/*`, login required) — the counter tools: package
  tracking, receipt generation, cartridge refill management, inventory, an
  internal website directory, notes, and customer requests.

The site exists to make the counter staff's job faster and to give customers
self-serve lookups. Staff and customers are a wide age range, so the bar is
**sleek but simple**: nothing that a non-technical older user or a busy person at
the counter has to think about.

Live at **inktonermoore.ca**.

## Ground truth vs. stale docs

This repo started from a Lovable AI draft. The Google-Sheets/Netlify docs that
came with that draft have been removed (`netlify.toml`,
`INTEGRATION_REQUIREMENTS.md`, `docs/google-sheets-structure.md`), and `README.md`
and `DEPLOYMENT.md` now describe the real stack. If any lingering doc disagrees
with the code, **the code wins**. Specifically:

- **Backend is Firebase** (Auth + Firestore). It is *not* Google Sheets and there
  are *no* Netlify Functions.
- **Deployment is GitHub Pages**, via `.github/workflows/deploy.yml` on push to
  `main`. Netlify is not the target.
- **Default theme is light**, not dark (the older CLAUDE.md said dark).
- The **feature-module gating** (`FeatureProtectedRoute`, `feature-toggle.tsx`,
  `modules.*.enabled` paths in `App.tsx`) is dead scaffolding: `isFeatureEnabled`
  is hardcoded to `true` because the settings panel was removed. Routes render
  regardless. Don't build on it without reviving the settings store first.

If you find another doc that contradicts the code, fix or flag it rather than
coding to it.

## Commands

Package manager: **yarn** is authoritative — CI runs `yarn install --frozen-lockfile`
on Node 22. (`bun.lockb`, `package-lock.json`, and `yarn.lock` all exist in the
tree; ignore the first two, keep `yarn.lock` in sync.)

- `yarn dev` — dev server on **port 8080** (`host: "::"`, so reachable on the LAN)
- `yarn build` — production build to `dist/`
- `yarn build:dev` — build in development mode
- `yarn lint` — ESLint
- `yarn preview` — preview the production build

There is **no test framework and no type-check script** configured. Don't invent
`yarn test` or `yarn type-check` in instructions or CI. Verify changes with
`yarn build` and `yarn lint`.

## Stack

- **React 18 + TypeScript**, built with **Vite** (`@vitejs/plugin-react-swc`).
- **Tailwind CSS** + **shadcn/ui** (Radix primitives) in `src/components/ui/`.
- **React Router** (`BrowserRouter`, `basename={import.meta.env.BASE_URL}`).
- **TanStack Query** for async state, **React Hook Form** + **Zod** for forms.
- **Firebase** Auth and Firestore.
- **jsPDF** + **html2canvas** for receipt/PDF export; **lucide-react** icons;
  **recharts** for the analytics dashboard.
- TypeScript is intentionally relaxed (`noImplicitAny: false`,
  `strictNullChecks: false`). Path alias `@/*` → `src/*`.

## Layout

```
src/
  App.tsx              routing; public + protected staff routes
  main.tsx             entry
  pages/
    PublicHome.tsx     customer portal (tracking, refill status, services, contact)
    StaffLogin.tsx     Firebase email/password login
    StaffDashboard.tsx staff landing / module launcher
    StaffTracking.tsx  StaffReceipts.tsx  StaffCartridges.tsx
    StaffDirectory.tsx StaffNotes.tsx     StaffInventory.tsx  StaffRequests.tsx
    NotFound.tsx
  components/
    SmartTracker.tsx   courier detection + tracking UI (shared public/staff)
    StaffHeader.tsx StaffLayout.tsx   staff chrome
    ProtectedRoute.tsx        auth gate
    FeatureProtectedRoute.tsx module gate (currently a no-op — see above)
    ui/                shadcn/ui components; edit here for shared primitives
  contexts/ThemeContext.tsx   theme state + themeClasses bag
  hooks/               useAuth, useTheme, useValidation, usePrint, useUndoRedo, ...
  lib/
    firebase.ts        app/auth/db init from VITE_FIREBASE_* env
    firestore.ts       generic CRUD helpers + ID generators (ORD-/NOTE-/REQ-/INV-)
    orderStatus.ts     public order-status mirror (schema + name normalizing)
    cartridges.ts simpleReceipt.ts utils.ts
  utils/               dataExport, validation
  styles/print.css     src/index.css  src/App.css
```

## Data model (Firestore)

Firestore is the only persistence. Pages that read/write it: `PublicHome`,
`StaffCartridges`, `StaffNotes`, `StaffDirectory`, `StaffInventory`,
`StaffRequests`. Use the generic helpers in `lib/firestore.ts`
(`getCollection`, `queryCollection`, `getDocument`, `setDocument`,
`updateDocument`, `deleteDocument`) rather than calling the SDK inline, and the
`generate*Id` helpers for document IDs.

The public/staff privacy split matters:

- Full order data lives in staff-only collections.
- **`orderStatus`** (`lib/orderStatus.ts`) is the *public-readable mirror* of a
  cartridge order. It holds only `orderId`, `customerPhone`, `customerLastName`
  (normalized), and `status` — the minimum for a customer to check on a refill.
  Never widen it to carry data a customer shouldn't be able to read. Staff write
  it; the public home page reads it.

Firestore security rules and `firebase.json` are **not in this repo** — they're
managed in the Firebase console. Auth-gate every staff write and keep public read
scoped to `orderStatus` there; the client is not the security boundary.

## Auth

`useAuth` wraps Firebase email/password. In development with
`VITE_NODE_ENV=development` and `VITE_DEV_BYPASS_AUTH=true`, it injects a mock
user so you can work the staff portal without a live login. Never let bypass reach
production — production builds set `VITE_NODE_ENV=production` and no bypass flag.

## Theme

Custom system, not `next-themes` at runtime. `ThemeContext` holds `isDarkMode`
(persisted in `localStorage` under `staff-theme`, **default light**), toggles the
`.dark` class and `color-scheme` on the root, and exposes a `themeClasses` bag of
Tailwind strings. Staff components style off `themeClasses.*` rather than raw
`dark:` variants in many places — match the surrounding file's approach when you
edit one.

## Environment

`.env` (gitignored) supplies `VITE_FIREBASE_*` — see `.env.example`. Firebase
config falls back to `demo-*` placeholders so the app boots without secrets, but
nothing persists. Production Firebase values are injected as GitHub Actions
secrets at build time (see `deploy.yml`). `public/CNAME` pins `inktonermoore.ca`.

## Conventions

- **Match the file you're in.** Naming, component shape, `themeClasses` usage,
  form patterns (React Hook Form + Zod), and Firestore access via the helpers —
  follow what's already there before introducing a new pattern.
- Shared UI primitives go in `components/ui/`; feature UI in `components/` or the
  relevant page.
- Keep the public surface minimal and legible; keep customer-private data out of
  anything public-readable.
- **Prose style: write like a person.** No em dashes anywhere — in code comments,
  commit messages, docs, or UI copy. No marketing filler, no emoji in code or
  commits, no "comprehensive"/"seamless"/"robust" padding. Say the plain thing.

## Version control

Commits, pushes, branches, merges, and PRs are managed by the agent (Claude),
authored as the user. Use **GitButler** (`but`), not raw `git`, for all
version-control work — see the GitButler skill for recipes. Work on a dedicated
branch for the session, write terse commit messages (what changed and why), and
hold to a high bar: coherent commits, no unrelated changes bundled together,
tests-with-behavior if tests ever land. Push and open PRs on your own judgement.

## Quality bar

This is a real business's live site. Before calling a change done: `yarn lint`
clean and `yarn build` succeeds. Prefer editing existing components over adding
parallel ones. When you touch anything customer-facing, re-check the
public/private data boundary. When something is genuinely ambiguous, ask rather
than guess.
