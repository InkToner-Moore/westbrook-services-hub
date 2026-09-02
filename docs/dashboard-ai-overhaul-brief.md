# Dashboard Overhaul — "AI Mode" Brief

## Goal

A major overhaul of the staff Dashboard (https://inktonermoore.ca/staff/dashboard)
with many new and creative ideas. We are building an overlay / layer on top of the
current dashboard.

**Hard constraint: everything that exists today keeps existing and stays backward
compatible.** Nothing currently working may break.

**UI & UX is of the UTMOST importance.** The screen must never get cluttered.
Everything must be clean, with zero extra energy or effort required for the eye to
find what is next or needed. Staff and customers span a wide age range, so the bar
is sleek but simple: nothing a non-technical older user or a busy person at the
counter has to think about.

---

## Core concepts

### Tabs
The mini-apps all become **tabs**, so you can switch between them from any screen.
One of these tabs is the new **"AI Mode"**.

### AI Mode (the main new layer)
- A chat-like interface. Even when actions are not actually performed by an LLM,
  we present them as if they are being done magically.
- Far less cluttered than something like ChatGPT: much more focused and clean,
  showing the user only what we NEED them to see.
- This is the main part of the layer. Every user interaction happens here.

### Artifact panel
- AI Mode has a single **"Artifact"** the AI can use to show more complex, larger,
  or contained content, instead of putting it in the chat.
- When enabled, the Artifact slides over the chat and fills a defined part of the
  screen.

### Packing tab (detach add-ons from Shipping)
- Detach add-ons from Shipping into their own tab. Call it **"Packing"** (or a
  better name).
- Move the add-ons there.
- Add a **multi-mode** (or a better name) that, when enabled from the dashboard,
  lets you add multiple things (from the same tab or different tabs) onto the same
  receipt. Integrate this feature sophisticatedly into the chat overlay.

### Customer info memory
- Save customer info (name + phone number + email, grouped) for quick reuse when a
  similar name is typed next time.

---

## Chat quick actions

The chat has quick-action buttons/pills. Clicking one adds it to the prompt (e.g. a
colored pill appears in the prompt space). Quick actions:

- **FedEx, Purolator, UPS** — group these three visually so it is clear they are for
  tracking, but NOT inside a menu. They are also unique: instead of clicking, you can
  hover the mouse over one, it expands, and you can type a tracking number and hit
  Enter.
- **Receipt, Refill, Purchase, Note, Inventory.**

### Vague-prompt handling
You should be able to send a vague prompt and have it:
1. Hook the response to the correct feature.
2. Fill every field that was provided.
3. Extrapolate/guess the fields that were not provided — but any field that was
   extrapolated or guessed must be **marked as such** in the confirmation.

---

## Confirmation checks (important scope note)

When this brief says **"Always-shown"** or **"No-show if blank"**, it refers to the
**confirmation/check of the receipt info shown in the chat** — the step where the
user hits Confirm, or Edit-then-Confirm — NOT the generated receipt itself.

- On the **generated receipt**, only whatever exists is shown.
- The **confirmation** appears in the chat (not the Artifact). It must be very clean,
  uncluttered, a little magical, and easy to scan quickly.
- Field markers:
  - **`?`** = required; must be populated before proceeding.
  - **`i`** = optional.
- Always indicate to the user which fields are necessary and which are not in the check.

---

## Receipt Generator

**Top-level type: Refill / Supplies / Shipping / Key**

Shared fields:
- Receipt Number — required. Auto-generated, non-LLM, system-checked only (no user check).
- Date — required. Always-shown.
- Notes — required marker `?`, No-show if blank.

### Refill-specific
Outputs: confirmation check, receipt Artifact with 4x6 and full-page downloads, and
possibly one-click print (button lives in chat, not in the Artifact).
- Model — required. Always-shown.
- Brand — required. Always-shown.
- Price — `?`. Always-shown.
- Notes — `?`. No-show if blank.
- Customer Name — `?`. No-show if blank.
- Customer Phone Number — `?`. No-show if blank.
- Customer Email — `?`. No-show if blank.
- Tax = GST (system-wide setting) — required. Always-shown.

### Supply-specific
Outputs: same as Refill (check, 4x6 + full-page downloads, possible one-click print
button in chat).
- Supply — required. Always-shown.
- Quantity.
- Model (or Brand + Model) — required. Always-shown.
- Price — `?`. Always-shown.
- Notes — `?`. No-show if blank.
- Customer Name — `?`. No-show if blank.
- Customer Phone Number — `?`. No-show if blank.
- Customer Email — `?`. No-show if blank.
- Tax = GST (system-wide setting) — required. Always-shown.

### Key-cut-specific
Outputs: same as above (check, 4x6 + full-page downloads, possible one-click print
button in chat).
- Key Model / description — required. Always-shown.
- Price — `?`. Always-shown.
- Customer Name — `?`. No-show if blank.
- Customer Phone Number — `?`. No-show if blank.
- Customer Email — `?`. No-show if blank.
- Tax = GST (system-wide setting) — required. Always-shown.

### Shipping-specific
- Customer Name — required. Always-shown.
- Customer Phone Number — `?`. Always-shown.
- Customer Email — `?`. No-show if blank.
- Tax = GST (system-wide setting) — required. Always-shown.
- Shipping items — required (there may be multiple items under one shipment).
  Always-shown. Each item:
  - Courier Service (courier company + the service) — required. Always-shown.
  - Tracking Number — required. Always-shown.
  - Destination City — required. Always-shown.
  - Province — required. Always-shown.
  - Country — required. Always-shown.
  - Shipping Cost — required. Always-shown.
  - Shipping Taxes — required. Defaults to whatever the destination city/province
    implies, but changeable. Always-shown.

#### Shipping receipt footnote
Add a footnote to all shipping receipts stating that it is a final sale with no
refunds; that it is the customer's responsibility to have their information (name,
addresses, commercial invoices, etc.) correct and checked; and that we carry no
responsibility and have no refund policy, though we will do our best to work with the
carrier (e.g. Purolator/FedEx/UPS) to help as much as possible. Phrase it well.

