# The Корешки Fight Club — Implementation Plan

## Context

Browser 2D fighting game for 17 friends from Telegram group "Корешки". Phaser 3 + TypeScript + Vite scaffold already exists with template scenes (Boot, Preloader, MainMenu, Game, GameOver) but zero game logic. Research completed in `docs/research.md`. All gameplay, networking, and touch controls are greenfield.

**Goal:** Deliver a playable online 1v1 fighter accessible via link from a phone. Fun > polish.

---

## Step 1: Project Definition

- **Project name:** The Корешки Fight Club
- **One-line:** Browser 2D fighting game where 17 friends beat each other up with meme super moves
- **MVP scope (Phase 1):** 1 character (mirror match), basic combat (punch, kick, block, jump), HP bars, round system, touch controls, WebSocket online, deploy
- **Out of scope:** 17 unique characters (Phase 2), combo system (Phase 3), stats/leaderboard (Phase 4)

---

## Step 2: Constitution

Constitution already defined in `CLAUDE.md` (8 principles). Create standalone `constitution.md` for enforcement:

```markdown
# Project Constitution

These principles are immutable. Every implementation decision must comply with them.
Any violation requires explicit user approval and documented justification.

1. **Game Feel First** — every frame, every hitbox is tuned for fun. Technical perfection without fun is failure.
2. **Data-Driven Everything** — characters, moves, animations are JSON configs. Code knows nothing about "Vasya" or "Petro".
3. **Incremental Delivery** — every phase produces a playable build. Phase 1 must already be fun.
4. **Fixed Timestep Simulation** — all game logic runs at fixed 60 FPS, independent of render FPS.
5. **Keep Netcode Simple** — delay-based authoritative server, not rollback. Sufficient for 17 casual friends.
6. **Humor-Driven Design** — inside jokes, meme super moves, absurd descriptions matter more than technical polish.
7. **Mobile-First, Desktop-Compatible** — UI and controls designed for phone first, keyboard as fallback.
8. **Co-located Documentation** — all project docs live inside the repo (`docs/`), never outside.
```

---

## Step 3: Tech Stack

| Layer | Technology | Version | Reasoning |
|-------|-----------|---------|-----------|
| Language | TypeScript | 5.7 | Already configured, strict mode |
| Engine | Phaser 3 | 3.90 | Mature, Arcade Physics, huge ecosystem |
| Bundler | Vite | 6.3 | HMR, fast builds, already configured |
| Touch | nipplejs | latest | Virtual joystick for mobile |
| Server | Deno (native WebSocket) | latest | Free deploy, TS native, no cold start |
| Client hosting | GitHub Pages | — | Free, CI via Actions |
| Server hosting | Deno Deploy | — | 100K req/day free, WebSocket support |
| Testing | Vitest | latest | Fast, Vite-native, TS support |

### Step 3.1: MCP Servers

No additional MCP servers needed. GitHub and Context7 are already global. No database, no Docker, no browser testing in Phase 1 (Playwright can be added in Phase 3 for UI testing).

---

## Step 4: Project Structure

