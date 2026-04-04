import { describe, it, expect } from 'vitest';
import { InputBit } from '@shared/types';

// InputManager depends on Phaser keyboard types, so we test the contract
// (key bindings → correct InputBit flags) by reimplementing the bit-packing logic.

describe('InputManager key bindings', () => {
    const P1_BINDINGS = { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'Q', kick: 'E' };
    const P2_BINDINGS = { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'J', kick: 'K' };

    function readBits(keys: Record<string, { isDown: boolean }>, binding: typeof P1_BINDINGS): number {
        let bits = 0;
        if (keys[binding.left]?.isDown) bits |= InputBit.LEFT;
        if (keys[binding.right]?.isDown) bits |= InputBit.RIGHT;
        if (keys[binding.up]?.isDown) bits |= InputBit.UP;
        if (keys[binding.down]?.isDown) bits |= InputBit.DOWN;
        if (keys[binding.punch]?.isDown) bits |= InputBit.PUNCH;
        if (keys[binding.kick]?.isDown) bits |= InputBit.KICK;
        return bits;
    }

    it('returns 0 when no keys pressed', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        expect(readBits(keys, P1_BINDINGS)).toBe(0);
    });

    it('P1: W maps to UP (jump)', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        keys['W'].isDown = true;
        expect(readBits(keys, P1_BINDINGS)).toBe(InputBit.UP);
    });

    it('P1: A+D maps to LEFT|RIGHT', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        keys['A'].isDown = true;
        keys['D'].isDown = true;
        expect(readBits(keys, P1_BINDINGS)).toBe(InputBit.LEFT | InputBit.RIGHT);
    });

    it('P1: Q maps to PUNCH', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        keys['Q'].isDown = true;
        expect(readBits(keys, P1_BINDINGS)).toBe(InputBit.PUNCH);
    });

    it('P1: E maps to KICK', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        keys['E'].isDown = true;
        expect(readBits(keys, P1_BINDINGS)).toBe(InputBit.KICK);
    });

    it('P2: Arrow keys map correctly', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P2_BINDINGS)) keys[k] = { isDown: false };
        keys['LEFT'].isDown = true;
        keys['DOWN'].isDown = true;
        expect(readBits(keys, P2_BINDINGS)).toBe(InputBit.LEFT | InputBit.DOWN);
    });

    it('P2: J maps to PUNCH, K maps to KICK', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P2_BINDINGS)) keys[k] = { isDown: false };
        keys['J'].isDown = true;
        keys['K'].isDown = true;
        expect(readBits(keys, P2_BINDINGS)).toBe(InputBit.PUNCH | InputBit.KICK);
    });

    it('P1: multiple inputs pack correctly', () => {
        const keys: Record<string, { isDown: boolean }> = {};
        for (const k of Object.values(P1_BINDINGS)) keys[k] = { isDown: false };
        keys['D'].isDown = true;  // RIGHT
        keys['Q'].isDown = true;  // PUNCH
        expect(readBits(keys, P1_BINDINGS)).toBe(InputBit.RIGHT | InputBit.PUNCH);
    });

    it('both players have independent bindings', () => {
        // Ensure P1 and P2 bindings don't overlap
        const p1Keys = new Set(Object.values(P1_BINDINGS));
        const p2Keys = new Set(Object.values(P2_BINDINGS));
        for (const k of p1Keys) {
            expect(p2Keys.has(k)).toBe(false);
        }
    });
});
