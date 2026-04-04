import { InputBit, TopState } from '@shared/types';
import type { FighterState, CharacterConfig } from '@shared/types';

// ── State handler interface ─────────────────────────────────────────

export interface StateHandler {
    enter(f: FighterState, cfg: CharacterConfig): void;
    update(f: FighterState, bits: number, cfg: CharacterConfig): void;
    exit(f: FighterState, cfg: CharacterConfig): void;
}

// ── Helpers ─────────────────────────────────────────────────────────

function setStateKey(f: FighterState, top: TopState, sub: string): void {
    f.topState = top;
    f.subState = sub;
    f.frameInState = 0;
}

function has(bits: number, flag: InputBit): boolean {
    return (bits & flag) !== 0;
}

function facingDir(f: FighterState): number {
    return f.facingRight ? 1 : -1;
}

// ── State handlers ──────────────────────────────────────────────────

const idle: StateHandler = {
    enter() {},
    update(f, bits, cfg) {
        if (has(bits, InputBit.UP)) {
            transition(f, cfg, TopState.Airborne, 'jump');
            return;
        }
        if (has(bits, InputBit.DOWN)) {
            transition(f, cfg, TopState.Grounded, 'crouch');
            return;
        }
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        if (lr !== 0) {
            const forward = lr === facingDir(f);
            transition(f, cfg, TopState.Grounded, forward ? 'walkForward' : 'walkBackward');
            return;
        }
        f.velX = 0;
    },
    exit() {},
};

const walkForward: StateHandler = {
    enter(f, cfg) { f.velX = cfg.walkSpeed * facingDir(f); },
    update(f, bits, cfg) {
        if (has(bits, InputBit.UP)) {
            transition(f, cfg, TopState.Airborne, 'jump');
            return;
        }
        if (has(bits, InputBit.DOWN)) {
            transition(f, cfg, TopState.Grounded, 'crouch');
            return;
        }
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        if (lr === 0) { transition(f, cfg, TopState.Grounded, 'idle'); return; }
        const forward = lr === facingDir(f);
        if (!forward) { transition(f, cfg, TopState.Grounded, 'walkBackward'); return; }
        f.velX = cfg.walkSpeed * facingDir(f);
    },
    exit(f) { f.velX = 0; },
};

const walkBackward: StateHandler = {
    enter(f, cfg) { f.velX = -cfg.walkSpeed * facingDir(f) * 0.7; },
    update(f, bits, cfg) {
        if (has(bits, InputBit.UP)) {
            transition(f, cfg, TopState.Airborne, 'jump');
            return;
        }
        if (has(bits, InputBit.DOWN)) {
            transition(f, cfg, TopState.Grounded, 'crouch');
            return;
        }
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        if (lr === 0) { transition(f, cfg, TopState.Grounded, 'idle'); return; }
        const forward = lr === facingDir(f);
        if (forward) { transition(f, cfg, TopState.Grounded, 'walkForward'); return; }
        f.velX = -cfg.walkSpeed * facingDir(f) * 0.7;
    },
    exit(f) { f.velX = 0; },
};

const crouch: StateHandler = {
    enter(f) { f.velX = 0; },
    update(f, bits, cfg) {
        if (!has(bits, InputBit.DOWN)) {
            transition(f, cfg, TopState.Grounded, 'idle');
            return;
        }
    },
    exit() {},
};

const jump: StateHandler = {
    enter(f, cfg) {
        f.velY = cfg.jumpVelY;
    },
    update(f, bits, cfg) {
        // Horizontal air control
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        f.velX = lr * cfg.walkSpeed * 0.8;

        if (f.velY >= 0) {
            transition(f, cfg, TopState.Airborne, 'fall');
        }
    },
    exit() {},
};

const fall: StateHandler = {
    enter() {},
    update(f, _bits, cfg) {
        // Horizontal air control
        const lr = (has(_bits, InputBit.RIGHT) ? 1 : 0) - (has(_bits, InputBit.LEFT) ? 1 : 0);
        f.velX = lr * cfg.walkSpeed * 0.8;

        // Landing is handled by clampToStage in PhysicsSystem
        // which sets topState=Grounded when y >= FLOOR_Y
    },
    exit() {},
};

// ── State map ───────────────────────────────────────────────────────

const stateMap: Record<string, StateHandler> = {
    'grounded/idle': idle,
    'grounded/walkForward': walkForward,
    'grounded/walkBackward': walkBackward,
    'grounded/crouch': crouch,
    'airborne/jump': jump,
    'airborne/fall': fall,
};

// ── Public API ──────────────────────────────────────────────────────

function stateKey(f: FighterState): string {
    return `${f.topState}/${f.subState}`;
}

function transition(f: FighterState, cfg: CharacterConfig, top: TopState, sub: string): void {
    const oldHandler = stateMap[stateKey(f)];
    if (oldHandler) oldHandler.exit(f, cfg);
    setStateKey(f, top, sub);
    const newHandler = stateMap[stateKey(f)];
    if (newHandler) newHandler.enter(f, cfg);
}

/** Tick the FSM for one frame. */
export function tickFSM(f: FighterState, bits: number, cfg: CharacterConfig): void {
    const key = stateKey(f);
    const handler = stateMap[key];
    if (handler) {
        handler.update(f, bits, cfg);
    }
    f.frameInState++;
}

export { stateMap, transition };
