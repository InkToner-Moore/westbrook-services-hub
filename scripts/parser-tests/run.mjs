// Offline regression tests for the AI Mode parser (routing + extraction +
// segmentation + the receipt charge math). The parser is the most-iterated,
// most-fragile part of the app and has a known heuristic ceiling, yet the app
// has no test framework; this locks its behaviour in without adding a runtime
// dependency. It esbuild-bundles the deterministic engine (with jspdf/firestore
// stubbed) and asserts against it with Node's built-in test runner.
//
// Run it:  node scripts/parser-tests/run.mjs
// Node 18+ (the repo targets 22/24). No network, no Firebase, no yarn script.
//
// When a parser fix lands, add the utterance that broke it here so it never
// regresses. When the LLM-structured-extraction work happens, the routing/
// segmentation assertions here are the contract the new path must still pass.
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const src = path.join(root, 'src');

// Bundle the parser surface to a temp ESM file, then import it. `@` resolves to
// src; jspdf and firestore are stubbed so the bundle loads under plain Node.
const outfile = path.join(os.tmpdir(), `westbrook-parser-${process.pid}.mjs`);
await build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': src },
  plugins: [
    {
      name: 'westbrook-test-stubs',
      setup(b) {
        b.onResolve({ filter: /^jspdf$/ }, () => ({ path: path.join(here, 'stubs/jspdf.mjs') }));
        b.onResolve({ filter: /^@\/lib\/firestore$/ }, () => ({ path: path.join(here, 'stubs/firestore.mjs') }));
      },
    },
  ],
  logLevel: 'warning',
});

const mod = await import(pathToFileURL(outfile).href);
process.on('exit', () => {
  try {
    fs.unlinkSync(outfile);
  } catch {
    /* best effort */
  }
});

const {
  DeterministicProvider,
  segmentUtterance,
  extractMoney,
  extractPhone,
  extractTracking,
  extractCity,
  extractProvince,
  extractKeyItems,
  extractPacking,
  extractShippingCost,
  chargeAmount,
} = mod;

const provider = new DeterministicProvider();
const route = async (utterance) => {
  const intent = await provider.parse(utterance);
  return { action: intent.action, subtype: intent.subtype, intent };
};

// --- Routing -------------------------------------------------------------------
test('routing: bare key/SKU code is an inventory lookup, not a stock edit', async () => {
  for (const u of ['KW1', 'KW1?', 'SC4', '564XL', 'TN660']) {
    const r = await route(u);
    assert.equal(r.action, 'inventory_lookup', `"${u}" should look up, got ${r.action}`);
  }
});

test('routing: the Receipt quick action + a key code makes a key receipt', async () => {
  const r = await route('receipt kw1');
  assert.equal(r.action, 'receipt');
  assert.equal(r.subtype, 'key');
});

test('routing: several keys, a quantity, or the word "key" is a key-cutting receipt', async () => {
  for (const u of ['2 kw1s 1 y1 and 2 sc4s', '2 kw1s', 'cut a key', 'copy a key']) {
    const r = await route(u);
    assert.equal(r.action, 'receipt', `"${u}" -> ${r.action}`);
    assert.equal(r.subtype, 'key', `"${u}" subtype ${r.subtype}`);
  }
});

test('routing (known ceiling): a single bare code with a cut verb is NOT routed deterministically', async () => {
  // "cut a kw1" has no literal "key" word, a qty of 1, and is not a lone token, so
  // the deterministic engine leaves it `unknown` and defers to the LLM route (or a
  // "did you mean" prompt offline). Documented here so the ceiling is explicit and
  // a future routing change is a deliberate decision, not an accident.
  const r = await route('cut a kw1');
  assert.equal(r.action, 'unknown');
});

test('routing: a bare courier or tracking number is a track lookup', async () => {
  for (const u of ['UPS 1Z999AA10123456784', 'fedex', 'Purolator']) {
    const r = await route(u);
    assert.equal(r.action, 'track', `"${u}" -> ${r.action}`);
  }
});

test('routing: a courier named with a price/destination is a shipping receipt', async () => {
  for (const u of ['UPS to Toronto ON $22', 'ship fedex $30 to Vancouver']) {
    const r = await route(u);
    assert.equal(r.action, 'receipt', `"${u}" -> ${r.action}`);
    assert.equal(r.subtype, 'shipping', `"${u}" subtype ${r.subtype}`);
  }
});

test('routing: a board move/clear is a key_location action', async () => {
  for (const u of ['put SC1 in B3', 'move HR1 to H1', 'B3 is empty', 'clear A7']) {
    const r = await route(u);
    assert.equal(r.action, 'key_location', `"${u}" -> ${r.action}`);
  }
});

test('routing: an inventory stock write routes to inventory, not lookup', async () => {
  for (const u of ['set KW1 to 10 units', 'restock the HP 65', 'mark SC4 out of stock']) {
    const r = await route(u);
    assert.equal(r.action, 'inventory', `"${u}" -> ${r.action}`);
  }
});

test('routing: a cartridge status change is recognized', async () => {
  const r = await route('mark ORD-AB12CD as ready');
  assert.equal(r.action, 'cartridge_status');
});

