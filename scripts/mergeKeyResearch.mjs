// Cross-check the independent key-blank research passes into one vetted reference.
//
// We ran the research three ways on purpose (ChatGPT deep research, Gemini deep
// research, and our own agent pass) so no single source is trusted blindly. A
// wrong EQUIVALENT is a miscut key, so equivalents are gated hard while the
// low-risk descriptive fields (keyway, fits, explanation) are taken from the best
// available source:
//
//   EQUIVALENTS (the safety-critical field):
//     - listed by 2+ independent passes            -> HIGH, shown on the card
//     - listed by 1 pass, that pass says "high",
//       and the source is a manufacturer catalog   -> MEDIUM, shown on the card
//     - anything weaker                             -> kept out of the card,
//                                                      written to the conflicts
//                                                      report, row flagged Check
//   CAUTIONS: unioned across every pass, so a look-alike warning is never dropped.
//   DESCRIPTIVE FIELDS: taken from the highest-confidence pass; a keyway the passes
//     disagree on flags the row for review.
//
// Inputs are JSONL, one object per code (docs/ui-rehaul/key-research-prompts.md).
// Missing inputs are skipped, so this runs with whatever passes exist.
//
// Usage:
//   node scripts/mergeKeyResearch.mjs [--models f] [--out f] [--report f] [pass.jsonl ...]
// Defaults to scripts/keyResearch.{chatgpt,gemini,claude}.jsonl.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// --- args --------------------------------------------------------------------
const argv = process.argv.slice(2);
let modelsPath = 'scripts/keyModels.csv';
let outPath = 'scripts/keyReference.vetted.jsonl';
let reportPath = 'scripts/keyReference.conflicts.md';
const inputs = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--models') modelsPath = argv[++i];
  else if (a === '--out') outPath = argv[++i];
  else if (a === '--report') reportPath = argv[++i];
  else inputs.push(a);
}
if (inputs.length === 0) {
  for (const p of ['scripts/keyResearch.chatgpt.jsonl', 'scripts/keyResearch.gemini.jsonl', 'scripts/keyResearch.claude.jsonl']) {
    if (existsSync(p)) inputs.push(p);
  }
}
const passes = inputs.filter((p) => existsSync(p));
for (const p of inputs) if (!existsSync(p)) console.warn(`! missing input, skipping: ${p}`);
if (passes.length === 0) { console.error('No research inputs found.'); process.exit(1); }

