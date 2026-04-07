# Phase 3 Tasks: Combo System, Audio, UI Polish, Victory, Lobby

## Context

Phase 2 complete (21 tasks, 122+ tests). Working game with 17 fighters, character select, local + online multiplayer. Phase 3 adds game feel: combos, sounds, visual effects, invite links, auto-reconnect.

**User decisions:** 2-3 hit chains; P+K special with cooldown (no super meter); CC0 audio; DnB music if available; win quotes deferred to Phase 4; no QR code; auto-reconnect required (unstable connection).

**Current state:** 2 moves (punch, kick), no chains/combos, zero audio, basic GameOver, room codes only (no links), mobile room code input broken.

---

## Dependencies Map

```
[T01] ← none
[T02] ← T01
[T03] ← T01
[T04] ← T02
[T05] ← T02
[T06] ← T02, T03
[T07] ← T01
[T08] ← T07
[T09] ← T04, T05, T06
[T10] ← T09
[T11] ← none
[T12] ← none
[T13] ← T03
[T14] ← T13
[T15] ← T13, T14
[T16] ← T03
[T17] ← T03
[T18] ← T03, T11
[T19] ← T11, T12, T18
[T20] ← T19
[T21] ← T19
[T22] ← T03
[T22b] ← none
[T23] ← T22
[T24] ← T23
[T25] ← T03
[T26] ← none
[T27] ← none
[T28] ← T27
[T29] ← none
[T30] ← none
[T31] ← T30
[T32] ← T01, T03, T08, T30
[T33] ← T32
[T34] ← T33
[T35] ← T34
```

## Execution Waves

```
── Wave 0 (no dependencies) ─────────────────────
   🔴 T01: Extend types for combo system + GameEvent
   🟡 T11: Source CC0 SFX assets
   🟡 T12: Source CC0 music
   🟢 T26: Fix mobile room code input
   🟢 T27: URL-based room join
   🟢 T29: Server /join redirect route
   🟢 T30: Auto-reconnect protocol types + server grace timer

── Wave 1 (after T01) ──────────────────────────
   🔴 T02: Chain cancel + special move in FSM
   🔴 T03: GameEvent emission + combo tracking in FightEngine
   🔴 T07: Update gen-characters.mjs: chainRoutes + new moves
   🟢 T08: Regenerate 17 character JSON configs

── Wave 2 (after T02, T03) ─────────────────────
   🔴 T04: Crouch attack in FSM
   🔴 T05: Jump attack in FSM + PhysicsSystem landing fix
   🔴 T06: Hitstun scaling (damage proration)

── Wave 3 (after Wave 2) ───────────────────────
   🔴 T09: FighterFSM comprehensive tests
   🟡 T13: Hit flash + hit-stop zoom on Fighter
   🟢 T16: Screen shake in FightScene
   🟢 T17: HitSpark particle effect
   🟢 T22: HealthBar improvements
   🟢 T22b: RoundDisplay improvements

── Wave 4 (after T09, T13) ─────────────────────
   🔴 T10: FightEngine comprehensive tests
   🟡 T14: ComboCounter + CooldownIndicator UI
   🟡 T15: Wire combo UI + events into FightScene
   🟡 T18: SoundManager + wire SFX events
   🟡 T25: KO slow-motion + effects

── Wave 5 (after T18, T19) ─────────────────────
   🟡 T19: Load audio in Preloader + music + announcer
   🟡 T20: UI sounds (menus + char select)
   🟡 T21: Mute button (persistent)
   🟢 T23: Victory screen layout overhaul
   🟡 T28: Copy invite link button
   🟡 T31: Auto-reconnect client (NetworkClient)

── Wave 6 (after T08, T30) ─────────────────────
   🔴 T32: Update server for Phase 3 (configs + events + reconnect)
   🟢 T24: Victory confetti particles

── Wave 7 (final — after all above) ────────────
   🔴 T33: Integration testing (local + online)
   🔴 T34: Mobile testing
   🔴 T35: Deploy + update docs
```

## Critical Path

```
T01 → T03 → T06 → T09 → T10 → T33 → T34 → T35
       T01 → T07 → T08 ─┐
       T30 ──────────────┼→ T32 → T33
```

Critical path: T01 → T02 → T04/T05 → T06 → T09 → T10 → T33 → T34 → T35 (9 tasks).
T32 (server) runs in parallel after T08 + T30 are done.

---

## Task List (35 tasks)

### [T01] Extend types for combo system and GameEvent
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: none
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/types.ts`
- **Changes**:
  Add `ChainRoute` interface:
  ```typescript
  export interface ChainRoute {
      from: string;
      to: string;
      cancelWindow: [number, number]; // [earliest, latest] frameInState
      onHitOnly: boolean;
  }
  ```
  Add `GameEvent` type:
  ```typescript
  export type GameEvent =
      | { type: 'hit'; attackerIdx: number; defenderIdx: number; moveKey: string; damage: number; x: number; y: number }
      | { type: 'block'; x: number; y: number }
      | { type: 'ko'; loserIdx: number }
      | { type: 'round_start'; round: number }
      | { type: 'match_end'; winnerIdx: number }
      | { type: 'special_used'; playerIdx: number };
  ```
  Add to `CharacterConfig`:
  ```typescript
  chainRoutes?: ChainRoute[];
  specialCooldownFrames?: number;
  ```
  Add to `FighterState`:
  ```typescript
  comboCount: number;
  comboDamage: number;
  specialCooldown: number;
  isCrouching: boolean;
  ```
  Add to `GameState`:
  ```typescript
  matchStats: {
      hits: [number, number];
      damage: [number, number];
      maxCombo: [number, number];
  };
  ```
  Update `state_update` ServerMsg: add `events?: GameEvent[]`.
- **Acceptance criteria**:
  - [ ] All new interfaces/types added
  - [ ] New FighterState fields added
  - [ ] New GameState.matchStats added
  - [ ] `npm run build` succeeds
  - [ ] `npm test` passes (update test configs with new required fields)
- **Tests required**:
  - [ ] Update `makeFighter()` helper in FighterFSM.test.ts with new fields
  - [ ] Update `testConfig` in FightEngine.test.ts with new fields
  - [ ] Verify existing tests still pass
- **Constitution check**: Data-Driven Everything
- **Implementation notes**: All new CharacterConfig fields are optional (`?`). FighterState fields have defaults (0/false) set in `createInitialFighterState()`.

---

### [T02] Chain cancel + special move in FighterFSM
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: T01
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/FighterFSM.ts`
- **Changes**:
  1. Modify `tryAttack()` (line 37-47): P+K check BEFORE individual P/K checks:
     - `has(bits, PUNCH) && has(bits, KICK) && cfg.moves['special'] && f.specialCooldown <= 0` → `moveKey = 'special'`, set `f.specialCooldown = cfg.specialCooldownFrames ?? 300`
  2. In `attack.update()` (line 134-142), BEFORE completion check: add chain cancel logic:
     - Iterate `cfg.chainRoutes ?? []`
     - Match: `route.from === f.currentMove` && `frameInState` in `cancelWindow`
     - If `route.onHitOnly`, also check `f.hitConfirmed`
     - On match: in-place reset: `f.currentMove = route.to`, `f.hitConfirmed = false`, `f.frameInState = 0` — do NOT call `transition()` to avoid exit() clearing currentMove
  3. In `attack.exit()` (line 144-147): add `f.isCrouching = false;` (do NOT reset comboCount here — see T03 for correct reset location)
