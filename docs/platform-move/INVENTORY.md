# Firebase move inventory

Read-only research, 2026-10-18. V2: public-prod HEAD `5666afc`, this checkout. V1: main `ccf84a8`. V1 runs the production staff app. V2 staff is staging only; V2's customer page is live in production (deployment scope supplied for this inventory). No production data or console rules were accessed. No alternative backend is proposed.

References beginning `V1:` resolve in `main` at `ccf84a8`; `V2:` resolve under this repo. `both` means verified in both trees. Line numbers refer to these snapshots. R = read, W = create/update, D = delete.

## 1. Firestore collections

**Every collection and document below has rough document count: unknown (check the Firebase console).** Seed sizes and fixed IDs describe code, not live counts. The feature table in section 5 lists the readers and writers with operation line numbers, including archive writes. Generic SDK calls are at `both:src/lib/firestore.ts:17` (collection read), `:25` (equality query), `:35` (document read), `:42` (set), `:51` (update), `:60` (delete). Reads attach the document ID as `id`; sets replace the document.

| Collection or document | Tree | Fields verified in types and writes | ID scheme and count hints |
| --- | --- | --- | --- |
| `cartridgeOrders` | both | `id, customerName, customerPhone, customerEmail?, cartridges[], status, dateReceived, dateCompleted?, notes`. Each cartridge: `brand, model, type, price?`. Status: `in_progress`, `ready`, `picked_up`. | `ORD-` plus six random uppercase letters/digits. Types: V1 `src/pages/StaffCartridges.tsx:85`, V2 `:88`; line model: both `src/lib/cartridges.ts:6`. |
| `orderStatus` | both | Public-readable mirror: `orderId, customerPhone, customerLastName, status`. Last name is trimmed, lowercased, spaces collapsed, taken from the final word of customerName. No full name, email, notes, cartridge details or prices. | Same ID as order. Model/normalization: both `src/lib/orderStatus.ts:5`. Public lookup queries all matching last names, without a phone condition. |
| `deletedOrders` | both | Full archived cartridge order plus `deletedAt`. | Original order ID. No archive reader found. |
| `notes` | both | `id, title, content, category, createdAt, updatedAt`. Classic categories: `general, customer, inventory, shipping, urgent`. V2 AI instead writes `General, Customer, Supplier, Repair, Reminder, Other`. | `NOTE-` plus six random uppercase letters/digits. Types: V1 `src/pages/StaffNotes.tsx:37`, V2 `:40`; AI categories V2 `src/ai/fieldSpecs.ts:42`. |
| `deletedNotes` | both | Full note plus `deletedAt`. | Original note ID. No archive reader found. |
| `keyInventory` | both | V1: `id, model, inStock, createdAt, updatedAt`. V2 adds nullable `price`, optional `notes, cutCode`. V2 AI create omits price, notes and cutCode, so a document may lack them. | `INV-` plus six random uppercase letters/digits. Types: V1 `src/pages/StaffInventory.tsx:48`, V2 `:71`; AI write V2 `src/ai/actions/collections.ts:83`. |
| `deletedKeyInventory` | both | Full key inventory item plus `deletedAt`, including V2 price/location fields when present. | Original inventory ID. No archive reader found. |
| `directoryLinks` | both | `id, name, description, url, category, iconKey, colorKey, isAdmin?, order, createdAt, updatedAt`; V2 type makes `order` optional. `isAdmin` labels a link, it is not a Firebase role. | `DIR-` plus six random uppercase letters/digits. Six fixed seed IDs when empty: `purolator-admin, fedex-admin, clickship, ups, fedex, purolator`. Types/seeds: V1 `src/pages/StaffDirectory.tsx:108`, V2 `:127`; generator V2 `:208`. |
| `deletedDirectoryLinks` | both | Full directory link plus `deletedAt`. | Original link ID. No archive reader found. |
| `customerRequests` | V1 | `id, customerName, customerPhone, item, createdAt`. Staff enters requests; no public submission writer found. | `REQ-` plus six random uppercase letters/digits. V1 `src/pages/StaffRequests.tsx:39`. Feature absent from V2. |
| `completedCustomerRequests` | V1 | Full request plus `completedAt`. | Original request ID. No archive reader found. V1 `src/pages/StaffRequests.tsx:122`. |
| `refillInventory` | V2 | `id, brand, cartridge, priceBlack, priceColour, priceXl, priceNote?, inStock, createdAt, updatedAt`. Numeric prices may be null. | `REF-` plus six random uppercase letters/digits. V2 `src/pages/StaffInventory.tsx:89`. |
| `deletedRefillInventory` | V2 | Full refill inventory item plus `deletedAt`. | Original refill ID. No archive reader found. |
| `keyBoard` | V2 | `position, row, number, status` (`recorded` or `empty`), `models[], codes[], entry?, notes?, updatedAt?`. Cleared slots remain documents with empty arrays. | Uppercase physical position such as `A1`. Seed contains 691 positions, not a live count (`scripts/keyBoardSeed.json:1`); model V2 `src/lib/keyBoard.ts:25`. |
| `keyReference` | V2 | `code, displayNames?, identified, brandSystem?, fits?, category?, keyway?, keywayFamily?, interchangeableKeyways[]?, equivalents[]?, explanation?, cautions?, confidence?, sources[]?, notes?, needsReview?, agreement?, updatedAt?`. Equivalent: `brand, ref, confidence, source?`; confidence `high/medium/low`. | Normalized blank code. Import additionally replaces `/` with `_`, handles dots-only IDs, truncates to 200 characters. 498 seed JSONL rows, not a live count. V2 `src/lib/keyReference.ts:27`, `scripts/importKeyReference.mjs:58`, `scripts/keyReference.vetted.jsonl:1`. |
| `employees` | V2 | `id, name, active, createdAt`. Employees are schedule subjects, not Firebase Auth accounts or role records. | `EMP-` plus six random uppercase letters/digits. V2 `src/lib/timesheet.ts:12`. |
| `scheduleShifts` | V2 | `id, employeeId, employeeName, date, start, end, note?, actualStart?, actualEnd?, breakMinutes?, adjustedAt?, createdAt`. Date is local `YYYY-MM-DD`, times local `HH:MM`. | `SHF-` plus six random uppercase letters/digits. V2 `src/lib/schedule.ts:11`. |
| `timeEntries` (retired) | V2 | Only a reserved collection constant remains. No current read/write or current document schema found. Historical production fields unknown. | Unused `TE-` generator remains. V2 `src/lib/timesheet.ts:5`, `src/lib/firestore.ts:126`. Do not infer that old data is absent. |
| `transactions` | V2 | `id, amount, currency` (`CAD`), `status` (`recorded/approved/declined`), `method` (`card`), `customerName, customerPhone, source` (`ai-mode`), `relatedAction, deviceStubbed, createdAt, updatedAt`. Amount is the intended total, with applicable tax. | `TXN-` plus six random uppercase letters/digits. V2 `src/ai/actions/purchaseRecorder.ts:21`. No transaction listing reader found. |
| `settings/shop` | V2 | `phone, email, week[]` (seven `{open, close}` integer-hour pairs), `addressLines[], thankYou, updatedAt`. Public shop facts only. | One fixed `shop` document in `settings`. V2 `src/lib/shopSettings.ts:4`, `:96`. |
| `accessPins/manager` | V2 proxy | `pinHash, role, updatedAt`. Role written as `manager`; hash is SHA-256 of `pepper:pin`. | One fixed `manager` document used by Worker. Browser does not read it. V2 `proxy/src/manager.js:28`, `:129`, `:143`. |

