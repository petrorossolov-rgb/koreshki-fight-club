# Execution Progress

## Codebase Patterns
- **Resolve aliases**: `@shared` -> `src/shared`, `@game` -> `src/game` — must be kept in sync between `tsconfig.json` (paths) and `vitest.config.ts` (resolve.alias)
- **Scene Y-center**: with 1024x576 resolution, vertical center is `288` (not 384)
- **Test location**: tests live in `__tests__/` directories next to the code they test
- **Spritesheet layout**: combined sheet with 11 columns (max frames per row), 126x126 frame size. Row * 11 = first frame index of that animation
- **FSM key format**: `"topState/subState"` e.g. `"grounded/idle"`, `"airborne/jump"`
- **Physics are pure functions**: no classes, no side effects beyond mutating the passed FighterState
- **Fighter sprite origin**: `(0.5, 1)` — bottom-center for floor alignment at FLOOR_Y
- **Animation key prefix**: `{configId}_p{playerIndex}_` avoids collisions when two fighters share a spritesheet
- **Engine step order**: phaseFrames++ → (phase switch) → FSM tick → gravity → velocity → clampToStage → pushbox → autoFace → processHits → timer
- **Hit detection timing**: frameInState is incremented by tickFSM BEFORE processHits runs — active frames start at frameInState=startup (1-indexed after tickFSM)
- **Blocking**: defender must hold back + be grounded + not attacking. Blocked = no damage, blockstun, knockback×0.5
- **Round phases**: Intro(60f) → Fight → KO(120f) → RoundEnd(transient) → MatchEnd. Tests skip Intro by setting roundPhase=Fight
- **Resolve aliases (3 places)**: `tsconfig.json` (paths), `vitest.config.ts` (resolve.alias), `vite/config.*.mjs` (resolve.alias) — all must stay in sync

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

## [2026-04-04] — [T09] Create src/game/entities/Fighter.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/Fighter.ts`
- **Learnings**: STATE_TO_ANIM map converts FSM keys ("grounded/idle") to config anim names ("idle"). Sprite origin set to (0.5, 1) for floor alignment.
- **Patterns**: Animation keys prefixed with `{configId}_p{playerIndex}_` to avoid collisions between two fighters using same spritesheet.

## [2026-04-04] — [T10] Create src/shared/FightEngine.ts
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: FightEngine (shared) imports FighterFSM from `@game/entities/` — FSM is pure logic but lives under game/. Dependency direction is slightly awkward but works since FSM has zero Phaser imports.
- **Patterns**: Engine step order: FSM → gravity → velocity → clampToStage → pushbox → autoFace. Hit-stop early-return skips entire step.

## [2026-04-04] — [T11] Create FightScene.ts with fixed timestep loop
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts` (new), `src/game/main.ts`, `src/game/scenes/MainMenu.ts`, `src/game/scenes/Preloader.ts`, `vite/config.dev.mjs`, `vite/config.prod.mjs`, deleted `src/game/scenes/Game.ts`
- **Learnings**: Vite configs (dev + prod) had no resolve.alias — added `@shared` and `@game` aliases to match tsconfig paths. Character JSON loaded in Preloader, spritesheet in FightScene preload.
- **Patterns**: Vite alias config must stay in sync with tsconfig paths and vitest.config aliases (3 places total).

## [2026-04-04] — [T12] Create InputManager.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/systems/InputManager.ts` (new), `src/game/systems/__tests__/InputManager.test.ts` (new), `src/game/scenes/FightScene.ts`
- **Learnings**: InputManager owns Phaser Key objects — tests mock the bit-packing contract without Phaser dependency.
- **Patterns**: P1: WASD+QE, P2: Arrows+JK. `readInput(playerIndex)` returns `InputFrame` with packed bits.

## [2026-04-04] — [T13] Add attack states to FighterFSM
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/FighterFSM.ts`, `src/game/entities/__tests__/FighterFSM.test.ts`
- **Learnings**: frameInState increments AFTER update(), so stun/attack duration checks need `>= N` where N is the desired frame count. Stun actually lasts N+1 ticks (frames 0..N).
- **Patterns**: `tryAttack()` helper checks PUNCH/KICK input and transitions to `grounded/attack` with `currentMove` set. Attack states are non-interruptible — must complete startup+active+recovery.

## [2026-04-04] — [T14] Create CollisionSystem.ts
- **Status**: ✅ Done
- **Files changed**: `src/shared/CollisionSystem.ts` (new), `src/shared/__tests__/CollisionSystem.test.ts` (new)
- **Learnings**: Hitbox flipping: when facing left, x offset is negated AND the box position shifts by -width to keep it on the correct side.
- **Patterns**: `toWorldAABB()` converts local offset to world coords with flip support. `checkHit()` only returns HitResult during active frames (startup < frameInState < startup+active).

## [2026-04-04] — [T15] Integrate CollisionSystem into FightEngine + hit reactions
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/types.ts`, `src/game/entities/FighterFSM.ts`, `src/shared/__tests__/FightEngine.test.ts`, + test helper updates in 3 other test files
- **Learnings**: frameInState is incremented by tickFSM BEFORE processHits runs, so active frame detection starts one step earlier than naively expected. hitstun.enter() zeros velX — knockback must be set AFTER transition.
- **Patterns**: `hitConfirmed` flag prevents multi-hit from same move. `stunDuration` stored directly on FighterState (not looked up from move config) for clean decoupling between attacker's move and defender's stun.

## [2026-04-04] — [T16] Add blocking logic
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: Block detection needs defender's input bits — processHits must receive inputs. Blocking only works when grounded and not attacking.
- **Patterns**: `isBlocking()` checks holdingBack + grounded + not attacking. Blocked hits: damage=0, blockstun from attacker's move config, knockback×0.5.

## [2026-04-04] — [T17] Add round management to FightEngine
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/constants.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: phaseFrames must increment BEFORE phase switch (1-indexed) to avoid off-by-one in timer/phase transition checks. RoundEnd is a transient phase — processed immediately in one step.
- **Patterns**: `setPhase()` resets phaseFrames to 0 on transition. `resetFightersForRound()` preserves roundWins. Round phases: Intro(60f)→Fight→KO(120f)→RoundEnd→MatchEnd.

## [2026-04-04] — [T18] Create HealthBar.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/HealthBar.ts` (new), `src/game/scenes/FightScene.ts`
- **Learnings**: Bar origin positioning differs per player — P1 anchors left edge, P2 anchors right edge for correct drain direction.
- **Patterns**: Lerp-based smooth drain (0.08 speed) for game feel. Color shift at 50% and 25% HP thresholds.

## [2026-04-04] — [T19] Create RoundDisplay.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/RoundDisplay.ts` (new), `src/game/scenes/FightScene.ts`
- **Learnings**: Phase change detection via `lastPhase` tracking avoids repeated tween triggers.
- **Patterns**: Announcements use Back.easeOut scale tween for punchy feel. Round dots positioned symmetrically around center.

## [2026-04-04] — [T20] Update GameOver scene + complete local loop
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/GameOver.ts`, `src/game/scenes/FightScene.ts`
- **Learnings**: Scene data passed via `this.scene.start('GameOver', { winner })` and received in `create(data)`.
- **Patterns**: Reusable `createButton()` helper for interactive rectangles with hover states. Full loop: MainMenu→FightScene→GameOver→rematch/menu.
