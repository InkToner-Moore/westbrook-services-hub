# AI Mode parser tests

Offline regression tests for the AI Mode parser: routing, field extraction,
utterance segmentation, and the receipt charge math. The parser is the most
iterated and most fragile part of the app (it has a known heuristic ceiling), and
the repo has no test framework, so this locks its behaviour in **without adding a
runtime dependency**.

## Run

```sh
node scripts/parser-tests/run.mjs      # the unit assertions
node scripts/parser-tests/sweep.mjs    # the counter corpus, scored
```

Node 18+ (the repo targets Node 22/24). No network, no Firebase, no LLM proxy, no
`yarn` script. `bundle.mjs` esbuild-bundles the deterministic engine (`@` -> `src`,
with `jspdf` and `@/lib/firestore` stubbed so it loads under plain Node); `run.mjs`
asserts against it with Node's built-in `node:test` runner.

## The counter corpus

`corpus.mjs` is a list of lines the way staff type them (lowercase, no "$", fields
in any order, several things at once) with what the engine must read from each:
the action, the receipt type, the fields, the shipment items, the keys. It also
holds follow-ups: a slip is open, the counter types a few more words, and the
slip must change the right way (or a new action must start).

`sweep.mjs` runs every line and prints a score and each miss. It exits 1 on any
miss. A line marked `known` is a documented gap: it is listed, not failed.

```sh
node scripts/parser-tests/sweep.mjs "ups 22 toronto"   # how one line is read
node scripts/parser-tests/sweep.mjs --all              # passes too
```

This is the number to watch. Staff only reach for AI Mode if it reads them right
nearly every time, so when it misreads something at the counter, add that line
here first, then fix the engine until the sweep is clean again.

## What it covers

- **Routing** (`DeterministicProvider.parse`): bare code -> inventory lookup,
  `receipt kw1` -> key receipt, several keys -> key receipt, bare courier ->
  track, courier + price -> shipping receipt, board moves -> `key_location`,
  stock writes -> inventory, cartridge status, refill/note/directory.
- **Extraction** (`src/ai/extract.ts`): money (`53$ 4167382277` is not a phone),
  phone vs 16-digit tracking, courier + service + number, cities/provinces, key
  items with quantities, packing captured and stripped from the shipping cost.
- **Segmentation** (`src/ai/segment.ts`): independent actions split; a single
  action with detail stays whole; two shipping labels stay one receipt.
- **Charge math** (`chargeAmount` in `purchaseRecorder.ts`): a shipping receipt
  charges the item total, never `$0`.

## When you change the parser

Add the utterance that broke (and its expected route/fields) to `corpus.mjs` so it
never regresses. If the LLM-structured-extraction work lands, the routing and
segmentation assertions here are the contract the new path must still pass.
