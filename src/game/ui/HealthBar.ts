import { Scene, GameObjects } from 'phaser';
import { STAGE_WIDTH, DEFAULT_HP } from '@shared/constants';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 24;
const BAR_Y = 20;
const BAR_MARGIN = 16;
const LERP_SPEED = 0.08;

export class HealthBar {
    private bar: GameObjects.Rectangle;
    private displayHp: number;
    private readonly maxHp: number;
    private readonly playerIndex: number;

    constructor(scene: Scene, playerIndex: number, maxHp: number = DEFAULT_HP) {
        this.playerIndex = playerIndex;
        this.maxHp = maxHp;
        this.displayHp = maxHp;

        // P1 bar starts from left, P2 bar starts from right
        const x = playerIndex === 0
            ? BAR_MARGIN
            : STAGE_WIDTH - BAR_MARGIN - BAR_WIDTH;

        // Background (dark)
        scene.add.rectangle(
            x + BAR_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2,
            BAR_WIDTH, BAR_HEIGHT,
            0x333333,
        ).setDepth(100);

        // Health fill
        this.bar = scene.add.rectangle(
            x + BAR_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2,
            BAR_WIDTH, BAR_HEIGHT - 4,
            0x22cc44,
        ).setDepth(101);
    }

    update(currentHp: number): void {
        // Smooth lerp toward actual HP
        this.displayHp += (currentHp - this.displayHp) * LERP_SPEED;
        if (Math.abs(this.displayHp - currentHp) < 0.5) {
            this.displayHp = currentHp;
        }

        const ratio = Math.max(0, this.displayHp / this.maxHp);
        const fillWidth = BAR_WIDTH * ratio;

        // Color shifts: green -> yellow -> red
        let color: number;
        if (ratio > 0.5) {
            color = 0x22cc44;
        } else if (ratio > 0.25) {
            color = 0xcccc22;
        } else {
            color = 0xcc2222;
        }

        this.bar.fillColor = color;
        this.bar.width = Math.max(0, fillWidth - 4);

        // P1 drains left-to-right (anchor left), P2 drains right-to-left (anchor right)
        if (this.playerIndex === 0) {
            this.bar.x = BAR_MARGIN + this.bar.width / 2 + 2;
        } else {
            this.bar.x = STAGE_WIDTH - BAR_MARGIN - this.bar.width / 2 - 2;
        }
    }
}
