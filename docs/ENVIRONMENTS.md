# Environments: prod and dev

This project runs two independent environments. They never share data or a deploy
pipeline, so you can break things on dev without any risk to the live site.

```
BRANCH   HOST                        DATABASE          URL
main  -> Cloudflare Pages itm-site -> PROD Firebase  -> inktonermoore.ca
dev   -> Cloudflare Pages         -> DEV Firebase   -> ink-toner-moore.pages.dev
```

- **Prod** is the live store site. It deploys from `main` via
  `.github/workflows/deploy.yml` and reads/writes the production Firebase project.
  Nothing about prod is touched by the dev setup. Since 2026-10-15 prod is split:
  `main` is still the V1 app and serves every `/staff` URL (through `404.html`),
  while `/` is this branch line's customer page, built alone by `yarn build:public`
  from the commit pinned as `PUBLIC_REF` in `main`'s `deploy.yml`. Changing that pin
  on `main` is how a newer customer page reaches prod.
- **Prod hosting** moved to ITM's own Cloudflare account on 2026-10-18. The same
  workflow builds once, deploys to GitHub Pages, then uploads the same `dist/` to the
  Pages project `itm-site` (direct upload, secret `CLOUDFLARE_API_TOKEN`). The zone's
  apex and `www` are proxied CNAMEs to `itm-site.pages.dev`, and a zone Redirect Rule
  sends `www` to the apex. GitHub Pages still deploys as the rollback: put back its
  A/AAAA records on the apex and `www` CNAME to `inktoner-moore.github.io`, grey
  cloud. Once that is no longer needed, drop the GitHub Pages steps and `public/CNAME`.
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

Never point the staging Pages project (`ink-toner-moore`) at `main`, and never put
prod Firebase values in any Cloudflare Pages environment. Prod secrets live only in GitHub Actions.

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

## Shop settings rule

The `settings/shop` document holds public shop facts only: phone, email, hours,
receipt address and thank-you, plus `updatedAt`. The customer page reads it.
Each Firebase project (dev and prod) needs this rule added in the console.
Without it, reads fall back to built-in values (or previously cached values)
and saves are refused.

```
match /settings/shop {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.manager == true;
}
```

## V2 staff on prod (opt-in at /v2/)

Since 2026-10-21 `main`'s deploy also builds the V2 staff app from the commit
pinned as `STAFF_V2_REF` (on `staff-v2-rollout` or later), with `--base=/v2/`, into
`dist/v2/`. Cloudflare Pages serves the nearest `404.html`, so `/v2/staff/*` opens
V2 and `/staff/*` stays V1. GitHub Pages only has the root `404.html`, so on the
rollback host `/v2/staff/*` deep links fall through to V1's not-found page.

- Each device chooses. localStorage `staff-app-version` = `v2` makes V1 send
  `/staff/...` to `/v2/staff/...` before it renders; no key or `v1` stays on V1.
- V2 (built with `VITE_V1_STAFF_URL=/staff`) shows "Use the old version" in the
  user menu, Settings and on its login page. It sets `v1` and goes to `/staff`.
- V1's "Try the new version" button only shows when the deploy sets
  `VITE_OFFER_V2: "true"`. It is `"false"` until the rules below are on prod.
- Releasing a newer V2 staff app is a PR to `main` that moves `STAFF_V2_REF`.
- The AI proxy and the manager unlock go through the same worker as staging
  (`ALLOWED_ORIGIN` lists both origins). Its service account is the DEV project's,
  so on prod the manager PIN is the staging PIN, and anything gated on a `manager`
  token claim in prod rules (like `settings/shop` writes) stays refused. A prod
  worker with the prod service account fixes both; Parsa owes that key.

Prod Firestore rules V2 needs, added in the console before `VITE_OFFER_V2` goes on
(V1 never touches these collections). Copy the DEV project's rule for any of them
that is stricter there:

```
match /employees/{id}             { allow read, write: if request.auth != null; }
match /scheduleShifts/{id}        { allow read, write: if request.auth != null; }
match /deletedScheduleShifts/{id} { allow read, write: if request.auth != null; }
match /transactions/{id}          { allow read, write: if request.auth != null; }
match /refillInventory/{id}       { allow read, write: if request.auth != null; }
match /deletedRefillInventory/{id} { allow read, write: if request.auth != null; }
match /keyBoard/{id}              { allow read, write: if request.auth != null; }
match /deletedKeyBoard/{id}       { allow read, write: if request.auth != null; }
match /keyReference/{id}          { allow read: if request.auth != null; }
```

Plus the `settings/shop` rule above. `deletedScheduleShifts` and `deletedKeyBoard`
are new archives (a removed shift or a replaced key board slot is copied there
first), so DEV needs those two rules as well, or deleting a shift and changing a
board slot are refused there.
