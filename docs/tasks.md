# The Koreshi Fight Club — Task Decomposition

## Context

Browser 2D fighting game (Phaser 3 + TS + Vite) for 17 friends. Project has template scenes but zero game logic. All docs complete (`docs/plan.md`, `docs/research.md`, `docs/characters.md`). Need to decompose Phase 1 (Core + Online) into atomic executable tasks.

**Current state:** Phaser template with 5 placeholder scenes (Boot, Preloader, MainMenu, Game, GameOver), resolution 1024x768, telemetry `log.js`, no testing framework.

---

## Task List (34 tasks, 14 waves)

### Wave 0: Project Scaffolding

#### [T01] Project cleanup: resolution, telemetry, vitest
- **Phase:** 0 (Setup) | **Type:** config
- **Depends on:** none
- **Output (modify):** `package.json`, `src/game/main.ts`, `index.html`, `Preloader.ts`, `MainMenu.ts`, `Game.ts`, `GameOver.ts`
- **Output (delete):** `log.js`
- **Acceptance criteria:**
  - [ ] `height: 768` -> `576` in `src/game/main.ts:13`
  - [ ] `log.js` deleted, `dev`/`build` scripts cleaned (no telemetry), `-nolog` variants removed
  - [ ] `vitest ^3.1` in devDependencies, `"test": "vitest run"` script added
  - [ ] All scene Y-coordinates adjusted (384->288): Preloader:13,16,19; MainMenu:16,18,20; Game:19,22; GameOver:19,22
  - [ ] `<title>` in index.html -> "The Koreshi Fight Club"
  - [ ] `npm run dev` starts at 1024x576, all scenes navigate correctly
- **Constitution:** #3 Incremental Delivery, #7 Mobile-First (16:9)

#### [T02] Update CLAUDE.md with architecture conventions
- **Phase:** 0 (Setup) | **Type:** docs
- **Depends on:** none
- **Output (modify):** `CLAUDE.md`
- **Acceptance criteria:**
  - [ ] Architecture section: `src/shared/`, `src/game/`, `server/` split documented
  - [ ] Conventions: FightEngine, FSM, JSON configs, fixed timestep, input bits
  - [ ] Commands: `npm run dev`, `npm run build`, `deno run`
- **Constitution:** #8 Co-located Documentation

#### [T03] Vitest config + smoke test
- **Phase:** 0 (Setup) | **Type:** test
- **Depends on:** T01
- **Output (create):** `vitest.config.ts`, `src/shared/__tests__/smoke.test.ts`
- **Acceptance criteria:**
  - [ ] `npm test` passes (1 trivial smoke test)
  - [ ] Resolve aliases match tsconfig paths
- **Constitution:** #3 Incremental Delivery

---

### Wave 1: Shared Foundation

#### [T04] Create `src/shared/types.ts`
- **Phase:** 1a | **Type:** data model
- **Depends on:** T01
- **Output (create):** `src/shared/types.ts`, `src/shared/__tests__/types.test.ts`
- **Acceptance criteria:**
  - [ ] Interfaces: `CharacterConfig`, `FighterState`, `GameState`, `InputFrame`, `MoveDef`, `AnimDef`, `AABB`, `HitResult`
  - [ ] Enums: `InputBit` (const enum, bitflags), `TopState`, `RoundPhase`
  - [ ] Network types: `ClientMsg`, `ServerMsg` (discriminated unions)
  - [ ] Zero Phaser/Deno imports
  - [ ] Test: `(InputBit.LEFT | InputBit.PUNCH) === 17`
- **Constitution:** #2 Data-Driven, #4 Fixed Timestep

#### [T05] Create `src/shared/constants.ts`
- **Phase:** 1a | **Type:** config
- **Depends on:** T01
- **Output (create):** `src/shared/constants.ts`
- **Acceptance criteria:**
  - [ ] `STAGE_WIDTH=1024`, `STAGE_HEIGHT=576`, `FLOOR_Y=520`, `GRAVITY=0.6`, `FIXED_DT=1000/60`
  - [ ] `ROUND_TIME=99`, `ROUNDS_TO_WIN=2`, `HIT_STOP_FRAMES=6`, `DEFAULT_HP=1000`
  - [ ] All `export const`, zero platform imports
