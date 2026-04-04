import { InputBit } from '@shared/types';
import type { InputFrame } from '@shared/types';
import { TouchControls, isTouchDevice } from '@game/ui/TouchControls';

// ── InputSource interface ───────────────────────────────────────────

export interface InputSource {
    readBits(): number;
    destroy?(): void;
}

// ── KeyboardSource ──────────────────────────────────────────────────

interface KeyBinding {
    left: string;
    right: string;
    up: string;
    down: string;
    punch: string;
    kick: string;
}

const BINDINGS: [KeyBinding, KeyBinding] = [
    { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'Q', kick: 'E' },
    { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'J', kick: 'K' },
];

export class KeyboardSource implements InputSource {
    private keys: Record<string, Phaser.Input.Keyboard.Key>;

    constructor(scene: Phaser.Scene, playerIndex: number) {
        const kb = scene.input.keyboard!;
        const binding = BINDINGS[playerIndex];
        this.keys = {
            left: kb.addKey(binding.left),
            right: kb.addKey(binding.right),
            up: kb.addKey(binding.up),
            down: kb.addKey(binding.down),
            punch: kb.addKey(binding.punch),
            kick: kb.addKey(binding.kick),
        };
    }

    readBits(): number {
        let bits = 0;
        if (this.keys.left.isDown) bits |= InputBit.LEFT;
        if (this.keys.right.isDown) bits |= InputBit.RIGHT;
        if (this.keys.up.isDown) bits |= InputBit.UP;
        if (this.keys.down.isDown) bits |= InputBit.DOWN;
        if (this.keys.punch.isDown) bits |= InputBit.PUNCH;
        if (this.keys.kick.isDown) bits |= InputBit.KICK;
        return bits;
    }
}

// ── TouchSource ─────────────────────────────────────────────────────

export class TouchSource implements InputSource {
    private controls: TouchControls;

    constructor() {
        this.controls = new TouchControls();
    }

    readBits(): number {
        return this.controls.readBits();
    }

    destroy(): void {
        this.controls.destroy();
    }
}

// ── NetworkSource (stub for online mode) ────────────────────────────

export class NetworkSource implements InputSource {
    private bits = 0;

    /** Called by network layer to feed remote input. */
    setBits(bits: number): void {
        this.bits = bits;
    }

    readBits(): number {
        return this.bits;
    }
}

// ── InputManager ────────────────────────────────────────────────────

export class InputManager {
    private sources: InputSource[];
    private frame = 0;

    constructor(scene: Phaser.Scene) {
        if (isTouchDevice()) {
            // Touch: P1 uses touch, P2 uses network stub (online) or nothing (local)
            this.sources = [new TouchSource(), new NetworkSource()];
        } else {
            // Desktop: both players on keyboard
            this.sources = [
                new KeyboardSource(scene, 0),
                new KeyboardSource(scene, 1),
            ];
        }
    }

    /** Replace the input source for a specific player. */
    setSource(playerIndex: number, source: InputSource): void {
        const old = this.sources[playerIndex];
        if (old?.destroy) old.destroy();
        this.sources[playerIndex] = source;
    }

    /** Get the input source for a specific player. */
    getSource(playerIndex: number): InputSource {
        return this.sources[playerIndex];
    }

    /** Advance the frame counter (call once per fixed tick). */
    tick(): void {
        this.frame++;
    }

    /** Read packed input bits for the given player. */
    readInput(playerIndex: number): InputFrame {
        const bits = this.sources[playerIndex]?.readBits() ?? 0;
        return { frame: this.frame, bits };
    }

    /** Clean up all sources. */
    destroy(): void {
        for (const source of this.sources) {
            if (source.destroy) source.destroy();
        }
    }
}
