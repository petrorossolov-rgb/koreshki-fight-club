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
  punch:  { key: "punch",  frameStart: 44, frameEnd: 48, frameRate: 20, repeat: 0 },
  kick:   { key: "kick",   frameStart: 44, frameEnd: 50, frameRate: 12, repeat: 0 },
  special:{ key: "special",frameStart: 44, frameEnd: 50, frameRate: 10, repeat: 0 },
  hit:    { key: "hit",    frameStart: 55, frameEnd: 57, frameRate: 10, repeat: 0 },
  dead:   { key: "dead",   frameStart: 66, frameEnd: 76, frameRate: 10, repeat: 0 },
};

// Category-based stat presets
// | Category | scale | walkSpeed | jumpVelY | weight | maxHp | Punch dmg/s/a/r | Kick dmg/s/a/r |
const CATEGORY_PRESETS = {
  big: {
    scale: 1.25, walkSpeed: 2.8, jumpVelY: -10, weight: 1.4, maxHp: 1100, groundOffset: 0,
    specialCooldownFrames: 300,
    pushbox: { x: -28, y: -112, width: 56, height: 112 },
    hurtbox: { x: -25, y: -106, width: 50, height: 106 },
    punch:      { damage: 110, startup: 4, active: 2, recovery: 6, hitbox: { x: 30, y: -60, width: 55, height: 35 }, knockbackX: 5, knockbackY: -2, hitStunFrames: 14, blockStunFrames: 9 },
    kick:       { damage: 160, startup: 6, active: 3, recovery: 9, hitbox: { x: 25, y: -40, width: 65, height: 45 }, knockbackX: 7, knockbackY: -3, hitStunFrames: 18, blockStunFrames: 11 },
    special:    { damage: 220, startup: 8, active: 3, recovery: 12, hitbox: { x: 25, y: -70, width: 70, height: 50 }, knockbackX: 10, knockbackY: -5, hitStunFrames: 24, blockStunFrames: 14 },
    crouchPunch:{ damage: 70, startup: 3, active: 2, recovery: 5, hitbox: { x: 30, y: -20, width: 50, height: 25 }, knockbackX: 3, knockbackY: 0, hitStunFrames: 10, blockStunFrames: 7 },
    crouchKick: { damage: 120, startup: 5, active: 3, recovery: 8, hitbox: { x: 25, y: -15, width: 65, height: 30 }, knockbackX: 5, knockbackY: 0, hitStunFrames: 14, blockStunFrames: 9 },
    jumpPunch:  { damage: 80, startup: 3, active: 3, recovery: 5, hitbox: { x: 28, y: -55, width: 48, height: 35 }, knockbackX: 3, knockbackY: -2, hitStunFrames: 12, blockStunFrames: 8 },
    jumpKick:   { damage: 130, startup: 5, active: 4, recovery: 6, hitbox: { x: 20, y: -30, width: 55, height: 45 }, knockbackX: 5, knockbackY: 4, hitStunFrames: 16, blockStunFrames: 10 },
    chainRoutes: [
      // P→K, K→P
      { from: 'punch', to: 'kick' },
      { from: 'kick', to: 'punch' },
    ],
  },
  tall: {
    scale: 1.15, walkSpeed: 3.5, jumpVelY: -11, weight: 1.1, maxHp: 1100, groundOffset: 0,
    specialCooldownFrames: 240,
    pushbox: { x: -25, y: -103, width: 50, height: 103 },
    hurtbox: { x: -23, y: -98, width: 46, height: 98 },
    punch:      { damage: 95, startup: 3, active: 2, recovery: 5, hitbox: { x: 30, y: -55, width: 52, height: 32 }, knockbackX: 4, knockbackY: -2, hitStunFrames: 13, blockStunFrames: 8 },
    kick:       { damage: 140, startup: 5, active: 3, recovery: 8, hitbox: { x: 25, y: -35, width: 62, height: 42 }, knockbackX: 6, knockbackY: -3, hitStunFrames: 16, blockStunFrames: 10 },
    special:    { damage: 190, startup: 7, active: 3, recovery: 10, hitbox: { x: 28, y: -65, width: 65, height: 45 }, knockbackX: 9, knockbackY: -4, hitStunFrames: 22, blockStunFrames: 13 },
    crouchPunch:{ damage: 55, startup: 3, active: 2, recovery: 4, hitbox: { x: 30, y: -18, width: 48, height: 24 }, knockbackX: 3, knockbackY: 0, hitStunFrames: 9, blockStunFrames: 6 },
    crouchKick: { damage: 100, startup: 5, active: 3, recovery: 7, hitbox: { x: 25, y: -14, width: 60, height: 28 }, knockbackX: 5, knockbackY: 0, hitStunFrames: 13, blockStunFrames: 8 },
    jumpPunch:  { damage: 70, startup: 3, active: 3, recovery: 5, hitbox: { x: 28, y: -50, width: 46, height: 32 }, knockbackX: 3, knockbackY: -2, hitStunFrames: 11, blockStunFrames: 7 },
    jumpKick:   { damage: 110, startup: 5, active: 4, recovery: 6, hitbox: { x: 20, y: -28, width: 52, height: 40 }, knockbackX: 5, knockbackY: 4, hitStunFrames: 14, blockStunFrames: 9 },
    chainRoutes: [
      // P→K, P→P
      { from: 'punch', to: 'kick' },
      { from: 'punch', to: 'punch' },
    ],
  },
  standard: {
    scale: 1.0, walkSpeed: 3.5, jumpVelY: -11, weight: 1.0, maxHp: 1000, groundOffset: 0,
    specialCooldownFrames: 240,
    pushbox: { x: -22, y: -90, width: 44, height: 90 },
    hurtbox: { x: -20, y: -85, width: 40, height: 85 },
    punch:      { damage: 90, startup: 3, active: 2, recovery: 5, hitbox: { x: 30, y: -50, width: 50, height: 30 }, knockbackX: 4, knockbackY: -2, hitStunFrames: 12, blockStunFrames: 8 },
    kick:       { damage: 130, startup: 5, active: 3, recovery: 8, hitbox: { x: 25, y: -30, width: 60, height: 40 }, knockbackX: 6, knockbackY: -3, hitStunFrames: 16, blockStunFrames: 10 },
    special:    { damage: 180, startup: 7, active: 3, recovery: 10, hitbox: { x: 28, y: -58, width: 60, height: 42 }, knockbackX: 8, knockbackY: -4, hitStunFrames: 20, blockStunFrames: 12 },
    crouchPunch:{ damage: 50, startup: 2, active: 2, recovery: 4, hitbox: { x: 30, y: -16, width: 45, height: 22 }, knockbackX: 2, knockbackY: 0, hitStunFrames: 8, blockStunFrames: 6 },
    crouchKick: { damage: 90, startup: 4, active: 3, recovery: 7, hitbox: { x: 25, y: -12, width: 58, height: 26 }, knockbackX: 4, knockbackY: 0, hitStunFrames: 12, blockStunFrames: 8 },
    jumpPunch:  { damage: 65, startup: 3, active: 3, recovery: 5, hitbox: { x: 28, y: -45, width: 44, height: 30 }, knockbackX: 3, knockbackY: -2, hitStunFrames: 10, blockStunFrames: 7 },
    jumpKick:   { damage: 100, startup: 5, active: 4, recovery: 6, hitbox: { x: 20, y: -25, width: 50, height: 38 }, knockbackX: 5, knockbackY: 4, hitStunFrames: 14, blockStunFrames: 9 },
    chainRoutes: [
      // P→K, P→P
      { from: 'punch', to: 'kick' },
      { from: 'punch', to: 'punch' },
    ],
  },
  short: {
    scale: 0.85, walkSpeed: 5.0, jumpVelY: -13, weight: 0.8, maxHp: 1000, groundOffset: 0,
    specialCooldownFrames: 180,
    pushbox: { x: -19, y: -77, width: 38, height: 77 },
    hurtbox: { x: -17, y: -72, width: 34, height: 72 },
    punch:      { damage: 65, startup: 2, active: 2, recovery: 4, hitbox: { x: 30, y: -45, width: 45, height: 28 }, knockbackX: 3, knockbackY: -2, hitStunFrames: 10, blockStunFrames: 7 },
    kick:       { damage: 100, startup: 4, active: 3, recovery: 7, hitbox: { x: 25, y: -25, width: 55, height: 35 }, knockbackX: 5, knockbackY: -3, hitStunFrames: 14, blockStunFrames: 9 },
    special:    { damage: 150, startup: 6, active: 3, recovery: 9, hitbox: { x: 28, y: -50, width: 55, height: 38 }, knockbackX: 7, knockbackY: -3, hitStunFrames: 18, blockStunFrames: 11 },
    crouchPunch:{ damage: 40, startup: 2, active: 2, recovery: 3, hitbox: { x: 30, y: -14, width: 42, height: 20 }, knockbackX: 2, knockbackY: 0, hitStunFrames: 7, blockStunFrames: 5 },
    crouchKick: { damage: 75, startup: 3, active: 3, recovery: 6, hitbox: { x: 25, y: -10, width: 55, height: 24 }, knockbackX: 4, knockbackY: 0, hitStunFrames: 10, blockStunFrames: 7 },
    jumpPunch:  { damage: 50, startup: 2, active: 3, recovery: 4, hitbox: { x: 28, y: -40, width: 40, height: 26 }, knockbackX: 2, knockbackY: -2, hitStunFrames: 9, blockStunFrames: 6 },
    jumpKick:   { damage: 80, startup: 4, active: 4, recovery: 5, hitbox: { x: 20, y: -22, width: 48, height: 34 }, knockbackX: 4, knockbackY: 4, hitStunFrames: 12, blockStunFrames: 8 },
    chainRoutes: [
      // P→K, P→P, K→P (3 routes, wide windows for rushdown)
      { from: 'punch', to: 'kick' },
      { from: 'punch', to: 'punch' },
      { from: 'kick', to: 'punch' },
    ],
  },
};

