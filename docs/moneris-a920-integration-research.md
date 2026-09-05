# Moneris A920 card-terminal integration research

Research note for a future build session: pushing a sale amount from the web app (React SPA, static hosting) to a physical Moneris A920 (PAX A920, "Moneris Go" line) countertop terminal, having the customer tap/insert on the terminal, and getting an approved/declined result back into the app, with card data never touching the SPA.

Status: desk research only, September 2026. No account created, no sandbox access exercised, nothing tested against a live terminal. Treat field names and behavior below as "believed accurate as documented" and verify against a real sandbox before building.

## TL;DR / Recommended approach

Use **Moneris Go, Cloud integration mode**. This is exactly the "semi-integrated" pattern: your system sends a transaction request to Moneris' cloud, the cloud routes it to a specific paired A920, the terminal handles all card capture and PIN entry, and your system gets back an approval/decline plus a receipt. Card data never reaches your code.

You will need a small backend (the project's existing Cloudflare Worker proxy is a good fit) because the Cloud API requires a Moneris-issued `apiToken` and `storeId` that must not live in a static SPA bundle. The Worker becomes a thin broker: SPA calls the Worker with an amount and an order reference, the Worker calls Moneris Go Cloud API with the stored secret, and either polls the returned `receiptUrl` or exposes a `postBackUrl` (needs a stable public HTTPS endpoint on your own domain, e.g. the Worker's own route) for Moneris to call back with the final result.

Do NOT use the plain Moneris API / Gateway (ecommerce, card-not-present) for this. It is built for typed/entered or tokenized card numbers over the internet, not for driving a physical countertop terminal, and using it for present-card tap transactions would be the wrong tool and likely worse interchange/PCI posture.