```
GameDev/
├── src/
│   ├── main.ts                    — entry point (exists)
│   ├── game/
│   │   ├── main.ts                — Phaser config (modify: resolution, input)
│   │   ├── scenes/
│   │   │   ├── Boot.ts            — asset loading (modify: load spritesheets)
│   │   │   ├── Preloader.ts       — loading bar (exists, minor changes)
│   │   │   ├── MainMenu.ts        — main menu (modify: fullscreen button)
│   │   │   ├── FightScene.ts      — NEW: main gameplay (replaces Game.ts)
│   │   │   └── GameOver.ts        — victory screen (modify)
│   │   ├── entities/
│   │   │   ├── Fighter.ts         — NEW: visual fighter (sprite, anims)
│   │   │   └── FighterFSM.ts      — NEW: hierarchical state machine
│   │   ├── systems/
│   │   │   └── InputManager.ts    — NEW: keyboard + touch → InputFrame
│   │   ├── ui/
│   │   │   ├── HealthBar.ts       — NEW: HP bar display
│   │   │   ├── RoundDisplay.ts    — NEW: round counter + timer
│   │   │   └── TouchControls.ts   — NEW: nipplejs + attack buttons
│   │   └── net/
│   │       └── NetworkClient.ts   — NEW: WebSocket client + reconciliation
│   └── shared/                    — pure TS, NO phaser/deno imports
│       ├── types.ts               — NEW: all interfaces & enums
│       ├── constants.ts           — NEW: game constants (gravity, stage size)
│       ├── FightEngine.ts         — NEW: core simulation (step function)
│       ├── PhysicsSystem.ts       — NEW: movement, gravity, push boxes
│       └── CollisionSystem.ts     — NEW: AABB hitbox/hurtbox detection
├── server/                        — Deno project (separate from client)
│   ├── deno.json                  — NEW: import map for shared/
│   ├── main.ts                    — NEW: HTTP + WebSocket server entry
│   ├── GameRoom.ts                — NEW: room lifecycle + game loop
│   └── RoomManager.ts             — NEW: room creation/joining
├── public/
│   ├── assets/
│   │   ├── fighters/              — NEW: sprite sheets (LuizMelo)
│   │   └── ui/                    — NEW: HP bar, buttons, etc.
│   └── data/
│       └── characters/
│           └── default.json       — NEW: default fighter config
├── docs/
│   └── research.md                — exists
├── vite/                          — exists
├── constitution.md                — NEW
├── CLAUDE.md                      — exists (update with conventions)
├── package.json                   — modify (add nipplejs, vitest)
└── tsconfig.json                  — exists
```

**Directories:**
- `src/shared/` — pure simulation code shared between client & server. Zero platform imports.
- `src/game/entities/` — Phaser-dependent fighter rendering & state machine
- `src/game/systems/` — input handling abstraction
- `src/game/ui/` — HUD elements (health bars, touch controls)
- `src/game/net/` — WebSocket client, state reconciliation
- `server/` — Deno WebSocket server (separate runtime, imports from shared/)
- `public/data/characters/` — JSON character configs

---

## Step 5: Data Model

### CharacterConfig (JSON, loaded at runtime)

```typescript
interface CharacterConfig {
  id: string;
  name: string;
  stats: { health: number; speed: number; jumpForce: number; };
  visual: {
    spriteSheet: string;        // path to sprite sheet
    frameSize: { w: number; h: number; };
    scale: { x: number; y: number; };
    originY: number;            // anchor point (0.0-1.0)
  };
  animations: Record<string, AnimDef>;
  moves: Record<string, MoveDef>;
  hurtboxes: Record<string, AABB>;  // per-pose
  pushbox: AABB;
}

interface MoveDef {
  damage: number;
  startup: number;   // frames before hitbox active
  active: number;    // frames hitbox is out
  recovery: number;  // frames after hitbox gone
  hitstun: number;
  blockstun: number;
  knockback: { x: number; y: number; };
  hitboxes: { frame: number; x: number; y: number; w: number; h: number; }[];
  animation: string;
}
```

### FighterState (runtime, serializable)

```typescript
interface FighterState {
  x: number; y: number;
  velX: number; velY: number;
  facingRight: boolean;
  hp: number;
  topState: 'grounded' | 'airborne' | 'hitstun' | 'knockdown';
  subState: string;
  currentMove: string | null;
  frameInState: number;
  roundWins: number;
}
```

### GameState

```typescript
interface GameState {
  frameNumber: number;
  fighters: [FighterState, FighterState];
  roundPhase: 'intro' | 'fight' | 'ko' | 'roundEnd' | 'matchEnd';
  roundTimer: number;
  hitStop: number;
  currentRound: number;
}
```

### InputFrame

