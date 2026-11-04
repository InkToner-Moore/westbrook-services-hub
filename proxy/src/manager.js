// Manager session endpoints for the staff app (Cloudflare Worker module).
//
// The staff share one Firebase login. Manager-only actions (editing the schedule,
// app settings) must be enforced by the SERVER, not a client checkbox, so a client
// PIN alone is not enough: the server has to hand out a credential the database
// will trust. This module does exactly that. A correct PIN is verified here (the
// hash never leaves the server), and on success we mint a Firebase CUSTOM TOKEN
// carrying a `manager: true` claim for the caller's own uid. The client signs in
// with it, and Firestore rules allow manager writes only when
// request.auth.token.manager == true. Locking mints a token WITHOUT the claim.
//
// PINs live in Firestore `accessPins` (admin-only; clients cannot read them),
// hashed with a server-side pepper. The record carries a `role`, so per-employee
// PINs with their own roles can be added later without changing this contract.
//
// Secrets (wrangler secret put):
//   FIREBASE_SA       the DEV service account JSON (one line), used for staging
//   FIREBASE_SA_PROD  the prod service account JSON, used for PROD_ORIGIN
//   PIN_PEPPER        a random string mixed into every PIN hash
//
// The caller's site picks the Firebase project: a request from PROD_ORIGIN uses
// the prod account, anything else the DEV one. The caller must also send its own
// Firebase ID token, verified here against that project, and a token is only ever
// minted for the uid inside it. Without that check anyone with the worker URL
// could mint a session for any uid.
//
// Endpoints (all POST, JSON):
//   /manager/status  {}                                -> { pinSet }
//   /manager/set-pin { idToken, newPin, currentPin? }  -> { ok } | { error }
//   /manager/unlock  { idToken, pin }                  -> { token } | { error }
//   /manager/lock    { idToken }                       -> { token }

const IDENTITY_TOOLKIT_AUD =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const MANAGER_PIN_DOC = 'manager'; // accessPins/manager holds the shop manager PIN
const PROD_ORIGIN = 'https://inktonermoore.ca';
const SECURETOKEN_JWKS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// ---- encoding helpers --------------------------------------------------------

function b64url(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes);
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashPin(pin, pepper) {
  return sha256Hex(`${pepper || ''}:${pin}`);
}

// ---- RS256 signing (JWT) -----------------------------------------------------

// One imported key per service account (DEV and prod share the worker).
const cachedKeys = new Map();
async function signingKey(sa) {
  let key = cachedKeys.get(sa.client_email);
  if (!key) {
    key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    cachedKeys.set(sa.client_email, key);
  }
  return key;
}

// ---- Firebase ID token check ---------------------------------------------------

function b64urlDecode(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Returns the uid of a valid Firebase ID token for `project`, or '' when the
// token is missing, expired, for another project, or not signed by Google.
async function verifiedUid(idToken, project) {
  if (typeof idToken !== 'string') return '';
  const parts = idToken.split('.');
  if (parts.length !== 3) return '';
  let header;
  let claims;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  } catch {
    return '';
  }
  if (header.alg !== 'RS256' || !header.kid) return '';
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== project) return '';
  if (claims.iss !== `https://securetoken.google.com/${project}`) return '';
  if (typeof claims.sub !== 'string' || !claims.sub) return '';
  if (!(claims.exp > now) || !(claims.iat <= now + 300)) return '';

  const res = await fetch(SECURETOKEN_JWKS);
  if (!res.ok) return '';
  const { keys } = await res.json();
  const jwk = (keys || []).find((k) => k.kid === header.kid);
  if (!jwk) return '';
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlDecode(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  return ok ? claims.sub : '';
}

async function signJwt(sa, claims) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await signingKey(sa);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return `${input}.${b64url(new Uint8Array(sig))}`;
}

// A Firebase custom token: the client exchanges it via signInWithCustomToken and
// the developer `claims` land in the ID token (request.auth.token.* in rules).
async function mintCustomToken(sa, uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(sa, {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: IDENTITY_TOOLKIT_AUD,
    uid,
    iat: now,
    exp: now + 3600,
    claims,
  });
}

// A short-lived Google OAuth access token for the Firestore REST API.
async function adminAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(sa, {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('oauth failed');
  return data.access_token;
}

// ---- Firestore (accessPins) --------------------------------------------------

function docPath(project, docId) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/accessPins/${docId}`;
}

async function readPinDoc(sa, project, token, docId) {
  const res = await fetch(docPath(project, docId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore read ${res.status}`);
  const data = await res.json();
  const f = data.fields || {};
  return {
    pinHash: f.pinHash?.stringValue || '',
    role: f.role?.stringValue || 'manager',
  };
}

async function writePinDoc(sa, project, token, docId, pinHash, role) {
  const res = await fetch(docPath(project, docId), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        pinHash: { stringValue: pinHash },
        role: { stringValue: role },
        updatedAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) throw new Error(`firestore write ${res.status}`);
}

// ---- request handling --------------------------------------------------------

function validPin(pin) {
  return typeof pin === 'string' && /^\d{4,8}$/.test(pin);
}

// Returns { status, body }. worker.js applies CORS and serialises.
export async function handleManager(pathname, payload, env, origin) {
  const saJson = origin === PROD_ORIGIN ? env.FIREBASE_SA_PROD : env.FIREBASE_SA;
  if (!saJson) return { status: 500, body: { error: 'not_configured' } };
  let sa;
  try {
    sa = JSON.parse(saJson);
  } catch {
    return { status: 500, body: { error: 'bad_sa' } };
  }
  const project = sa.project_id;
  const pepper = env.PIN_PEPPER || '';

  const token = await adminAccessToken(sa);
  const managerRec = await readPinDoc(sa, project, token, MANAGER_PIN_DOC);

  if (pathname === '/manager/status') {
    return { status: 200, body: { pinSet: !!managerRec?.pinHash } };
  }

  // Everything below acts for a signed-in staff user of this project.
  const uid = await verifiedUid(payload?.idToken, project);
  if (!uid) return { status: 401, body: { error: 'not_signed_in' } };

  if (pathname === '/manager/set-pin') {
    const newPin = payload?.newPin;
    if (!validPin(newPin)) return { status: 400, body: { error: 'bad_pin_format' } };
    // Bootstrapping: if a PIN already exists, the caller must prove the current one.
    if (managerRec?.pinHash) {
      const currentPin = payload?.currentPin;
      const currentHash = validPin(currentPin) ? await hashPin(currentPin, pepper) : '';
      if (currentHash !== managerRec.pinHash) {
        return { status: 403, body: { error: 'wrong_current_pin' } };
      }
    }
    await writePinDoc(sa, project, token, MANAGER_PIN_DOC, await hashPin(newPin, pepper), 'manager');
    return { status: 200, body: { ok: true } };
  }

  if (pathname === '/manager/unlock') {
    if (!managerRec?.pinHash) return { status: 409, body: { error: 'no_pin_set' } };
    const pin = payload?.pin;
    const hash = validPin(pin) ? await hashPin(pin, pepper) : '';
    if (hash !== managerRec.pinHash) return { status: 403, body: { error: 'wrong_pin' } };
    const customToken = await mintCustomToken(sa, uid, { manager: true, role: managerRec.role });
    return { status: 200, body: { token: customToken } };
  }

  if (pathname === '/manager/lock') {
    // Dropping privilege needs no PIN: mint a plain token for the same uid.
    const customToken = await mintCustomToken(sa, uid, { manager: false });
    return { status: 200, body: { token: customToken } };
  }

  return { status: 404, body: { error: 'not_found' } };
}
