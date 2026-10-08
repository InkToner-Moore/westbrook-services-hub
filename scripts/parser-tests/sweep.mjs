// Runs the counter corpus (corpus.mjs) through the offline engine and prints a
// score plus every miss. Exits 1 on any miss that is not marked `known`.
//
//   node scripts/parser-tests/sweep.mjs            score + misses
//   node scripts/parser-tests/sweep.mjs --all      also print the passes
//   node scripts/parser-tests/sweep.mjs "ups 22"   show how one line is read
import { loadEngine } from './bundle.mjs';
import { CORPUS, FOLLOWUPS } from './corpus.mjs';

const mod = await loadEngine();
const provider = new mod.DeterministicProvider();
const args = process.argv.slice(2);
const showAll = args.includes('--all');
const adhoc = args.filter((a) => !a.startsWith('--'));

const same = (got, want) => {
  if (want === null) return got == null || got === '';
  if (typeof want === 'string') return String(got ?? '').trim().toLowerCase() === want.toLowerCase();
  return got === want;
};

function checkItems(intent, want, errs) {
  const got = intent.fields.shipmentItems?.value ?? [];
  if (got.length !== want.length) errs.push(`items: ${got.length}, want ${want.length}`);
  want.forEach((w, i) => {
    const g = got[i] ?? {};
    for (const [k, v] of Object.entries(w)) {
      if (!same(g[k], v)) errs.push(`item${i + 1}.${k}: ${JSON.stringify(g[k])}, want ${JSON.stringify(v)}`);
    }
  });
}

function checkIntent(intent, c, errs) {
  if (c.a && intent.action !== c.a) errs.push(`action: ${intent.action}, want ${c.a}`);
  if (c.s && intent.subtype !== c.s) errs.push(`subtype: ${intent.subtype}, want ${c.s}`);
  if (c.op && intent.fields.op?.value !== c.op) errs.push(`op: ${intent.fields.op?.value}, want ${c.op}`);
  for (const [k, v] of Object.entries(c.f ?? {})) {
    const got = intent.fields[k]?.value;
    if (!same(got, v)) errs.push(`${k}: ${JSON.stringify(got)}, want ${JSON.stringify(v)}`);
  }
  for (const [k, v] of Object.entries(c.has ?? {})) {
    const got = String(intent.fields[k]?.value ?? '').toLowerCase();
    if (!got.includes(v.toLowerCase())) errs.push(`${k}: ${JSON.stringify(got)}, want it to contain "${v}"`);
  }
  if (c.items) checkItems(intent, c.items, errs);
  if (c.keys) {
    const got = (intent.fields.keyItems?.value ?? []).map((k) => `${k.qty}x${k.model}`);
    if (got.join(',') !== c.keys.join(',')) errs.push(`keys: [${got}], want [${c.keys}]`);
  }
  if (c.pack != null) {
    const got = (intent.fields.packing?.value ?? []).length;
    if (got !== c.pack) errs.push(`packing: ${got}, want ${c.pack}`);
  }
  for (const [k, v] of Object.entries(c.attach ?? {})) {
    if (Boolean(intent.attach?.[k]) !== v) errs.push(`attach.${k}: ${Boolean(intent.attach?.[k])}, want ${v}`);
  }
}

const brief = (intent) => {
  const fields = Object.fromEntries(
    Object.entries(intent.fields)
      .filter(([, v]) => v.value != null && v.value !== '' && v.source !== 'guessed')
      .map(([k, v]) => [k, v.value]),
  );
  return `${intent.action}${intent.subtype ? `/${intent.subtype}` : ''} ${intent.confidence} ${JSON.stringify(fields)}${intent.attach ? ` attach=${JSON.stringify(intent.attach)}` : ''}`;
};

if (adhoc.length > 0) {
  for (const u of adhoc) {
    const segs = await mod.segmentUtterance(u);
    console.log(`"${u}" -> ${segs.length} segment(s)`);
    for (const s of segs) console.log(`  [${s}]\n    ${brief(await provider.parse(s))}`);
  }
  process.exit(0);
}

let pass = 0;
let known = 0;
const misses = [];

for (const c of CORPUS) {
  const errs = [];
  const segs = await mod.segmentUtterance(c.u);
  if (c.segs != null && segs.length !== c.segs) errs.push(`segments: ${segs.length} ${JSON.stringify(segs)}, want ${c.segs}`);
  // A line that is one action is parsed the way the chat does it: split first,
  // then parse the (single) segment. Multi-action lines only check the split.
  const intent = await provider.parse(segs.length === 1 ? segs[0] : c.u);
  if (c.a || c.f || c.items || c.keys) checkIntent(intent, c, errs);
  if (errs.length === 0) {
    pass += 1;
    if (showAll) console.log(`ok    ${c.u}`);
  } else if (c.known) {
    known += 1;
    console.log(`known ${JSON.stringify(c.u)}  (${c.known})`);
  } else {
    misses.push({ u: c.u, errs, got: brief(intent) });
  }
}

for (const c of FOLLOWUPS) {
  const errs = [];
  const label = `${c.open}  >>  ${c.say}`;
  const active = await provider.parse(c.open);
  const isEdit = await mod.isFollowUp(active, c.say);
  let next = active;
  if (isEdit !== c.edit) errs.push(`follow-up: ${isEdit}, want ${c.edit}`);
  if (c.edit) {
    next = mod.applyFollowUp(active, c.say);
    checkIntent(next, c, errs);
  }
  if (errs.length === 0) {
    pass += 1;
    if (showAll) console.log(`ok    ${label}`);
  } else if (c.known) {
    known += 1;
    console.log(`known ${JSON.stringify(label)}  (${c.known})`);
  } else {
    misses.push({ u: label, errs, got: brief(next) });
  }
}

for (const m of misses) {
  console.log(`MISS  ${JSON.stringify(m.u)}\n      ${m.errs.join('\n      ')}\n      got: ${m.got}`);
}
const total = CORPUS.length + FOLLOWUPS.length;
console.log(`\n${pass}/${total} read right (${((pass / total) * 100).toFixed(1)}%), ${misses.length} missed, ${known} known gaps`);
process.exit(misses.length > 0 ? 1 : 0);