- **Acceptance criteria**:
  - [ ] P+K triggers 'special' move when available and off cooldown
  - [ ] P+K blocked during cooldown (falls through to individual P/K)
  - [ ] Chain cancel works during cancelWindow range
  - [ ] onHitOnly chains require hitConfirmed
  - [ ] `npm run build` succeeds
- **Tests required**:
  - [ ] P+K → special move transition
  - [ ] Special blocked during cooldown
  - [ ] Chain cancel P→K during recovery frames
  - [ ] Chain cancel rejected outside cancelWindow
  - [ ] onHitOnly chain rejected without hit confirm
- **Constitution check**: Game Feel First
- **Implementation notes**: Key insight — chain cancel bypasses exit/enter lifecycle by resetting frameInState in-place. This avoids attack.exit() clearing currentMove.

---

### [T03] GameEvent emission + combo tracking in FightEngine
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: T01
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/FightEngine.ts`
- **Changes**:
  1. Add `events: GameEvent[]` to `FightEngine` interface
  2. Clear events at start of `step()`
  3. In `applyHit()`: on successful hit (not blocked) — `attacker.comboCount++`, `attacker.comboDamage += damage`, push `hit` event; on block — push `block` event
  4. Update `matchStats` on each hit: `matchStats.hits[attackerIdx]++`, `matchStats.damage[attackerIdx] += damage`, update `maxCombo`
  5. In phase transitions: push `round_start`, `ko`, `match_end` events
  6. In `stepFight()` after FSM ticks: decrement specialCooldown for both fighters
  7. In `stepFight()` after hit detection: per-frame combo reset — for each fighter, if opponent is NOT in hitstun/blockstun AND `fighter.comboCount > 0`, reset `fighter.comboCount = 0; fighter.comboDamage = 0`. This correctly handles idle → attack → hit → idle → attack → hit as continuous combo while opponent stays in stun.
  8. `createInitialFighterState()`: add new fields with defaults (0/false)
  9. `createInitialGameState()`: add `matchStats` with zeros
  10. `resetFightersForRound()`: preserve matchStats across rounds
- **Acceptance criteria**:
  - [ ] `engine.events` populated after each step
  - [ ] Events cleared at start of each step
  - [ ] comboCount increments on hit, resets in attack.exit (from T02)
  - [ ] matchStats tracks cumulative hits/damage/maxCombo
  - [ ] specialCooldown decrements each frame
  - [ ] `npm run build` succeeds
- **Tests required**:
  - [ ] Hit generates 'hit' event with correct position/damage
  - [ ] Block generates 'block' event
  - [ ] KO generates 'ko' event
  - [ ] matchStats accumulates correctly
  - [ ] specialCooldown decrements to 0, not below
  - [ ] comboCount resets when opponent exits hitstun (not when attacker exits attack)
  - [ ] comboCount persists across separate attacks if opponent stays in hitstun
- **Constitution check**: Fixed Timestep Simulation
- **Implementation notes**: Event position (x,y) = midpoint between attacker and defender. In online mode, client must use server events ONLY (not local engine events) to avoid double SFX playback.

---

### [T04] Crouch attack in FSM
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: T02
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/FighterFSM.ts`
- **Changes**:
  1. In `crouch.update()` (line 118-124), after DOWN hold check: add attack input check
     - P+K → `special`, PUNCH → `crouchPunch`, KICK → `crouchKick` (if move exists in config)
     - Set `f.isCrouching = true`, `f.currentMove = moveKey`, transition to `grounded/attack`
  2. In `attack.update()` completion: if `f.isCrouching` → transition to `grounded/crouch` (not idle)
- **Acceptance criteria**:
  - [ ] Down+Punch triggers crouchPunch if move exists
  - [ ] Down+Kick triggers crouchKick if move exists
  - [ ] After crouch attack completes, returns to crouch (not idle)
  - [ ] isCrouching cleared in attack.exit()
  - [ ] `npm run build` succeeds
- **Tests required**:
  - [ ] Crouch + punch → crouchAttack → returns to crouch
  - [ ] No attack if crouchPunch not in config
  - [ ] isCrouching flag set/cleared correctly
- **Constitution check**: Game Feel First
- **Implementation notes**: Reuses `grounded/attack` state — no new handler needed. The `isCrouching` flag on FighterState controls return destination on completion.

---