The shared concepts retain the same collection names across these snapshots. Field differences verified above are key inventory pricing/location and directory order optionality; V2 AI note categories also differ from the classic schema. Both trees support older single-cartridge order fields `cartridgeBrand, cartridgeModel, cartridgeType, price` when `cartridges` is missing (`both:src/lib/cartridges.ts:56`).

Zod schemas are not proof of stored collections. `both:src/utils/validation.ts:42` contains a richer generic inventory schema (`brand, model, type, stockQuantity, reorderLevel, costPrice, sellPrice, supplier, notes`), cartridge form fields (`serviceType`), receipt schemas, blog and integration settings schemas. No corresponding `inventory`, `receipts`, `blogPosts` or integration-settings Firestore writer was found. Actual saved fields are listed above. The note schema is at `both:src/utils/validation.ts:90`.

## 2. Auth

| Tree | Verified behavior |
| --- | --- |
| both | Email/password login and logout through Firebase Auth, `src/hooks/useAuth.ts` (V1 `:39`, V2 `:45`). `StaffLogin.tsx` submits those credentials. `ProtectedRoute.tsx:8` checks a user exists on the client; it does not check a staff role document or email allowlist. V1 `FeatureProtectedRoute.tsx:20` has the same user check and an always-enabled feature switch. No Google, phone, anonymous sign-in or account-registration flow found. |
| both | Development bypass needs `VITE_NODE_ENV === 'development'` and `VITE_DEV_BYPASS_AUTH === 'true'` (V1 `src/hooks/useAuth.ts:17`, V2 `:25`). Creates mock `dev-user`; this supplies no real Firebase credentials or database permissions. V2 shares mock sign-out between hook instances. |
| V2 | Manager PIN is 4 to 8 digits. `src/lib/managerAuth.ts:21` posts status, set/change PIN, unlock and lock to the Worker. Unlock uses `signInWithCustomToken`, refreshes ID token, and reads `claims.manager === true` (`:55`, `:77`). `src/contexts/ManagerModeContext.tsx:68` watches ID token changes. UI state is a convenience gate; rules must enforce writes. Dev bypass uses a local manager toggle. |
| V2 | Worker reads `accessPins/manager`, checks hash and mints a token with `manager: true` and `role` on unlock, `manager: false` on lock (`proxy/src/manager.js:174`). Staff share a login per Worker comments. No per-employee credential flow found. Current code takes caller-supplied UID without verifying an ID token; first PIN setup needs no existing credential, changes need current PIN. CORS is an origin filter, not user verification (`proxy/src/worker.js:303`). |
| V2 | `src/pages/StaffSettings.tsx:24` edits shop details, exposes manager state (`:257`) and device lock settings. `src/lib/deviceLock.ts:1` wraps an existing saved Firebase session with local WebAuthn platform user verification. Credential metadata lives in localStorage; unlocked UID/method live in sessionStorage. Five minutes hidden expires unlock (`:59`). No server verifies WebAuthn signatures; this is not Firebase passkey sign-in. Login marks password unlock (`src/hooks/useAuth.ts:54`); gate is `src/components/shell/DeviceLockGate.tsx`. |
| V1 | No manager PIN/custom-token flow or device lock found in V1 source. Signed-in access is the client-side staff gate. Backend authorization beyond the documented rules is unknown. |

