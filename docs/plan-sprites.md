# Plan: Procedural Chibi Sprite Generator

## Context

All 17 characters in "Корешки Fight Club" share один спрайтшит (`martial-hero.png`), различаясь только `scale` и `tint` — на мобильных экранах бойцов почти не отличить. Нужно сгенерировать уникальные процедурные chibi-спрайтшиты для каждого персонажа, сохраняя совместимость с текущей анимационной системой (11x7 сетка, 126x126 фреймы).

Параллельно — редизайн CharacterSelect для мобильных (текущая сетка 6x3 с ячейками 140x80 слишком мелкая).

Основано на: [docs/research-sprites.md](docs/research-sprites.md)

---

## Phase 1: Drawing Foundation

**Deliverable:** Переиспользуемые утилиты для рисования и кодирования PNG.

- [x] **1.1** Extract shared PNG encoder → `scripts/lib/png.mjs`
  - Вынести дублированный код CRC32 + chunk builder + IHDR/IDAT/IEND из `gen-bg.mjs` (lines 63-82) и `gen-logo.mjs` (lines 130-149)
  - Export: `encodePNG(width, height, rgbaBuffer) → Buffer`
  - Обновить `gen-bg.mjs` и `gen-logo.mjs` — заменить inline-код на import из `scripts/lib/png.mjs`

- [x] **1.2** Implement `scripts/lib/draw.mjs` — FrameBuffer class + drawing primitives
  - `class FrameBuffer { constructor(w, h); getPixel; setPixel; clear }`
  - `fillRect(fb, x, y, w, h, color)` — nested loop
  - `fillCircle(fb, cx, cy, r, color)` — midpoint scanline
  - `fillOval(fb, cx, cy, rx, ry, color)` — scaled circle
  - `drawLine(fb, x0, y0, x1, y1, thickness, color)` — Bresenham with thickness
  - `blit(src, dst, dx, dy)` — copy one FrameBuffer into another

**Files:**
- CREATE `scripts/lib/png.mjs`
- CREATE `scripts/lib/draw.mjs`
- MODIFY `scripts/gen-bg.mjs` — replace inline PNG encoder with import
- MODIFY `scripts/gen-logo.mjs` — replace inline PNG encoder with import

---

## Phase 2: Skeleton & Animation Engine

**Deliverable:** Скелетная система с интерполяцией, способная генерировать позы для всех 7 анимаций.

- [x] **2.1** Implement skeleton system in `scripts/gen-sprites.mjs`
  - 12 joints hierarchy: root → hip → torso → head / armL/handL / armR/handR / legL/footL / legR/footR
  - Pose = `Record<Joint, {x, y}>` — абсолютные смещения от root (точка ног)
  - Linear interpolation between keyframes with `Math.round()` for pixel snap

- [x] **2.2** Define base keyframe poses for all 7 animations
  - idle: 3 keyframes (0, 3, 7) → 10 frames
  - run: 4 keyframes (0, 2, 4, 6) → 8 frames
  - jump: 3 keyframes (0, 1, 2) → 3 frames
  - fall: 2 keyframes (0, 2) → 3 frames
  - attack: 4 keyframes (0, 2, 4, 6) → 7 frames
  - hit: 2 keyframes (0, 2) → 3 frames
  - dead: 4 keyframes (0, 3, 6, 10) → 11 frames (падение назад + комичный отскок)

- [x] **2.3** Size category scaling
  - Base poses for "standard" (60px)
  - big: 1.35x width, 1.30x height
  - tall: 1.05x width, 1.20x height
  - short: 0.95x width, 0.82x height, 1.10x head ratio

**Files:**
- CREATE `scripts/gen-sprites.mjs` (skeleton + interpolation + size scaling)

---

## Phase 3: Renderer & First Character

**Deliverable:** 1 полностью отрисованный персонаж (petyaj) со всеми 7 анимациями.

- [x] **3.1** Implement body part renderer (back-to-front draw order)
  1. Back arm (armL → handL) + sleeve
  2. Back leg (legL → footL) + pants + shoe
  3. Torso rectangle
  4. Front leg (legR → footR)
  5. Head circle (skin)
  6. Hair (style-dependent overlay)
  7. Face details (eyes, beard/glasses/mask)
  8. Accessories (helmet, headphones, gloves)
  9. Front arm (armR → handR)

- [x] **3.2** Frame grid assembly
  - Blit 126x126 frames into 1386x882 sheet (11 cols x 7 rows)
  - Feet anchor at y=82 (matching `FEET_ORIGIN_Y = 82/126`)
  - Row mapping: idle=0, run=1, jump=2, fall=3, attack=4, hit=5, dead=6

- [x] **3.3** Build preview tool `scripts/preview-sprite.mjs`
  - Renders single character at 4x zoom for rapid iteration
  - Output: `preview-{id}.png` in project root (gitignored)

- [x] **3.4** Define visual params for first character (petyaj — tall category)
  - Tune poses until quality is acceptable

**Files:**
- MODIFY `scripts/gen-sprites.mjs` (add renderer, grid assembly, character data)
- CREATE `scripts/preview-sprite.mjs`
- UPDATE `.gitignore` — add `preview-*.png`

---

## Phase 4: All 17 Characters

**Deliverable:** 17 уникальных спрайтшитов в `public/assets/fighters/`.

