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
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from './bundle.mjs';

const mod = await loadEngine();

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

test('routing: a cut verb with a single code is a key receipt', async () => {
  const r = await route('cut a kw1');
  assert.equal(r.action, 'receipt');
  assert.equal(r.subtype, 'key');
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
  // The punch clock is switched off: a punch phrase is answered, never written.
  assert.equal(mod.classifyTimesheetOp('clock out Sarah'), 'punch_off');
  assert.equal(mod.classifyTimesheetOp('clock in Dave'), 'punch_off');
  assert.equal(mod.classifyTimesheetOp('add a shift for Sue oct 8 10 to 5:30'), 'add_shift');
  assert.equal(mod.classifyTimesheetOp('Parsa 4pm to 7pm: 5th,6,7,13,14'), 'add_shift');
  assert.equal(mod.classifyTimesheetOp('Parsa left at 8 instead of 7'), 'adjust_shift');
  assert.equal(mod.classifyTimesheetOp('add 30 min break for Sue today'), 'adjust_shift');
  assert.equal(mod.classifyTimesheetOp('who is working today'), 'view');
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

// --- Shifts: the way staff type them -------------------------------------------
const REF = new Date(2026, 9, 7); // Oct 7, 2026

test('shifts: time ranges read as shop hours', () => {
  const r = (t) => {
    const x = mod.parseTimeRange(t);
    return x ? `${x.start}-${x.end}` : null;
  };
  assert.equal(r('4pm to 7pm'), '16:00-19:00');
  assert.equal(r('4-9'), '16:00-21:00');
  assert.equal(r('11-5'), '11:00-17:00');
  assert.equal(r('10-4:30'), '10:00-16:30');
  assert.equal(r('10-4:45'), '10:00-16:45');
  assert.equal(r('10-5:30'), '10:00-17:30');
  assert.equal(r('10-6'), '10:00-18:00');
  assert.equal(r('4-9pm'), '16:00-21:00');
  assert.equal(r('9am-5pm'), '09:00-17:00');
  assert.equal(r('16:00-21:00'), '16:00-21:00');
  assert.equal(r('12 to 5'), '12:00-17:00');
  assert.equal(r('oct 5-9'), null); // a span of days, not a time
});

test('shifts: day lists carry the month onto bare numbers', () => {
  const d = (t) => mod.parseDays(t, REF).map((k) => k.slice(5)).join(' ');
  assert.equal(d('5th,6,7,13,14'), '10-05 10-06 10-07 10-13 10-14');
  assert.equal(d('8,9,15,16th'), '10-08 10-09 10-15 10-16');
  assert.equal(d('oct 4th, 11th'), '10-04 10-11');
  assert.equal(d('oct 8, oct9, 13, 15, 16'), '10-08 10-09 10-13 10-15 10-16');
  assert.equal(d('Oct 10,17'), '10-10 10-17');
  assert.equal(d('oct7,oct 14'), '10-07 10-14');
  assert.equal(d('today'), '10-07');
  assert.equal(d('yesterday'), '10-06');
  assert.equal(d('friday'), '10-09');
  assert.equal(d('nov 3'), '11-03');
  assert.equal(d('nothing here'), '');
});

test('shifts: a planned shift fills the slip', async () => {
  const p = new mod.DeterministicProvider();
  const f = async (t) => {
    const i = await p.parse(t, {});
    const v = (k) => i.fields[k]?.value;
    return `${i.action}/${v('op')}/${v('employeeName')}/${v('start')}/${v('end')}/${v('days')}`;
  };
  // Day labels depend on today's month, so only the stable parts are pinned here.
  assert.match(await f('Parsa 4pm to 7pm: oct 5th,6,7,13,14'), /^timesheet\/add_shift\/Parsa\/4:00 PM\/7:00 PM\/Oct 5, 6, 7, 13, 14$/);
  assert.match(await f('add shift for sue 10-5:30 oct 8, oct9, 13, 15, 16'), /^timesheet\/add_shift\/Sue\/10:00 AM\/5:30 PM\/Oct 8, 9, 13, 15, 16$/);
  assert.match(await f('schedule Johnny 10-6 on Oct 10,17'), /^timesheet\/add_shift\/Johnny\/10:00 AM\/6:00 PM\/Oct 10, 17$/);
  assert.match(await f('Sue 11-5 oct 4th, 11th'), /^timesheet\/add_shift\/Sue\/11:00 AM\/5:00 PM\/Oct 4, 11$/);
});

test('shifts: a day list stays with its shift through the splitter', async () => {
  for (const line of [
    'Parsa 4pm to 7pm: 5th,6,7,13,14',
    'Parsa 4-9: 8,9,15,16th',
    'Sue 11-5: oct 4th, 11th',
    'Sue 10-5:30: oct 8, oct9, 13, 15, 16',
    'Johnny 10-5:30 : oct7,oct 14',
    'Johnny 10-6: Oct 10,17',
    'Johnny 10-6 on oct 20, 21',
    'add a shift for Sue on the 8th and the 9th 10 to 5:30',
  ]) {
    const segs = await segmentUtterance(line);
    assert.equal(segs.length, 1, `"${line}" split into ${JSON.stringify(segs)}`);
    const i = await provider.parse(segs[0], {});
    assert.equal(`${i.action}/${i.fields.op?.value}`, 'timesheet/add_shift', line);
    assert.ok(i.fields.employeeName.value, line);
    assert.ok(i.fields.start.value && i.fields.end.value, line);
  }
});

test('shifts: actual times and breaks', async () => {
  assert.deepEqual(mod.extractShiftAdjustment('Parsa left at 8 instead of 7'), { start: null, end: '8', breakMinutes: null });
  assert.deepEqual(mod.extractShiftAdjustment('sue started at 10:30 and took a 30 min break'), { start: '10:30', end: null, breakMinutes: 30 });
  assert.deepEqual(mod.extractShiftAdjustment('add 45 minute break for Johnny'), { start: null, end: null, breakMinutes: 45 });
  assert.equal(mod.parseBreakMinutes('1 hour lunch'), 60);
  // A bare hour resolves to the reading nearest the planned time.
  assert.equal(mod.parseClockTime('8', 19 * 60), '20:00');
  assert.equal(mod.parseClockTime('6:30', 19 * 60), '18:30');
  assert.equal(mod.parseClockTime('10:30', 10 * 60), '10:30');
  assert.equal(mod.parseClockTime('8pm'), '20:00');
  const p = new mod.DeterministicProvider();
  const a = await p.parse('Parsa left at 8 instead of 7', {});
  assert.equal(a.action, 'timesheet');
  assert.equal(a.fields.op.value, 'adjust_shift');
  assert.equal(a.fields.employeeName.value, 'Parsa');
  assert.equal(a.fields.actualEnd.value, '8');
  const b = await p.parse('Sue took a 30 min break yesterday', {});
  assert.equal(b.fields.op.value, 'adjust_shift');
  assert.equal(b.fields.employeeName.value, 'Sue');
  assert.equal(b.fields.breakMinutes.value, 30);
  // One person's break and leaving time are one slip, two people are two.
  assert.equal((await segmentUtterance('Parsa took a 15 min break today and left at 7:30')).length, 1);
  assert.equal((await segmentUtterance('Parsa left at 8 and Sue left at 6')).length, 2);
  const c = await p.parse('Parsa took a 15 min break today and left at 7:30', {});
  assert.equal(c.fields.breakMinutes.value, 15);
  assert.equal(c.fields.actualEnd.value, '7:30');
  // A note that happens to mention a time keeps its own route.
  assert.equal((await p.parse('note: customer left at 5 without the receipt', {})).action, 'note');
});

test('shifts: hours count actual times minus the break', () => {
  assert.equal(mod.workedMinutes({ start: '16:00', end: '19:00' }), 180);
  assert.equal(mod.workedMinutes({ start: '16:00', end: '19:00', actualEnd: '20:00' }), 240);
  assert.equal(mod.workedMinutes({ start: '16:00', end: '19:00', actualEnd: '20:00', breakMinutes: 30 }), 210);
  assert.equal(mod.isAdjusted({ start: '16:00', end: '19:00', actualEnd: '', breakMinutes: 0 }), false);
});