Firestore security rules and `firebase.json` are NOT in this repo. Rules live in the Firebase console; the rest of the deployed rule set is unknown. `docs/ENVIRONMENTS.md:62` confirms console management. Its `:129` gives this rule verbatim (V2 documentation):

```text
match /settings/shop {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.manager == true;
}
```

V2 `docs/ui-rehaul/HANDOFF.md:103` says prod lacks this rule, so the live page falls back to built-in shop facts. At `:183` it records a reported DEV rule addition, explicitly not verified by an agent. These are documentation reports, not a console audit.

Other rule text quoted by V2 handoff: `allow read, write: if request.auth != null` (`:2057`); manager writes require `request.auth.token.manager == true`, and `accessPins` is admin-only (`if false`) (`:1997`). The older `appSettings/manager` client PIN store described at `:2032` has no current source reader/writer, so it is historical only; whether its data remains is unknown. Later handoff text (`:1509`) says staff shift updates may change only `actualStart, actualEnd, breakMinutes, adjustedAt`, while create/delete or other changes need manager claim. Current code agrees (`src/lib/schedule.ts:30`). No complete deployed rule text is available for these collections or the public `orderStatus` mirror.

## 3. Cloud Functions, scheduled jobs, triggers, third-party calls

| Tree | Item |
| --- | --- |
| both | Cloud Functions, `functions/`, `httpsCallable`, Firebase scheduled jobs and database triggers: **none found**. No app-side mail delivery or payment gateway API integration found. |
| V2 | Cloudflare AI Worker: browser POST from `src/ai/providers/llm.ts:127` to `VITE_AI_PROXY_URL`. It sends routing utterance/context, not a database query. Worker calls Anthropic Messages (`proxy/src/worker.js:235`), default `claude-haiku-5-5`, then Google Gemini generateContent fallback (`:282`), default `gemini-flash-lite-latest`. Local deterministic parsing remains available. |
| V2 | Worker configuration: `ANTHROPIC_API_KEY, ANTHROPIC_MODEL, GEMINI_API_KEY, GEMINI_MODEL, ALLOWED_ORIGIN`; manager module additionally `FIREBASE_SA, PIN_PEPPER`. `proxy/wrangler.toml:1` names `inktonermoore-ai-proxy`, entry `src/worker.js`, allowed staging origin and Anthropic model. Runtime secret values were not read. No scheduled handler or cron config found. |
| V2 | Manager REST calls: browser `src/lib/managerAuth.ts:27`; Worker OAuth token exchange `proxy/src/manager.js:110`, Firestore REST read `:130` and PATCH `:144`, signed Firebase custom tokens `:85`. `FIREBASE_SA` supplies service-account project ID, email and signing key. |
| V2 | Seed/import scripts are manual tools, not jobs: `scripts/seedKeyBoard.mjs:43` and `scripts/importKeyReference.mjs:74` exchange service-account JWTs for Google OAuth tokens; `:83` / `:110` call Firestore commit REST API. `mergeKeyResearch.mjs` merges local research files. None were run for this inventory. |
| both | Courier tracking is external navigation, no courier API/database: `src/components/SmartTracker.tsx` (V1 `:34`, V2 `:43`) links to UPS, FedEx, Purolator. V1 `src/pages/Index.tsx:181` also builds links. V2 `src/ai/tracking.ts:12` adds Canada Post and DHL. Directory stores third-party shipping/admin URLs, not integrations (`StaffDirectory.tsx`, V1 `:124`, V2 `:145`). |
| both | Email/contact and maps are links: V1 `src/pages/PublicHome.tsx:386` mailto, `:19` Google Maps; V2 `src/components/public/Location.tsx:19` mailto, `src/lib/storeInfo.ts:4` studio/Maps URLs. No email ingestion, attachment inbox, SMS sender or automated ready notification found. |
| V2 | Moneris terminal send is explicitly unbuilt: `src/ai/actions/purchaseRecorder.ts:3`. Code records intended payment, staff use physical terminal and manually mark status (`src/components/ai/artifacts/PaymentCard.tsx:60`). No card data processing or other payment provider call found. |

