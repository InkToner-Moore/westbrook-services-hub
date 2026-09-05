# UI Rehaul - Design Spec (the shared contract)

Every agent working on the rehaul follows this file. It is the single source of
truth for the look. If something here conflicts with what a component does today,
this wins, unless it would break a working feature (then flag it, do not guess).

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
- The one bold, memorable element is the **left tile rail**: quiet paper tiles that
  flood with a tool's signature colour when active. Spend the boldness there and
  keep everything else disciplined.

## Palette

Keep the runtime `themeClasses` system in `ThemeContext.tsx` (do not rip it out -
dozens of files read it). We refresh its VALUES and ADD keys. Both themes share
one neutral spine so a light/dark toggle never shifts the layout, only its value.

Named tokens (what they mean, not raw Tailwind everywhere):

| Token | Light | Dark | Use |
|---|---|---|---|
| `counter` (page) | `#f6f5f2` warm paper-grey | `#0e1014` graphite | app background |
| `paper` (card) | `#ffffff` | `#171a21` | panels, cards, the slip |
| `paper-sunk` (nested) | `#f1efe9` | `#1f232c` | inputs, nested rows, wells |
| `edge` (border) | `#e4e1d9` | `#2a2f3a` | hairlines; borders do the work shadows used to |
| `ink` (brand + AI) | `#4338ca` indigo-700 | `#a5b4fc` indigo-300 | wordmark, AI Mode, the slip accent |
| `action` (primary) | `#2563eb` blue-600 | `#3b82f6` blue-500 | primary buttons, links, focus ring |
| `brass` (warm accent) | `#b45309` amber-700 | `#fbbf24` amber-400 | "needed"/guessed markers, key-cutting, small highlights |
| `graphite` (text) | `#1a1d23` | `#f3f4f6` | primary text |
| `text-muted` | `#5b6270` | `#9aa4b2` | secondary/muted text |

Rules:
- **One warm accent (brass) and one brand (ink) and one action (blue).** Do not
  introduce more accent hues into chrome. Tool signature colours (below) live only
  on tiles and inside their own tool, never scattered through shared chrome.
- Borders + a step in surface value carry hierarchy. **Delete heavy shadows.**
- No gradients as decoration. The only gradient allowed is none - flat fills only.

### Tool signature colours (tiles + that tool's own accents only)

Reuse today's hues so nothing jumps. Flat fills, never gradients.

| Tool | Hue | Active tile fill |
|---|---|---|
| AI Mode | ink indigo | `bg-indigo-600 text-white` |
| Tracking | blue | `bg-blue-600 text-white` |
| Receipts | emerald | `bg-emerald-600 text-white` |
| Cartridges | violet | `bg-violet-600 text-white` |
| Notes | amber | `bg-amber-500 text-white` |
| Inventory | orange | `bg-orange-600 text-white` |
| Directory | cyan | `bg-cyan-600 text-white` |
| Follow-Ups | rose | `bg-rose-600 text-white` |
| Timesheet (not built) | slate, muted/disabled | `bg-slate-200 text-slate-400` |

## Typography

One superfamily, chosen for the subject (a print shop; dependable, technical, warm
enough): **IBM Plex Sans** for everything UI, **IBM Plex Mono** for slip data. This
is a deliberate pick, not a default - Plex was drawn as a working typeface and its
mono ties straight to receipts and labels. Loaded once in `index.html` (Google
Fonts, with preconnect) and wired into `tailwind.config.ts`.

- `font-sans` -> IBM Plex Sans (UI, headings, body). Hierarchy comes from size and
  weight, not a second display face.
- `font-mono` -> IBM Plex Mono, `tabular-nums`. ONLY for: prices/money, order and
  tracking IDs, receipt/slip figures, phone numbers on a slip. Not for labels.

Scale (Tailwind): page title `text-2xl/3xl font-semibold tracking-tight`; section
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
  panels/cards/slip `rounded-xl`; inputs/buttons `rounded-lg`; pills `rounded-full`.
- **Elevation:** flat by default. At most ONE soft shadow (`shadow-lg`) on things
  that truly float above the page: the artifact rail on mobile, popovers/menus, the
  active-tile lift. Everywhere else: border + surface-value step. Delete every
  `shadow-2xl`, `drop-shadow-2xl`, `drop-shadow-lg`.
- **Motion answers actions only.** Keep: the artifact sliding in, a confirm state
  change, a tile filling on select, hover background on interactive rows. Delete:
  `hover:scale-105`, `hover:-translate-y-2`, `animate-pulse` blur-blobs,
  `transition-all duration-500` on static chrome, section fade-and-slide-up.
- **Delete the floating blur blobs** in `StaffLayout`/`StaffDashboard`
  (`mix-blend-multiply ... animate-pulse` divs). They are the clearest Lovable tell.

## Buttons and inputs (via themeClasses)

- Primary = blue `action`. Secondary = paper-sunk with an edge border. Ghost =
  transparent, hover paper-sunk. Danger = red, used sparingly. Keep the existing
  `themeClasses.button.*` keys; just make their values match the tokens above.
- Inputs: `paper-sunk` fill, `edge` border, blue focus ring. Min height 44px on
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

Visible keyboard focus on every control (blue ring). Respect
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