- **Constitution:** #2 Data-Driven, #4 Fixed Timestep

---

### Wave 2: Physics + FSM + Assets (parallel)

#### [T06] Create `src/shared/PhysicsSystem.ts`
- **Phase:** 1a | **Type:** feature
- **Depends on:** T04, T05
- **Output (create):** `src/shared/PhysicsSystem.ts`, `src/shared/__tests__/PhysicsSystem.test.ts`
- **Acceptance criteria:**
  - [ ] Pure functions: `applyGravity()`, `applyVelocity()`, `clampToStage()`, `resolvePushboxes()`
  - [ ] Landing sets `topState=Grounded`, `velY=0`
  - [ ] Pushbox resolution separates overlapping fighters
  - [ ] 5+ tests pass, zero Phaser imports
- **Constitution:** #4 Fixed Timestep, #1 Game Feel First

#### [T07] Create `src/game/entities/FighterFSM.ts`
- **Phase:** 1a | **Type:** feature
- **Depends on:** T04, T05
- **Output (create):** `src/game/entities/FighterFSM.ts`, `src/game/entities/__tests__/FighterFSM.test.ts`
- **Acceptance criteria:**
  - [ ] `StateHandler` interface: `enter()`, `update()`, `exit()`
  - [ ] Flat `Record<string, StateHandler>` map (not class hierarchy)
  - [ ] Movement states: `grounded/idle`, `grounded/walkForward`, `grounded/walkBackward`, `grounded/crouch`, `airborne/jump`, `airborne/fall`
  - [ ] `tickFSM()` function handles transitions
  - [ ] 5+ tests: idle->walk, idle->jump, jump->fall, fall->idle, crouch->idle
  - [ ] Zero Phaser imports
- **Constitution:** #2 Data-Driven, #4 Fixed Timestep

#### [T08] Download sprites + create `default.json`
- **Phase:** 1a | **Type:** data
- **Depends on:** T04
- **Output (create):** `public/assets/fighters/martial-hero.png`, `public/data/characters/default.json`
- **Acceptance criteria:**
  - [ ] Sprite sheet is valid PNG from LuizMelo Martial Hero pack
  - [ ] JSON validates against `CharacterConfig` interface
  - [ ] Animations: idle, run, jump, fall, crouch with correct frame indices
  - [ ] Moves: punch, kick with startup/active/recovery/hitbox data
  - [ ] Hurtboxes and pushbox with reasonable AABB values
- **Constitution:** #2 Data-Driven, #6 Humor-Driven

---

### Wave 3: Fighter Visual + Engine (parallel)

#### [T09] Create `src/game/entities/Fighter.ts`
- **Phase:** 1a | **Type:** feature
- **Depends on:** T04, T07, T08
- **Output (create):** `src/game/entities/Fighter.ts`
- **Acceptance criteria:**
  - [ ] Phaser sprite wrapper, loads spritesheet from config
  - [ ] `syncToState(state)` — sets x, y, flipX, plays correct animation
  - [ ] Animation key mapping: "grounded/idle" -> config idle anim, etc.
  - [ ] `loadAssets()` static for preloading
- **Constitution:** #1 Game Feel First, #2 Data-Driven

#### [T10] Create `src/shared/FightEngine.ts`
- **Phase:** 1a | **Type:** feature
- **Depends on:** T04, T05, T06, T07
- **Output (create):** `src/shared/FightEngine.ts`, `src/shared/__tests__/FightEngine.test.ts`
- **Acceptance criteria:**
  - [ ] `createFightEngine(config)` factory
  - [ ] `step(inputs)` — FSM tick, physics, auto-face, frame increment
  - [ ] `createInitialGameState()` — fighters at 1/3 and 2/3 of stage
  - [ ] Deterministic: same inputs = same state
  - [ ] 5+ tests: movement, jump arc, auto-face, pushbox
  - [ ] Zero Phaser imports
- **Constitution:** #4 Fixed Timestep, #2 Data-Driven, #5 Keep Netcode Simple

---

### Wave 4: Scene + Input (sequential)

