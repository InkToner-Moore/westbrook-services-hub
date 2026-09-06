# Ink Toner & Moore

The web app for Ink Toner & Moore, an office-services shop in Westbrook Mall,
Calgary (print, toner refills, key cutting, shipping and courier drop-off). One
React single-page app serves two audiences:

- **Public portal** (`/`) — customers track packages, check whether a cartridge
  refill is ready, look up services, and find the store.
- **Staff portal** (`/staff/*`, login required) — the counter tools: package
  tracking, receipt generation, cartridge refill management, inventory, an
  internal website directory, notes, and customer requests.

Live at [inktonermoore.ca](https://inktonermoore.ca).

## Stack

- React 18 + TypeScript, built with Vite (SWC)
- Tailwind CSS + shadcn/ui (Radix primitives)
- React Router, TanStack Query, React Hook Form + Zod
- Firebase — Authentication (staff email/password) and Firestore (data)
- jsPDF for receipt PDF export; lucide-react icons
- Deployed to GitHub Pages on every push to `main`

## Getting started

Requires Node 18+ and yarn (yarn is the authoritative package manager; CI uses
`yarn install --frozen-lockfile`).

```bash
yarn install
cp .env.example .env    # fill in Firebase config, or leave demo values for a no-persistence run
yarn dev                # http://localhost:8080
```

To work the staff portal locally without a real login, set in `.env`:

```env
VITE_NODE_ENV=development
VITE_DEV_BYPASS_AUTH=true
```

## Scripts

```bash
yarn dev        # dev server on port 8080
yarn build      # production build to dist/
yarn build:dev  # build in development mode
yarn preview    # preview the production build
yarn lint       # ESLint
```

There is no test or type-check script. Verify changes with `yarn lint` and
`yarn build`.

## Project structure

```
src/
  App.tsx              routing: public + protected staff routes
  pages/               PublicHome + Staff* pages
  components/          feature components; ui/ holds shadcn/ui primitives
  contexts/            ThemeContext (light default, staff theme toggle)
  hooks/               useAuth, useTheme, useValidation, ...
  lib/                 firebase, firestore helpers, orderStatus mirror, receipts
  utils/               dataExport, validation
```

## Data

Firestore is the only persistence. Full order data lives in staff-only
collections; the `orderStatus` collection is a minimal public-readable mirror
(order ID, phone, last name, status) so customers can check on a refill without
exposing anything else. Firestore security rules and Firebase Auth are the access
boundary and are managed in the Firebase console. See
[DEPLOYMENT.md](./DEPLOYMENT.md) for setup.

## Contributing

See [CLAUDE.md](./CLAUDE.md) for architecture notes, conventions, and the version
control workflow.

## Contact

Ink Toner & Moore — 1200 37 Street SW Unit 3b, Calgary, AB T3C 1S2 · (403) 686-2835
