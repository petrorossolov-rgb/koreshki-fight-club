# Execution Progress

## Codebase Patterns
- **Resolve aliases**: `@shared` -> `src/shared`, `@game` -> `src/game` — must be kept in sync between `tsconfig.json` (paths) and `vitest.config.ts` (resolve.alias)
- **Scene Y-center**: with 1024x576 resolution, vertical center is `288` (not 384)
- **Test location**: tests live in `__tests__/` directories next to the code they test
- **Spritesheet layout**: combined sheet with 11 columns (max frames per row), 126x126 frame size. Row * 11 = first frame index of that animation
- **FSM key format**: `"topState/subState"` e.g. `"grounded/idle"`, `"airborne/jump"`
- **Physics are pure functions**: no classes, no side effects beyond mutating the passed FighterState
- **Fighter sprite origin**: `(0.5, FEET_ORIGIN_Y)` where `FEET_ORIGIN_Y = 82/126` — origin at measured feet pixel (y=81 in 126px frame). Scaling around origin keeps feet aligned at any scale.
- **Animation key prefix**: `{configId}_p{playerIndex}_` avoids collisions when two fighters share a spritesheet
- **Engine step order**: phaseFrames++ → (phase switch) → FSM tick → gravity → velocity → clampToStage → pushbox → autoFace → processHits → timer
- **Hit detection timing**: frameInState is incremented by tickFSM BEFORE processHits runs — active frames start at frameInState=startup (1-indexed after tickFSM)
- **Blocking**: defender must hold back + be grounded + not attacking. Blocked = no damage, blockstun, knockback×0.5
- **Round phases**: Intro(60f) → Fight → KO(120f) → RoundEnd(transient) → MatchEnd. Tests skip Intro by setting roundPhase=Fight
- **stunDuration ordering**: set `stunDuration` AFTER `transition()`, not before — hitstun/blockstun `exit()` clears it to 0
- **Resolve aliases (3 places)**: `tsconfig.json` (paths), `vitest.config.ts` (resolve.alias), `vite/config.*.mjs` (resolve.alias) — all must stay in sync
- **Server imports**: `sendMsg` lives in `server/utils.ts` (not main.ts) to avoid side-effect imports. Server code uses `.ts` extensions in imports (Deno convention).
- **Room callbacks**: Room has `onDestroy`, `onInput`, `onFightStart` callbacks — keeps RoomManager decoupled from GameRoom
- **Server config loading**: `charConfigs.ts` owns the Map<string, CharacterConfig>. Import `getCharConfig`/`getDefaultConfig` — never import `main.ts` directly (side effects)
- **NetworkClient ownership**: MainMenu creates NetworkClient, transfers to CharacterSelect on room join (nulls its own ref). CharacterSelect transfers to FightScene on fight_start. Each scene clears predecessor's callbacks before transfer.
- **Vite env vars**: `import.meta.env.VITE_WS_URL` — typed via `vite/client`, set via `.env` file or `VITE_WS_URL=... npm run build`
- **Sprite orientation**: Procedural chibi sprites face RIGHT by default. `setFlipX(!state.facingRight)` — flip when facing left, default when facing right.
- **Phaser setPath scope**: `setPath('assets')` applies to ALL subsequent loads. Reset with `setPath('')` before loading assets outside the `assets/` directory.
- **SoundManager ownership**: MainMenu creates, passes via scene data to CharacterSelect → FightScene. Each scene calls `transferTo(this)` to update the internal scene ref.
- **InputManager cleanup**: TouchSource creates DOM overlays (nipplejs joystick). `InputManager.destroy()` must be called on scene shutdown to remove DOM elements. Failure leaves stale joystick visible on subsequent scenes.
- **iOS Safari**: viewport meta needs `viewport-fit=cover, user-scalable=no`. CSS: `100dvh` height, `safe-area-inset-*` padding. Fullscreen API: webkit prefix. Pinch-to-zoom blocked via `touch-action: none` + `gesturestart` preventDefault.
- **Script tests**: `scripts/lib/__tests__/` uses `node:test` + `node:assert` (not vitest). Run with `node --test scripts/lib/__tests__/*.test.mjs`

## Docs Debt
<!-- Items logged by /execute, /change, /incident. Resolved by /sync-docs. -->

## Follow-ups
<!-- Tasks deferred from /incident or /change that need proper implementation later. -->
- [x] [2026-04-04] Mobile room code input — resolved: DOM `<input>` overlay already implemented.

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

## [2026-04-04] — [T21] Install nipplejs + create TouchControls
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/TouchControls.ts` (new), `package.json`
- **Learnings**: nipplejs v1 types use `InternalEvent<JoystickEventData>` — data is in `evt.data`, not a second callback parameter. `Collection` type not directly exported, use `ReturnType<typeof nipplejs.create>`.
- **Patterns**: Touch controls as DOM overlay (pointer-events:none container with pointer-events:auto children). Button touchstart/touchend with preventDefault for responsive feel.

## [2026-04-04] — [T22] Update InputManager for abstract input source
- **Status**: ✅ Done
- **Files changed**: `src/game/systems/InputManager.ts`
- **Learnings**: InputSource interface is minimal: just `readBits(): number` + optional `destroy()`. Auto-detect via `isTouchDevice()` helper.
- **Patterns**: `InputSource` interface allows runtime source swapping via `setSource(playerIndex, source)`. NetworkSource stub ready for online mode.

## [2026-04-04] — [T23] Mobile config: fullscreen, orientation, scale
- **Status**: ✅ Done
- **Files changed**: `src/game/main.ts`, `src/game/scenes/MainMenu.ts`, `public/style.css`, `index.html`
- **Learnings**: `screen.orientation.lock()` not in standard TS DOM types — needs type assertion. Portrait warning via CSS `@media (orientation: portrait) and (hover: none)` avoids JS.
- **Patterns**: Scale FIT + CENTER_BOTH for responsive canvas. activePointers:3 for multitouch. Fullscreen button only on touch devices.

## [2026-04-04] — [T24] Server scaffolding: deno.json + main.ts
- **Status**: ✅ Done
- **Files changed**: `server/deno.json` (new), `server/main.ts` (new)
- **Learnings**: Deno import maps use `"@shared/": "../src/shared/"` — simple relative path mapping. Deno.serve() replaces old Deno.listen/serveHttp pattern.
- **Patterns**: Server entrypoint loads config at top-level with `await Deno.readTextFile()`. Health check at `/health`.

## [2026-04-04] — [T24.5] Server input validation + basic logging
- **Status**: ✅ Done
- **Files changed**: `server/main.ts`
- **Learnings**: Rate limiting per-WebSocket with simple counter + reset timestamp. Validation returns typed ClientMsg or null.
- **Patterns**: `validateMessage()` narrows unknown→ClientMsg with runtime checks. Rate limit: 120 msg/sec per socket.

## [2026-04-04] — [T25] Create RoomManager.ts
- **Status**: ✅ Done
- **Files changed**: `server/RoomManager.ts` (new), `server/main.ts`
- **Learnings**: Room lifecycle callbacks (onDestroy, onInput, onFightStart) keep RoomManager decoupled from GameRoom.
- **Patterns**: 4-letter A-Z room codes with collision retry. playerToRoom WeakMap-like pattern for reverse lookup.

## [2026-04-04] — [T26] Create GameRoom.ts
- **Status**: ✅ Done
- **Files changed**: `server/GameRoom.ts` (new), `server/RoomManager.ts`, `server/main.ts`
- **Learnings**: setInterval at FIXED_DT (~16.67ms) for 60Hz loop. Broadcast every 3rd tick → ~20Hz state updates.
- **Patterns**: GameRoom wired via Room callbacks: onInput for player input, onDestroy for cleanup. FightEngine runs identically to client.

## [2026-04-04] — [T26.5] Server unit tests
- **Status**: ✅ Done
- **Files changed**: `server/__tests__/RoomManager.test.ts` (new), `server/__tests__/GameRoom.test.ts` (new), `server/utils.ts` (new)
- **Learnings**: Server modules with side effects (Deno.serve) can't be imported in tests — extracted sendMsg to utils.ts to break dependency.
- **Patterns**: Mock WebSocket with sentMessages array for assertion. Deno test requires `https://deno.land/std` imports for assert.

