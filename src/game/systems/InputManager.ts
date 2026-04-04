import { InputBit } from '@shared/types';
import type { InputFrame } from '@shared/types';

interface KeyBinding {
    left: string;
    right: string;
    up: string;
    down: string;
    punch: string;
    kick: string;
}

const BINDINGS: [KeyBinding, KeyBinding] = [
    // P1: WASD + Q/E
    { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'Q', kick: 'E' },
    // P2: Arrows + J/K
    { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'J', kick: 'K' },
];

export class InputManager {
    private keys: Array<Record<string, Phaser.Input.Keyboard.Key>> = [];
    private frame = 0;

    constructor(scene: Phaser.Scene) {
        const kb = scene.input.keyboard!;

        for (const binding of BINDINGS) {
            this.keys.push({
                left: kb.addKey(binding.left),
                right: kb.addKey(binding.right),
                up: kb.addKey(binding.up),
                down: kb.addKey(binding.down),
                punch: kb.addKey(binding.punch),
                kick: kb.addKey(binding.kick),
            });
        }
    }

    /** Advance the frame counter (call once per fixed tick). */
    tick(): void {
        this.frame++;
    }

    /** Read packed input bits for the given player. */
    readInput(playerIndex: number): InputFrame {
        const k = this.keys[playerIndex];
        let bits = 0;

        if (k.left.isDown) bits |= InputBit.LEFT;
        if (k.right.isDown) bits |= InputBit.RIGHT;
        if (k.up.isDown) bits |= InputBit.UP;
        if (k.down.isDown) bits |= InputBit.DOWN;
        if (k.punch.isDown) bits |= InputBit.PUNCH;
        if (k.kick.isDown) bits |= InputBit.KICK;

        return { frame: this.frame, bits };
    }
}