### [T05] Jump attack in FSM + landing cleanup
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: T02
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/FighterFSM.ts`
  - `src/shared/PhysicsSystem.ts`
- **Changes**:
  1. New `airborneAttack` StateHandler:
     - `enter()`: keep velocity (don't zero velX)
     - `update()`: air control (0.8x walkSpeed), if `frameInState >= totalMoveFrames` → transition `airborne/fall`
     - `exit()`: clear `currentMove`, `hitConfirmed`
  2. Register `'airborne/attack': airborneAttack` in stateMap
  3. In `jump.update()` and `fall.update()` — add attack check before existing logic:
     - PUNCH → `jumpPunch`, KICK → `jumpKick` (if move exists) → transition `airborne/attack`
  4. In `PhysicsSystem.ts` `clampToStage()` (line 30-34): add cleanup on landing:
     ```typescript
     f.currentMove = null;
     f.hitConfirmed = false;
     ```
  5. Add `'airborne/attack': 'attack'` to Fighter.ts STATE_TO_ANIM map
- **Acceptance criteria**:
  - [ ] Punch while airborne → airborne/attack with jumpPunch
  - [ ] Attack completes in air → falls
  - [ ] Landing during attack cancels it, returns to idle
  - [ ] currentMove/hitConfirmed cleared on landing
  - [ ] Air control preserved during attack
  - [ ] `npm run build` succeeds
- **Tests required**:
  - [ ] Jump + punch → airborneAttack → fall on completion
  - [ ] Landing cancels airborne attack
  - [ ] No jump attack if jumpPunch not in config
  - [ ] clampToStage clears move state on landing
- **Constitution check**: Game Feel First, Fixed Timestep Simulation
- **Implementation notes**: `clampToStage()` sets state directly (bypasses FSM transition), so `attack.exit()` never runs for airborne attacks that land. Must manually clear move state in the landing code path.

---

### [T06] Hitstun scaling (damage proration)
- **Phase**: 3.1 Combo Foundation
- **Type**: feature
- **Depends on**: T02, T03
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/FightEngine.ts`
- **Changes**:
  In `applyHit()` for non-blocked hits:
  ```typescript
  const proration = 1.0 - (attacker.comboCount * 0.15);
  const clampedProration = Math.max(proration, 0.4);
  const scaledDamage = Math.round(hit.damage * clampedProration);
  const scaledHitstun = Math.round(hit.hitStunFrames * Math.max(proration, 0.5));
  ```
  First hit = 100%, second = 85%, third = 70%. Min damage 40%, min hitstun 50%.
- **Acceptance criteria**:
  - [ ] First hit deals full damage
  - [ ] Second hit deals 85% damage
  - [ ] Third hit deals 70% damage
  - [ ] Proration never goes below 40%
  - [ ] Hitstun also scales (min 50%)
  - [ ] Block damage unaffected by proration
- **Tests required**:
  - [ ] 3-hit combo damage sequence verification
  - [ ] Proration floor at 40%
  - [ ] Hitstun floor at 50%
- **Constitution check**: Game Feel First (prevents infinite combos)

---

### [T07] Update gen-characters.mjs with new moves + chainRoutes
- **Phase**: 3.1 Combo Foundation
- **Type**: data
- **Depends on**: T01
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `scripts/gen-characters.mjs`
- **Changes**:
  Add to CATEGORY_PRESETS:
  - `special` move: high damage, 6-8f startup, large knockback, unique name per char
  - `crouchPunch`: low damage, fast, low hitbox (y offset near feet)
  - `crouchKick`: medium damage, low hitbox, longer range
  - `jumpPunch`: air-to-air, fast
  - `jumpKick`: air-to-ground, downward knockback
  - `chainRoutes` per category:
    - Short: P→K, P→P, K→P (3 routes, wide windows)
    - Standard: P→K, P→P (2 routes)
    - Big: P→K, K→P (2 routes)
    - Tall: P→K, P→P (2 routes)
  - `specialCooldownFrames`: 300 big, 240 standard/tall, 180 short
  - Per-character special move names (humorous)
- **Acceptance criteria**:
  - [ ] Generator adds 5 new moves (special, crouchPunch, crouchKick, jumpPunch, jumpKick)
  - [ ] chainRoutes vary by category
  - [ ] Cancel windows derived from move frame data
  - [ ] specialCooldownFrames per category
  - [ ] Generator runs: `node scripts/gen-characters.mjs`
- **Tests required**: None (validated by T10 and CharacterConfig tests)
- **Constitution check**: Data-Driven Everything, Humor-Driven Design
- **Implementation notes**: cancelWindow = [startup + active, startup + active + recovery - 2]. Special move names should be funny inside jokes.

---

### [T08] Regenerate 17 character JSON configs
- **Phase**: 3.1 Combo Foundation
- **Type**: data
- **Depends on**: T07
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `public/data/characters/*.json` (17 files)
- **Changes**:
  Run `node scripts/gen-characters.mjs` to regenerate all 17 configs with new fields.
  Also update `default.json` manually with same new fields.
- **Acceptance criteria**:
  - [ ] All 17 configs have chainRoutes, special, crouchPunch, crouchKick, jumpPunch, jumpKick
  - [ ] All configs have specialCooldownFrames
  - [ ] default.json updated with new fields
  - [ ] `npm run build` succeeds
- **Tests required**:
  - [ ] Update CharacterConfig validation tests to check new fields
- **Constitution check**: Data-Driven Everything

---

