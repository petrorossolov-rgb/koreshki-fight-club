import { Scene, GameObjects } from 'phaser';
import { STAGE_WIDTH } from '@shared/constants';

const FADE_DELAY_MS = 1000;

export class ComboCounter {
    private hitsText: GameObjects.Text;
    private dmgText: GameObjects.Text;
    private lastCombo = 0;
    private fadeTimer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: Scene, playerIndex: number) {
        const x = playerIndex === 0 ? 60 : STAGE_WIDTH - 60;
        const align = playerIndex === 0 ? 'left' : 'right';
        const originX = playerIndex === 0 ? 0 : 1;

        this.hitsText = scene.add.text(x, 80, '', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4,
            align,
        }).setOrigin(originX, 0).setDepth(150).setAlpha(0);

        this.dmgText = scene.add.text(x, 112, '', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ff8844',
            stroke: '#000000',
            strokeThickness: 3,
            align,
        }).setOrigin(originX, 0).setDepth(150).setAlpha(0);
    }

    update(scene: Scene, comboCount: number, comboDamage: number): void {
        if (comboCount >= 2) {
            this.hitsText.setText(`${comboCount} HITS!`);
            this.dmgText.setText(`${comboDamage} DMG`);
            this.hitsText.setAlpha(1);
            this.dmgText.setAlpha(1);

            // Scale pop on each new hit
            if (comboCount > this.lastCombo) {
                this.hitsText.setScale(1.4);
                scene.tweens.add({
                    targets: this.hitsText,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Back.easeOut',
                });
            }

            // Reset fade timer
            if (this.fadeTimer) {
                this.fadeTimer.destroy();
                this.fadeTimer = null;
            }
        } else if (this.lastCombo >= 2 && comboCount < 2) {
            // Combo dropped — start fade
            if (this.fadeTimer) {
                this.fadeTimer.destroy();
            }
            this.fadeTimer = scene.time.delayedCall(FADE_DELAY_MS, () => {
                scene.tweens.add({
                    targets: [this.hitsText, this.dmgText],
                    alpha: 0,
                    duration: 300,
                });
                this.fadeTimer = null;
            });
        }

        this.lastCombo = comboCount;
    }
}
