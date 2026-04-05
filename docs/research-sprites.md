# Research: Procedural Chibi Sprite Generator

> Date: 2026-04-05
> Status: Pre-development research

---

## 1. Problem Statement

### What we're solving
All 17 characters in "Корешки Fight Club" share a single sprite sheet (`martial-hero.png` from LuizMelo pack). Characters are differentiated only by `scale` (0.85-1.25) and `tint` color — making them nearly indistinguishable on mobile screens.

### Core goal
Generate **unique procedural chibi pixel art sprite sheets** for each of the 17 characters, matching the existing animation frame layout (11x7 grid, 126x126 frames), so every fighter has a visually distinct appearance.

### Secondary goals
- Redesign CharacterSelect screen for mobile (current 6x3 grid with 140x80 cells is too small)
- Use bright, saturated palette for mobile visibility
- Maintain zero-external-dependency approach consistent with existing gen-*.mjs scripts

### Key functional requirements
1. Generate 17 individual PNG sprite sheets (1386x882, 11 cols x 7 rows)
2. Chibi proportions: large head (~40% of height), small body
3. 4 size categories: big (70-80px), tall (65-75px), standard (55-65px), short (45-55px)
4. 7 animations with specific frame counts matching existing configs
5. Keyframe-based skeletal animation with interpolation
6. Per-character visual params: body proportions, colors, hair, accessories, face details
7. Frame indices must match existing `AnimDef` configs exactly

---

## 2. Existing Solutions Analysis

| Tool/Project | Approach | Strengths | Weaknesses | Relevance |
|---|---|---|---|---|
| **Universal LPC Spritesheet Generator** | Modular layer compositing from pre-drawn assets | Huge asset library, proven quality | Requires pre-drawn layers, not procedural | Low — we need generation, not assembly |
| **pixel-asset-gen** (Python/Pillow) | Pure math generation (sine waves, fractal noise) | 186 assets, no ML, good pixel art | Python, not character-focused | Medium — demonstrates math-only approach |
| **pixel-sprite-generator** (JS) | Mask-based symmetric generation | Lightweight, browser-ready | Only symmetric blobs (ships, invaders) | Low — wrong aesthetic |
| **PixelOver** | Bone-based animation tool | Export to sprite sheets, pixel snap | Commercial tool, not scriptable | Conceptual reference only |
| **pixel_character_generator** (GAN) | ML-based 64x64 character generation | Novel output | Requires training data, Python | None — overkill for 17 fixed characters |

### Key takeaway
No existing tool does exactly what we need. The closest viable approach is **procedural skeleton-based drawing** (like pixel-asset-gen) adapted for chibi characters, using the project's established raw-buffer pattern.

---

## 3. Technology Stack

### Rendering: Raw pixel buffer + custom PNG encoder (RECOMMENDED)

| Aspect | Detail |
|---|---|
| **What** | `Buffer.alloc(W*H*4)` + manual RGBA pixel writes + zlib-based PNG encoder |
| **Why** | Already proven in `gen-bg.mjs`, `gen-logo.mjs`. Zero dependencies. Chibi pixel art at 45-80px height is fundamentally blocky shapes — `fillRect` and `fillCircle` cover 95% of needs |
| **Trade-off** | No anti-aliasing, no text rendering, manual drawing primitives. More code than Canvas API |
| **Alternative** | `@napi-rs/canvas` — zero native deps, Windows-friendly, Canvas 2D API. Switch if drawing complexity escalates |

### Why NOT node-canvas (npm: canvas)
- Heavy native dependency on Cairo/Pango/GTK
- Notorious Windows installation issues (dozens of GitHub issues)
- Anti-aliased rendering is actually **undesirable** for pixel art — we want crisp pixels
- The project already has 3 generators using raw buffers — adding a dependency breaks the pattern

### Why NOT @napi-rs/canvas
- Best Canvas alternative (Skia-based, zero system deps, Windows works)
- But still an npm dependency where none is needed
- Reserve as fallback if raw buffer approach proves insufficient