### [T09] FighterFSM comprehensive tests
- **Phase**: 3.1 Combo Foundation
- **Type**: test
- **Depends on**: T04, T05, T06
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/__tests__/FighterFSM.test.ts`
- **Changes**:
  Add test suite covering all new FSM behavior:
  - Chain cancel: P→K during recovery, P→P (jab-jab), rejected outside window
  - Special move: P+K triggers special, blocked during cooldown, cooldown decrements
  - Crouch attack: down+punch → crouchAttack → returns to crouch
  - Jump attack: airborne+kick → airborneAttack → fall, landing cancels
  - onHitOnly chain: requires hitConfirmed
- **Acceptance criteria**:
  - [ ] All new FSM states have tests
  - [ ] Edge cases covered (no move in config, cooldown boundary)
  - [ ] `npm test` passes
- **Tests required**: This IS the test task
- **Constitution check**: Incremental Delivery
- **Implementation notes**: Update `cfgWithMoves` to include chainRoutes, special, crouchPunch, jumpKick etc.

---

### [T10] FightEngine comprehensive tests
- **Phase**: 3.1 Combo Foundation
- **Type**: test
- **Depends on**: T09
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `src/shared/__tests__/FightEngine.test.ts`
- **Changes**:
  Add test suite for:
  - GameEvent emission: hit/block/KO/round_start events generated
  - Combo tracking: comboCount increments, comboDamage accumulates
  - Hitstun scaling: damage proration on 2nd/3rd hit
  - matchStats: hits/damage/maxCombo track correctly across rounds
  - specialCooldown: decrements each frame, stops at 0
- **Acceptance criteria**:
  - [ ] Event generation verified for all event types
  - [ ] Combo math verified
  - [ ] Proration math verified
  - [ ] matchStats persistence across rounds
  - [ ] `npm test` passes
- **Tests required**: This IS the test task
- **Constitution check**: Fixed Timestep Simulation

---

### [T11] Source CC0 SFX assets
- **Phase**: 3.2 Audio
- **Type**: data
- **Depends on**: none
- **Priority**: 🟡 Important
- **Files to create**:
  - `public/assets/audio/sfx/hit_light.ogg`
  - `public/assets/audio/sfx/hit_medium.ogg`
  - `public/assets/audio/sfx/hit_heavy.ogg`
  - `public/assets/audio/sfx/block.ogg`
  - `public/assets/audio/sfx/ko.ogg`
  - `public/assets/audio/sfx/special.ogg`
  - `public/assets/audio/sfx/ui_select.ogg`
  - `public/assets/audio/sfx/fight.ogg`
- **Acceptance criteria**:
  - [ ] All 8 SFX files present in OGG format
  - [ ] CC0 / public domain license
  - [ ] Files < 100KB each
  - [ ] Audio quality suitable for game
- **Tests required**: None (manual listening)
- **Constitution check**: Game Feel First
- **Implementation notes**: Sources: Kenney.nl Impact Sounds pack, freesound.org CC0 tagged. Convert to OGG Vorbis for best browser compatibility.

---

### [T12] Source CC0 music
- **Phase**: 3.2 Audio
- **Type**: data
- **Depends on**: none
- **Priority**: 🟡 Important
- **Files to create**:
  - `public/assets/audio/music/bgm_menu.ogg`
  - `public/assets/audio/music/bgm_fight.ogg`
- **Acceptance criteria**:
  - [ ] 2 music tracks in OGG format
  - [ ] CC0 / royalty-free license
  - [ ] Loops cleanly
  - [ ] DnB/breakbeat style preferred (any suitable action music if DnB not found)
- **Tests required**: None (manual listening)
- **Constitution check**: Game Feel First
- **Implementation notes**: Sources: freesound.org, opengameart.org, incompetech.com. If no suitable CC0 DnB found, use any energetic CC0 track.

---

### [T13] Hit flash + hit-stop zoom on Fighter
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: T03
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/entities/Fighter.ts`
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  **Fighter.ts**: Add `flashHit()` method: `sprite.setTintFill(0xffffff)`, then restore original tint after 3 frames (~50ms). Track flash counter in syncToState — detect hitstun entry.
  **FightScene.ts**: In update(), detect hitStop > 0: `this.cameras.main.setZoom(1.02)`, reset to 1.0 when hitStop === 0.
- **Acceptance criteria**:
  - [ ] White flash on hit for ~50ms
  - [ ] Original tint restored after flash
  - [ ] Camera zooms to 1.02x during hitStop
  - [ ] Camera resets to 1.0 when hitStop ends
- **Tests required**: None (visual effect — manual verification)
- **Constitution check**: Game Feel First

---

### [T14] ComboCounter + CooldownIndicator UI components
- **Phase**: 3.1/3.3 UI
- **Type**: ui
- **Depends on**: T13
- **Priority**: 🟡 Important
- **Files to create**:
  - `src/game/ui/ComboCounter.ts`
  - `src/game/ui/CooldownIndicator.ts`
- **Changes**:
  **ComboCounter**: Shows "X HITS!" with combo damage below. Per-player (P1 left, P2 right). Appears on comboCount >= 2. Scale-in on each increment. Fades out 1s after combo drops.
  **CooldownIndicator**: Small rectangle/arc near health bar. Fill ratio = 1 - (specialCooldown / specialCooldownFrames). Flash when ready (cooldown = 0).
- **Acceptance criteria**:
  - [ ] ComboCounter shows only for 2+ hits
  - [ ] ComboCounter scales on each new hit
  - [ ] ComboCounter fades after combo ends
  - [ ] CooldownIndicator shows fill progress
  - [ ] CooldownIndicator flashes when special ready
  - [ ] Both positioned correctly for each player
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First, Mobile-First

---

### [T15] Wire combo UI + events into FightScene
- **Phase**: 3.1/3.3 Integration
- **Type**: feature
- **Depends on**: T13, T14
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  1. Create 2x ComboCounter, 2x CooldownIndicator in `create()`
  2. In `update()`: feed `fighters[i].comboCount`, `comboDamage`, `specialCooldown` to UI
  3. Process `engine.events` (local) or server events (online) for visual effects
  4. Update `applyServerState()` to copy new FighterState fields: comboCount, comboDamage, specialCooldown, isCrouching
- **Acceptance criteria**:
  - [ ] ComboCounter updates during fights
  - [ ] CooldownIndicator reflects special cooldown
  - [ ] applyServerState copies all new fields
  - [ ] Online mode uses server events only (no double effects)
  - [ ] `npm run build` succeeds
- **Tests required**: None (visual integration — manual)
- **Constitution check**: Keep Netcode Simple

---

### [T16] Screen shake
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: T03
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  Process GameEvents in update():
  - `hit` → `this.cameras.main.shake(100, 0.005)` (light)
  - `ko` → `this.cameras.main.shake(300, 0.02)` (heavy)
  - `special_used` → `this.cameras.main.shake(200, 0.01)` (medium)
- **Acceptance criteria**:
  - [ ] Screen shakes on hits
  - [ ] KO shake is heavier
  - [ ] No shake on blocks
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First

---

### [T17] HitSpark particle effect
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: T03
- **Priority**: 🟢 Flexible
- **Files to create**:
  - `src/game/ui/HitSpark.ts`
- **Files to modify**:
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  **HitSpark.ts**: Phaser particle emitter wrapper. `emit(x, y)` spawns 8-12 orange/yellow particles, speed 50-150, lifespan 200ms, one-shot.
  **FightScene.ts**: Create HitSpark in `create()`. On `hit` event: `hitSpark.emit(event.x, event.y)`.
