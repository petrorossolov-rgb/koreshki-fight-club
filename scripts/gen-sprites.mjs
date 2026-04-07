/**
 * Procedural chibi sprite generator.
 * Phase 2: Skeleton system, animation keyframes, and size scaling.
 *
 * Usage:
 *   node scripts/gen-sprites.mjs [charId]   — generate single character (or all)
 */

// ── Joint hierarchy ─────────────────────────────────────────────────────
// 12 joints: root → hip → torso → head
//                              → armL → handL
//                              → armR → handR
//                  hip → legL → footL
//                      → legR → footR

/** @typedef {'root'|'hip'|'torso'|'head'|'armL'|'handL'|'armR'|'handR'|'legL'|'footL'|'legR'|'footR'} Joint */
/** @typedef {Record<Joint, {x: number, y: number}>} Pose */

export const JOINTS = /** @type {const} */ ([
    'root', 'hip', 'torso', 'head',
    'armL', 'handL', 'armR', 'handR',
    'legL', 'footL', 'legR', 'footR',
]);

// ── Frame / grid constants ──────────────────────────────────────────────
export const FRAME_W = 126;
export const FRAME_H = 126;
export const COLS = 11;
export const ROWS = 7;
export const FEET_Y = 82; // feet anchor in 126px frame (matches FEET_ORIGIN_Y)

// Row → animation mapping (matches existing spritesheet layout)
export const ANIM_ROWS = /** @type {const} */ ({
    idle: { row: 0, frames: 10 },
    run:  { row: 1, frames: 8 },
    jump: { row: 2, frames: 3 },
    fall: { row: 3, frames: 3 },
    attack: { row: 4, frames: 7 },
    hit:  { row: 5, frames: 3 },
    dead: { row: 6, frames: 11 },
});

// ── Pose helpers ────────────────────────────────────────────────────────

/** @returns {Pose} */
function makePose(values) {
    /** @type {any} */
    const pose = {};
    for (const j of JOINTS) {
        pose[j] = values[j] ?? { x: 0, y: 0 };
    }
    return pose;
}

/**
 * Linearly interpolate between two poses with pixel snap.
 * @param {Pose} a
 * @param {Pose} b
 * @param {number} t — 0..1
 * @returns {Pose}
 */
export function interpolatePose(a, b, t) {
    /** @type {any} */
    const result = {};
    for (const j of JOINTS) {
        result[j] = {
            x: Math.round(a[j].x + (b[j].x - a[j].x) * t),
            y: Math.round(a[j].y + (b[j].y - a[j].y) * t),
        };
    }
    return result;
}

/**
 * Generate animation frames by interpolating between keyframes.
 * @param {Array<{frame: number, pose: Pose}>} keyframes — sorted by frame index
 * @param {number} totalFrames
 * @returns {Pose[]}
 */
export function generateAnimFrames(keyframes, totalFrames) {
    const poses = [];
    for (let f = 0; f < totalFrames; f++) {
        // Find surrounding keyframes
        let before = keyframes[0];
        let after = keyframes[keyframes.length - 1];
        for (let k = 0; k < keyframes.length - 1; k++) {
            if (f >= keyframes[k].frame && f <= keyframes[k + 1].frame) {
                before = keyframes[k];
                after = keyframes[k + 1];
                break;
            }
        }
        const span = after.frame - before.frame;
        const t = span === 0 ? 0 : (f - before.frame) / span;
        poses.push(interpolatePose(before.pose, after.pose, t));
    }
    return poses;
}

/**
 * Scale a pose by width/height multipliers.
 * @param {Pose} pose
 * @param {number} sx — width scale
 * @param {number} sy — height scale
 * @param {number} [headScale=1] — extra head radius multiplier
 * @returns {Pose}
 */
export function scalePose(pose, sx, sy, headScale = 1) {
    /** @type {any} */
    const result = {};
    for (const j of JOINTS) {
        result[j] = {
            x: Math.round(pose[j].x * sx),
            y: Math.round(pose[j].y * sy),
        };
    }
    return result;
}

// ── Size categories ─────────────────────────────────────────────────────

export const SIZE_CATEGORIES = {
    standard: { sx: 1.0,  sy: 1.0,  headScale: 1.0 },
    big:      { sx: 1.35, sy: 1.30, headScale: 1.0 },
    tall:     { sx: 1.05, sy: 1.20, headScale: 1.0 },
    short:    { sx: 0.95, sy: 0.82, headScale: 1.10 },
};

// ── Base keyframe poses ─────────────────────────────────────────────────
// All coordinates relative to root (feet anchor at 0,0).
// Y-axis: negative = up (screen coords), positive = down.
// Standard body: ~60px tall from feet to head top.

