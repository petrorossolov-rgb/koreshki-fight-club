import { TopState, RoundPhase } from './types';
import type { FighterState, GameState, CharacterConfig } from './types';
import { STAGE_WIDTH, FLOOR_Y, DEFAULT_HP } from './constants';
import { applyGravity, applyVelocity, clampToStage, resolvePushboxes } from './PhysicsSystem';
import { tickFSM } from '@game/entities/FighterFSM';

// ── Factory ─────────────────────────────────────────────────────────

export interface FightEngineConfig {
    p1Config: CharacterConfig;
    p2Config: CharacterConfig;
}

export interface FightEngine {
    state: GameState;
    step(inputs: [number, number]): void;
}

export function createInitialFighterState(
    x: number,
    facingRight: boolean,
): FighterState {
    return {
        x,
        y: FLOOR_Y,
        velX: 0,
        velY: 0,
        hp: DEFAULT_HP,
        facingRight,
        topState: TopState.Grounded,
        subState: 'idle',
        frameInState: 0,
        currentMove: null,
        hitStopFrames: 0,
        roundWins: 0,
    };
}

export function createInitialGameState(): GameState {
    const oneThird = Math.round(STAGE_WIDTH / 3);
    const twoThirds = Math.round((STAGE_WIDTH * 2) / 3);

    return {
        fighters: [
            createInitialFighterState(oneThird, true),
            createInitialFighterState(twoThirds, false),
        ],
        roundPhase: RoundPhase.Fight,
        roundTimer: 99,
        currentRound: 1,
        phaseFrames: 0,
        hitStop: 0,
    };
}

// ── Auto-face ───────────────────────────────────────────────────────

function autoFace(f1: FighterState, f2: FighterState): void {
    if (f1.x < f2.x) {
        f1.facingRight = true;
        f2.facingRight = false;
    } else if (f1.x > f2.x) {
        f1.facingRight = false;
        f2.facingRight = true;
    }
    // If equal x, keep current facing
}

// ── Engine ──────────────────────────────────────────────────────────

export function createFightEngine(config: FightEngineConfig): FightEngine {
    const state = createInitialGameState();
    const configs: [CharacterConfig, CharacterConfig] = [config.p1Config, config.p2Config];

    function step(inputs: [number, number]): void {
        // Hit-stop freezes everything
        if (state.hitStop > 0) {
            state.hitStop--;
            return;
        }

        const [f1, f2] = state.fighters;
        const [bits1, bits2] = inputs;

        // 1. FSM tick (reads input, sets velocities)
        tickFSM(f1, bits1, configs[0]);
        tickFSM(f2, bits2, configs[1]);

        // 2. Physics
        applyGravity(f1);
        applyGravity(f2);
        applyVelocity(f1);
        applyVelocity(f2);

        // 3. Stage clamping + landing
        clampToStage(f1, configs[0].pushbox);
        clampToStage(f2, configs[1].pushbox);

        // 4. Pushbox resolution
        resolvePushboxes(f1, f2, configs[0].pushbox);

        // 5. Auto-face opponent
        autoFace(f1, f2);

        // 6. Advance phase frame counter
        state.phaseFrames++;
    }

    return { state, step };
}