- **Acceptance criteria**:
  - [ ] Particles spawn at hit position
  - [ ] Particles fade in 200ms
  - [ ] No continuous emission (one-shot only)
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First

---

### [T18] SoundManager + wire SFX events
- **Phase**: 3.2 Audio
- **Type**: feature
- **Depends on**: T03, T11
- **Priority**: 🟡 Important
- **Files to create**:
  - `src/game/systems/SoundManager.ts`
- **Changes**:
  ```typescript
  export class SoundManager {
      constructor(scene: Phaser.Scene)
      play(key: string, volume?: number): void
      playMusic(key: string, loop?: boolean): void
      stopMusic(): void
      setMute(muted: boolean): void   // persists to localStorage
      toggleMute(): boolean
      get isMuted(): boolean
  }
  ```
  Wraps Phaser `scene.sound`. Reads/writes `localStorage('koreshki_muted')`.
- **Acceptance criteria**:
  - [ ] play() plays one-shot SFX
  - [ ] playMusic() plays looping BGM
  - [ ] Mute state persists across sessions via localStorage
  - [ ] toggleMute returns new state
- **Tests required**: None (audio — manual)
- **Constitution check**: Mobile-First (WebAudio autoplay policy)
- **Implementation notes**: Phaser handles WebAudio unlock on user interaction. Don't try to play before first touch on mobile.

---

### [T19] Load audio in Preloader + music + announcer
- **Phase**: 3.2 Audio
- **Type**: feature
- **Depends on**: T11, T12, T18
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/Preloader.ts`
  - `src/game/scenes/MainMenu.ts`
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  **Preloader.ts**: Load all audio assets. Reset `this.load.setPath('')` before loading (lesson from setPath incident).
  **MainMenu.ts**: Create SoundManager, `playMusic('bgm_menu')`. Pass SoundManager via scene data.
  **FightScene.ts**: `playMusic('bgm_fight')` in create(). Process events → `soundManager.play()`.
  **Announcer integration**: In FightScene event processing, play `fight.ogg` on `round_start` event and `ko.ogg` on `ko` event. These are the announcer sounds — no separate task needed.
- **Acceptance criteria**:
  - [ ] All SFX and music loaded in Preloader
  - [ ] Menu music plays in MainMenu
  - [ ] Fight music plays in FightScene
  - [ ] Music stops on scene transitions
  - [ ] setPath reset before audio loads (avoid path prefix bug)
  - [ ] "FIGHT!" sound plays on round start
  - [ ] "K.O.!" sound plays on KO
- **Tests required**: None (audio integration — manual)
- **Constitution check**: Incremental Delivery

---

### [T20] UI sounds (menus + char select)
- **Phase**: 3.2 Audio
- **Type**: ui
- **Depends on**: T19
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/scenes/MainMenu.ts`
  - `src/game/scenes/CharacterSelect.ts`
- **Changes**:
  Add `soundManager.play('ui_select')` on:
  - MainMenu button clicks (LOCAL, ONLINE, CREATE, JOIN)
  - CharacterSelect cell selection
  - CharacterSelect CONFIRM button
- **Acceptance criteria**:
  - [ ] Click sounds on all interactive elements
  - [ ] Sounds respect mute state
- **Tests required**: None (audio — manual)
- **Constitution check**: Game Feel First

---

### [T21] Mute button (persistent)
- **Phase**: 3.2 Audio
- **Type**: ui
- **Depends on**: T19
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/MainMenu.ts` (or global)
- **Changes**:
  Speaker icon button, top-right corner. On click: `soundManager.toggleMute()`. Visual: speaker icon when unmuted, crossed-out speaker when muted. State persists via localStorage. Consider: add to each scene or use a Phaser global plugin.
- **Acceptance criteria**:
  - [ ] Mute button visible in MainMenu (at minimum)
  - [ ] Toggle mutes/unmutes all audio
  - [ ] Visual feedback (icon change)
  - [ ] Persisted across page reloads
- **Tests required**: None (UI — manual)
- **Constitution check**: Mobile-First

---

### [T22] HealthBar improvements
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: T03
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/ui/HealthBar.ts`
- **Changes**:
  1. Damage flash: red background bar that trails HP bar. HP bar lerps at 0.08 (current), damage bar lerps at 0.02 (slower trail).
  2. Player name label above bar (from config.nickname). Add nickname to constructor or update method.
- **Acceptance criteria**:
  - [ ] Red damage trail visible after taking damage
  - [ ] Trail catches up over ~1-2 seconds
  - [ ] Player nickname displayed above bar
  - [ ] Works for both P1 (left) and P2 (right)
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First

---

### [T22b] RoundDisplay improvements
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: none
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/ui/RoundDisplay.ts`
- **Changes**:
  1. Timer text color pulses red when `roundTimer < 10` (tween alpha or color between white and red)
  2. Add text shadow/outline for better readability over all backgrounds
  3. Phase announcements ("FIGHT!", "K.O.!") — add outline text styling for visibility
- **Acceptance criteria**:
  - [ ] Timer visually pulses red when < 10 seconds
  - [ ] Text readable over bright/dark backgrounds
  - [ ] Announcements have outline styling
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First

---

### [T23] Victory screen layout overhaul
- **Phase**: 3.4 Victory Screen
- **Type**: ui
- **Depends on**: T22
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/scenes/GameOver.ts`
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  **GameOver.ts**: Extend scene data to accept matchStats + configs. Show winner character sprite (large, animated idle). Stats table: Hits / Damage / Max Combo for both players. Keep existing REMATCH/MENU buttons.
  **FightScene.ts**: Pass matchStats and configs to GameOver scene data.
- **Acceptance criteria**:
  - [ ] Winner sprite displayed with idle animation
  - [ ] Match stats table visible
  - [ ] Stats show both players' data
  - [ ] REMATCH/MENU still functional
- **Tests required**: None (UI — manual)
- **Constitution check**: Humor-Driven Design
- **Implementation notes**: GameOverData interface extended with p1Config, p2Config, matchStats. Reuse Fighter's animation creation pattern for winner sprite.

---

