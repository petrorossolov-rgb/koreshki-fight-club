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
});