```typescript
const enum InputBit {
  LEFT = 1, RIGHT = 2, UP = 4, DOWN = 8,
  PUNCH = 16, KICK = 32, BLOCK = 64, SPECIAL = 128
}

interface InputFrame {
  frame: number;
  bits: number;  // packed InputBit flags
}
```

### Network Messages

```typescript
type ClientMsg =
  | { type: 'create_room' }
  | { type: 'join_room'; code: string }
  | { type: 'ready' }
  | { type: 'input'; frame: number; bits: number };

type ServerMsg =
  | { type: 'room_created'; code: string }
  | { type: 'room_joined'; playerIndex: 0 | 1 }
  | { type: 'fight_start'; config: CharacterConfig }
  | { type: 'state_update'; state: GameState }
  | { type: 'round_end'; winner: 0 | 1 }
  | { type: 'match_end'; winner: 0 | 1 }
  | { type: 'error'; message: string };
```

---

## Step 6: Implementation Phases

### Phase 1a: Fighter Core (~tasks 1-7)

**Deliverable:** One fighter walks, jumps, crouches on screen with keyboard input. Second fighter stands idle as a dummy.

- [ ] **1a.1** Create `src/shared/types.ts` — all interfaces, enums, InputBit
- [ ] **1a.2** Create `src/shared/constants.ts` — STAGE_WIDTH=1024, STAGE_HEIGHT=576 (16:9), FLOOR_Y=520, GRAVITY=0.6, FIXED_DT=1000/60
- [ ] **1a.3** Create `src/shared/PhysicsSystem.ts` — applyGravity(), applyVelocity(), clampToStage(), resolvePushboxes()
- [ ] **1a.4** Create `src/game/entities/FighterFSM.ts` — hierarchical FSM with flat state map. States: grounded/idle, grounded/walkForward, grounded/walkBackward, grounded/crouch, airborne/jump, airborne/fall. Each state: enter(), update(input) → transition | null, exit()
- [ ] **1a.5** Download LuizMelo Martial Hero sprite sheets → `public/assets/fighters/`. Create `public/data/characters/default.json` with stats, animations, hurtboxes
- [ ] **1a.6** Create `src/game/entities/Fighter.ts` — Phaser sprite wrapper. Loads spritesheet, creates animations from config, syncs visual position/flip from FighterState
- [ ] **1a.7** Create `src/shared/FightEngine.ts` — step(inputs: [InputFrame, InputFrame]): void. Runs FSM updates, physics, per-tick game logic. Holds GameState.
- [ ] **1a.8** Rewrite `src/game/scenes/Game.ts` → `FightScene.ts` — fixed timestep accumulator, creates 2 Fighters, feeds keyboard input to FightEngine, renders state. Update scene registry in `src/game/main.ts`
- [ ] **1a.9** Create `src/game/systems/InputManager.ts` — reads Phaser keyboard (WASD+QE for P1, Arrows+JK for P2), outputs InputFrame with packed bits

**Key decisions:**
- Game canvas: 1024x576 (16:9) instead of current 1024x768 (4:3) — better for mobile landscape
- FighterFSM is a flat map `Record<string, StateHandler>` not class hierarchy — serializable, portable to server
- FightEngine in `shared/` has zero Phaser imports — runs identically on Deno

### Phase 1b: Combat System (~tasks 10-16)

**Deliverable:** Two players fight with punches, kicks, blocking. Hits cause damage, hitstun, knockback. HP bars, round timer, best of 3.

- [ ] **1b.1** Add attack states to FighterFSM: grounded/attack (parameterized by MoveDef), grounded/block, hitstun/standing, knockdown/falling, knockdown/getup
- [ ] **1b.2** Create `src/shared/CollisionSystem.ts` — checkHit(attacker, defender): HitResult | null. AABB overlap test, hitbox vs hurtbox. Respects attack frame windows (startup/active/recovery)
- [ ] **1b.3** Integrate CollisionSystem into FightEngine.step() — on hit: apply damage, hitstun, knockback, hit stop (6 frames freeze)
- [ ] **1b.4** Add blocking logic — if defender holds BLOCK and is grounded: blockstun instead of hitstun, reduced knockback, no damage (or chip damage)
- [ ] **1b.5** Add round management to FightEngine — roundPhase FSM (intro→fight→ko→roundEnd→matchEnd), roundTimer countdown, detect HP<=0, best of 3
- [ ] **1b.6** Create `src/game/ui/HealthBar.ts` — two HP bars at top of screen, Phaser Graphics, smooth drain animation
- [ ] **1b.7** Create `src/game/ui/RoundDisplay.ts` — round counter dots, timer display, "FIGHT!" / "KO!" announcements