### [T24] Victory confetti particles
- **Phase**: 3.4 Victory Screen
- **Type**: ui
- **Depends on**: T23
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `src/game/scenes/GameOver.ts`
- **Changes**:
  Phaser particle emitter: colored particles falling from top of screen. Winner's tint color as base, with random variations. Continuous emission for scene duration.
- **Acceptance criteria**:
  - [ ] Confetti particles fall from top
  - [ ] Colors match winner tint
  - [ ] Continuous during scene
  - [ ] Doesn't impact performance
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First

---

### [T25] KO slow-motion + visual effects
- **Phase**: 3.3 Visual Effects
- **Type**: ui
- **Depends on**: T03
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  On `ko` GameEvent:
  1. **Local mode only**: set `this.time.timeScale = 0.3` for ~1 second real time, then restore to 1.0
  2. **Online mode**: skip slow-mo entirely (`if (this.mode === 'online') return`) — server runs at full speed, slowing client accumulator would cause desync with server state updates
  Note: in local mode, this slows Phaser's timer → engine accumulator gets less delta → fewer engine steps. This is the desired dramatic effect.
- **Acceptance criteria**:
  - [ ] Game visually slows on KO hit (local mode)
  - [ ] Normal speed resumes after ~1s
  - [ ] Doesn't break round transition logic
  - [ ] **Online mode: no slow-mo applied** (prevents desync)
- **Tests required**: None (visual — manual)
- **Constitution check**: Game Feel First, Keep Netcode Simple
- **Implementation notes**: KO phase is 120 frames (2s at normal speed). Slow-mo during first ~60 real frames won't conflict. Online guard is critical — server doesn't slow down.

---

### [T26] Fix mobile room code input
- **Phase**: 3.5 Lobby
- **Type**: feature
- **Depends on**: none
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/MainMenu.ts`
- **Changes**:
  Replace Phaser keyboard-based room code entry with HTML `<input>` overlay:
  1. Create `<input type="text" maxlength="4" pattern="[A-Za-z]{4}">` element
  2. Position via CSS over the Phaser canvas where room code input appears
  3. Style: dark bg, white monospace text, matching game aesthetic
  4. On submit (Enter or 4 chars): read value → `joinRoom(value.toUpperCase())` → remove input
  5. On cancel: remove input, return to previous view
- **Acceptance criteria**:
  - [ ] Mobile keyboard opens on input focus
  - [ ] Input styled to match game aesthetic
  - [ ] 4-char input auto-submits
  - [ ] Works on iOS Safari and Android Chrome
  - [ ] Desktop keyboard still works
- **Tests required**: None (manual mobile test)
- **Constitution check**: Mobile-First
- **Implementation notes**: This resolves the follow-up item from Phase 1. Use `pointer-events: auto` on input, `pointer-events: none` on parent overlay.

---

### [T27] URL-based room join
- **Phase**: 3.5 Lobby
- **Type**: feature
- **Depends on**: none
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/MainMenu.ts`
- **Changes**:
  In `create()`, before showing main view:
  ```typescript
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('room');
  if (joinCode && /^[A-Z]{4}$/i.test(joinCode)) {
      history.replaceState(null, '', window.location.pathname);
      this.connectAndJoin(joinCode.toUpperCase());
  }
  ```
- **Acceptance criteria**:
  - [ ] `?room=ABCD` auto-connects and joins room
  - [ ] URL param cleared after joining
  - [ ] Invalid/missing code shows normal main menu
  - [ ] Case-insensitive
- **Tests required**: None (E2E — manual)
- **Constitution check**: Mobile-First

---

### [T28] Copy invite link button
- **Phase**: 3.5 Lobby
- **Type**: ui
- **Depends on**: T27
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/scenes/MainMenu.ts`
- **Changes**:
  In room creation waiting view (after room code display): add "КОПИРОВАТЬ ССЫЛКУ" button.
  On click: `navigator.clipboard.writeText(url)`. Show "Скопировано!" feedback for 2s.
  URL format: `${window.location.origin}${window.location.pathname}?room=${code}`
- **Acceptance criteria**:
  - [ ] Button visible in room waiting view
  - [ ] Click copies correct URL to clipboard
  - [ ] "Скопировано!" feedback shown
  - [ ] Works on mobile (Clipboard API)
- **Tests required**: None (UI — manual)
- **Constitution check**: Mobile-First

---

### [T29] Server /join redirect route
- **Phase**: 3.5 Lobby
- **Type**: feature
- **Depends on**: none
- **Priority**: 🟢 Flexible
- **Files to modify**:
  - `server/main.ts`
- **Changes**:
  Add HTTP route before WebSocket upgrade:
  ```typescript
  if (url.pathname === '/join' && url.searchParams.has('code')) {
      const code = url.searchParams.get('code');
      const clientUrl = Deno.env.get('CLIENT_URL') ?? 'http://localhost:5173';
      return new Response(null, {
          status: 302,
          headers: { Location: `${clientUrl}?room=${code}` },
      });
  }
  ```
  Add `CLIENT_URL` to env docs.
- **Acceptance criteria**:
  - [ ] GET /join?code=ABCD → 302 redirect to client URL
  - [ ] Missing code → 400
  - [ ] CLIENT_URL from env with fallback
- **Tests required**:
  - [ ] Server test: /join redirect
- **Constitution check**: Keep Netcode Simple
- **Implementation notes**: Update `docs/deploy.md` with CLIENT_URL env var.

---

### [T30] Auto-reconnect: protocol types + server grace timer
- **Phase**: 3.5 Lobby
- **Type**: feature
- **Depends on**: none
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/shared/types.ts`
  - `server/RoomManager.ts`
  - `server/main.ts`
- **Changes**:
  **types.ts**: Add new messages:
  - ClientMsg: `{ type: 'rejoin_room'; code: string; playerIndex: 0 | 1 }`
  - ServerMsg: `{ type: 'rejoin_success'; state: GameState; frame: number }`, `{ type: 'opponent_reconnected' }`, `{ type: 'opponent_disconnecting'; graceSeconds: number }`

  **RoomManager.ts**:
  - Add `disconnectTimers: [number | null, number | null]` to Room interface
  - `handleDisconnect()`: start 15s grace timer instead of immediate cleanup. Send `opponent_disconnecting` to opponent. After 15s: send `opponent_disconnected`, cleanup.
  - New `rejoinRoom(ws, code, playerIndex)`: validate room+slot, re-seat player, clear timer, send `rejoin_success` with current state, send `opponent_reconnected` to opponent.

  **main.ts**: Add `rejoin_room` to VALID_TYPES and switch handler.
