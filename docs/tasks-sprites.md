# Sprite Generation Tasks: Procedural Chibi Spritesheets

Based on: [docs/plan-sprites.md](docs/plan-sprites.md)

---

## Dependencies Map

```
[T01] ← none
[T02] ← T01
[T03] ← T01, T02
[T04] ← T03
[T05] ← T03
[T06] ← T04, T05
[T07] ← T06
[T08] ← T06
[T09] ← T07, T08
[T10] ← T09
[T11] ← T09
[T12] ← T10
[T13] ← T12
[T14] ← T11, T13
[T15] ← T14
[T16] ← T14
```

## Execution Waves

```
── Wave 0 (no dependencies) ──────────────
   T01: Extract shared PNG encoder

── Wave 1 (after T01) ────────────────────
   T02: Drawing primitives library

── Wave 2 (after T01, T02) ───────────────
   T03: Skeleton system + keyframes + scaling

── Wave 3 (after T03) ────────────────────
   T04: Body part renderer (9-layer)
   T05: Preview tool

── Wave 4 (after T04, T05) ───────────────
   T06: Frame grid assembly + first character (petyaj)

── Wave 5 (after T06) ────────────────────
   T07: Hair styles renderer (8 types)
   T08: Accessories renderer + face details

── Wave 6 (after T07, T08) ───────────────
   T09: 17 CHARACTER_VISUALS + generate all spritesheets

── Wave 7 (after T09) ────────────────────
   T10: Portraits + update gen-characters.mjs
   T11: Update Fighter.ts for per-character textures

── Wave 8 (after T10) ────────────────────
   T12: Update Preloader.ts dynamic loading

── Wave 9 (after T12) ────────────────────
   T13: Update CharacterConfig.test.ts

── Wave 10 (after T11, T13) ──────────────
   T14: Redesign CharacterSelect.ts for mobile

── Wave 11 (after T14) ───────────────────
   T15: End-to-end testing + cleanup
   T16: Update CLAUDE.md + documentation
```

## Critical Path

```
🔴 T01 → T02 → T03 → T04 → T06 → T09 → T10 → T12 → T13 → T14 → T15
```

---

## Task List

### [T01] Extract shared PNG encoder to scripts/lib/png.mjs
- **Phase**: 1 — Drawing Foundation
- **Type**: setup
- **Depends on**: none
- **Input**: `scripts/gen-bg.mjs` (lines 63–82), `scripts/gen-logo.mjs` (lines 130–149)
- **Output**:
  - CREATE `scripts/lib/png.mjs`
  - MODIFY `scripts/gen-bg.mjs` — replace inline encoder with import
  - MODIFY `scripts/gen-logo.mjs` — replace inline encoder with import
- **Acceptance criteria**:
  - [ ] `scripts/lib/png.mjs` exports `encodePNG(width, height, rgbaBuffer) → Buffer`
  - [ ] Handles: PNG signature, IHDR (8-bit RGBA), zlib-compressed IDAT with filter-byte-per-row, IEND
  - [ ] `gen-bg.mjs` imports from `./lib/png.mjs`, no inline crc32/chunk
  - [ ] `gen-logo.mjs` imports from `./lib/png.mjs`, no inline crc32/chunk
  - [ ] `node scripts/gen-bg.mjs` produces identical `bg.png`
  - [ ] `node scripts/gen-logo.mjs` produces identical `logo.png`
- **Tests required**:
  - `scripts/lib/__tests__/png.test.mjs`: encode 2×2 RGBA buffer, verify PNG signature `[0x89,0x50,0x4E,0x47]`, valid IHDR
- **Constitution check**: Incremental Delivery, Data-Driven Everything
- **Implementation notes**:
  - Create `scripts/lib/` directory
  - Both scripts use `deflateSync` from `zlib` — shared function should do the same
  - crc32 + chunk pattern identical in both files

---

### [T02] Drawing primitives library scripts/lib/draw.mjs
- **Phase**: 1 — Drawing Foundation
- **Type**: feature
- **Depends on**: T01
- **Input**: `scripts/lib/png.mjs`
- **Output**:
  - CREATE `scripts/lib/draw.mjs`
