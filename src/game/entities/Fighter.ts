import Phaser from 'phaser';
import type { CharacterConfig, FighterState } from '@shared/types';

// Origin Y placed at the character's feet within the 126px frame.
// Measured: lowest non-transparent pixel is at y=81 → (81+1)/126 ≈ 0.651.
// Scaling happens around origin, so feet stay pinned to state.y at any scale.
const FEET_ORIGIN_Y = 82 / 126;

/** Map FSM state keys to animation config keys. */
const STATE_TO_ANIM: Record<string, string> = {
    'grounded/idle': 'idle',
    'grounded/walkForward': 'run',
    'grounded/walkBackward': 'run',
    'grounded/crouch': 'crouch',
    'grounded/attack': 'attack',
    'airborne/jump': 'jump',
    'airborne/fall': 'fall',
    'airborne/attack': 'attack',
};

export class Fighter {
    readonly sprite: Phaser.GameObjects.Sprite;
    private readonly config: CharacterConfig;
    private readonly animPrefix: string;
    private currentAnimKey = '';
    private flashFrames = 0;
    private wasInHitstun = false;

    constructor(scene: Phaser.Scene, config: CharacterConfig, playerIndex: number) {
        this.config = config;
        this.animPrefix = `${config.id}_p${playerIndex}_`;

        this.createAnimations(scene);

        this.sprite = scene.add.sprite(0, 0, config.id);
        this.sprite.setOrigin(0.5, FEET_ORIGIN_Y);
        this.sprite.setScale(config.scale);
    }

    /** Preload character spritesheet (skip if already loaded). */
    static loadAssets(scene: Phaser.Scene, config: CharacterConfig): void {
        if (scene.textures.exists(config.id)) return;
        scene.load.spritesheet(config.id, config.spriteSheet, {
            frameWidth: config.frameWidth,
            frameHeight: config.frameHeight,
        });
    }

    /** Sync visual sprite to authoritative FighterState. */
    syncToState(state: FighterState): void {
        this.sprite.setPosition(state.x, state.y);
        this.sprite.setFlipX(!state.facingRight);

        const stateKey = `${state.topState}/${state.subState}`;
        let animConfigKey = STATE_TO_ANIM[stateKey] ?? 'idle';

        // Use move-specific animation when attacking (punch, kick, special, etc.)
        if (state.subState === 'attack' && state.currentMove) {
            const moveAnim = this.config.animations[state.currentMove];
            if (moveAnim) animConfigKey = state.currentMove;
        }

        const animKey = this.animPrefix + animConfigKey;

        if (this.currentAnimKey !== animKey) {
            this.sprite.play(animKey);
            this.currentAnimKey = animKey;
        }

        // Detect hitstun entry → trigger flash
        const inHitstun = state.subState === 'hitstun';
        if (inHitstun && !this.wasInHitstun) {
            this.flashHit();
        }
        this.wasInHitstun = inHitstun;

        // Tick flash counter
        if (this.flashFrames > 0) {
            this.flashFrames--;
            if (this.flashFrames === 0) {
                this.sprite.clearTint();
            }
        }
    }

    /** Flash white on hit for 3 frames. */
    flashHit(): void {
        this.sprite.setTintFill(0xffffff);
        this.flashFrames = 3;
    }

    destroy(): void {
        this.sprite.destroy();
    }

    private createAnimations(scene: Phaser.Scene): void {
        const anims = this.config.animations;
        for (const [name, def] of Object.entries(anims)) {
            const key = this.animPrefix + name;
            if (scene.anims.exists(key)) continue;
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(this.config.id, {
                    start: def.frameStart,
                    end: def.frameEnd,
                }),
                frameRate: def.frameRate,
                repeat: def.repeat,
            });
        }
    }
}