## 4. Storage

**both:** Firebase Storage usage, upload/download calls, stored file types: **none found**. `src/lib/firebase.ts:9` supplies `VITE_FIREBASE_STORAGE_BUCKET` with demo fallback `demo-project.appspot.com`, but initializes Auth and Firestore only. Actual configured bucket contents and names are unknown; a config key does not establish stored files.

| Tree | Files produced locally |
| --- | --- |
| both | jsPDF receipt PDFs, letter and 4x6 formats: `src/lib/simpleReceipt.ts` (V1 `:55`, save `:167`; V2 `:461`, save `:463`); classic forms `src/pages/StaffReceipts.tsx`. No receipt document collection is written. |
| V2 | AI receipt/label output in `src/ai/actions/receipt.ts`, `src/ai/actions/label.ts`, `src/ai/receiptOutput.ts`. Uses browser-generated receipt/label artifacts, no Storage upload found. |
| V1 | `src/utils/dataExport.ts:21` CSV Blob download; `:57` PDF export; `:225` export-all helper creates a JSON Blob using a caller-supplied `googleSheetsService`. This is a utility, not verified as an active UI backup or a Firebase export. No such file in V2. |

## 5. Screens and features that talk to Firebase

This table also supplies collection read/write locations for section 1. Paths without a prefix in a row belong to that row's tree. Archives are written before active documents are deleted; no archive browsing screen was found.

