# Deployment

The site deploys to **GitHub Pages** at **inktonermoore.ca**. Deployment is
automatic: every push to `main` runs `.github/workflows/deploy.yml`, which builds
with yarn on Node 22 and publishes `dist/` to Pages.

## How the workflow builds

1. `yarn install --frozen-lockfile`
2. `yarn build` with the Firebase config injected from repository secrets
3. Copies `dist/index.html` to `dist/404.html` so client-side routes resolve on
   Pages (SPA fallback)
4. Uploads and deploys the Pages artifact

`public/CNAME` pins the custom domain. Vite serves at the site root
(`base: "/"`), so routing works both locally and in production.

## Required GitHub Actions secrets

Set these in the repository under Settings → Secrets and variables → Actions.
They are read at build time and baked into the client bundle.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Firebase web config is not secret in the security sense (it ships to the browser),
but keeping it in Actions secrets keeps it out of the repo and lets prod and dev
projects differ. The real access boundary is Firestore security rules plus
Firebase Auth, both managed in the Firebase console, not in this repo.

## Firebase setup (one time)

1. Create a Firebase project.
2. Enable Authentication with the Email/Password provider and create the staff
   user(s).
3. Create a Firestore database.
4. Write security rules in the console: auth-gate every staff collection, and
   allow public read only on the `orderStatus` collection (the public refill-status
   mirror). The client is not the security boundary; the rules are.
5. Copy the web app config values into the GitHub Actions secrets above.

## Local vs production

- **Local:** `.env` supplies `VITE_FIREBASE_*`. Set `VITE_NODE_ENV=development`
  and `VITE_DEV_BYPASS_AUTH=true` to work the staff portal without a live login
  (see `.env.example`). Firebase falls back to `demo-*` placeholders if unset, so
  the app boots but nothing persists.
- **Production:** the workflow sets `VITE_NODE_ENV=production` and no bypass flag,
  so real Firebase Auth is enforced.

## Custom domain

`inktonermoore.ca` is set via `public/CNAME` and the domain's DNS pointing at
GitHub Pages. HTTPS is provisioned by Pages.