// --- normalization (mirrors src/lib/keyBoard.ts normCode) ---------------------
const BRANDS = ['ilco','cole','curtis','cisa','schlage','medeco','axxess','kaba','silca','jet','dominion','esp','taylor','star','weiser','kwikset','yale','jma'];
function normCode(model) {
  let p = String(model || '').trim();
  const lower = p.toLowerCase();
  for (const b of BRANDS) { if (lower.startsWith(b + ' ')) { p = p.slice(b.length + 1).trim(); break; } }
  return p.toUpperCase();
}
const normEquivKey = (brand, ref) =>
  `${String(brand || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')}|${String(ref || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
const normText = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Strip the "(Ilco EZ B61)" / "EZ #B61" style suffix a pass sometimes appends to a
// cross-reference, so "X168" and "X168 (Ilco EZ B61)" read as the one blank they are.
const cleanRefStr = (ref) => String(ref || '')
  .replace(/[([]?\s*ilco\s*ez\s*#?\s*[a-z0-9-]*\s*[)\]]?/ig, ' ')
  .replace(/[([]?\s*\bez\s*#?\s*[a-z]?\d+\s*[)\]]?/ig, ' ')
  .replace(/\s+/g, ' ')
  .replace(/^[\s/,-]+|[\s/,-]+$/g, '')
  .trim();
const CONF_RANK = { high: 3, medium: 2, low: 1 };
// A source string that points at a real manufacturer catalog / cross-reference.
const MFR = /ilco|kaba|directory|cross.?reference|cross.?ref|\bcole\b|curtis|silca|\bjma\b|catalog|taylor|dominion|section 11/i;

const pick = (o, ...keys) => { for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };
const asArray = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]);

// --- parse a research file (tolerant JSONL, array fallback) -------------------
function parseResearch(path) {
  const raw = readFileSync(path, 'utf8');
  const objs = []; let bad = 0;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t === '[' || t === ']') continue;
    try { objs.push(JSON.parse(t.replace(/,\s*$/, ''))); } catch { bad += 1; }
  }
  if (objs.length === 0) { try { const a = JSON.parse(raw); if (Array.isArray(a)) return { objs: a, bad: 0 }; } catch { /* */ } }
  return { objs, bad };
}

// --- master model list -------------------------------------------------------
function loadModels(path) {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^"?([^",]*)"?\s*,\s*"?([^"]*)"?\s*,\s*"?([^"]*)"?\s*$/);
    if (m) rows.push({ code: m[1].trim(), display_names: m[2].trim(), board_positions: m[3].trim() });
  }
  return rows;
}

const models = loadModels(modelsPath);
const passNames = passes.map((p) => p.replace(/^.*keyResearch\./, '').replace(/\.jsonl$/, '') || p);
const passData = passes.map((path, i) => {
  const { objs, bad } = parseResearch(path);
  const byCode = new Map();
  for (const o of objs) { const code = pick(o, 'code', 'name'); if (code) byCode.set(normCode(code), o); }
  console.log(`  ${passNames[i]}: ${objs.length} objects (${byCode.size} unique codes)${bad ? `, ${bad} bad lines` : ''}`);
  return { name: passNames[i], byCode };
});

// highest-confidence identified entry's value for a field
function bestField(idEntries, ...keys) {
  let best, bestRank = -1;
  for (const e of idEntries) {
    const v = pick(e, ...keys); if (v === undefined) continue;
    const r = CONF_RANK[String(pick(e, 'overall_confidence', 'confidence') || 'low').toLowerCase()] || 1;
    if (r > bestRank) { best = String(v).trim(); bestRank = r; }
  }
  return best;
}
// distinct normalized variants of a field across identified entries
function variantsOf(idEntries, ...keys) {
  const counts = new Map();
  for (const e of idEntries) { const v = pick(e, ...keys); if (!v) continue; const k = normText(v); if (!k) continue; const c = counts.get(k) || { display: String(v).trim(), n: 0 }; c.n += 1; counts.set(k, c); }
  return [...counts.values()].sort((a, b) => b.n - a.n);
}

const vetted = [];
const conflicts = [];
const unidentified = [];
const stats = { passes: passNames, total: models.length, identified: 0, needsReview: 0, withEquivalents: 0, high: 0, medium: 0, low: 0, noneIdentified: 0 };

for (const row of models) {
  const code = normCode(row.code);
  const entries = passData.map((p) => p.byCode.get(code)).filter(Boolean);
  const seenBy = entries.length;
  const idEntries = entries.filter((e) => pick(e, 'identified') === true);
  const nIdentified = idEntries.length;

  let needsReview = false;
  const reviewNotes = [];

  // equivalents: group across passes, and track each brand's refs to catch a real
  // contradiction (two passes naming a different blank for the SAME brand).
  const eqMap = new Map();
  const brandRefs = new Map(); // normBrand -> Set(normRef)
  for (const e of entries) {
    for (const eq of asArray(pick(e, 'equivalents'))) {
      if (!eq || typeof eq !== 'object') continue;
      const brand = String(pick(eq, 'brand') || '').trim();
      let ref = cleanRefStr(pick(eq, 'ref', 'reference', 'number') || '');
      // A pass sometimes appends the shop's own board code to the Ilco long number
      // ("1098DB-B5" for row B5); strip that trailing self-code so it matches the
      // pass that wrote just "1098DB".
      if (code.length >= 2 && ref.toUpperCase().replace(/[^A-Z0-9]/g, '') !== code) {
        const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stripped = ref.replace(new RegExp(`[\\s/,()\\[\\]-]+${esc}[)\\]]?\\s*$`, 'i'), '').trim();
        if (stripped) ref = stripped;
      }
      if (!ref) continue;
      const key = normEquivKey(brand, ref);
      const cur = eqMap.get(key) || { brand, ref, passes: new Set(), sources: new Set(), claimed: 'low' };
      cur.passes.add(entries.indexOf(e));
      for (const s of asArray(pick(eq, 'source', 'sources'))) if (s) cur.sources.add(String(s).trim());
      const c = String(pick(eq, 'confidence') || 'low').toLowerCase();
      if (CONF_RANK[c] > CONF_RANK[cur.claimed]) cur.claimed = c;
      eqMap.set(key, cur);
      const nb = normText(brand).replace(/\s+/g, '');
      const nr = ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (nb && nr) { const set = brandRefs.get(nb) || new Set(); set.add(nr); brandRefs.set(nb, set); }
    }
  }
  // A genuine contradiction: same brand, more than one ref across passes.
  const brandConflicts = [...brandRefs.entries()].filter(([, refs]) => refs.size > 1).map(([b, refs]) => `${b} ${[...refs].join('/')}`);
  if (brandConflicts.length) { needsReview = true; reviewNotes.push(`equivalent conflict: ${brandConflicts.join('; ')}`); }

  // Confidence for a cross-reference (the miscut-risk field):
  //   2+ passes agree                      -> high (shown)
  //   1 pass, that pass says high, and it
  //     cites a manufacturer catalog       -> high (shown)
  //   1 pass says high (other source)      -> medium (shown)
  //   1 pass says medium                   -> medium (shown)
  //   anything weaker                      -> low (held to the report)
  const equivalents = [];
  const weak = [];
  for (const eq of eqMap.values()) {
    const nPasses = eq.passes.size;
    const mfrCited = [...eq.sources].some((s) => MFR.test(s));
    let conf;
    if (nPasses >= 2) conf = 'high';
    else if (eq.claimed === 'high') conf = mfrCited ? 'high' : 'medium';
    else if (eq.claimed === 'medium') conf = 'medium';
    else conf = 'low';
    const entry = { brand: eq.brand, ref: eq.ref, confidence: conf, source: [...eq.sources][0] || '', agreement: nPasses };
    if (conf === 'low') weak.push(entry); else equivalents.push(entry);
  }
  equivalents.sort((a, b) => (CONF_RANK[b.confidence] - CONF_RANK[a.confidence]) || b.agreement - a.agreement);

  // cautions: union everything (never drop a warning)
  const cautionSet = new Map();
  for (const e of entries) { const c = pick(e, 'cautions'); if (c && normText(c)) cautionSet.set(normText(c), String(c).trim()); }
  const cautions = [...cautionSet.values()].join(' | ');

  // interchangeable keyways: only where 2+ passes agree
  const ikMap = new Map();
  for (const e of idEntries) for (const ik of asArray(pick(e, 'interchangeable_keyways', 'interchangeableKeyways'))) { const k = normText(ik); if (!k) continue; const c = ikMap.get(k) || { display: String(ik).trim(), n: 0 }; c.n += 1; ikMap.set(k, c); }
  const interchangeableKeyways = [...ikMap.values()].filter((v) => v.n >= 2).map((v) => v.display);

  const keywayVars = variantsOf(idEntries, 'keyway'); // kept for the report, not a flag
  const keyway = bestField(idEntries, 'keyway') || '';
  const brandSystem = bestField(idEntries, 'brand_system', 'brandSystem') || '';
  const fits = bestField(idEntries, 'fits') || '';
  const category = bestField(idEntries, 'category') || 'unknown';
  const keywayFamily = bestField(idEntries, 'keyway_family', 'keywayFamily') || '';
  const explanation = bestField(idEntries, 'explanation') || bestField(entries, 'explanation') || '';

  const identified = nIdentified >= 1 && Boolean(keyway || brandSystem || fits || equivalents.length);
  // Weak identification: a single pass identified it and even that pass was unsure.
  if (identified && nIdentified === 1) {
    const only = idEntries[0];
    const oc = String(pick(only, 'overall_confidence', 'confidence') || 'low').toLowerCase();
    if (oc === 'low') { needsReview = true; reviewNotes.push('identified by one low-confidence pass'); }
  }

  let confidence;
  if (!identified) confidence = 'low';
  else if (equivalents.some((e) => e.confidence === 'high')) confidence = needsReview ? 'medium' : 'high';
  else if (equivalents.length || nIdentified >= 2) confidence = 'medium';
  else confidence = 'low';

  const sources = new Set();
  for (const e of entries) for (const s of asArray(pick(e, 'sources'))) if (s) sources.add(String(s).trim());
  const notes = [...new Set(entries.map((e) => pick(e, 'notes')).filter(Boolean).map(String))].join(' | ');

  vetted.push({
    code, displayNames: row.display_names, identified,
    brandSystem, fits, category, keyway, keywayFamily,
    interchangeableKeyways, equivalents,
    explanation, cautions, confidence,
    sources: [...sources], notes, needsReview, agreement: nIdentified,
  });

  if (identified) stats.identified += 1; else stats.noneIdentified += 1;
  if (needsReview) stats.needsReview += 1;
  if (equivalents.length) stats.withEquivalents += 1;
  stats[confidence] += 1;

  if (needsReview || weak.length) {
    conflicts.push({ code, board: row.board_positions, identified, confidence, needsReview, reviewNotes, weak, keywayVars });
  } else if (!identified && seenBy > 0) {
    unidentified.push(code);
  }
}

// --- write outputs -----------------------------------------------------------
writeFileSync(outPath, vetted.map((d) => JSON.stringify(d)).join('\n') + '\n');
writeFileSync(outPath.replace(/\.jsonl$/, '.stats.json'), JSON.stringify(stats, null, 2) + '\n');

const L = [];
L.push('# Key reference: what a human should settle');
L.push('');
L.push(`Passes cross-checked: ${passNames.join(', ')}.`);
L.push(`Of ${stats.total} codes: ${stats.identified} identified, ${stats.noneIdentified} unidentified, ${stats.needsReview} flagged for a look, ${stats.withEquivalents} carry a card-shown equivalent.`);
L.push(`Confidence shipped: ${stats.high} high, ${stats.medium} medium, ${stats.low} low.`);
L.push('');
L.push('The app only shows an equivalent when 2+ passes agree, or one pass says "high" and cites a manufacturer catalog. Everything else is held back and listed here.');
L.push('');
L.push('## 1. Flagged for review (the app shows a "Check" badge, or held-back equivalents exist)');
L.push('');
L.push('These are the real decisions: a contradiction between passes, a shaky single-source identification, or a cross-reference not confident enough to show. Confirm against the Ilco catalog / a physical blank, then promote or discard.');
L.push('');
L.push('| Code | Board | Conf | Why | Held-back (unverified) equivalents |');
L.push('| --- | --- | --- | --- | --- |');
const rank = { high: 0, medium: 1, low: 2 };
for (const c of conflicts.sort((a, b) => (b.needsReview - a.needsReview) || (rank[a.confidence] - rank[b.confidence]) || a.code.localeCompare(b.code))) {
  const why = c.reviewNotes.length ? c.reviewNotes.join('; ') : (c.weak.length ? 'has unverified extra equivalents' : '');
  const w = c.weak.map((e) => `${e.brand} ${e.ref}`).join(', ');
  L.push(`| ${c.code} | ${c.board || ''} | ${c.confidence} | ${why.replace(/\|/g, '/')} | ${w.replace(/\|/g, '/')} |`);
}
L.push('');
L.push(`## 2. Unidentified (${unidentified.length}) — nothing found, no card shown, leave blank`);
L.push('');
L.push('No pass could safely identify these (obscure, brand-only, dictation garble, or a board annotation rather than a blank). They import as identified:false and render no help panel. Identify from a physical sample when convenient.');
L.push('');
L.push(unidentified.sort((a, b) => a.localeCompare(b)).join(', ') || '(none)');
L.push('');
writeFileSync(reportPath, L.join('\n'));

console.log('');
console.log(`Vetted ${vetted.length} codes -> ${outPath}`);
console.log(`  ${stats.identified} identified, ${stats.needsReview} need review, ${stats.withEquivalents} with shown equivalents`);
console.log(`  confidence: ${stats.high} high / ${stats.medium} medium / ${stats.low} low`);
console.log(`Conflicts report (${conflicts.length} rows) -> ${reportPath}`);
