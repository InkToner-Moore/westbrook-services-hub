# Environments: prod and dev

This project runs two independent environments. They never share data or a deploy
pipeline, so you can break things on dev without any risk to the live site.

```
BRANCH   HOST                        DATABASE          URL
main  -> GitHub Pages             -> PROD Firebase  -> inktonermoore.ca
dev   -> Cloudflare Pages         -> DEV Firebase   -> ink-toner-moore.pages.dev
```

- **Prod** is the live store site. It deploys from `main` via
  `.github/workflows/deploy.yml` and reads/writes the production Firebase project.
  Nothing about prod is touched by the dev setup.
- **Dev (staging)** deploys from the long-lived `dev` branch via Cloudflare Pages and
  reads/writes a *separate* Firebase project. This is where you test, including the
  Firestore-writing AI features that cannot run against the demo config locally.

## Branch workflow

`main` and `dev` are long-lived integration branches. Feature work happens on its own
branch (GitButler virtual branches are fine) and flows through dev before prod:

```
feature branch  --(PR / merge)-->  dev   --(test on staging)-->  ok?
       \                                                           |
        `------------------(PR)------------------>  main  --(auto-deploys to prod)
```

1. Do the work on a feature branch.
2. Merge it into `dev` (open a PR into `dev`, or fast-forward `dev`). Pushing `dev`
   auto-triggers a Cloudflare Pages build.
3. Test on `https://ink-toner-moore.pages.dev` against the dev database.
4. When it is good, open a PR from `dev` (or the feature branch) into `main`. Merging
   to `main` auto-deploys prod.

Never point Cloudflare Pages at `main`, and never put prod Firebase values in the
Cloudflare Pages environment. Prod secrets live only in GitHub Actions.

## The two Firebase projects

| | Prod | Dev |
| --- | --- | --- |
| Firebase project | the original `inktonermoore` project | a separate `inktonermoore-dev` project |
| Config source | GitHub Actions secrets (`VITE_FIREBASE_*`) | Cloudflare Pages env vars (`VITE_FIREBASE_*`) |
| Auth users | real staff accounts | test account(s) you create |
| Firestore data | live | throwaway |

Both are on the Firebase free (Spark) plan. Two projects still cost nothing.

Firestore security rules are **not** in this repo (managed in each project's console).
When you create the dev project, copy the prod rules into it so dev behaves like prod
(see setup below). If you change rules on prod, mirror the change to dev.

## Config precedence in the app

`src/lib/firebase.ts` reads `VITE_FIREBASE_*` and falls back to `demo-*` placeholders.
So the same build points at whichever project the environment supplies:

- Local: `.env` (gitignored). Use dev values here so local writes hit dev, not prod.
- Dev/staging: Cloudflare Pages env vars.
- Prod: GitHub Actions secrets injected at build time.

`VITE_AI_PROXY_URL` selects the LLM router; when unset the app uses the free offline
deterministic engine. See `docs/ai-mode/proxy.md`.

## One-time dev setup

### 1. Create the dev Firebase project

1. https://console.firebase.google.com -> **Add project**. Name it
   `inktonermoore-dev` (or similar). You can disable Google Analytics.
2. **Authentication** -> Get started -> **Email/Password** -> enable.
3. **Authentication -> Users -> Add user**: create a test staff login (email +
   password) you will use on staging.
4. **Firestore Database** -> Create database -> **Production mode** -> pick a region
   (use the same region as prod if you know it).
5. **Firestore -> Rules**: open the prod project's rules in another tab, copy them,
   and paste them into the dev project's rules. Publish. (Rules are not in the repo;
   prod is the source of truth.)
6. **Project settings -> General -> Your apps**: register a **Web app** if there is
   none, then copy its SDK config values (apiKey, authDomain, projectId,
   storageBucket, messagingSenderId, appId).
7. **Authentication -> Settings -> Authorized domains**: add
   `ink-toner-moore.pages.dev` so staff login works on staging.

### 2. Point Cloudflare Pages at dev

1. Cloudflare -> your Pages project -> **Settings -> Builds & deployments** ->
   **Production branch** -> set to `dev`.
2. **Settings -> Environment variables (Production)**: set the six `VITE_FIREBASE_*`
   to the **dev** project's values from step 1.6. Keep `NODE_VERSION=22`,
   `VITE_NODE_ENV=production`, and `VITE_AI_PROXY_URL=<worker url>`. Do NOT set
   `VITE_DEV_BYPASS_AUTH`.
3. Trigger a redeploy (Deployments -> Retry, or push to `dev`).

### 3. Point local dev at the dev database (optional but recommended)

Put the dev `VITE_FIREBASE_*` values in your local `.env` so local writes hit the dev
project instead of prod. Keep `VITE_DEV_BYPASS_AUTH=true` locally for convenience.

## Sanity check after setup

- `https://ink-toner-moore.pages.dev` loads and login uses the dev test account.
- Create a throwaway record (a note or a cartridge order) on staging and confirm it
  appears in the **dev** Firestore, not prod.
- Confirm prod (`inktonermoore.ca`) is unchanged and its data is untouched.
