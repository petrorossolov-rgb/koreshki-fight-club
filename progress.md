# Execution Progress

## Codebase Patterns
- **Resolve aliases**: `@shared` -> `src/shared`, `@game` -> `src/game` — must be kept in sync between `tsconfig.json` (paths) and `vitest.config.ts` (resolve.alias)
- **Scene Y-center**: with 1024x576 resolution, vertical center is `288` (not 384)
- **Test location**: tests live in `__tests__/` directories next to the code they test

## Docs Debt
<!-- Items logged by /execute, /change, /incident. Resolved by /sync-docs. -->

## Follow-ups
<!-- Tasks deferred from /incident or /change that need proper implementation later. -->

## Task Log

## [2026-04-04] — [T01] Project cleanup: resolution, telemetry, vitest
- **Status**: ✅ Done
- **Files changed**: `package.json`, `src/game/main.ts`, `index.html`, `Preloader.ts`, `MainMenu.ts`, `Game.ts`, `GameOver.ts`, deleted `log.js`
- **Learnings**: Template had telemetry beacon (log.js pinging gryzor.co), both in scripts and as a separate file
- **Patterns**: Scene Y-coordinates = height / 2

## [2026-04-04] — [T02] Update CLAUDE.md with architecture conventions
- **Status**: ✅ Done
- **Files changed**: `CLAUDE.md`
- **Learnings**: None — straightforward docs update

## [2026-04-04] — [T03] Vitest config + smoke test
- **Status**: ✅ Done
- **Files changed**: `vitest.config.ts`, `tsconfig.json`, `src/shared/__tests__/smoke.test.ts`
- **Learnings**: tsconfig had no paths/baseUrl — added them to match vitest resolve aliases
- **Patterns**: Keep tsconfig paths and vitest aliases in sync
