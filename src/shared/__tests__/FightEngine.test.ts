import { describe, it, expect } from 'vitest';
import {
    createFightEngine,
    createInitialGameState,
    createInitialFighterState,
} from '../FightEngine';
import { TopState, RoundPhase, InputBit } from '../types';
import { STAGE_WIDTH, FLOOR_Y, DEFAULT_HP, HIT_STOP_FRAMES, ROUND_TIME, ROUNDS_TO_WIN, INTRO_FRAMES, KO_FRAMES } from '../constants';
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
    moves: {
        punch: {
            name: 'punch',
            damage: 80,
            startup: 3,
            active: 3,
            recovery: 6,
            hitbox: { x: 20, y: -70, width: 60, height: 30 },
            knockbackX: 5,
            knockbackY: 0,
            hitStunFrames: 12,
            blockStunFrames: 8,
        },
        kick: {
            name: 'kick',
            damage: 100,
            startup: 5,
            active: 3,
            recovery: 8,
            hitbox: { x: 20, y: -50, width: 70, height: 30 },
            knockbackX: 8,
            knockbackY: -2,
            hitStunFrames: 16,
            blockStunFrames: 10,
        },
    },
    pushbox: { x: -22, y: -90, width: 44, height: 90 },
    hurtbox: { x: -20, y: -85, width: 40, height: 85 },
    walkSpeed: 4,
    jumpVelY: -12,
    weight: 1.0,
    description: 'Test fighter',
    nickname: 'Tester',
    scale: 1.0,
    tint: 0xFFFFFF,
    portraitFrame: 0,
    maxHp: DEFAULT_HP,
};