| Feature | Tree | Files and operations |
| --- | --- | --- |
| Purchase | V2 | `src/ai/actions/purchaseRecorder.ts:90` W `transactions`; `src/components/ai/artifacts/PaymentCard.tsx:60` W approval/decline status. No separate persisted read found. V1: none found. |
| Receipt | both | `src/pages/StaffReceipts.tsx` generates PDFs, no direct Firestore access. V2 AI `src/ai/actions/receipt.ts` uses key prices via `src/ai/keys.ts:37` R `keyInventory`; shop address/details come from loaded settings. Optional attached purchase/record actions write their respective collections. |
| Record | V2 | AI `src/ai/actions/cartridge.ts:175`, `:215`, `:243` R `cartridgeOrders`; `:152` W create, `:193` W status, `:131` W `orderStatus`. Record is the cartridge-order workflow, not a separate `records` collection. V1 equivalent is Cartridges below. |
| Note | V1 | `src/pages/StaffNotes.tsx:69` R `notes`; `:115`, `:149` W `notes`; `:173` W `deletedNotes`, `:177` D `notes`. |
| Note | V2 | `src/pages/StaffNotes.tsx:75` R `notes`; `:121`, `:156` W; `:181` W `deletedNotes`, `:185` D `notes`. AI `src/ai/actions/collections.ts:57` W `notes`. |
| Inventory | V1 | `src/pages/StaffInventory.tsx:106` R `keyInventory`; `:156`, `:173` W; `:186` W `deletedKeyInventory`, `:190` D active item. |
| Inventory | V2 | `src/pages/StaffInventory.tsx:203`, `:214` R `keyInventory, refillInventory`; `:308`, `:368` W keys; `:350`, `:383` W refills; `:395`, `:413` W respective deleted collections; `:399`, `:417` D active items. AI `src/ai/actions/collections.ts:83` W key; `:164` R keys/refills. `src/components/ai/artifacts/InventoryCard.tsx:144`, `:227` W prices, stock and key cutCode. |
| Key board/reference | V2 | Inventory and AI use `src/lib/keyBoard.ts:77` R `keyBoard`; `:129`, `:148`, `:153` W models/clear/notes. AI location action `src/ai/actions/collections.ts:269` delegates here. `src/lib/keyReference.ts:86` R `keyReference` for inventory/reference answers. Manual script W references `scripts/importKeyReference.mjs:110`, board `scripts/seedKeyBoard.mjs:83`. |
| Timesheet | V2 | `src/pages/StaffTimesheet.tsx:491` R `employees`, `:492` R `scheduleShifts`; `:540`, `:552` W employee create/active; `:614`, `:649`, `:659` W shift adjustments/plan/create; `:678` D shift. AI `src/ai/actions/timesheet.ts:65`, `:68` R same collections; `:81`, `:90`, `:165` W employee create/reactivate; `:161`, `:239` W shift create/adjust. No current `timeEntries` R/W. V1: none found. |
| Cartridges/refills | V1 | `src/pages/StaffCartridges.tsx:394` R `cartridgeOrders`; `:464`, `:500`, `:538` W order/status/edit; `:448` W `orderStatus`; `:563` W `deletedOrders`; `:567`, `:568` D order/mirror. |
| Cartridges/refills | V2 | `src/pages/StaffCartridges.tsx:399` R `cartridgeOrders`; `:469`, `:505`, `:545` W order; `:453` W `orderStatus`; `:570` W `deletedOrders`; `:574`, `:575` D order/mirror. AI Record accesses are above. |
| Tracking | both | `src/pages/StaffTracking.tsx`, `src/components/SmartTracker.tsx`: external links, no Firebase calls. V2 AI `src/ai/actions/track.ts` builds tracking artifact, no Firebase collection. |
| Directory | V1 | `src/pages/StaffDirectory.tsx:232` R `directoryLinks`; `:240` W seed if empty; `:314`, `:338` W add/edit; `:362` W `deletedDirectoryLinks`; `:366` D active link. |
| Directory | V2 | `src/pages/StaffDirectory.tsx:256` R `directoryLinks`; `:264` W seed; `:351`, `:363` W reorder/category; `:402`, `:426` W add/edit; `:450` W `deletedDirectoryLinks`; `:454` D active link. AI `src/ai/actions/collections.ts:245` W directory link. |
| Requests | V1 | `src/pages/StaffRequests.tsx:70` R `customerRequests`; `:104` W add; `:122` W `completedCustomerRequests`; `:126` D active request. V2 feature absent. |
| Settings/shop details | V2 | `src/pages/StaffSettings.tsx:71` delegates W to `src/lib/shopSettings.ts:96`, fixed `settings/shop`. R at `:85`, initialized by `src/main.tsx:6` and `src/public-main.tsx:30`. Shared consumers include public hours/contact/footer, staff rail, receipt/card. Manager PIN goes through Worker, not browser Firestore CRUD. V1 has no equivalent saved shop details feature. |
| Public portal lookups/forms | both | V1 `src/pages/PublicHome.tsx:57`, V2 `src/components/public/RefillStatus.tsx:43` R `orderStatus` by normalized `customerLastName`. No public Firestore writer or request form submission found. V2 also R `settings/shop` as above. Tracking form opens courier links. |
| AI actions | V2 | All Firebase operations in `src/ai/actions` are included above: purchaseRecorder, cartridge, collections, timesheet. `purchase.ts` registers/delegates recorder, receipt uses price helper, label/track do not store documents. Artifact editors also write directly as listed above. No AI tree in V1. |
| Login and staff shell | both | Login and protected routes use Firebase Auth as in section 2; no role collection. V2 additionally watches manager token and applies local device lock. V1 Dashboard has no Firestore calls found. |