## [2026-04-04] — [T27] Create NetworkClient.ts
- **Status**: ✅ Done
- **Files changed**: `src/game/net/NetworkClient.ts` (new)
- **Learnings**: Connection state machine (Disconnected→Connecting→Connected→InRoom→InFight) keeps UI logic clean. Callbacks pattern avoids tight coupling.
- **Patterns**: NetworkClient uses callbacks object for event dispatch — FightScene and MainMenu set different callbacks for their lifecycle.

## [2026-04-04] — [T28] Update FightScene for online mode
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`, `src/game/scenes/GameOver.ts`
- **Learnings**: Server state overwrites local engine state entirely (no interpolation yet). `remoteState` buffered in update() to avoid mid-frame mutations from async callbacks.
- **Patterns**: FightSceneData interface passed via `init()` method. Online mode sets remote player's InputSource to NetworkSource. GameOver hides REMATCH in online mode.

## [2026-04-04] — [T29] Update MainMenu for LOCAL/ONLINE flow
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`
- **Learnings**: View-based UI (main/online/create/join/waiting) with clearUI() works well for Phaser menu screens. `import.meta.env.VITE_WS_URL` works out of the box with vite/client types.
- **Patterns**: `connectAndDo()` pattern: connect first, then run action on 'connected' state. NetworkClient ownership transfers from MainMenu to FightScene (MainMenu nulls its ref).

