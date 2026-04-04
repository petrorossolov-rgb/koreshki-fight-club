import Phaser from 'phaser';
import type { CharacterConfig, FighterState } from '@shared/types';

/** Map FSM state keys to animation config keys. */
const STATE_TO_ANIM: Record<string, string> = {
    'grounded/idle': 'idle',
    'grounded/walkForward': 'run',
    'grounded/walkBackward': 'run',
    'grounded/crouch': 'crouch',
    'airborne/jump': 'jump',
    'airborne/fall': 'fall',
};

export class Fighter {
    readonly sprite: Phaser.GameObjects.Sprite;
    private readonly config: CharacterConfig;
    private readonly animPrefix: string;
    private currentAnimKey = '';

    constructor(scene: Phaser.Scene, config: CharacterConfig, playerIndex: number) {
        this.config = config;
        this.animPrefix = `${config.id}_p${playerIndex}_`;

        this.createAnimations(scene);

        this.sprite = scene.add.sprite(0, 0, config.id);
        this.sprite.setOrigin(0.5, 1); // bottom-center origin for floor alignment
    }

    /** Preload spritesheet in a Preloader scene. */
    static loadAssets(scene: Phaser.Scene, config: CharacterConfig): void {
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
        const animConfigKey = STATE_TO_ANIM[stateKey] ?? 'idle';
        const animKey = this.animPrefix + animConfigKey;

        if (this.currentAnimKey !== animKey) {
            this.sprite.play(animKey);
            this.currentAnimKey = animKey;
        }
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