## 6. Hard to move

| Concern | Tree | Verified dependency |
| --- | --- | --- |
| Realtime listeners | both | `onSnapshot`: none found in either source tree. Reads use getDocs/getDoc. Auth listeners exist: `src/hooks/useAuth.ts` (V1 `:28`, V2 `:37`); V2 manager `src/contexts/ManagerModeContext.tsx:75` uses onIdTokenChanged. `shopSettings` subscribers are local store listeners, not Firestore listeners. |
| Offline persistence | both | `enableIndexedDbPersistence`, persistent Firestore cache setup or similar: none found. Firestore initialized by getFirestore only (`src/lib/firebase.ts:16`). Local deterministic AI parsing in V2 does not make database writes offline-independent. |
| Local mirrors/caches | V2 | `src/lib/shopSettings.ts:54` localStorage `shop-settings-cache`, sanitized on load, overwritten after successful load/save; permission/network failures keep cached values, missing doc resets defaults and clears cache (`:85`). `src/lib/keyReference.ts:86` caches the read promise in memory; `src/ai/keys.ts:37` fetches pricing for each resolution. These need refresh behavior considered separately from UI state. |
| Other browser state | both | Theme localStorage is UI preference, not Firestore data (`src/contexts/ThemeContext.tsx`, V1 `:18`, V2 `:24`). V2 additionally stores device-lock metadata, schedule view, hidden tiles, shell/composer state and AI correction history locally (`src/lib/deviceLock.ts:23`, `src/pages/StaffTimesheet.tsx:473`, `src/hooks/useHiddenTiles.ts:9`, `src/components/shell/StaffShell.tsx:23`, `src/ai/corrections.ts:19`). No V1 Firestore mirror in localStorage found. |
| Rule-dependent behavior | both | Browser staff gate alone does not authorize database writes. Public mirror must remain publicly queryable under its real rules, currently unknown. V2 settings needs public read and manager write; schedule needs manager planning and restricted staff actual-time adjustment; PIN records must not be browser-readable. Exact deployed rules remain unknown, see section 2. |
| IDs generated in browser | both | `src/lib/firestore.ts:66` ORD, `:76` NOTE, `:86` REQ, `:96` INV; V2 adds `:106` REF, `:116` EMP, `:126` TE (unused), `:136` TXN, `:146` SHF. Each uses Math.random, six uppercase alphanumeric characters, no collision retry in helper. Directory generates DIR similarly (V1 `src/pages/StaffDirectory.tsx:189`, V2 `:208`). setDoc replacement means ID reuse can overwrite. Board/reference and settings/PIN IDs are stable as listed above. |
| Timestamp/serverTimestamp | both | Firebase Timestamp/serverTimestamp usage: none found. Stored timestamps come from client `new Date().toISOString()` (for example Notes V1 `src/pages/StaffNotes.tsx:111`, V2 `:117`); V2 Worker and scripts also write ISO strings. Local date/time fields and numeric directory order are distinct from these timestamps. |
| Transactions/batched writes | both | SDK runTransaction/writeBatch: none found. Archive, active deletion and mirror updates are separate awaited writes (`StaffCartridges.tsx`, V1 `:563`, V2 `:570`); partial failure can leave inconsistent copies. Directory seeds/reorders use Promise.all, not an atomic batch. V2 manual seed/import scripts do use REST commit batches, board chunks of 400 (`scripts/seedKeyBoard.mjs:73`), reference chunks of 300 (`scripts/importKeyReference.mjs:100`). |
| Queries and compatibility | both | Equality filter on public normalized last name and descending orderBy collection reads must preserve results and ID semantics (`src/lib/firestore.ts:17`, `:25`). Older cartridge shape needs fallback (`src/lib/cartridges.ts:56`). V2 AI writes can be sparser or have different note categories from classic forms. No checked-in Firestore index definitions found. |
