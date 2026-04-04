// ── Stage ────────────────────────────────────────────────────────────
export const STAGE_WIDTH  = 1024;
export const STAGE_HEIGHT = 576;
export const FLOOR_Y      = 520;

// ── Physics ──────────────────────────────────────────────────────────
export const GRAVITY  = 0.6;
export const FIXED_DT = 1000 / 60;   // ~16.667 ms per tick

// ── Rounds ───────────────────────────────────────────────────────────
export const ROUND_TIME      = 99;    // seconds
export const ROUNDS_TO_WIN   = 2;

// ── Combat ───────────────────────────────────────────────────────────
export const HIT_STOP_FRAMES = 6;
export const DEFAULT_HP      = 1000;

// ── Round phases ────────────────────────────────────────────────
export const INTRO_FRAMES = 60;    // 1 second at 60 FPS
export const KO_FRAMES    = 120;   // 2 seconds at 60 FPS
