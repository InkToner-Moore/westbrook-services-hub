// One-time copy of Firestore documents from DEV to PROD, preserving typed fields.
// Usage: node scripts/copyDevToProd.mjs <dev-sa.json> <prod-sa.json> <collection> [<collection>...] [--write]
// Create-only: existing documents are skipped and commits require exists: false.
// Dry-run by default. Pass --write to create missing documents. Requires Node >=18.

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const usage = 'Usage: node scripts/copyDevToProd.mjs <dev-sa.json> <prod-sa.json> <collection> [<collection>...] [--write]';
const allowedCollections = new Set(['keyBoard', 'keyReference', 'refillInventory']);

// Mint an OAuth access token from the service account (RS256-signed JWT grant).
async function getAccessToken(sa) {
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

async function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes('--write');
  const [devPath, prodPath, ...requestedCollections] = argv.filter((a) => a !== '--write');
  if (!devPath || !prodPath || requestedCollections.length === 0) throw new Error(usage);
  const dev = JSON.parse(readFileSync(devPath, 'utf8'));
  const prod = JSON.parse(readFileSync(prodPath, 'utf8'));
  if (typeof dev.project_id !== 'string' || !dev.project_id.endsWith('-dev')) {
    throw new Error(`Refusing DEV project ${dev.project_id}: project_id must end in -dev.`);
  }
  if (typeof prod.project_id !== 'string' || !prod.project_id || prod.project_id.endsWith('-dev')) {
    throw new Error(`Refusing PROD project ${prod.project_id}: project_id must be nonempty and must not end in -dev.`);
  }
  for (const collection of requestedCollections) {
    if (!allowedCollections.has(collection)) throw new Error(`Refusing collection ${collection}: allowed collections are keyBoard, keyReference, refillInventory.`);
  }

  const [devToken, prodToken] = await Promise.all([getAccessToken(dev), getAccessToken(prod)]);
  const base = (project) => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents`;
  const devBase = base(dev.project_id);
  const prodBase = base(prod.project_id);
  let failedBatches = 0;
  console.log(`${write ? 'WRITE' : 'DRY RUN'}: ${dev.project_id} -> ${prod.project_id}`);

  for (const collection of new Set(requestedCollections)) {
    const documents = [];
    let pageToken;
    do {
      const url = new URL(`${devBase}/${collection}`);
      url.searchParams.set('pageSize', '300');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${devToken}` } });
      if (res.status !== 200) throw new Error(`list DEV ${collection}: ${res.status} ${await res.text()}`);
      const page = await res.json();
      documents.push(...(page.documents || []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    const missing = [];
    let exists = 0;
    for (const document of documents) {
      const id = document.name.slice(document.name.lastIndexOf('/') + 1);
      const res = await fetch(`${prodBase}/${collection}/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${prodToken}` },
      });
      if (res.status === 200) {
        exists += 1;
        await res.arrayBuffer();
      } else if (res.status === 404) {
        await res.arrayBuffer();
        missing.push({ id, fields: document.fields });
      } else {
        throw new Error(`read PROD ${collection}/${id}: ${res.status} ${await res.text()}`);
      }
    }

    if (!write) {
      console.log(`${collection}: ${documents.length} in dev, ${missing.length} would copy, ${exists} already in prod`);
      console.log(`  First 10 ids that would copy: ${JSON.stringify(missing.slice(0, 10).map((doc) => doc.id))}`);
      continue;
    }

    let copied = 0;
    let failed = 0;
    for (let i = 0; i < missing.length; i += 400) {
      const batch = missing.slice(i, i + 400);
      const writes = batch.map(({ id, fields }) => ({
        update: { name: `projects/${prod.project_id}/databases/(default)/documents/${collection}/${id}`, fields },
        currentDocument: { exists: false },
      }));
      try {
        const res = await fetch(`${prodBase}:commit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${prodToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes }),
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        await res.arrayBuffer();
        copied += batch.length;
      } catch (error) {
        failedBatches += 1;
        failed += batch.length;
        console.error(`${collection}: failed batch ${Math.floor(i / 400) + 1}, ${batch.length} documents: ${error.message}`);
        console.error(`  Batch ids: ${JSON.stringify(batch.map((doc) => doc.id))}`);
      }
    }
    console.log(`${collection}: ${documents.length} in dev, ${copied} confirmed copied, ${exists} skip, exists (already in prod), ${failed} in failed batches`);
  }
  if (failedBatches) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
