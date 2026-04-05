import { Scene, GameObjects } from 'phaser';
import { STAGE_WIDTH } from '@shared/constants';

const BAR_WIDTH = 60;
const BAR_HEIGHT = 6;
const BAR_Y = 48;
const BAR_MARGIN = 16;

export class CooldownIndicator {
    private fill: GameObjects.Rectangle;
    private readyFlash = false;
    private flashTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Scene, private playerIndex: number) {
        // Position below healthbar, near the inner edge
        const x = playerIndex === 0
            ? BAR_MARGIN
            : STAGE_WIDTH - BAR_MARGIN - BAR_WIDTH;

        scene.add.rectangle(
            x + BAR_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2,
            BAR_WIDTH, BAR_HEIGHT,
            0x333333,
        ).setDepth(100);

        this.fill = scene.add.rectangle(
            x + BAR_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2,
            BAR_WIDTH, BAR_HEIGHT,
            0x4488ff,
        ).setDepth(101);
    }

    update(scene: Scene, specialCooldown: number, specialCooldownFrames: number): void {
        if (specialCooldownFrames <= 0) {
            this.fill.width = BAR_WIDTH;
            return;
        }

        const ratio = 1 - specialCooldown / specialCooldownFrames;
        const fillWidth = Math.max(0, BAR_WIDTH * ratio);
        this.fill.width = fillWidth;

        // Anchor fill to correct side
        const baseX = this.playerIndex === 0
            ? BAR_MARGIN
            : STAGE_WIDTH - BAR_MARGIN - BAR_WIDTH;

        if (this.playerIndex === 0) {
            this.fill.x = baseX + fillWidth / 2;
        } else {
            this.fill.x = baseX + BAR_WIDTH - fillWidth / 2;
        }

        // Flash when ready
        const isReady = specialCooldown === 0;
        if (isReady && !this.readyFlash) {
            this.readyFlash = true;
            this.fill.fillColor = 0x44ff44;
            this.flashTween = scene.tweens.add({
                targets: this.fill,
                alpha: { from: 1, to: 0.4 },
                duration: 300,
                yoyo: true,
                repeat: -1,
            });
        } else if (!isReady && this.readyFlash) {
            this.readyFlash = false;
            this.fill.fillColor = 0x4488ff;
            this.fill.setAlpha(1);
            if (this.flashTween) {
                this.flashTween.destroy();
                this.flashTween = null;
            }
        }
    }
}
