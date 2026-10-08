// Bundles the deterministic engine (entry.ts) to a temp ESM file and imports it.
// `@` resolves to src; jspdf and firestore are stubbed so the bundle loads under
// plain Node. Shared by run.mjs (the unit assertions) and sweep.mjs (the corpus).
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const src = path.join(root, 'src');

export async function loadEngine() {
  const outfile = path.join(os.tmpdir(), `westbrook-parser-${process.pid}-${Date.now()}.mjs`);
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
  return mod;
}