- **Acceptance criteria**:
  - [ ] Disconnect starts 15s grace timer (not immediate cleanup)
  - [ ] Opponent receives `opponent_disconnecting` with countdown
  - [ ] Rejoin within grace period: player re-seated, timer cleared
  - [ ] Rejoin sends current game state to reconnecting player
  - [ ] After grace period: normal disconnect flow
  - [ ] `deno test` passes
- **Tests required**:
  - [ ] Grace timer starts on disconnect
  - [ ] rejoinRoom re-seats player
  - [ ] Timer expiry triggers normal disconnect
  - [ ] Invalid rejoin (wrong code/index) rejected
- **Constitution check**: Keep Netcode Simple
- **Implementation notes**: Game loop (setInterval in GameRoom.ts) continues running during disconnect. Disconnected player's input stays at 0 (fighter just idles).

---

### [T31] Auto-reconnect: client (NetworkClient)
- **Phase**: 3.5 Lobby
- **Type**: feature
- **Depends on**: T30
- **Priority**: 🟡 Important
- **Files to modify**:
  - `src/game/net/NetworkClient.ts`
  - `src/game/scenes/FightScene.ts`
- **Changes**:
  **NetworkClient.ts**:
  - On WebSocket `close`, if was InRoom/InFight: save `{ roomCode, playerIndex }` to sessionStorage
  - Reconnect loop: delays [1000, 2000, 4000, 8000, 8000], max 5 attempts
  - Each attempt: new WebSocket → on open → send `rejoin_room`
  - Handle `rejoin_success`: restore state, fire callback
  - New callbacks: `onReconnecting?(attempt, max)`, `onReconnected?()`, `onReconnectFailed?()`, `onOpponentReconnected?()`, `onOpponentDisconnecting?(graceSeconds)`
  - Handle `opponent_reconnected` and `opponent_disconnecting` messages

  **FightScene.ts**:
  - Wire new callbacks in `setupNetworkCallbacks()`
  - `onOpponentDisconnecting`: show semi-transparent overlay with countdown
  - `onOpponentReconnected`: hide overlay
  - `onReconnecting`: show "Переподключение..." overlay with attempt counter
  - `onReconnected`: hide overlay, resume
  - `onReconnectFailed`: navigate to MainMenu
- **Acceptance criteria**:
  - [ ] Automatic reconnect attempt on WebSocket close
  - [ ] Exponential backoff delays
  - [ ] Max 5 attempts
  - [ ] Reconnect overlay visible during attempts
  - [ ] Opponent sees disconnect/reconnect overlays
  - [ ] Successful reconnect resumes game
  - [ ] Failed reconnect returns to MainMenu
- **Tests required**: None (E2E — manual two-browser test)
- **Constitution check**: Keep Netcode Simple
- **Implementation notes**: sessionStorage clears on tab close (intentional — no stale reconnect data).

---

### [T32] Update server for Phase 3 (configs + events + reconnect)
- **Phase**: 3.6 Integration
- **Type**: feature
- **Depends on**: T01, T03, T08, T30
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `server/GameRoom.ts`
  - `server/charConfigs.ts`
  - `server/__tests__/GameRoom.test.ts`
  - `server/__tests__/RoomManager.test.ts`
- **Changes**:
  **GameRoom.ts**: Include `engine.events` in state broadcast:
  ```typescript
  const msg = { type: "state_update", state: engine.state, frame: grState.frameCount, events: engine.events };
  ```
  **charConfigs.ts**: Ensure new optional fields pass through (no changes needed if config loading is generic).
  **Tests**: Update server test configs with new required FighterState fields.
- **Acceptance criteria**:
  - [ ] state_update includes events array
  - [ ] Server loads configs with new optional fields without errors
  - [ ] Server tests pass with updated config shapes
  - [ ] `deno test` passes
- **Tests required**:
  - [ ] state_update message includes events
  - [ ] Existing server tests updated and passing
- **Constitution check**: Keep Netcode Simple

---

### [T33] Integration testing (local + online)
- **Phase**: 3.6 Integration
- **Type**: test
- **Depends on**: T32
- **Priority**: 🔴 Critical path
- **Changes**:
  Manual test checklist:
  1. Local: select 2 chars → fight → chain combo P→K → combo counter "2 HITS!" → hear SFX → see flash + shake → special P+K with cooldown indicator → KO slow-mo → victory with stats
  2. Online: create room → copy link → join via link → fight → combo/special/effects all work → game over
  3. Build: `npm run build` produces working production build
  4. All unit tests: `npm test` passes
  5. Server tests: `deno test` passes
- **Acceptance criteria**:
  - [ ] Full local loop works end-to-end
  - [ ] Full online loop works end-to-end
  - [ ] `npm run build` succeeds
  - [ ] `npm test` passes
  - [ ] `deno test` passes
- **Tests required**: Run all existing test suites
- **Constitution check**: Incremental Delivery

---

### [T34] Mobile testing
- **Phase**: 3.6 Integration
- **Type**: test
- **Depends on**: T33
- **Priority**: 🔴 Critical path
- **Changes**:
  Test on actual phones (or responsive mode):
  1. Touch P+K → triggers special move
  2. Audio plays after first touch (autoplay policy)
  3. Mute button works
  4. Invite link flow: share link → open on 2nd phone → auto-join room
  5. Mobile room code input with HTML overlay
  6. Reconnect: switch to another app → return → auto-reconnect
  7. Combo counter visible on small screen
  8. Cooldown indicator visible
- **Acceptance criteria**:
  - [ ] All mobile features functional
  - [ ] Audio respects autoplay policy
  - [ ] Touch controls responsive
- **Tests required**: Manual device testing
- **Constitution check**: Mobile-First

---