### Drawing primitives needed
All implementable with basic pixel math:
- `fillRect(x, y, w, h, color)` — trivial nested loop
- `fillCircle(cx, cy, r, color)` — scanline midpoint algorithm
- `fillOval(cx, cy, rx, ry, color)` — scaled circle
- `drawLine(x0, y0, x1, y1, thickness, color)` — Bresenham with thickness

---

## 4. Architecture

### Module structure

```
scripts/
  lib/
    png.mjs              — shared PNG encoder (extracted from gen-bg/gen-logo)
    draw.mjs             — FrameBuffer class + drawing primitives
  gen-sprites.mjs        — main orchestrator
```

### Data flow

```
Character Visual Data (hardcoded in gen-sprites.mjs)
    ↓
Skeleton + Keyframe Poses (per animation, per size category)
    ↓
Interpolation → resolved pose for each frame
    ↓
Renderer: draw body parts back-to-front onto 126x126 FrameBuffer
    ↓
Blit frames into 1386x882 sheet buffer
    ↓
PNG encode → public/assets/fighters/{id}.png
```

### Skeletal system

**12 joints** in hierarchy:
```
root → hip → torso → head
                   → armL → handL
                   → armR → handR
            → legL → footL
            → legR → footR
```

**Pose** = map of joint → {x, y} absolute offset from root (feet anchor point).

**Keyframes**: 2-4 key poses per animation, linearly interpolated with `Math.round()` for pixel snap.

**Size scaling**: Base poses defined for "standard" (60px). Other categories scale X/Y independently:
- big: 1.35x width, 1.30x height
- tall: 1.05x width, 1.20x height  
- short: 0.95x width, 0.82x height, 1.10x head ratio

### Animation keyframe plan

| Animation | Frames | Keyframes | Description |
|---|---|---|---|
| idle | 10 | 3 (0, 3, 7) | Standing → bob down → bob up → loop |
| run | 8 | 4 (0, 2, 4, 6) | Contact L → Pass L → Contact R → Pass R |
| jump | 3 | 3 (0, 1, 2) | Crouch → Rise → Apex |
| fall | 3 | 2 (0, 2) | Arms up → Arms trailing |
| attack | 7 | 4 (0, 2, 4, 6) | Windup → Extend → Hold → Recover |
| hit | 3 | 2 (0, 2) | Recoil → Recover |
| dead | 11 | 4 (0, 3, 6, 10) | Standing → Falling → Ground → Flat |

### Character visual params

```javascript
{
  category: 'tall',
  skinColor, hairColor, hairStyle,  // 'short'|'spiky'|'dreadlocks'|'buzz'|'long'
  torsoColor, pantsColor, shoeColor,
  torsoWidth, torsoHeight,
  face: { beard, glasses, mask },
  accessories: { helmet, headphones, gloves, headwear },
  outfit: { type, jacketColor, sleeveStyle }
}
```

### Drawing order (per frame, back-to-front)
1. Back arm (armL → handL) + sleeve
2. Back leg (legL → footL) + pants + shoe
3. Torso rectangle
4. Front leg (legR → footR)
5. Head circle (skin)
6. Hair (style-dependent overlay on head)
7. Face details (eyes, beard/glasses/mask)
8. Accessories (helmet, headphones, gloves)
9. Front arm (armR → handR) — topmost layer

### Frame grid placement

Each animation occupies one row. Frames fill left-to-right, rest stays transparent:
```
Row 0: idle   (cols 0-9)   → frame indices 0-9
Row 1: run    (cols 0-7)   → frame indices 11-18
Row 2: jump   (cols 0-2)   → frame indices 22-24
Row 3: fall   (cols 0-2)   → frame indices 33-35
Row 4: attack (cols 0-6)   → frame indices 44-50
Row 5: hit    (cols 0-2)   → frame indices 55-57
Row 6: dead   (cols 0-10)  → frame indices 66-76
```