- **Acceptance criteria**:
  - [ ] `FrameBuffer` class: constructor(w, h), getPixel, setPixel, clear(), toBuffer()
  - [ ] `fillRect(fb, x, y, w, h, color)` — color is `[r,g,b,a]`
  - [ ] `fillCircle(fb, cx, cy, r, color)` — midpoint/scanline
  - [ ] `fillOval(fb, cx, cy, rx, ry, color)` — ellipse fill
  - [ ] `drawLine(fb, x0, y0, x1, y1, thickness, color)` — Bresenham with thickness
  - [ ] `blit(src, dst, dx, dy)` — copy FrameBuffer, skip alpha=0 pixels
  - [ ] All primitives clip to bounds
  - [ ] Integration: `encodePNG(fb.width, fb.height, fb.toBuffer())` produces valid PNG
- **Tests required**:
  - `scripts/lib/__tests__/draw.test.mjs`: setPixel/getPixel round-trip, fillRect region, fillCircle shape, blit offset, bounds clipping
- **Constitution check**: Incremental Delivery
- **Implementation notes**:
  - Internal storage: `Buffer.alloc(w * h * 4)` — same format as encodePNG expects
  - `blit` skips src pixels where alpha === 0

---

### [T03] Skeleton system, animation keyframes, and size scaling
- **Phase**: 2 — Skeleton & Animation Engine
- **Type**: feature
- **Depends on**: T01, T02
- **Input**: Plan spec (12 joints, 7 animations, 4 size categories)
- **Output**:
  - CREATE `scripts/gen-sprites.mjs`
- **Acceptance criteria**:
  - [ ] 12-joint hierarchy: root → hip → torso → head, armL/handL, armR/handR, legL/footL, legR/footR
  - [ ] `Pose = Record<Joint, {x, y}>` — offsets from root (feet anchor)
  - [ ] `interpolatePose(poseA, poseB, t)` with `Math.round()` pixel snap
  - [ ] `generateAnimFrames(keyframes, totalFrames)` → array of Poses
  - [ ] Keyframes for 7 animations: idle(10), run(8), jump(3), fall(3), attack(7), hit(3), dead(11)
  - [ ] Size scaling: standard(1.0), big(1.35w/1.30h), tall(1.05w/1.20h), short(0.95w/0.82h/1.10head)
  - [ ] Total: 10+8+3+3+7+3+11 = 45 frames across 7 rows
- **Tests required**:
  - interpolatePose: t=0→poseA, t=1→poseB, t=0.5→midpoint
  - generateAnimFrames: correct count
  - scalePose: big → values × 1.35/1.30
- **Constitution check**: Data-Driven Everything, Fixed Timestep Simulation
- **Implementation notes**:
  - Animation row mapping: idle=row0, run=row1, jump=row2, fall=row3, attack=row4, hit=row5, dead=row6
  - Dead animation: fall backward + comedic bounce (Humor-Driven Design)

---

### [T04] Body part renderer (9-layer draw order)
- **Phase**: 3 — Renderer & First Character
- **Type**: feature
- **Depends on**: T03
- **Input**: `scripts/gen-sprites.mjs` (skeleton), `scripts/lib/draw.mjs`
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — add `renderFrame(pose, visuals, fb)`
- **Acceptance criteria**:
  - [ ] Renders single 126×126 frame onto FrameBuffer
  - [ ] 9 layers: back arm+sleeve, back leg+pants+shoe, torso, front leg, head(skin), hair(placeholder), face(eyes), accessories(no-op), front arm
  - [ ] Parts positioned by joint coordinates
  - [ ] Limbs = thick lines between joint pairs
  - [ ] Head = fillCircle, torso = fillRect/fillOval
  - [ ] Colors from `visuals` param
  - [ ] Feet anchor at y=82 (matching FEET_ORIGIN_Y)
- **Tests required**:
  - Render with test pose: pixel at head center = skinColor, torso center = torsoColor, y=126 = transparent
- **Constitution check**: Game Feel First, Data-Driven Everything
- **Implementation notes**:
  - Root joint at (63, 82) in the 126×126 frame
  - Limb thickness: arms ~4px, legs ~5px

---