- [x] **4.1** Define 17 CHARACTER_VISUALS data objects
  - Per character: category, skinColor, hairColor, hairStyle, torsoColor, pantsColor, shoeColor, torsoWidth/Height, face details, accessories, outfit
  - Read character list from existing `scripts/gen-characters.mjs` manifest data

- [x] **4.2** Implement hair styles (7-8 types: short, spiky, dreadlocks, buzz, long, mohawk, ponytail, afro)

- [x] **4.3** Implement accessories rendering (helmet, headphones, gloves, mask, glasses)

- [x] **4.4** Generate all 17 sprite sheets → `public/assets/fighters/{id}.png`

- [x] **4.5** Generate 17 portrait images → `public/assets/fighters/{id}-portrait.png`
  - Крупный рендер: голова + плечи, ~200x200px
  - Используется в detail panel на CharacterSelect
  - Генерируется в `gen-sprites.mjs` вместе со спрайтшитами

- [x] **4.6** Update `scripts/gen-characters.mjs`
  - Change `spriteSheet` from `"assets/fighters/martial-hero.png"` to `"assets/fighters/${id}.png"`
  - Set `tint` to `0xFFFFFF` for all characters (color baked into sprites)
  - Remove category-based scale adjustments (size baked in) or set scale to 1.0

**Files:**
- MODIFY `scripts/gen-sprites.mjs` (all character visuals, hair, accessories)
- MODIFY `scripts/gen-characters.mjs` (per-character spriteSheet, remove tint/scale)
- CREATE `public/assets/fighters/{id}.png` x17
- CREATE `public/assets/fighters/{id}-portrait.png` x17

---

## Phase 5: Game Integration

**Deliverable:** Игра использует новые спрайтшиты, CharacterSelect переделан для мобильных.

- [x] **5.1** Update `src/game/entities/Fighter.ts`
  - Replace shared `'martial-hero'` texture key with `config.id`
  - Load spritesheet using `config.spriteSheet` path and `config.id` as key
  - Remove tint application in constructor (keep hit-flash white tint)
  - Animation frame references use `config.id`

- [x] **5.2** Update `src/game/scenes/Preloader.ts`
  - Remove single `martial-hero.png` load
  - After loading manifest, load all 17 character spritesheets dynamically:
    `this.load.spritesheet(id, spriteSheet, {frameWidth: 126, frameHeight: 126})`

- [x] **5.3** Redesign `src/game/scenes/CharacterSelect.ts` for mobile
  - Replace fixed 6x3 grid with adaptive scrollable grid:
    - Phone portrait (<480px): 3 cols, ~140x140 cells, vertical scroll
    - Phone landscape: 4 cols, ~120x120 cells
    - Tablet/Desktop: 6 cols, ~140x140 cells, no scroll
  - Each cell: character sprite (idle frame 0) + name (16px bold)
  - Selected cell: bright border + scale animation
  - Detail panel: slide up from bottom (mobile) / fixed (desktop), uses portrait image (`{id}-portrait.png`)
  - Confirm button: full-width, 56px height, 22px font
  - Min touch target: 44x44px

- [x] **5.4** Delete `public/assets/fighters/martial-hero.png` after full testing

**Files:**
- MODIFY `src/game/entities/Fighter.ts`
- MODIFY `src/game/scenes/Preloader.ts`
- MODIFY `src/game/scenes/CharacterSelect.ts`
- DELETE `public/assets/fighters/martial-hero.png` (after testing)

---

## Phase 6: Verification

- [x] **6.1** Run `node scripts/gen-sprites.mjs` — verify 17 PNGs generated
- [x] **6.2** Run `node scripts/gen-characters.mjs` — verify updated configs
- [x] **6.3** Run `npm run build` — verify no build errors
- [x] **6.4** Run `npm test` — verify existing tests pass
- [x] **6.5** Run `npm run dev` — manual testing:
  - CharacterSelect: все 17 персонажей визуально различимы
  - CharacterSelect: мобильная верстка (DevTools responsive mode)
  - FightScene: анимации корректны, нет смещений хитбоксов
  - FightScene: hit-flash (белый тинт) работает
- [x] **6.6** Test on real mobile device (iOS Safari + Android Chrome)

---

## Key Reusable Code

| What | Where | Reuse how |
|------|-------|-----------|
| PNG encoder (CRC32+chunks) | `scripts/gen-bg.mjs:63-82`, `scripts/gen-logo.mjs:130-149` | Extract to `scripts/lib/png.mjs` |
| Character manifest data | `scripts/gen-characters.mjs` | Read categories & IDs for visual params |
| FEET_ORIGIN_Y constant | `src/game/entities/Fighter.ts` | Match feet anchor at y=82/126 |
| AnimDef frame indices | `scripts/gen-characters.mjs` | Grid placement must match exactly |

## CLAUDE.md Update

Add to Commands section:
```bash
node scripts/gen-sprites.mjs        # regenerate 17 character sprite sheets
node scripts/preview-sprite.mjs     # preview single character at 4x zoom
```

---

## Resolved Decisions

1. **Hair styles:** 7-8 стилей (short, spiky, dreadlocks, buzz, long + mohawk, ponytail, afro)
2. **Портреты:** Отдельные портреты (голова + плечи, ~200x200px) для detail panel
3. **Dead animation:** Падение назад + комичный отскок от земли (humor-driven)
4. **CharacterSelect:** Скроллируемая сетка (3 колонки на телефоне)
5. **martial-hero.png:** Удалить после полного тестирования