---

## 5. Integration Changes

### 5.1 gen-characters.mjs
- Change `spriteSheet` from `"assets/fighters/martial-hero.png"` to `"assets/fighters/${id}.png"`
- Set `tint` to `0xFFFFFF` for all characters (color is baked into sprites)
- Keep `scale` at `1.0` (size differences baked in) — or remove category scaling

### 5.2 Fighter.ts
- Replace shared `'martial-hero'` texture key with `config.id`
- Load spritesheet using `config.spriteSheet` path and `config.id` as key
- Remove tint application in constructor (keep hit-flash white tint logic)
- Animation frames reference `config.id` instead of shared texture

### 5.3 Preloader.ts
- Remove single `martial-hero.png` load
- After loading manifest, load all 17 character spritesheets:
  ```
  for each character: load.spritesheet(id, spriteSheet, {frameWidth: 126, frameHeight: 126})
  ```
- ~17 x 30-60KB = 0.5-1MB total — negligible for mobile

### 5.4 CharacterSelect.ts (mobile redesign)
- Replace 6x3 grid (140x80 cells, 12px font) with adaptive layout:
  - **Portrait mode**: 3 columns, scrollable, ~100x100 cells
  - **Landscape mode**: 4-5 columns, larger cells
- Use per-character texture for thumbnails (idle frame 0)
- Remove tint-based differentiation
- Minimum touch target: 44x44px (Apple HIG)
- Detail panel: keep but enlarge text (18px+ body, 28px+ title)

---

## 6. CharacterSelect Mobile Redesign

### Current problems
- 140x80 cells → ~70x40 CSS pixels on 2x mobile = too small to tap accurately
- 12px font → 6px on 2x = unreadable
- 18 cells in fixed grid → no scrolling, everything crammed

### Recommended approach: Adaptive scrollable grid

| Screen | Columns | Cell size | Rows visible | Scroll |
|---|---|---|---|---|
| Phone portrait (<480px) | 3 | ~140x140 | 3 | vertical |
| Phone landscape | 4 | ~120x120 | 2 | vertical |
| Tablet/Desktop | 6 | ~140x140 | 3 | none |

- Each cell: character sprite (idle frame, ~0.6 scale) + name (16px bold)
- Selected cell: bright border + expand animation
- Detail panel slides up from bottom (mobile) or stays fixed (desktop)
- Confirm button: full-width at bottom, 56px height, 22px font

### Alternative: Carousel (rejected)
- Swipeable single-character view
- Pro: large preview, good for showcase
- Con: 17 characters = too many swipes, slow selection for experienced players
- Verdict: too slow for repeat play sessions

---

## 7. Risks & Complexity

| Dimension | Rating | Notes |
|---|---|---|
| **Technical complexity** | Medium-High | Skeleton system + 7 animations + 17 characters = significant tuning work |
| **Time to MVP** | Medium | Core engine (draw primitives + 1 character + 1 animation) is fast; tuning all 7 animations for quality is the bottleneck |
| **Maintenance burden** | Low | One-time generation script, re-run when characters change |
| **Visual quality risk** | High | Pixel art at 45-80px with raw buffer drawing can look crude. Need iterative tuning |

### Key risks

1. **Pose tuning is labor-intensive**: 12 unique keyframe poses across 7 animations, each needing pixel-perfect joint positions. Mitigation: build preview tool (`preview-sprite.mjs`) that renders single character at 4x zoom for rapid iteration.

2. **Limbs at pixel scale**: Arms = 2-4 pixels wide. One pixel off = looks broken. Mitigation: use axis-aligned `fillRect` for limbs (accept blocky look), don't try rotated shapes.

3. **Dead animation complexity**: 11 frames, character goes from standing to lying flat. Hardest animation to interpolate because orientation changes. Mitigation: use more keyframes (4) for this animation, allow manual frame overrides where interpolation fails.

