import { InputBit, TopState } from './types';
import type { FighterState, CharacterConfig, MoveDef } from './types';

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

function getMove(f: FighterState, cfg: CharacterConfig): MoveDef | null {
    return f.currentMove ? cfg.moves[f.currentMove] ?? null : null;
}

function totalMoveFrames(move: MoveDef): number {
    return move.startup + move.active + move.recovery;
}

/** Check for air attack input and transition to airborne/attack if a move exists. */
function tryAirAttack(f: FighterState, bits: number, cfg: CharacterConfig): boolean {
    let moveKey: string | null = null;
    if (has(bits, InputBit.PUNCH) && cfg.moves['jumpPunch']) {
        moveKey = 'jumpPunch';
    } else if (has(bits, InputBit.KICK) && cfg.moves['jumpKick']) {
        moveKey = 'jumpKick';
    }
    if (moveKey) {
        f.currentMove = moveKey;
        transition(f, cfg, TopState.Airborne, 'attack');
        return true;
    }
    return false;
}

/** Check for attack input and transition to grounded/attack if a move exists. */
function tryAttack(f: FighterState, bits: number, cfg: CharacterConfig): boolean {
    let moveKey: string | null = null;
    // P+K → special (priority over individual buttons)
    if (has(bits, InputBit.PUNCH) && has(bits, InputBit.KICK)
        && cfg.moves['special'] && f.specialCooldown <= 0) {
        moveKey = 'special';
        f.specialCooldown = cfg.specialCooldownFrames ?? 300;
    } else if (has(bits, InputBit.PUNCH) && cfg.moves['punch']) {
        moveKey = 'punch';
    } else if (has(bits, InputBit.KICK) && cfg.moves['kick']) {
        moveKey = 'kick';
    }
    if (moveKey) {
        f.currentMove = moveKey;
        transition(f, cfg, TopState.Grounded, 'attack');
        return true;
    }
    return false;
}

// ── State handlers ──────────────────────────────────────────────────

const idle: StateHandler = {
    enter() {},
    update(f, bits, cfg) {
        if (tryAttack(f, bits, cfg)) return;
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
        if (tryAttack(f, bits, cfg)) return;
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
        if (tryAttack(f, bits, cfg)) return;
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
        // Crouch attacks
        let moveKey: string | null = null;
        if (has(bits, InputBit.PUNCH) && has(bits, InputBit.KICK)
            && cfg.moves['special'] && f.specialCooldown <= 0) {
            moveKey = 'special';
            f.specialCooldown = cfg.specialCooldownFrames ?? 300;
        } else if (has(bits, InputBit.PUNCH) && cfg.moves['crouchPunch']) {
            moveKey = 'crouchPunch';
        } else if (has(bits, InputBit.KICK) && cfg.moves['crouchKick']) {
            moveKey = 'crouchKick';
        }
        if (moveKey) {
            f.isCrouching = true;
            f.currentMove = moveKey;
            transition(f, cfg, TopState.Grounded, 'attack');
        }
    },
    exit() {},
};

// ── Attack states ──────────────────────────────────────────────────

const attack: StateHandler = {
    enter(f) {
        f.velX = 0;
        // currentMove must be set BEFORE transitioning to this state
    },
    update(f, bits, cfg) {
        const move = getMove(f, cfg);
        if (!move) {
            transition(f, cfg, TopState.Grounded, 'idle');
            return;
        }
        // Chain cancel check (before completion)
        for (const route of cfg.chainRoutes ?? []) {
            if (route.from !== f.currentMove) continue;
            if (f.frameInState < route.cancelWindow[0] || f.frameInState > route.cancelWindow[1]) continue;
            if (route.onHitOnly && !f.hitConfirmed) continue;
            // Check if player is pressing the right button for the target move
            const toMove = cfg.moves[route.to];
            if (!toMove) continue;
            let wantsChain = false;
            if (route.to === 'special' && has(bits, InputBit.PUNCH) && has(bits, InputBit.KICK) && f.specialCooldown <= 0) {
                wantsChain = true;
                f.specialCooldown = cfg.specialCooldownFrames ?? 300;
            } else if (route.to === 'punch' && has(bits, InputBit.PUNCH)) {
                wantsChain = true;
            } else if (route.to === 'kick' && has(bits, InputBit.KICK)) {
                wantsChain = true;
            } else if (route.to.startsWith('crouch') && has(bits, InputBit.DOWN)) {
                if (route.to === 'crouchPunch' && has(bits, InputBit.PUNCH)) wantsChain = true;
                else if (route.to === 'crouchKick' && has(bits, InputBit.KICK)) wantsChain = true;
            }
            if (wantsChain) {
                // In-place reset — bypass exit/enter to keep combo flowing
                f.currentMove = route.to;
                f.hitConfirmed = false;
                f.frameInState = 0;
                return;
            }
        }
        if (f.frameInState >= totalMoveFrames(move)) {
            if (f.isCrouching) {
                transition(f, cfg, TopState.Grounded, 'crouch');
            } else {
                transition(f, cfg, TopState.Grounded, 'idle');
            }
        }
    },
    exit(f) {
        f.currentMove = null;
        f.hitConfirmed = false;
        f.isCrouching = false;
    },
};

