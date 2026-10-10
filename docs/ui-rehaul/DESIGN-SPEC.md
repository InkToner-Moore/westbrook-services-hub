# UI Rehaul - Design Spec (the shared contract)

Every agent working on the rehaul follows this file. It is the single source of
truth for the look. If something here conflicts with what a component does today,
this wins, unless it would break a working feature (then flag it, do not guess).

**Revised 2026-10-10 (staff rehaul to match the customer page).** Parsa's brief:
the staff dashboard should match the customer side and be nice to look at, without
losing practicality, ease of use or legibility. So the staff side now shares the
customer page's palette (`--pub-*`, defined once in `src/index.css`), its display
face, and its rule that motion answers the person. The palette, type and tile
sections below are the revised ones.

The goal in one line: make Ink, Toner & Moore look like a real, trustworthy
neighbourhood office-services counter, run by people who know what they are doing.
Not a startup. Not an AI template. Legible for a 70-year-old, quick for a busy
clerk, current enough for a 20-year-old.

## The idea: the counter and the slip

The shop prints, refills toner, cuts keys, and ships parcels. Its whole day is
paper crossing a counter: receipts, labels, order slips, tracking stubs. That is
the metaphor the whole UI leans on. It is already half-built (the AI confirmation
is styled as a "counter slip") - we sharpen it into the identity of the app.

- Surfaces are **paper** on a **counter**.
- Data that would be on a printed slip (prices, order IDs, tracking numbers) is
  set in **mono with tabular figures**, like a real receipt. This is the one place
  mono is allowed, and it is earned, not decoration.
- The bold elements are few: the shop name set in the display face at the top of
  the **left tile rail**, the active tile flooding with ink, and one big display
  line per screen (the page title, or the question on an empty chat). Everything
  else stays disciplined.

## Palette

Keep the runtime `themeClasses` system in `ThemeContext.tsx` (do not rip it out -
dozens of files read it). We refresh its VALUES and ADD keys. Both themes share
one neutral spine so a light/dark toggle never shifts the layout, only its value.

Named tokens (what they mean, not raw Tailwind everywhere):

| Token | Light | Dark | Use |
|---|---|---|---|
| `counter` (page) | `#f6f5f2` | `#0e1014` | app background |
| `paper` (card) | `#ffffff` | `#171a21` | panels, cards, the slip |
| `sunk` (nested) | `#f1efe9` | `#1f232c` | inputs, nested rows, wells |
| `edge` (border) | `#e4e1d9` | `#2a2f3a` | hairlines; borders do the work shadows used to |
| `ink` (brand + primary) | `#15173a` navy | `#eceef6` | text, the wordmark, primary buttons, the active tile |
| `accent` | `#2f3ad1` indigo | `#8f9bff` | links, focus rings, AI Mode, the hover of a primary button |
| `brass` (warm accent) | `#a8741a` | `#d9a84a` | "needed" and "guessed" markers |
| `muted` | `#5b5f76` | `#a3a8bd` | secondary text |

These are the customer page's tokens. They are CSS variables on `:root` and
`.dark` in `src/index.css`, exposed to Tailwind as `pub-*` (`bg-pub-paper`,
`text-pub-ink`, `border-pub-edge`), and they flip with the theme on their own. The
shadcn variables in the same file are set to the same ladder so dialogs, menus and
toasts match. `themeClasses` carries the same values plus `ink`, `accent`, `brass`,
`edge` and `display` keys. A `pub-*` colour takes no Tailwind opacity modifier
(`bg-pub-ink/10` generates nothing).

Rules:
- **One brand (ink), one accent (indigo), one warm accent (brass).** The primary
  button is the ink fill, as on the customer page: navy in light, near-white in
  dark, so never pair it with a hard-coded `text-white`.
- Green, red and amber are for status only (done, danger, waiting), always with
  text. A colour that encodes a data category (an employee's shifts, a key board
  slot, a note category) stays.
- Borders + a step in surface value carry hierarchy. **Delete heavy shadows.**
- No gradients as decoration. One exception, asked for by name: the picked courier
  tile in `SmartTracker` takes a wash in the courier's own logo colours.

### Tiles

Every tool tile is one colour. Idle: paper, an edge border, a line icon in ink.
Active: the ink fill. AI Mode is the one tile that takes the accent when active.
The per-tool hues (blue, emerald, violet, amber, orange, cyan) are retired; the
label and the icon tell the tools apart.

## Typography

**IBM Plex Sans** for everything a person reads or types in, **IBM Plex Mono**
for slip data, and **Bricolage Grotesque** (`font-display`) for the few big lines,
as on the customer page. Loaded once in `index.html`.

- `font-sans` -> IBM Plex Sans: body, labels, inputs, buttons, tables.
- `font-display` -> Bricolage Grotesque, semibold, set a little tight: the shop
  name in the rail, a page title, a card or section title, an empty-state title,
  the question on an empty chat. Never for body text, labels or data.
- `font-mono` -> IBM Plex Mono, `tabular-nums`. ONLY for: prices/money, order and
  tracking IDs, receipt/slip figures, phone numbers on a slip. Not for labels.

