# Phase 3: Polish — Combo System, UI, Sounds, Victory Screen, Lobby/Invite

## Project Definition

- **Project name**: Корешки Fight Club — Phase 3 (Polish)
- **One-line description**: Turn a functional prototype into a fun, juicy fighting game with combos, audio, visual effects, and seamless invite flow
- **MVP scope**: Chain combos, hit effects, SFX, improved victory screen, invite links
- **Out of scope (for now)**: Per-character unique spritesheets, rollback netcode, persistent stats/leaderboard, tournament mode, spectator mode (all → Phase 4)

---

## Current State (Post-Phase 2)

- **53 tasks completed** across Phases 1-2 (32 + 21)
- **17 characters** with unique stats, tints, scales — shared spritesheet
- **2 moves** per character: punch, kick — no chain, no combos
- **No audio** at all — zero SFX, zero music
- **No hit effects** — no flash, no shake, no particles
- **Basic GameOver** — name + "WINS!" text, rematch/menu buttons
- **Room code entry** — works on desktop, broken on mobile (follow-up item)
- **No invite links** — must manually share 4-letter code

### Follow-ups from Prior Phases
- [ ] Mobile room code input — Phaser keyboard events don't open mobile keyboard. Need HTML `<input>` overlay.

### Known Fragile Areas (from incidents)
- Sprite orientation (LEFT-default sheets need `setFlipX(facingRight)`)
- Asset path resolution with Phaser `setPath()` — reset before loading non-standard paths
- Breaking callback signature changes require grep for all callers

---

## Constitution

The existing [constitution in CLAUDE.md](../CLAUDE.md) applies. Phase 3 adds no new principles — all 8 existing principles remain in force. Key principles for this phase:

1. **Game Feel First** — combo feel, screen shake, hit sounds are THE priority
2. **Data-Driven Everything** — combo routes, special moves, SFX mappings in JSON configs
3. **Mobile-First** — P+K button already exists for specials; all new UI must work on phones
4. **Humor-Driven Design** — announcer lines, win quotes, meme-worthy supers

---

## Tech Stack (Additions for Phase 3)

| Layer | Technology | Version | Reasoning |
|-------|-----------|---------|-----------|
| Audio | Phaser built-in (WebAudio) | 3.90 | Already in engine, no new deps |
| SFX assets | Kenney.nl / freesound.org (CC0) | — | Free, no licensing issues |
| QR codes | `qrcode` npm package | ^1.5 | Lightweight, generates canvas/data URL for invite QR |
| Particles | Phaser Particles (built-in) | 3.90 | Hit sparks, victory confetti |

### MCP Servers

No new MCP servers needed. Current setup (GitHub + Context7) covers all Phase 3 needs. Playwright MCP could be useful for UI testing but is overkill for 17 friends.

---

## Project Structure (New/Modified)

```
src/shared/
├── types.ts              ← add ComboRoute, SpecialMoveDef, SFXEvent
├── FighterFSM.ts         ← add chain cancel, crouch/air attack states
├── FightEngine.ts        ← add combo tracking, hitstun scaling, SFX events
├── ComboSystem.ts        ← NEW: combo route validation, counter logic
└── constants.ts          ← add combo/audio constants

src/game/
├── entities/
│   └── Fighter.ts        ← add hit flash, impact effects
├── scenes/
│   ├── FightScene.ts     ← add screen shake, SFX playback, combo counter
│   ├── GameOver.ts       ← victory screen overhaul
│   ├── MainMenu.ts       ← invite link flow, QR code
│   └── Preloader.ts      ← load audio assets
├── ui/
│   ├── ComboCounter.ts   ← NEW: hit count + damage display
│   ├── HitSpark.ts       ← NEW: particle effect on hit
│   └── TouchControls.ts  ← add special button mapping
├── audio/
│   └── SoundManager.ts   ← NEW: centralized SFX/music playback
└── net/
    └── NetworkClient.ts  ← no changes expected

server/
├── main.ts               ← add invite link route (/join?code=XXXX redirect)
└── RoomManager.ts        ← no changes

public/
├── assets/
│   ├── sfx/              ← NEW: hit, block, ko, ui sounds
│   └── music/            ← NEW: menu + fight BGM
└── data/
    └── characters/*.json  ← add comboRoutes, specialMove, sfxOverrides
```

