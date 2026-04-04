import { describe, it, expect } from 'vitest';
import { InputBit, TopState, RoundPhase } from '@shared/types';
import type { FighterState, GameState, ClientMsg, ServerMsg } from '@shared/types';

describe('InputBit', () => {
    it('LEFT | PUNCH === 17', () => {
        expect((InputBit.LEFT | InputBit.PUNCH)).toBe(17);
    });

    it('individual bits are powers of 2', () => {
        expect(InputBit.LEFT).toBe(1);
        expect(InputBit.RIGHT).toBe(2);
        expect(InputBit.UP).toBe(4);
        expect(InputBit.DOWN).toBe(8);
        expect(InputBit.PUNCH).toBe(16);
        expect(InputBit.KICK).toBe(32);
    });

    it('can combine and test multiple flags', () => {
        const bits = InputBit.LEFT | InputBit.UP | InputBit.PUNCH;
        expect(bits & InputBit.LEFT).toBeTruthy();
        expect(bits & InputBit.UP).toBeTruthy();
        expect(bits & InputBit.PUNCH).toBeTruthy();
        expect(bits & InputBit.RIGHT).toBeFalsy();
        expect(bits & InputBit.KICK).toBeFalsy();
    });
});

describe('TopState', () => {
    it('has expected values', () => {
        expect(TopState.Grounded).toBe('grounded');
        expect(TopState.Airborne).toBe('airborne');
        expect(TopState.Hitstun).toBe('hitstun');
        expect(TopState.Blockstun).toBe('blockstun');
        expect(TopState.Knockdown).toBe('knockdown');
    });
});

describe('RoundPhase', () => {
    it('has expected values', () => {
        expect(RoundPhase.Intro).toBe('intro');
        expect(RoundPhase.Fight).toBe('fight');
        expect(RoundPhase.KO).toBe('ko');
        expect(RoundPhase.RoundEnd).toBe('roundEnd');
        expect(RoundPhase.MatchEnd).toBe('matchEnd');
    });
});

describe('Type compatibility (compile-time checks)', () => {
    it('FighterState structure', () => {
        const state: FighterState = {
            x: 100, y: 200, velX: 0, velY: 0,
            hp: 1000, facingRight: true,
            topState: TopState.Grounded, subState: 'idle',
            frameInState: 0, currentMove: null,
            hitConfirmed: false, stunDuration: 0,
            hitStopFrames: 0, roundWins: 0,
        };
        expect(state.hp).toBe(1000);
    });

    it('GameState structure', () => {
        const fighter: FighterState = {
            x: 0, y: 0, velX: 0, velY: 0,
            hp: 1000, facingRight: true,
            topState: TopState.Grounded, subState: 'idle',
            frameInState: 0, currentMove: null,
            hitConfirmed: false, stunDuration: 0,
            hitStopFrames: 0, roundWins: 0,
        };
        const gs: GameState = {
            fighters: [fighter, { ...fighter, facingRight: false }],
            roundPhase: RoundPhase.Intro,
            roundTimer: 99,
            currentRound: 1,
            phaseFrames: 0,
            hitStop: 0,
        };
        expect(gs.fighters).toHaveLength(2);
    });

    it('ClientMsg discriminated union', () => {
        const msgs: ClientMsg[] = [
            { type: 'create_room' },
            { type: 'join_room', code: 'ABCD' },
            { type: 'ready' },
            { type: 'input', frame: 1, bits: InputBit.LEFT | InputBit.PUNCH },
            { type: 'select_character', characterId: 'petyaj' },
        ];
        expect(msgs).toHaveLength(5);
    });

    it('ServerMsg discriminated union', () => {
        const msgs: ServerMsg[] = [
            { type: 'room_created', code: 'XYZW' },
            { type: 'room_joined', playerIndex: 0 },
            { type: 'opponent_joined' },
            { type: 'fight_start', playerIndex: 1, p1CharId: 'petyaj', p2CharId: 'denis' },
            { type: 'opponent_selected' },
            { type: 'state_update', state: {} as GameState, frame: 10 },
            { type: 'opponent_disconnected' },
            { type: 'error', message: 'room not found' },
        ];
        expect(msgs).toHaveLength(8);
    });
});