// Per-character special move names (humorous inside jokes)
const SPECIAL_NAMES = {
  'petyaj':         'Подача Судьбы',          // volleyball serve from above
  'denis':          'Ctrl+Alt+Delete',        // IT + hockey crossover
  'serega-bigi':    'Медвежьи Объятия',       // bear hug of doom
  'vlad':           'Кирпич Возмездия',       // brick of retribution
  'vadim':          'Фристайл Фаталити',      // rap freestyle KO
  'leha':           'Двойка с Разворотом',    // teacher's F grade + roundhouse
  'zhenek':         'Распродажа Боли',        // pain clearance sale
  'sanek':          'Хохот Грифона',          // laughing griffon slam
  'kirill':         'Пиксельный Удар',        // designer's pixel-perfect hit
  'valera':         'Лавина',                 // mountain avalanche
  'diman':          'Щучий Хук',              // pike fish hook
  'antoha':         'Пенальти в Лицо',        // penalty kick to the face
  'ali':            'Жало Пчелы',             // bee sting (Ali reference)
  'serega-ermaque': 'Бас-Дроп',              // bass drop beatdown
  'timur':          'Мош-Пит',                // mosh pit slam
  'kostyan':        'Бэксайд 900',            // snowboard trick attack
  'petro':          'Короткое Замыкание',     // short circuit shock
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
    special: { ...preset.special, damage: 160 },
  };
}

