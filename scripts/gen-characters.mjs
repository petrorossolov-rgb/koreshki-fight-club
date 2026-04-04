#!/usr/bin/env node
/**
 * One-time generator: creates 17 character JSON configs from manifest.json.
 * Run: node scripts/gen-characters.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHARS_DIR = join(__dirname, '..', 'public', 'data', 'characters');

const manifest = JSON.parse(readFileSync(join(CHARS_DIR, 'manifest.json'), 'utf8'));

// Shared animations block (same spritesheet layout for all characters)
const animations = {
  idle:   { key: "idle",   frameStart: 0,  frameEnd: 9,  frameRate: 10, repeat: -1 },
  run:    { key: "run",    frameStart: 11, frameEnd: 18, frameRate: 12, repeat: -1 },
  jump:   { key: "jump",   frameStart: 22, frameEnd: 24, frameRate: 8,  repeat: 0 },
  fall:   { key: "fall",   frameStart: 33, frameEnd: 35, frameRate: 8,  repeat: -1 },
  crouch: { key: "crouch", frameStart: 33, frameEnd: 33, frameRate: 1,  repeat: 0 },
  attack: { key: "attack", frameStart: 44, frameEnd: 50, frameRate: 14, repeat: 0 },
  hit:    { key: "hit",    frameStart: 55, frameEnd: 57, frameRate: 10, repeat: 0 },
  dead:   { key: "dead",   frameStart: 66, frameEnd: 76, frameRate: 10, repeat: 0 },
};

// Category-based stat presets
// | Category | scale | walkSpeed | jumpVelY | weight | maxHp | Punch dmg/s/a/r | Kick dmg/s/a/r |
const CATEGORY_PRESETS = {
  big: {
    scale: 1.25, walkSpeed: 2.8, jumpVelY: -10, weight: 1.4, maxHp: 1100,
    pushbox: { x: -28, y: -112, width: 56, height: 112 },
    hurtbox: { x: -25, y: -106, width: 50, height: 106 },
    punch: { damage: 110, startup: 4, active: 2, recovery: 6, hitbox: { x: 30, y: -60, width: 55, height: 35 }, knockbackX: 5, knockbackY: -2, hitStunFrames: 14, blockStunFrames: 9 },
    kick:  { damage: 160, startup: 6, active: 3, recovery: 9, hitbox: { x: 25, y: -40, width: 65, height: 45 }, knockbackX: 7, knockbackY: -3, hitStunFrames: 18, blockStunFrames: 11 },
  },
  tall: {
    scale: 1.15, walkSpeed: 3.5, jumpVelY: -11, weight: 1.1, maxHp: 1100,
    pushbox: { x: -25, y: -103, width: 50, height: 103 },
    hurtbox: { x: -23, y: -98, width: 46, height: 98 },
    punch: { damage: 95, startup: 3, active: 2, recovery: 5, hitbox: { x: 30, y: -55, width: 52, height: 32 }, knockbackX: 4, knockbackY: -2, hitStunFrames: 13, blockStunFrames: 8 },
    kick:  { damage: 140, startup: 5, active: 3, recovery: 8, hitbox: { x: 25, y: -35, width: 62, height: 42 }, knockbackX: 6, knockbackY: -3, hitStunFrames: 16, blockStunFrames: 10 },
  },
  standard: {
    scale: 1.0, walkSpeed: 3.5, jumpVelY: -11, weight: 1.0, maxHp: 1000,
    pushbox: { x: -22, y: -90, width: 44, height: 90 },
    hurtbox: { x: -20, y: -85, width: 40, height: 85 },
    punch: { damage: 90, startup: 3, active: 2, recovery: 5, hitbox: { x: 30, y: -50, width: 50, height: 30 }, knockbackX: 4, knockbackY: -2, hitStunFrames: 12, blockStunFrames: 8 },
    kick:  { damage: 130, startup: 5, active: 3, recovery: 8, hitbox: { x: 25, y: -30, width: 60, height: 40 }, knockbackX: 6, knockbackY: -3, hitStunFrames: 16, blockStunFrames: 10 },
  },
  short: {
    scale: 0.85, walkSpeed: 5.0, jumpVelY: -13, weight: 0.8, maxHp: 1000,
    pushbox: { x: -19, y: -77, width: 38, height: 77 },
    hurtbox: { x: -17, y: -72, width: 34, height: 72 },
    punch: { damage: 65, startup: 2, active: 2, recovery: 4, hitbox: { x: 30, y: -45, width: 45, height: 28 }, knockbackX: 3, knockbackY: -2, hitStunFrames: 10, blockStunFrames: 7 },
    kick:  { damage: 100, startup: 4, active: 3, recovery: 7, hitbox: { x: 25, y: -25, width: 55, height: 35 }, knockbackX: 5, knockbackY: -3, hitStunFrames: 14, blockStunFrames: 9 },
  },
};

// Standard sub-variants based on stats
// standard-strong (7/5-6): slightly more damage, slightly slower
// standard-balanced (6/7): slightly less damage, slightly faster
function getStandardVariant(stats) {
  if (stats.power >= 7) return 'strong';
  return 'balanced';
}

function applyStandardVariant(preset, variant) {
  if (variant === 'strong') {
    return { ...preset, walkSpeed: 3.5 };
  }
  // balanced: faster, slightly less damage
  return {
    ...preset,
    walkSpeed: 4.2,
    jumpVelY: -12,
    punch: { ...preset.punch, damage: 80 },
    kick: { ...preset.kick, damage: 120 },
  };
}

let generated = 0;

for (const entry of manifest.characters) {
  let preset = CATEGORY_PRESETS[entry.category];
  if (!preset) {
    console.error(`Unknown category "${entry.category}" for ${entry.id}`);
    process.exit(1);
  }

  // Apply standard sub-variant
  if (entry.category === 'standard') {
    const variant = getStandardVariant(entry.stats);
    preset = applyStandardVariant(preset, variant);
  }

  const config = {
    id: entry.id,
    name: entry.id,
    displayName: entry.displayName,
    spriteSheet: "assets/fighters/martial-hero.png",
    frameWidth: 126,
    frameHeight: 126,
    animations,
    moves: {
      punch: { name: "punch", ...preset.punch },
      kick:  { name: "kick",  ...preset.kick },
    },
    pushbox: preset.pushbox,
    hurtbox: preset.hurtbox,
    walkSpeed: preset.walkSpeed,
    jumpVelY: preset.jumpVelY,
    weight: preset.weight,
    description: entry.description,
    nickname: entry.nickname,
    scale: preset.scale,
    tint: entry.tint,
    portraitFrame: 0,
    maxHp: preset.maxHp,
  };

  const outPath = join(CHARS_DIR, `${entry.id}.json`);
  writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n');
  generated++;
  console.log(`  ✓ ${entry.id}.json (${entry.category})`);
}

console.log(`\nGenerated ${generated} character configs.`);
