# AI Mode - Design and Brainstorm

Built on `00-research.md`. This is the product + architecture design. Standard:
sleek but simple, never cluttered, non-technical-older-user friendly. Nothing that
exists today may break.

## 1. The shell: a persistent tab dock (non-breaking overlay)

A single fixed-position **tab dock** is mounted once in `App.tsx`, inside
`BrowserRouter` but outside `Routes`, visible only on `/staff/*` routes (reads
`location.pathname`). It renders nothing on public routes or the login screen.

- Because it is layout-independent, it works over all 7 mini-apps whether or not
  they use `StaffLayout`. Zero page components are edited to get the dock.
- The dock is a slim rail (bottom on mobile, side/top on desktop - decided in build)
  of tab targets: **AI**, Tracking, Receipts, Packing, Cartridges, Notes, Inventory,
  Directory, Follow-Ups. Tapping a tab routes to that mini-app (existing routes keep
  working exactly as before). The **AI** tab opens the AI Mode overlay.
- Keep it calm: icons + short labels, one clear active state from `themeClasses`.
  No badges/counters unless they earn their place.

AI Mode is the new primary surface, but the classic pages remain fully reachable and
unchanged - that is the backward-compat guarantee made visible.

## 2. AI Mode surface

A full-height overlay (not a cramped corner widget) with two layers:

### Chat column (always present)
- A calm, focused conversation. Far less chrome than ChatGPT: no model pickers, no
  settings, no history sidebar. Just the thread + the composer.
- **Composer** = text input + a row of **quick-action pills** (see 3). Pills clicked
  add a colored chip into the composer ("prompt space"), not execute immediately -
  you can stack a few and add free text, then send.
- Assistant turns render as **cards**, not walls of text: a short line of copy plus,
  when an action is proposed, a **confirmation check** (see 4).
- Presented as if performed "magically" by an AI even when a deterministic parser
  did the work. Copy is warm and brief.

### Artifact panel (single, on demand)
- One Artifact per AI Mode. When the AI needs to show something large or contained
  (a receipt preview, a tracking card, a list of orders), the Artifact **slides over
  the chat** and fills a defined region (right half on desktop, full sheet on mobile
  - shadcn `sheet`/`resizable`). A clear close/expand control returns to chat.
- Only ever one Artifact visible; opening a new one replaces the content. This keeps
  the screen quiet - the brief's hard rule.
- Receipt download buttons (4x6 / full page) and one-click print live **in the chat**
  confirmation, not inside the Artifact (per brief).

## 3. Quick-action pills

Two visual groups in the composer, no nested menus:

- **Tracking group** (visually grouped, clearly "tracking"): **FedEx, Purolator,
  UPS**. Unique behavior: hovering a courier expands it inline (shadcn `hover-card`
  / controlled popover) into a tiny tracking-number field; type a number + Enter
  tracks immediately. Clicking (not hovering) drops a courier chip into the composer.
- **Action group:** **Receipt, Refill, Purchase, Note, Inventory.** Clicking drops a
  colored chip that primes the intent; the user adds details in free text.

Chips are removable, colored per domain, and readable at a glance.

## 4. Confirmation checks (the heart of the "magic")

When the AI proposes an action, the chat shows a **confirmation check** - clean,
scannable, a little magical. Scope note from the brief: markers describe the *check*,
not the printed receipt (the receipt shows only what exists).

- **`?`** marker = required; must be filled before Confirm is enabled.
- **`i`** marker = optional.
- **Always-shown** fields always render in the check (even if blank -> show the `?`
  prompt to fill). **No-show if blank** fields only render when they have a value.
- **Guessed fields** (provenance `guessed`) render with a distinct amber/dashed
  treatment and a tiny "guessed" tag; **explicit** fields render plain. The user can
  **Edit** any field inline, then **Confirm**. Nothing is written or generated until
  Confirm.
- One primary **Confirm** button, one quiet **Edit**. That is the whole ceremony.

This satisfies vague-prompt handling: parse -> route to the right feature -> fill
provided fields (explicit) -> extrapolate the rest (guessed, visibly marked) ->
user confirms.

## 5. The engine: deterministic core + pluggable AiProvider

