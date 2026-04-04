import { TopState } from './types';
import type { FighterState, AABB } from './types';
import { GRAVITY, FLOOR_Y, STAGE_WIDTH } from './constants';

/** Apply gravity to an airborne fighter. */
export function applyGravity(f: FighterState): void {
    if (f.topState === TopState.Airborne) {
        f.velY += GRAVITY;
    }
}

/** Move fighter by its current velocity. */
export function applyVelocity(f: FighterState): void {
    f.x += f.velX;
    f.y += f.velY;
}

/** Clamp fighter to stage boundaries and handle landing. */
export function clampToStage(f: FighterState, pushbox: AABB): void {
    const halfW = pushbox.width / 2;

    // Horizontal bounds
    if (f.x - halfW < 0) f.x = halfW;
    if (f.x + halfW > STAGE_WIDTH) f.x = STAGE_WIDTH - halfW;

    // Floor landing
    if (f.y >= FLOOR_Y) {
        f.y = FLOOR_Y;
        f.velY = 0;
        if (f.topState === TopState.Airborne) {
            f.topState = TopState.Grounded;
            f.subState = 'idle';
            f.frameInState = 0;
        }
    }
}

/**
 * Separate two overlapping fighters based on their pushboxes.
 * Each fighter is pushed by half the overlap distance.
 */
export function resolvePushboxes(
    f1: FighterState,
    f2: FighterState,
    pushbox: AABB,
): void {
    const halfW = pushbox.width / 2;

    const left1 = f1.x - halfW;
    const right1 = f1.x + halfW;
    const left2 = f2.x - halfW;
    const right2 = f2.x + halfW;

    const overlap = Math.min(right1, right2) - Math.max(left1, left2);

    if (overlap <= 0) return;

    const push = overlap / 2;

    if (f1.x < f2.x) {
        f1.x -= push;
        f2.x += push;
    } else {
        f1.x += push;
        f2.x -= push;
    }
}