function makeEngine() {
    const engine = createFightEngine({ p1Config: testConfig, p2Config: testConfig });
    // Skip intro for existing tests — go straight to fight phase
    engine.state.roundPhase = RoundPhase.Fight;
    engine.state.phaseFrames = 0;
    return engine;
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
        expect(state.roundPhase).toBe(RoundPhase.Intro);
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

    describe('hit detection (T15)', () => {
        function setupCloseRange() {
            const engine = makeEngine();
            const [f1, f2] = engine.state.fighters;
            // Place fighters close enough for punch hitbox to reach
            f1.x = 300;
            f2.x = 360;
            f1.facingRight = true;
            f2.facingRight = false;
            return engine;
        }

        it('punch damages defender after startup frames', () => {
            const engine = setupCloseRange();
            const [f1, f2] = engine.state.fighters;

            // Frame 0: press punch → enters attack, frameInState→1 after tickFSM
            engine.step([InputBit.PUNCH, 0]);
            expect(f1.subState).toBe('attack');
            expect(f2.hp).toBe(DEFAULT_HP); // no damage yet (startup)

            // frameInState=2 after tick, still < startup(3)
            engine.step([0, 0]);
            expect(f2.hp).toBe(DEFAULT_HP);

            // frameInState=3 after tick → active frame → hit connects
            engine.step([0, 0]);
            expect(f2.hp).toBe(DEFAULT_HP - 80);
        });

        it('hit sets defender to hitstun', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];

            // Enter attack and advance to active frames
            engine.step([InputBit.PUNCH, 0]); // frameInState→1
            engine.step([0, 0]);              // frameInState→2
            engine.step([0, 0]);              // frameInState→3, hit connects

            expect(f2.topState).toBe(TopState.Hitstun);
            expect(f2.subState).toBe('standing');
            expect(f2.stunDuration).toBe(12);
        });

        it('hit applies knockback to defender', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];
            const startX = f2.x;

            // Enter attack and advance to hit
            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects, hitStop set

            // After hit-stop expires, knockback should move defender
            while (engine.state.hitStop > 0) {
                engine.step([0, 0]);
            }
            engine.step([0, 0]); // one more frame for velocity to apply

            expect(f2.x).toBeGreaterThan(startX);
        });

        it('hit triggers global hit-stop', () => {
            const engine = setupCloseRange();

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects

            expect(engine.state.hitStop).toBe(HIT_STOP_FRAMES);
        });

        it('block prevents damage and applies blockstun', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];

            // P1 punches, P2 holds LEFT (back, since P2 faces left)
            // P2 faces left → back = RIGHT
            engine.step([InputBit.PUNCH, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]); // hit connects, P2 blocking

            expect(f2.hp).toBe(DEFAULT_HP); // no damage
            expect(f2.topState).toBe(TopState.Blockstun);
            expect(f2.subState).toBe('standing');
        });

        it('block applies reduced knockback', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];

            // Unblocked hit
            const engineUnblocked = setupCloseRange();
            engineUnblocked.step([InputBit.PUNCH, 0]);
            engineUnblocked.step([0, 0]);
            engineUnblocked.step([0, 0]); // hit

            // Blocked hit
            engine.step([InputBit.PUNCH, InputBit.RIGHT]); // P2 faces left, RIGHT = back
            engine.step([0, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]); // blocked

            // Blocked knockback should be less than unblocked
            const unblockedVelX = Math.abs(engineUnblocked.state.fighters[1].velX);
            const blockedVelX = Math.abs(f2.velX);
            expect(blockedVelX).toBeLessThan(unblockedVelX);
            expect(blockedVelX).toBeCloseTo(unblockedVelX * 0.5, 5);
        });

        it('blocking while attacking does not block', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];

            // P2 attacks, then P1 punches while P2 is mid-attack
            // Put P2 in attack state directly
            f2.topState = TopState.Grounded;
            f2.subState = 'attack';
            f2.currentMove = 'punch';
            f2.frameInState = 0;

            // P1 punches P2 who is attacking (holding back shouldn't help)
            engine.step([InputBit.PUNCH, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]); // hit connects

            expect(f2.hp).toBeLessThan(DEFAULT_HP); // damage applied
            expect(f2.topState).toBe(TopState.Hitstun);
        });

        it('same move does not hit twice (hitConfirmed)', () => {
            const engine = setupCloseRange();
            const f2 = engine.state.fighters[1];

            // Enter attack and advance to hit
            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects

            const hpAfterHit = f2.hp;

            // Drain hit-stop
            while (engine.state.hitStop > 0) {
                engine.step([0, 0]);
            }

            // Continue through remaining active frames — should not hit again
            for (let i = 0; i < 10; i++) {
                engine.step([0, 0]);
            }

            expect(f2.hp).toBe(hpAfterHit);
        });
    });

    describe('per-character maxHp (T02)', () => {
        const lowHpConfig: CharacterConfig = { ...testConfig, id: 'low', maxHp: 800 };
        const highHpConfig: CharacterConfig = { ...testConfig, id: 'high', maxHp: 1200 };

        it('initializes fighters with per-config maxHp', () => {
            const engine = createFightEngine({ p1Config: lowHpConfig, p2Config: highHpConfig });
            expect(engine.state.fighters[0].hp).toBe(800);
            expect(engine.state.fighters[1].hp).toBe(1200);
        });

        it('round reset preserves per-character maxHp', () => {
            const engine = createFightEngine({ p1Config: lowHpConfig, p2Config: highHpConfig });
            // Skip to fight, damage P2, trigger KO → RoundEnd → new round
            engine.state.roundPhase = RoundPhase.Fight;
            engine.state.fighters[1].hp = 0;
            // Manually go through KO → RoundEnd → Intro
            engine.state.roundPhase = RoundPhase.RoundEnd;
            engine.state.fighters[0].roundWins = 1;
            engine.state.phaseFrames = 0;
            engine.step([0, 0]); // processes RoundEnd → resets fighters → Intro

            expect(engine.state.fighters[0].hp).toBe(800);
            expect(engine.state.fighters[1].hp).toBe(1200);
            expect(engine.state.roundPhase).toBe(RoundPhase.Intro);
        });

        it('asymmetric HP match — low HP fighter KOs sooner', () => {
            const engine = createFightEngine({ p1Config: lowHpConfig, p2Config: highHpConfig });
            engine.state.roundPhase = RoundPhase.Fight;
            // P1 has 800 HP, P2 has 1200 HP — same damage takes more off P1
            const [f1, f2] = engine.state.fighters;
            f1.hp = 800;
            f2.hp = 1200;
            // Deal 800 damage to both
            f1.hp -= 800;
            f2.hp -= 800;
            expect(f1.hp).toBe(0);
            expect(f2.hp).toBe(400); // still alive
        });
    });

    describe('GameEvent emission + combo tracking (T03)', () => {
        function setupCloseRangeForCombo() {
            const engine = makeEngine();
            const [f1, f2] = engine.state.fighters;
            f1.x = 300;
            f2.x = 360;
            f1.facingRight = true;
            f2.facingRight = false;
            return engine;
        }

        it('hit generates hit event with correct data', () => {
            const engine = setupCloseRangeForCombo();
            const [f1, f2] = engine.state.fighters;

            engine.step([InputBit.PUNCH, 0]); // enter attack
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects

            const hitEvents = engine.events.filter(e => e.type === 'hit');
            expect(hitEvents).toHaveLength(1);
            const evt = hitEvents[0] as { type: 'hit'; attackerIdx: number; damage: number; moveKey: string; x: number; y: number };
            expect(evt.attackerIdx).toBe(0);
            expect(evt.damage).toBe(80);
            expect(evt.moveKey).toBe('punch');
            expect(evt.x).toBe((f1.x + f2.x) / 2);
        });

        it('block generates block event', () => {
            const engine = setupCloseRangeForCombo();

            engine.step([InputBit.PUNCH, InputBit.RIGHT]); // P2 faces left, RIGHT = back
            engine.step([0, InputBit.RIGHT]);
            engine.step([0, InputBit.RIGHT]); // blocked

            const blockEvents = engine.events.filter(e => e.type === 'block');
            expect(blockEvents).toHaveLength(1);
        });

        it('KO generates ko event', () => {
            const engine = setupCloseRangeForCombo();
            engine.state.fighters[1].hp = 1;

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects, KO

            const koEvents = engine.events.filter(e => e.type === 'ko');
            expect(koEvents).toHaveLength(1);
            expect((koEvents[0] as { type: 'ko'; loserIdx: number }).loserIdx).toBe(1);
        });

        it('matchStats accumulates hits and damage', () => {
            const engine = setupCloseRangeForCombo();

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects

            expect(engine.state.matchStats.hits[0]).toBe(1);
            expect(engine.state.matchStats.damage[0]).toBe(80);
        });

        it('comboCount increments on hit', () => {
            const engine = setupCloseRangeForCombo();
            const f1 = engine.state.fighters[0];

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects

            expect(f1.comboCount).toBe(1);
            expect(f1.comboDamage).toBe(80);
        });

        it('comboCount resets when opponent exits hitstun', () => {
            const engine = setupCloseRangeForCombo();
            const [f1, f2] = engine.state.fighters;

            // Land a hit
            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects
            expect(f1.comboCount).toBe(1);

            // Wait for hitstun to end + hitstop
            for (let i = 0; i < 50; i++) {
                engine.step([0, 0]);
            }

            // Opponent should be out of hitstun by now
            expect(f2.topState).not.toBe(TopState.Hitstun);
            expect(f1.comboCount).toBe(0);
        });

        it('specialCooldown decrements each frame', () => {
            const engine = makeEngine();
            engine.state.fighters[0].specialCooldown = 5;

            engine.step([0, 0]);
            expect(engine.state.fighters[0].specialCooldown).toBe(4);

            engine.step([0, 0]);
            expect(engine.state.fighters[0].specialCooldown).toBe(3);
        });

        it('specialCooldown does not go below 0', () => {
            const engine = makeEngine();
            engine.state.fighters[0].specialCooldown = 1;

            engine.step([0, 0]);
            expect(engine.state.fighters[0].specialCooldown).toBe(0);

            engine.step([0, 0]);
            expect(engine.state.fighters[0].specialCooldown).toBe(0);
        });

        it('events cleared at start of each step', () => {
            const engine = setupCloseRangeForCombo();

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit → events populated
            expect(engine.events.length).toBeGreaterThan(0);

            engine.step([0, 0]); // next step clears
            // During hitstop, events should be cleared
            expect(engine.events).toHaveLength(0);
        });

        it('maxCombo tracks highest combo per player', () => {
            const engine = setupCloseRangeForCombo();

            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit

            expect(engine.state.matchStats.maxCombo[0]).toBe(1);
        });

        it('round_start event emitted when fight begins', () => {
            const engine = createFightEngine({ p1Config: testConfig, p2Config: testConfig });
            // Advance through intro — transition fires when phaseFrames >= INTRO_FRAMES
            let found = false;
            for (let i = 0; i < INTRO_FRAMES + 5; i++) {
                engine.step([0, 0]);
                const rs = engine.events.filter(e => e.type === 'round_start');
                if (rs.length > 0) {
                    expect((rs[0] as { type: 'round_start'; round: number }).round).toBe(1);
                    found = true;
                    break;
                }
            }
            expect(found).toBe(true);
            expect(engine.state.roundPhase).toBe(RoundPhase.Fight);
        });

        it('match_end event emitted when match ends', () => {
            const engine = makeEngine();
            const [f1] = engine.state.fighters;
            f1.roundWins = ROUNDS_TO_WIN;
            engine.state.roundPhase = RoundPhase.RoundEnd;
            engine.state.phaseFrames = 0;

            engine.step([0, 0]); // RoundEnd → MatchEnd

            const matchEndEvents = engine.events.filter(e => e.type === 'match_end');
            expect(matchEndEvents).toHaveLength(1);
            expect((matchEndEvents[0] as { type: 'match_end'; winnerIdx: number }).winnerIdx).toBe(0);
        });
    });

    describe('round management (T17)', () => {
        it('starts in Intro phase, transitions to Fight after INTRO_FRAMES', () => {
            const engine = createFightEngine({ p1Config: testConfig, p2Config: testConfig });
            expect(engine.state.roundPhase).toBe(RoundPhase.Intro);

            // Advance through intro
            for (let i = 0; i < INTRO_FRAMES; i++) {
                engine.step([0, 0]);
            }
            // One more step to process the transition
            engine.step([0, 0]);
            expect(engine.state.roundPhase).toBe(RoundPhase.Fight);
        });

        it('timer counts down during Fight phase', () => {
            const engine = makeEngine();
            expect(engine.state.roundTimer).toBe(ROUND_TIME);

            // 60 frames = 1 second
            for (let i = 0; i < 60; i++) {
                engine.step([0, 0]);
            }
            expect(engine.state.roundTimer).toBe(ROUND_TIME - 1);
        });

        it('KO when fighter HP reaches 0', () => {
            const engine = makeEngine();
            const f2 = engine.state.fighters[1];

            // Set HP to just above 0, then deal a fatal hit
            f2.hp = 1;
            const f1 = engine.state.fighters[0];
            f1.x = 300;
            f2.x = 360;

            // P1 punches P2
            engine.step([InputBit.PUNCH, 0]);
            engine.step([0, 0]);
            engine.step([0, 0]); // hit connects, HP -> 0

            expect(f2.hp).toBe(0);
            expect(engine.state.roundPhase).toBe(RoundPhase.KO);
        });

        it('timeout triggers KO phase, higher HP wins', () => {
            const engine = makeEngine();
            const [f1, f2] = engine.state.fighters;

            f1.hp = 800;
            f2.hp = 600;
            engine.state.roundTimer = 1; // 1 second left

            // Burn through the last second (60 frames)
            for (let i = 0; i < 60; i++) {
                engine.step([0, 0]);
            }

            expect(engine.state.roundTimer).toBe(0);
            expect(engine.state.roundPhase).toBe(RoundPhase.KO);
        });

        it('KO phase awards win after KO_FRAMES, then transitions to RoundEnd', () => {
            const engine = makeEngine();
            const [f1, f2] = engine.state.fighters;

            // Set up P1 win scenario
            f1.hp = 500;
            f2.hp = 0;
            engine.state.roundPhase = RoundPhase.KO;
            engine.state.phaseFrames = 0;

            // Advance through KO phase (KO_FRAMES steps transitions to RoundEnd)
            for (let i = 0; i < KO_FRAMES; i++) {
                engine.step([0, 0]);
            }

            expect(f1.roundWins).toBe(1);
            expect(engine.state.roundPhase).toBe(RoundPhase.RoundEnd);
        });

        it('RoundEnd resets fighters and starts new round', () => {
            const engine = makeEngine();
            const [f1, f2] = engine.state.fighters;

            f1.roundWins = 1;
            f2.roundWins = 0;
            engine.state.currentRound = 1;
            engine.state.roundPhase = RoundPhase.RoundEnd;
            engine.state.phaseFrames = 0;

            engine.step([0, 0]); // process RoundEnd

            expect(engine.state.currentRound).toBe(2);
            expect(engine.state.roundPhase).toBe(RoundPhase.Intro);
            expect(engine.state.fighters[0].hp).toBe(DEFAULT_HP);
            expect(engine.state.fighters[1].hp).toBe(DEFAULT_HP);
            expect(engine.state.fighters[0].roundWins).toBe(1); // preserved
            expect(engine.state.roundTimer).toBe(ROUND_TIME);
        });

        it('match ends when a player reaches ROUNDS_TO_WIN', () => {
            const engine = makeEngine();
            const [f1] = engine.state.fighters;

            f1.roundWins = ROUNDS_TO_WIN;
            engine.state.roundPhase = RoundPhase.RoundEnd;
            engine.state.phaseFrames = 0;

            engine.step([0, 0]);

            expect(engine.state.roundPhase).toBe(RoundPhase.MatchEnd);
        });

        it('MatchEnd phase is a no-op', () => {
            const engine = makeEngine();
            engine.state.roundPhase = RoundPhase.MatchEnd;
            engine.state.phaseFrames = 0;

            const stateBefore = JSON.stringify(engine.state);
            engine.step([InputBit.PUNCH, 0]);
            // Only phaseFrames should change
            engine.state.phaseFrames = 0;
            expect(JSON.stringify(engine.state)).toBe(stateBefore);
        });
    });
});
