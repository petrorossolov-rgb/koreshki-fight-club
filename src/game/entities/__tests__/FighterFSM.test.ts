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
});
