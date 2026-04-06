#!/usr/bin/env node
/**
 * Generate the "КОРЕШКИ FIGHT CLUB" game logo (PNG with transparency).
 * Pixel-art style, fire gradient for title, white for subtitle.
 * Run: node scripts/gen-logo.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encodePNG } from './lib/png.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'assets', 'logo.png');

// 5x7 pixel font definitions (each char = 7 rows of 5-bit bitmaps)
const FONT = {
    // Cyrillic
    'К': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
    'О': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'Р': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
    'Е': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
    'Ш': [0b10101, 0b10101, 0b10101, 0b10101, 0b10101, 0b10101, 0b11111],
    'И': [0b10001, 0b10011, 0b10011, 0b10101, 0b11001, 0b11001, 0b10001],
    // Latin
    'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
    'I': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
    'G': [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
    'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    'C': [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
    'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
    ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
};

const CHAR_W = 5;
const CHAR_H = 7;

const TITLE = 'КОРЕШКИ';
const SUBTITLE = 'FIGHT CLUB';
const TITLE_SCALE = 8;
const SUB_SCALE = 4;
const LETTER_GAP = 2; // in base pixels
const LINE_GAP = 20;  // pixels between lines (after scaling)
const PAD_X = 20;
const PAD_Y = 16;

function textWidth(str, scale) {
    return str.length * (CHAR_W + LETTER_GAP) * scale - LETTER_GAP * scale;
}

const titleW = textWidth(TITLE, TITLE_SCALE);
const subW = textWidth(SUBTITLE, SUB_SCALE);
const W = Math.max(titleW, subW) + PAD_X * 2;
const titleH = CHAR_H * TITLE_SCALE;
const subH = CHAR_H * SUB_SCALE;
const H = PAD_Y + titleH + LINE_GAP + subH + PAD_Y;

// RGBA pixel buffer (transparent by default)
const pixels = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = a;
}

// Fire gradient: row 0 = bright yellow, row max = deep red
function fireColor(row, totalRows) {
    const t = row / (totalRows - 1); // 0=top, 1=bottom
    // Yellow (255,220,50) → Orange (255,120,0) → Red (200,30,0)
    if (t < 0.5) {
        const s = t * 2;
        return [255, Math.round(220 - 100 * s), Math.round(50 - 50 * s)];
    } else {
        const s = (t - 0.5) * 2;
        return [Math.round(255 - 55 * s), Math.round(120 - 90 * s), 0];
    }
}

function drawText(str, startX, startY, scale, colorFn) {
    for (let ci = 0; ci < str.length; ci++) {
        const ch = str[ci];
        const glyph = FONT[ch];
        if (!glyph) continue;
        const ox = startX + ci * (CHAR_W + LETTER_GAP) * scale;
        for (let row = 0; row < CHAR_H; row++) {
            const bits = glyph[row];
            for (let col = 0; col < CHAR_W; col++) {
                if (bits & (1 << (CHAR_W - 1 - col))) {
                    const [r, g, b] = colorFn(row, CHAR_H);
                    // Fill scaled pixel block
                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            setPixel(ox + col * scale + dx, startY + row * scale + dy, r, g, b, 255);
                        }
                    }
                }
            }
        }
    }
}

// Draw outline/shadow (1 scaled pixel in each direction)
function drawTextShadow(str, startX, startY, scale, r, g, b) {
    const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    for (const [ox, oy] of offsets) {
        drawText(str, startX + ox, startY + oy, scale, () => [r, g, b]);
    }
}

// Center both lines
const titleX = Math.round((W - titleW) / 2);
const subX = Math.round((W - subW) / 2);
const titleY = PAD_Y;
const subY = PAD_Y + titleH + LINE_GAP;

// Draw shadow first, then text on top
drawTextShadow(TITLE, titleX, titleY, TITLE_SCALE, 40, 10, 0);
drawText(TITLE, titleX, titleY, TITLE_SCALE, fireColor);

drawTextShadow(SUBTITLE, subX, subY, SUB_SCALE, 60, 60, 60);
drawText(SUBTITLE, subX, subY, SUB_SCALE, () => [255, 255, 255]);

const png = encodePNG(W, H, pixels);

writeFileSync(OUT_PATH, png);
console.log(`✓ Generated logo.png (${W}x${H}, ${png.length} bytes)`);
