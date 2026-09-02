# AI Mode - Research Findings

Consolidated from four research passes (two codebase recon, two external). This is
the ground truth the design and plan are built on. Dated 2026-09-02.

## A. Codebase reality (what we build on)

### Routing and chrome
- `src/App.tsx` holds a flat route table. `/staff/*` routes are wrapped in
  `ProtectedRoute` (auth gate) and mostly also `FeatureProtectedRoute`, whose
  `isFeatureEnabled` is a hardcoded `() => true` no-op. Feature gating is dead
  scaffolding; do not build on it.
- Chrome is **inconsistent**: only `StaffTracking`, `StaffNotes`, `StaffRequests`
  use `StaffLayout`. `StaffDashboard`, `StaffReceipts`, `StaffCartridges`,
  `StaffDirectory`, `StaffInventory` hand-roll their own header/background markup.
  There is **no single chrome chokepoint**.
- Consequence: a global tab bar / AI overlay must be mounted **once at a
  layout-independent level** (a fixed-position component rendered inside
  `BrowserRouter` but outside `Routes`, reacting to `location.pathname`). This
  touches zero page components and cannot break existing screens.
- No tab/overlay concept exists today. Navigation is hard route changes.

### Data + helpers (`src/lib/`)
- `firestore.ts` generic CRUD: `getCollection<T>(name, orderField?)`,
  `queryCollection<T>(name, field, value)` (== only), `getDocument`,
  `setDocument` (full overwrite), `updateDocument` (partial), `deleteDocument`.
  Reads merge `id`. ID gens: `generateOrderId` `ORD-`, `generateNoteId` `NOTE-`,
  `generateRequestId` `REQ-`, `generateInventoryId` `INV-` (random 6-char, not
  sequential). `generateDirectoryId` `DIR-` lives inside `StaffDirectory.tsx`.
- All pages fetch one-shot on mount (no realtime). AI writes must trigger the
  same refetch pattern; there is no shared store.
- **No fetch/axios/outbound-API pattern exists anywhere.** We establish the first
  network-call convention from scratch. Only `import.meta.env` uses today are
  Firebase config + `VITE_NODE_ENV` + `VITE_DEV_BYPASS_AUTH`.

### Receipts
- `src/lib/simpleReceipt.ts` `generateSimpleReceiptPdf(opts, size)` is the only
  clean, reusable generator. Pure jsPDF vector drawing (no html2canvas anywhere).
  Supports `ReceiptSize = '4x6' | 'letter'`, GST lines, itemized rows, blank-row
  skipping. Options: `title, identifierLabel, identifierValue, date, rows[],
  items?[], price, gst?, fileNameBase`. `generateReceiptNumber(prefix)` =
  `PREFIX + YYMMDDHHmm`. `GST_RATE = 0.05`.
- Shipping and key receipts are **separate hand-rolled jsPDF functions inline in
  `StaffReceipts.tsx`** (`generateShippingPDF`, `generateKeyPDF`), letter-only,
  not reusable. To drive all four receipt types from chat at 4x6 + letter, extract
  these into `simpleReceipt.ts`-style helpers (do not duplicate).

### Cartridge orders (`src/lib/cartridges.ts`, `StaffCartridges.tsx`)
- `CartridgeOrder { id, customerName, customerPhone, customerEmail?,
  cartridges: CartridgeLine[], status: 'in_progress'|'ready'|'picked_up',
  dateReceived, dateCompleted?, notes }`. `CartridgeLine { brand, model, type,
  price? }`. Helpers: `describeCartridge`, `cartridgesSubtotal`,
  `toStoredCartridge` (strips undefined price), `readCartridgeLines` (legacy shim).
- Create = `setDocument` + `syncOrderStatus`. Status change = `updateDocument` +
  `syncOrderStatus`. No hard delete anywhere (soft-archive to `deletedOrders`).
- **The 3-status enum is load-bearing** on PublicHome (`STATUS_LABELS`/`COLORS`
  keyed on exactly those three). Never widen it.