// Standing neutral pose
const STAND = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -25 },
    torso: { x: 0, y: -38 },
    head:  { x: 0, y: -52 },
    armL:  { x: -8, y: -38 },
    handL: { x: -12, y: -25 },
    armR:  { x: 8, y: -38 },
    handR: { x: 12, y: -25 },
    legL:  { x: -5, y: -12 },
    footL: { x: -5, y: 0 },
    legR:  { x: 5, y: -12 },
    footR: { x: 5, y: 0 },
});

// ── IDLE animation (10 frames) ─────────────────────────────────
// Subtle breathing bob: slight torso rise and arm sway
const IDLE_UP = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -25 },
    torso: { x: 0, y: -40 },
    head:  { x: 0, y: -54 },
    armL:  { x: -9, y: -39 },
    handL: { x: -14, y: -27 },
    armR:  { x: 9, y: -39 },
    handR: { x: 14, y: -27 },
    legL:  { x: -5, y: -12 },
    footL: { x: -5, y: 0 },
    legR:  { x: 5, y: -12 },
    footR: { x: 5, y: 0 },
});

export const IDLE_KEYFRAMES = [
    { frame: 0, pose: STAND },
    { frame: 3, pose: IDLE_UP },
    { frame: 7, pose: STAND },
    { frame: 9, pose: STAND },
];

// ── RUN animation (8 frames) ───────────────────────────────────
const RUN_0 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -24 },
    torso: { x: 2, y: -37 },
    head:  { x: 3, y: -51 },
    armL:  { x: -6, y: -36 },
    handL: { x: -2, y: -24 },
    armR:  { x: 6, y: -37 },
    handR: { x: 14, y: -28 },
    legL:  { x: -8, y: -12 },
    footL: { x: -12, y: 0 },
    legR:  { x: 6, y: -14 },
    footR: { x: 14, y: -4 },
});

const RUN_1 = makePose({
    root:  { x: 0, y: -2 },
    hip:   { x: 0, y: -26 },
    torso: { x: 2, y: -39 },
    head:  { x: 3, y: -53 },
    armL:  { x: -6, y: -38 },
    handL: { x: -14, y: -30 },
    armR:  { x: 6, y: -38 },
    handR: { x: 2, y: -26 },
    legL:  { x: -3, y: -14 },
    footL: { x: -3, y: -2 },
    legR:  { x: 3, y: -14 },
    footR: { x: 3, y: -2 },
});

const RUN_2 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -24 },
    torso: { x: 2, y: -37 },
    head:  { x: 3, y: -51 },
    armL:  { x: -6, y: -37 },
    handL: { x: -14, y: -28 },
    armR:  { x: 6, y: -36 },
    handR: { x: -2, y: -24 },
    legL:  { x: 6, y: -14 },
    footL: { x: 14, y: -4 },
    legR:  { x: -8, y: -12 },
    footR: { x: -12, y: 0 },
});

const RUN_3 = makePose({
    root:  { x: 0, y: -2 },
    hip:   { x: 0, y: -26 },
    torso: { x: 2, y: -39 },
    head:  { x: 3, y: -53 },
    armL:  { x: -6, y: -38 },
    handL: { x: 2, y: -26 },
    armR:  { x: 6, y: -38 },
    handR: { x: -14, y: -30 },
    legL:  { x: 3, y: -14 },
    footL: { x: 3, y: -2 },
    legR:  { x: -3, y: -14 },
    footR: { x: -3, y: -2 },
});

export const RUN_KEYFRAMES = [
    { frame: 0, pose: RUN_0 },
    { frame: 2, pose: RUN_1 },
    { frame: 4, pose: RUN_2 },
    { frame: 6, pose: RUN_3 },
];

// ── JUMP animation (3 frames) ──────────────────────────────────
const JUMP_0 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -22 },
    torso: { x: 0, y: -35 },
    head:  { x: 0, y: -49 },
    armL:  { x: -10, y: -36 },
    handL: { x: -14, y: -44 },
    armR:  { x: 10, y: -36 },
    handR: { x: 14, y: -44 },
    legL:  { x: -6, y: -10 },
    footL: { x: -8, y: 0 },
    legR:  { x: 6, y: -10 },
    footR: { x: 8, y: 0 },
});

const JUMP_1 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -26 },
    torso: { x: 0, y: -40 },
    head:  { x: 0, y: -55 },
    armL:  { x: -10, y: -42 },
    handL: { x: -16, y: -52 },
    armR:  { x: 10, y: -42 },
    handR: { x: 16, y: -52 },
    legL:  { x: -6, y: -16 },
    footL: { x: -8, y: -6 },
    legR:  { x: 6, y: -16 },
    footR: { x: 8, y: -6 },
});