### Phase 1c: Touch Controls (~tasks 17-21)

**Deliverable:** Game is playable on mobile phone in landscape with virtual joystick + attack buttons.

- [ ] **1c.1** `npm install nipplejs`. Create `src/game/ui/TouchControls.ts` — nipplejs joystick (left side, DOM overlay), 4 attack buttons (Phaser interactive sprites, right side). Maps to InputFrame bits. Only shown when `!this.sys.game.device.os.desktop`
- [ ] **1c.2** Update `src/game/systems/InputManager.ts` — abstract input source: keyboard OR touch. Single InputFrame output regardless of source
- [ ] **1c.3** Update `src/game/scenes/MainMenu.ts` — add "FULLSCREEN" button. On tap: `this.scale.startFullscreen()`. Add `screen.orientation.lock('landscape')` where supported. CSS overlay for portrait warning on iOS
- [ ] **1c.4** Update game config in `src/game/main.ts` — `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`, `input: { activePointers: 3 }` for multitouch
- [ ] **1c.5** Playtest on real phone, tune button sizes (min 48px touch target), joystick dead zone, responsiveness

### Phase 1d: Networking (~tasks 22-28)

**Deliverable:** Two players on different devices fight in real-time via WebSocket.

- [ ] **1d.1** Create `server/deno.json` — import map with `"@shared/": "../src/shared/"` for code sharing
- [ ] **1d.2** Create `server/main.ts` — Deno HTTP server, upgrade to WebSocket on `/ws`, route to RoomManager
- [ ] **1d.3** Create `server/RoomManager.ts` — createRoom() → 4-letter code, joinRoom(code) → assign player index, track active rooms
- [ ] **1d.4** Create `server/GameRoom.ts` — holds FightEngine instance, `setInterval(gameLoop, 16.67)`. Receives input from both players, runs FightEngine.step(), broadcasts state_update at 20 Hz (every 3rd tick)
- [ ] **1d.5** Create `src/game/net/NetworkClient.ts` — WebSocket connect/disconnect, send input, receive state_update. Queue for ordered message processing
- [ ] **1d.6** Update FightScene — two modes: `local` (both inputs from keyboard) and `online` (P1 input from local, P2 from server). On state_update: reconcile positions (smooth interp if delta > 5px, snap HP/FSM state)
- [ ] **1d.7** Update MainMenu — "LOCAL" and "ONLINE" buttons. Online flow: create room → show code → wait for opponent / enter code → join → ready → fight

### Phase 1e: Deploy (~tasks 29-32)

**Deliverable:** Friends open a link, play on their phones.

- [ ] **1e.1** Create `.github/workflows/deploy.yml` — on push to main: build client (`npm run build`), deploy to GitHub Pages
- [ ] **1e.2** Configure Deno Deploy — connect server/ directory, deploy `server/main.ts` as entry point
- [ ] **1e.3** Add environment config — client reads `VITE_WS_URL` env var for server address (localhost for dev, Deno Deploy URL for prod)
- [ ] **1e.4** End-to-end test: two phones, Telegram link → open → fullscreen → create room → share code → fight

---

### Phase 2: Content (future)
- [ ] Data-driven character loading system (switch from hardcoded default.json)
- [ ] 17 character JSON configs from user-provided descriptions
- [ ] Character select screen (grid of 17 portraits)
- [ ] Sprite customization: scale, palette swap (shader or tint), accessories overlay