### orderStatus mirror (`src/lib/orderStatus.ts`)
- `OrderStatusDoc { orderId, customerPhone, customerLastName (normalized), status }`.
  Public-readable. `normalizeLastName`, `lastNameOf`. **Never add fields.**
  Written 1:1 by `syncOrderStatus`; PublicHome reads via `queryCollection` on
  `customerLastName`.

### Other collections
- Notes: `notes`/`deletedNotes`, `Note { id, title, content, category, createdAt,
  updatedAt }`, `noteSchema` (zod) is the one real validation in use.
- Inventory: `keyInventory`/`deletedKeyInventory` (KEY inventory only),
  `KeyInventoryItem { id, model, inStock, createdAt, updatedAt }`.
- Directory: `directoryLinks`, `DirectoryLink { id, name, description, url,
  category, iconKey, colorKey, isAdmin?, order, createdAt, updatedAt }`, seeds.
- Requests: `customerRequests`/`completedCustomerRequests`,
  `CustomerRequest { id, customerName, customerPhone, item, createdAt }`. No status
  field; open vs completed = which collection. (Brief renames to Customer Follow-Ups.)
- Dead/unused zod schemas exist (`inventoryItemSchema`, `cartridgeSchema`, etc.) -
  do not assume they reflect real shapes.

### Validation (`src/utils/validation.ts`)
- Reusable: `phoneSchema`, `emailSchema`, `requiredStringSchema`,
  `numberSchema`/`positiveNumberSchema`, `trackingNumberSchema`,
  `receiptNumberSchema`, `sanitizeInput`, `sanitizePhone`, `sanitizeTrackingNumber`,
  `validateField`, `validateForm`. Reuse these for chat field validation.

### Theme (`src/contexts/ThemeContext.tsx`)
- `useTheme()` -> `{ isDarkMode, toggleTheme, themeClasses }`. `themeClasses` is a
  bag of Tailwind strings: `background`, `backgroundFloating.{purple,blue,indigo}`,
  `header`, `text.{primary,secondary,muted,accent,inverted}`, `gradient.title`,
  `card.{primary,secondary,accent}`, `button.{primary,secondary,ghost,danger,success}`,
  `input`, `link`, `status.{success,warning,error,info}`,
  `interactive.{hover,active,focus}`. Consumed via template-literal interpolation.
  New UI must pull `useTheme()` and use these keys, not raw `dark:` variants.

### shadcn/ui available
- Notable for this build: `sheet` (slide-over -> Artifact panel + chat drawer),
  `command` (cmdk), `dialog`, `drawer`, `tabs`, `sidebar` (unused primitive),
  `popover`, `hover-card` (courier hover-to-type), `scroll-area`, `badge`,
  `resizable`, `sonner`/`toast`.

### SmartTracker (`src/components/SmartTracker.tsx`)
- No real auto-detection today (manual courier buttons). Builds a deep link and
  does `window.location.href = ...` (full navigation away). No fetch, no callback
  API. To make it agent-drivable non-destructively, add props (e.g. controlled
  value + `onBeforeNavigate`) rather than rewrite.

## B. Cheap-LLM strategy (external, verified ~Sept 2026)

### Real models (the brief's names were partly fictional)
- "GPT-5.6 Luna" is not real. "Gemini 3.5 Flash-Lite" is real.
- Cheapest capable structured-extraction tiers:
  - **Gemini Flash-Lite** (`gemini-2.5-flash-lite` ~$0.10/$0.40; 3.x lines exist,
    pricier). `responseSchema` + `responseMimeType: application/json`. Cheapest floor.
  - **GPT-5-nano** (~$0.05/$0.40). `response_format: json_schema`, `strict:true`.
  - **Claude Haiku 4.5** (`claude-haiku-4-5`, ~$1/$5). Strict tool-use JSON schema;
    single-SDK story, matches our `claude-api` tooling.
- At this shop's volume (hundreds of calls/day, ~200-300 output tokens each),
  provider cost difference is a rounding error. Pick on integration simplicity +
  structured-output reliability, not token price.

### Determinism patterns (the core of "magic on a cheap model")
- **Schema-first**, not prose. Enums + required + `additionalProperties:false`.
- **Router + extractor split**: tiny classification call ({action, confidence})
  then an action-specific extraction schema. Smaller schemas hallucinate less.