#### [T11] Create `FightScene.ts` with fixed timestep loop
- **Phase:** 1a | **Type:** feature
- **Depends on:** T08, T09, T10
- **Output (create):** `src/game/scenes/FightScene.ts`
- **Output (modify):** `src/game/main.ts` (scene registry)
- **Output (delete):** `src/game/scenes/Game.ts`
- **Acceptance criteria:**
  - [ ] Fixed timestep accumulator in `update()`: `while (accum >= FIXED_DT) { step(); accum -= FIXED_DT; }`
  - [ ] Loads character JSON, creates FightEngine + 2 Fighter visuals
  - [ ] WASD moves P1, P2 stands idle (temporary inline keyboard)
  - [ ] `npm run dev` shows two fighters on screen
  - [ ] Scene registered as 'FightScene' replacing 'Game'
- **Constitution:** #3 Incremental Delivery, #4 Fixed Timestep, #1 Game Feel First

#### [T12] Create `src/game/systems/InputManager.ts`
- **Phase:** 1a | **Type:** feature
- **Depends on:** T04, T11
- **Output (create):** `src/game/systems/InputManager.ts`, `src/game/systems/__tests__/InputManager.test.ts`
- **Output (modify):** `src/game/scenes/FightScene.ts` (replace inline keyboard)
- **Acceptance criteria:**
  - [ ] P1: W=jump, A=left, S=crouch, D=right, Q=punch, E=kick
  - [ ] P2: Arrows + J=punch, K=kick
  - [ ] `readInput(playerIndex)` returns `InputFrame` with packed bits
  - [ ] Both players control independently on same keyboard
- **Constitution:** #7 Mobile-First (abstract source), #4 Fixed Timestep

**--- MILESTONE: Phase 1a --- Fighter walks/jumps/crouches with keyboard ---**

---

### Wave 5: Attack States + Collision (parallel)

#### [T13] Add attack states to FighterFSM
- **Phase:** 1b | **Type:** feature
- **Depends on:** T07, T12
- **Output (modify):** `FighterFSM.ts`, `FighterFSM.test.ts`
- **Acceptance criteria:**
  - [ ] New states: `grounded/attack`, `grounded/block`, `hitstun/standing`, `knockdown/falling`, `knockdown/getup`
  - [ ] Attack state tracks `frameInState` through startup->active->recovery
  - [ ] `currentMove` set from config on entry
  - [ ] 5+ new tests
- **Constitution:** #2 Data-Driven, #1 Game Feel First

#### [T14] Create `src/shared/CollisionSystem.ts`
- **Phase:** 1b | **Type:** feature
- **Depends on:** T04, T05
- **Output (create):** `src/shared/CollisionSystem.ts`, `src/shared/__tests__/CollisionSystem.test.ts`
- **Acceptance criteria:**
  - [ ] `aabbOverlap()`, `getWorldHitbox()`, `getWorldHurtbox()`, `checkHit()`
  - [ ] Hit detection only during move's active frames
  - [ ] Hitboxes correctly flipped based on `facingRight`
  - [ ] 5+ tests, zero Phaser imports
- **Constitution:** #4 Fixed Timestep, #2 Data-Driven

---

### Wave 6: Combat Integration (sequential)

#### [T15] Integrate CollisionSystem into FightEngine + hit reactions
- **Phase:** 1b | **Type:** feature
- **Depends on:** T10, T13, T14
- **Output (modify):** `FightEngine.ts`, `FightEngine.test.ts`
- **Acceptance criteria:**
  - [ ] `step()` runs `checkHit()` after FSM + physics
  - [ ] Hit: damage HP, set hitstun, apply knockback velocity, set hitStop
  - [ ] HitStop freezes both fighters for N frames
  - [ ] Pressing Q near opponent causes visible hit reaction
- **Constitution:** #1 Game Feel First (hit stop!), #4 Fixed Timestep

#### [T16] Add blocking logic
- **Phase:** 1b | **Type:** feature
- **Depends on:** T15
- **Output (modify):** `FightEngine.ts`, `FighterFSM.ts`, `FightEngine.test.ts`
- **Acceptance criteria:**
  - [ ] Block state: blockstun instead of hitstun, knockback*0.5, damage=0
  - [ ] New FSM state: `blockstun/standing`
  - [ ] Tests: block reduces damage, applies blockstun
- **Constitution:** #1 Game Feel First, #2 Data-Driven

---

