# AI Mode - Handoff (living state)

Update this at the end of every phase and before any context handoff. To resume,
read `00-research.md`, `01-design.md`, `02-implementation-plan.md`, then this file.

## Where we are
- **Phase:** 0 and 1 DONE. Phase 2 (deterministic extractors + confirmation check) next.
- **Branch:** ai-mode-overhaul (session branch, off main via GitButler).
- **Prod:** untouched by design. Do not modify `deploy.yml` or `public/CNAME`.
- **Build/lint:** `yarn build` green. New AI files lint-clean (one benign
  react-refresh warning on context.tsx, same pattern as existing ThemeContext).
  NOTE: the repo's baseline `yarn lint` already fails on pre-existing files
  (dataExport.ts, validation.ts, tailwind.config.ts) - not ours, do not "fix"
  as part of this work unless asked.
- **Tooling note:** node is not on PATH in the sandbox. Use
  `export PATH="/nix/store/zm0k3k5802qlww0llyl13s7hiw0jd6yl-nodejs-24.18.1/bin:$PATH"`
  then `corepack yarn <cmd>` (set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`).

## Done
- Research, design, plan docs (`00`/`01`/`02`).
- User decisions locked: full build now at lowest cost; deterministic core +
  pluggable Gemini Flash-Lite; tracking deep-links now, WhereParcel later; prod
  stays as-is, overhaul deploys to a separate staging target.
- Phase 0: `src/ai/types.ts` (Intent, FieldValue, AiProvider, ChatTurn, Artifact),
  `src/ai/context.tsx` (AiModeProvider + useAiMode: chat turns, artifact, open state).
- Phase 1: `src/components/ai/TabDock.tsx` (fixed dock, staff-only, routes + AI toggle),
  `AiOverlay.tsx` (chat column, echoes routed intent), `Composer.tsx` (input + send).
  `src/ai/providers/deterministic.ts` (keyword router) + `providers/index.ts` (selector).
  Mounted once in `App.tsx` inside BrowserRouter, outside Routes. Non-breaking.

## Next
- Phase 2: flesh out `deterministic.ts` field extractors (phone, email, money, date,
  courier+tracking, brand/model, qty, city/province/country) with provenance +
  guessed defaults. Build `src/components/ai/ConfirmationCheck.tsx` (?/i markers,
  Always-shown vs No-show-if-blank, guessed=amber/dashed, inline Edit, gated Confirm)
  and render it in AiOverlay for pending intents.
- Then Phases 3-9 per `02-implementation-plan.md`.

## Open questions / watch-outs
- Exact staging host (Cloudflare Pages vs Firebase Hosting vs separate gh-pages
  branch) - decide at Phase 8; build stays host-agnostic until then.
- Proxy host for the LLM (Cloudflare Worker vs Firebase Function) - Phase 8.
- Dock placement (bottom rail vs side rail) - decide during Phase 1 build against
  the real theme; keep it calm and uncluttered.

## Invariants (do not violate)
- Nothing existing breaks; classic pages stay reachable and identical.
- `orderStatus` never widened; cartridge 3-status enum intact.
- Model never runs business logic; it only emits typed intent + provenance.
- No em dashes. Theme via `themeClasses`. Reuse existing lib helpers.
