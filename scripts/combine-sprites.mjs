/**
 * Combines individual animation strip PNGs into a single spritesheet.
 * Each row = one animation, all frames padded to uniform width.
 * Output: a single PNG + frame layout info.
 */
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const INPUT_DIR = process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Temp\\sprites`
    : '/tmp/sprites';
const OUTPUT = 'public/assets/fighters/martial-hero.png';
const FRAME_H = 126;

// Animation order — determines row layout in the final sheet
const ANIMS = ['idle', 'run', 'jump', 'fall', 'attack', 'hit', 'dead'];

async function main() {
    const strips = [];
    let maxWidth = 0;

    for (const name of ANIMS) {
        const path = join(INPUT_DIR, `${name}.png`);
        const meta = await sharp(path).metadata();
        const frames = Math.round(meta.width / FRAME_H);
        strips.push({ name, path, width: meta.width, height: meta.height, frames });
        if (meta.width > maxWidth) maxWidth = meta.width;
        console.log(`  ${name}: ${frames} frames (${meta.width}x${meta.height})`);
    }

    // Max frames in any row
    const maxFrames = Math.max(...strips.map(s => s.frames));
    const sheetWidth = maxFrames * FRAME_H;
    const sheetHeight = ANIMS.length * FRAME_H;

    console.log(`\nSheet: ${sheetWidth}x${sheetHeight} (${maxFrames} cols x ${ANIMS.length} rows)`);

    // Build composite operations
    const composites = [];
    for (let row = 0; row < strips.length; row++) {
        composites.push({
            input: strips[row].path,
            top: row * FRAME_H,
            left: 0,
        });
    }

    await sharp({
        create: {
            width: sheetWidth,
            height: sheetHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(composites)
        .png()
        .toFile(OUTPUT);

    console.log(`\nWritten: ${OUTPUT}`);

    // Print frame index map
    let frameIdx = 0;
    console.log('\nFrame index map:');
    for (const s of strips) {
        const start = frameIdx;
        const end = frameIdx + s.frames - 1;
        console.log(`  ${s.name}: frames ${start}-${end} (${s.frames} frames)`);
        frameIdx += maxFrames; // next row starts at next row offset
    }
}

main().catch(console.error);