const JUMP_2 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -28 },
    torso: { x: 0, y: -42 },
    head:  { x: 0, y: -57 },
    armL:  { x: -12, y: -44 },
    handL: { x: -18, y: -52 },
    armR:  { x: 12, y: -44 },
    handR: { x: 18, y: -52 },
    legL:  { x: -5, y: -18 },
    footL: { x: -6, y: -10 },
    legR:  { x: 5, y: -18 },
    footR: { x: 6, y: -10 },
});

export const JUMP_KEYFRAMES = [
    { frame: 0, pose: JUMP_0 },
    { frame: 1, pose: JUMP_1 },
    { frame: 2, pose: JUMP_2 },
];

// ── FALL animation (3 frames) ──────────────────────────────────
const FALL_0 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -26 },
    torso: { x: 0, y: -39 },
    head:  { x: 0, y: -53 },
    armL:  { x: -10, y: -40 },
    handL: { x: -16, y: -34 },
    armR:  { x: 10, y: -40 },
    handR: { x: 16, y: -34 },
    legL:  { x: -5, y: -14 },
    footL: { x: -7, y: -4 },
    legR:  { x: 5, y: -14 },
    footR: { x: 7, y: -4 },
});

const FALL_1 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 0, y: -24 },
    torso: { x: 0, y: -37 },
    head:  { x: 0, y: -51 },
    armL:  { x: -10, y: -38 },
    handL: { x: -16, y: -30 },
    armR:  { x: 10, y: -38 },
    handR: { x: 16, y: -30 },
    legL:  { x: -5, y: -12 },
    footL: { x: -7, y: -2 },
    legR:  { x: 5, y: -12 },
    footR: { x: 7, y: -2 },
});

export const FALL_KEYFRAMES = [
    { frame: 0, pose: FALL_0 },
    { frame: 2, pose: FALL_1 },
];

// ── ATTACK animation (7 frames) ────────────────────────────────
// Windup → punch forward → recovery
const ATK_WINDUP = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -2, y: -25 },
    torso: { x: -2, y: -38 },
    head:  { x: -1, y: -52 },
    armL:  { x: -10, y: -38 },
    handL: { x: -16, y: -28 },
    armR:  { x: 4, y: -38 },
    handR: { x: -4, y: -32 },
    legL:  { x: -6, y: -12 },
    footL: { x: -8, y: 0 },
    legR:  { x: 5, y: -12 },
    footR: { x: 5, y: 0 },
});

const ATK_STRIKE = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 2, y: -25 },
    torso: { x: 4, y: -38 },
    head:  { x: 5, y: -52 },
    armL:  { x: -6, y: -38 },
    handL: { x: -10, y: -26 },
    armR:  { x: 10, y: -40 },
    handR: { x: 26, y: -38 },
    legL:  { x: -5, y: -12 },
    footL: { x: -5, y: 0 },
    legR:  { x: 8, y: -12 },
    footR: { x: 10, y: 0 },
});

const ATK_HOLD = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: 2, y: -25 },
    torso: { x: 4, y: -37 },
    head:  { x: 5, y: -51 },
    armL:  { x: -6, y: -37 },
    handL: { x: -10, y: -25 },
    armR:  { x: 10, y: -39 },
    handR: { x: 24, y: -36 },
    legL:  { x: -5, y: -12 },
    footL: { x: -5, y: 0 },
    legR:  { x: 7, y: -12 },
    footR: { x: 9, y: 0 },
});

export const ATTACK_KEYFRAMES = [
    { frame: 0, pose: ATK_WINDUP },
    { frame: 2, pose: ATK_STRIKE },
    { frame: 4, pose: ATK_HOLD },
    { frame: 6, pose: STAND },
];

// ── HIT animation (3 frames) ───────────────────────────────────
// Recoil backward
const HIT_0 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -3, y: -24 },
    torso: { x: -5, y: -36 },
    head:  { x: -6, y: -50 },
    armL:  { x: -12, y: -34 },
    handL: { x: -16, y: -22 },
    armR:  { x: 4, y: -34 },
    handR: { x: 8, y: -22 },
    legL:  { x: -4, y: -12 },
    footL: { x: -4, y: 0 },
    legR:  { x: 6, y: -12 },
    footR: { x: 8, y: 0 },
});

