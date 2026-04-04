import type { AABB, FighterState, CharacterConfig, HitResult, MoveDef } from './types';

/** Check if two AABBs overlap. */
export function aabbOverlap(a: AABB, b: AABB): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/** Convert a local AABB offset to world coordinates, flipping if facing left. */
function toWorldAABB(local: AABB, fighter: FighterState): AABB {
    const flipX = fighter.facingRight ? 1 : -1;
    const worldX = fighter.x + local.x * flipX;
    return {
        x: fighter.facingRight ? worldX : worldX - local.width,
        y: fighter.y + local.y,
        width: local.width,
        height: local.height,
    };
}

/** Get the world-space hitbox for a fighter's current move (if in active frames). */
export function getWorldHitbox(
    fighter: FighterState,
    cfg: CharacterConfig,
): AABB | null {
    if (!fighter.currentMove) return null;
    const move: MoveDef | undefined = cfg.moves[fighter.currentMove];
    if (!move) return null;

    // Only return hitbox during active frames
    if (fighter.frameInState < move.startup) return null;
    if (fighter.frameInState >= move.startup + move.active) return null;

    return toWorldAABB(move.hitbox, fighter);
}

/** Get the world-space hurtbox for a fighter. */
export function getWorldHurtbox(fighter: FighterState, cfg: CharacterConfig): AABB {
    return toWorldAABB(cfg.hurtbox, fighter);
}

/**
 * Check if attacker's hitbox overlaps defender's hurtbox.
 * Returns HitResult if hit, null otherwise.
 */
export function checkHit(
    attacker: FighterState,
    attackerCfg: CharacterConfig,
    defender: FighterState,
    defenderCfg: CharacterConfig,
    attackerIndex: number,
    defenderIndex: number,
): HitResult | null {
    const hitbox = getWorldHitbox(attacker, attackerCfg);
    if (!hitbox) return null;

    const hurtbox = getWorldHurtbox(defender, defenderCfg);
    if (!aabbOverlap(hitbox, hurtbox)) return null;

    const move = attackerCfg.moves[attacker.currentMove!];
    const knockDir = attacker.facingRight ? 1 : -1;

    return {
        attackerIndex,
        defenderIndex,
        damage: move.damage,
        knockbackX: move.knockbackX * knockDir,
        knockbackY: move.knockbackY,
        hitStunFrames: move.hitStunFrames,
        blocked: false,
    };
}
