import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '../../../public/data/characters');

interface ManifestEntry {
    id: string;
    file: string;
    displayName: string;
    nickname: string;
    description: string;
    category: string;
    tint: number;
    stats: { power: number; speed: number; health: number };
}

interface Manifest {
    version: number;
    characters: ManifestEntry[];
}

const REQUIRED_ANIM_KEYS = ['idle', 'run', 'jump', 'fall', 'crouch', 'attack', 'hit', 'dead'];
const REQUIRED_MOVE_KEYS = ['punch', 'kick', 'special', 'crouchPunch', 'crouchKick', 'jumpPunch', 'jumpKick'];

const manifest: Manifest = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf-8'),
);

const configs = manifest.characters.map((entry) => {
    const filePath = path.resolve(DATA_DIR, '..', '..', entry.file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { entry, config: JSON.parse(raw) };
});

describe('Character configs (via manifest)', () => {
    it('manifest has exactly 17 characters', () => {
        expect(manifest.characters).toHaveLength(17);
    });

    it('all character IDs are unique', () => {
        const ids = manifest.characters.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all manifest entries have required fields', () => {
        for (const entry of manifest.characters) {
            expect(entry.id).toBeTypeOf('string');
            expect(entry.file).toBeTypeOf('string');
            expect(entry.displayName).toBeTypeOf('string');
            expect(entry.nickname).toBeTypeOf('string');
            expect(entry.description).toBeTypeOf('string');
            expect(entry.category).toBeTypeOf('string');
            expect(entry.tint).toBeTypeOf('number');
            expect(entry.stats).toBeDefined();
            expect(entry.stats.power).toBeTypeOf('number');
            expect(entry.stats.speed).toBeTypeOf('number');
            expect(entry.stats.health).toBeTypeOf('number');
        }
    });

    describe.each(configs)('$entry.id', ({ entry, config }) => {
        it('JSON file exists and has matching id', () => {
            expect(config.id).toBe(entry.id);
        });

        it('has required string fields', () => {
            expect(config.displayName).toBeTypeOf('string');
            expect(config.name).toBeTypeOf('string');
            expect(config.spriteSheet).toBeTypeOf('string');
            expect(config.description).toBeTypeOf('string');
            expect(config.nickname).toBeTypeOf('string');
        });

        it('references shared spritesheet', () => {
            expect(config.spriteSheet).toBe('assets/fighters/martial-hero.png');
        });

        it('has valid numeric stats', () => {
            expect(config.walkSpeed).toBeGreaterThan(0);
            expect(config.maxHp).toBeGreaterThan(0);
            expect(config.scale).toBeGreaterThan(0);
            expect(config.frameWidth).toBeGreaterThan(0);
            expect(config.frameHeight).toBeGreaterThan(0);
            expect(config.weight).toBeGreaterThan(0);
            expect(config.jumpVelY).toBeLessThan(0); // negative = upward
            expect(config.tint).toBeTypeOf('number');
            expect(config.portraitFrame).toBeTypeOf('number');
        });

        it('has all required animation keys', () => {
            for (const key of REQUIRED_ANIM_KEYS) {
                expect(config.animations, `missing animation: ${key}`).toHaveProperty(key);
                const anim = config.animations[key];
                expect(anim.frameStart).toBeTypeOf('number');
                expect(anim.frameEnd).toBeTypeOf('number');
                expect(anim.frameRate).toBeGreaterThan(0);
                expect(anim.repeat).toBeTypeOf('number');
            }
        });

        it('has all required move keys', () => {
            for (const key of REQUIRED_MOVE_KEYS) {
                expect(config.moves, `missing move: ${key}`).toHaveProperty(key);
                const move = config.moves[key];
                expect(move.damage).toBeGreaterThan(0);
                expect(move.startup).toBeGreaterThan(0);
                expect(move.active).toBeGreaterThan(0);
                expect(move.recovery).toBeGreaterThan(0);
                expect(move.hitbox).toBeDefined();
                expect(move.hitbox.width).toBeGreaterThan(0);
                expect(move.hitbox.height).toBeGreaterThan(0);
                expect(move.knockbackX).toBeTypeOf('number');
                expect(move.knockbackY).toBeTypeOf('number');
                expect(move.hitStunFrames).toBeGreaterThan(0);
                expect(move.blockStunFrames).toBeGreaterThan(0);
            }
        });

        it('has valid chainRoutes', () => {
            expect(Array.isArray(config.chainRoutes)).toBe(true);
            expect(config.chainRoutes.length).toBeGreaterThan(0);
            for (const route of config.chainRoutes) {
                expect(route.from).toBeTypeOf('string');
                expect(route.to).toBeTypeOf('string');
                expect(config.moves).toHaveProperty(route.from);
                expect(config.moves).toHaveProperty(route.to);
                expect(Array.isArray(route.cancelWindow)).toBe(true);
                expect(route.cancelWindow).toHaveLength(2);
                expect(route.cancelWindow[0]).toBeLessThanOrEqual(route.cancelWindow[1]);
                expect(route.onHitOnly).toBeTypeOf('boolean');
            }
        });

        it('has specialCooldownFrames', () => {
            expect(config.specialCooldownFrames).toBeTypeOf('number');
            expect(config.specialCooldownFrames).toBeGreaterThan(0);
        });

        it('special move has a humorous name', () => {
            expect(config.moves.special.name).toBeTypeOf('string');
            expect(config.moves.special.name).not.toBe('');
        });

        it('has valid pushbox and hurtbox', () => {
            for (const box of [config.pushbox, config.hurtbox]) {
                expect(box).toBeDefined();
                expect(box.width).toBeGreaterThan(0);
                expect(box.height).toBeGreaterThan(0);
                expect(box.x).toBeTypeOf('number');
                expect(box.y).toBeTypeOf('number');
            }
        });
    });
});