### Wave 7: Rounds + HUD

#### [T17] Add round management to FightEngine
- **Phase:** 1b | **Type:** feature
- **Depends on:** T15
- **Output (modify):** `FightEngine.ts`, `FightEngine.test.ts`
- **Acceptance criteria:**
  - [ ] Round phases: intro(60f) -> fight -> ko(120f) -> roundEnd -> matchEnd
  - [ ] Timer counts down from 99s, timeout = HP comparison
  - [ ] Best of 3: `roundWins >= ROUNDS_TO_WIN` -> matchEnd
  - [ ] 6+ tests: phase transitions, timer, KO, match end
- **Constitution:** #1 Game Feel First, #4 Fixed Timestep

#### [T18] Create `src/game/ui/HealthBar.ts`
- **Phase:** 1b | **Type:** ui
- **Depends on:** T17, T11
- **Output (create):** `src/game/ui/HealthBar.ts`
- **Output (modify):** `FightScene.ts`
- **Acceptance criteria:**
  - [ ] Two HP bars at top of screen, mirror layout
  - [ ] Smooth drain animation (lerp)
  - [ ] P1 drains left-to-right, P2 right-to-left
- **Constitution:** #1 Game Feel First, #7 Mobile-First

#### [T19] Create `src/game/ui/RoundDisplay.ts`
- **Phase:** 1b | **Type:** ui
- **Depends on:** T17, T11
- **Output (create):** `src/game/ui/RoundDisplay.ts`
- **Output (modify):** `FightScene.ts`
- **Acceptance criteria:**
  - [ ] Timer centered at top, large font
  - [ ] Round dots (2 per player), filled on win
  - [ ] "FIGHT!" / "KO!" announcements with scale tween
- **Constitution:** #1 Game Feel First, #6 Humor-Driven

---

### Wave 8: GameOver

#### [T20] Update GameOver scene + complete local loop
- **Phase:** 1b | **Type:** ui
- **Depends on:** T17, T18, T19
- **Output (modify):** `GameOver.ts`, `FightScene.ts`
- **Acceptance criteria:**
  - [ ] Winner displayed: "PLAYER X WINS"
  - [ ] REMATCH button -> restart FightScene
  - [ ] MENU button -> MainMenu
  - [ ] Full local loop: MainMenu -> Fight -> KO -> rounds -> GameOver -> rematch
- **Constitution:** #3 Incremental Delivery, #1 Game Feel First

**--- MILESTONE: Phase 1b --- Two players fight on one keyboard, rounds work ---**

---

### Wave 9: Touch Controls (sequential chain)

#### [T21] Install nipplejs + create TouchControls
- **Phase:** 1c | **Type:** ui
- **Depends on:** T12
- **Output (create):** `src/game/ui/TouchControls.ts`
- **Output (modify):** `package.json` (add nipplejs)
- **Acceptance criteria:**
  - [ ] nipplejs joystick (DOM overlay, left side)
  - [ ] 4 attack buttons (right side), min 48px touch targets
  - [ ] `readBits()` returns packed `InputBit`
  - [ ] Only shown on non-desktop devices
- **Constitution:** #7 Mobile-First, #1 Game Feel First

#### [T22] Update InputManager for abstract input source
- **Phase:** 1c | **Type:** feature
- **Depends on:** T12, T21
- **Output (modify):** `InputManager.ts`
- **Acceptance criteria:**
  - [ ] `InputSource` interface: `{ readBits(): number }`
  - [ ] `KeyboardSource`, `TouchSource`, `NetworkSource` (stub) implementations
  - [ ] Auto-detect: mobile -> touch, desktop -> keyboard
- **Constitution:** #7 Mobile-First

#### [T23] Mobile config: fullscreen, orientation, scale
- **Phase:** 1c | **Type:** ui
- **Depends on:** T22
- **Output (modify):** `src/game/main.ts`, `MainMenu.ts`, `public/style.css`
- **Acceptance criteria:**
  - [ ] `scale: { mode: FIT, autoCenter: CENTER_BOTH }`, `input: { activePointers: 3 }`
  - [ ] FULLSCREEN button in MainMenu
  - [ ] `screen.orientation.lock('landscape')` attempted
  - [ ] Portrait warning overlay
