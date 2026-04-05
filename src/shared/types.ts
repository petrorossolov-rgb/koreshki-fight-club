// ── Enums ────────────────────────────────────────────────────────────

/** Bitflag input encoding — pack multiple inputs into one number per frame. */
export const enum InputBit {
    LEFT  = 1,       // 0b00000001
    RIGHT = 1 << 1,  // 0b00000010
    UP    = 1 << 2,  // 0b00000100
    DOWN  = 1 << 3,  // 0b00001000
    PUNCH = 1 << 4,  // 0b00010000
    KICK  = 1 << 5,  // 0b00100000
}

export const enum TopState {
    Grounded  = 'grounded',
    Airborne  = 'airborne',
    Hitstun   = 'hitstun',
    Blockstun = 'blockstun',
    Knockdown = 'knockdown',
}

export const enum RoundPhase {
    Intro    = 'intro',
    Fight    = 'fight',
    KO       = 'ko',
    RoundEnd = 'roundEnd',
    MatchEnd = 'matchEnd',
}

// ── Geometry ─────────────────────────────────────────────────────────

export interface AABB {
    x: number;      // offset from fighter origin
    y: number;
    width: number;
    height: number;
}

export interface HitResult {
    attackerIndex: number;
    defenderIndex: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    hitStunFrames: number;
    blocked: boolean;
}

// ── Combo / Chain ───────────────────────────────────────────────────

export interface ChainRoute {
    from: string;
    to: string;
    cancelWindow: [number, number]; // [earliest, latest] frameInState
    onHitOnly: boolean;
}

export type GameEvent =
    | { type: 'hit'; attackerIdx: number; defenderIdx: number; moveKey: string; damage: number; x: number; y: number }
    | { type: 'block'; x: number; y: number }
    | { type: 'ko'; loserIdx: number }
    | { type: 'round_start'; round: number }
    | { type: 'match_end'; winnerIdx: number }
    | { type: 'special_used'; playerIdx: number };

// ── Character Config (JSON data) ─────────────────────────────────────

export interface AnimDef {
    key: string;          // animation key in spritesheet
    frameStart: number;
    frameEnd: number;
    frameRate: number;
    repeat: number;       // -1 = loop
}

export interface MoveDef {
    name: string;
    damage: number;
    startup: number;      // frames before active
    active: number;       // active hitbox frames
    recovery: number;     // frames after active
    hitbox: AABB;
    knockbackX: number;
    knockbackY: number;
    hitStunFrames: number;
    blockStunFrames: number;
}

export interface CharacterConfig {
    id: string;
    name: string;
    displayName: string;
    spriteSheet: string;
    frameWidth: number;
    frameHeight: number;
    animations: Record<string, AnimDef>;
    moves: Record<string, MoveDef>;
    pushbox: AABB;
    hurtbox: AABB;
    walkSpeed: number;
    jumpVelY: number;     // negative (upward)
    weight: number;       // knockback multiplier (higher = less knockback)
    description: string;       // humorous one-liner for select screen
    nickname: string;          // in-game title ("Long guy", "Bigi")
    scale: number;             // visual sprite scale (0.85–1.25)
    tint: number;              // hex color tint (0xFFFFFF = no tint)
    portraitFrame: number;     // frame index for preview in select grid
    maxHp: number;             // per-character HP (replaces DEFAULT_HP usage)
    chainRoutes?: ChainRoute[];
    specialCooldownFrames?: number;
}

// ── Fighter State (per-frame mutable state) ──────────────────────────

export interface FighterState {
    x: number;
    y: number;
    velX: number;
    velY: number;
    hp: number;
    facingRight: boolean;
    topState: TopState;
    subState: string;       // e.g. "idle", "walkForward", "attack"
    frameInState: number;
    currentMove: string | null;   // key into CharacterConfig.moves
    hitConfirmed: boolean;        // true if currentMove already connected
    stunDuration: number;         // frames of hitstun/blockstun remaining (set on hit)
    hitStopFrames: number;
    roundWins: number;
    comboCount: number;
    comboDamage: number;
    specialCooldown: number;
    isCrouching: boolean;
}

// ── Game State ───────────────────────────────────────────────────────

export interface GameState {
    fighters: [FighterState, FighterState];
    roundPhase: RoundPhase;
    roundTimer: number;       // seconds remaining
    currentRound: number;     // 1-based
    phaseFrames: number;      // frames elapsed in current phase
    hitStop: number;          // global hit-stop counter (frames)
    matchStats: {
        hits: [number, number];
        damage: [number, number];
        maxCombo: [number, number];
    };
}

// ── Input ────────────────────────────────────────────────────────────

export interface InputFrame {
    frame: number;
    bits: number;   // packed InputBit flags
}

// ── Network Messages ─────────────────────────────────────────────────

export type ClientMsg =
    | { type: 'create_room' }
    | { type: 'join_room'; code: string }
    | { type: 'ready' }
    | { type: 'input'; frame: number; bits: number }
    | { type: 'select_character'; characterId: string }
    | { type: 'rejoin_room'; code: string; playerIndex: 0 | 1 };

export type ServerMsg =
    | { type: 'room_created'; code: string }
    | { type: 'room_joined'; playerIndex: 0 | 1 }
    | { type: 'opponent_joined' }
    | { type: 'fight_start'; playerIndex: 0 | 1; p1CharId: string; p2CharId: string }
    | { type: 'opponent_selected' }
    | { type: 'state_update'; state: GameState; frame: number; events?: GameEvent[] }
    | { type: 'opponent_disconnected' }
    | { type: 'opponent_disconnecting'; graceSeconds: number }
    | { type: 'opponent_reconnected' }
    | { type: 'rejoin_success'; state: GameState; frame: number }
    | { type: 'error'; message: string };
