import { Scene, GameObjects } from 'phaser';

const PARTICLE_KEY = 'spark_pixel';

export class HitSpark {
    private emitter: GameObjects.Particles.ParticleEmitter;

    constructor(scene: Scene) {
        // Create a 4x4 white pixel texture for particles (once)
        if (!scene.textures.exists(PARTICLE_KEY)) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff);
            g.fillRect(0, 0, 4, 4);
            g.generateTexture(PARTICLE_KEY, 4, 4);
            g.destroy();
        }

        this.emitter = scene.add.particles(0, 0, PARTICLE_KEY, {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 200,
            tint: [0xff8800, 0xffcc00, 0xffffff],
            quantity: { min: 8, max: 12 },
            emitting: false,
        }).setDepth(150);
    }

    emit(x: number, y: number): void {
        this.emitter.emitParticleAt(x, y);
    }
}
