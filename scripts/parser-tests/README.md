# AI Mode parser tests

Offline regression tests for the AI Mode parser: routing, field extraction,
utterance segmentation, and the receipt charge math. The parser is the most
iterated and most fragile part of the app (it has a known heuristic ceiling), and
the repo has no test framework, so this locks its behaviour in **without adding a
runtime dependency**.

## Run

```sh
node scripts/parser-tests/run.mjs
```

Node 18+ (the repo targets Node 22/24). No network, no Firebase, no LLM proxy, no
`yarn` script. `run.mjs` esbuild-bundles the deterministic engine (`@` -> `src`,
with `jspdf` and `@/lib/firestore` stubbed so it loads under plain Node) and
asserts against it with Node's built-in `node:test` runner.

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

There is also one test that pins a **known ceiling** (`cut a kw1` is not routed
deterministically), so a future routing change there is a deliberate decision.

## When you change the parser

Add the utterance that broke (and its expected route/fields) here so it never
regresses. If the LLM-structured-extraction work lands, the routing and
segmentation assertions here are the contract the new path must still pass.