### [T05] Preview tool scripts/preview-sprite.mjs
- **Phase**: 3 — Renderer & First Character
- **Type**: setup
- **Depends on**: T03
- **Input**: `scripts/gen-sprites.mjs`
- **Output**:
  - CREATE `scripts/preview-sprite.mjs`
  - MODIFY `.gitignore` — add `preview-*.png`
- **Acceptance criteria**:
  - [ ] `node scripts/preview-sprite.mjs [charId]` → `preview-{charId}.png` in project root
  - [ ] All 7 animations as rows, each frame at 4× zoom
  - [ ] Default to "petyaj" if no arg
  - [ ] `.gitignore` includes `preview-*.png`
- **Tests required**: None (visual tool, manual verification)
- **Constitution check**: Incremental Delivery
- **Implementation notes**:
  - 4× zoom: each pixel → 4×4 block, or render then blit scaled

---

### [T06] Frame grid assembly + first character (petyaj)
- **Phase**: 3 — Renderer & First Character
- **Type**: feature
- **Depends on**: T04, T05
- **Input**: `scripts/gen-sprites.mjs` (renderer + skeleton)
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — grid assembly + petyaj data
  - CREATE `public/assets/fighters/petyaj.png`
- **Acceptance criteria**:
  - [ ] `assembleSheet(id, visuals)` → 1386×882 PNG (11×7 grid, 126×126 frames)
  - [ ] Row mapping: 0=idle(10), 1=run(8), 2=jump(3), 3=fall(3), 4=attack(7), 5=hit(3), 6=dead(11)
  - [ ] Unused cells = transparent
  - [ ] Feet anchor at y=82 consistent
  - [ ] petyaj defined: tall category, tuned colors
  - [ ] `node scripts/gen-sprites.mjs petyaj` produces valid spritesheet
  - [ ] Drop-in compatible with martial-hero.png grid layout
- **Tests required**:
  - Sheet dimensions = 1386×882
  - Frame [0,0] has non-transparent pixels
  - Frame [2,4] fully transparent (jump has only 3 frames)
- **Constitution check**: Game Feel First, Incremental Delivery, Data-Driven Everything
- **Implementation notes**:
  - 1386 = 11×126, 882 = 7×126
  - petyaj = tall: 1.05x width, 1.20x height

---

### [T07] Hair styles renderer (8 types)
- **Phase**: 4 — All 17 Characters
- **Type**: feature
- **Depends on**: T06
- **Input**: `scripts/gen-sprites.mjs` (renderer with placeholder hair)
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — add `renderHair(fb, headPos, radius, style, color)`
- **Acceptance criteria**:
  - [ ] 8 styles: short, spiky, dreadlocks, buzz, long, mohawk, ponytail, afro
  - [ ] Each draws relative to head center + radius
  - [ ] Hair tracks head joint across all animation frames
- **Tests required**:
  - Each style: at least one pixel above head center = hairColor
  - Afro: pixels at distance > headRadius from center
- **Constitution check**: Humor-Driven Design, Data-Driven Everything
- **Implementation notes**:
  - Shapes = compositions of fillRect, fillCircle, fillOval, drawLine
  - Head radius ~15–20px at chibi scale

---

### [T08] Accessories renderer + face details
- **Phase**: 4 — All 17 Characters
- **Type**: feature
- **Depends on**: T06
- **Input**: `scripts/gen-sprites.mjs` (renderer)
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — add `renderFace()` and `renderAccessories()`
- **Acceptance criteria**:
  - [ ] Face: eyes (dots/ovals), optional beard
  - [ ] Eyes track head joint
  - [ ] Accessories: helmet, headphones, gloves, mask, glasses
  - [ ] Multiple accessories can combine
  - [ ] Correct draw order layers
- **Tests required**:
  - Glasses: pixels at eye-level = glasses color
  - Helmet: pixels above head = helmet color
  - No accessories: no extra pixels beyond base
- **Constitution check**: Humor-Driven Design, Data-Driven Everything
- **Implementation notes**:
  - Helmet = fillOval above head; Headphones = 2 circles + band; Glasses = 2 rectangles at eye level
  - Gloves = override hand color

---

