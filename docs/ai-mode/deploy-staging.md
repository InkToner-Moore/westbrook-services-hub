# Staging deploy (Cloudflare Pages)

The AI Mode overhaul deploys to a separate staging site on Cloudflare Pages. It does
not touch production: `main`, `.github/workflows/deploy.yml`, and `public/CNAME` are
left alone, and prod keeps deploying to GitHub Pages at inktonermoore.ca exactly as
before. Staging exists so Firestore-writing AI features (which the demo Firebase
config rejects) can be exercised against real config, and so the LLM router can be
tried end to end.

Staging serves the `ai-mode-overhaul` branch. SPA routing is handled by
`public/_redirects` (a `/* -> /index.html 200` fallback); that file is inert on
GitHub Pages, so it does not affect prod.

## What you need

- The same Cloudflare account used for the proxy Worker.
- Real Firebase web config values (the `VITE_FIREBASE_*` set) for the environment you
  want staging to read/write. Use a staging/dev Firebase project if you have one, or
  prod values if you are comfortable staging writing to prod data. These are the same
  keys prod injects as GitHub Actions secrets.
- The proxy Worker URL from `proxy.md` (for `VITE_AI_PROXY_URL`).

## Option A: connect the repo (recommended, auto-deploys on push)

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** ->
   **Connect to Git**. Authorize the `InkToner-Moore/westbrook-services-hub` repo.
2. **Production branch:** set it to `ai-mode-overhaul` (this Pages project's
   "production" is our staging; it has nothing to do with the real prod site).
3. **Build settings:**
   - Framework preset: none / Vite
   - Build command: `yarn build`
   - Build output directory: `dist`
   - Node version: set an env var `NODE_VERSION=22`
4. **Environment variables** (Settings -> Environment variables), all as plaintext
   build vars:
   ```
   VITE_NODE_ENV=production
   VITE_AI_PROXY_URL=https://<your-worker>.workers.dev
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   Do NOT set `VITE_DEV_BYPASS_AUTH`. Staging must require a real login.
5. Save and deploy. Cloudflare builds and gives you a URL like
   `https://inktonermoore-staging.pages.dev`. That is your staging origin.
6. **Close the loop with the proxy:** put that origin in `proxy/wrangler.toml`
   `ALLOWED_ORIGIN`, then `cd proxy && npx wrangler deploy` again so the Worker
   accepts calls from staging.

Every push to `ai-mode-overhaul` now redeploys staging automatically.

## Option B: direct upload (no Git connection)

Build locally and push the folder up with wrangler:

```sh
export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# put the seven VITE_* vars above in .env first (VITE_NODE_ENV=production, etc.)
corepack yarn build
npx wrangler pages deploy dist --project-name inktonermoore-staging
```

The first run creates the Pages project and prints the `*.pages.dev` URL. Env vars
for a build baked locally come from your `.env`; for repeatable deploys prefer
Option A.

## After it is up

- Log in with a real staff account and confirm the classic pages work.
- Exercise the Firestore-writing AI actions (cartridge create/status, note,
  inventory, directory, follow-up) and confirm the writes land in Firestore.
- Try a few utterances and confirm the LLM router responds; then stop the Worker or
  unset `VITE_AI_PROXY_URL` to confirm the deterministic fallback still works.

## Firebase auth domains

If staff login fails on staging with an `auth/unauthorized-domain` error, add the
`*.pages.dev` staging domain under Firebase console -> Authentication -> Settings ->
Authorized domains.
