import { TopState, RoundPhase, InputBit } from './types';
import type { FighterState, GameState, CharacterConfig, HitResult } from './types';
import { STAGE_WIDTH, FLOOR_Y, DEFAULT_HP, HIT_STOP_FRAMES, ROUND_TIME, ROUNDS_TO_WIN, INTRO_FRAMES, KO_FRAMES } from './constants';
import { applyGravity, applyVelocity, clampToStage, resolvePushboxes } from './PhysicsSystem';
import { tickFSM, transition } from './FighterFSM';
import { checkHit } from './CollisionSystem';

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
        hitConfirmed: false,
        stunDuration: 0,
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
        roundPhase: RoundPhase.Intro,
        roundTimer: ROUND_TIME,
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

// ── Hit processing ─────────────────────────────────────────────────

/** Defender blocks if holding back while grounded and not attacking/stunned. */
function isBlocking(defender: FighterState, defenderBits: number): boolean {
    if (defender.topState !== TopState.Grounded) return false;
    if (defender.subState === 'attack') return false;
    const holdingBack = defender.facingRight
        ? (defenderBits & InputBit.LEFT) !== 0
        : (defenderBits & InputBit.RIGHT) !== 0;
    return holdingBack;
}

function applyHit(
    attacker: FighterState,
    attackerCfg: CharacterConfig,
    defender: FighterState,
    defenderCfg: CharacterConfig,
    hit: HitResult,
    state: GameState,
    blocked: boolean,
): void {
    attacker.hitConfirmed = true;

    if (blocked) {
        // Block: no damage, blockstun, reduced knockback
        const move = attackerCfg.moves[attacker.currentMove!];
        defender.stunDuration = move?.blockStunFrames ?? 8;
        transition(defender, defenderCfg, TopState.Blockstun, 'standing');
        defender.velX = (hit.knockbackX * 0.5) / defenderCfg.weight;
        defender.velY = 0;
    } else {
        // Hit: full damage, hitstun, full knockback
        defender.hp = Math.max(0, defender.hp - hit.damage);
        defender.stunDuration = hit.hitStunFrames;
        transition(defender, defenderCfg, TopState.Hitstun, 'standing');
        defender.velX = hit.knockbackX / defenderCfg.weight;
        defender.velY = hit.knockbackY;
    }

    // Global hit-stop
    state.hitStop = HIT_STOP_FRAMES;
}

function processHits(
    state: GameState,
    configs: [CharacterConfig, CharacterConfig],
    inputs: [number, number],
): void {
    const [f1, f2] = state.fighters;

    // Check P1 hitting P2
    if (!f1.hitConfirmed) {
        const hit = checkHit(f1, configs[0], f2, configs[1], 0, 1);
        if (hit) {
            const blocked = isBlocking(f2, inputs[1]);
            applyHit(f1, configs[0], f2, configs[1], hit, state, blocked);
        }
    }

    // Check P2 hitting P1
    if (!f2.hitConfirmed) {
        const hit = checkHit(f2, configs[1], f1, configs[0], 1, 0);
        if (hit) {
            const blocked = isBlocking(f1, inputs[0]);
            applyHit(f2, configs[1], f1, configs[0], hit, state, blocked);
        }
    }
}

// ── Round management ───────────────────────────────────────────────

function setPhase(state: GameState, phase: RoundPhase): void {
    state.roundPhase = phase;
    state.phaseFrames = 0;
}

function resetFightersForRound(state: GameState): void {
    const oneThird = Math.round(STAGE_WIDTH / 3);
    const twoThirds = Math.round((STAGE_WIDTH * 2) / 3);
    const wins: [number, number] = [state.fighters[0].roundWins, state.fighters[1].roundWins];

    state.fighters[0] = createInitialFighterState(oneThird, true);
    state.fighters[1] = createInitialFighterState(twoThirds, false);
    state.fighters[0].roundWins = wins[0];
    state.fighters[1].roundWins = wins[1];
    state.roundTimer = ROUND_TIME;
}

// ── Engine ──────────────────────────────────────────────────────────

export function createFightEngine(config: FightEngineConfig): FightEngine {
    const state = createInitialGameState();
    const configs: [CharacterConfig, CharacterConfig] = [config.p1Config, config.p2Config];

    function stepFight(inputs: [number, number]): void {
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

        // 6. Hit detection
        processHits(state, configs, inputs);

        // 7. Timer countdown (60 frames = 1 second)
        if (state.phaseFrames % 60 === 0) {
            state.roundTimer--;
        }

        // 8. Check KO or timeout
        if (f1.hp <= 0 || f2.hp <= 0) {
            setPhase(state, RoundPhase.KO);
            return;
        }
        if (state.roundTimer <= 0) {
            setPhase(state, RoundPhase.KO);
            return;
        }
    }

    function step(inputs: [number, number]): void {
        // Hit-stop freezes everything
        if (state.hitStop > 0) {
            state.hitStop--;
            return;
        }

        state.phaseFrames++;

        switch (state.roundPhase) {
            case RoundPhase.Intro:
                if (state.phaseFrames >= INTRO_FRAMES) {
                    setPhase(state, RoundPhase.Fight);
                }
                break;

            case RoundPhase.Fight:
                stepFight(inputs);
                break;

            case RoundPhase.KO:
                if (state.phaseFrames >= KO_FRAMES) {
                    // Award round win
                    const [f1, f2] = state.fighters;
                    if (f1.hp > f2.hp) {
                        f1.roundWins++;
                    } else if (f2.hp > f1.hp) {
                        f2.roundWins++;
                    }
                    // else: draw — no win awarded

                    setPhase(state, RoundPhase.RoundEnd);
                }
                break;

            case RoundPhase.RoundEnd: {
                const [f1, f2] = state.fighters;
                if (f1.roundWins >= ROUNDS_TO_WIN || f2.roundWins >= ROUNDS_TO_WIN) {
                    setPhase(state, RoundPhase.MatchEnd);
                } else {
                    // Next round
                    state.currentRound++;
                    resetFightersForRound(state);
                    setPhase(state, RoundPhase.Intro);
                }
                break;
            }

            case RoundPhase.MatchEnd:
                // Game over — no-op
                break;
        }
    }

    return { state, step };
}