### [T09] Define 17 CHARACTER_VISUALS + generate all spritesheets
- **Phase**: 4 — All 17 Characters
- **Type**: data
- **Depends on**: T07, T08
- **Input**: `scripts/gen-sprites.mjs` (full renderer), `public/data/characters/manifest.json`
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — CHARACTER_VISUALS map
  - CREATE `public/assets/fighters/{id}.png` ×17
- **Acceptance criteria**:
  - [ ] CHARACTER_VISUALS maps all 17 IDs → visual config (category, colors, hair, face, accessories)
  - [ ] Categories match manifest.json
  - [ ] Each character visually distinct
  - [ ] `node scripts/gen-sprites.mjs` generates all 17 PNGs
  - [ ] `node scripts/gen-sprites.mjs {id}` generates single character
  - [ ] All PNGs = 1386×882, valid PNG
- **Tests required**:
  - All 17 IDs present; categories match manifest
  - No two characters have identical (hairStyle + hairColor + torsoColor)
  - Generated PNGs exist with correct dimensions
- **Constitution check**: Humor-Driven Design, Data-Driven Everything, Mobile-First
- **Implementation notes**:
  - Visual assignments based on character descriptions:
    - petyaj: short hair, sporty | denis: glasses, buzz | vlad: helmet, buzz
    - vadim: mohawk, dark, mask | leha: spiky, shorts | ali: buzz, boxing gloves
    - serega-ermaque: headphones, spiky | timur: mohawk, dark
    - serega-bigi: afro/short, warm | sanek: spiky, bright | valera: buzz, rugged
    - zhenek: short, suit | diman: short, headphones | antoha: short, sporty
    - kirill: long, creative | kostyan: long, glasses | petro: spiky, gloves

---

### [T10] Generate portraits + update gen-characters.mjs
- **Phase**: 4 — All 17 Characters
- **Type**: feature
- **Depends on**: T09
- **Input**: `scripts/gen-sprites.mjs`, `scripts/gen-characters.mjs`
- **Output**:
  - MODIFY `scripts/gen-sprites.mjs` — portrait generation
  - CREATE `public/assets/fighters/{id}-portrait.png` ×17
  - MODIFY `scripts/gen-characters.mjs` — per-character paths, tint=0xFFFFFF, scale=1.0
- **Acceptance criteria**:
  - [ ] Portraits ~200×200px: head + upper torso, transparent bg
  - [ ] gen-characters.mjs: `spriteSheet: "assets/fighters/${id}.png"`
  - [ ] gen-characters.mjs: `tint: 0xFFFFFF` for all
  - [ ] gen-characters.mjs: `scale: 1.0` for all
  - [ ] `node scripts/gen-characters.mjs` produces updated configs
- **Tests required**:
  - Each JSON: unique spriteSheet path, tint=16777215, scale=1.0
  - Portrait PNGs exist, ~200×200
- **Constitution check**: Data-Driven Everything, Incremental Delivery
- **Implementation notes**:
  - Portrait: render head+torso from idle frame 0, scale to fit 200×200
  - In gen-characters.mjs: replace shared spriteSheet with template literal, neutralize category scale

---

### [T11] Update Fighter.ts for per-character textures
- **Phase**: 5 — Game Integration
- **Type**: feature
- **Depends on**: T09
- **Input**: `src/game/entities/Fighter.ts`
- **Output**:
  - MODIFY `src/game/entities/Fighter.ts`
- **Acceptance criteria**:
  - [ ] Remove `SHARED_TEXTURE = 'martial-hero'`
  - [ ] Texture key = `config.id`
  - [ ] Constructor: `scene.add.sprite(0, 0, config.id)`
  - [ ] `createAnimations`: `generateFrameNumbers(config.id, ...)`
  - [ ] `loadAssets`: check/load `config.id` as texture key
  - [ ] Flash recovery: `this.sprite.clearTint()` (tint always 0xFFFFFF)
  - [ ] FEET_ORIGIN_Y unchanged
- **Tests required**:
  - Existing tests pass; manual in-game verification
- **Constitution check**: Game Feel First, Incremental Delivery
- **Implementation notes**:
  - Line 4: remove SHARED_TEXTURE
  - Line 37: `config.id` instead of SHARED_TEXTURE
  - Line 45–49: `scene.textures.exists(config.id)`, load with config.id key
  - Line 111: `generateFrameNumbers(config.id, ...)`
  - Lines 84–90: simplify to always clearTint()