```
AiProvider (interface)
  parse(utterance, context) -> Promise<Intent>

Intent = {
  action: 'receipt' | 'cartridge_order' | 'cartridge_status' | 'cartridge_list'
        | 'note' | 'inventory' | 'directory' | 'followup' | 'track' | 'clarify' | 'unknown'
  subtype?: 'refill'|'supplies'|'shipping'|'key' | ...
  fields: Record<string, { value: unknown; source: 'explicit'|'guessed'|'not_provided' }>
  clarify?: string
  confidence: number
}
```

Two implementations, same interface, chosen at runtime:

1. **`DeterministicProvider` (always present, default, free, offline).** Regex +
   keyword routing + field extractors (phone, email, money, courier + tracking#,
   brand/model, city/province/country). Fills what it can find (explicit), applies
   sensible defaults (guessed: quantity 1, today's date, GST on, tax by province),
   marks everything. This alone delivers the full UX with zero backend.
2. **`LlmProvider` (optional enhancement).** Calls a tiny proxy that forwards to
   **Gemini Flash-Lite** (cost floor) with a strict `responseSchema` producing the
   same `Intent` shape (router + extractor split, temperature 0, provenance enum,
   `clarify` escape hatch). Zod-validated with one repair retry, else falls back to
   the deterministic result. Stateless: only the current utterance + minimal context.

Selection: if a proxy URL is configured (env), use `LlmProvider` and **fall back to
`DeterministicProvider` on any error/timeout**; otherwise deterministic only. The UI
never knows which ran. All IDs, Firestore writes, normalization, tax math, and auth
stay in deterministic TS regardless - the model only ever proposes a typed intent.

### Proxy (lowest cost, separate from prod)
A minimal stateless proxy (Cloudflare Worker free tier, or Firebase Function) that
holds the Gemini key, verifies the request, forwards prompt+schema, returns JSON.
Deployed separately; never in the client bundle. Deferred until the deterministic
core is solid - the app ships and works without it.

## 6. Feature integrations (all through chat + confirmation + Artifact)

- **Receipt Generator** - types Refill / Supplies / Shipping / Key. Reuse and extend
  `simpleReceipt.ts`: add shipping (multi-item, per-item courier/tracking/dest/cost/
  tax + the final-sale footnote) and key helpers so all four render at 4x6 + letter.
  Shared fields (receipt#, date, notes) + per-type fields exactly per the brief's
  markers. Artifact = receipt preview; chat = confirmation + download/print.
- **Packing tab** - detach the add-ons currently bolted onto Shipping in
  `StaffReceipts.tsx` into their own tab. **Multi-mode**: a dashboard toggle that lets
  you accumulate items from any tab into one open receipt ("receipt cart"), then
  finalize as a single receipt. Surfaced in chat as "added to current receipt (N
  items)".
- **Cartridge Manager** - create / modify / list / change-status through chat (no
  delete). Multiple cartridges per order. Reuse `cartridges.ts` + `syncOrderStatus`.
  Artifact = the order's receipt.
- **Customer memory** - a local store (localStorage now, Firestore-backable later) of
  {name, phone, email} grouped. On a similar name typed later, offer to autofill.
  Kept out of any public-readable collection.
- **Tracking** - built-in courier detection (research regex), Artifact shows a clean
  card: detected courier, tracking number, status placeholder, and a "Open on
  <carrier>" button (new tab). WhereParcel adapter later fills live status in place.
- **Notes / Inventory / Directory / Follow-Ups** - straightforward chat CRUD via the
  existing collections + helpers. Rename **Customer Requests -> Customer Follow-Ups**
  in UI copy (collection name unchanged to avoid data migration; note the mapping).

## 7. Chat context rule
Follow-ups feed the engine only the **last assistant result** as context, never the
whole thread. User can scroll history and Clear the screen. Keeps cost down, behavior
reproducible, and matches the brief.

## 8. Non-negotiables
- Nothing existing breaks; classic pages stay reachable and identical.
- Public/private data boundary preserved; `orderStatus` never widened; 3-status enum
  intact.
- No em dashes anywhere. Warm, plain copy. Theme via `themeClasses`.
- `yarn lint` clean and `yarn build` green before any "done".