Do NOT use App-to-App integration. That requires writing a native Android app that runs *on* the A920 itself and is loaded onto the device via the PAX/Ingenico app store; it is explicitly incompatible with "web app talks to a separate terminal" ([App-to-App integration docs](https://developer.moneris.com/moneris-go/docs/app-to-app-integration)).

There is also a **Direct integration** mode (POS talks to the terminal over the local network/Wi-Fi/Ethernet instead of via Moneris' cloud). This could theoretically work for a single-counter shop on one LAN, but a browser-based SPA cannot open an arbitrary local-network socket/HTTP connection to a terminal on its own (browser security model), so Direct mode still implies a local backend/agent process on the counter machine. Cloud mode avoids that entirely since your Worker is already on the internet talking to Moneris' cloud, which then reaches out to the terminal. For this use case (one Calgary retail counter, static-hosted SPA, existing Cloudflare Worker), **Cloud integration is the natural fit and the one to plan around.**

## 1. Integration models Moneris offers for the A920

Moneris has been consolidating its API surface under "Moneris Go" (the terminal product line, sold in Canada, A920 included) and a rebuilt **Moneris Developer Portal** at `developer.moneris.com` (an older/legacy portal exists too; the current one is what's linked from Moneris' main site as "Moneris API and Moneris Developer Portal"). Under Moneris Go there are three integration methods, documented at the portal's Go section (index at `https://developer.moneris.com/moneris-go/llms.txt`):

- **Cloud integration** ([docs](https://developer.moneris.com/moneris-go/docs/cloud-integration)): POS/backend sends transaction requests over the internet to Moneris' cloud, which validates them and forwards them to a specific paired A920. This is the "semi-integrated, cloud-brokered" model and is what fits "web app pushes a sale to the countertop terminal."
- **Direct integration** ([docs](https://developer.moneris.com/moneris-go/docs/direct-integration)): a POS application on a separate device connects to the terminal over the local network (Wi-Fi/Ethernet) and talks to it directly; the terminal still calls out to the Moneris host itself to process the card. No cloud hop for the POS<->terminal leg.
- **App-to-App integration** ([docs](https://developer.moneris.com/moneris-go/docs/app-to-app-integration)): your own Android POS app is installed and runs directly on the A920 hardware, invoking the built-in Moneris payment app via Android `Activity` intents (`startActivityForResult` / `onActivityResult`). This requires Android development and app-store distribution through Pax's or Ingenico's device app store; not applicable to a web app.

So: yes, there is a current, named "Cloud" API for exactly this scenario, it explicitly supports the A920 (the A920 is Moneris' primary Go terminal hardware and the cloud/direct docs are written against the Go terminal family generally), and it's distinct from both the on-device app model and the ecommerce gateway.

For contrast, the classic **Moneris API / Gateway** ("Moneris Core", used for ecommerce, hosted checkout, hosted tokenization) is for card-not-present flows: your app or a hosted page collects (or tokenizes) a card number typed by the customer and posts it to Moneris' gateway. It has no notion of "push an amount to a nearby physical terminal and wait for a tap." Using it for a present-card retail counter would mean either manually keying card numbers (bad UX, worse interchange rates, larger PCI scope) or bolting on a different device integration anyway. It is the wrong tool here and is only useful if this business later also needs online/e-commerce payments. ([Moneris API / ecommerce](https://www.moneris.com/en/solutions/ecommerce/moneris-api))

## 2. Concrete request/response flow (Cloud integration)

### Addressing the terminal

A terminal is set into **Cloud mode** from its own operational-mode setting (Operational Mode → Cloud on the device). During setup the device is paired to a merchant/store by entering the **Merchant ID** (last 9 of the 13-digit Merchant ID) on the terminal itself; note the docs flag "you only have three attempts to enter your Merchant ID" before some kind of lockout, so this is a real one-time-setup step to get right, ideally with Moneris on the phone or a install guide open. Once paired, the terminal is addressed from the API by:

- `terminalId` (a.k.a. Terminal No. / Device ID, shown on the terminal itself)
- `storeId` (assigned by Moneris to your store/location)
- `istConfigCode` (a Moneris-provided integration configuration code, sent on every request)
- `apiToken` (a Moneris-assigned credential authenticating your backend to the cloud)

Moneris explicitly recommends a one-to-one POS-to-terminal relationship; multiple POS instances can address the same terminal but only one transaction can be in flight at a time (busy terminal returns response code `5904`, "Pinpad is Currently Performing Another Transaction"). For a single counter with one A920 this is a non-issue but worth remembering if a second register is ever added. ([Cloud integration docs](https://developer.moneris.com/moneris-go/docs/cloud-integration))

### Request

POST to:

- Test: `https://ippostest.moneris.com/v3/Terminal/`
- Production: `https://ippos.moneris.com/v3/Terminal/`

Minimal purchase body (illustrative, field names as documented):

```json
{
  "apiVersion": "3.0",
  "apiToken": "…",
  "storeId": "…",
  "istConfigCode": "…",
  "data": {
    "request": [{
      "action": "purchase",
      "terminalId": "…",
      "totalAmount": "1110",
      "idempotencyKey": "unique-per-attempt-id"
    }]
  }
}
```

Other request fields documented: `dataId` (merchant-defined unique ID for the payload), `dataTimestamp`, `postBackUrl` (see below), `polling` flag, `remainingAmount`/`tipAmount`/`cashBack`, `dynamicDescriptor`, `language` (EN/FR), `subtotalAmount`, and a `taxes[]` array (max 5 entries of `taxName`/`taxAmount`). ([Purchase API docs](https://developer.moneris.com/moneris-go/docs/purchase-api))

### Response: two-phase (synchronous validation, then async result)

This is the part most worth internalizing for the build: **the first HTTP response is not the payment result.** It's a synchronous validation ack (bad credentials, terminal not found, terminal busy, etc. get caught here) that also hands back a `cloudTicket` and a `receiptUrl`, with `"completed": "false"`. Example:

```json
{
  "receipt": {
    "apiVersion": "3.0",
    "statusCode": "200",
    "data": {
      "response": [{
        "idempotencyKey": "…",
        "cloudTicket": "…",
        "completed": "false",
        "receiptUrl": "https://cloudreceiptct.moneris.com/receipt/123"
      }]
    }
  }
}
```

The actual approve/decline (with `approvedAmount`, `cardType`/`cardName`, `maskedPan`, `authCode`, `responseCode`, `transactionId`, `orderId`, receipt text, etc.) arrives later, once the customer has actually tapped/inserted and the terminal has finished, via one of two delivery mechanisms:

1. **Polling** the `receiptUrl` from the validation response, at an interval of 2 seconds or more (faster polling risks being treated as abusive by the cloud).
2. **Postback URL** (Moneris' recommended approach): you include a `postBackUrl` in the initial request, pointing at an HTTPS endpoint you control with your own domain and a valid SSL certificate; Moneris' cloud POSTs the final result there when the terminal finishes, and your endpoint must answer HTTP 200.

For a Cloudflare-Worker-backed build, the postback approach is a very natural fit: the Worker's own route serves as the `postBackUrl`, avoiding a poll loop and giving a push-style completion event you can relay to the SPA (e.g. via a short-lived polling endpoint the SPA hits, or a WebSocket/SSE bridge if you want to get fancy).

There is no explicitly documented hard timeout for how long the terminal will wait for a tap before the cloud gives up; that needs to be confirmed with Moneris (see checklist). Design for "this can take anywhere from a few seconds to however long a customer fumbles with their card," with a UI cancel path.

### Idempotency

The `idempotencyKey` on every request is the mechanism for safe retries: "if the Moneris Go device has already completed the transaction, it returns the details of the original request; if still processing, it resumes normally" rather than double-charging. Generate one unique key per logical attempt (e.g. per user tap of "charge") and reuse it only when retrying the exact same attempt after a network failure, not per screen render. ([Idempotent Request docs](https://developer.moneris.com/go/idempotentrequest))

### Refunds and voids

- **Void** (`action: "void"`): cancels a purchase before settlement, referencing the original transaction's `orderId` and `transactionId`, with its own `idempotencyKey`. Only valid if funds haven't moved yet.
- **Card Present Refund**: used once funds have already moved (post-settlement); distinct endpoint/action from Void.
- **Void Last Purchase**: a convenience variant that voids the most recent transaction without needing to carry forward its identifiers.
- **Card-on-file Refund**: for refunding a stored/tokenized card rather than a fresh present-card transaction.

Field/auth requirements mirror Purchase: Cloud mode needs `apiToken` + `storeId` + `istConfigCode`; Direct/App-to-App only need `istConfigCode`. (Docs: [Void API](https://developer.moneris.com/moneris-go/docs/void-api), [Card Present Refund](https://developer.moneris.com/moneris-go/docs/card-present-refund-api), [Void Last Purchase](https://developer.moneris.com/moneris-go/docs/void-last-purchase-api), [Card-on-file Refund](https://developer.moneris.com/moneris-go/docs/card-on-file-refund-api))

### Firewall / network requirements

If the broker is a Cloudflare Worker this is largely moot (Workers egress isn't restricted the way an on-prem firewall would be), but for completeness, Moneris documents allow-listing outbound/inbound HTTPS (443) to:

- Test: `ippostest.moneris.com`, `ipterm2ct.moneris.io`, `cloudreceiptct.moneris.com`
- Production: `ippos.moneris.com`, `ipterm2.moneris.io`, `cloudreceipt.moneris.com`

## 3. Do you need a backend? Yes.

The Cloud API requires an `apiToken` and `storeId` issued by Moneris to your merchant account. These are exactly the kind of long-lived secret that cannot live in a static SPA bundle (anyone could view-source it and drive charges/refunds against your terminal, or worse, against your Moneris account generally). So the shape is:

```
React SPA  --(amount, order ref, idempotency key)-->  Cloudflare Worker  --(apiToken, storeId, istConfigCode + request)-->  Moneris Cloud  -->  A920 terminal
```

The Worker (this project already has one under `proxy/`, currently used as an AI proxy per the repo layout) is a good, minimal home for this:

- Holds `apiToken`, `storeId`, `istConfigCode`, `terminalId` as Worker secrets (`wrangler secret put`), never shipped to the client.
- Exposes an internal endpoint like `POST /payments/charge` that takes `{ amount, orderRef }` from the SPA, generates/stores an `idempotencyKey`, and calls Moneris' `v3/Terminal/` endpoint.
- Exposes the `postBackUrl` target (e.g. `POST /payments/webhook`) on the Worker's own domain for Moneris to call back with the final result; the Worker then needs someplace to stash that result so the SPA can retrieve it (Workers KV or Durable Objects would fit, given the project is already on Cloudflare; a simple SPA-polls-the-Worker-until-status-changes loop is the least-novel way to close the loop, with the Worker itself doing the postback-vs-poll dance against Moneris).
- Never touches, logs, or stores actual card data. All it ever sees is the terminal's masked/tokenized response (`maskedPan`, `cardType`, `authCode`, etc.), which is safe to store alongside a receipt record.

This keeps the SPA's PCI exposure at essentially nil (SAQ A-adjacent posture, informally, since the SPA never even sees a card field, only an amount and a result), which is the whole point.

## 4. Onboarding / prerequisites

- **Merchant account with Moneris**: needed regardless. A retail counter presumably already has (or will get) a standard Moneris merchant account and an A920 as part of the "Moneris Go" hardware offering.
- **Terminal in the right mode**: the physical A920 must be switched into Cloud operational mode and paired with the Merchant ID (see section 2). This is a one-time device-side setup step, done from the terminal's own menu.
- **API credentials**: `apiToken` and `storeId` are issued by Moneris during account/store activation ("Moving to Production" docs describe getting these at activation, [source](https://developer.moneris.com/moneris-go/docs/moving-to-production)). `istConfigCode` is a Moneris-provided integration configuration code, likely tied to your registered integration/application with Moneris.
- **Developer Portal account**: required for any New Moneris API work. If you're already a Moneris merchant, your existing merchant login gets automatic Sandbox + Production access. If you're a third-party developer not yet a merchant, you get Sandbox access only, and need a merchant relationship (or your client's) before Production access opens up.
- **Sandbox/test environment**: self-serve. Test endpoint (`ippostest.moneris.com`) uses separate test `apiToken`/`storeId`/`istConfigCode` from production; live card numbers are explicitly prohibited in test, you request test cards from Moneris' Client Consulting team, and there's a "Test Environment Penny Response Table" that maps specific cent amounts (e.g. `.00` approves, presumably others simulate declines) to simulated issuer responses. There's also a hardware distinction: "Test Devices" (functional QA, locked-down, for Cloud/Direct) vs "Development Devices" (sideloading/ADB enabled, for App-to-App only). For this project's Cloud-mode use case, a Test Device (or possibly the production A920 itself pointed at the test endpoint) should suffice, but confirm with Moneris whether you need a loaner test unit or can test against the real hardware pointed at sandbox.
- **Certification**: Moneris requires a certification pass before going live: contact a "Client Consultant" to get a Certification Test checklist, demonstrate all transaction types you intend to use (purchase, void, refund, etc.) with correctly generated receipts, submit for verification, and receive a certification letter. Any subsequent product change requires re-certification. No published timeline was found in the docs; this needs to be asked directly (see checklist). This is a real project-schedule risk: budget calendar time for a human-in-the-loop review cycle, not just dev time.
- **Self-serve vs. contact required**: the Developer Portal, sandbox, and documentation are self-serve today (a real change from Moneris' older, sales-rep-gated developer experience). But moving to production, getting real `apiToken`/`storeId`/`istConfigCode` values, provisioning/pairing a real terminal, and certification all still route through a human Moneris contact (Client Consultant / Integration Specialist), not a pure self-serve signup flow.

## 5. SDKs / libraries / docs

- **Moneris Developer Portal**: `https://developer.moneris.com/`. Current, primary docs hub, RESTful/JSON-based, bilingual (EN/FR), with a Postman workspace of ready-to-use collections and environment variables.
- **Moneris Go docs index**: `https://developer.moneris.com/moneris-go/llms.txt` lists every Go-specific page (integration methods, all transaction APIs, device/terminal info, production/compliance docs). The single best starting point for a build session.
- **Older/legacy portal**: `https://api-developer.moneris.com/`. Many of its URLs 301-redirect to the new `developer.moneris.com` equivalents; some older PDF integration guides ("Moneris Go Integration Guide", versions 1.1.2 through 1.4.0) are still hosted directly on moneris.com as downloadable PDFs and may hold detail not yet ported to the new portal, but they were not fully legible via automated fetch in this research pass (large, image/compressed PDFs). Worth opening manually in a build session.
- **SDKs**: search results indicate Moneris offers (or has offered) JS/Node wrapper libraries for its ecommerce Gateway API specifically; nothing surfaced indicating an official Node/JS SDK specifically for the Go Cloud terminal API (as opposed to raw REST calls). Treat "call the REST endpoint directly from the Worker" as the baseline plan; check the Postman workspace and the Developer Portal's SDK section for anything Go-specific before writing a hand-rolled client. A GitHub topic page (`github.com/topics/moneris`) exists with community repos, but nothing there was verified as an official or A920-specific SDK.
- **Merchant Resource Center (MRC)**: `https://www.moneris.com/-/media/Files/Downloadable_Guides/MRC_UserManual-ENG.ashx` and its QA counterpart `https://esqa.moneris.com/mpg/` relate to the ecommerce Gateway side, not Go; keep them mentally separate from the terminal integration docs.

## 6. Gotchas / risks

- **Certification lead time is unquantified.** No published SLA found; this is the single biggest schedule risk and the first thing to ask Moneris directly.
- **Plan/pricing gating unconfirmed.** Whether Cloud API access is available on all Moneris Go plans/pricing tiers, or is an add-on, was not established from public docs; confirm with a Moneris rep before assuming it's included.
- **Two-phase response model is easy to build wrong.** A naive implementation that treats the first HTTP response as the final result will report false failures constantly, since that response only means "request accepted," not "payment done." The build must wait for the postback (or poll) before showing approved/declined.
- **Postback needs a real HTTPS endpoint with your own domain/certificate.** A Cloudflare Worker route satisfies this cleanly, but plan for it explicitly rather than defaulting to polling, which has stricter minimum-interval and "don't look like abuse" caveats.
- **Terminal busy / one-at-a-time.** Only one transaction can be in flight per terminal (response `5904` if you try to overlap). Fine for one counter, but the UI must prevent double-submits and handle that response code gracefully.
- **Tip/receipt handling is terminal-native by default.** The A920 itself can prompt for tip and print/email/SMS a receipt (`receiptChoice`: PRINT/EMAIL/SMS/NONE). Decide up front whether tip capture happens on the terminal (simplest) or is computed in the app and sent as `tipAmount` (more control over receipt formatting but more integration work); this affects whether the customer-facing tap flow shows a tip screen on the terminal itself.
- **Offline/connectivity behavior undocumented.** No public detail was found on what happens if the terminal loses connectivity mid-transaction, or how the app should distinguish "still waiting for tap" from "terminal unreachable." Needs a direct question to Moneris and/or empirical testing in sandbox with a physical unit.
- **PCI scope is favorable but not zero.** Moneris' own security-requirements page mostly points integrators at generic PCI DSS 3.2 obligations rather than a Go-specific SAQ determination. Because the SPA and Worker never see card data (all of that stays terminal-to-Moneris), the realistic posture is SAQ A-like for the software side, but the merchant's overall SAQ level is a determination Moneris/your acquirer makes, not something to self-declare; confirm explicitly.
- **Pairing has a hard-stop failure mode.** The terminal only allows three attempts to enter the Merchant ID during setup before some kind of lockout; do that step carefully, ideally with a Moneris install guide or rep on hand, not as a rushed afternoon task.
- **Docs are still being migrated.** Several pages 301-redirect from the old `api-developer.moneris.com` portal to the new `developer.moneris.com`, and some detail (exact timeout values, exact SAQ level, plan-tier gating) simply isn't published yet or wasn't reachable via automated fetch. Expect to fill gaps via a Moneris Client Consultant conversation rather than pure self-serve reading.

## What to nail down with Moneris first

- [ ] Confirm Cloud API is included on the merchant's actual Moneris Go plan/pricing tier (not gated to a higher tier or a specific vertical package).
- [ ] Get the actual Certification Test checklist and ask for a realistic timeline (days vs. weeks) for a single-terminal, single-location retail integration.
- [ ] Confirm whether the existing/soon-to-be-ordered A920 unit itself can be pointed at the test endpoint for development, or whether a separate loaner "Test Device" is required/available.
- [ ] Get real values (or a walkthrough) for `storeId`, `apiToken`, `istConfigCode`, and `terminalId` provisioning: what triggers issuance, whether test and production values arrive at different times, and how re-pairing works if the terminal is ever factory-reset or replaced.
- [ ] Ask directly: is there a maximum wait time the cloud/terminal will hold open for a tap before timing out, and what does that failure look like in the API response.
- [ ] Ask directly: what happens if the terminal loses network mid-transaction (does it fail closed, retry, or leave the terminal in a stuck state needing a reset).
- [ ] Confirm PCI SAQ level implications for this specific software architecture (SPA + Cloudflare Worker relay, no card data ever received) in writing from Moneris or the merchant's acquirer/QSA.
- [ ] Decide and confirm with Moneris whether tip capture happens terminal-side (via `tipAmount` prompt flow on-device) or app-side, since this affects both the API request shape and the customer-facing terminal UI.
- [ ] Ask whether an official Node/JS SDK exists for the Go Cloud API specifically (vs. hand-rolled REST calls), and get access to the Postman workspace collection for Go to shortcut request/response shape verification.
- [ ] Confirm the re-certification trigger threshold: does every deploy of the Worker/SPA code count as "a change to the product" requiring re-certification, or only changes to transaction-flow logic.

## Sources

- [Moneris Go Cloud Integration](https://developer.moneris.com/moneris-go/docs/cloud-integration)
- [Moneris Go Direct Integration](https://developer.moneris.com/moneris-go/docs/direct-integration)
- [Moneris Go App-to-App Integration](https://developer.moneris.com/moneris-go/docs/app-to-app-integration)
- [Moneris Go Purchase API](https://developer.moneris.com/moneris-go/docs/purchase-api)
- [Moneris Go Void API](https://developer.moneris.com/moneris-go/docs/void-api)
- [Moneris Go Void Last Purchase API](https://developer.moneris.com/moneris-go/docs/void-last-purchase-api)
- [Moneris Go Card Present Refund API](https://developer.moneris.com/moneris-go/docs/card-present-refund-api)
- [Moneris Go Card-on-file Refund API](https://developer.moneris.com/moneris-go/docs/card-on-file-refund-api)
- [Moneris Go Idempotent Request](https://developer.moneris.com/go/idempotentrequest)
- [Moneris Go Certification Requirements](https://developer.moneris.com/moneris-go/docs/certification-requirements)
- [Moneris Go Security Requirements](https://developer.moneris.com/moneris-go/docs/security-requirements)
- [Moneris Go Moving to Production](https://developer.moneris.com/moneris-go/docs/moving-to-production)
- [Moneris Go Testing Your Solution](https://developer.moneris.com/moneris-go/docs/testing-your-solution)
- [Moneris Go Introduction](https://developer.moneris.com/moneris-go/docs/moneris-go-introduction)
- [Moneris Go documentation index (llms.txt)](https://developer.moneris.com/moneris-go/llms.txt)
- [Moneris Developer Portal home](https://developer.moneris.com/)
- [Moneris API and Moneris Developer Portal (product page)](https://www.moneris.com/en/solutions/ecommerce/moneris-api)
- [Moneris Go Terminal (A920) product support](https://www.moneris.com/en/support/moneris-go/a920)
- [PAX and Moneris launch A920 in Canada (press release)](https://www.pax.us/about/press-room/pax-technology-and-moneris-solutions-launch-a920-in-canada/)
- [Moneris Go Integration Guide PDF, v1.4.0](https://www.moneris.com/-/media/files/devices/moneris-go/moneris-go-integration-guide.ashx)
- [Moneris Go Integration Guide PDF, v1.3.3](https://www.moneris.com/-/media/files/devices/moneris-go-slim/moneris-go-integration-guide.ashx)
- [Moneris Go Integration Guide PDF, v1.1.2](https://www.moneris.com/-/media/files/non_specific_guides/moneris-go-integration-guide-en.ashx)