Scale (Tailwind): page title `text-[28px]/[32px]` in the display face; section
`text-lg font-semibold`; body `text-[15px] leading-relaxed`; meta `text-[13px]`.
Body line length under ~72ch.

Banned typographic tells (do not use any):
- ALL-CAPS tracked-out eyebrow labels above headings.
- Accenting a single word in a heading (colour/italic/bold on one word).
- Gradient-clipped text (`bg-clip-text text-transparent`) - remove every instance.
- `WORD - fragment` spaced-dash labels; meta joined with middle dots.
- A `->` glued onto button/link text.
- Em dashes anywhere (project rule, prose and UI copy alike).

## Shape, elevation, motion

- Radius scale by hierarchy, not one value on everything: rail tiles `rounded-2xl`;
  panels/cards/slip `rounded-xl`; inputs `rounded-lg`; the primary action of a page
  or card and the button beside it are pills (`rounded-full`), as on the customer
  page; icon buttons and row controls keep `rounded-lg`.
- **Elevation:** flat by default. At most ONE soft shadow (`shadow-lg`) on things
  that truly float above the page: the artifact rail on mobile, popovers/menus, the
  active-tile lift. Everywhere else: border + surface-value step. Delete every
  `shadow-2xl`, `drop-shadow-2xl`, `drop-shadow-lg`.
- **Motion answers actions only.** Staff see these screens all day, so nothing
  plays on load and nothing loops except a progress signal (the scanning bar while
  the chat reads a message). `prefers-reduced-motion` turns the rest off globally
  (`src/index.css`). Keep: the artifact sliding in, a confirm state
  change, a tile filling on select, hover background on interactive rows. Delete:
  `hover:scale-105`, `hover:-translate-y-2`, `animate-pulse` blur-blobs,
  `transition-all duration-500` on static chrome, section fade-and-slide-up.
- **Delete the floating blur blobs** in `StaffLayout`/`StaffDashboard`
  (`mix-blend-multiply ... animate-pulse` divs). They are the clearest Lovable tell.

## Buttons and inputs (via themeClasses)

- Primary = the ink fill, hover accent. Secondary = paper-sunk with an edge border. Ghost =
  transparent, hover paper-sunk. Danger = red, used sparingly. Keep the existing
  `themeClasses.button.*` keys; just make their values match the tokens above.
- Inputs: `paper-sunk` fill, `edge` border, accent focus ring. Min height 44px on
  anything a customer or a gloved clerk taps (touch target, matters for the age
  range). Labels sit above, sentence case, plain words.
- Copy: active voice, says what happens. "Add to receipt", "Print 4x6", "Confirm
  order". A button keeps its name through the flow (Confirm -> "Confirmed").

## The slip (confirmation / receipt-like blocks)

The counter slip is the hero component and it moves to the artifact rail (see the
layout doc). Keep its anatomy: a titled header naming the action + its tool icon in
that tool's hue; a ruled ledger (`divide-y edge`) of label-left / value-right rows
with money and IDs in mono `tabular-nums`; a total rule; markers `?` = needed
(brass) and `i` = optional (muted); guessed values flagged with a small brass chip.
It should read like something that could be torn off and handed over.

## Layout at a glance (full detail in PLAN.md)

Staff, desktop: three columns - left **tile rail** (~200px, a 2-col tile grid: AI
Mode as a 1x2 hero, eight 1x1 tool tiles, then a rule, then the user chip + theme
toggle), center **work pane** (AI chat by default, or the selected tool), right
**artifact rail** (~400-460px: current artifact, actions pinned to its foot).

Staff, mobile (single column, AI-first): the work pane is the screen; the tile rail
collapses to a bottom bar / drawer; the artifact opens as a slide-up sheet with its
actions pinned to the sheet foot.

Public site: single-column, mobile-first, generous. Same tokens and type. Structure
unchanged (hero, package tracking, refill-status check, services, hours, store map,
contact) but restyled to the counter/paper identity. Details in PLAN.md.

## Accessibility floor (non-negotiable, wide age range)

Visible keyboard focus on every control (accent ring). Respect
`prefers-reduced-motion`. Body text and controls meet WCAG AA contrast in both
themes. Tap targets >= 44px for primary customer/clerk actions. Never encode
state by colour alone - the active tile also carries a label and a filled shape;
status chips carry text, not just a hue.

## What every agent must NOT do

- Do not rewrite the `themeClasses` mechanism or move the app to CSS-variable-only
  theming. Extend `themeClasses`; style off it in staff components as today.
- Do not break a working feature to hit a visual. Inventory price lists, cartridge
  manual delete, the receipt/cart flow, tracking, auth - all must keep working.
- Do not add a new dependency without saying so in your report.
- Do not touch `src/App.tsx` routing, `FeatureProtectedRoute`, `public/CNAME`,
  `deploy.yml`, or the `proxy/` worker unless your task explicitly owns them.
- No em dashes. No Lovable tells from the banned lists above.