- **Constitution:** #7 Mobile-First, #3 Incremental Delivery

**--- MILESTONE: Phase 1c --- Playable on phone with touch controls ---**

---

### Wave 10: Server (T24 first, then T25+T26 parallel)

> **Note:** Wave 10 can run in parallel with Wave 9 (independent code paths)

#### [T24] Server scaffolding: deno.json + main.ts
- **Phase:** 1d | **Type:** setup
- **Depends on:** T04, T05
- **Output (create):** `server/deno.json`, `server/main.ts`
- **Acceptance criteria:**
  - [ ] Import map: `"@shared/": "../src/shared/"`
  - [ ] HTTP server on PORT env (default 8000)
  - [ ] `/ws` upgrades to WebSocket
  - [ ] `deno run --allow-net server/main.ts` starts
  - [ ] Imports from `@shared/types.ts` work
- **Constitution:** #5 Keep Netcode Simple, #3 Incremental Delivery

#### [T25] Create `server/RoomManager.ts`
- **Phase:** 1d | **Type:** feature
- **Depends on:** T24
- **Output (create):** `server/RoomManager.ts`
- **Output (modify):** `server/main.ts`
- **Acceptance criteria:**
  - [ ] `createRoom()` -> 4-letter code (A-Z)
  - [ ] `joinRoom(code)` -> assign playerIndex 0|1
  - [ ] Invalid code -> error message
  - [ ] Room destroyed on both disconnect
- **Constitution:** #5 Keep Netcode Simple

#### [T26] Create `server/GameRoom.ts`
- **Phase:** 1d | **Type:** feature
- **Depends on:** T10, T24, T25
- **Output (create):** `server/GameRoom.ts`
- **Acceptance criteria:**
  - [ ] Holds FightEngine instance, runs at ~60Hz
  - [ ] Both ready -> fight_start, start loop
  - [ ] Broadcasts `state_update` every 3rd tick (20Hz)
  - [ ] Input from clients fed to correct player slot
  - [ ] Disconnect ends room
- **Constitution:** #5 Keep Netcode Simple, #4 Fixed Timestep

---

### Wave 10.5: Server Hardening

#### [T24.5] Server input validation + basic logging
- **Phase:** 1d | **Type:** hardening
- **Depends on:** T24
- **Output (modify):** `server/main.ts`
- **Acceptance criteria:**
  - [ ] All incoming WS messages validated: correct `type` field, `bits` in range 0–255
  - [ ] Invalid messages logged and discarded (no server crash)
  - [ ] `console.log` on room create/destroy, player connect/disconnect
  - [ ] Rate limit: max 120 messages/sec per WebSocket (2x of 60Hz input rate)
- **Constitution:** #5 Keep Netcode Simple

#### [T26.5] Server unit tests
- **Phase:** 1d | **Type:** test
- **Depends on:** T25, T26
- **Output (create):** `server/__tests__/RoomManager.test.ts`, `server/__tests__/GameRoom.test.ts`
- **Acceptance criteria:**
  - [ ] RoomManager: create room, join room, invalid code, full room, cleanup on disconnect
  - [ ] GameRoom: start/stop loop, disconnect handling
  - [ ] 8+ tests pass via `deno test`
- **Constitution:** #3 Incremental Delivery

---

### Wave 11: Network Client (sequential chain)

#### [T27] Create `src/game/net/NetworkClient.ts`
- **Phase:** 1d | **Type:** feature
- **Depends on:** T04, T24
- **Output (create):** `src/game/net/NetworkClient.ts`
- **Acceptance criteria:**
  - [ ] `connect(url)`, `disconnect()`, `send(msg)`, `onMessage(cb)`
  - [ ] Convenience: `createRoom()`, `joinRoom(code)`, `sendReady()`, `sendInput(frame, bits)`
  - [ ] Connection state machine: disconnected->connecting->connected->inRoom->inFight
  - [ ] Graceful error handling (no crash)
- **Constitution:** #5 Keep Netcode Simple

#### [T28] Update FightScene for online mode
- **Phase:** 1d | **Type:** feature
- **Depends on:** T11, T27, T26
- **Output (modify):** `FightScene.ts`, `InputManager.ts`
- **Acceptance criteria:**
  - [ ] `init({ mode: 'online', networkClient, playerIndex })`
  - [ ] Online: send local input, receive `state_update`, overwrite engine state
  - [ ] Smooth interpolation for opponent position
  - [ ] Local mode unchanged