### Phase 3: Polish (future)
- [ ] Combo system (cancel windows, chain detection from input buffer)
- [ ] Special moves (motion inputs: 236+P = hadouken-style)
- [ ] Sound effects (hit, block, KO, round start)
- [ ] Victory screen with winner portrait + joke tagline
- [ ] Lobby system (persistent rooms, invite links)
- [ ] Super meter + super moves

### Phase 4: Expansion (future)
- [ ] Win statistics (server-side, per player)
- [ ] Leaderboard display
- [ ] Tournament bracket mode

---

## Step 7: API / Interface Design

### WebSocket Protocol

| Direction | Type | Payload | When |
|-----------|------|---------|------|
| C→S | `create_room` | — | Player clicks "Create" |
| S→C | `room_created` | `{ code: "ABCD" }` | Room ready |
| C→S | `join_room` | `{ code: "ABCD" }` | Player enters code |
| S→C | `room_joined` | `{ playerIndex: 0\|1 }` | Both players in room |
| C→S | `ready` | — | Player ready to fight |
| S→C | `fight_start` | `{ config }` | Both players ready |
| C→S | `input` | `{ frame, bits }` | Every tick (60/sec) |
| S→C | `state_update` | `{ state: GameState }` | 20/sec from server |
| S→C | `round_end` | `{ winner: 0\|1 }` | HP reaches 0 or timer |
| S→C | `match_end` | `{ winner: 0\|1 }` | Best of 3 decided |
| S→C | `error` | `{ message }` | Invalid action |

### UI Screens

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| MainMenu | Entry point | Logo, "LOCAL" button, "ONLINE" button, "FULLSCREEN" button |
| FightScene | Gameplay | 2 fighters, HP bars, round timer, round dots, touch controls |
| GameOver | Match result | Winner display, "REMATCH" / "MENU" buttons |

---

## Step 8: CLAUDE.md Updates

Add to existing CLAUDE.md:

```markdown
## Architecture

- `src/shared/` — pure TypeScript simulation. NO Phaser/Deno/browser imports. Runs on client AND server.
- `src/game/` — Phaser-dependent client code (scenes, entities, UI, networking)
- `server/` — Deno WebSocket server. Imports from `src/shared/` via import map.

## Conventions

- All game logic in `src/shared/FightEngine.ts` step function. Never put gameplay logic in scenes.
- Fighter behavior = FighterFSM state handlers. Add states, don't add if/else chains.
- Character differences = JSON configs in `public/data/characters/`. Never hardcode character data.
- Fixed timestep: all positions/velocities in pixels per tick (not per second).
- Input as packed bits (InputBit enum). Never pass raw key states to game logic.

## Commands

- `npm run dev` — dev server on port 8080
- `npm run build` — production build
- `deno run --allow-net server/main.ts` — start game server locally
```

---

## Step 9: Verification

After each sub-phase, verify:

| Phase | Test |
|-------|------|
| 1a | Run `npm run dev`. Fighter walks/jumps/crouches with WASD. Dummy stands idle. |
| 1b | Two players on one keyboard fight. HP drains, rounds work, KO triggers GameOver. |
| 1c | Open on phone → fullscreen → landscape → joystick moves fighter, buttons attack. |
| 1d | Two browsers connect via room code. Inputs sync, fight plays out identically. |
| 1e | Open Telegram link on phone → game loads → create room → share code → fight friend. |

---

## Step 10: Decisions (resolved)

1. **Resolution:** 1024x576 (16:9) — оптимально для мобильного landscape
2. **Sprite pack:** Martial Hero (8 анимаций, punch/kick/block/jump/idle/run/fall/death)
3. **Local multiplayer:** local (2 игрока на одной клавиатуре) + online в Phase 1
4. **Server URL:** `koreshki-fight.deno.dev`
5. **Telemetry:** удалить log.js и все telemetry-скрипты (dev-nolog/build-nolog), оставить чистые dev/build