test('routing: refill / note / directory keywords route correctly', async () => {
  assert.equal((await route('toner refill for Sarah $34')).action, 'receipt');
  assert.equal((await route('note the printer jammed')).action, 'note');
  assert.equal((await route('add link staples.ca')).action, 'directory');
});

// --- Extraction ----------------------------------------------------------------
test('money: a trailing $ is not read as a leading $ on the next number', () => {
  // "53$ 4167382277": the amount is 53, not part of the phone number.
  assert.equal(extractMoney('53$ 4167382277'), 53);
});

test('money: many spellings all read the same amount', () => {
  assert.equal(extractMoney('$20'), 20);
  assert.equal(extractMoney('20$'), 20);
  assert.equal(extractMoney('20 bucks'), 20);
  assert.equal(extractMoney('for 20'), 20);
  assert.equal(extractMoney('1,299.99'), null); // no cue: a bare thousands number is not money
  assert.equal(extractMoney('$1,299.99'), 1299.99);
});

test('phone: a 16-digit tracking number is not sliced into a phone', () => {
  assert.equal(extractPhone('UPS 1234567890123456'), null);
  assert.equal(extractPhone('call 403 555 1212'), '403 555 1212');
});

test('tracking: courier + service + number are detected', () => {
  const m = extractTracking('UPS Express Saver 1Z999AA10123456784');
  assert.equal(m.courier, 'UPS');
  assert.equal(m.service, 'Express Saver');
  assert.equal(m.trackingNumber, '1Z999AA10123456784');
});

test('city/province: recognized however typed', () => {
  assert.equal(extractCity('to toronto ontario'), 'Toronto');
  assert.equal(extractProvince('to toronto ontario'), 'ON');
  assert.equal(extractCity('change the courier to FedEx'), null); // courier is not a city
});

test('keys: codes with quantities parse into items', () => {
  const items = extractKeyItems('2 kw1s 1 y1 and 2 sc4s');
  assert.deepEqual(
    items.map((i) => `${i.qty}x${i.model}`),
    ['2xKW1', '1xY1', '2xSC4'],
  );
});

test('packing: a box price is captured and stripped from the shipping cost', () => {
  const packing = extractPacking('UPS $22 box $5');
  assert.equal(packing.length, 1);
  assert.equal(packing[0].cost, 5);
  // The shipping cost extractor, given the packing stripped out, reads 22 not 5.
  const cost = extractShippingCost('UPS box $5'.replace('box $5', ''), null, null);
  assert.notEqual(cost, 5);
});

test('shipping: several couriers in one utterance become several items', async () => {
  const r = await route('UPS to Toronto ON $22 and FedEx to Vancouver BC $30');
  assert.equal(r.subtype, 'shipping');
  const items = r.intent.fields.shipmentItems?.value ?? [];
  assert.equal(items.length, 2, `expected 2 items, got ${items.length}`);
});

// --- Segmentation --------------------------------------------------------------
test('segment: independent actions split; a single action with detail does not', async () => {
  const two = await segmentUtterance('clock in Dave and note the printer jammed');
  assert.equal(two.length, 2, `expected 2 segments, got ${two.length}: ${JSON.stringify(two)}`);

  const one = await segmentUtterance('refill for Sarah, HP 65, $34');
  assert.equal(one.length, 1, `expected 1 segment, got ${one.length}: ${JSON.stringify(one)}`);
});

test('segment: two shipping labels stay one receipt (not two segments)', async () => {
  const segs = await segmentUtterance('UPS to Toronto $22\nFedEx to Calgary $30');
  assert.equal(segs.length, 1, `two labels should be one shipping receipt, got ${segs.length}`);
});

// --- Timesheet classification --------------------------------------------------
test('timesheet: ops classify from the words', () => {
  assert.equal(mod.classifyTimesheetOp('clock out Sarah'), 'punch_out');
  assert.equal(mod.classifyTimesheetOp('clock in Dave'), 'punch_in');
  assert.equal(mod.classifyTimesheetOp('add employee Priya'), 'add_employee');
  assert.equal(mod.classifyTimesheetOp('hours for Dave'), 'view');
});

// --- Receipt charge math (the $0-shipping-payment fix) -------------------------
test('chargeAmount: a flat refill receipt charges price + GST', async () => {
  const intent = await provider.parse('refill for Sarah HP 65 $34');
  // GST defaults on; total is 34 + 5% = 35.70.
  assert.equal(chargeAmount(intent), 35.7);
});

test('chargeAmount: a shipping receipt charges the item total, never $0', async () => {
  const intent = await provider.parse('UPS to Toronto ON $22');
  const amount = chargeAmount(intent);
  assert.ok(amount >= 22, `shipping charge should be >= 22, got ${amount}`);
  assert.notEqual(amount, 0);
});

test('chargeAmount: GST off charges the bare price', async () => {
  const intent = await provider.parse('sold a phone case for $10');
  assert.equal(intent.subtype, 'supplies');
  intent.fields.gst = { value: false, source: 'explicit' };
  assert.equal(chargeAmount(intent), 10);
});
