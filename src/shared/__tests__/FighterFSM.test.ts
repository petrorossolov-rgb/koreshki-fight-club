import { describe, it, expect } from 'vitest';
import { tickFSM, transition } from '../FighterFSM';
import { InputBit, TopState } from '@shared/types';
import { FLOOR_Y } from '@shared/constants';
import { clampToStage } from '../PhysicsSystem';
import type { FighterState, CharacterConfig } from '@shared/types';

function makeFighter(overrides: Partial<FighterState> = {}): FighterState {
    return {
        x: 300, y: 520, velX: 0, velY: 0,
        hp: 1000, facingRight: true,
        topState: TopState.Grounded, subState: 'idle',
        frameInState: 0, currentMove: null,
        hitConfirmed: false, stunDuration: 0,
        hitStopFrames: 0, roundWins: 0,
        comboCount: 0, comboDamage: 0,
        specialCooldown: 0, isCrouching: false,
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

    // ── Special move + chain cancel (T02) ──────────────────────────

    const cfgWithSpecial: CharacterConfig = {
        ...cfgWithMoves,
        moves: {
            ...cfgWithMoves.moves,
            special: {
                name: 'special', damage: 200,
                startup: 4, active: 4, recovery: 10,
                hitbox: { x: 20, y: -60, width: 80, height: 40 },
                knockbackX: 10, knockbackY: -4,
                hitStunFrames: 20, blockStunFrames: 14,
            },
        },
        specialCooldownFrames: 180,
    };

    const cfgWithChains: CharacterConfig = {
        ...cfgWithMoves,
        chainRoutes: [
            { from: 'punch', to: 'kick', cancelWindow: [4, 8], onHitOnly: false },
            { from: 'kick', to: 'punch', cancelWindow: [6, 12], onHitOnly: true },
        ],
    };

    it('P+K triggers special move', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithSpecial);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('special');
        expect(f.specialCooldown).toBe(180);
    });

    it('P+K blocked during cooldown — falls through to punch', () => {
        const f = makeFighter({ specialCooldown: 100 });
        tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithSpecial);
        expect(f.currentMove).toBe('punch');
    });

    it('P+K with no special move in config → punch', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithMoves);
        expect(f.currentMove).toBe('punch');
    });

    it('chain cancel P→K during cancelWindow', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH, cfgWithChains); // enter attack, frameInState=1
        // Advance to cancelWindow start (frame 4)
        tickFSM(f, 0, cfgWithChains); // frame 2
        tickFSM(f, 0, cfgWithChains); // frame 3
        tickFSM(f, 0, cfgWithChains); // frame 4
        // Now press KICK during cancel window
        tickFSM(f, InputBit.KICK, cfgWithChains); // frame 5 → chain cancels
        expect(f.currentMove).toBe('kick');
        expect(f.frameInState).toBe(1); // 0 from chain reset, +1 from tickFSM increment
    });

    it('chain cancel rejected outside cancelWindow', () => {
        const f = makeFighter();
        tickFSM(f, InputBit.PUNCH, cfgWithChains); // enter attack, frame 1
        // Press kick immediately (frame 1, outside window [4,8])
        tickFSM(f, InputBit.KICK, cfgWithChains); // frame 2
        expect(f.currentMove).toBe('punch'); // still punch
    });

    it('onHitOnly chain rejected without hitConfirmed', () => {
        const f = makeFighter();
        // Start kick attack
        f.topState = TopState.Grounded;
        f.subState = 'attack';
        f.currentMove = 'kick';
        f.frameInState = 6; // in cancelWindow [6,12]
        f.hitConfirmed = false;
        tickFSM(f, InputBit.PUNCH, cfgWithChains);
        expect(f.currentMove).toBe('kick'); // chain rejected
    });

    it('onHitOnly chain succeeds with hitConfirmed', () => {
        const f = makeFighter();
        f.topState = TopState.Grounded;
        f.subState = 'attack';
        f.currentMove = 'kick';
        f.frameInState = 6;
        f.hitConfirmed = true;
        tickFSM(f, InputBit.PUNCH, cfgWithChains);
        expect(f.currentMove).toBe('punch');
        expect(f.frameInState).toBe(1); // 0 from chain reset, +1 from tickFSM increment
    });

    // ── Crouch attacks (T04) ──────────────────────────────────────

    const cfgWithCrouchMoves: CharacterConfig = {
        ...cfgWithMoves,
        moves: {
            ...cfgWithMoves.moves,
            crouchPunch: {
                name: 'crouchPunch', damage: 50,
                startup: 2, active: 2, recovery: 4,
                hitbox: { x: 25, y: -20, width: 50, height: 20 },
                knockbackX: 3, knockbackY: 0,
                hitStunFrames: 10, blockStunFrames: 6,
            },
            crouchKick: {
                name: 'crouchKick', damage: 70,
                startup: 4, active: 3, recovery: 6,
                hitbox: { x: 20, y: -15, width: 60, height: 25 },
                knockbackX: 5, knockbackY: -1,
                hitStunFrames: 14, blockStunFrames: 8,
            },
        },
    };

    it('crouch + PUNCH → crouchPunch attack', () => {
        const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch' });
        tickFSM(f, InputBit.DOWN | InputBit.PUNCH, cfgWithCrouchMoves);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('crouchPunch');
        expect(f.isCrouching).toBe(true);
    });

    it('crouch + KICK → crouchKick attack', () => {
        const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch' });
        tickFSM(f, InputBit.DOWN | InputBit.KICK, cfgWithCrouchMoves);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('crouchKick');
        expect(f.isCrouching).toBe(true);
    });

    it('crouch attack completes → returns to crouch (not idle)', () => {
        const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch' });
        tickFSM(f, InputBit.DOWN | InputBit.PUNCH, cfgWithCrouchMoves); // enter attack, frame 1
        const move = cfgWithCrouchMoves.moves['crouchPunch'];
        const total = move.startup + move.active + move.recovery;
        for (let i = 1; i < total; i++) {
            tickFSM(f, 0, cfgWithCrouchMoves);
        }
        tickFSM(f, 0, cfgWithCrouchMoves); // completes
        expect(f.subState).toBe('crouch');
        expect(f.isCrouching).toBe(false); // cleared by attack.exit()
    });

    it('no crouch attack if crouchPunch not in config', () => {
        const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch' });
        tickFSM(f, InputBit.DOWN | InputBit.PUNCH, cfgWithMoves); // no crouchPunch
        expect(f.subState).toBe('crouch'); // stays in crouch
    });

    // ── Jump attacks (T05) ──────────────────────────────────────

    const cfgWithJumpMoves: CharacterConfig = {
        ...cfgWithMoves,
        moves: {
            ...cfgWithMoves.moves,
            jumpPunch: {
                name: 'jumpPunch', damage: 60,
                startup: 2, active: 3, recovery: 3,
                hitbox: { x: 25, y: -50, width: 50, height: 30 },
                knockbackX: 3, knockbackY: -1,
                hitStunFrames: 10, blockStunFrames: 6,
            },
            jumpKick: {
                name: 'jumpKick', damage: 80,
                startup: 3, active: 3, recovery: 4,
                hitbox: { x: 20, y: -30, width: 55, height: 35 },
                knockbackX: 4, knockbackY: 2,
                hitStunFrames: 14, blockStunFrames: 8,
            },
        },
    };

    it('jump + PUNCH → airborne/attack with jumpPunch', () => {
        const f = makeFighter({ topState: TopState.Airborne, subState: 'jump', velY: -8 });
        tickFSM(f, InputBit.PUNCH, cfgWithJumpMoves);
        expect(f.topState).toBe(TopState.Airborne);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('jumpPunch');
    });

    it('fall + KICK → airborne/attack with jumpKick', () => {
        const f = makeFighter({ topState: TopState.Airborne, subState: 'fall', velY: 4 });
        tickFSM(f, InputBit.KICK, cfgWithJumpMoves);
        expect(f.topState).toBe(TopState.Airborne);
        expect(f.subState).toBe('attack');
        expect(f.currentMove).toBe('jumpKick');
    });

    it('airborne attack completes → transitions to fall', () => {
        const f = makeFighter({ topState: TopState.Airborne, subState: 'attack', currentMove: 'jumpPunch' });
        const move = cfgWithJumpMoves.moves['jumpPunch'];
        const total = move.startup + move.active + move.recovery;
        for (let i = 0; i < total; i++) {
            tickFSM(f, 0, cfgWithJumpMoves);
        }
        tickFSM(f, 0, cfgWithJumpMoves); // completes
        expect(f.subState).toBe('fall');
        expect(f.currentMove).toBeNull();
    });

    it('no jump attack if jumpPunch not in config', () => {
        const f = makeFighter({ topState: TopState.Airborne, subState: 'jump', velY: -8 });
        tickFSM(f, InputBit.PUNCH, cfgWithMoves); // no jumpPunch in cfgWithMoves
        expect(f.subState).not.toBe('attack');
    });

    it('airborne attack preserves air control', () => {
        const f = makeFighter({ topState: TopState.Airborne, subState: 'attack', currentMove: 'jumpPunch' });
        tickFSM(f, InputBit.RIGHT, cfgWithJumpMoves);
        expect(f.velX).toBe(cfgWithJumpMoves.walkSpeed * 0.8);
    });

    it('isCrouching cleared by attack.exit()', () => {
        const f = makeFighter({
            topState: TopState.Grounded,
            subState: 'attack',
            currentMove: 'crouchPunch',
            isCrouching: true,
            frameInState: 99, // past total
        });
        tickFSM(f, 0, cfgWithCrouchMoves);
        expect(f.isCrouching).toBe(false);
    });

    // ── Comprehensive FSM tests (T09) ─────────────────────────────

    describe('chain cancel — P→P jab-jab', () => {
        const cfgJabJab: CharacterConfig = {
            ...cfgWithMoves,
            chainRoutes: [
                { from: 'punch', to: 'punch', cancelWindow: [4, 8], onHitOnly: false },
            ],
        };

        it('self-chain punch→punch during cancelWindow', () => {
            const f = makeFighter();
            tickFSM(f, InputBit.PUNCH, cfgJabJab); // enter attack, frame 1
            tickFSM(f, 0, cfgJabJab); // frame 2
            tickFSM(f, 0, cfgJabJab); // frame 3
            tickFSM(f, 0, cfgJabJab); // frame 4
            tickFSM(f, InputBit.PUNCH, cfgJabJab); // frame 5 → chain resets
            expect(f.currentMove).toBe('punch');
            expect(f.frameInState).toBe(1); // 0 from reset + 1 from increment
            expect(f.hitConfirmed).toBe(false); // cleared on chain
        });

        it('self-chain resets hitConfirmed', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 4,
                hitConfirmed: true,
            });
            tickFSM(f, InputBit.PUNCH, cfgJabJab);
            expect(f.hitConfirmed).toBe(false);
        });
    });

    describe('chain cancel — edge cases', () => {
        it('chain rejected when target move not in config', () => {
            const cfgBadChain: CharacterConfig = {
                ...cfgWithMoves,
                chainRoutes: [
                    { from: 'punch', to: 'nonexistent', cancelWindow: [4, 8], onHitOnly: false },
                ],
            };
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
            });
            tickFSM(f, InputBit.PUNCH, cfgBadChain);
            expect(f.currentMove).toBe('punch'); // no chain
        });

        it('chain cancel at exact cancelWindow boundaries', () => {
            const cfgExact: CharacterConfig = {
                ...cfgWithMoves,
                chainRoutes: [
                    { from: 'punch', to: 'kick', cancelWindow: [4, 4], onHitOnly: false },
                ],
            };
            // Exactly at frame 4 — should work
            const f1 = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 4,
            });
            tickFSM(f1, InputBit.KICK, cfgExact);
            expect(f1.currentMove).toBe('kick');

            // At frame 3 — should NOT work
            const f2 = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 3,
            });
            tickFSM(f2, InputBit.KICK, cfgExact);
            expect(f2.currentMove).toBe('punch');

            // At frame 5 — should NOT work
            const f3 = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
            });
            tickFSM(f3, InputBit.KICK, cfgExact);
            expect(f3.currentMove).toBe('punch');
        });

        it('no chainRoutes in config — no crash, attack completes normally', () => {
            const f = makeFighter();
            tickFSM(f, InputBit.PUNCH, cfgWithMoves); // no chainRoutes
            const move = cfgWithMoves.moves['punch'];
            const total = move.startup + move.active + move.recovery;
            for (let i = 1; i < total; i++) {
                tickFSM(f, InputBit.KICK, cfgWithMoves); // pressing kick but no chain route
            }
            expect(f.currentMove).toBe('punch'); // still punch
            tickFSM(f, 0, cfgWithMoves);
            expect(f.subState).toBe('idle');
        });
    });

    describe('special move — edge cases', () => {
        it('specialCooldown exactly 0 allows special', () => {
            const f = makeFighter({ specialCooldown: 0 });
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithSpecial);
            expect(f.currentMove).toBe('special');
        });

        it('specialCooldown exactly 1 blocks special → falls to punch', () => {
            const f = makeFighter({ specialCooldown: 1 });
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithSpecial);
            expect(f.currentMove).toBe('punch');
        });

        it('special sets correct cooldown from config', () => {
            const f = makeFighter();
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgWithSpecial);
            expect(f.specialCooldown).toBe(180); // from cfgWithSpecial.specialCooldownFrames
        });

        it('special uses default cooldown (300) when config omits specialCooldownFrames', () => {
            const cfgNoFrames: CharacterConfig = {
                ...cfgWithMoves,
                moves: {
                    ...cfgWithMoves.moves,
                    special: cfgWithSpecial.moves['special'],
                },
                // no specialCooldownFrames
            };
            const f = makeFighter();
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgNoFrames);
            expect(f.currentMove).toBe('special');
            expect(f.specialCooldown).toBe(300); // default
        });

        it('crouch + P+K → special (not crouchPunch)', () => {
            const cfgCrouchSpecial: CharacterConfig = {
                ...cfgWithCrouchMoves,
                moves: {
                    ...cfgWithCrouchMoves.moves,
                    special: cfgWithSpecial.moves['special'],
                },
                specialCooldownFrames: 180,
            };
            const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch' });
            tickFSM(f, InputBit.DOWN | InputBit.PUNCH | InputBit.KICK, cfgCrouchSpecial);
            expect(f.currentMove).toBe('special');
            expect(f.isCrouching).toBe(true);
        });

        it('crouch + P+K during cooldown → crouchPunch', () => {
            const cfgCrouchSpecial: CharacterConfig = {
                ...cfgWithCrouchMoves,
                moves: {
                    ...cfgWithCrouchMoves.moves,
                    special: cfgWithSpecial.moves['special'],
                },
                specialCooldownFrames: 180,
            };
            const f = makeFighter({ topState: TopState.Grounded, subState: 'crouch', specialCooldown: 50 });
            tickFSM(f, InputBit.DOWN | InputBit.PUNCH | InputBit.KICK, cfgCrouchSpecial);
            expect(f.currentMove).toBe('crouchPunch');
        });
    });

    describe('jump attack — landing cancels', () => {
        it('clampToStage landing clears airborne attack state', () => {
            // Simulate what clampToStage does: sets topState=Grounded, clears currentMove
            const f = makeFighter({
                topState: TopState.Airborne,
                subState: 'attack',
                currentMove: 'jumpKick',
                hitConfirmed: true,
                y: FLOOR_Y + 1, // just below floor (will be clamped)
                velY: 5,
            });
            // clampToStage is in PhysicsSystem; verify FSM handles post-landing state
            // After clampToStage, state should be grounded/idle with cleared move
            clampToStage(f, cfg.pushbox);
            expect(f.topState).toBe(TopState.Grounded);
            expect(f.subState).toBe('idle');
            expect(f.currentMove).toBeNull();
            expect(f.hitConfirmed).toBe(false);
            expect(f.velY).toBe(0);
        });

        it('no jump attack if only KICK in jump and jumpKick missing from config', () => {
            const f = makeFighter({ topState: TopState.Airborne, subState: 'jump', velY: -8 });
            tickFSM(f, InputBit.KICK, cfgWithMoves); // no jumpKick
            expect(f.subState).not.toBe('attack');
        });

        it('airborne attack with null move → falls to fall state', () => {
            const f = makeFighter({
                topState: TopState.Airborne,
                subState: 'attack',
                currentMove: 'nonexistent',
            });
            tickFSM(f, 0, cfgWithJumpMoves);
            expect(f.subState).toBe('fall');
        });
    });

    describe('block state', () => {
        it('block.enter zeros velocity', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'idle',
                velX: 5,
            });
            // Manually enter block via transition
            transition(f, cfg, TopState.Grounded, 'block');
            expect(f.velX).toBe(0);
        });

        it('block → idle when back released', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'block',
                facingRight: true,
            });
            tickFSM(f, 0, cfg); // no back input
            expect(f.subState).toBe('idle');
        });

        it('block stays when holding back', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'block',
                facingRight: true,
            });
            tickFSM(f, InputBit.LEFT, cfg); // LEFT = back for facingRight
            expect(f.subState).toBe('block');
        });
    });

    describe('grounded/attack with null move → idle', () => {
        it('attack with currentMove=null transitions to idle', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: null,
            });
            tickFSM(f, 0, cfgWithMoves);
            expect(f.subState).toBe('idle');
        });

        it('attack with move not in config transitions to idle', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'nonexistent',
            });
            tickFSM(f, 0, cfgWithMoves);
            expect(f.subState).toBe('idle');
        });
    });

    describe('knockdown/falling', () => {
        it('knockdown/falling waits for landing (velY=0 and frame > 0)', () => {
            const f = makeFighter({
                topState: TopState.Knockdown,
                subState: 'falling',
                velY: -5, // still in air
            });
            tickFSM(f, 0, cfg);
            expect(f.subState).toBe('falling'); // still falling

            f.velY = 0;
            f.frameInState = 2; // > 0
            tickFSM(f, 0, cfg);
            expect(f.subState).toBe('getup');
        });
    });

    describe('walk transitions', () => {
        it('walkForward → walkBackward on reverse direction', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkForward',
                facingRight: true,
                velX: cfg.walkSpeed,
            });
            tickFSM(f, InputBit.LEFT, cfg); // backward for facingRight
            expect(f.subState).toBe('walkBackward');
        });

        it('walkBackward → walkForward on reverse direction', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkBackward',
                facingRight: true,
                velX: -cfg.walkSpeed * 0.7,
            });
            tickFSM(f, InputBit.RIGHT, cfg); // forward for facingRight
            expect(f.subState).toBe('walkForward');
        });

        it('walkBackward speed is 0.7x walkSpeed', () => {
            const f = makeFighter({ facingRight: true });
            tickFSM(f, InputBit.LEFT, cfg);
            expect(f.velX).toBeCloseTo(-cfg.walkSpeed * 0.7);
        });

        it('attack from walkForward', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkForward',
                velX: cfg.walkSpeed,
            });
            tickFSM(f, InputBit.PUNCH, cfgWithMoves);
            expect(f.subState).toBe('attack');
            expect(f.currentMove).toBe('punch');
        });

        it('attack from walkBackward', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkBackward',
                velX: -cfg.walkSpeed * 0.7,
            });
            tickFSM(f, InputBit.PUNCH, cfgWithMoves);
            expect(f.subState).toBe('attack');
            expect(f.currentMove).toBe('punch');
        });

        it('jump from walkForward', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkForward',
                velX: cfg.walkSpeed,
            });
            tickFSM(f, InputBit.UP, cfg);
            expect(f.topState).toBe(TopState.Airborne);
            expect(f.subState).toBe('jump');
        });

        it('crouch from walkForward', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'walkForward',
                velX: cfg.walkSpeed,
            });
            tickFSM(f, InputBit.DOWN, cfg);
            expect(f.subState).toBe('crouch');
        });
    });

    describe('chain cancel to special', () => {
        const cfgChainToSpecial: CharacterConfig = {
            ...cfgWithMoves,
            moves: {
                ...cfgWithMoves.moves,
                special: cfgWithSpecial.moves['special'],
            },
            specialCooldownFrames: 180,
            chainRoutes: [
                { from: 'punch', to: 'special', cancelWindow: [4, 8], onHitOnly: false },
            ],
        };

        it('chain cancel punch → special with P+K', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
            });
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgChainToSpecial);
            expect(f.currentMove).toBe('special');
            expect(f.specialCooldown).toBe(180);
        });

        it('chain cancel to special blocked during cooldown', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
                specialCooldown: 100,
            });
            tickFSM(f, InputBit.PUNCH | InputBit.KICK, cfgChainToSpecial);
            expect(f.currentMove).toBe('punch'); // no chain
        });
    });

    describe('chain cancel to crouch moves', () => {
        const cfgChainToCrouch: CharacterConfig = {
            ...cfgWithCrouchMoves,
            chainRoutes: [
                { from: 'punch', to: 'crouchPunch', cancelWindow: [4, 8], onHitOnly: false },
                { from: 'punch', to: 'crouchKick', cancelWindow: [4, 8], onHitOnly: false },
            ],
        };

        it('chain cancel punch → crouchPunch with DOWN+PUNCH', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
            });
            tickFSM(f, InputBit.DOWN | InputBit.PUNCH, cfgChainToCrouch);
            expect(f.currentMove).toBe('crouchPunch');
        });

        it('chain cancel punch → crouchKick with DOWN+KICK', () => {
            const f = makeFighter({
                topState: TopState.Grounded,
                subState: 'attack',
                currentMove: 'punch',
                frameInState: 5,
            });
            tickFSM(f, InputBit.DOWN | InputBit.KICK, cfgChainToCrouch);
            expect(f.currentMove).toBe('crouchKick');
        });
    });
});