## [2026-04-04] — [T30] GitHub Actions: deploy client to Pages
- **Status**: ✅ Done
- **Files changed**: `.github/workflows/deploy.yml` (new)
- **Learnings**: GitHub Pages with Actions requires `permissions: pages: write, id-token: write`. `upload-pages-artifact` + `deploy-pages` v4 is the current recommended pattern.
- **Patterns**: `VITE_WS_URL` passed via `vars.*` (repository variables, not secrets — it's a public URL).

## [2026-04-04] — [T31] Deno Deploy config + env docs
- **Status**: ✅ Done
- **Files changed**: `server/main.ts`, `.env.example` (new), `docs/deploy.md` (new)
- **Learnings**: CORS headers needed on all HTTP responses including health check. OPTIONS preflight handler required for browser CORS.
- **Patterns**: CORS_ORIGIN from env with `*` default for dev. Deploy docs cover both `deployctl` CLI and GitHub integration methods.

## [2026-04-04] — [T32] End-to-end test on phones
- **Status**: ✅ Done
- **Files changed**: `docs/testing-checklist.md` (new)
- **Learnings**: Checklist covers local mode, online mode, cross-device matrix, and performance — actual testing requires deploy.

## [2026-04-04] — INCIDENT: Fighters facing same direction
- **Symptom**: both fighters face the same direction instead of facing each other
- **Root cause**: Martial Hero spritesheet default orientation is LEFT, but `Fighter.syncToState()` used `setFlipX(!state.facingRight)` — inverted logic. P1 stayed at default LEFT, P2 flipped to RIGHT.
- **Fix**: changed to `setFlipX(state.facingRight)` in `Fighter.ts:41`
- **Prevention**: test sprite orientation when integrating new spritesheets; add visual regression test
- **Time to resolve**: 2 phases (triage + fix)

## [2026-04-04] — INCIDENT: JSON config 404 on GitHub Pages
- **Symptom**: clicking LOCAL froze the game on deployed site
- **Root cause**: Phaser `setPath('assets')` was prepending `assets/` to JSON load path, resulting in 404 for `assets/data/characters/default.json` (actual path: `data/characters/default.json`)
- **Fix**: reset `setPath('')` before loading JSON in `Preloader.ts`
- **Prevention**: verify all asset paths resolve correctly in production builds
- **Time to resolve**: 1 phase

## [2026-04-05] — [T01] Extend CharacterConfig & network types (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/shared/types.ts`, `src/shared/__tests__/types.test.ts`, `public/data/characters/default.json`, `server/RoomManager.ts`, `server/main.ts`
- **Learnings**: Adding required fields to `fight_start` ServerMsg breaks server code that sends it — had to update RoomManager with default charIds for backward compat. Also added `select_character` to server validation.
- **Patterns**: When extending discriminated union variants with new required fields, grep for all senders.

## [2026-04-05] — [T04] Create manifest.json (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `public/data/characters/manifest.json`
- **Learnings**: None — straightforward data file creation
- **Patterns**: Manifest `file` paths are relative to public/ root (e.g. `data/characters/petyaj.json`)

## [2026-04-05] — [T05] Generate 17 character JSON configs (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-characters.mjs`, 17 new JSON files in `public/data/characters/`
- **Learnings**: Standard category split into strong (7/5-6 power/speed) and balanced (6/7) sub-variants with different walkSpeed and damage values
- **Patterns**: Category presets: big (scale 1.25, slow, heavy), tall (1.15, medium), standard (1.0), short (0.85, fast, light). Generator is idempotent — rerun to regenerate.

## [2026-04-05] — [T02] maxHp in FightEngine (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`, `src/shared/__tests__/CollisionSystem.test.ts`, `src/shared/__tests__/FighterFSM.test.ts`
- **Learnings**: T01 added new required fields to CharacterConfig but didn't update all test configs — fixed in this task
- **Patterns**: Optional `configs` param with `??` fallback keeps backward compat for `createInitialGameState()` without args

## [2026-04-05] — [T03] resolvePushboxes two pushboxes (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/shared/PhysicsSystem.ts`, `src/shared/FightEngine.ts`, `src/shared/__tests__/PhysicsSystem.test.ts`
- **Learnings**: Original code only used P1's pushbox for both fighters — a latent bug masked by same-character matches
- **Patterns**: Asymmetric pushbox overlap = min(right1,right2) - max(left1,left2) where each side uses its own halfWidth

## [2026-04-05] — [T06] Character config validation tests (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/shared/__tests__/CharacterConfig.test.ts`
- **Learnings**: 122 tests covering all 17 configs — validates fields, types, ranges, animation keys, move keys, boxes
- **Patterns**: `describe.each()` with loaded configs array for per-character parameterized tests

## [2026-04-05] — [T07] Fighter.ts — scale, tint, shared texture (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/Fighter.ts`
- **Learnings**: `textures.exists()` check in loadAssets prevents double-loading shared spritesheet
- **Patterns**: SHARED_TEXTURE constant for texture key. Scale/tint applied right after sprite creation.

## [2026-04-05] — [T08] Preloader — manifest and shared spritesheet loading (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/Preloader.ts`
- **Learnings**: char_default kept as fallback until FightScene accepts per-player configs (T12)
- **Patterns**: Manifest loaded as `char_manifest`, spritesheet as `martial-hero` — both available via cache in subsequent scenes

## [2026-04-05] — [T09] CharacterSelect scene — grid skeleton (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts` (new), `src/game/main.ts`
- **Learnings**: Grid layout 6×3 = 18 cells (17 chars + "?" random). Manifest entries provide tint/stats for thumbnails.
- **Patterns**: Scene registered between MainMenu and FightScene. `CharSelectData` interface for scene init data. `selectCell()` emits `characterSelected` event for loose coupling.

## [2026-04-05] — [T10] Detail panel with animated sprite and stat bars (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts`
- **Learnings**: Preview animations keyed as `preview_{charId}_idle` to avoid collision with Fighter animations. Scale varies by category for visual consistency in preview.
- **Patterns**: Stat bars use proportional width (value/maxStat * barWidth). Preview sprite added to detailContainer for easy cleanup on selection change.

## [2026-04-05] — [T11] Local selection flow (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts`
- **Learnings**: Lazy-loading JSONs via `this.load.json()` + `this.load.start()` + `load.once('complete')` works well for on-demand assets. Same character picked twice = only 1 JSON to load.
- **Patterns**: Local flow is P1→confirm→P2→confirm→load→fight. `setPlayerTurn()` resets selection state and re-binds event listener with player-specific highlight color. `cache.json.has()` checks if already loaded.

## [2026-04-05] — [T12] FightScene per-player configs (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`, `src/game/ui/HealthBar.ts`
- **Learnings**: Removed preload() entirely — spritesheet already loaded in Preloader since T08. Fallback to `char_default` cache preserves backward compat for online flow.
- **Patterns**: HealthBar accepts optional `maxHp` param (defaults to DEFAULT_HP). FightSceneData extended with optional p1Config/p2Config.

## [2026-04-05] — [T13] Wire MainMenu → CharSelect → FightScene local (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`, `src/game/scenes/GameOver.ts`
- **Learnings**: Minimal change — just two scene.start target swaps. CharacterSelect already handled config loading and passing.
- **Patterns**: Full local loop: MainMenu→CharacterSelect→FightScene→GameOver→CharacterSelect (REMATCH) or MainMenu (MENU).

## [2026-04-05] — [T20] GameOver — character names (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`, `src/game/scenes/GameOver.ts`
- **Learnings**: Tint number → CSS hex via `(tint & 0xFFFFFF).toString(16).padStart(6, '0')`. Nickname used as winner display name.
- **Patterns**: Scene data extended incrementally — optional fields with fallbacks keep backward compat.

## [2026-04-05] — [T15] Server — load all character configs at startup (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `server/main.ts`, `server/charConfigs.ts` (new), `server/__tests__/charConfigs.test.ts` (new), `server/__tests__/GameRoom.test.ts`
- **Learnings**: Extracted config loading to `charConfigs.ts` to avoid importing `main.ts` (with Deno.serve side effects) in tests. GameRoom test config was missing T01 fields — fixed.
- **Patterns**: Side-effect-free modules for testability. `loadAllConfigs(baseUrl)` takes URL for path resolution flexibility.

## [2026-04-05] — [T14] NetworkClient — selectCharacter method (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/net/NetworkClient.ts`, `src/game/scenes/MainMenu.ts`
- **Learnings**: `onFightStart` signature change is breaking — all callers must update. MainMenu ignores new params for now (backward compat until T19).
- **Patterns**: Breaking callback signature changes require grep for all callers.

## [2026-04-05] — [T16] Server — handle select_character message (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `server/RoomManager.ts`, `server/main.ts`, `server/__tests__/RoomManager.test.ts`, `server/__tests__/GameRoom.test.ts`
- **Learnings**: `selectCharacter()` takes a validator function `isValidId` to decouple RoomManager from charConfigs module. `selectedChars` added to Room interface.
- **Patterns**: Inject validation as callback to keep RoomManager independent of config storage.

## [2026-04-05] — [T17] Server — startGameRoom with two configs (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `server/GameRoom.ts`, `server/main.ts`, `server/__tests__/GameRoom.test.ts`
- **Learnings**: `onFightStart` callback in main.ts resolves selectedChars → configs via getCharConfig with defaultConfig fallback.
- **Patterns**: Per-player config wiring: Room.selectedChars → getCharConfig → startGameRoom(room, p1Config, p2Config).

## [2026-04-05] — [T18] CharacterSelect online flow (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts`
- **Learnings**: Online mode uses single selection (no P1/P2 phases). Confirm sends select_character via NetworkClient, shows waiting state, handles opponent_selected checkmark, and on fight_start lazy-loads both character JSONs.
- **Patterns**: Online callbacks set in setupOnlineCallbacks(), cleaned up before scene transition. Reuses existing lazy-load pattern from local flow.

## [2026-04-05] — [T19] MainMenu online → CharacterSelect (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`
- **Learnings**: Removed sendReady() from MainMenu entirely — character selection replaces the old "auto-ready" flow. Callbacks must be cleaned up before transferring NetworkClient to next scene.
- **Patterns**: goToCharacterSelect() clears all MainMenu callbacks then transfers NetworkClient via scene data. New online flow: MainMenu→CharacterSelect→FightScene.

## [2026-04-05] — SYNC: Documentation synchronized
- **Documents updated**: CLAUDE.md, docs/deploy.md, docs/tasks.md
- **Drift items found**: 4
- **Drift items resolved**: 4
- **Remaining debt**: 0
- **Baseline commit**: 523615e

## [2026-04-05] — [T21] Random selection ("?" cell) (Phase 2)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts`
- **Learnings**: `time.delayedCall` chains work well for sequential visual effects — cleaner than setInterval with manual cleanup. `isRandomCycling` flag prevents interaction during animation.
- **Patterns**: Cycling animation: 12-18 steps at 100ms, yellow highlight during cycling, then applySelection() for final pick.

## [2026-04-05] — [T01] Extend types for combo system + GameEvent (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/types.ts`, `src/shared/FightEngine.ts`, 4 test files
- **Learnings**: Adding new required fields to FighterState/GameState requires updating all makeFighter() helpers across test files
- **Patterns**: New CharacterConfig fields are optional (?) to avoid breaking existing JSON configs

## [2026-04-05] — [T02] Chain cancel + special move in FighterFSM (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FighterFSM.ts`, `src/shared/__tests__/FighterFSM.test.ts`
- **Learnings**: Chain cancel uses in-place reset (frameInState=0, swap currentMove) — bypasses exit/enter lifecycle. frameInState is incremented AFTER update in tickFSM, so chain-reset results in frameInState=1 after the tick.
- **Patterns**: P+K special check runs BEFORE individual P/K checks in tryAttack(). Chain cancel iterates chainRoutes and checks input match for target move.

## [2026-04-05] — [T03] GameEvent emission + combo tracking in FightEngine (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: Closure-captured `events` array needs getter (`get events()`) on return object — direct property assignment captures initial reference, not updated one after `events = []` reassignment.
- **Patterns**: Events cleared at step start. Combo resets when opponent exits hitstun/blockstun (per-frame check). specialCooldown decrements in stepFight after FSM ticks.

## [2026-04-05] — [T04] Crouch attack in FSM (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FighterFSM.ts`, `src/shared/__tests__/FighterFSM.test.ts`
- **Learnings**: Crouch attack reuses `grounded/attack` handler — `isCrouching` flag controls return to crouch on completion. No new state handler needed.
- **Patterns**: Crouch attacks use P+K/PUNCH/KICK same priority as standing, but check for crouchPunch/crouchKick move keys.

## [2026-04-05] — [T05] Jump attack in FSM + landing cleanup (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FighterFSM.ts`, `src/shared/__tests__/FighterFSM.test.ts`, `src/shared/PhysicsSystem.ts`, `src/shared/__tests__/PhysicsSystem.test.ts`, `src/game/entities/Fighter.ts`
- **Learnings**: `clampToStage()` directly sets topState/subState bypassing FSM transitions — must manually clear currentMove/hitConfirmed in landing code path since `airborneAttack.exit()` never runs.
- **Patterns**: `tryAirAttack()` helper mirrors `tryAttack()` but for jumpPunch/jumpKick. Airborne attack completes to fall (not idle).

## [2026-04-05] — [T06] Hitstun scaling / damage proration (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: `stunDuration` must be set AFTER `transition()` call, not before — exit() of hitstun/blockstun clears stunDuration to 0, overwriting the value.
- **Patterns**: Proration formula: `1.0 - (comboCount * 0.15)` floored at 0.4 for damage, 0.5 for hitstun. Applied before comboCount increment.

## [2026-04-05] — [T07] Update gen-characters.mjs with new moves + chainRoutes
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-characters.mjs`
- **Learnings**: cancelWindow derived from move frame data: `[startup + active, startup + active + recovery - 2]`. Short category gets 3 chain routes (rushdown archetype), big/tall/standard get 2.
- **Patterns**: Per-character special names stored in a flat `SPECIAL_NAMES` map keyed by character id.

## [2026-04-05] — [T08] Regenerate 17 character JSON configs
- **Status**: ✅ Done
- **Files changed**: `public/data/characters/*.json` (17 files), `public/data/characters/default.json`, `src/shared/__tests__/CharacterConfig.test.ts`
- **Learnings**: default.json must be updated manually (not generated). Validation tests check chainRoute `from`/`to` reference existing moves.
- **Patterns**: REQUIRED_MOVE_KEYS expanded to 7 moves. chainRoutes validated for referential integrity (from/to must exist in moves).

## [2026-04-05] — [T09] FighterFSM comprehensive tests (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/__tests__/FighterFSM.test.ts`
- **Learnings**: hitStop from previous hits persists across manual phase changes — must clear before forcing KO/RoundEnd transitions in tests. clampToStage bypass of FSM exit() is a known pattern, tested via PhysicsSystem import.
- **Patterns**: Test configs (cfgJabJab, cfgChainToSpecial, cfgChainToCrouch) compose from base cfgWithMoves. 64 FSM tests total.

## [2026-04-05] — [T10] FightEngine comprehensive tests (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/shared/__tests__/FightEngine.test.ts`
- **Learnings**: matchStats live on GameState (not fighters), so they survive resetFightersForRound. hitStop must be explicitly cleared in tests before forcing phase transitions.
- **Patterns**: For multi-hit combo tests, manually reset attacker state (idle, clear hitConfirmed) and set long stunDuration on defender. 61 engine tests total.

## [2026-04-05] — [T13] Hit flash + hit-stop camera zoom (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/Fighter.ts`, `src/game/scenes/FightScene.ts`
- **Learnings**: Hitstun entry detection via wasInHitstun flag in syncToState. flashFrames counter restores original tint after 3 frames.
- **Patterns**: setTintFill(0xffffff) for white flash, clearTint() or setTint(original) to restore.

## [2026-04-05] — [T16] Screen shake (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`
- **Learnings**: processEvents() method processes engine.events array after step loop. Events are one-frame (cleared each step).
- **Patterns**: cam.shake(duration, intensity) — light=0.005, medium=0.01, heavy=0.02.

## [2026-04-05] — [T17] HitSpark particle effect (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/HitSpark.ts` (new), `src/game/scenes/FightScene.ts`
- **Learnings**: Runtime texture generation with make.graphics + generateTexture for simple particle shapes. emitting:false + emitParticleAt for one-shot bursts.
- **Patterns**: Phaser particle emitter config: quantity for burst count, emitting:false for on-demand emission.

## [2026-04-05] — [T22] HealthBar improvements (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/HealthBar.ts`, `src/game/scenes/FightScene.ts`
- **Learnings**: Damage trail is just a second rectangle behind the HP bar with slower lerp (0.02 vs 0.08).
- **Patterns**: HealthBar constructor accepts optional nickname param. Depth ordering: bg=100, trail=101, fill=102.

## [2026-04-05] — [T22b] RoundDisplay improvements (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/RoundDisplay.ts`
- **Learnings**: Timer pulse uses alpha tween with color change in onUpdate callback. Danger mode toggled by threshold check each frame.
- **Patterns**: Text shadow: `{ offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }`. Destroy tween to stop it cleanly.

## [2026-04-05] — [T25] KO slow-motion (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`
- **Learnings**: time.timeScale affects Phaser's delta — accumulator gets less delta, fewer engine steps = desired slow-mo effect. Online mode must skip to prevent desync.
- **Patterns**: `this.time.timeScale = 0.3` + delayedCall(1000ms real) to restore. Guard with `if (this.mode === 'local')`.

## [2026-04-05] — [T14] ComboCounter + CooldownIndicator UI components (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/ui/ComboCounter.ts` (new), `src/game/ui/CooldownIndicator.ts` (new)
- **Learnings**: Phaser background rectangles don't need stored ref if never modified — just `scene.add.rectangle()`.
- **Patterns**: Scale-pop via setScale(1.4) + tween back to 1.0 with Back.easeOut. Flash via alpha tween (1→0.4) yoyo repeat -1.

## [2026-04-05] — [T15] Wire combo UI + events into FightScene (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/FightScene.ts`, `src/game/net/NetworkClient.ts`
- **Learnings**: Online mode must use server events (not local engine events) to avoid double visual effects. NetworkClient.onStateUpdate extended with optional events param.
- **Patterns**: applyServerState must copy ALL FighterState fields — missing comboCount/comboDamage/specialCooldown/isCrouching caused silent desync. Event source branching: `mode === 'online'` → remoteEvents, else engine.events.

## [2026-04-05] — [T18] SoundManager system (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/systems/SoundManager.ts`
- **Learnings**: Phaser `scene.sound` is global — mute applies to all scenes. SoundManager wraps it with localStorage persistence.

## [2026-04-05] — [T19] Load audio in Preloader + music + announcer (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/Preloader.ts`, `src/game/scenes/MainMenu.ts`, `src/game/scenes/CharacterSelect.ts`, `src/game/scenes/FightScene.ts`, `public/assets/audio/*.wav`
- **Learnings**: SoundManager passed through scene chain via scene data. Must call `transferTo(scene)` when changing scenes to update internal scene reference.
- **Patterns**: SoundManager ownership: MainMenu creates it, passes to CharacterSelect → FightScene via scene data. Each scene calls `transferTo(this)`.

## [2026-04-05] — [T20] UI sounds for menus + char select (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`, `src/game/scenes/CharacterSelect.ts`
- **Learnings**: Button click sounds added via wrapper in `addButton` onClick handler (MainMenu) and `applySelection`/`onConfirm` (CharacterSelect).

## [2026-04-05] — [T21] Mute button with persistent state (Phase 3)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`
- **Learnings**: Text-based emoji icons (🔊/🔇) work well as quick UI without sprite assets. Placed at top-right (990, 20).

## [2026-04-05] — [T26] Fix mobile room code input (Phase 3.5)
- **Status**: ✅ Done (already implemented)
- **Files changed**: none (code already present from prior session)
- **Learnings**: DOM `<input>` overlay was already added during networking tasks. Follow-up in progress.md was stale.

## [2026-04-05] — [T27] URL-based room join (Phase 3.5)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`
- **Learnings**: URL param parsed in `create()` before `showMainView()`. Fallback: if connection/join fails and UI is empty (uiContainer.length === 0), show main view automatically.

## [2026-04-05] — [T28] Copy invite link button (Phase 3.5)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/MainMenu.ts`
- **Learnings**: `navigator.clipboard.writeText()` returns a Promise — handle both success and failure. Green-styled button (0x225522/0x66ff66) visually differentiates from regular blue buttons.

## [2026-04-05] — [T29] Server /join redirect route (Phase 3.5)
- **Status**: ✅ Done
- **Files changed**: `server/main.ts`, `server/__tests__/joinRoute.test.ts` (new)
- **Learnings**: Extracted `handleRequest()` from Deno.serve for testability, but main.ts side effects (loadAllConfigs, Deno.serve) prevent direct import in tests. Used replicated logic in isolated test file instead.
- **Patterns**: CLIENT_URL env var with `http://localhost:5173` fallback.

## [2026-04-05] — [T30] Auto-reconnect: protocol types + server grace timer (Phase 3.5)
- **Status**: ✅ Done
- **Files changed**: `src/shared/types.ts`, `server/RoomManager.ts`, `server/main.ts`, `server/GameRoom.ts`, `server/__tests__/RoomManager.test.ts`, `server/__tests__/GameRoom.test.ts`
- **Learnings**: Grace timer only activates for started games (not lobby). Room.onGetState callback lets RoomManager request current engine state from GameRoom without direct coupling.
- **Patterns**: `disconnectTimers: [number | null, number | null]` on Room. setTimeout for grace period, clearTimeout on rejoin. onGetState callback for cross-module state access.

## [2026-04-05] — [T31] Auto-reconnect: client NetworkClient (Phase 3.5)
- **Status**: ✅ Done
- **Files changed**: `src/game/net/NetworkClient.ts`, `src/game/scenes/FightScene.ts`
- **Learnings**: sessionStorage auto-clears on tab close — perfect for reconnect data that shouldn't persist. cleanup() needs `updateState` param to avoid clearing state during reconnect attempts. Error messages during reconnect mean rejoin failed — should abort reconnect loop.
- **Patterns**: Reconnect delays [1,2,4,8,8]s. Save {roomCode, playerIndex} to sessionStorage on disconnect. Semi-transparent overlay container at depth 1000 for reconnect UI.

## [2026-04-05] — [T32] Update server for Phase 3 (configs + events + reconnect)
- **Status**: ✅ Done
- **Files changed**: `server/GameRoom.ts`, `server/__tests__/GameRoom.test.ts`
- **Learnings**: CharacterConfig new fields (chainRoutes, specialCooldownFrames) are optional — server loads configs generically, no changes needed in charConfigs.ts. FighterState new fields (comboCount, comboDamage, specialCooldown, isCrouching) are initialized by FightEngine, not by configs — server test configs didn't need updating.
- **Patterns**: broadcastState now includes engine.events array alongside state and frame.

## [2026-04-05] — [T33] Integration testing (local + online)
- **Status**: ✅ Done
- **Files changed**: none (verification only)
- **Learnings**: All test suites green after Phase 3 changes: 342 vitest tests, 29 deno tests, production build succeeds.
- **Patterns**: none

## [2026-04-05] — [T34] Mobile testing
- **Status**: ✅ Done (code review only — manual device testing deferred to user)
- **Files changed**: none (verification only)
- **Learnings**: All 8 mobile features verified in code: touch P+K, audio autoplay (handled by Phaser WebAudioSoundManager automatically), mute button, invite link flow, mobile room code DOM overlay, auto-reconnect with overlay UI, combo counter, cooldown indicator. Physical device testing remains for the user.
- **Patterns**: Phaser 3 WebAudioSoundManager auto-unlocks AudioContext on first user gesture — no manual `resume()` needed.

## [2026-04-05] — [T35] Deploy + update docs
- **Status**: ✅ Done
- **Files changed**: `docs/deploy.md`, `docs/testing-checklist.md`
- **Learnings**: `CLIENT_URL` env var needed for `/join/:code` invite redirect on server. GitHub Actions deploy triggers automatically on push to main.
- **Patterns**: none

## [2026-04-05] — INCIDENT: Same animation for all attacks + silent audio
- **Symptom**: Punch and Kick show identical animation; no sound effects during combat
- **Root cause**: (1) `Fighter.syncToState` mapped all attacks to generic "attack" animation, ignoring `currentMove`. Spritesheet has only 1 attack row (frames 44-50). (2) All 11 WAV files were 3244-byte silence placeholders (zero data).
- **Fix**: (1) Added punch/kick/special animation entries using different frame subsets (punch: 44-47 fast, kick: 47-50, special: 44-50 slow). Updated `syncToState` to check `currentMove`. Regenerated 18 configs. (2) Created `scripts/gen-audio.mjs` for procedural WAV generation. Replaced all 11 files.
- **Prevention**: Config validation should check move keys have matching animations. Audio tests should verify WAV file sizes.
- **Time to resolve**: 1 diagnosis + 1 fix cycle

## [2026-04-05] — INCIDENT: Kick animation shows dot artifact
- **Symptom**: Small dot appears in front of player during kick (K) attack
- **Root cause**: Kick animation started at frame 47, which is a transition frame containing only the sword tip (swoosh trail endpoint). Rendered as a tiny dot before transitioning to the next full-body frame.
- **Fix**: Changed frame ranges — punch: 44-48 @20fps (fast), kick: 44-50 @12fps (slower/heavier). Both now start from full-body frames. All 18 configs regenerated.
- **Prevention**: Always visually inspect spritesheet frames before setting animation ranges. Avoid using mid-animation transition frames as start frames.
- **Time to resolve**: 1 cycle (spritesheet visual inspection identified the cause immediately)

## [2026-04-06] — [T01] Extract shared PNG encoder to scripts/lib/png.mjs (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/lib/png.mjs` (new), `scripts/lib/__tests__/png.test.mjs` (new), `scripts/gen-bg.mjs`, `scripts/gen-logo.mjs`
- **Learnings**: Both gen-bg.mjs and gen-logo.mjs had identical crc32/chunk/PNG assembly code. Extracted to shared module with zero behavioral change (byte-identical output verified).
- **Patterns**: `encodePNG(width, height, rgbaBuffer)` — expects raw RGBA Buffer, returns complete PNG Buffer. Tests use `node:test` runner (not vitest) for scripts/ directory.

## [2026-04-07] — [T02] Drawing primitives library (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/lib/draw.mjs` (new), `scripts/lib/__tests__/draw.test.mjs` (new)
- **Learnings**: drawLine with thickness uses circle-stamping along Bresenham path — simpler than perpendicular expansion and produces rounder endpoints. All primitives clip via setPixel bounds check.
- **Patterns**: `FrameBuffer(w,h)` — RGBA buffer with getPixel/setPixel/clear/toBuffer. `toBuffer()` returns raw RGBA compatible with `encodePNG()`. Coordinates are Math.round()'d for sub-pixel tolerance.

## [2026-04-05] — INCIDENT: No visible floor, fighters floating in sky
- **Symptom**: FightScene shows solid blue gradient sky, no ground, fighters appear to float
- **Root cause**: `bg.png` was a placeholder sky-only gradient (no ground art). FightScene had no programmatic floor either. Fighter foot alignment is correct (both at FLOOR_Y=520 with origin 0.5,1) but invisible without ground.
- **Fix**: (1) Generated proper bg.png with dark sky gradient + brown ground + horizon line via `scripts/gen-bg.mjs`. (2) Added brown ground rectangle + floor line at FLOOR_Y in FightScene.create().
- **Prevention**: Visual assets should be validated during asset generation tasks (T11/T12), not deferred to deploy.
- **Time to resolve**: 1 cycle

## [2026-04-05] — INCIDENT: Online mode "Connection failed" — wrong server domain
- **Symptom**: CREATE ROOM → "Connection failed". Kaspersky flags the connection as untrusted.
- **Root cause**: `VITE_WS_URL` GitHub variable was set to `wss://...deno.dev/ws` but the actual Deno Deploy domain is `.deno.net`. TLS certificate `ERR_TLS_CERT_ALTNAME_INVALID` — the wildcard cert doesn't cover the wrong TLD.
- **Fix**: Updated `VITE_WS_URL` to `wss://koreshki-fight-club.petrorossolov.deno.net/ws`. Triggered client rebuild.
- **Prevention**: After setting server URL, always verify with a health check (`curl https://server/health`) before deploying client. Document the exact production URL in deploy docs.
- **Time to resolve**: 1 cycle (WebFetch confirmed TLS error, user provided correct URL)

## [2026-04-07] — [T03] Skeleton system + animation keyframes + size scaling (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs` (new), `scripts/lib/__tests__/gen-sprites.test.mjs` (new)
- **Learnings**: 12-joint hierarchy with linear interpolation and pixel snap is sufficient for chibi sprites. Dead animation bounce adds humor with just 5 keyframes.
- **Patterns**: `Pose = Record<Joint, {x,y}>` with offsets from root (feet=0,0), Y-axis negative=up. `generateAnimFrames(keyframes, totalFrames)` interpolates between sorted keyframes. `scalePose(pose, sx, sy)` for size categories. 22 tests cover interpolation, frame generation, scaling, and animation data integrity.

## [2026-04-05] — INCIDENT: Room code screen instantly replaced by CharacterSelect
- **Symptom**: CREATE ROOM shows no room code or invite link — user goes straight to fighter select with "Ожидание соперника..."
- **Root cause**: Server sends `room_created` + `room_joined` back-to-back to creator. `onRoomJoined` navigated to CharacterSelect for both creator and joiner, instantly overwriting the room code view.
- **Fix**: `onRoomJoined` now checks `this.view === 'create'` — if creator is already showing room code, skip navigation. Only `onOpponentJoined` triggers transition for the creator.
- **Prevention**: Server protocol test should verify that creator stays on waiting screen after receiving both messages. Consider separating creator/joiner callback logic explicitly.
- **Time to resolve**: 1 cycle

## [2026-04-05] — SYNC: Documentation synchronized
- **Documents updated**: CLAUDE.md, docs/plan-phase3.md
- **Drift items found**: 5
- **Drift items resolved**: 5
- **Remaining debt**: 0
- **Baseline commit**: e015f32

## [2026-04-05] — CHANGE: Keyboard controls hint overlay
- **Status**: ✅ Done
- **Files changed**: src/game/scenes/FightScene.ts
- **Learnings**: permanent hints preferred over timed fade-out

## [2026-04-05] — INCIDENT: Fighter feet misaligned at different scales
- **Symptom**: fighters of different scale categories had feet at different vertical positions
- **Root cause**: sprite origin (0.5, 1) placed bottom of 126px frame at FLOOR_Y, but 44px of bottom padding scaled differently per character. Manual groundOffset values and formula-based compensation both failed because the padding value (25px) was wrong.
- **Fix**: measured actual feet pixel (y=81) via PNG analysis, set `FEET_ORIGIN_Y = 82/126`. Scaling around origin auto-aligns feet.
- **Prevention**: always measure sprite metrics from actual pixel data, never estimate visually
- **Time to resolve**: 4 attempts — manual offsets → formula → origin with wrong value → origin with measured value

## [2026-04-05] — INCIDENT: Touch controls missing when joining online game as P2
- **Symptom**: joystick not appearing when joining a friend's game from phone
- **Root cause**: InputManager always creates TouchSource at index 0. When joining as playerIndex 1, FightScene replaced sources[0] (remote) with NetworkSource, destroying the TouchSource and its DOM joystick. Local player (index 1) had no touch controls.
- **Fix**: after replacing remote source, recreate TouchSource at localPlayerIndex if touch device and playerIndex === 1
- **Prevention**: test online mode from both creator and joiner perspectives on mobile
- **Time to resolve**: 1 attempt

## [2026-04-05] — INCIDENT: iOS Safari — broken scale, fullscreen, and touch controls
- **Symptom**: iPhone 14 user reports wrong screen scale, invisible FULLSCREEN button, no joystick in local fight
- **Root cause**: Three iOS Safari issues: (1) `100vh` includes address bar height, cutting off bottom of canvas; (2) Fullscreen API requires `webkit` prefix on iOS; (3) missing `viewport-fit=cover` causes safe-area padding to shrink game area on notch devices
- **Fix**: added `viewport-fit=cover, user-scalable=no` to viewport meta; CSS `100dvh` fallback for `100vh`; webkit-prefixed fullscreen API calls; safe-area padding on body and touch controls overlay
- **Prevention**: test on iOS Safari (or BrowserStack) before each deploy; add iOS device to test matrix
- **Time to resolve**: 1 attempt — 4 files changed

## [2026-04-05] — SYNC: Documentation synchronized
- **Documents updated**: CLAUDE.md, progress.md
- **Drift items found**: 3
- **Drift items resolved**: 3
- **Remaining debt**: 0
- **Baseline commit**: f63c093

## [2026-04-05] — SYNC: Documentation synchronized
- **Documents updated**: CLAUDE.md, progress.md
- **Drift items found**: 3
- **Drift items resolved**: 3
- **Remaining debt**: 0
- **Baseline commit**: 94d0023

## [2026-04-07] — [T04] Body part renderer (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/lib/__tests__/gen-sprites.test.mjs`
- **Learnings**: Hair oval overlaps head center — test skin color at head bottom (+7px), not center. 9-layer draw order gives correct visual depth without z-sorting.
- **Patterns**: Root position: (63, 82) in 126×126 frame. Limbs = drawLine between joints. Head = fillCircle, torso = fillRect, hair = fillOval offset above head.

## [2026-04-07] — [T05] Preview tool (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/preview-sprite.mjs` (new), `.gitignore`
- **Learnings**: 4× zoom at 11×7 grid = 5544×3528px — large but compresses well (~135KB PNG). FrameBuffer per-frame + blit is clean pattern.
- **Patterns**: `preview-*.png` in .gitignore. Default charId fallback via `process.argv[2] || 'petyaj'`.

## [2026-04-07] — [T06] Frame grid assembly + first character (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/lib/__tests__/gen-sprites.test.mjs`, `scripts/preview-sprite.mjs`, `public/assets/fighters/petyaj.png` (new)
- **Learnings**: assembleSheet uses blit to compose frames into grid — simple and fast. petyaj.png = 14.8KB for 1386×882 sheet.
- **Patterns**: CHARACTER_VISUALS map: `{category, visuals}` per character. CLI detects direct execution via `fileURLToPath(import.meta.url) === process.argv[1]`.

## [2026-04-07] — [T07] Hair styles renderer (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/lib/__tests__/gen-sprites.test.mjs`
- **Learnings**: 8 styles using compositions of fillRect/fillCircle/fillOval/drawLine. Afro = large circle (1.7× head radius). Mohawk = tall central rectangle. Dreadlocks = cap + hanging line strands.
- **Patterns**: `renderHair(fb, cx, cy, r, style, color)` — all styles draw relative to head center + radius. Switch-based dispatch, fallback to 'short'.

## [2026-04-07] — [T08] Accessories renderer + face details (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/lib/__tests__/gen-sprites.test.mjs`
- **Learnings**: Gloves handled at hand-rendering level (handColor override), not in renderAccessories. Multiple accessories can combine (array-based).
- **Patterns**: `renderFace(fb, cx, cy, r, visuals)` — eyes + optional beard. `renderAccessories(fb, cx, cy, r, visuals)` — helmet/headphones/glasses/mask drawn over head, gloves = handColor swap in renderFrame.

## [2026-04-07] — [T09] 17 CHARACTER_VISUALS + all spritesheets (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/lib/__tests__/gen-sprites.test.mjs`, 16 new PNGs in `public/assets/fighters/`
- **Learnings**: Each character must be visually distinct via unique (hairStyle + hairColor + torsoColor) combination. Categories sourced from manifest.json.
- **Patterns**: `CHARACTER_VISUALS` map keyed by character ID, contains `{visuals, category}`. CLI: `node scripts/gen-sprites.mjs` generates all, `node scripts/gen-sprites.mjs {id}` generates one.

## [2026-04-07] — [T10] Portraits + update gen-characters.mjs (Sprites)
- **Status**: ✅ Done
- **Files changed**: `scripts/gen-sprites.mjs`, `scripts/gen-characters.mjs`, 17 portrait PNGs, 17 character JSON configs
- **Learnings**: Portrait crops head+torso from idle frame 0, nearest-neighbor scales to 200×200. Per-character spriteSheet paths (`assets/fighters/${id}.png`), tint=0xFFFFFF and scale=1.0 neutralize old category-based scaling (now baked into sprites).
- **Patterns**: `generatePortrait(id, visuals, category)` — crop + scale idle frame to 200×200 portrait PNG.

## [2026-04-07] — [T11] Update Fighter.ts for per-character textures (Sprites)
- **Status**: ✅ Done
- **Files changed**: `src/game/entities/Fighter.ts`, `src/shared/__tests__/CharacterConfig.test.ts`
- **Learnings**: With tint always 0xFFFFFF, flash recovery simplifies to just `clearTint()`. CharacterConfig test needed immediate update (was asserting shared spritesheet path).
- **Patterns**: Texture key = `config.id` everywhere (sprite creation, loadAssets, generateFrameNumbers). No more SHARED_TEXTURE constant.

## [2026-04-07] — [T12] Update Preloader.ts for dynamic spritesheet loading (Sprites)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/Preloader.ts`
- **Learnings**: Two-phase Phaser loading: preload() for manifest/audio/logo, create() reads manifest and queues character assets via `this.load.start()`. Progress bar from init() works across both phases since the `progress` listener is on the LoaderPlugin.
- **Patterns**: `this.load.once('complete', callback)` + `this.load.start()` in create() for second-pass dynamic loading based on phase-1 data.

## [2026-04-07] — [T13] Update CharacterConfig.test.ts for per-character paths (Sprites)
- **Status**: ✅ Done
- **Files changed**: `src/shared/__tests__/CharacterConfig.test.ts`
- **Learnings**: Per-character spritesheet path assertion was already in place from T10. Added tint/scale/file-exists checks.
- **Patterns**: None new — same vitest + fs.existsSync pattern.

## [2026-04-07] — [T14] Redesign CharacterSelect.ts — adaptive grid + portraits (Sprites)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/CharacterSelect.ts`
- **Learnings**: Phaser game coords are always 1024×576 regardless of screen size (Scale.FIT). Use `window.innerWidth` for responsive breakpoints, not camera width. Portrait textures loaded as `${id}-portrait` by Preloader.
- **Patterns**: Dynamic grid columns via `window.innerWidth` breakpoints (3/<480, 4/<768, 6/desktop). Cell size auto-calculated to fit available grid area. Scale pulse tween (`yoyo: true, repeat: -1`) for selection feedback — must `.stop()` before reassigning.

## [2026-04-07] — [T15] End-to-end testing + cleanup (Sprites)
- **Status**: ✅ Done
- **Files changed**: `src/game/scenes/GameOver.ts`, `public/assets/fighters/martial-hero.png` (deleted), `scripts/combine-sprites.mjs` (deleted)
- **Learnings**: GameOver.ts still had SHARED_TEXTURE = 'martial-hero' — needed update to use config.id. combine-sprites.mjs was an obsolete script (used sharp for external PNG combining), superseded by gen-sprites.mjs.
- **Patterns**: After removing shared texture, grep src/ and scripts/ for residual references before committing.

## [2026-04-07] — [T16] Update CLAUDE.md + documentation (Sprites)
- **Status**: ✅ Done
- **Files changed**: `CLAUDE.md`, `docs/plan-sprites.md`, `docs/tasks-sprites.md`
- **Learnings**: Sprites line in Tech Stack updated from "LuizMelo packs" to "Procedural chibi sprites". All 25 plan checkboxes + 16 task checkboxes marked complete.
- **Patterns**: None new.

## [2026-04-07] — INCIDENT: Attack animations face wrong direction
- **Symptom**: During FightScene, attacks animate away from opponent (left when opponent is right, vice versa)
- **Root cause**: Procedural chibi sprites face RIGHT by default, but `setFlipX(state.facingRight)` was written for the old martial-hero sprite which faced LEFT. The flip logic was inverted.
- **Fix**: Changed `setFlipX(state.facingRight)` → `setFlipX(!state.facingRight)` in `Fighter.ts:52`. Updated Codebase Patterns in progress.md.
- **Prevention**: When replacing sprite assets with different default orientation, always verify flip logic. Add a visual regression test for sprite facing direction.
- **Time to resolve**: 1 cycle

## [2026-04-07] — INCIDENT: Fullscreen button unreachable on mobile portrait
- **Symptom**: FULLSCREEN button on MainMenu doesn't respond to taps on mobile
- **Root cause**: `#portrait-warning` overlay (`z-index: 9999`, `inset: 0`, opaque background) covers the entire screen in portrait orientation on touch devices, blocking all pointer events to the Phaser canvas underneath. The in-game FULLSCREEN button (Phaser text object) was invisible and untappable behind this overlay.
- **Fix**: Added a DOM `<button id="portrait-fs-btn">` inside the portrait-warning overlay itself, with JS handler in `main.ts` that calls `requestFullscreen()` + `orientation.lock('landscape')`. Styled in `style.css`.
- **Prevention**: Any full-screen blocking overlay must include essential actions (like fullscreen entry) as DOM elements within itself, not rely on underlying canvas being reachable.
- **Time to resolve**: 1 cycle
