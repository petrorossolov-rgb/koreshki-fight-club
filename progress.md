# Execution Progress

## Codebase Patterns
- **Resolve aliases**: `@shared` -> `src/shared`, `@game` -> `src/game` — must be kept in sync between `tsconfig.json` (paths) and `vitest.config.ts` (resolve.alias)
- **Scene Y-center**: with 1024x576 resolution, vertical center is `288` (not 384)
- **Test location**: tests live in `__tests__/` directories next to the code they test
- **Spritesheet layout**: combined sheet with 11 columns (max frames per row), 126x126 frame size. Row * 11 = first frame index of that animation
- **FSM key format**: `"topState/subState"` e.g. `"grounded/idle"`, `"airborne/jump"`
- **Physics are pure functions**: no classes, no side effects beyond mutating the passed FighterState

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

## [2026-04-04] — [T04] Create src/shared/types.ts
- **Status**: ✅ Done
- **Files changed**: `src/shared/types.ts`, `src/shared/__tests__/types.test.ts`
- **Learnings**: const enum values inline at compile time — vitest handles them fine with default TS transform
- **Patterns**: Discriminated unions for network messages (type field as discriminant)

## [2026-04-04] — [T05] Create src/shared/constants.ts
- **Status**: ✅ Done
- **Files changed**: `src/shared/constants.ts`
- **Learnings**: None — straightforward constants file

## [2026-04-04] — [T06] Create src/shared/PhysicsSystem.ts
- **Status**: ✅ Done
- **Files changed**: `src/shared/PhysicsSystem.ts`, `src/shared/__tests__/PhysicsSystem.test.ts`
- **Learnings**: Pushbox resolution needs symmetric push (half overlap each) to avoid bias
- **Patterns**: Physics as pure functions mutating FighterState — no classes needed

## [2026-04-04] — [T07] Create src/game/entities/FighterFSM.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/FighterFSM.ts`, `src/game/entities/__tests__/FighterFSM.test.ts`
- **Learnings**: Backward walk speed at 0.7x feels right for fighting game. Air control at 0.8x walkSpeed.
- **Patterns**: Flat `Record<string, StateHandler>` with `"topState/subState"` keys. `transition()` calls exit→enter.

## [2026-04-04] — [T08] Download sprites + create default.json
- **Status**: ✅ Done
- **Files changed**: `public/assets/fighters/martial-hero.png`, `public/data/characters/default.json`, `scripts/combine-sprites.mjs`
- **Learnings**: LuizMelo Martial Hero 3 (hunter variant) — 126x126 frames, no crouch animation (reused fall frame 0). itch.io packs can't be downloaded via script, sourced CC0 copies from GitHub.
- **Patterns**: Spritesheet grid layout: 11 cols × 7 rows, frame index = row*11 + col