4. **Hitbox mismatch**: Existing pushbox/hurtbox values assume `martial-hero.png` proportions. New sprites may need hitbox re-tuning. Mitigation: place feet at y=82 (matching `FEET_ORIGIN_Y = 82/126`), keep character proportions similar.

### Assumptions

| Assumption | If wrong... |
|---|---|
| Raw buffer drawing is sufficient for chibi quality | Switch to @napi-rs/canvas (add 1 dependency) |
| Linear interpolation produces acceptable in-between frames | Add easing functions or more keyframes |
| 17 characters can share base poses (only scaled) | Need per-character pose overrides (more work) |
| ~1MB total sprite data is fine for mobile | Optimize PNG compression or use texture atlases |
| Existing frame indices don't need to change | If they do, gen-characters.mjs AnimDef values need updating too |

---

## 8. Foundational Principles

> **1. Match the Existing Grid**: Every generated sprite sheet must produce identical frame indices to the current `martial-hero.png` layout. The animation system doesn't change — only the pixel content within frames changes.
> *Rationale*: Minimizes integration risk. All AnimDef configs, hitbox timings, and FightEngine logic stay untouched.

> **2. Zero Dependencies for Generation**: The sprite generator uses only Node.js built-ins (Buffer, zlib, fs). No npm packages.
> *Rationale*: Consistent with gen-bg.mjs, gen-logo.mjs, gen-audio.mjs pattern. No build toolchain fragility.

> **3. Data-Driven Characters**: Visual appearance is defined as data objects (colors, proportions, accessories), not as drawing code per character. One renderer draws all 17 from params.
> *Rationale*: Constitution principle #2 (Data-Driven Everything). Adding/modifying a character = editing a data object, not writing new drawing code.

> **4. Iterative Visual Tuning**: Build a preview tool first. Get one character looking good before generating all 17.
> *Rationale*: Pixel art quality requires iteration. Generating all 17 blind is wasteful.

> **5. Preserve Game Feel**: Frame timings, hitboxes, and animation triggers don't change. Only visual content within frames changes.
> *Rationale*: Constitution principle #1 (Game Feel First). Visual upgrade must not regress gameplay.

> **6. Bright Mobile Palette**: All character colors must be high-saturation, high-contrast. Test on phone screens.
> *Rationale*: The whole motivation — characters must be distinguishable on small mobile screens.

---

## 9. Recommended Next Steps

### MVP scope (Phase 1)
1. Extract shared PNG encoder into `scripts/lib/png.mjs`
2. Implement `scripts/lib/draw.mjs` (FrameBuffer + 4 drawing primitives)
3. Build skeleton system + interpolation (12 joints, linear interp)
4. Define base poses for all 7 animations (~12 keyframes total)
5. Implement renderer (draw pipeline, back-to-front body parts)
6. Generate **1 character** (petyaj — tallest, most visible issues) with all 7 animations
7. Build `preview-sprite.mjs` — renders 1 character at 4x zoom for tuning
8. Tune poses until quality is acceptable

### Phase 2: All characters
9. Define 17 CHARACTER_VISUALS data objects
10. Implement hair styles (5 types), accessories (helmet, headphones, gloves, mask)
11. Generate all 17 sprite sheets
12. Update `gen-characters.mjs` (per-character spriteSheet paths, remove tint)

### Phase 3: Integration
13. Update `Fighter.ts` (per-character textures)
14. Update `Preloader.ts` (load all character sheets)
15. Update `CharacterSelect.ts` (per-character textures + mobile redesign)

### Open questions for user
### Resolved decisions
1. **martial-hero.png** — удалить после полного тестирования новых спрайтов
2. **Dead animation** — падение назад + комичный отскок от земли (humor-driven, Constitution #6)
3. **CharacterSelect** — скроллируемая сетка (3 колонки на телефоне)

### Remaining open questions
1. How distinct should hair styles be? 5 styles (short, spiky, dreadlocks, buzz, long) or more?
2. Should we also generate character portrait images for the detail panel, or use idle frame 0?