---

## Cartridge Manager

Through the chat you should be able to:
- Create new orders.
- Modify an order.
- List orders.
- Change an order's status.

**No deletion** — deletion must be done manually in the dashboard.

Same as elsewhere: clean, uncluttered, magical confirmation fields on screen, both
when confirming and when simply presenting information.

The Artifact for a cartridge order is its receipt, similar to the Receipt Generator.

New order fields:
- Customer Name — required. Always-shown.
- Customer Phone Number — `?`. Always-shown.
- Brand — `?`. Always-shown.
- Model — required. Always-shown.
- Type — `?`. Always-shown.
- Price — `?`. Always-shown.
- Notes — No-show if blank.

You can also have multiple cartridges under the same order.

---

## Tracking

Make tracking built-in so the agent can interact with it and show more detail in the
Artifact. Use **WhereParcel**; fall back to showing the official carrier tracking
website inside the Artifact.

---

## Other integrations

Integrate **Notes, Inventory, Website Directory, and Customer Requests** into the
chat as well. These are more straightforward — figure out sensible designs.

- Rename **Customer Requests → Customer Follow-Ups.**

---

## Chat behavior / context

Follow-ups in the chat only feed the agent the **last response** when needed, not
more — although the user can scroll and clear the screen.

---

## AI / model strategy

Brainstorm and build more clear paths and features into the "magic"/AI. Because we
will use a cheap model (e.g. Gemini 3.5 Flash-Lite, or less preferably GPT-5.6 Luna),
bake in a lot of determinism, custom mechanisms, clear tools/paths, and functions.
Research the best ways to work with these models.

---

## Process

1. **Research** — dispatch Sonnet subagents to research the different topics for you.
2. **Brainstorm** — use the research to brainstorm; think creatively and outside the
   box, but with best practices and very high standards, both product-wise and
   codebase-wise.
3. **Implementation plan** — create it with a handoff feature baked in
   (`/proj-handoff`, `/proj-continue`). This feature should not be limited to the
   plan long-term, but for now it applies to this work since that is what we are doing.
4. **Implement** — dispatch Sonnet subagents to implement the plan; act as the
   orchestrator.
5. **Review** — check the work yourself in detail. Make sure everything was done
   right, nothing was missed, and nothing wrong or extra was introduced. Check code
   quality too.

---

## Standing rules for this work

- Commit, merge, and push regularly on your own initiative, without being asked.
- Keep and maintain very good documentation throughout.
- **Never use em dashes anywhere.**
- Always check up-to-date info and documentation for the current versions of the
  tools and environment we use — your built-in knowledge of them is often outdated.
