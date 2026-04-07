/**
 * Preview tool: renders all animation frames for a character at 4× zoom.
 *
 * Usage:
 *   node scripts/preview-sprite.mjs [charId]
 *   Defaults to "petyaj" if no argument given.
 *   Output: preview-{charId}.png in project root.
 */

import { writeFileSync } from 'fs';
import { FrameBuffer, blit } from './lib/draw.mjs';
import { encodePNG } from './lib/png.mjs';
import {
    FRAME_W,
    FRAME_H,
    COLS,
    ANIM_ROWS,
    ANIMATIONS,
    generateScaledAnimFrames,
    renderFrame,
} from './gen-sprites.mjs';

const ZOOM = 4;
const charId = process.argv[2] || 'petyaj';

// Test visuals (will be replaced with real CHARACTER_VISUALS in T06+)
const DEFAULT_VISUALS = {
    skinColor:  [220, 180, 140, 255],
    hairColor:  [60, 30, 15, 255],
    torsoColor: [50, 120, 200, 255],
    pantsColor: [40, 40, 80, 255],
    shoeColor:  [30, 30, 30, 255],
};

// Determine category (default to standard for now)
const category = 'standard';

// Collect all animation rows
const animNames = Object.keys(ANIM_ROWS);
const rows = animNames.length; // 7

// Output dimensions at 4× zoom
const outW = COLS * FRAME_W * ZOOM;
const outH = rows * FRAME_H * ZOOM;
const outFb = new FrameBuffer(outW, outH);

console.log(`Generating preview for "${charId}" (${category}) — ${outW}×${outH}px`);

for (const animName of animNames) {
    const { row } = ANIM_ROWS[animName];
    const poses = generateScaledAnimFrames(animName, category);

    for (let f = 0; f < poses.length; f++) {
        // Render single frame at native resolution
        const frameFb = new FrameBuffer(FRAME_W, FRAME_H);
        renderFrame(poses[f], DEFAULT_VISUALS, frameFb);

        // Scale up 4× and blit into output
        const scaledFb = new FrameBuffer(FRAME_W * ZOOM, FRAME_H * ZOOM);
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                const pixel = frameFb.getPixel(x, y);
                if (pixel[3] === 0) continue;
                for (let dy = 0; dy < ZOOM; dy++) {
                    for (let dx = 0; dx < ZOOM; dx++) {
                        scaledFb.setPixel(x * ZOOM + dx, y * ZOOM + dy, pixel);
                    }
                }
            }
        }

        const destX = f * FRAME_W * ZOOM;
        const destY = row * FRAME_H * ZOOM;
        blit(scaledFb, outFb, destX, destY);
    }
}

const pngBuf = encodePNG(outW, outH, outFb.toBuffer());
const outPath = `preview-${charId}.png`;
writeFileSync(outPath, pngBuf);
console.log(`Written: ${outPath} (${(pngBuf.length / 1024).toFixed(1)} KB)`);