- **Per-field provenance in the schema**: every extracted value carries a sibling
  `source: 'explicit' | 'guessed' | 'not_provided'` (closed enum, required). This is
  how we satisfy "mark guessed fields." Render guessed = amber/dashed, confirm first.
- **`clarify(question)` escape-hatch tool** so a low-confidence model asks instead
  of hallucinating fields.
- Temperature 0, 3-5 few-shot examples per action, **Zod validate-and-repair** (one
  retry with the parse error appended, then graceful "please rephrase" fallback).
- **Stateless per call**: feed only the current utterance + minimal explicit context
  (e.g. "editing ORD-1234"), never full chat history. Matches the brief's "feed the
  agent the last response only."
- **Model never touches business logic.** Its output is a typed intent object; all
  IDs, Firestore writes, normalization, and auth stay in deterministic TS.

### Key exposure (static GitHub Pages SPA, Firebase only)
- No server we control in the bundle. Options:
  1. **Firebase Cloud Function proxy (recommended)** - a Callable gated by
     `context.auth`, holds the key, forwards prompt+schema. Free tier covers this.
  2. Separate serverless proxy (Cloudflare Worker / Vercel) - equivalent, more infra.
  3. Referrer-restricted **Gemini-only** client key - real risk (extractable by any
     authed staffer via devtools), Gemini-only, needs a hard daily quota. Last resort.

## C. Tracking reality (external, verified ~Sept 2026)

- **WhereParcel is real** (whereparcel.com), Bearer-auth, `POST /v2/track` (<=5
  items), `carrier: 'auto'` mode, `GET /v2/carriers/{country}` to confirm `ca.*`
  codes. Pricing ~$49/mo Starter (10k req). **No CORS; key cannot be client-side.**
  Requires a proxy. Alternatives (TrackingMore, Ship24, AfterShip, 17track) are all
  likewise server-only.
- **Carrier pages cannot be iframed.** Verified `X-Frame-Options`/`frame-ancestors`
  block on FedEx, Purolator, Canada Post; UPS/DHL bot-walled and near-certainly the
  same. **The brief's "show the carrier site inside the Artifact" via iframe is not
  achievable for any carrier.** Realistic fallback: a styled deep-link card in the
  Artifact that opens the carrier page in a new tab.
- Verified carrier deep-link patterns:
  - FedEx `https://www.fedex.com/fedextrack/?trknbr={n}`
  - Purolator `https://www.purolator.com/en/shipping/tracker?pins={n}`
  - UPS `https://www.ups.com/track?trackingNumber={n}`
  - Canada Post `https://www.canadapost-postescanada.ca/track-reperage/en#/details/{n}`
  - DHL `https://www.dhl.com/en/express/tracking.html?AWB={n}&brand=DHL`
- Courier detection regex (for our own detector, better than SmartTracker's manual
  picker): FedEx `^\d{12}$|^\d{15}$`; UPS `^1Z[0-9A-Z]{16}$`; Canada Post
  `^(\d{16}|[A-Z]{2}\d{9}CA)$`; Purolator low-confidence (12 digits or 3 letters +
  9 digits) - prefer `auto` or a picker. Reference dataset:
  github.com/jkeen/tracking_number_data.

## D. Load-bearing conclusions for the design

1. **Overlay is mounted once, fixed-position, outside `Routes`.** Non-breaking by
   construction; every existing screen keeps working untouched.
2. **Everything can ship fully client-side and deterministic first.** The brief
   itself says present actions "as if done magically" even when no LLM runs. Intent
   parsing, field extraction, and guessed-field marking can be done with
   deterministic TS (regex + heuristics) behind an `AiProvider` interface. An LLM
   proxy (and WhereParcel proxy) slot in later without touching the UI.
3. **Two things genuinely require a backend**: a real LLM and the WhereParcel API.
   Both are optional enhancements layered on a deterministic core, not prerequisites.
4. **Reuse, do not reinvent**: `simpleReceipt.ts` (extend for shipping/key),
   `firestore.ts` helpers, `cartridges.ts`, validators, `themeClasses`.
