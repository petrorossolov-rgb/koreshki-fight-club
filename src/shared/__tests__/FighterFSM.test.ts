import { describe, it, expect } from 'vitest';
import { tickFSM } from '../FighterFSM';
import { InputBit, TopState } from '@shared/types';
import type { FighterState, CharacterConfig } from '@shared/types';

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
    id: 'test',
    name: 'Test',
    displayName: 'Test Fighter',
    spriteSheet: 'test.png',
    frameWidth: 200,
    frameHeight: 200,
    animations: {},
    moves: {},
    pushbox: { x: -30, y: -80, width: 60, height: 80 },
    hurtbox: { x: -25, y: -75, width: 50, height: 75 },
    walkSpeed: 4,
    jumpVelY: -12,
    weight: 1,
    description: 'Test', nickname: 'Tester', scale: 1, tint: 0xFFFFFF, portraitFrame: 0, maxHp: 1000,
};

const cfgWithMoves: CharacterConfig = {
    ...cfg,
    moves: {
        punch: {
            name: 'punch', damage: 80,
            startup: 3, active: 2, recovery: 5,
            hitbox: { x: 30, y: -50, width: 50, height: 30 },
            knockbackX: 4, knockbackY: -2,
            hitStunFrames: 12, blockStunFrames: 8,
        },
        kick: {
            name: 'kick', damage: 120,
            startup: 5, active: 3, recovery: 8,
            hitbox: { x: 25, y: -30, width: 60, height: 40 },
            knockbackX: 6, knockbackY: -3,
            hitStunFrames: 16, blockStunFrames: 10,
        },
    },
};

describe('FighterFSM', () => {
    it('idle -> walkForward on RIGHT (facing right)', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.RIGHT, cfg);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('walkForward');
        expect(f.velX).toBe(cfg.walkSpeed);
    });

    it('idle -> walkBackward on LEFT (facing right)', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.LEFT, cfg);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('walkBackward');
        expect(f.velX).toBeLessThan(0);
    });

    it('idle -> jump on UP', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.UP, cfg);
        expect(f.topState).toBe(TopState.Airborne);
        expect(f.subState).toBe('jump');
        expect(f.velY).toBe(cfg.jumpVelY);
    });

    it('jump -> fall when velY >= 0', () => {
        const f = makeFighter({
            topState: TopState.Airborne,
            subState: 'jump',
            velY: 0, // apex of jump
        });
        tickFSM(f, 0, cfg);
        expect(f.topState).toBe(TopState.Airborne);
        expect(f.subState).toBe('fall');
    });

    it('idle -> crouch on DOWN', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.DOWN, cfg);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('crouch');
        expect(f.velX).toBe(0);
    });

    it('crouch -> idle when DOWN released', () => {
        const f = makeFighter({
            topState: TopState.Grounded,
            subState: 'crouch',
        });
        tickFSM(f, 0, cfg);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
    });

    it('walkForward -> idle when no direction pressed', () => {
        const f = makeFighter({
            topState: TopState.Grounded,
            subState: 'walkForward',
            velX: cfg.walkSpeed,
        });
        tickFSM(f, 0, cfg);
        expect(f.subState).toBe('idle');
        expect(f.velX).toBe(0);
    });

    it('frameInState increments each tick', () => {
        const f = makeFighter();
        expect(f.frameInState).toBe(0);
        tickFSM(f, 0, cfg);
        expect(f.frameInState).toBe(1);
        tickFSM(f, 0, cfg);
        expect(f.frameInState).toBe(2);
    });

    // ── Attack states (T13) ──────────────────────────────────────

    it('idle -> grounded/attack on PUNCH', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH, cfgWithMoves);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('punch');
        expect(f.velX).toBe(0);
    });

    it('idle -> grounded/attack on KICK', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.KICK, cfgWithMoves);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('kick');
    });

    it('attack state tracks frameInState through startup->active->recovery', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH, cfgWithMoves); // -> attack, frameInState=1
        const move = cfgWithMoves.moves['punch'];
        const total = move.startup + move.active + move.recovery;
        // Tick through entire move duration
        for (let i = 1; i < total; i++) {
            tickFSM(f, 0, cfgWithMoves);
            expect(f.subState).toBe('attack');
        }
        // One more tick -> back to idle
        tickFSM(f, 0, cfgWithMoves);
        expect(f.subState).toBe('idle');
        expect(f.currentMove).toBeNull();
    });

    it('attack clears currentMove on exit', () => {
        const f = makeFighter({
            topState: TopState.Grounded,
            subState: 'attack',
            currentMove: 'punch',
            frameInState: 99, // past total
        });
        tickFSM(f, 0, cfgWithMoves);
        expect(f.currentMove).toBeNull();
    });

    it('hitstun/standing -> idle after stunDuration', () => {
        const stunFrames = cfgWithMoves.moves['punch'].hitStunFrames;
        const f = makeFighter({
            topState: TopState.Hitstun,
            subState: 'standing',
            stunDuration: stunFrames,
        });
        // frameInState starts at 0, update checks >= stunFrames,
        // increment happens after update, so need stunFrames+1 ticks
        for (let i = 0; i < stunFrames; i++) {
            tickFSM(f, 0, cfgWithMoves);
            expect(f.topState).toBe(TopState.Hitstun);
        }
        tickFSM(f, 0, cfgWithMoves); // this tick sees frameInState=stunFrames
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
    });

    it('blockstun/standing -> idle after stunDuration', () => {
        const stunFrames = cfgWithMoves.moves['punch'].blockStunFrames;
        const f = makeFighter({
            topState: TopState.Blockstun,
            subState: 'standing',
            stunDuration: stunFrames,
        });
        for (let i = 0; i < stunFrames; i++) {
            tickFSM(f, 0, cfgWithMoves);
            expect(f.topState).toBe(TopState.Blockstun);
        }
        tickFSM(f, 0, cfgWithMoves);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
    });

    it('knockdown/getup -> idle after 30 frames', () => {
        const f = makeFighter({
            topState: TopState.Knockdown,
            subState: 'getup',
        });
        for (let i = 0; i < 30; i++) {
            tickFSM(f, 0, cfgWithMoves);
            expect(f.subState).toBe('getup');
        }
        tickFSM(f, 0, cfgWithMoves);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
    });

    it('PUNCH takes priority over movement', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH | InputBit.RIGHT, cfgWithMoves);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('punch');
    });
});
