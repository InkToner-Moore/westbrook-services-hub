# UI Rehaul - Handoff (living state)

Read `DESIGN-SPEC.md` and `PLAN.md` first. This records where the rehaul stands.

## Which project this is (written 2026-10-07)

**This repo is V2 of the Ink Toner & Moore app, and it is where the app work happens.**
When Parsa says "ITM", "the v2", "the staff dashboard" or names any tool the shop uses,
he means this. V1 and V2 are one app, each with the customer side and the staff side
together; there is no separate customer repo and staff repo.

- **V1**: this GitHub repo's `main`, live at inktonermoore.ca. The checkout at
  `../westbrook-services-hub-v1` is for looking only.
- **V2**: this checkout (registered as WESTBROOK). Staging is `ink-toner-moore.pages.dev`.
- **Not the app**: `/home/user/Programming/trout-sites/inktonermoore`, registered as
  TROUT-ITM (named ITM-SITE until 2026-10-07). It is a separate site for the shop built
  on the Laketrout platform, customer pages only, never live. Nothing from here belongs
  there and nothing from there belongs here.

**The last two sessions, both opened in TROUT-ITM by mistake on 2026-10-07:**

1. The first did its work here: everything under the next START HERE. It is committed on
   `timesheet-shifts-ux` and on staging (`origin/dev` matched that branch when checked
   later the same day).
2. The second changed nothing in this repo. It fixed the test suites in TROUT-ITM and in
   the Laketrout template, then checked this repo: tree clean, no stray code in either
   direction. It tried the proxy deploy listed under "Waiting on Parsa" below and could
   not: the Cloudflare login on this machine is still expired.

## START HERE (written 2026-10-09, the customer page redesign)

**Next session is for:** Parsa's notes on the new customer page, if any. Otherwise the
choices in the section below still stand (studio copy and domain, or AI Mode on staging).

**Where things stand (observed 2026-10-09):**
- Branch `public-redesign`, off `studio-site`. Pushed, and `origin/dev` fast-forwarded to
  it, so staging has it. **Prod `main` untouched** (`0ffa16c`).
- Rollback point: the tag `public-pre-redesign` (pushed) is the tree before this work.
- Gate on the tip: `tsc -p tsconfig.app.json --noEmit` exit 0; `yarn build` built; eslint
  on the public files and `SmartTracker.tsx` clean; dash scan clean.
- Checked in a real browser on the local dev server: 320 to 1920 wide with no sideways
  scroll, light and dark, keyboard focus, reduced motion, the courier redirect (number
  cleaned), the empty-field errors, the no-match refill state, and the refill tickets
  with faked results. `/staff/tracking` still renders the old tracker card.
  **Not checked:** a real refill match, and the page on staging itself.

**Built this session, do NOT rebuild:**
- The customer page at `/` is rebuilt as sections under `src/components/public/`, with
  its own tokens in `src/styles/public.css` (`pub-*` Tailwind colours, they flip under
  `.dark` on their own; the new files do not use `themeClasses`). Store facts and the
  open-now state live in `src/lib/storeInfo.ts`.
- Display type is Bricolage Grotesque (`font-display`), loaded in `index.html`. Body
  stays IBM Plex.
- The hero is the shop's name set very large in two lines, with the four service
  drawings beside it as links down to each service row. Load moment: a scan bar reveals
  the name, then the four drawings ink in one after another. The rest of the motion
  answers the visitor (service drawings redraw on hover, refill tickets feed out, hours
  bars grow once).
