import { Scene, GameObjects } from 'phaser';
import { isTouchDevice } from '@game/ui/TouchControls';

export class MainMenu extends Scene {
    background!: GameObjects.Image;
    logo!: GameObjects.Image;
    title!: GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    create(): void {
        this.background = this.add.image(512, 288, 'background');
        this.logo = this.add.image(512, 180, 'logo');

        this.title = this.add.text(512, 310, 'FIGHT!', {
            fontFamily: 'Arial Black', fontSize: '38px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.title.on('pointerdown', () => {
            this.scene.start('FightScene');
        });

        // Fullscreen button on touch devices
        if (isTouchDevice()) {
            this.createFullscreenButton();
            this.tryLockOrientation();
        }
    }

    private createFullscreenButton(): void {
        const btn = this.add.text(512, 390, '[ FULLSCREEN ]', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#aaaaff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                this.tryLockOrientation();
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    private tryLockOrientation(): void {
        try {
            const orientation = screen.orientation as ScreenOrientation & {
                lock?(type: string): Promise<void>;
            };
            orientation.lock?.('landscape')?.catch(() => {});
        } catch {
            // Orientation lock not supported
        }
    }
}
