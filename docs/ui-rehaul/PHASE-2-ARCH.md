# UI Rehaul - Phase 2 architecture contract

The shared seam every Phase 2 agent codes to. Read this AFTER `DESIGN-SPEC.md`
(the look) and `PHASE-2.md` (the what). This file is the HOW: the interfaces that
let several agents build in parallel without stepping on each other.

Rule of the road: **each agent owns a disjoint set of files** (the ownership map
below). If you need to change a file you do not own, do not edit it - instead
export what you need from a file you DO own, or leave a one-line note in your final
report so the integrator wires it. The only files everyone reads but nobody but its
owner edits are the "shared contract" files (types, registries).

Session branch: `ui-rehaul-phase2` (already created, stacked on `ui-rehaul`).
Do NOT commit, push, or run `git`/`but` - the integrator commits via GitButler.
Do NOT run `yarn build`/`yarn dev` (concurrent builds race on `dist/`). Verify with:

```sh
export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
cd /home/user/Programming/InkTonerMoore/westbrook-services-hub
corepack yarn tsc --noEmit          # type-check only, no dist/ (safe in parallel)
corepack yarn eslint <your changed files>
```

The repo baseline already fails lint on pre-existing files (dataExport.ts,
validation.ts, tailwind.config.ts, firestore.ts:42/54 generic `any`, some ui/*,
benign react-refresh warnings on shared-hook exports). Do not "fix" those. Your
bar: no NEW errors on the files you touched, and `tsc --noEmit` clean.

---

## 1. The AI Mode action model (six top-level actions)

The user-facing model is six actions. Internally we keep the existing action ids
where they already work (minimal churn) and PRESENT them under the six names.

| User-facing action | Internal `AiAction` id(s) | Status |
|---|---|---|
| Purchase | `purchase` (NEW) | Wave 3 |
| Receipt | `receipt` (+ `subtype`) | exists, reworked Wave 2 |
| Record | `cartridge_create`, `cartridge_status`, `cartridge_list`, `cartridge_modify` | exists, reworked Wave 2 (surfaced as "Record") |
| Note | `note` | exists, reworked Wave 2 |
| Inventory | `inventory` (+ `inventory_lookup` NEW for read) | exists, reworked Wave 2 |
| Timesheet | `timesheet` (NEW) | Wave 3 |

Kept as tools (NOT removed): `track`, `directory`. Removed entirely: `followup`.

**Why keep `cartridge_*` ids instead of renaming to `record_*`:** the Firestore
collections, `lib/cartridges.ts`, the `orderStatus` public mirror, and the
`StaffCartridges` page all key off the cartridge model. Renaming the data would be
risky and is out of scope. "Record" is a presentation label. The presentation
layer (`intentOptions.ts` `routeLabel`, chat copy, the artifact card title, tile
label if changed) says "Record"; the ids and Firestore stay `cartridge`.

### 1.1 `AiAction` union (owned by A1, in `src/ai/types.ts`)

Add `purchase`, `timesheet`, `inventory_lookup`. Remove `followup`. Result:

```ts
export type AiAction =
  | 'receipt'
  | 'cartridge_create' | 'cartridge_modify' | 'cartridge_status' | 'cartridge_list'
  | 'note'
  | 'inventory'         // create/update inventory (write)
  | 'inventory_lookup'  // "is the HP 65 in stock?" (read, immediate)
  | 'directory'
  | 'purchase'          // Wave 3
  | 'timesheet'         // Wave 3 (may fan into subtypes; A1 leaves a stub + TODO)
  | 'track'
  | 'clarify'
  | 'unknown';
```

`followup` is gone from the union, `describeIntent`, `TAB_NAMES`, `ROUTES`,
`FIELD_SPECS`, `specIdFor`, the executor registry, `intentOptions`, and
`routingSchema`/proxy. Grep `followup` and `requests` and remove every hit that is
about the Follow-Ups feature (keep unrelated words).

### 1.2 Compound: "chain around one transaction"

An utterance like "refill for Sarah, HP 65, $34, charge her card and print a label"
is ONE Record/Receipt intent that also PAYS and prints a LABEL. Model this as an
optional attachment on the primary intent, NOT as multiple independent intents:

```ts
// on Intent (types.ts, owned by A1)
export interface IntentAttachments {
  pay?: boolean;      // also send to Moneris + record a transaction (Purchase)
  label?: boolean;    // also produce a 4x6 label
}
// Intent gains:  attach?: IntentAttachments;
```

- The deterministic router sets `attach.pay` when the text has a pay cue
  ("charge", "pay", "card", "tap", "debit", "credit", "moneris") and `attach.label`
  on a label cue ("label", "4x6", "sticker", "print a label"). A1 wires this in
  `populateIntentFields` / a small `extractAttachments(text)` in `extract.ts`.
- The confirmation slip's FOOT (owned by A2) renders `attach.pay` / `attach.label`
  as two small toggles ("Also charge card", "Also print 4x6 label") so the counter
  can turn them on/off before Confirm. A2 reads `workingIntent.attach`.
- On Confirm, `confirmArtifactIntent` (A1, context.tsx) runs the primary action,
  then if `attach.pay` runs the Purchase recorder (Wave 3 provides
  `recordPurchase(intent)`; until then A1 leaves a guarded call behind a
  `typeof` check or a registry lookup so it is a no-op when absent), then if
  `attach.label` calls the shared label builder (Wave 2 Receipt provides it).

Wave 1 SHIPS the plumbing (types, extraction, foot toggles, the confirm-chain
seam with safe no-ops). Wave 2/3 fill in `recordPurchase` and the label builder.
Keep it simple: exactly these two attachments, nothing more this session.

---

## 2. Field specs stay declarative; make them per-action-friendly

`fieldSpecs.ts` (A1) keeps its shape (`FieldSpec`, `FIELD_SPECS`, `specIdFor`,
`getFieldSpecs`, `isFieldVisible`, `missingRequired`). Wave 2 agents ADD or REVISE
their action's entry in `FIELD_SPECS` and its branch in `specIdFor`. To avoid
Wave-2 agents all editing this one file at once, A1 splits the map so each action's
specs come from a per-action constant that A1 can import, e.g.:

```ts
// fieldSpecs.ts keeps FIELD_SPECS as the registry, but sources each action's
// array from a named export so a Wave-2 agent edits ONLY its own constant later
// if we choose to relocate. For Wave 1, leaving FIELD_SPECS inline is fine;
// just make sure specIdFor covers every action above and 'followup' is gone.
```

Wave 2 note: if two agents must both touch `fieldSpecs.ts`, they will be scheduled
so their edits are to different keys; the integrator merges. Prefer adding a new
key over restructuring shared code.

### 2.1 Confirmation slip: per-field OMIT toggle (A2)

New requirement from Parsa: on the slip, the circle to the LEFT of each field is a
toggle. Clicking it OMITS that field from the receipt/record EVEN IF it is a
required/blocking field. Omitted fields:
- render struck-through / dimmed with the circle empty (included = filled circle),
- are excluded from `missingRequired` so Confirm is not blocked by an omitted field,
- are dropped from the built receipt/record (their value is not written).

A2 owns this in `ConfirmationCheck.tsx` + `useConfirmationDraft`: track an
`omitted: Set<string>` in the draft; expose it on `workingIntent` (e.g. drop
omitted keys, or carry `intent.fields[key].omitted = true` - A2 picks, documents
it, and A1's `confirmArtifactIntent` + Wave-2 builders must honor it). Simplest:
when building `workingIntent`, DELETE omitted keys from `fields`. Then downstream
never sees them and blocking is naturally satisfied. Document the choice in your
report so builders know.

---

## 3. Artifact renderer registry (the seam that unlocks parallel cards)

Today `ArtifactRail` hard-switches on `artifact.kind` (`confirmation` special-cased;
everything else -> `ArtifactPanel` + `ArtifactActions`). Phase 2 needs a bespoke
card per action-state. We replace the hard switch with a REGISTRY so each Wave-2/3
agent drops in its own renderer file and registers it, touching no shared switch.

### 3.1 Types (owned by A1, `src/ai/types.ts`)

`ArtifactKind` becomes an extensible string. Keep the existing kinds and add the
Phase-2 ones the cards will need. Use a string union but keep it OPEN by also
allowing `(string & {})` so a new kind does not force a types.ts edit:

```ts
export type KnownArtifactKind =
  | 'receipt' | 'tracking' | 'order' | 'list' | 'confirmation' | 'none'
  | 'payment'        // Purchase (Wave 3)
  | 'refill'         // Record card (Wave 2)
  | 'inventory'      // Inventory result/edit card (Wave 2)
  | 'note'           // Note card (Wave 2)
  | 'timesheet';     // Timesheet card (Wave 3)
export type ArtifactKind = KnownArtifactKind | (string & {});
```

`ArtifactState` stays `{ kind, title?, data? }`.

### 3.2 The registry (owned by A2, new file `src/components/shell/artifactRegistry.tsx`)

```ts
export interface ArtifactRenderer {
  // The scrollable body of the rail for this kind.
  Body: React.FC<{ data: unknown }>;
  // Optional pinned foot (actions). If absent, the rail shows the generic
  // ArtifactActions for this kind (download/print/open-on-carrier as today).
  Foot?: React.FC<{ data: unknown }>;
}
export const ARTIFACT_RENDERERS: Record<string, ArtifactRenderer> = {
  // A2 registers 'confirmation' here (moving today's ConfirmationArtifact in).
  // Wave-2/3 agents ADD their kind: ARTIFACT_RENDERERS.refill = {...}
};
```

`ArtifactRail` (A2) looks up `ARTIFACT_RENDERERS[artifact.kind]`; if found, renders
`Body` (+ `Foot` or generic `ArtifactActions`); if not found, FALLS BACK to today's
`ArtifactPanel` + `ArtifactActions` (so nothing breaks before a card exists). This
fallback is what lets Wave 1 ship before any new card is written.

**How Wave-2/3 agents register without editing the registry file:** each agent
writes its renderer in ITS OWN file under `src/components/ai/artifacts/<Name>.tsx`
and exports a `register(reg)` function; the integrator adds one import + call in
`artifactRegistry.tsx`. So agents never edit `artifactRegistry.tsx` directly - they
export a registration hook and the integrator wires the ~1 line. State this file
path in your report.

Card design bar (all cards): follow DESIGN-SPEC. The slip is the hero - titled
header with the tool icon in that tool's hue, ruled `divide-y` ledger, money/IDs in
`font-mono tabular-nums`, one total rule. Design EVERY state: create, view, edit,
success, error, empty. Make the counter feel the magic. Theme via `themeClasses`.

---

## 4. GST / tax two-way helper (owned by A1, `src/lib/canadaTax.ts`)

Receipts must let the counter type EITHER the pre-tax price OR the tax-inclusive
price and auto-derive the other, and show the after-GST total when GST is on.
A1 adds pure helpers (no UI):

```ts
export const GST_RATE = 0.05;
// net -> gross and back, rounded to cents. Guard divide-by-zero / null.
export function grossFromNet(net: number, rate?: number): number;
export function netFromGross(gross: number, rate?: number): number;
export function taxOf(net: number, rate?: number): number;
```

`canadaTax.ts` already holds province GST/PST/HST for shipping - ADD these, do not
remove the province logic. Wave 2 Receipt owns the two-way INPUT UI (a money field
with a "tax incl." toggle that flips which value is authoritative and recomputes the
other on each edit). A1 just ships the math.

---

## 5. File ownership map

**A1 (AI engine foundation) owns and may edit:**
- `src/ai/types.ts`, `src/ai/fieldSpecs.ts`, `src/ai/extract.ts`,
  `src/ai/intentOptions.ts`, `src/ai/context.tsx`, `src/ai/corrections.ts`
- `src/ai/providers/deterministic.ts`, `providers/index.ts`, `providers/llm.ts`,
  `providers/routingSchema.ts`
- `src/ai/actions/index.ts`, `actions/types.ts`, `actions/collections.ts`
  (remove `executeFollowup`), `actions/cartridge.ts`, `actions/receipt.ts`,
  `actions/track.ts`, `actions/cartLines.ts`
- `src/lib/canadaTax.ts` (ADD gst helpers)
- `src/components/shell/tiles.ts` (remove Follow-Ups tile; leave Timesheet disabled)
- `src/App.tsx` (remove the `requests` route + its import), delete
  `src/pages/StaffRequests.tsx`
- `docs/ui-rehaul/HANDOFF.md` (append a Wave-1 note) - optional

**A2 (shell/artifact/layout) owns and may edit:**
- `src/components/shell/StaffShell.tsx`, `ArtifactRail.tsx`, and NEW
  `src/components/shell/artifactRegistry.tsx`
- `src/components/ai/ArtifactActions.tsx`, `ArtifactPanel.tsx`,
  `ConfirmationCheck.tsx`
- `src/pages/StaffTracking.tsx`, `src/components/SmartTracker.tsx`
- The tool pages ONLY for min-width / shell-responsiveness (`StaffCartridges.tsx`,
  `StaffReceipts.tsx`, `StaffNotes.tsx`, `StaffInventory.tsx`, `StaffDirectory.tsx`)
  - keep edits to layout wrappers/spacing; do NOT change their logic. If a broad
  restyle is needed, note it for Wave 2 rather than doing it here.

**Neither edits the other's files.** Coordination points (A2 depends on A1):
- `ArtifactKind` + `IntentAttachments` + `attach` on `Intent` (A1 types.ts) -> A2
  reads them. Both code to the shapes in sections 1.2 and 3.1 above.
- `artifactRegistry.tsx` (A2) references `ARTIFACT_RENDERERS`; A1 does not touch it.
- The confirm-chain seam (A1 context.tsx) honors `attach` + omitted fields (A2's
  draft shape). A1: on confirm, if `attach.pay`/`attach.label`, call a registry/
  optional function that is a no-op when the Wave-2/3 provider is absent.

---

## 6. Hard invariants (from CLAUDE.md + DESIGN-SPEC, do not violate)

- Prod path untouched: never edit `.github/workflows/deploy.yml`, `public/CNAME`,
  and do not change `proxy/wrangler.toml`'s `ALLOWED_ORIGIN`.
- `orderStatus` never widened; cartridge 3-status enum intact.
- Model only routes; deterministic code owns every business value (candidates fill
  only empty fields, marked guessed - unchanged).
- No em dashes anywhere (code, comments, UI copy, commits). Use "to" or a comma.
- Theme via `themeClasses` from `ThemeContext`, not raw `dark:` variants, matching
  the surrounding file.
- Reuse existing lib helpers (`lib/firestore.ts` CRUD + id generators,
  `lib/cartridges.ts`, `lib/simpleReceipt.ts`) - do not re-implement Firestore
  access inline.
- Keep every existing feature working (inventory price lists, cartridge manual
  delete, receipt/cart flow, tracking, auth). Do not break a working feature to hit
  a visual - flag it instead.
- No new dependency without calling it out in your report.
- One receipt path: everything is the open receipt, Finish prints it. Do not add a
  second "download now" path or a mode toggle.

## 6b. Wave 2 ownership map (Receipt / Record / Note+Inventory / Slip)

Wave 1 landed. Four Wave-2 agents build in parallel on DISJOINT files. Each writes
its bespoke artifact card in its OWN file under `src/components/ai/artifacts/` and
exports `export function register(reg: ArtifactRegistry) { reg.<kind> = {...} }`.
Agents do NOT edit `artifactRegistry.tsx` (the integrator adds the one import+call).

Shared engine files (`fieldSpecs.ts` except where noted, `providers/deterministic.ts`,
`actions/index.ts`, `intentOptions.ts`, `context.tsx`, `routingSchema.ts`,
`proxy/worker.js`) are INTEGRATOR-OWNED in Wave 2: if you need a routing cue, an
executor registration, a describeIntent copy tweak, or a spec change outside your
owned files, put a precise "shared-file change request" in your report and the
integrator applies it. Do not edit them yourself.

- **W2-Slip** owns `src/components/ai/ConfirmationCheck.tsx` and `src/ai/fieldSpecs.ts`.
  Delivers: clearer, subtype-contextual field labels (fix the confusing "Model" on a
  supplies sale, e.g. selling a custom box must not ask for "Model"); GST TWO-WAY
  input (a money field with a "tax incl." toggle: type either pre-tax or tax-inclusive
  and the other auto-updates, using `grossFromNet`/`netFromGross`/`taxOf` from
  `@/lib/canadaTax`; show the after-GST total when GST is on); a new `select` FieldKind
  with a dropdown, and make Note's `noteCategory` a fixed dropdown (categories:
  General, Customer, Supplier, Repair, Reminder, Other - export them). Keep the
  omit-toggle + attach toggles working.
- **W2-Receipt** owns `src/ai/actions/receipt.ts`, `src/lib/simpleReceipt.ts`,
  `src/ai/receiptOutput.ts`, `src/ai/cart.ts`, `src/ai/actions/cartLines.ts`,
  `src/components/ai/ShipmentItemsEditor.tsx`, `src/ai/actions/label.ts` (register
  the real 4x6 label builder via `registerLabelBuilder`), and card
  `src/components/ai/artifacts/ReceiptCard.tsx` (kind `'receipt'`). Delivers: the
  receipt artifact card with BOTH full-sheet and 4x6 preview + print + download,
  after-GST totals, contextual line naming. Export a `registerReceiptSeams()` that
  calls `registerLabelBuilder`; note it for the integrator to invoke once at startup.
- **W2-Record** owns `src/ai/actions/cartridge.ts`, `src/lib/cartridges.ts`, and card
  `src/components/ai/artifacts/RecordCard.tsx` (kind `'refill'`; update the cartridge
  executors to emit that kind). Delivers: record a NEW refill, CHANGE STATUS, and VIEW
  one, each a purpose-built card state; ALWAYS show and allow a 4x6 label download
  regardless of whether there is a price (reuse the shared label builder seam or
  `simpleReceipt`). Do not widen `orderStatus`; keep the 3-status enum.
- **W2-NoteInv** owns `src/ai/actions/collections.ts` (note + inventory +
  inventory_lookup executors; leave directory alone) and cards
  `src/components/ai/artifacts/NoteCard.tsx` (kind `'note'`) and
  `src/components/ai/artifacts/InventoryCard.tsx` (kind `'inventory'`). Delivers: the
  note card; the inventory RESULT card (stock badge, price in mono, and a key
  LOCATION slot that reads a future model->cut-code map - scaffold it now, show
  "location coming soon" when absent) rendering the `inventory` artifact shape A1
  defined (see section 1's report: `{query, keys[], refills[], total}`); plus an
  inventory EDIT/update state. Reuse `lib/firestore.ts` helpers.

W2-Receipt and W2-Slip both concern receipts but own different files (card vs slip);
coordinate only through the report. None of the four edit another's files.

## 7. What to put in your final report

- Every file you created or changed, one line each.
- Any place you touched a shared shape another agent/integrator must know about
  (new exports, the omit-field encoding you chose, registration hook path/name).
- `tsc --noEmit` result and eslint result on your files.
- Anything you deferred or that needs the integrator to wire (the ~1-line registry
  or executor-registry additions).
- Anything you could NOT verify (Firestore writes need real staging config).