---

## Data Model (New Types)

### ComboRoute (in CharacterConfig)

```typescript
interface ComboRoute {
    from: string;         // move key that started ("punch")
    to: string;           // move key that chains into ("kick")
    cancelWindow: number; // frames before recovery end where cancel is allowed
}
```

### SpecialMoveDef (in CharacterConfig)

```typescript
// Triggered by P+K simultaneous input (already has touch button)
interface SpecialMoveDef extends MoveDef {
    name: string;           // "Длинный удар", "Бигибоди Пресс"
    cooldownFrames: number; // prevent spam (e.g., 120 = 2 seconds)
}
```

### SFX Events (engine → client)

```typescript
type SFXEvent =
    | { type: 'hit'; intensity: 'light' | 'heavy'; x: number; y: number }
    | { type: 'block'; x: number; y: number }
    | { type: 'whiff' }
    | { type: 'ko'; playerIndex: 0 | 1 }
    | { type: 'special'; characterId: string };
```

### ComboState (per-fighter, in FighterState)

```typescript
// Added to FighterState
comboCount: number;       // current combo hit count (reset when opponent exits hitstun)
comboDamage: number;      // accumulated combo damage
specialCooldown: number;  // frames until special is available again
```

### Updated CharacterConfig (additions)

```typescript
// New fields in CharacterConfig
comboRoutes: ComboRoute[];                    // allowed chain cancel paths
specialMove?: SpecialMoveDef;                 // P+K special (optional per char)
```

---

## Implementation Phases

### Phase 3.1: Combo Foundation (engine-level)

Deliverable: chain cancels work in local mode, combo counter visible

- [ ] **T01** — Add `ComboRoute` and `comboCount`/`comboDamage` to types.ts
- [ ] **T02** — Add `specialMove`, `specialCooldown` types and `SFXEvent` type
- [ ] **T03** — Implement chain cancel logic in FighterFSM (during attack recovery, check comboRoutes for valid chain → transition to new attack)
- [ ] **T04** — Add crouch attack sub-state (`grounded/crouchAttack`) — triggered by down+punch/kick while crouching
- [ ] **T05** — Add jump attack sub-state (`airborne/attack`) — triggered by punch/kick while airborne, must land to recover
- [ ] **T06** — Implement hitstun scaling in FightEngine (each combo hit reduces hitstun by 15%, min 40% of base — prevents infinites)
- [ ] **T07** — Track combo state in FightEngine: increment comboCount on hit, reset when opponent exits hitstun without being hit again
- [ ] **T08** — Generate SFXEvent list from FightEngine step (return events alongside state — no audio in shared/)
- [ ] **T09** — Update 17 character JSON configs: add `comboRoutes` (P→K, P→P, K→P as base set, vary by category)
- [ ] **T10** — Add special move definitions to character configs (one per character, unique humorous names)
- [ ] **T11** — Implement special move in FSM: P+K input → special attack state, cooldown tracking
- [ ] **T12** — Create `ComboCounter.ts` UI component (shows "X HITS!" with scaling animation, fades after combo ends)
- [ ] **T13** — Wire combo counter into FightScene
- [ ] **T14** — Update FighterFSM tests for chain cancel, crouch attack, jump attack
- [ ] **T15** — Update FightEngine tests for combo tracking, hitstun scaling, SFX events

### Phase 3.2: Audio System

Deliverable: all combat actions have sound, background music plays

