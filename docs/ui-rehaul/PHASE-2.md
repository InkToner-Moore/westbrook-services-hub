# UI Rehaul - Phase 2 spec (next session)

Captured from Parsa 2026-09-05, to build next session. This is the spec, not yet
built. Read `DESIGN-SPEC.md` and `HANDOFF.md` first. Nothing here is implemented.

## The new AI Mode action model

Six top-level actions. They can run as separate actions OR several at once in one
flow (design the intent model so multiple actions attach to one utterance / one
receipt). Every action and every state within it gets a **purpose-built artifact
card** in the right rail, not a generic form: think through each individual thing
that can happen (create / view / change / success / error / empty) and design a
card that makes the counter feel the magic.

1. **Purchase** - send the transaction to the Moneris Go device (NOT built; see
   `docs/moneris-a920-integration-research.md`: semi-integrated cloud, backend
   required, two-phase response, card data never touches the SPA, certification
   needed). ALSO record the transaction in Firestore so it can be reconciled with
   the Moneris data later. Artifact: a payment card (amount, pending -> approved /
   declined).

2. **Receipt** - prepares BOTH a full-sheet receipt AND 4x6 labels. Artifact:
   receipt preview with full-sheet + 4x6 download/print.

3. **Record** - the cartridge-refill workflow (this is today's cartridge actions,
   renamed): record a NEW refill, CHANGE STATUS on an existing one, or VIEW one.
   Always show and allow a 4x6 label download, regardless of whether there is a
   price. Artifact: refill order card + 4x6 label.

4. **Note** - save something as a note. FIX: the category is currently a free-text
   input; make it a fixed LIST (dropdown). REMOVE Follow-Ups entirely (see below)
   and fold it into Notes. Artifact: note card.

5. **Inventory** - look up whether something is in stock / available, its price,
   and (for a key) its location. Locations are coming later as a model -> cut-code
   map (e.g. A1: KW1, A2: SC1); when provided, show the location too. Also
   update / change inventory. Artifact: inventory result card (stock badge, price,
   key location) + an edit form.

6. **Timesheet** - NEW FEATURE, build it end to end: add employees, a punch-in /
   punch-out clock, export, and add / modify / view through AI Mode. New Firestore
   collections. The Timesheet tile in the rail is already present but disabled
   (`enabled: false` in `src/components/shell/tiles.ts`) - enable it and wire the
   route/page. Artifact: employee list, punch clock, entries, export.

Unstated but assume KEEP (confirm with Parsa): Tracking and Directory tools. Only
Follow-Ups is explicitly removed.

## Remove Follow-Ups completely

Delete the tile (`tiles.ts`), the route (`/staff/requests` in `App.tsx`), the page
(`src/pages/StaffRequests.tsx`), and the `followup` intent/action across `src/ai/`
(types, fieldSpecs, actions, providers, intentOptions). Fold its purpose into Notes.

## Bugs and quirks to fix (some belong with the current rehaul, not just Phase 2)

- **Both sidebars open deforms classic-mode tools.** With the left rail + right
  artifact rail both open, the center pane gets narrow and the reused tool pages
  deform. Make the tool pages responsive / min-width safe inside the 3-pane center
  (they were built for a full-width page). Likely the biggest immediate fix.
- **Tracking page UI is off** in the shell (`StaffTracking` / `SmartTracker`).
- **Receipt not visible after leaving AI Mode.** The artifact (e.g. a finished
  receipt) only shows while on the AI chat pane; switching to a tool hides it. The
  artifact rail should persist and show the current artifact from any center route,
  and there should be a way to reopen the last one. Artifact state is already global
  in `src/ai/context.tsx`; the rail just needs to render it regardless of route.
- **Confusing "Model" field on sales receipts.** Selling a custom box should not ask
  for a "Model". Make receipt field labels contextual to the subtype / clearer.
- **GST two-way and after-tax display.** When GST is enabled, show the after-GST
  total; let the user type the GST-INCLUSIVE price and auto-derive the pre-tax (and
  vice-versa: change one, the other updates). Audit and fix other quirks of this kind.

## Working notes

- Moneris: `docs/moneris-a920-integration-research.md` has the integration plan and
  the "nail down with Moneris first" checklist. Purchase can't fully land until the
  backend + certification exist; build the DB-recording + the pending/approved card
  now, stub the device send.
- Keep every existing feature working; this extends AI Mode, it does not drop the
  reused tools (except Follow-Ups).
