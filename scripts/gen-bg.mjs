#!/usr/bin/env node
/**
 * Generate a simple fight scene background (1024x768 PNG).
 * Sky gradient + ground with texture.
 * Run: node scripts/gen-bg.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Encode as PNG (minimal encoder — uncompressed IDAT)
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
}

// Use zlib to compress
import { deflateSync } from 'zlib';

// Build raw scanlines (filter byte 0 = None for each row)
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
    const rowOffset = y * (1 + W * 4);
    raw[rowOffset] = 0; // filter: None
    pixels.copy(raw, rowOffset + 1, y * W * 4, (y + 1) * W * 4);
}

const compressed = deflateSync(raw);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUT_PATH, png);
console.log(`✓ Generated bg.png (${W}x${H}, ${png.length} bytes)`);
