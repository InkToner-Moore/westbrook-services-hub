# AI Mode - Handoff (living state)

Update this at the end of every phase and before any context handoff. To resume,
read `00-research.md`, `01-design.md`, `02-implementation-plan.md`, then this file.

## Where we are
- **Phase:** 0 (Foundation) - starting.
- **Branch:** ai-mode-overhaul (session branch, off main via GitButler).
- **Prod:** untouched by design. Do not modify `deploy.yml` or `public/CNAME`.

## Done
- Research complete (`00-research.md`).
- Design complete (`01-design.md`).
- Plan complete (`02-implementation-plan.md`).
- User decisions locked: full build now at lowest cost; deterministic core +
  pluggable Gemini Flash-Lite; tracking deep-links now, WhereParcel later; prod
  stays as-is, overhaul deploys to a separate staging target.

## Next
- Phase 0: scaffold `src/ai/types.ts` + `src/ai/context.tsx` (AiModeProvider).
- Phase 1: TabDock + AiOverlay + Composer mounted in `App.tsx`.

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