/** Build cancelWindow from move frame data: [startup + active, startup + active + recovery - 2] */
function buildCancelWindow(moves, from) {
  const m = moves[from];
  if (!m) return [0, 0];
  const earliest = m.startup + m.active;
  const latest = m.startup + m.active + m.recovery - 2;
  return [earliest, latest];
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

  const specialName = SPECIAL_NAMES[entry.id] || 'special';

  const moves = {
    punch:       { name: "punch", ...preset.punch },
    kick:        { name: "kick",  ...preset.kick },
    special:     { name: specialName, ...preset.special },
    crouchPunch: { name: "crouchPunch", ...preset.crouchPunch },
    crouchKick:  { name: "crouchKick",  ...preset.crouchKick },
    jumpPunch:   { name: "jumpPunch",   ...preset.jumpPunch },
    jumpKick:    { name: "jumpKick",    ...preset.jumpKick },
  };

  // Build chainRoutes with cancelWindows derived from move frame data
  const chainRoutes = (preset.chainRoutes || []).map(route => ({
    from: route.from,
    to: route.to,
    cancelWindow: buildCancelWindow(moves, route.from),
    onHitOnly: false,
  }));

  const config = {
    id: entry.id,
    name: entry.id,
    displayName: entry.displayName,
    spriteSheet: `assets/fighters/${entry.id}.png`,
    frameWidth: 126,
    frameHeight: 126,
    animations,
    moves,
    pushbox: preset.pushbox,
    hurtbox: preset.hurtbox,
    walkSpeed: preset.walkSpeed,
    jumpVelY: preset.jumpVelY,
    weight: preset.weight,
    description: entry.description,
    nickname: entry.nickname,
    scale: 1.0,
    tint: 0xFFFFFF,
    portraitFrame: 0,
    maxHp: preset.maxHp,
    groundOffset: preset.groundOffset,
    chainRoutes,
    specialCooldownFrames: preset.specialCooldownFrames,
  };

  const outPath = join(CHARS_DIR, `${entry.id}.json`);
  writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n');
  generated++;
  console.log(`  ✓ ${entry.id}.json (${entry.category})`);
}

console.log(`\nGenerated ${generated} character configs.`);