- **Constitution:** #5 Keep Netcode Simple, #1 Game Feel First

#### [T29] Update MainMenu for LOCAL/ONLINE flow
- **Phase:** 1d | **Type:** ui
- **Depends on:** T23, T27, T28
- **Output (modify):** `MainMenu.ts`
- **Acceptance criteria:**
  - [ ] LOCAL button -> FightScene(local)
  - [ ] ONLINE -> CREATE ROOM -> show code -> wait
  - [ ] ONLINE -> JOIN ROOM -> input code -> connect
  - [ ] Both in room -> ready -> fight_start -> FightScene(online)
  - [ ] Error messages for failures
  - [ ] Reads `VITE_WS_URL` (default `ws://localhost:8000/ws`)
- **Constitution:** #7 Mobile-First, #3 Incremental Delivery

**--- MILESTONE: Phase 1d --- Two browsers fight online via WebSocket ---**

---

### Wave 12: Deploy

#### [T30] GitHub Actions: deploy client to Pages
- **Phase:** 1e | **Type:** deploy
- **Depends on:** T29
- **Output (create):** `.github/workflows/deploy.yml`
- **Acceptance criteria:**
  - [ ] Push to main -> build -> deploy to GitHub Pages
  - [ ] `VITE_WS_URL` set to production server URL
- **Constitution:** #3 Incremental Delivery

#### [T31] Deno Deploy config + env docs
- **Phase:** 1e | **Type:** deploy
- **Depends on:** T26
- **Output (create):** `docs/deploy.md`, `.env.example`
- **Output (modify):** `server/main.ts` (PORT/CORS from env)
- **Acceptance criteria:**
  - [ ] Server reads PORT, CORS_ORIGIN from env
  - [ ] Deploy instructions documented in `docs/deploy.md`
- **Constitution:** #8 Co-located Documentation, #3 Incremental Delivery

#### [T32] End-to-end test on phones
- **Phase:** 1e | **Type:** test
- **Depends on:** T30, T31
- **Output (create):** `docs/testing-checklist.md`
- **Acceptance criteria:**
  - [ ] Two phones play full match via Telegram link
  - [ ] Latency <100ms perceived delay
  - [ ] Touch controls usable, no crashes in 5-min session
- **Constitution:** #1 Game Feel First, #3 Incremental Delivery, #7 Mobile-First

**--- MILESTONE: Phase 1e --- Friends play via shared link ---**

---

## Dependency Graph

```
T01 ──┬── T02 (parallel)
      ├── T03
      ├── T04 ──┬── T06 ──── T10 ──┬── T11 ── T12 ── T13 ── T15 ── T16
      │         ├── T07 ──┐        │                          │
      │         ├── T08 ──┼── T09 ─┘         T14 ─────────────┘
      │         │         │
      └── T05 ──┘         └── T10
                                              T15 ── T17 ──┬── T18
                                                           ├── T19
                                                           └── T20

T12 ── T21 ── T22 ── T23 ── T29

T04+T05 ── T24 ──┬── T24.5
                  ├── T25 ── T26 ──┐
                  │                 ├── T26.5
                  └── T27 ── T28 ── T29

T29 ── T30 ──┐
T26 ── T31 ──┼── T32
```

## Critical Path

```
🔴 T01 -> T04 -> T07 -> T10 -> T11 -> T12 -> T13 -> T15 -> T17 -> T20 -> T29 -> T32
```

12 tasks, ~6 hours sequential minimum.

**Off critical path (flexible):**
- 🟢 T02, T03, T05, T06, T08, T09, T14, T18, T19, T21, T24, T24.5, T26.5, T30, T31
- 🟡 T16, T22, T23, T25, T26, T27, T28 (have dependents but with slack)

---

## Progress Tracker