- [ ] **T16** — Source CC0 SFX assets: hit (3 variations light/medium/heavy), block, whiff, KO, UI click, special
- [ ] **T17** — Source CC0 music: menu BGM (looping), fight BGM (looping)
- [ ] **T18** — Create `SoundManager.ts`: load/play SFX by event type, music control (play/stop/crossfade), volume settings, mute toggle
- [ ] **T19** — Load audio assets in Preloader
- [ ] **T20** — Wire SFX events from FightEngine → SoundManager in FightScene (on each step, play corresponding sounds)
- [ ] **T21** — Add UI sounds: button hover/click in MainMenu, CharacterSelect cell click, confirm
- [ ] **T22** — Add announcer sounds: "FIGHT!", "K.O.!", "ROUND X" (can be synthesized or sourced)
- [ ] **T23** — Music playback: menu BGM in MainMenu, fight BGM in FightScene, stop on scene transition
- [ ] **T24** — Mute button (persistent via localStorage): visible in all scenes, toggles all audio

### Phase 3.3: Visual Effects & UI Polish

Deliverable: hits feel impactful, UI is polished

- [ ] **T25** — Hit flash: white tint flash (50ms) on Fighter sprite when hit
- [ ] **T26** — Screen shake: camera shake on heavy hits and KO (intensity varies)
- [ ] **T27** — Create `HitSpark.ts`: particle burst at hit contact point (orange/yellow particles, 200ms lifetime)
- [ ] **T28** — Wire hit spark into FightScene (spawn on hit SFX event position)
- [ ] **T29** — KO slow-motion: 0.3x game speed for 60 frames on KO hit (visual only, doesn't affect engine timer)
- [ ] **T30** — Hit-stop visual enhancement: slight zoom (1.02x) during existing hit-stop frames
- [ ] **T31** — Improve HealthBar: add damage flash (red section shows recent damage, shrinks after delay), player name labels
- [ ] **T32** — Improve RoundDisplay: animated timer (pulse when <10s), better phase announcements with outline text

### Phase 3.4: Victory Screen Overhaul

Deliverable: GameOver scene feels like a reward, shows match stats

- [ ] **T33** — Victory screen layout: winner character (large, animated idle), loser character (small, desaturated), versus banner
- [ ] **T34** — Match stats panel: hits landed, damage dealt, max combo, rounds won — for both players
- [ ] **T35** — Win quote: random humorous line per character (from config), displayed under winner name
- [ ] **T36** — Victory confetti particles: colored particles falling from top on win
- [ ] **T37** — Add `winQuotes: string[]` to CharacterConfig, update 17 configs with 3-5 quotes each

### Phase 3.5: Lobby & Invite Links

Deliverable: seamless room sharing via links, mobile input fixed

- [ ] **T38** — Fix mobile room code input: HTML `<input>` overlay positioned over Phaser canvas (resolves follow-up item)
- [ ] **T39** — URL-based room join: parse `?room=XXXX` query param on app load → auto-join room
- [ ] **T40** — "Copy invite link" button in room creation waiting screen (copies URL with `?room=CODE`)
- [ ] **T41** — QR code generation: `qrcode` package → render QR on waiting screen for mobile sharing
- [ ] **T42** — Server: add HTTP route `/join?code=XXXX` → redirect to client URL with `?room=XXXX` query param
- [ ] **T43** — Auto-reconnect: if WebSocket drops during fight, attempt 3 reconnects with exponential backoff

### Phase 3.6: Integration & Testing

Deliverable: everything works together, deployed, tested on phones

- [ ] **T44** — Update server character configs to include new Phase 3 fields (comboRoutes, specialMove, winQuotes)
- [ ] **T45** — Integration test: full local loop with combos, sounds, effects
- [ ] **T46** — Integration test: full online loop — invite link → join → select → fight → game over
- [ ] **T47** — Mobile testing checklist: touch combos, audio autoplay policy handling, invite link flow
- [ ] **T48** — Deploy updated client + server
- [ ] **T49** — Update testing-checklist.md with Phase 3 scenarios

---

## Dependencies Map

```
── Phase 3.1: Combo Foundation ──────────────────
[T01] ← none
[T02] ← T01
[T03] ← T01               (chain cancel FSM)
[T04] ← T03               (crouch attack, similar pattern)
[T05] ← T03               (jump attack, similar pattern)
[T06] ← T01               (hitstun scaling)
[T07] ← T06               (combo tracking)
[T08] ← T07               (SFX events from engine)
[T09] ← T01               (config update)
[T10] ← T02, T09           (special move configs)
[T11] ← T10, T03           (special move FSM)
[T12] ← T07               (combo counter UI)
[T13] ← T12               (wire into scene)
[T14] ← T03, T04, T05, T11 (FSM tests)
[T15] ← T07, T08           (engine tests)

── Phase 3.2: Audio ─────────────────────────────
[T16] ← none               (asset sourcing, can start anytime)
[T17] ← none               (asset sourcing)
[T18] ← none               (SoundManager, no deps)
[T19] ← T16, T17, T18      (load assets)
[T20] ← T08, T19           (wire SFX events)
[T21] ← T18                (UI sounds)
[T22] ← T19                (announcer)
[T23] ← T19                (music)
[T24] ← T18                (mute toggle)

── Phase 3.3: Visual Effects ────────────────────
[T25] ← none               (hit flash, standalone)
[T26] ← T08                (screen shake on SFX events)
[T27] ← none               (particle system, standalone)
[T28] ← T08, T27           (wire sparks to events)
[T29] ← T08                (KO slow-mo)
[T30] ← none               (hit-stop zoom, standalone)
[T31] ← none               (HealthBar improvement)
[T32] ← none               (RoundDisplay improvement)

── Phase 3.4: Victory Screen ────────────────────
[T33] ← none               (layout refactor)
[T34] ← T07                (needs combo stats from engine)
[T35] ← T37                (needs win quotes data)
[T36] ← none               (confetti particles)
[T37] ← none               (config data)

── Phase 3.5: Lobby & Invite ────────────────────
[T38] ← none               (mobile input fix)
[T39] ← none               (URL parsing)
[T40] ← T39                (copy link button)
[T41] ← T40                (QR code)
[T42] ← none               (server route)
[T43] ← none               (reconnect logic)

── Phase 3.6: Integration ───────────────────────
[T44] ← T10, T37           (server config update)
[T45] ← T13, T20, T28      (local integration)
[T46] ← T45, T40           (online integration)
[T47] ← T46                (mobile testing)
[T48] ← T47                (deploy)
[T49] ← T47                (docs)
```

## Execution Waves

```
── Wave 0 (no deps) ─────────────────────────────
   🔴 T01: ComboRoute + combo state types
   🟢 T16: Source SFX assets
   🟢 T17: Source music assets
   🟡 T18: Create SoundManager.ts
   🟢 T25: Hit flash on Fighter
   🟢 T27: HitSpark particle component
   🟢 T30: Hit-stop zoom
   🟢 T31: HealthBar improvement
   🟢 T32: RoundDisplay improvement
   🟢 T33: Victory screen layout
   🟢 T36: Victory confetti
   🟢 T37: Win quotes in configs
   🟡 T38: Fix mobile room code input
   🟡 T39: URL-based room join
   🟡 T42: Server /join route
   🟡 T43: Auto-reconnect

── Wave 1 (after T01) ───────────────────────────
   🔴 T02: SpecialMoveDef + SFXEvent types
   🔴 T03: Chain cancel FSM logic
   🔴 T06: Hitstun scaling
   🔴 T09: Update 17 configs with comboRoutes

── Wave 2 (after Wave 1) ────────────────────────
   🔴 T04: Crouch attack sub-state
   🔴 T05: Jump attack sub-state
   🔴 T07: Combo tracking in engine
   🔴 T10: Special move configs
   🟡 T40: Copy invite link button

── Wave 3 (after Wave 2) ────────────────────────
   🔴 T08: SFX event generation
   🔴 T11: Special move FSM
   🔴 T12: ComboCounter UI
   🟡 T34: Match stats panel
   🟡 T35: Win quotes display
   🟡 T41: QR code generation

── Wave 4 (after Wave 3) ────────────────────────
   🔴 T13: Wire combo counter
   🔴 T14: FSM tests
   🔴 T15: Engine tests
   🟡 T19: Load audio in Preloader
   🟡 T26: Screen shake
   🟡 T28: Wire hit sparks
   🟡 T29: KO slow-mo

── Wave 5 (after Wave 4) ────────────────────────
   🟡 T20: Wire SFX → SoundManager
   🟡 T21: UI sounds
   🟡 T22: Announcer sounds
   🟡 T23: Music playback
   🟡 T24: Mute button
   🟡 T44: Server config update

── Wave 6 (integration) ─────────────────────────
   🔴 T45: Local integration test
   🔴 T46: Online integration test
   🔴 T47: Mobile testing
   🔴 T48: Deploy
   🟢 T49: Update testing checklist
```

## Critical Path

```
T01 → T03 → T07 → T08 → T13 → T15 → T20 → T45 → T46 → T47 → T48
```

11 tasks on the critical path.

---

## API / Interface Design

### New Server Endpoint

```
GET /join?code=XXXX
  → 302 Redirect to CLIENT_URL?room=XXXX
  → 400 if code missing
```

### Client URL Params

```
CLIENT_URL?room=XXXX  → auto-connect to server, auto-join room XXXX
```

### SFX Event Flow (internal)

```
FightEngine.step(inputs)
  → returns { state: GameState, events: SFXEvent[] }
  → FightScene reads events → SoundManager.play(event) + HitSpark.spawn(event)
```

### New UI Screens/Components

| Component | Purpose | Key Elements |
|-----------|---------|-------------|
| ComboCounter | Shows active combo | Hit count (large), total damage (small), scale-in animation |
| HitSpark | Impact particles | Orange/yellow burst, 8-12 particles, 200ms |
| SoundManager | Audio control | SFX pool, music crossfade, mute state |
| Victory Screen (revised) | Match end | Winner sprite, stats table, win quote, confetti |
| Invite Panel | Room sharing | Room code, copy link button, QR code |
| Mute Button | Audio toggle | Speaker icon, top-right corner, all scenes |

---

## Open Questions

1. **Combo depth**: предложил 2-3 hit chains (P→K, P→P, K→P). Нужно ли больше (4-5 hit combos)? Или двух достаточно для казуальной игры?

2. **Special move input**: сейчас P+K кнопка на мобильном уже есть. Использовать P+K как ввод для специальной атаки? Или нужен отдельный ввод (направление + P+K)?

3. **Super meter**: добавлять ли шкалу суперов (заполняется от ударов, при полной → мощная спец-атака)? Или это overengineering для 17 друзей?

4. **Звуки**: использовать только CC0 ассеты (Kenney.nl, freesound.org) или есть свои звуки/голосовые записи друзей?

5. **Музыка**: один трек на бой и один на меню — достаточно? Или нужно разнообразие?

6. **Win quotes**: я предложил 3-5 цитат на персонажа. Есть ли готовые шутки/мемы группы, которые нужно включить?

7. **QR code**: стоит ли добавлять зависимость `qrcode` или достаточно кнопки "Copy link"? QR удобен когда оба игрока рядом с телефонами.

8. **Auto-reconnect**: реализовывать ли переподключение при обрыве WebSocket? Или для казуальной игры достаточно "connection lost → back to menu"?

---

## Task Sizing

| Phase | Tasks | Estimated Size |
|-------|-------|---------------|
| 3.1 Combo Foundation | 15 | L — core mechanic change across shared/ + configs |
| 3.2 Audio | 9 | M — new system but straightforward Phaser API |
| 3.3 Visual Effects | 8 | M — isolated visual enhancements |
| 3.4 Victory Screen | 5 | S — single scene refactor |
| 3.5 Lobby & Invite | 6 | M — client + server changes |
| 3.6 Integration | 6 | M — testing + deploy |
| **Total** | **49** | |