### [T35] Deploy + update docs
- **Phase**: 3.6 Integration
- **Type**: deploy
- **Depends on**: T34
- **Priority**: 🔴 Critical path
- **Files to modify**:
  - `docs/deploy.md` (add CLIENT_URL env var)
  - `docs/testing-checklist.md` (add Phase 3 scenarios)
- **Changes**:
  1. Deploy client: push to main → GitHub Actions → GitHub Pages
  2. Deploy server: `deployctl` or GitHub integration → Deno Deploy
  3. Set `CLIENT_URL` env var on server
  4. Update deploy docs with new env var
  5. Update testing checklist with Phase 3 scenarios
- **Acceptance criteria**:
  - [ ] Client deployed and accessible
  - [ ] Server deployed with Phase 3 configs
  - [ ] Invite links work cross-device
  - [ ] Audio works on deployed build
  - [ ] Docs updated
- **Tests required**: Smoke test on deployed build
- **Constitution check**: Incremental Delivery, Co-located Documentation

---

## Progress Tracker

### Wave 0
- [x] T01: Extend types for combo system + GameEvent
- [x] T11: Source CC0 SFX assets
- [x] T12: Source CC0 music
- [x] T26: Fix mobile room code input
- [x] T27: URL-based room join
- [x] T29: Server /join redirect route
- [x] T30: Auto-reconnect server grace timer

### Wave 1
- [x] T02: Chain cancel + special move in FSM
- [x] T03: GameEvent emission + combo tracking in FightEngine
- [x] T07: Update gen-characters.mjs with new moves
- [x] T08: Regenerate 17 character JSON configs

### Wave 2
- [x] T04: Crouch attack in FSM
- [x] T05: Jump attack in FSM + landing fix
- [x] T06: Hitstun scaling

### Wave 3
- [x] T09: FighterFSM comprehensive tests
- [x] T13: Hit flash + hit-stop zoom
- [x] T16: Screen shake
- [x] T17: HitSpark particle effect
- [x] T22: HealthBar improvements
- [x] T22b: RoundDisplay improvements

### Wave 4
- [x] T10: FightEngine comprehensive tests
- [x] T14: ComboCounter + CooldownIndicator UI
- [x] T15: Wire combo UI + events into FightScene
- [x] T18: SoundManager + wire SFX events
- [x] T25: KO slow-motion

### Wave 5
- [x] T19: Load audio in Preloader + music + announcer
- [x] T20: UI sounds
- [x] T21: Mute button
- [x] T23: Victory screen layout overhaul
- [x] T28: Copy invite link button
- [x] T31: Auto-reconnect client

### Wave 6
- [x] T32: Update server for Phase 3
- [x] T24: Victory confetti

### Wave 7
- [x] T33: Integration testing
- [x] T34: Mobile testing
- [x] T35: Deploy + update docs

---

## First Task Brief — [T01]

**Goal**: Extend `types.ts` with all new interfaces and fields needed for Phase 3 combo system, game events, and match stats.

**Files to modify**:
1. `src/shared/types.ts`
2. `src/shared/__tests__/FighterFSM.test.ts` — update `makeFighter()` helper
3. `src/shared/__tests__/FightEngine.test.ts` — update `testConfig` and helpers
4. `src/shared/__tests__/CollisionSystem.test.ts` — update test configs if needed
5. `src/shared/FightEngine.ts` — update `createInitialFighterState()` and `createInitialGameState()`

**Exact changes to `src/shared/types.ts`**:

After line 69 (after `MoveDef` interface), add:
```typescript
export interface ChainRoute {
    from: string;
    to: string;
    cancelWindow: [number, number];
    onHitOnly: boolean;
}
```

After line 89 (after `portraitFrame`, before `maxHp`), NO — add to `CharacterConfig` after `maxHp: number;`:
```typescript
chainRoutes?: ChainRoute[];
specialCooldownFrames?: number;
```

After line 109 (after `roundWins: number;`), add to `FighterState`:
```typescript
comboCount: number;
comboDamage: number;
specialCooldown: number;
isCrouching: boolean;
```

After line 120 (after `hitStop: number;`), add to `GameState`:
```typescript
matchStats: {
    hits: [number, number];
    damage: [number, number];
    maxCombo: [number, number];
};
```

Add `GameEvent` type (after `GameState`):
```typescript
export type GameEvent =
    | { type: 'hit'; attackerIdx: number; defenderIdx: number; moveKey: string; damage: number; x: number; y: number }
    | { type: 'block'; x: number; y: number }
    | { type: 'ko'; loserIdx: number }
    | { type: 'round_start'; round: number }
    | { type: 'match_end'; winnerIdx: number }
    | { type: 'special_used'; playerIdx: number };
```

Update `state_update` in `ServerMsg` (line 145):
```typescript
| { type: 'state_update'; state: GameState; frame: number; events?: GameEvent[] }
```

**Update `src/shared/FightEngine.ts`**:

In `createInitialFighterState()` return object (line 25-40), add:
```typescript
comboCount: 0,
comboDamage: 0,
specialCooldown: 0,
isCrouching: false,
```

In `createInitialGameState()` return object (line 48-59), add:
```typescript
matchStats: {
    hits: [0, 0],
    damage: [0, 0],
    maxCombo: [0, 0],
},
```

In `resetFightersForRound()` (line 151-164), preserve matchStats:
```typescript
const matchStats = { ...state.matchStats }; // add after wins line
// ... after fighter reset ...
// DON'T reset matchStats — it persists across rounds (remove if re-created by createInitialGameState)
```
Actually simpler: just reassign matchStats after `state.fighters` are reset since `createInitialFighterState` doesn't touch GameState.matchStats. Just ensure resetFightersForRound doesn't recreate the GameState.

**Update test helpers**:

In `src/shared/__tests__/FighterFSM.test.ts` `makeFighter()` (line 6-16), add to defaults:
```typescript
comboCount: 0, comboDamage: 0, specialCooldown: 0, isCrouching: false,
```

In `src/shared/__tests__/FightEngine.test.ts` `testConfig` — no changes needed (new CharacterConfig fields are optional).

**Note**: do NOT add comboCount reset to `attack.exit()` — combo reset happens per-frame in `stepFight()` (T03), not on state transition.

**Verification**:
```bash
npm run build    # TypeScript compiles
npm test         # all tests pass
```
