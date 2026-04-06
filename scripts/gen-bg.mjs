#!/usr/bin/env node
/**
 * Generate a simple fight scene background (1024x768 PNG).
 * Sky gradient + ground with texture.
 * Run: node scripts/gen-bg.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encodePNG } from './lib/png.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'assets', 'bg.png');

const W = 1024;
const H = 768;
// FLOOR_Y in game coords is 520 out of 576. When bg is stretched to 576, floor is at 520.
// But we generate at 768 height and it gets scaled. So floor line at: 520/576 * 768 ≈ 694
const FLOOR_LINE = Math.round((520 / 576) * H);

// Create raw RGBA pixel data
const pixels = Buffer.alloc(W * H * 4);

for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;

        if (y < FLOOR_LINE) {
            // Sky gradient: dark blue at top → lighter blue at horizon
            const t = y / FLOOR_LINE;
            const r = Math.round(15 + t * 60);
            const g = Math.round(10 + t * 100);
            const b = Math.round(60 + t * 140);
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
        } else {
            // Ground: dark brown with slight noise for texture
            const depth = (y - FLOOR_LINE) / (H - FLOOR_LINE);
            const noise = (Math.sin(x * 0.3 + y * 0.7) * 5) | 0;
            const r = Math.round(45 - depth * 15 + noise);
            const g = Math.round(35 - depth * 10 + noise);
            const b = Math.round(20 - depth * 5 + noise);
            pixels[idx] = Math.max(0, Math.min(255, r));
            pixels[idx + 1] = Math.max(0, Math.min(255, g));
            pixels[idx + 2] = Math.max(0, Math.min(255, b));
            pixels[idx + 3] = 255;
        }
    }

    // Horizon line (2px bright strip at floor)
    if (y === FLOOR_LINE || y === FLOOR_LINE + 1) {
        for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            pixels[idx] = 100;
            pixels[idx + 1] = 85;
            pixels[idx + 2] = 60;
            pixels[idx + 3] = 255;
        }
    }
}

const png = encodePNG(W, H, pixels);

writeFileSync(OUT_PATH, png);
console.log(`✓ Generated bg.png (${W}x${H}, ${png.length} bytes)`);