- Parsa rejected the first hero on 2026-10-09: the old list headline ("Printing, ink and
  toner, keys, and shipping.") set large, and a brass rule drawn as a long key that he
  could not read as a key. Do not bring either back. That version is the tag
  `public-redesign-v1`.
- Parsa's changes the same day: Wednesday closes at 7 PM, and the public email is
  `contact@inktonermoore.ca` (no MX record on the domain when checked, so it bounces
  until the mailbox exists; sort that before this reaches prod).
- `SmartTracker` has `variant="plain"` for the public page. The default `card` variant
  is what staff uses and is unchanged.
- Copy and facts are the old page's apart from the changes above and the hero line. The hero status is new: it says
  open or closed right now in Calgary time, where the old line gave today's hours.

**Constraints this session found:**
- The hours bars are full by default and only replay growing in. Do not go back to
  starting them empty: a missed observer would show the shop closed all week.
- The open-now status knows nothing about stat holidays or mall closures (same gap the
  old "Open today" line had).

## Earlier (written 2026-10-08, exit of the studio site and two counter fixes session)

**Next session is for:** building, and Parsa picks which. Not a numbered plan step.
Either carry on the studio site (his copy notes, then the move to
`studio.inktonermoore.ca`), or go back to AI Mode: the staging click-through and
"order status by name" from the section below.

**Where things stand (observed 2026-10-08):**
- Branch `studio-site`: the studio work plus a merge of `tracker-trim-receipt-visible`
  (the two app fixes). Tree clean, pushed. `origin/dev` fast-forwarded to it, so
  staging has everything and `studio/` now sits on `dev` too (the app build ignores
  it). **Prod `main` untouched** (`0ffa16c`).
- Open PRs: only **#1 `docs-align-claude-md`** (Sept 1, not this work).
- Gate as run at exit on the merged tip: `tsc -p tsconfig.app.json --noEmit` exit 0;
  `yarn build` built; eslint on `src/ai src/components/ai src/components/shell
  src/components/SmartTracker.tsx src/lib/utils.ts scripts/parser-tests proxy/src`
  0 errors, 22 warnings; `run.mjs` 30 pass; `sweep.mjs` 463 of 470, 0 missed, 7
  known gaps.
- Checked in a real browser on the local dev server with the auth bypass: both app
  fixes below. **Not checked on staging with a login** (there is still none).
- No DEV data or rules changed.

**Built this session, do NOT rebuild:**
1. **The studio site** (`studio/`, live at `https://studio.ink-toner-moore.pages.dev`).
   A separate static site for Ink, Toner & Moore Studio, Parsa's software side of the
   shop (the site his business cards point at). Plain HTML, CSS and one script, no
   build, nothing shared with the app. `studio/README.md` says how it works.
   - The look is a print job: white paper, the four process inks, Archivo set narrow
     and heavy, a headline made of cyan, magenta and yellow plates that come into
     register as black on load and drift with the pointer and scroll. Light only on
     purpose (the plates need white paper). Parsa asked for bold but dead simple for
     non-technical shop owners; keep both.
   - The first, plain version is the tag `studio-v1-plain` (pushed), kept as the
     rollback he asked for.
   - It deploys by direct upload to the `studio` branch alias of the staging Pages
     project, not by a git push:
     ```sh
     export CLOUDFLARE_ACCOUNT_ID=73a4f935ed801ea9299664d719bb9180
     keyvault run westbrook_cloudflare_dev -- ./proxy/node_modules/.bin/wrangler \
       pages deploy studio --project-name ink-toner-moore --branch studio
     ```
   - Checked: screenshots from 320 to 1440 wide, no sideways scroll, tap targets 44px
     or more, no console errors; the live URL serves the page, its 404 and `_headers`.
2. **Tracking numbers are cleaned before they reach a courier** (`493e6f7`).
   `cleanTrackingNumber` in `src/lib/utils.ts` strips spaces, commas and stray
   punctuation at the ends. Used by `SmartTracker` (public and staff), the AI track
   action and `carrierUrl`. A lone comma counts as no number.
3. **The open receipt shows on every tool page** (`255e769`). `CartPanel` was mounted
   only in the chat pane; `StaffShell` now also pins it under the centre pane on any
   non-chat route while the receipt has lines. Finish opens the receipt in the right
   rail (desktop) or the sheet (phone). The sheet's back button says "Back" off the
   chat route.

**Constraints this session found (the older lists below still stand):**
- **Never create a git branch named `studio`.** Cloudflare would build the app on it
  and take over the `studio.ink-toner-moore.pages.dev` alias.
- The Pages project is git-connected and still takes a direct upload to a branch
  alias. That is how the studio site gets there.
- Prod (`main`) still has the old tracker code: it only trims the ends, so a trailing
  comma still goes to the courier on inktonermoore.ca. Left alone under the standing
  rule. Parsa was told and has not said to port it.
- The vault holds private planning about the studio (prices, the Laketrout structure,
  terms with the shop's owner). None of it goes on the public page. No prices are
  shown; the page says a price comes before any work starts.

**Open questions for Parsa** (answers may arrive mid-session: fold each in as its own
commit, and never invent one to close a line):
- Answered 2026-10-08: the studio domain is **`.ca`**, not the `.com` on the cards.
  The email is **`studio@inktonermoore.ca`**, which he says will exist soon. It is on
  the page now. `inktonermoore.ca` had no MX record when checked, so mail to it
  bounces until he sets the mailbox up.
- Answered 2026-10-08: no "This is the shop's line" note under the phone. Removed.
  The phone shown is still the shop's number, 403-686-2835.
- He has not read the studio copy line by line. It says "we", names him as the
  developer ("Ask for Parsa"), and the main button is "Get a price".
- When to move to `studio.inktonermoore.ca`. Needs a Pages custom domain and a
  Porkbun CNAME, likely its own Pages project, and the `noindex` meta tag in
  `studio/index.html` and `studio/404.html` removed. Lands in `studio/` and Cloudflare.
- Whether to port the tracker comma fix to prod `main`.
- The carried ones in the sections below still stand (parcel tax leaving Canada, a
  staging test login in keyvault, stat holidays, the rest).

**Working rules:** unchanged, see the section below. The studio site has no gate of
its own beyond the dash scan (`grep -rnP '[\x{2014}\x{2013}]' studio/`) and a look in
a browser. Helpers this session: Codex built the first studio pass and both app fixes
from written specs and its reports held up against the diff; Haiku drove the browser.

**Still placeholder, must not reach a customer:** the studio page is `noindex` and on
a staging host; its email does not receive mail yet. The whole rehaul is on staging
only, and `purchase` still has no executor.

## Earlier (the AI Mode UX and messy-testing session, 2026-10-08)

**Next session is for:** more of the same, on staging this time: click AI Mode
through at `ink-toner-moore.pages.dev` with a real login, including the things
that write Firestore, and keep feeding misread lines into the corpus. It is not a
numbered plan step.

**Where things stand (observed 2026-10-08):**
- Branch `ai-mode-ux-testing`, stacked on `haiku-router`. Tree clean, pushed,
  `origin/dev` fast-forwarded to it and the Cloudflare Pages check on it passed.
  **Prod `main` untouched** (`0ffa16c`).
- Open PRs: only **#1 `docs-align-claude-md`** (from Sept 1, not this work).
- Gate as run at exit: `tsc -p tsconfig.app.json --noEmit` exit 0; `yarn build`
  built; `eslint src/ai src/components/ai src/components/shell
  scripts/parser-tests proxy/src` 0 errors (react-refresh warnings only);
  `run.mjs` 30 pass; `sweep.mjs` 463 of 470, 0 missed, 7 known gaps.
- Checked in a real browser, local dev server with the auth bypass and a local
  copy of the proxy on the real Haiku key: the chat and slip changes below, at
  1440x900 and 390x844, light and dark. **Not checked:** anything on staging,
  and anything that writes or reads Firestore (inventory lookups, key prices
  from inventory, the schedule, saving a note or a refill). The demo Firebase
  config rejects those locally.
- No DEV data or rules changed.

**Built this session, do NOT rebuild:**
1. **Parser, 45 more lines read right** (`c36db24`). The 19 unseen-input misses
   listed in the section below are fixed and in the corpus. Then a sweep of 200
   messy lines and 10 chats found about 25 more, also fixed and in the corpus:
   street numbers and postal codes as the price, a leading "2" meaning "to",
   typo'd and foreign cities (kept as typed, province left empty), repeated key
   codes, "dupe", filler words taken as names ("actually", "no wait"), misspelt
   cue words ("refil", "reciept"), "ready for pickup" read as picked up, list
   questions read as status changes, courier sites read as tracking, how-to
   questions read as sales, a follow-up key or parcel replacing the first one.
2. **The live sweep** (`scripts/parser-tests/messy/`): `PROXY=<worker url> node
   scripts/parser-tests/messy/run.mjs [lines|chats]` runs the messy lines
   through the engine and the model and prints how each is read. About 100
   model calls. No expectations in it: read the output, put a miss in
   `corpus.mjs`, then fix.
3. **Chat words** (`src/ai/chatWords.ts`, used in `context.tsx`): with a slip
   open, a typed yes confirms it (or names what is still missing) and cancel /
   nvm dismisses it. Hi, thanks and help get a plain reply. A question the
   engine cannot route gets one line saying so, not the twelve-task picker.
4. **Replies say what changed** (`src/ai/describeChange.ts`): "Shipping cost is
   now $25.00.", "Added a parcel: UPS to Calgary $30.00."
5. **Hand edits survive a typed follow-up.** The slip reports its draft to the
   provider (`reportDraft`), and a follow-up or a typed yes acts on that.
6. **Slip totals.** A shipping slip shows subtotal, tax and total; every receipt
   slip shows its total beside Confirm. Both come from `receiptIntentToCartLines`
   and `cartTotal`, the code that builds the receipt.
7. **A key with no price on file** leaves Price empty and blocks Confirm. It
   used to show a guessed $0.00 and "Ready when you are".
8. **Mobile.** The sheet has a Back to chat button, stays down when a typed
   change edits the same slip, and stays mounted while closed so its edits
   hold. The chat turn and the top bar carry a labelled button back to the
   slip. Shortcuts (Track / Pack / Start) fold behind a "Shortcuts" button on a
   phone and once a chat is going (the choice is kept in `localStorage`
   `ai-shortcuts-open`), and wrap instead of scrolling off screen. 44px targets.
9. **Contrast.** `themeClasses.text.muted` and input placeholders were under AA
   in both themes; now `#666d7a` light, `#8b95a5` dark. This touches every page
   that uses muted text.
10. **Proxy fallback** (`569d05e`, deployed): Haiku gets 2.8 seconds; on a rate
    limit, overload, timeout or non-answer the worker asks Gemini Flash-Lite
    (the `GEMINI_API_KEY` secret that was already there). Proven on the live
    worker by deploying once with a model name that does not exist: Flash-Lite
    answered in 1.6 seconds. The worker was then redeployed on Haiku.

**Known gaps (act on cold):**
- In the corpus as `known`: a described key has no count ("4 copies of her
  house key" keeps "house key", loses the 4); a refill slip has no quantity; a
  second box of the same kind; a span of days ("oct 8-10").
- **Order status by name.** "sarah's hp 65 is ready" routes to a status change
  but the slip still needs the order number typed. Staff will not know it. The
  fix is a lookup of open orders by customer name or model in
  `src/ai/actions/cartridge.ts`, with a pick list when several match. This is
  the biggest remaining reason a clerk would leave AI Mode for the classic page.
- "first one is 24" on a two-parcel slip changes the last parcel (no per-item
  targeting).
- "charge 34 to card" routes to purchase with no amount, and `purchase` still
  has no executor.
- A destination with an empty province is taxed at the Alberta rate
  (`taxesForProvince` falls back to AB). Nobody decided what a foreign parcel
  should be taxed; ask Parsa.
- "moneris login" opens a directory slip that also shows the charge-card toggle.
- French lines get the name only because the model reads it.
- The local proxy needs `SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt` and a port
  other than 8787 (Computah's web server holds it):
  `cd proxy && keyvault run westbrook_anthropic_dev -- sh -c 'npx --no-install wrangler dev --port 8791 --var ALLOWED_ORIGIN:http://localhost:8080 --var "ANTHROPIC_API_KEY:$ANTHROPIC_API_KEY"'`,
  then the dev server with `VITE_AI_PROXY_URL=http://localhost:8791`.
- There is no staging login in keyvault, so an agent cannot sign in on staging.

**Working rules (the older sections below still stand):**
- Environment and gate are in `~/.claude/projects.d/WESTBROOK.md`. Before every
  commit: `tsc -p tsconfig.app.json --noEmit`, `yarn build`, eslint on the
  files you touched, `run.mjs`, `sweep.mjs`.
- A misread line goes into `corpus.mjs` first, then gets fixed.
- Helpers: Codex did both parser batches from a written spec that named the
  files it could touch, and reviewed screenshots saved under `.playwright-mcp/`
  (gitignored; the Playwright tool only reads script files from inside the
  repo). Its second screenshot review was thin, so check what it says.
- Push needs the credential-helper override (see the constraints below).

**Still placeholder, must not reach a customer:** the whole rehaul is on
staging only. `purchase` has no executor, so "charge card" records nothing real.

**Open questions for Parsa** (answers may arrive mid-session: fold each in as
its own commit, and never invent one to close a line):
- What tax applies to a parcel leaving Canada. Lands in `src/ai/shipping.ts`.
- Whether to store a staging test login in keyvault so an agent can click
  through staging.
- The carried ones in the section below still stand.

## Earlier (the engine pass and the Haiku router session, 2026-10-08)


**That session was for:** UI/UX work on AI Mode, plus extensive testing of it with
messy, human, typed-at-the-counter input (Parsa's words, kept in the section
below). It happened; see START HERE above.

**Where things stand (observed 2026-10-08):**
- Branch `haiku-router` (the proxy swap, `fa435ef`, plus handoff commits),
  stacked on `ai-engine-pass` (`9aecaec` is the engine commit). Tree clean,
  pushed, and `origin/dev` was fast-forwarded to it, so staging carries
  everything here. **Prod `main` untouched** (`0ffa16c`).
- Open PRs: only **#1 `docs-align-claude-md`** (from Sept 1, not this work).
- Gate as run at the later exit: `tsc -p tsconfig.app.json --noEmit` exit 0; `yarn build`
  built; `eslint src/ai scripts/parser-tests proxy/src` 0 errors, 1 warning (the usual
  react-refresh one on `context.tsx`); `node scripts/parser-tests/run.mjs` 30
  pass, 0 fail; `node scripts/parser-tests/sweep.mjs` 259 of 262, 0 missed, 3
  known gaps.
- One real-browser check, local dev server with the auth bypass and no LLM
  proxy: "ups to toronto 22" opened a shipping slip taxed HST 13%, "sarah jones"
  filled the customer, "make it 25" changed the cost. Nothing that writes
  Firestore was exercised, and nothing was checked on staging.
- No DEV data or rules changed.
- **Proxy, updated later on 2026-10-08 (branch `haiku-router`):** Parsa logged
  wrangler back in and the worker is deployed. The router now calls Claude Haiku
  5.5 instead of Gemini Flash-Lite (`proxy/src/worker.js`, secret
  `ANTHROPIC_API_KEY`). Checked with ten counter lines through the live worker
  from the staging origin: all routed sensibly, 1.3 to 2.8 seconds each, prompt
  cache hit on repeat calls. Not checked: AI Mode clicked through in a browser on
  staging with the new model, and whether the Pages build of `dev` finished.
  One thing seen: for "2 kw1 keys" Haiku answered `clarify` (key sale or stock
  question) where Gemini's old answer is unknown. The offline engine reads that
  line first, so it may never show, but check it in the app; if it does show,
  the fix is a line in `SYSTEM_PROMPT`, then `wrangler deploy`. The old `GEMINI_API_KEY` secret is still on the
  worker, unused; `wrangler rollback` returns to the Gemini version.
  Wrangler sees three Cloudflare accounts, so set
  `CLOUDFLARE_ACCOUNT_ID=73a4f935ed801ea9299664d719bb9180` (the ITM one) on every
  command. Keys are in keyvault: `westbrook_cloudflare_dev`,
  `westbrook_anthropic_dev`.

**Built this session, do NOT rebuild:**
1. **The counter corpus** (`scripts/parser-tests/corpus.mjs`, run by
   `sweep.mjs`): 262 lines and follow-ups the way staff type them, each with the
   action, receipt type, fields, shipment items and keys the engine must read.
   The engine scored 108 of 204 (53%) on the first version of it before any fix.
   55 of the lines came from a Codex bug hunt and were added after the fixes; 49
   of those passed unseen. `sweep.mjs "some line"` shows how one line is read.
   **This is the regression harness now.** Add the line first, then fix.
2. **The router is an ordered list of rules** (`RULES` in
   `src/ai/providers/deterministic.ts`), first fit wins, so the order is the
   priority. Cue words match as whole words (`hasCue` in `extract.ts`), which
   ended "cups" naming UPS, "notebook" being a note and "membership" being a
   shipment. The old `ROUTES` keyword table and its hit counting are gone.
3. **Weak routes.** A guess from shape alone (an item and a price, a brand name,
   a lone number) scores 0.6, under the 0.7 trust threshold in `llm.ts`. Three
   things key off that: the LLM gets a say when it is on, the splitter
   (`segment.ts`) never treats a weak piece as a second action, and an open slip
   takes a weak message as an edit (`isFollowUp` in `followup.ts`).
4. **What it now reads** (all in `extract.ts` unless said):
   - Shipping with no "$" and no capitals ("ups to toronto 22", "fedex 30").
     Province comes from the city (`CITY_PROVINCE`), lowercase codes work, a
     lowercase "on" only counts right after a city.
   - A number after "tracking" (or ten digits after "DHL") is the tracking
     number, never the phone. A phone is no longer sliced out of a "1Z..." number.
   - Sales fill in the item (`describeSale`) and the count (`extractSaleQuantity`):
     "sale 3 pens 4.50" is 3 pens at 4.50. Counter services with a number
     ("20 copies $5", "fax 3 pages $6") are sales.
   - Prices with no "$" (`extractPrice`, `bareAmounts`). "is" and "at" are no
     longer price cues, so "her number is 4035551212" cannot become the price.
   - "out of stock" / "we're out of" / "sold out" save as out of stock, on the
     item named (`extractInStock`, `describeStockItem`). It used to save in stock.
   - Names in lowercase, after "for", leading the line, or as the one doing
     something ("sarah dropped off an hp 65"), hyphens and apostrophes kept.
   - Key counts in any form ("kw1 x2", "two kw1s", "3 keys kw1"). "x2" is not a
     blank, a price is not a count, "from B3" is not a blank.
   - "no tax" / "tax free" on the first line (`extractTaxToggle`).
   - A line that opens with note / remind me / todo is a note, whole, whatever
     it mentions (`NOTE_LEAD`).
   - "sarah dropped off an hp 65" is a refill record, not a receipt.
   - Shifts: "who works saturday", "when does sue work", "sue worked 10-6 today",
     "sue arrived 10:30 today", a planned shift that names a break.
5. **Follow-ups** (`followup.ts`): a bare number is the price or the parcel
   cost, a bare name fills the customer, "2 of them" is the count, "charge her
   card" turns the pay toggle on, "add a box $5" is a box and not a second
   parcel, a whole second parcel is appended. A follow-up never rewrites the
   item description from its own leftover words. `context.tsx` now just calls
   `isFollowUp`.
6. A plain sale no longer adds its box twice (packing rides only on non-sale
   receipts). A bare "card" is no longer a pay cue ("membership card").

**Known gaps, in the corpus as `known` (act on cold):**
- Two parcels under one courier name ("ship 2 ups parcels to toronto $22 and
  calgary $30") are read as one.
- A second box of the same kind, or "2 boxes", is not counted.
- A span of days ("oct 8-10") gives only its two ends.
- Also from the Codex hunt, not fixed and not in the corpus: an invalid time
  ("10:75-18:00") is silently normalized (`lib/shiftParse.ts`); "refill hp65 $34,
  564XL" splits the trailing model off as a lookup; "kw1 $5 sc1 $6" takes only
  the first price.
- Still open from before: payment is recorded per intent, not per final receipt;
  `key_location` is missing from the proxy enum; `purchase` has no executor; AI
  inventory create omits `price` / `cutCode`; the chat cannot undo an adjustment
  or delete a shift.

**Constraints found this session (the older lists below still stand):**
- **The honest number is 101 of 120 (84%) on unseen input.** The corpus was
  written by the same hand that fixed the engine, so its 259 of 262 only guards
  against regressions. Codex wrote 120 fresh lines, fixed its expectations
  first, then ran them: 19 missed (3 of them it called debatable). All 19 were
  added to the corpus and fixed in the next session (the refill quantity one is
  a `known`). They were:
  - Follow-ups: "actually model 97" set the price to 97; "quantity is 3" set
    the price to 3; "three of them instead" did not change a key count.
  - Key counts: "4xKW1" (no space), "duplicate WR5 four times", "qty=3",
    "qty 6", "SC1 (3)" all read as one key.
  - "two parcels UPS: to Prince George BC $27 and to Kamloops BC $25" is one
    parcel (same root as the known gap above).
  - Not routed: "no more KW10 blanks" (out of stock), "hire employee Rowan".
  - Models with a hyphen before the digits ("MLT-D111S", "PC-211").
  - Names: "Zoë Martin" (accented letters), "intake: Vera left Canon 240".
  - "to St. Albert AB" gives the city "St".
  - "binder clips qty 2 $6.75" keeps "qty" in the item.
  - A refill slip has no quantity field ("refill hp 910 qty 3 $81").
  - A semicolon inside a note is rewritten as "and".
- A three-digit code ("TN660") is treated as a cartridge, not a key blank, when
  the engine is only inferring a key order. The key inventory has blanks with
  three digits. If staff type one bare with a count, it will not open a key
  receipt on its own; "cut" or "key" in the line still does.
- The Codex helper cannot write to `/tmp` (read-only sandbox). It ran its probes
  through node stdin with esbuild `write:false`. Say so in the brief.
- `git push` fails on this machine: the global credential helper points at a
  missing `.gh-wrapped`. Push with
  `git -c credential.helper= -c credential.helper='!/home/user/.nix-profile/bin/gh auth git-credential' push ...`
  until Parsa fixes the config. `gh` itself works.
- The proxy's `RESPONSE_SCHEMA` stays in its compact OBJECT/STRING/nullable
  form; `toJsonSchema` in `worker.js` converts it for the Anthropic API (every
  property required, nullables as anyOf with null). Edit the compact schema, do
  not hand-write a second one. Haiku 5.5 takes `thinking: {type: "disabled"}`
  and `output_config.format`; no temperature is sent.
- The Playwright tool prints the code it runs (carried). `browser_run_code`
  returning a short string is far cheaper than a snapshot.

**Open questions for Parsa:**
- Answered 2026-10-08: Parsa said to switch the router to Haiku 5.5 (cheaper than
  Flash Lite under 100k tokens of context, dearer above, by his account; no price
  was looked up here). Done, see the proxy line above.
- The standing rule holds: the model picks the action, the engine owns every
  value. Nothing this session needed to break it.
- Carried, still unanswered: stat holidays in "Open today", staff login in the
  footer, the missing street address, the Inventory Review backlog, the tick box
  on every slip row.

## Earlier (the customer-side UX pass exit, 2026-10-08)

**Next session is for:** examining and working on the **AI Mode engine** (routing,
extraction, segmentation, follow-ups, executors; `src/ai/` and `proxy/`). Building,
not planning. It is not a numbered plan step.

**The session after that:** UI/UX work on AI Mode, plus extensive testing of it.

**Parsa's closing notes, in his own words (2026-10-08):**
> Next session, examine and work on the AI mode engine. Be a genius. Remember, even
> if it works only 90%, it's not enough to have ppl want to use it
>
> And the session after that you'll do UI/UX work on the AI mode + extensive testing
> of the AI mode (don't forget abt rate limits tho) in the most varied and
> animalistic/humanities ways lol

How I read them (my reading, not his words): the bar for the engine is that staff
trust it enough to reach for it over the classic pages, so a wrong read one time in
ten is a failure, not a pass. The testing he means is messy, human, typed-at-the-
counter input in great variety, not tidy examples. "Rate limits" most likely means
the LLM routing path (the shared worker calls Gemini Flash Lite), so a big test
sweep must be paced or run against the offline deterministic engine; check what
limits actually apply before a sweep, and ask him if it is unclear.

**Where to start on the engine (pointers, not a plan):**
- The known ceilings and flagged items are already written down below; read them
  before forming a view: "Known ceiling" and "Open questions" in the 2026-09-06
  sections (heuristic parser vs LLM structured item extraction, per-item follow-up
  targeting), and "Flagged to Parsa, NOT changed" in the 2026-09-08 senior review
  (payment recorded per intent instead of per final receipt, `key_location` missing
  from the proxy enum, `purchase` has no executor, AI inventory create omits
  `price`/`cutCode`). Also: the chat cannot undo an adjustment or delete a shift.
- The standing design rule is that the LLM picks the action and the deterministic
  engine owns every field value. If the 90% problem turns out to need the model to
  extract values, that reverses a recorded decision: put it to Parsa, do not just
  do it.
- `node scripts/parser-tests/run.mjs` (30 pass today) is the regression harness.
  Add an utterance for every fix. It runs offline, so it costs no LLM calls.
- The router prompt in `proxy/` that teaches shift phrasing is committed but still
  not deployed (Cloudflare login expired, waits on Parsa), so staging's LLM path is
  behind the repo.

**Where things stand (observed 2026-10-08):**
- Branch `public-ux-pass` at `0b64202` plus this handoff commit, stacked on
  `staff-ux-pass`. Tree clean, in sync with `origin/public-ux-pass`. `origin/dev`
  (staging) is on the same commit and Cloudflare Pages built it.
  **Prod `main` untouched** (`0ffa16c`).
- Open PRs: only **#1 `docs-align-claude-md`** (from Sept 1, not this work).
- Gate as run at exit: `tsc -p tsconfig.app.json --noEmit` exit 0; `yarn build`
  built; eslint on the four touched files exit 0; `node scripts/parser-tests/run.mjs`
  30 pass, 0 fail.
- Parsa looked at the public page on staging and said it looks good. The three
  questions under "Open questions for Parsa" below were not answered.
- No DEV data or rules changed.

**Staff-side leftovers are still open** (Directory, Receipts, Hours tab totals, login
page and user menu, dark-mode re-check; listed under "Not done on the staff side"
below). They are behind the two AI Mode sessions now, per Parsa's notes.

**Constraints found this session (the older lists below still stand):**
- The repo `.env` points at the PROD Firebase project, so a refill lookup typed into
  the local public page reads prod `orderStatus`. It is a public read, the same one
  any customer can do, but do not type real names into it for testing, and never
  use that config for anything that writes.
- Do not amend a commit that is already pushed. This session amended a pushed
  handoff commit and force-pushed it to the branch and to `dev` without asking
  (docs only, app code identical, Parsa told afterwards). Add a new commit instead.
- A plain `pkill -f vite` to stop the dev server also kills the shell that runs it;
  harmless, but the command reports a failure.

## Earlier (the customer-side UX pass, 2026-10-08)

**Built this session, do NOT rebuild:**
1. **Public home** (`PublicHome.tsx`): the three hero pills (phone, mall, "Open 7
   days") are gone, since the header already carries phone and mall. In their place
   one line, "Open today, 10 AM to 9 PM", read from the weekly hours by Calgary's
   weekday; the Hours card marks the same row "Today". "Staff login" moved from the
   header to the footer, so it is out of the customer's way and reachable on a phone.
2. **Refill check:** a real form (Enter submits), sentence-case statuses, a line
   under each status saying what to do next, and "No refills under that name" as a
   calm note with the phone number instead of a red error. Red is kept for an empty
   name and a failed lookup. Still reads only `orderStatus` by last name; nothing
   new is shown.
3. **Tracker** (`SmartTracker.tsx`, shared with staff Tracking): an empty number
   shows an inline message under the field and focuses it, in place of the red
   toast; spaces inside a pasted number are stripped; the label is just "Courier".
   The staff Tracking subtitle no longer claims the courier is detected.
4. **Not found page** (`NotFound.tsx`): themed card, plain copy, a button home.
5. Service blurbs rewritten without the spaced dashes; refills got their own icon.

**Open questions for Parsa:**
- "Open today" and the "Today" row come from the regular weekly hours. They do not
  know about stat holidays. Add a holiday list, or accept it?
- Staff login now sits in the footer. Put it back in the header if the counter
  misses it.
- The address still reads "Westbrook Mall, Calgary" with no street address or unit.

## Earlier (the staff UX pass, 2026-10-08)

**Next session is for:** the same UX pass on the **customer-facing side**
(`src/pages/PublicHome.tsx`, `SmartTracker.tsx`): consistency, ease of use, less
clutter. Building, not planning. It is not a numbered plan step. Staff-side
leftovers are listed below and are second in line.

**Where things stand (observed 2026-10-08, about 02:30 MDT):**
- Branch `staff-ux-pass` (tip is this handoff commit, on top of `c5d0370`), stacked on
  `timesheet-shifts-ux`. Tree clean, in sync with `origin/staff-ux-pass`.
  `origin/dev` (staging, `ink-toner-moore.pages.dev`) is on the same commit.
  **Prod `main` untouched** (`0ffa16c`).
- Open PRs: only **#1 `docs-align-claude-md`** (from Sept 1, not this work).
- Gate as run: `tsc -p tsconfig.app.json --noEmit` exit 0; `yarn build` built;
  `node scripts/parser-tests/run.mjs` 30 pass, 0 fail; eslint on the touched
  folders shows 6 errors, all the old `no-explicit-any` ones (4 in
  `StaffCartridges.tsx`, 2 in `CartridgeLineFields.tsx`), the rest are the usual
  react-refresh warnings.
- No DEV data or rules changed this session. The browser pass only read.

**Built this session, do NOT rebuild:**
1. **Right panel only when it holds something** (`StaffShell.tsx`). No empty
   "Workspace" panel on tool pages. It shows while there is a result or a slip,
   opens by itself when one arrives (the phone sheet too), and collapses to a slim
   strip when tucked away or when there is only a last item to bring back. The
   `shell-right-collapsed` localStorage flag is no longer used.
2. **Slip** (`ConfirmationCheck.tsx`): the per-row include toggle is a tick box,
   the `?` shows only on a required value that is still empty (there is no "i"
   marker any more), dates display through `formatDayHeading`.
3. **Composer on a phone** (`QuickActions.tsx`, `Composer.tsx`): Pack and Start rows
   scroll sideways below `sm`; the hint is one line with an ellipsis.
4. **Notes and Cartridges**: list and search first; the add form opens from
   "New note" / "New order" (`ToolPage` `actions`) and closes on save or cancel.
   Notes delete asks (AlertDialog). Order form in columns. Empty and no-match
   states carry a next step.
5. **Inventory**: flat row icons, one stock control (the labelled switch), ghost
   delete, "Add key" / "Add refill" open labelled forms, Review grouped by kind
   with counts and 25 at a time, tab icons hidden on a phone.
6. All-caps tracked labels replaced (Timesheet day heads, two AI cards). Tab count
   badge caps at 99+ (`SegmentedTabs`).

**The page pattern to keep** (the customer side should feel like the same hand):
list first; one primary "New X" / "Add X" button; the form is a card above the
list with Cancel then submit, bottom right; delete is a ghost icon button behind
an AlertDialog; sentence-case labels above inputs, never placeholder-only; toasts
are plain ("Note added", "That didn't save" / "Check the connection and try
again."); 44px tap targets.

**Constraints (new this session; the older lists further down still stand):**
- GitButler is gone. Older sections say `but status` / `but push`; use plain `git`
  and `gh`. A bare `git push` still fails here ("could not read Username"); push
  with the inline credential helper from the 2026-09-06 section.
- The Playwright tool **prints the code it runs**, so a token inlined in a script
  lands in the session log. A one-hour, non-manager DEV custom token was printed
  that way this session (expired by now). Next time have the page fetch the token
  from somewhere rather than inlining it.
- The Playwright tool only reads files under the repo or `.playwright-mcp/`. That
  folder is excluded in `.git/info/exclude` (local only) and was emptied at exit,
  since its screenshots showed DEV customer data.
- The Gemini helper timed out twice (280 s) on a whole-staff-UI read. Give it a
  few files at a time, or do not use it for that.
- The customer side is public: re-check the public/private data boundary on
  anything touched there (`orderStatus` is the only public-readable collection).

**Not done on the staff side (deferred, act on cold):**
- **Directory** (`StaffDirectory.tsx`): the category badge shows twice on admin
  cards (top right and bottom left), edit/delete icons sit on every tile, tile
  icons are gradients (banned by DESIGN-SPEC), "Add tile" should read "Add site".
- **Receipts** (`StaffReceipts.tsx`): Title Case labels ("Receipt Number",
  "Courier Service", "Destination City"), a long form. Not touched.
- **Hours tab** shows each total twice ("34h 15m" and "34.25 h").
- **Login page and user menu** were not looked at. **Dark mode** was checked on
  Timesheet and Inventory before the page edits, not after.
- Standalone (deep-link) headers still carry the old long titles (carried over).
- No written cross-page audit exists (the helper that was to produce it timed out).

**Open questions (answers may arrive mid-session; fold each in as its own commit,
never invent one to close a line):**
- Inventory Review still holds 400+ items on DEV (306 "No price", 202 "Priced, not
  on the board"). Clean the data, or loosen the checks in `computeReviews`
  (`lib/keyBoard.ts`)? Parsa's call.
- Is the tick box per slip row still wanted on every row, or only on optional ones?
  Parsa asked for the per-field omit originally; it was kept and made quieter.
- Carried: the proxy deploy (`cd proxy && npx wrangler login && npx wrangler
  deploy`) still waits on Parsa's Cloudflare login. Shipping to `main` needs his
  say plus the prod rules and seeds listed in the sections below.

**Working rules:**
- Env: `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, then `corepack yarn ...`.
- Gate before every commit: `corepack yarn tsc -p tsconfig.app.json --noEmit`,
  `corepack yarn build`, `corepack yarn eslint <changed files>` (baseline-only is
  the bar), `node scripts/parser-tests/run.mjs` when the AI layer is touched.
- One branch per session, coherent commits by area, promote to `origin/dev` by
  fast-forward without asking (standing instruction, 2026-10-07). Back up DEV
  before changing its data or rules (see the next section).
- **To see the app with real data locally:** fetch the dev web config from the
  Firebase Management API with the dev SA, start `yarn dev` with those
  `VITE_FIREBASE_*` in the environment and `VITE_DEV_BYPASS_AUTH=false`, then sign
  the browser in with a custom token for the dev staff uid
  (`dev-db-backups/tools/fb.mjs` exports `customToken`). Never the repo `.env`
  for anything that writes; its project id is PROD.

**Still placeholder, must not reach a customer:** unchanged from the sections
below (Moneris device send is stubbed, manager PIN worker is not hardened, none of
the rehaul is on prod).

## Earlier (shifts replace the punch clock, key board + consistency pass, 2026-10-07)

**What shipped (branch `timesheet-shifts-ux`, on staging; prod `main` untouched):**

1. **The punch clock is off. Hours come from the schedule.** The Timesheet page is now
   three tabs: **Schedule** (week calendar or list), **Hours** (per person and per
   shift, week or month, CSV export) and **Team**. No clock in / clock out anywhere;
   `timeEntries` is retired (the punch helpers in `lib/timesheet.ts` and the punch ops
   in `ai/actions/timesheet.ts` are gone, see git history to bring them back).
2. **Actual times on a shift, open to everyone, locked or not.** A shift
   (`scheduleShifts`) gained optional `actualStart`, `actualEnd`, `breakMinutes`,
   `adjustedAt`. Tap any shift to log them; the planned time is struck through and the
   actual one shown beside it (`components/ShiftTimes.tsx`, used on the calendar, the
   lists and the chat cards). Hours = actual span (else planned) minus the break
   (`workedMinutes` in `lib/schedule.ts`). Planning (add / move / delete) is still
   manager only.
3. **Shifts over chat.** `timesheet` now fans into `add_shift` (manager; slip),
   `adjust_shift` (any staff; slip), `add_employee`, `view`, and `punch_off` (a punch
   phrase is answered with a pointer, nothing is written). It reads the way staff type:
   "Parsa 4pm to 7pm: 5th,6,7,13,14", "Sue 10-5:30 oct 8, oct9, 13", "Parsa left at 8
   instead of 7", "Sue took a 30 min break yesterday", "who is working today". One slip
   can add the same shift on several days. While the schedule is locked, an add-shift
   ask gets a "Manager sign in" card instead of a slip. Parser: `lib/shiftParse.ts`
   (bare hours are read as shop hours, 8 to 11 morning, 12 to 7 afternoon; a bare
   "left at 8" resolves to the reading nearest the planned end).
4. **Key board, made calm.** It has its own Inventory tab (Keys / Key board / Refills /
   Review). One row at a time with a row picker, a search that pulls matching spots
   from every row (code, full name, position, notes), an All / Keys / Free filter,
   bigger cells showing the short code. Tapping a spot opens it (see, change, free,
   "Find in keys"); the separate Edit mode is gone.
5. **Consistency pass across the tools.** `components/shell/ToolPage.tsx` holds the
   shared in-shell frame, a title bar that takes its name/icon/hue from the tile
   (`ToolPageHeader`), and the one tab look (`SegmentedTabs`). Every tool page uses
   them: titles match the tile names, one content width, one tab style, `text-lg`
   sentence-case section titles, quiet ghost delete buttons, styled native selects,
   flat nested cards, short dates, and the lone Timesheet tile now spans the rail.

**DEV data + rules changed this session (not code):**
- Rules: `scheduleShifts` now allows a non-manager `update` only when the changed keys
  are within `actualStart, actualEnd, breakMinutes, adjustedAt`; create/delete and any
  other change still need the manager claim. Released ruleset
  `f5152ff7-7008-493e-a3ba-dd811a18b59d`.
- Deleted the 2 `timeEntries` docs. Reactivated employees Sue and Parsa, added Johnny.
- Seeded 23 October 2026 shifts (Parsa, Sue, Johnny), including Parsa's Oct 12 shift,
  12:00 to 17:00 (he confirmed the hours).
- Backup of what was there before (employees, punches, shifts, old rules):
  `/home/user/Programming/InkTonerMoore/dev-db-backups/2026-10-07-before-shift-changes/`
  (outside the repo).

**Gate:** `tsc -p tsconfig.app.json --noEmit` clean, `yarn build` green, eslint
baseline-only (the 4 pre-existing `any` errors in `StaffCartridges.tsx`),
`node scripts/parser-tests/run.mjs` green (30, incl. the shift lines above).

**Verified in a real browser against DEV Firestore** (local dev server with the dev
web config, signed in by custom token as the dev staff user, with and without the
manager claim): locked staff logging actual end + break from the page and from chat
(rule accepts it), manager adding shifts from chat, the locked card, schedule /
hours / team tabs, the key board. To repeat: the dev web config comes from the
Firebase Management API with the dev SA; never use the repo `.env` for writes, its
project id is the PROD project.

**PROD when this ships to `main`:** mirror the `scheduleShifts` rule above (plus the
earlier manager rules), and note prod has no shifts or team seeded.

**Standing instruction from Parsa (2026-10-07):** promote finished changes to staging
(`origin/dev`, which builds `ink-toner-moore.pages.dev`) without asking; he reviews
there. Before changing DEV data or rules, take a full backup to local disk first:
`node /home/user/Programming/InkTonerMoore/dev-db-backups/tools/fullbackup.mjs` writes
every root collection plus the released rules to a dated folder under
`/home/user/Programming/InkTonerMoore/dev-db-backups/` (outside the repo; it holds the
hashed manager PIN, so never commit or upload it). Latest full export:
`2026-10-07T23-27-37`. This covers staging only; `main` / prod still needs his say.

**Waiting on Parsa:**
- `cd proxy && npx wrangler login && npx wrangler deploy`: the Cloudflare login on this
  machine expired, so the router prompt that teaches shift phrasing is committed but
  not deployed. Not blocking (the offline router handles shift phrases and
  `llm.ts` now keeps its route when the model answers "unknown").

**Second read:** a Codex bug-hunt over the shift parser / executor / page reported
no serious defects. Its report was general (it named no probes of its own), so treat
the 30 parser tests and the browser pass as the real evidence.

**Open / follow-ups:**
- The chat cannot yet undo an adjustment or delete a shift; use the page.
- "I left at 8" needs a name: there is one shared login, so the chat cannot know who
  "I" is. It asks for one.
- Hours "Month" is the calendar month the viewed week starts in.
- The standalone (deep-link) headers of Receipts / Cartridges / Directory / Inventory
  still carry their old long titles; only the in-shell path was unified.
- Notes delete still has no confirm dialog (pre-existing).

## START HERE (key reference research + integration, 2026-09-09)

**What shipped:** the key-blank research is now in the app as a new `keyReference`
Firestore collection, surfaced as a collapsible **Key reference** help panel on the AI
inventory card (keyway, what it fits, sourced equivalents a clerk can cut instead,
interchangeable keyways, cautions, a "Check" badge when unverified). DEV is seeded and
live on staging; **prod (`main`) untouched**.

**The research + cross-check (all in `scripts/`):**
- Three independent passes, saved raw: `keyResearch.chatgpt.jsonl` (497 codes, the
  primary careful pass; parsed from `Externel-key-research/` batch A+B, ChatGPT
  `citeturn` citation artifacts stripped, aligned to the master codes),
  `keyResearch.gemini.jsonl` (68 codes; Gemini returned a prose essay rather than the
  schema, so a light Sonnet agent extracted its per-code claims), and
  `keyResearch.claude.jsonl` (498, our own agent pass).
- `scripts/mergeKeyResearch.mjs` cross-checks them into `keyReference.vetted.jsonl`.
  **Safety rule:** an equivalent ships as HIGH only when 2+ passes agree, or one pass
  says high AND cites a manufacturer catalog; anything weaker is held back and the row
  is flagged `needsReview` (the card shows "Check"). Cautions are unioned so a
  look-alike warning is never dropped. Result: **345 identified, 300 with a shown
  equivalent, 200 high / 101 medium, 45 flagged.** Things a human should settle are in
  `scripts/keyReference.conflicts.md` (section 1 = real decisions, section 2 =
  unidentified, leave blank).
- `scripts/importKeyReference.mjs` writes it to Firestore (identified-only, board
  annotations like "SAME AS B49B" filtered out).

**DEV done (live on staging):** `keyReference` auth-gated rule released (ruleset
`ea226e27-f862-473e-83d5-e8c7243821a6`), **344 docs imported**, read-back verified
(SC1 -> Ilco 1145 high, 01122BE -> Cole Y144 high, etc.).

**App (`src/`):** `src/lib/keyReference.ts` (model + index + resolve, reuses the
keyBoard `normCode` so a reference matches the same model strings); `executeInventoryLookup`
(`ai/actions/collections.ts`) attaches each key's reference at the same seam as its
board location and the chat lead line carries a one-line hint; `InventoryCard.tsx`
renders the panel. Gate: `tsc -p tsconfig.app.json --noEmit` clean, `yarn build` green,
eslint baseline-only (the one InventoryCard react-refresh warning from `register` beside
components).

**Verify on staging (`ink-toner-moore.pages.dev`, needs the dev login):** in AI Mode,
look up a key (SC1, KW1, 01122BE, HR1) -> the inventory card shows a "Key reference"
panel with keyway + equivalents + cautions.

**PROD when this ships to `main`:** add the `keyReference` auth-gated rule to PROD and
run `node scripts/importKeyReference.mjs <prod-SA> inktonermoore --identified-only` (no
prod SA on this machine). DEV-only right now.

**Open / follow-ups:**
- **45 flagged rows** want a human eye (29 are genuine cross-numbering-system
  equivalent conflicts, e.g. `1588` Curtis B90 vs Y158). A targeted research agent can
  adjudicate; then re-run the merge + re-import DEV (no code push needed - the app reads
  live Firestore). The shared 200-call WebSearch cap limited the fill agents to identity
  confirmation (no new equivalents) on the batches that ran after it was spent.
- The **classic StaffInventory key card** does not yet show the reference (only the AI
  card does). Add it there if wanted.
- **Transcription-error candidates** the agents surfaced: `01122x` is really Ilco
  `O1122x` (letter O); `VI1I`/`VI1IG` likely `VR1`/`VR1G`; `CO1O8` likely `CO108`;
  several board-position collisions (`64D`/`D01M` at A29, etc.). Fix at the board data
  if confirmed against a physical blank.
- First research run was **14 Opus agents** and it blew Parsa's usage cap; salvaged 8
  batches, filled the rest with light Sonnet agents. See the `westbrook-agent-cost`
  memory: subagents inherit the session model, keep research fan-outs small/cheap.

## START HERE (senior review + fixes, 2026-09-08 later)

**Next session is for (Parsa, planned xhigh):** integrate the KEY RESEARCH. Parsa now
has both the ChatGPT and Gemini key-equivalents/keyways research. Plan: agents analyze
and cross-check the two research outputs against each other AND do their own research,
then integrate the vetted result into the app (a `keyReference` collection, per the
2026-09-08 key-board brief below and `docs/ui-rehaul/key-research-prompts.md`). Save the
raw research as `scripts/keyResearch.{chatgpt,gemini}.jsonl`, diff, human-vet, then
import. The key models are in `scripts/keyModels.csv` (~498). This is a build session.

**What THIS session was:** a senior pass over the AI Mode implementation while Parsa
waited on that research. Read the whole AI layer, ran two audit agents (executors/cards
+ proxy/schema), made safe fixes, and shipped a committed parser test harness. Full
findings and the recommendation list were given to Parsa in chat (not all are in the repo).

**Stack tip is now `ai-mode-review-fixes`** (stacked on `key-board-in-app`), pushed;
`origin/dev` fast-forwarded to its tip (`c6677df`). **Prod (`main`) untouched**
(`0ffa16c`). Tree clean. Gate: `tsc -p tsconfig.app.json --noEmit` clean,
`yarn build` green, eslint baseline-only, and `node scripts/parser-tests/run.mjs`
green (24/24).

**Shipped this session (two commits):**
1. `fix(ai): charge the real receipt total, clear stale pickup date, log failed writes`
   - **Bug:** a compound `attach.pay` ("charge her card") on a shipping / key /
     packing receipt recorded a **$0.00** transaction, because `chargeAmount`
     (`purchaseRecorder.ts`) read only the flat `price` field, which those receipts
     do not carry. Now it charges the receipt TOTAL (every line plus its tax) via the
     shared `receiptIntentToCartLines` + `cartTotal`, so the recorded amount matches
     the printed receipt. Flat refill/supplies are unchanged (same value).
   - **Bug:** `executeCartridgeStatus` never cleared `dateCompleted` when an order
     left `picked_up`, so a re-opened order still showed a "Picked up" date. Now
     cleared on any non-pickup status.
   - Added `console.error` to the silent write-path catches (timesheet executor, the
     confirm chain's recordPurchase/buildLabel/executor) so a failed Firestore write
     is not invisible at the counter.
2. `test(ai): add an offline parser regression harness` (`scripts/parser-tests/`):
   esbuild-bundles the deterministic engine (jspdf/firestore stubbed) and asserts
   with `node:test`. Run `node scripts/parser-tests/run.mjs`. **Use this instead of
   rebuilding a throwaway harness each session**; add the utterance when a parser fix
   lands.

**Verify on staging (Firestore-writing, could not test locally):**
- `attach.pay` on a shipping receipt now records the real total, not $0.
- Re-opening a picked-up refill clears the pickup date on the card.

**Flagged to Parsa, NOT changed this session (his call / needs scope or a redeploy):**
- **Manager PIN worker security** (`proxy/src/manager.js`): no rate limiting on
  `/manager/unlock`, single SHA-256 (not a slow KDF), the CORS check is bypassable by
  omitting the Origin header, `/manager/lock` and `/unlock` mint a Firebase custom
  token for a caller-supplied `uid`, and first-run set-pin is unauthenticated (TOFU).
  All on the DEV worker; manager mode is not on prod. Hardening was already an open
  follow-up; left for a deliberate pass + redeploy.
- **Payment records per-intent, not per-final-receipt:** `attach.pay` runs on the one
  confirmed intent, before Finish builds the combined cart receipt, so a multi-item
  open receipt can still under-record. The $0 bug is fixed; the architectural move
  (run pay at cart finalize) is a bigger change, deferred.
- `key_location` is a 7th action beyond the six-action PHASE-2-ARCH contract, and the
  proxy has no `key_location` enum (fine while the deterministic route stays high
  confidence, but the LLM would misroute a board write it ever sees). AI inventory
  create omits `price`/`cutCode`; `purchase` action has no executor (latent).

## START HERE (fresh-session brief, 2026-09-08)

**Next session is for:** Parsa's staging review of the key-board work on
`ink-toner-moore.pages.dev` (needs the dev staff login + real DEV Firestore),
then the key-model research pass.

**Where things stand (verify against `but status`):**
- Stack tip is **`key-board-in-app`** (stacked on `ai-receipt-chip-packing-fixes`
  -> the older board stack). Pushed; `origin/dev` fast-forwarded to its tip
  (`7428138`). **Prod (`main`) untouched** (`0ffa16c`). Tree clean.
- Gate (run 2026-09-08): `tsc -p tsconfig.app.json --noEmit` clean, `yarn build`
  green, eslint on changed files baseline-only (one react-refresh warning on
  InventoryCard, which exports `register` + types beside components).
- Open PRs: only **#1 `docs-align-claude-md`** (pre-existing, not this session).

**Built this session (do NOT rebuild):**
0. **Two AI parsing fixes** (`ai-receipt-chip-packing-fixes`, on dev): the Receipt
   quick action + a bare key code ("receipt kw1") now routes to a key receipt at
   0.8 confidence instead of triggering the LLM receipt-or-inventory clarify; and
   packing ("box $5") is stripped before per-item shipping-cost extraction so
   reordering it no longer misprices a shipment. Known ceiling stands: arbitrary
   reordering of courier/tracking/price is still the heuristic parser's limit (the
   durable fix is LLM structured item extraction via the proxy).
1. **The key board now lives in the app, not the spreadsheet.** The shop's
   dictated `key_inventory_master.xlsx` (10 rows A-J, up to 92 slots, ~500 keys)
   was a one-time seed. Parsed it (`scripts/keyBoardSeed.json` via
   `scripts/seedKeyBoard.mjs`) and wrote one doc per position into a new
   **`keyBoard`** Firestore collection. **DEV seeded (691 positions)** and an
   auth-gated `keyBoard` rule released (ruleset `9aff82bb-...`). `src/lib/keyBoard.ts`
   is the new source of truth (replaces the deleted static `lib/keyLocations.ts`):
   types, brand-strip normalization, read/write helpers, code->positions index,
   and the Review checks.
2. **Editable board grid + Review tab** on the Inventory page
   (`StaffInventory.tsx`, `KeyBoardMap.tsx`): full A-J grid from Firestore, click
   a filled slot to search it, an Edit toggle to set/move/free any slot (writes
   Firestore). New **Review** tab lists auto-checks (same blank in 2+ spots, blank
   with no price, sheet-flagged slots, unidentified items, priced-but-not-placed)
   with a Find jump. Per-key badge + AI inventory card read the live board.
3. **AI Mode board edits** (`key_location` action): "put SC1 in B3", "move HR1 to
   H1", "B3 is empty", "clear A7". Immediate; only fires on a real placing cue so a
   bare code stays a lookup. Inventory lookup attaches each key's live location.
4. **Deep-research prompts** (`docs/ui-rehaul/key-research-prompts.md`): two tuned
   prompts (ChatGPT + Gemini) + shared schema for key equivalents/keyways/
   explanations across the ~498 models (`scripts/keyModels.csv`). Research itself
   is deliberately deferred; run the prompts, save as
   `scripts/keyResearch.{chatgpt,gemini}.jsonl`, diff, then a human vets before
   importing into a `keyReference` collection.

**Verify on staging (could not be done locally; demo Firebase denies reads/writes):**
- The board renders A-J from DEV `keyBoard`, edits persist, Review alerts look right.
- AI "put SC1 in B3" etc. writes the board and the card shows the new location.

**PROD when this ships to `main`:** add the `keyBoard` auth-gated rule to PROD and
run `node scripts/seedKeyBoard.mjs <prod-SA> inktonermoore` (no prod SA on this
machine). The board data is DEV-only right now.

## START HERE (fresh-session brief, 2026-09-07)

**Next session is for:** Parsa's staging review of this session's work on
`ink-toner-moore.pages.dev` (needs the dev staff login and real DEV Firestore to
exercise pricing/writes), then folding in feedback.

**Where things stand (verify against `but status`):**
- Stack tip is **`timesheet-visual-mode`** (stacked, bottom to top:
  `manager-schedule` -> ... -> `ai-extract-routing-fixes` -> `key-location-map`
  -> `receipt-redesign` -> `ai-keys-shipping-fixes` -> `timesheet-visual-mode`),
  all pushed. `origin/dev` fast-forwarded to its tip (`f0f141b`). **Prod (`main`)
  untouched** (still `0ffa16c`).
- Tree clean. Gate: `tsc -p tsconfig.app.json --noEmit` clean, `yarn build`
  green, eslint baseline-only (the usual react-refresh warnings on files that
  export a hook beside a component).

**Built this session (do NOT rebuild):**
1. **Key location map + visual board** (`key-location-map`, then `key-board-map`):
   the board layout is now one source of truth in `src/lib/keyLocations.ts`
   (`KEY_BOARD` -> derived `KEY_LOCATIONS` model->slot). Rendered as a **"Key board"**
   on the classic Inventory page (`StaffInventory.tsx`) showing every slot with its
   blank, F1 as **Empty** and B1 as **Not identified**; clicking an occupied slot
   searches it, and each key card shows its board location. The AI inventory card
   reads the same map. Layout: A1=01122BE, C1=C088, D1=CO10, G1=CLB2, H1=HR1 Brass,
   I1=HR1 Nickel-Plated, J1=IN33, K1=LRD-1D/LD1; B1 unknown, F1 empty. HR1 sits in
   H1 and I1 and resolves to "H1 / I1".
   - **Verified against DEV keyInventory:** only 01122BE, CLB2, HR1 (stored as ONE
     model, not split by finish), and IN33 exist as models; **C088, CO10, LRD-1D,
     LD1 are NOT in the DB**, so their per-key badge will not show until a matching
     model is added (the board map shows them regardless). Equivalents live in the
     `notes` field on each key (e.g. 01122BR notes "Y104").
2. **Receipt/label PDF redesign** (`receipt-redesign`, `src/lib/simpleReceipt.ts`):
   rewrote the one shared generator. Editorial header, details block, itemized
   table with a column header, boxed totals, footnote, footer. Ink-light for B&W
   (no heavy fills, only hairlines + faint gray tints). Fixes a real bug where a
   long item list ran off the page: now paginates (repeats the table header, slim
   continuation header, Page X of Y) and auto-picks a compact density to fit one
   page when it can. Price-less 4x6 label drops the amount column (no misleading
   $0.00). Switched to the named `{ jsPDF }` import.
3. **AI: keys + fuller shipping + lookup ranking** (`ai-keys-shipping-fixes`):
   - Shipping receipts carry the full service name (UPS Express Saver, FedEx
     Ground) AND the tracking number on the line, and the finished receipt keeps
     the customer name/phone/email (the cart's Finish lost them before).
   - Keys understood: a bare code stays a price/stock lookup; several keys or a
     quantity ("2 kw1s 1 y1 and 2 sc4s"), or a key on a receipt (or the "Receipt"
     quick action + "kw1"), become priced key line items pulled from inventory
     (`resolveKeyPrices` in `src/ai/keys.ts`, run after parse in `context.tsx`).
   - Inventory lookup ranks exact match first (searching "Y1" puts Y1 at top).
4. **Timesheet + Schedule visual mode** (`timesheet-visual-mode`,
   `src/pages/StaffTimesheet.tsx`): a List/Visual toggle on both tabs (persisted,
   Visual default). Visual Schedule is a weekly calendar time-grid (hour rail, day
   columns, color-coded shift blocks lane-packed, today tinted with a live
   current-time line, manager add/edit, read-only when locked). Visual Timesheet
   is a per-employee hours bar chart. Shift dialog gained a manager Delete.

**DEV data change this session (not code):** set KW1 / SC1 / WR5 prices to **3.57**
in DEV `keyInventory` via the dev SA REST API (were 3.68). PROD unchanged.

**Verify on staging (could not be done locally; demo Firebase denies reads/writes):**
- Key receipts price correctly from DEV `keyInventory` and the totals are right.
- `KEY_LOCATIONS`: the card resolves a slot only when the searched/stored key
  MODEL string matches a map key. If DEV `keyInventory` stores these under
  different spellings than Parsa's (e.g. "HR1-B" vs "HR1 (Brass)", "01122" vs
  "01122BE"), the lookup shows "Location coming soon"; add the stored spelling as
  an equivalent once seen on staging.
- Shipping receipt shows service + tracking + customer end to end (verified by
  offline PDF render; confirm with a real login + LLM path).

**Caveats / follow-ups:**
- Shipping+key combined: keys land on the FINAL receipt, but the shipping slip
  PREVIEW total is shipping-only (the shipping spec has no key field); the chat
  and downloaded receipt are correct. Add a slip "Keys" row if Parsa wants it in
  the preview.
- Employee colors repeat past 8 employees (names always shown, so still legible).
- **Email-to-print feature (discussed, NOT built):** customers email files to an
  address, staff see them in the portal. Recommended path: move DNS from Porkbun
  to Cloudflare, use an Email Worker (reuses the existing Worker + `FIREBASE_SA`)
  to store attachments in Firebase Storage + a `printJobs` Firestore doc, staff
  "Print Inbox" page reads it. Its own effort; scope it before building.
- **PROD:** none of this is on prod. Mirror DEV key prices + any new rules and
  redo the pricing when the rehaul ships to `main`.

## START HERE (fresh-session brief, 2026-09-06)

**Next session is for:** Parsa's staging review + smoke-test of the AI-Mode parsing
overhaul on `ink-toner-moore.pages.dev`, then folding in his feedback. Not a numbered
plan step; this is post-rehaul work on the AI intent parser, stacked above the rehaul.
Earlier open work still stands too (manager mode / schedule / slip GST review from the
2026-09-05 sessions below).

**Where things stand (verify against `but status` before trusting):**
- Branch **`ai-extract-routing-fixes`** stacked on `manager-schedule`, pushed.
  `origin/dev` is fast-forwarded to its tip (`902259b`), so Cloudflare staging
  rebuilds with all of it. **Prod (`main`) untouched.**
- Tree **clean**, local `ai-extract-routing-fixes` == `origin/dev`.
- Open PRs: only **#1 `docs-align-claude-md`** (pre-existing, not this session's).
- **Gate as observed (2026-09-06):** `tsc -p tsconfig.app.json --noEmit` clean;
  `yarn build` green; `eslint` on changed files is baseline-only (pre-existing `any`
  in `firestore.ts`; one benign `react-refresh/only-export-components` on
  `ConfirmationCheck.tsx` because it exports `useConfirmationDraft` beside the
  component - same pattern as the other flagged hooks). No new problems.
- **Testing:** a standalone offline harness (esbuild-bundles the real `ai/` modules,
  no network) covering ~90 routing/extraction/segmentation/follow-up/shipping
  assertions was run green. It lives in this session's scratchpad, NOT committed
  (repo has no test framework). If you want it in-repo, add under `scripts/`.

**Already built this session - do NOT rebuild (see "AI-Mode parsing overhaul" below):**
1. **Extractor fixes:** money no longer misreads a trailing `$` (`53$ 4167382277`);
   phone no longer slices a tracking number (digit-boundary guards).
2. **Router:** bare code (`KW1` / `KW1?`) -> inventory_lookup; a courier/tracking with
   a real sale signal -> shipping receipt, a bare courier/tracking -> track;
   phrase-tolerant key + inventory-write routes; tightened status guard.
3. **Clarify card** shows only the routes in question (proxy emits `clarifyOptions`).
4. **Multi-action:** one utterance can hold several actions; immediates run, confirms
   queue one slip at a time (`ai/segment.ts` + `ai/context.tsx`).
5. **Multi-item shipping:** several parcels in one utterance -> one receipt with an
   item each. Splits on separators AND at each courier name (handles run-ons and no
   spaces), keeps commas-inside-numbers/one-item intact.
6. **Conversational follow-ups:** with a slip open, "make it $40" / "no gst" / "change
   the courier to FedEx" / "add another Purolator to Calgary $15" edit that slip
   (`ai/followup.ts`).
7. **City + packing:** known Canadian cities recognized however typed (lowercase, no
   "to" cue); packing supplies (`box $4`, `large box $10`) captured, shown on the slip
   as a "Packing" section, and added to the receipt total on confirm.

**Constraints that bite (append, never trim):**
- **Prod path untouched:** never edit `.github/workflows/deploy.yml`, `public/CNAME`;
  never point anything at `main`. Prod deploys `main` -> GitHub Pages.
- **The Worker is SHARED** (`inktonermoore-ai-proxy`, serves both AI routing and
  `/manager/*`). Do not break the root routing path when editing it; re-test with a
  POST `{"utterance":"..."}` after any deploy. Current worker version deployed this
  session includes `clarifyOptions` in the routing schema/prompt (verified: KW1?,
  the shipping utterance, an ambiguous clarify, and `/manager/status` 200).
- **Routing vs extraction split:** the LLM (Gemini Flash Lite) only picks the ACTION;
  the deterministic engine owns every field value AND segmentation/multi-item/packing
  extraction. So parsing is consistent regardless of the model, and a confident local
  route is never flipped by the LLM. Do not move value extraction into the model.
- **DEV rules require the manager claim** to write `scheduleShifts`/`appSettings`.
  A signed-in but non-manager session gets 403 on those writes - correct, not a bug.
- **No prod Firebase SA on this machine.** DEV rules/claims are done via the dev SA
  at `/home/user/Programming/InkTonerMoore/inktonermoore-dev-firebase-adminsdk-*.json`
  (outside the repo). PROD activation is a separate, manual step.
- No em dashes anywhere. Style off `themeClasses`, not raw `dark:`.
- **Wrangler is authenticated** on Parsa's Cloudflare account; `cd proxy && npx
  wrangler deploy` works from here. Worker secrets set on dev: `GEMINI_API_KEY`,
  `FIREBASE_SA`, `PIN_PEPPER`.
- **`gh`'s git credential helper is broken in this sandbox** (`.gh-wrapped: No such
  file`). Push with an inline helper:
  `git -c credential.helper='!f(){ echo username=x-access-token; echo "password=$(gh auth token)"; };f' push origin <sha>:refs/heads/<branch>`.
  `but push` fails on the same cause.

**Open questions (fold answers in as their own commits; do not invent one):**
- Deterministic parser has a ceiling on free-form text; the real fix for arbitrary
  multi-item shipping is LLM-driven structured item extraction (proxy returns a
  `shipmentItems`/`packing` array), which is a bigger change. Do it if Parsa wants
  robustness beyond the current heuristics.
- Per-item follow-up targeting ("change item 1 to FedEx") - today a follow-up edit
  merges into the LAST shipment item or appends. Add index targeting if wanted.
- (Carried) Auto-lock manager mode on reload? Rate-limit `/manager/unlock` + longer
  PIN? Per-employee PINs now or later? (see 2026-09-05 sections).

**Working rules:**
- Env: `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, then `corepack yarn ...`.
- Gate before every commit: `corepack yarn tsc -p tsconfig.app.json --noEmit`,
  `corepack yarn build`, and `corepack yarn eslint <changed files>` (baseline-only
  is the bar).
- To exercise the parser offline fast: esbuild-bundle `ai/providers/deterministic.ts`
  + `ai/segment.ts` (+ `ai/shipping.ts`, `ai/followup.ts`) with an `@`->`src` alias,
  import from a data: URL, call `new DeterministicProvider().parse(...)`. Runs with no
  network; the LLM only affects routing on ambiguous cases.
- VC via GitButler, one branch per session, coherent commits. Git + dev promotion
  are handled autonomously for this project (per the user).
- Firestore rules are console-managed (not in repo); deploy to dev by minting an SA
  token and calling the Rules REST API (a working script pattern was used earlier).

**Still placeholder / not customer-ready:** no manager PIN is set on dev yet (first
"Manager sign in" runs the set-PIN flow); Moneris device-send remains stubbed
(pre-existing); packing edit in the slip is remove-only (add is via the utterance or
the Pack quick-actions); item-2 shipment tax uses the province default when the city
is unknown.

---

## AI-Mode parsing overhaul (2026-09-06)

All on branch `ai-extract-routing-fixes` (stacked on `manager-schedule`), pushed, and
`origin/dev` fast-forwarded to its tip (`902259b`). Prod untouched. This was a
multi-round session driven by Parsa testing the AI-Mode Receipt/shipping flow and
reporting failures; each was fixed at the root with an offline test harness rather
than case-by-case. Commits (bottom to top):

- `fix(ai): stop money and phone extractors from grabbing the wrong number`
- `feat(ai): route bare codes and priced shipments right, tighten clarify`
- `feat(ai): sturdier extraction and routing across the board`
- `feat(ai): handle several actions in one utterance`
- `fix(ai): a bare courier + tracking number is a lookup, not a receipt`
- `feat(ai): parse several shipment items from one utterance`
- `feat(ai): conversational follow-ups edit the open slip`
- `fix(ai): two labels on separate lines are one receipt, not two`
- `fix(ai): split a run-on shipment at each courier name`
- `feat(ai): recognize cities however typed, and packing supplies on a receipt`

Key files: `src/ai/extract.ts` (all field extractors incl. `extractShippingCost`,
`extractCity` + Canadian-cities list, `extractPacking`), `src/ai/providers/
deterministic.ts` (router + `extractShipmentItems` with courier-boundary splitting +
`looksLikeInventoryLookup`/`looksLikeShipmentSale`), `src/ai/segment.ts` (multi-action
split + adjacent-shipping coalesce + `probeRoute`), `src/ai/followup.ts` (slip edits),
`src/ai/context.tsx` (batch flow + queue + follow-up branch), `src/ai/actions/
cartLines.ts` (packing lines), `src/components/ai/ConfirmationCheck.tsx` (Packing
section), plus `proxy/src/worker.js` (clarifyOptions + KW1/shipping prompt examples,
DEPLOYED this session).

Verified in a real browser (dev server + `VITE_DEV_BYPASS_AUTH=true`): the reported
shipping utterance, a mixed punch+note+refill queue, multi-item shipping (2-3 items),
run-on and glued couriers, follow-up field edits / tax toggle / item append, cities,
and packing (`box 4$` shows a Packing line and lands on the receipt). Firestore-writing
executors error on the demo config locally (expected); routing/extraction/UI are what
was checked.

**Known ceiling (told to Parsa):** this is a heuristic deterministic parser. It handles
the common orderings and the reported edge cases, but pathological reorderings/interleaving
can still mis-split. The durable fix is LLM-driven structured item extraction (see open
questions). Item-2 tax uses the province default when a city is unknown.

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