```
### Wave 0
- [ ] T01: Project cleanup (resolution, telemetry, vitest)
- [ ] T02: Update CLAUDE.md conventions
- [ ] T03: Vitest config + smoke test

### Wave 1
- [ ] T04: src/shared/types.ts
- [ ] T05: src/shared/constants.ts

### Wave 2
- [ ] T06: src/shared/PhysicsSystem.ts
- [ ] T07: src/game/entities/FighterFSM.ts
- [ ] T08: Sprites + default.json

### Wave 3
- [ ] T09: src/game/entities/Fighter.ts
- [ ] T10: src/shared/FightEngine.ts

### Wave 4
- [ ] T11: FightScene.ts (fixed timestep)
- [ ] T12: InputManager.ts
🏁 Phase 1a: fighter walks/jumps with keyboard

### Wave 5
- [ ] T13: Attack states in FSM
- [ ] T14: src/shared/CollisionSystem.ts

### Wave 6
- [ ] T15: Combat integration in FightEngine
- [ ] T16: Blocking logic

### Wave 7
- [ ] T17: Round management
- [ ] T18: HealthBar.ts
- [ ] T19: RoundDisplay.ts

### Wave 8
- [ ] T20: GameOver + full local loop
🏁 Phase 1b: two players fight locally

### Wave 9
- [ ] T21: nipplejs + TouchControls
- [ ] T22: Abstract input source
- [ ] T23: Mobile config (fullscreen, orientation)
🏁 Phase 1c: playable on phone

### Wave 10
- [ ] T24: Server scaffolding
- [ ] T25: RoomManager
- [ ] T26: GameRoom

### Wave 10.5
- [ ] T24.5: Server input validation + logging
- [ ] T26.5: Server unit tests

### Wave 11
- [ ] T27: NetworkClient
- [ ] T28: Online FightScene
- [ ] T29: MainMenu LOCAL/ONLINE

🏁 Phase 1d: online multiplayer works

### Wave 12
- [ ] T30: GitHub Actions deploy
- [ ] T31: Deno Deploy config
- [ ] T32: E2E test on phones
🏁 Phase 1e: friends play via link
```

---

## First Task Brief (T01)

**Task:** Project cleanup — resolution, telemetry, vitest

**Context:** Phaser template clone with telemetry beacon (`log.js` pings gryzor.co), 4:3 resolution (1024x768 wastes space on mobile landscape), no testing framework. Clean foundation before game code.

**Changes:**

1. **Delete** `log.js`

2. **`package.json`** — modify scripts and deps:
   - `"dev"`: `"vite --config vite/config.dev.mjs"` (remove `node log.js dev &`)
   - `"build"`: `"vite build --config vite/config.prod.mjs"` (remove `node log.js build &`)
   - Remove `"dev-nolog"` and `"build-nolog"` (now redundant)
   - Add to devDependencies: `"vitest": "^3.1"`
   - Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

3. **`src/game/main.ts:13`** — change `height: 768` to `height: 576`

4. **`index.html`** — change `<title>` to "The Koreshi Fight Club"

5. **Scene Y-coordinates** (768/2=384 -> 576/2=288):
   - `Preloader.ts:13` — `this.add.image(512, 384,` -> `(512, 288,`
   - `Preloader.ts:16` — `this.add.rectangle(512, 384,` -> `(512, 288,`
   - `Preloader.ts:19` — `this.add.rectangle(512-230, 384,` -> `(512-230, 288,`
   - `MainMenu.ts:16` — `this.add.image(512, 384,` -> `(512, 288,`
   - `MainMenu.ts:18` — `this.add.image(512, 300,` -> `(512, 220,`
   - `MainMenu.ts:20` — `this.add.text(512, 460,` -> `(512, 360,`
   - `Game.ts:19` — `this.add.image(512, 384,` -> `(512, 288,`
   - `Game.ts:22` — `this.add.text(512, 384,` -> `(512, 288,`
   - `GameOver.ts:19` — `this.add.image(512, 384,` -> `(512, 288,`
   - `GameOver.ts:22` — `this.add.text(512, 384,` -> `(512, 288,`

**DO NOT:**
- Add `scale: { mode: FIT }` (that's T23)
- Modify tsconfig.json or vite configs
- Create new directories
- Touch Boot.ts (no centering there)

**Verification:**
```bash
npm install
npm run dev        # -> game at 1024x576, no telemetry in console
npm run build      # -> builds without errors
npm test           # -> exits with "no tests found" (not an error)
# Click through all 5 scenes to verify navigation
```
