import { describe, it, expect } from 'vitest';
import { applyGravity, applyVelocity, clampToStage, resolvePushboxes } from '../PhysicsSystem';
import { TopState } from '../types';
import type { FighterState, AABB } from '../types';
import { FLOOR_Y, GRAVITY, STAGE_WIDTH } from '../constants';

function makeFighter(overrides: Partial<FighterState> = {}): FighterState {
    return {
        x: 300, y: 400, velX: 0, velY: 0,
        hp: 1000, facingRight: true,
        topState: TopState.Grounded, subState: 'idle',
        frameInState: 0, currentMove: null,
        hitConfirmed: false, stunDuration: 0,
        hitStopFrames: 0, roundWins: 0,
        ...overrides,
    };
}

const pushbox: AABB = { x: -30, y: -80, width: 60, height: 80 };

describe('applyGravity', () => {
    it('adds gravity to airborne fighter', () => {
        const f = makeFighter({ topState: TopState.Airborne, velY: -5 });
        applyGravity(f);
        expect(f.velY).toBe(-5 + GRAVITY);
    });

    it('does not affect grounded fighter', () => {
        const f = makeFighter({ topState: TopState.Grounded, velY: 0 });
        applyGravity(f);
        expect(f.velY).toBe(0);
    });
});

describe('applyVelocity', () => {
    it('moves fighter by velocity', () => {
        const f = makeFighter({ x: 100, y: 200, velX: 5, velY: -3 });
        applyVelocity(f);
        expect(f.x).toBe(105);
        expect(f.y).toBe(197);
    });
});

describe('clampToStage', () => {
    it('lands fighter on floor and sets grounded', () => {
        const f = makeFighter({
            y: FLOOR_Y + 10,
            velY: 5,
            topState: TopState.Airborne,
            subState: 'jump',
        });
        clampToStage(f, pushbox);
        expect(f.y).toBe(FLOOR_Y);
        expect(f.velY).toBe(0);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
    });

    it('clamps to left stage edge', () => {
        const f = makeFighter({ x: 10 });
        clampToStage(f, pushbox);
        expect(f.x).toBe(pushbox.width / 2);
    });

    it('clamps to right stage edge', () => {
        const f = makeFighter({ x: STAGE_WIDTH - 10 });
        clampToStage(f, pushbox);
        expect(f.x).toBe(STAGE_WIDTH - pushbox.width / 2);
    });
});

describe('resolvePushboxes', () => {
    it('separates overlapping fighters', () => {
        const f1 = makeFighter({ x: 200 });
        const f2 = makeFighter({ x: 230 }); // overlap = 60 - 30 = 30
        resolvePushboxes(f1, f2, pushbox);
        expect(f1.x).toBeLessThan(200);
        expect(f2.x).toBeGreaterThan(230);
        // After resolution, pushboxes should not overlap
        const gap = (f2.x - pushbox.width / 2) - (f1.x + pushbox.width / 2);
        expect(gap).toBeGreaterThanOrEqual(-0.001);
    });

    it('does nothing for non-overlapping fighters', () => {
        const f1 = makeFighter({ x: 100 });
        const f2 = makeFighter({ x: 300 });
        resolvePushboxes(f1, f2, pushbox);
        expect(f1.x).toBe(100);
        expect(f2.x).toBe(300);
    });
});