const HIT_1 = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -4, y: -23 },
    torso: { x: -7, y: -35 },
    head:  { x: -8, y: -48 },
    armL:  { x: -14, y: -33 },
    handL: { x: -18, y: -20 },
    armR:  { x: 2, y: -33 },
    handR: { x: 6, y: -20 },
    legL:  { x: -4, y: -11 },
    footL: { x: -4, y: 0 },
    legR:  { x: 7, y: -11 },
    footR: { x: 10, y: 0 },
});

export const HIT_KEYFRAMES = [
    { frame: 0, pose: HIT_0 },
    { frame: 2, pose: HIT_1 },
];

// ── DEAD animation (11 frames) ─────────────────────────────────
// Fall backward + comedic bounce (Humor-Driven Design)
const DEAD_STAND = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -3, y: -23 },
    torso: { x: -6, y: -35 },
    head:  { x: -8, y: -48 },
    armL:  { x: -14, y: -33 },
    handL: { x: -18, y: -20 },
    armR:  { x: 2, y: -33 },
    handR: { x: 6, y: -20 },
    legL:  { x: -4, y: -11 },
    footL: { x: -4, y: 0 },
    legR:  { x: 7, y: -11 },
    footR: { x: 10, y: 0 },
});

const DEAD_FALLING = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -8, y: -16 },
    torso: { x: -14, y: -22 },
    head:  { x: -18, y: -28 },
    armL:  { x: -20, y: -18 },
    handL: { x: -24, y: -10 },
    armR:  { x: -8, y: -18 },
    handR: { x: -4, y: -10 },
    legL:  { x: -2, y: -8 },
    footL: { x: 4, y: 0 },
    legR:  { x: 8, y: -8 },
    footR: { x: 14, y: 0 },
});

const DEAD_GROUND = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -10, y: -6 },
    torso: { x: -18, y: -8 },
    head:  { x: -26, y: -10 },
    armL:  { x: -22, y: -4 },
    handL: { x: -28, y: 0 },
    armR:  { x: -14, y: -4 },
    handR: { x: -8, y: 0 },
    legL:  { x: 0, y: -4 },
    footL: { x: 8, y: 0 },
    legR:  { x: 10, y: -4 },
    footR: { x: 18, y: 0 },
});

// Comedic bounce — slight lift then settle
const DEAD_BOUNCE = makePose({
    root:  { x: 0, y: 0 },
    hip:   { x: -10, y: -10 },
    torso: { x: -18, y: -14 },
    head:  { x: -26, y: -18 },
    armL:  { x: -24, y: -10 },
    handL: { x: -30, y: -4 },
    armR:  { x: -14, y: -10 },
    handR: { x: -8, y: -4 },
    legL:  { x: 0, y: -6 },
    footL: { x: 8, y: -2 },
    legR:  { x: 10, y: -6 },
    footR: { x: 18, y: -2 },
});

export const DEAD_KEYFRAMES = [
    { frame: 0, pose: DEAD_STAND },
    { frame: 3, pose: DEAD_FALLING },
    { frame: 6, pose: DEAD_GROUND },
    { frame: 8, pose: DEAD_BOUNCE },
    { frame: 10, pose: DEAD_GROUND },
];

// ── All animation definitions ───────────────────────────────────

export const ANIMATIONS = {
    idle:   { keyframes: IDLE_KEYFRAMES,   totalFrames: ANIM_ROWS.idle.frames },
    run:    { keyframes: RUN_KEYFRAMES,    totalFrames: ANIM_ROWS.run.frames },
    jump:   { keyframes: JUMP_KEYFRAMES,   totalFrames: ANIM_ROWS.jump.frames },
    fall:   { keyframes: FALL_KEYFRAMES,   totalFrames: ANIM_ROWS.fall.frames },
    attack: { keyframes: ATTACK_KEYFRAMES, totalFrames: ANIM_ROWS.attack.frames },
    hit:    { keyframes: HIT_KEYFRAMES,    totalFrames: ANIM_ROWS.hit.frames },
    dead:   { keyframes: DEAD_KEYFRAMES,   totalFrames: ANIM_ROWS.dead.frames },
};

/**
 * Generate all poses for an animation, with size scaling applied.
 * @param {string} animName
 * @param {keyof typeof SIZE_CATEGORIES} category
 * @returns {Pose[]}
 */
export function generateScaledAnimFrames(animName, category = 'standard') {
    const anim = ANIMATIONS[animName];
    if (!anim) throw new Error(`Unknown animation: ${animName}`);
    const { sx, sy, headScale } = SIZE_CATEGORIES[category] ?? SIZE_CATEGORIES.standard;
    const basePoses = generateAnimFrames(anim.keyframes, anim.totalFrames);
    return basePoses.map(p => scalePose(p, sx, sy, headScale));
}
