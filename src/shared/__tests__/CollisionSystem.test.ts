import { describe, it, expect } from 'vitest';
import { aabbOverlap, getWorldHitbox, getWorldHurtbox, checkHit } from '../CollisionSystem';
import { TopState } from '@shared/types';
import type { AABB, FighterState, CharacterConfig } from '@shared/types';

function makeFighter(overrides: Partial<FighterState> = {}): FighterState {
    return {
        x: 300, y: 520, velX: 0, velY: 0,
        hp: 1000, facingRight: true,
        topState: TopState.Grounded, subState: 'idle',
        frameInState: 0, currentMove: null,
        hitConfirmed: false, stunDuration: 0,
        hitStopFrames: 0, roundWins: 0,
        ...overrides,
    };
}

const cfg: CharacterConfig = {
    id: 'test', name: 'Test', displayName: 'Test Fighter',
    spriteSheet: 'test.png', frameWidth: 200, frameHeight: 200,
    animations: {},
    moves: {
        punch: {
            name: 'punch', damage: 80,
            startup: 3, active: 2, recovery: 5,
            hitbox: { x: 30, y: -50, width: 50, height: 30 },
            knockbackX: 4, knockbackY: -2,
            hitStunFrames: 12, blockStunFrames: 8,
        },
    },
    pushbox: { x: -30, y: -80, width: 60, height: 80 },
    hurtbox: { x: -20, y: -85, width: 40, height: 85 },
    walkSpeed: 4, jumpVelY: -12, weight: 1,
    description: 'Test', nickname: 'Tester', scale: 1, tint: 0xFFFFFF, portraitFrame: 0, maxHp: 1000,
};

describe('CollisionSystem', () => {
    describe('aabbOverlap', () => {
        it('returns true for overlapping AABBs', () => {
            const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
            const b: AABB = { x: 5, y: 5, width: 10, height: 10 };
            expect(aabbOverlap(a, b)).toBe(true);
        });

        it('returns false for non-overlapping AABBs', () => {
            const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
            const b: AABB = { x: 20, y: 20, width: 10, height: 10 };
            expect(aabbOverlap(a, b)).toBe(false);
        });

        it('returns false for touching edges (no overlap)', () => {
            const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
            const b: AABB = { x: 10, y: 0, width: 10, height: 10 };
            expect(aabbOverlap(a, b)).toBe(false);
        });
    });

    describe('getWorldHitbox', () => {
        it('returns null when no currentMove', () => {
            const f = makeFighter();
            expect(getWorldHitbox(f, cfg)).toBeNull();
        });

        it('returns null during startup frames', () => {
            const f = makeFighter({ currentMove: 'punch', frameInState: 1 });
            expect(getWorldHitbox(f, cfg)).toBeNull();
        });

        it('returns hitbox during active frames (facing right)', () => {
            const f = makeFighter({ currentMove: 'punch', frameInState: 3 }); // startup=3, so frame 3 is first active
            const hb = getWorldHitbox(f, cfg);
            expect(hb).not.toBeNull();
            // x=300 + 30=330, y=520 + (-50)=470
            expect(hb!.x).toBe(330);
            expect(hb!.y).toBe(470);
            expect(hb!.width).toBe(50);
            expect(hb!.height).toBe(30);
        });

        it('returns flipped hitbox when facing left', () => {
            const f = makeFighter({ currentMove: 'punch', frameInState: 3, facingRight: false });
            const hb = getWorldHitbox(f, cfg);
            expect(hb).not.toBeNull();
            // x=300 + 30*(-1)=270, then facingRight=false: 270 - 50 = 220
            expect(hb!.x).toBe(220);
            expect(hb!.y).toBe(470);
        });

        it('returns null during recovery frames', () => {
            const f = makeFighter({ currentMove: 'punch', frameInState: 5 }); // startup=3 + active=2 = 5 -> recovery
            expect(getWorldHitbox(f, cfg)).toBeNull();
        });
    });

    describe('getWorldHurtbox', () => {
        it('returns world-space hurtbox facing right', () => {
            const f = makeFighter({ x: 400, y: 520 });
            const hb = getWorldHurtbox(f, cfg);
            // x=400 + (-20)=380, y=520 + (-85)=435
            expect(hb.x).toBe(380);
            expect(hb.y).toBe(435);
            expect(hb.width).toBe(40);
            expect(hb.height).toBe(85);
        });

        it('returns flipped hurtbox facing left', () => {
            const f = makeFighter({ x: 400, y: 520, facingRight: false });
            const hb = getWorldHurtbox(f, cfg);
            // x=400 + (-20)*(-1)=420, then facingRight=false: 420 - 40 = 380
            expect(hb.x).toBe(380);
        });
    });

    describe('checkHit', () => {
        it('returns HitResult when hitbox overlaps hurtbox during active frames', () => {
            const attacker = makeFighter({
                x: 300, currentMove: 'punch', frameInState: 3,
                topState: TopState.Grounded, subState: 'attack',
            });
            const defender = makeFighter({ x: 350 }); // close enough for hitbox to reach hurtbox
            const result = checkHit(attacker, cfg, defender, cfg, 0, 1);
            expect(result).not.toBeNull();
            expect(result!.damage).toBe(80);
            expect(result!.attackerIndex).toBe(0);
            expect(result!.defenderIndex).toBe(1);
            expect(result!.knockbackX).toBeGreaterThan(0); // facing right
            expect(result!.blocked).toBe(false);
        });

        it('returns null when fighters are too far apart', () => {
            const attacker = makeFighter({
                x: 100, currentMove: 'punch', frameInState: 3,
            });
            const defender = makeFighter({ x: 500 });
            expect(checkHit(attacker, cfg, defender, cfg, 0, 1)).toBeNull();
        });

        it('returns null during startup frames', () => {
            const attacker = makeFighter({
                x: 300, currentMove: 'punch', frameInState: 1,
            });
            const defender = makeFighter({ x: 350 });
            expect(checkHit(attacker, cfg, defender, cfg, 0, 1)).toBeNull();
        });

        it('knockback direction flips when attacker faces left', () => {
            const attacker = makeFighter({
                x: 350, currentMove: 'punch', frameInState: 3, facingRight: false,
            });
            const defender = makeFighter({ x: 300 });
            const result = checkHit(attacker, cfg, defender, cfg, 0, 1);
            expect(result).not.toBeNull();
            expect(result!.knockbackX).toBeLessThan(0);
        });
    });
});
