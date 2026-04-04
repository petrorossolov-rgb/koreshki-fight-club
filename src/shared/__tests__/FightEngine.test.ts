import { describe, it, expect } from 'vitest';
import {
    createFightEngine,
    createInitialGameState,
    createInitialFighterState,
} from '../FightEngine';
import { TopState, RoundPhase, InputBit } from '../types';
import { STAGE_WIDTH, FLOOR_Y, DEFAULT_HP } from '../constants';
import type { CharacterConfig } from '../types';

// Minimal config for testing
const testConfig: CharacterConfig = {
    id: 'test',
    name: 'test',
    displayName: 'Test',
    spriteSheet: 'test.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {},
    moves: {},
    pushbox: { x: -22, y: -90, width: 44, height: 90 },
    hurtbox: { x: -20, y: -85, width: 40, height: 85 },
    walkSpeed: 4,
    jumpVelY: -12,
    weight: 1.0,
};

function makeEngine() {
    return createFightEngine({ p1Config: testConfig, p2Config: testConfig });
}

describe('FightEngine', () => {
    it('creates initial game state with fighters at 1/3 and 2/3', () => {
        const state = createInitialGameState();
        const oneThird = Math.round(STAGE_WIDTH / 3);
        const twoThirds = Math.round((STAGE_WIDTH * 2) / 3);

        expect(state.fighters[0].x).toBe(oneThird);
        expect(state.fighters[1].x).toBe(twoThirds);
        expect(state.fighters[0].facingRight).toBe(true);
        expect(state.fighters[1].facingRight).toBe(false);
        expect(state.roundPhase).toBe(RoundPhase.Fight);
    });

    it('creates initial fighter state correctly', () => {
        const f = createInitialFighterState(200, true);
        expect(f.x).toBe(200);
        expect(f.y).toBe(FLOOR_Y);
        expect(f.hp).toBe(DEFAULT_HP);
        expect(f.topState).toBe(TopState.Grounded);
        expect(f.subState).toBe('idle');
        expect(f.facingRight).toBe(true);
    });

    it('moves P1 right when RIGHT input is given', () => {
        const engine = makeEngine();
        const startX = engine.state.fighters[0].x;

        engine.step([InputBit.RIGHT, 0]);

        expect(engine.state.fighters[0].x).toBeGreaterThan(startX);
    });

    it('moves P1 left when LEFT input is given', () => {
        const engine = makeEngine();
        const startX = engine.state.fighters[0].x;

        engine.step([InputBit.LEFT, 0]);

        expect(engine.state.fighters[0].x).toBeLessThan(startX);
    });

    it('jump creates an arc (velY goes negative then positive)', () => {
        const engine = makeEngine();
        const f = engine.state.fighters[0];

        // Start jump
        engine.step([InputBit.UP, 0]);
        expect(f.topState).toBe(TopState.Airborne);
        expect(f.velY).toBeLessThan(0);

        // Rise for several frames
        for (let i = 0; i < 5; i++) {
            engine.step([0, 0]);
        }
        expect(f.y).toBeLessThan(FLOOR_Y); // still in the air

        // Eventually lands
        for (let i = 0; i < 60; i++) {
            engine.step([0, 0]);
            if (f.y >= FLOOR_Y) break;
        }
        expect(f.y).toBe(FLOOR_Y);
        expect(f.topState).toBe(TopState.Grounded);
    });

    it('auto-faces fighters toward each other', () => {
        const engine = makeEngine();
        const [f1, f2] = engine.state.fighters;

        // Move P1 past P2 by manipulating positions directly
        f1.x = 700;
        f2.x = 300;

        engine.step([0, 0]);

        // After step, they should face each other
        expect(f1.facingRight).toBe(false); // P1 is right of P2, faces left
        expect(f2.facingRight).toBe(true);  // P2 is left of P1, faces right
    });

    it('pushbox prevents fighters from overlapping', () => {
        const engine = makeEngine();
        const [f1, f2] = engine.state.fighters;

        // Place fighters on top of each other
        f1.x = 500;
        f2.x = 500;

        engine.step([0, 0]);

        // They should be separated
        expect(Math.abs(f1.x - f2.x)).toBeGreaterThan(0);
    });

    it('is deterministic — same inputs produce same state', () => {
        const inputs: [number, number][] = [
            [InputBit.RIGHT, InputBit.LEFT],
            [InputBit.UP, 0],
            [0, InputBit.RIGHT],
            [InputBit.LEFT, InputBit.UP],
            [0, 0],
        ];

        const engine1 = makeEngine();
        const engine2 = makeEngine();

        for (const input of inputs) {
            engine1.step(input);
            engine2.step(input);
        }

        expect(engine1.state.fighters[0].x).toBe(engine2.state.fighters[0].x);
        expect(engine1.state.fighters[0].y).toBe(engine2.state.fighters[0].y);
        expect(engine1.state.fighters[1].x).toBe(engine2.state.fighters[1].x);
        expect(engine1.state.fighters[1].y).toBe(engine2.state.fighters[1].y);
    });

    it('hit-stop freezes all simulation', () => {
        const engine = makeEngine();
        engine.state.hitStop = 3;

        const xBefore = engine.state.fighters[0].x;
        engine.step([InputBit.RIGHT, 0]);
        expect(engine.state.fighters[0].x).toBe(xBefore); // frozen
        expect(engine.state.hitStop).toBe(2);
    });
});
