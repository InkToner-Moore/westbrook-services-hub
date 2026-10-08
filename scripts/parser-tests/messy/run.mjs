// Run messy counter lines through the full provider chain (offline engine, then
// the Haiku router when the engine is unsure). Prints one compact read per line.
// Needs the proxy: PROXY=<worker url> node scripts/parser-tests/messy/run.mjs [lines|chats]
// It makes about 100 model calls, paced. The offline corpus (../sweep.mjs) is the
// regression check; this one is for finding new misses.
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LINES, CHATS } from './lines.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const stubs = path.resolve(here, '../stubs');
const outfile = path.join(os.tmpdir(), `wb-messy-${process.pid}.mjs`);
await build({ entryPoints: [path.join(here, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile, alias: { '@': path.join(root, 'src') }, logLevel: 'error',
  plugins: [{ name: 's', setup(b) { b.onResolve({ filter: /^jspdf$/ }, () => ({ path: path.join(stubs, 'jspdf.mjs') })); b.onResolve({ filter: /^@\/lib\/firestore$/ }, () => ({ path: path.join(stubs, 'firestore.mjs') })); } }] });
const mod = await import(pathToFileURL(outfile).href);
const PROXY = process.env.PROXY || 'http://localhost:8791';
let calls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (...a) => { calls += 1; lastCalled = true; return realFetch(...a); };
let lastCalled = false;
const llm = new mod.LlmProvider(PROXY);
const brief = (i) => {
  const f = Object.entries(i.fields).filter(([, v]) => v.value != null && v.value !== '' && !(Array.isArray(v.value) && !v.value.length))
    .map(([k, v]) => `${v.source === 'guessed' ? '~' : ''}${k}=${typeof v.value === 'object' ? JSON.stringify(v.value) : v.value}`).join(' ');
  return `${i.action}${i.subtype ? '/' + i.subtype : ''} ${i.confidence}${i.clarify ? ' ASK:' + i.clarify : ''}${i.attach ? ' attach=' + JSON.stringify(i.attach) : ''} | ${f}`;
};
const only = process.argv[2];
if (only !== 'chats') for (const u of LINES) {
  const segs = await mod.segmentUtterance(u);
  for (const s of segs) { lastCalled = false; const i = await llm.parse(s); console.log(`${segs.length > 1 ? '[seg] ' : ''}${JSON.stringify(s)}${lastCalled ? ' (LLM)' : ''}\n   ${brief(i)}`); if (lastCalled) await new Promise((r) => setTimeout(r, 300)); }
}
if (only !== 'lines') for (const [open, ...rest] of CHATS) {
  console.log(`\n=== ${open}`);
  let active = await llm.parse(open); console.log('   ' + brief(active));
  for (const say of rest) {
    const edit = await mod.isFollowUp(active, say);
    if (edit) { active = mod.applyFollowUp(active, say); console.log(`> ${say}  [edit]\n   ${brief(active)}`); }
    else { lastCalled = false; const n = await llm.parse(say); console.log(`> ${say}  [NEW ACTION]${lastCalled ? ' (LLM)' : ''}\n   ${brief(n)}`); }
  }
}
console.log(`\nLLM calls: ${calls}`);
