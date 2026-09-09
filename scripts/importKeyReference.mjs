// Import the vetted key reference into Firestore (the `keyReference` collection),
// one document per key blank keyed by its normalized code. The card and the AI
// lookup read this to show a blank's keyway, what it fits, and the cross-verified
// equivalents a clerk can cut instead.
//
// The input is the merged, cross-checked file from scripts/mergeKeyResearch.mjs
// (scripts/keyReference.vetted.jsonl). Do NOT import a single raw research pass
// here: only the cross-checked file marks single-source equivalents as low
// confidence + needsReview, which is what keeps a wrong equivalent off a card.
//
// Usage:
//   node scripts/importKeyReference.mjs <service-account.json> [projectId] \
//     [--input scripts/keyReference.vetted.jsonl] [--identified-only]
//
// The service account needs Firestore write access (the dev admin SDK SA has it).
// Idempotent: each doc is written by id, so a re-run overwrites with the same data.
// --identified-only skips rows nothing could identify (keeps the collection lean).

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const argv = process.argv.slice(2);
const positional = [];
let inputPath = 'scripts/keyReference.vetted.jsonl';
let identifiedOnly = false;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--input') inputPath = argv[++i];
  else if (a === '--identified-only') identifiedOnly = true;
  else positional.push(a);
}
const [saPath, projectArg] = positional;
if (!saPath) {
  console.error('Usage: node scripts/importKeyReference.mjs <service-account.json> [projectId] [--input file] [--identified-only]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(saPath, 'utf8'));
const projectId = projectArg || sa.project_id;

// Parse the vetted JSONL.
const raw = readFileSync(inputPath, 'utf8');
let docs = [];
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t) continue;
  try { docs.push(JSON.parse(t)); } catch (e) { console.warn(`! skipping unparseable line: ${t.slice(0, 60)}...`); }
}
// A few master rows are board annotations, not blanks ("SAME AS B49B", "SINGLE
// THEMED KW1 KEY", "NICKEL"). Never make a reference doc out of those.
const ANNOTATION = /same as|same material|single themed|longer than|mostly |\bnickel\b|one normal|also present|same colou?r/i;
docs = docs.filter((d) => !ANNOTATION.test(`${d.code} ${d.displayNames || ''}`));
if (identifiedOnly) docs = docs.filter((d) => d.identified);
if (docs.length === 0) { console.error(`No documents to import from ${inputPath}`); process.exit(1); }

// Firestore doc ids cannot contain "/"; the real code stays in the `code` field
// (the app indexes on that, not the id), so sanitizing the id is safe.
const docId = (code) => String(code).replace(/\//g, '_').replace(/^\.+$/, '_').slice(0, 200) || '_';

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claim)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}
const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, toValue(val)]));

async function main() {
  const token = await getAccessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const stamped = new Date().toISOString();
  const prepared = docs.map((d) => ({ ...d, updatedAt: d.updatedAt || stamped }));

  const chunkSize = 300;
  let written = 0;
  for (let i = 0; i < prepared.length; i += chunkSize) {
    const chunk = prepared.slice(i, i + chunkSize);
    const writes = chunk.map((d) => ({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/keyReference/${docId(d.code)}`,
        fields: toFields(d),
      },
    }));
    const res = await fetch(`${base}:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`commit ${i}: ${res.status} ${await res.text()}`);
    written += chunk.length;
    console.log(`  wrote ${written}/${prepared.length}`);
  }
  const identified = prepared.filter((d) => d.identified).length;
  console.log(`Imported ${written} keyReference docs into ${projectId} (${identified} identified).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