---

### [T12] Update Preloader.ts for dynamic spritesheet loading
- **Phase**: 5 — Game Integration
- **Type**: feature
- **Depends on**: T10
- **Input**: `src/game/scenes/Preloader.ts`
- **Output**:
  - MODIFY `src/game/scenes/Preloader.ts`
- **Acceptance criteria**:
  - [ ] Remove hardcoded `martial-hero` spritesheet load
  - [ ] After manifest load, dynamically load 17 spritesheets + portraits
  - [ ] Progress bar works during multi-phase loading
  - [ ] All textures available when CharacterSelect starts
- **Tests required**:
  - Manual: game boots, all 17 characters appear in select
- **Constitution check**: Mobile-First, Incremental Delivery
- **Implementation notes**:
  - Two-phase load: preload() loads manifest+audio+bg, create() reads manifest, starts second load pass for 17 spritesheets+portraits, transitions to MainMenu on complete
  - ~1–2MB total for 17 sheets — acceptable

---

### [T13] Update CharacterConfig.test.ts for per-character paths
- **Phase**: 5 — Game Integration
- **Type**: test
- **Depends on**: T12
- **Input**: `src/shared/__tests__/CharacterConfig.test.ts`
- **Output**:
  - MODIFY `src/shared/__tests__/CharacterConfig.test.ts`
- **Acceptance criteria**:
  - [ ] Replace shared spritesheet assertion → `assets/fighters/{id}.png`
  - [ ] Add: tint === 0xFFFFFF, scale === 1.0
  - [ ] Add: spritesheet PNG file exists
  - [ ] Add: portrait PNG file exists
  - [ ] `npm test` passes
- **Tests required**: This IS the test update
- **Constitution check**: Data-Driven Everything
- **Implementation notes**:
  - Line 75–77: change assertion from shared path to per-character
  - Use `fs.existsSync` for PNG file checks

---

### [T14] Redesign CharacterSelect.ts — adaptive grid + portraits
- **Phase**: 5 — Game Integration
- **Type**: ui
- **Depends on**: T11, T13
- **Input**: `src/game/scenes/CharacterSelect.ts`, portrait images
- **Output**:
  - MODIFY `src/game/scenes/CharacterSelect.ts`
- **Acceptance criteria**:
  - [ ] Adaptive grid: 3 cols (<480px), 4 cols (<768px), 6 cols (desktop)
  - [ ] Cell size ~130×130 on mobile (up from 140×80)
  - [ ] Each cell: idle frame 0 from character's own spritesheet
  - [ ] Selected cell: bright border + scale pulse
  - [ ] Detail panel: portrait image, slide-up on mobile
  - [ ] Confirm button: full-width mobile, min 48px height
  - [ ] All touch targets ≥ 44×44px
  - [ ] Remove all `SHARED_TEXTURE = 'martial-hero'` references
  - [ ] Both local and online modes work
- **Tests required**:
  - Manual: 3 breakpoints (phone portrait/landscape, desktop)
  - All 17 + random cell visible and selectable
  - Detail panel shows correct portrait
- **Constitution check**: Mobile-First, Game Feel First, Humor-Driven Design
- **Implementation notes**:
  - Replace static GRID_COLS with dynamic calc from `this.cameras.main.width`
  - Cell sprites: `this.add.sprite(0, -5, entry.id, 0)` instead of SHARED_TEXTURE
  - Detail panel: `this.add.image(..., entry.id + '-portrait')`
  - Scroll: 3 cols × 6 rows = ~830px, fits most phones; reduce to 110px cells if tight

---

### [T15] End-to-end testing + cleanup
- **Phase**: 6 — Verification
- **Type**: test
- **Depends on**: T14
- **Input**: Complete game with new sprites
- **Output**:
  - DELETE `public/assets/fighters/martial-hero.png`
