// One-time (idempotent) seed of the physical key board into Firestore. Reads
// scripts/keyBoardSeed.json (parsed from the shop's dictated spreadsheet) and
// writes one document per position into the `keyBoard` collection. After this,
// the app owns the data: staff and AI Mode edit it in place and the spreadsheet
// is not consulted again.
//
// Usage:
//   node scripts/seedKeyBoard.mjs <service-account.json> [projectId]
//
// The service account needs Firestore write access (the dev admin SDK SA has it).
// Safe to re-run: each position is written by id, so a second run overwrites with
// the same seed and does not duplicate. It never touches positions you have since
// edited beyond re-seeding their original value, so run it only to (re)bootstrap.

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const [, , saPath, projectArg] = process.argv;
if (!saPath) {
  console.error('Usage: node scripts/seedKeyBoard.mjs <service-account.json> [projectId]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(saPath, 'utf8'));
const projectId = projectArg || sa.project_id;
const seed = JSON.parse(readFileSync(new URL('./keyBoardSeed.json', import.meta.url), 'utf8'));

// Mint an OAuth access token from the service account (RS256-signed JWT grant).
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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// Convert a plain JS value into a Firestore REST typed value.
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
  const docs = seed.map((p) => ({ ...p, updatedAt: p.updatedAt || stamped }));

  const chunkSize = 400;
  let written = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const writes = chunk.map((d) => ({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/keyBoard/${d.position}`,
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
    console.log(`  wrote ${written}/${docs.length}`);
  }
  console.log(`Seeded ${written} keyBoard positions into ${projectId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