const block: StateHandler = {
    enter(f) { f.velX = 0; },
    update(f, bits, cfg) {
        // Hold back to keep blocking; release to return to idle
        const holdingBack = f.facingRight ? has(bits, InputBit.LEFT) : has(bits, InputBit.RIGHT);
        if (!holdingBack) {
            transition(f, cfg, TopState.Grounded, 'idle');
        }
    },
    exit() {},
};

// ── Hitstun / knockdown states ─────────────────────────────────────

const hitstunStanding: StateHandler = {
    enter(f) { f.velX = 0; },
    update(f, _bits, cfg) {
        if (f.frameInState >= f.stunDuration) {
            transition(f, cfg, TopState.Grounded, 'idle');
        }
    },
    exit(f) { f.currentMove = null; f.stunDuration = 0; },
};

const blockstunStanding: StateHandler = {
    enter(f) { f.velX = 0; },
    update(f, _bits, cfg) {
        if (f.frameInState >= f.stunDuration) {
            transition(f, cfg, TopState.Grounded, 'idle');
        }
    },
    exit(f) { f.currentMove = null; f.stunDuration = 0; },
};

const knockdownFalling: StateHandler = {
    enter() {},
    update(f, _bits, cfg) {
        // Wait until landed (y >= FLOOR_Y handled by physics), then get up
        if (f.topState === TopState.Knockdown && f.velY === 0 && f.frameInState > 0) {
            transition(f, cfg, TopState.Knockdown, 'getup');
        }
    },
    exit() {},
};

const knockdownGetup: StateHandler = {
    enter(f) { f.velX = 0; },
    update(f, _bits, cfg) {
        // Getup takes 30 frames
        if (f.frameInState >= 30) {
            transition(f, cfg, TopState.Grounded, 'idle');
        }
    },
    exit() {},
};

const jump: StateHandler = {
    enter(f, cfg) {
        f.velY = cfg.jumpVelY;
    },
    update(f, bits, cfg) {
        // Jump attacks
        if (tryAirAttack(f, bits, cfg)) return;

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
    update(f, bits, cfg) {
        // Jump attacks
        if (tryAirAttack(f, bits, cfg)) return;

        // Horizontal air control
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        f.velX = lr * cfg.walkSpeed * 0.8;

        // Landing is handled by clampToStage in PhysicsSystem
        // which sets topState=Grounded when y >= FLOOR_Y
    },
    exit() {},
};

const airborneAttack: StateHandler = {
    enter() {
        // Keep current velocity — don't zero velX
    },
    update(f, bits, cfg) {
        // Air control during attack
        const lr = (has(bits, InputBit.RIGHT) ? 1 : 0) - (has(bits, InputBit.LEFT) ? 1 : 0);
        f.velX = lr * cfg.walkSpeed * 0.8;

        const move = getMove(f, cfg);
        if (!move) {
            transition(f, cfg, TopState.Airborne, 'fall');
            return;
        }
        if (f.frameInState >= totalMoveFrames(move)) {
            transition(f, cfg, TopState.Airborne, 'fall');
        }
    },
    exit(f) {
        f.currentMove = null;
        f.hitConfirmed = false;
    },
};

// ── State map ───────────────────────────────────────────────────────

const stateMap: Record<string, StateHandler> = {
    'grounded/idle': idle,
    'grounded/walkForward': walkForward,
    'grounded/walkBackward': walkBackward,
    'grounded/crouch': crouch,
    'grounded/attack': attack,
    'grounded/block': block,
    'airborne/jump': jump,
    'airborne/fall': fall,
    'airborne/attack': airborneAttack,
    'hitstun/standing': hitstunStanding,
    'blockstun/standing': blockstunStanding,
    'knockdown/falling': knockdownFalling,
    'knockdown/getup': knockdownGetup,
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