- **Acceptance criteria**:
  - [ ] `node scripts/gen-sprites.mjs` — 17 PNGs + 17 portraits
  - [ ] `node scripts/gen-characters.mjs` — 17 updated configs
  - [ ] `npm run build` — no errors
  - [ ] `npm test` — all pass
  - [ ] CharacterSelect: 17 distinct characters
  - [ ] FightScene: all animations correct, hit-flash works
  - [ ] Mobile responsive mode: 375×667 usable
  - [ ] `martial-hero.png` deleted
  - [ ] No remaining "martial-hero" references in src/scripts (grep)
- **Tests required**: Full test suite + grep + manual smoke test
- **Constitution check**: Incremental Delivery, Mobile-First
- **Implementation notes**:
  - Delete martial-hero.png only after all verification passes

---

### [T16] Update CLAUDE.md + documentation
- **Phase**: 6 — Verification
- **Type**: docs
- **Depends on**: T14
- **Input**: `CLAUDE.md`, `docs/plan-sprites.md`
- **Output**:
  - MODIFY `CLAUDE.md`
  - MODIFY `docs/plan-sprites.md`
- **Acceptance criteria**:
  - [ ] CLAUDE.md Commands: add `gen-sprites.mjs` and `preview-sprite.mjs`
  - [ ] CLAUDE.md Sprites line updated to "Procedural chibi sprites"
  - [ ] plan-sprites.md: all checkboxes marked complete
- **Tests required**: None
- **Constitution check**: Co-located Documentation
- **Implementation notes**:
  - Add commands after gen-logo line in CLAUDE.md

---

## Progress Tracker

### Wave 0
- [x] T01: Extract shared PNG encoder to scripts/lib/png.mjs

### Wave 1
- [x] T02: Drawing primitives library scripts/lib/draw.mjs

### Wave 2
- [x] T03: Skeleton system + animation keyframes + size scaling

### Wave 3
- [x] T04: Body part renderer (9-layer draw order)
- [x] T05: Preview tool scripts/preview-sprite.mjs

### Wave 4
- [x] T06: Frame grid assembly + first character (petyaj)

### Wave 5
- [x] T07: Hair styles renderer (8 types)
- [x] T08: Accessories renderer + face details

### Wave 6
- [ ] T09: Define 17 CHARACTER_VISUALS + generate all spritesheets

### Wave 7
- [ ] T10: Generate portraits + update gen-characters.mjs
- [ ] T11: Update Fighter.ts for per-character textures

### Wave 8
- [ ] T12: Update Preloader.ts for dynamic spritesheet loading

### Wave 9
- [ ] T13: Update CharacterConfig.test.ts for per-character paths

### Wave 10
- [ ] T14: Redesign CharacterSelect.ts — adaptive grid + portraits

### Wave 11
- [ ] T15: End-to-end testing + cleanup
- [ ] T16: Update CLAUDE.md + documentation

---

## First Task Brief: [T01]

**Goal**: Extract duplicated PNG encoding from `gen-bg.mjs` and `gen-logo.mjs` into `scripts/lib/png.mjs`.

**Steps**:

1. Create `scripts/lib/` directory and `scripts/lib/png.mjs`
2. In `png.mjs`, implement and export `encodePNG(width, height, rgbaBuffer)`:
   - Import `deflateSync` from `'zlib'`
   - Copy `crc32(buf)` from gen-bg.mjs:64–73
   - Copy `chunk(type, data)` from gen-bg.mjs:75–82
   - Build scanlines: `Buffer.alloc(height * (1 + width * 4))`, filter byte 0 per row + row pixels
   - Compress with `deflateSync(raw)`
   - Build IHDR: 13 bytes (width/height BE32, bitDepth=8, colorType=6 RGBA)
   - Concatenate: PNG signature + IHDR chunk + IDAT chunk + IEND chunk
   - Return complete Buffer
3. Update `scripts/gen-bg.mjs`: import encodePNG, remove inline crc32/chunk/assembly
4. Update `scripts/gen-logo.mjs`: same
5. Create `scripts/lib/__tests__/png.test.mjs`: encode 2×2 image, verify PNG signature
6. Verify: `node scripts/gen-bg.mjs && node scripts/gen-logo.mjs`

**Key files**:
- `scripts/gen-bg.mjs` lines 63–112
- `scripts/gen-logo.mjs` lines 129–176
