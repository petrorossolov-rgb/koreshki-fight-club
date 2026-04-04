import { Scene } from 'phaser';

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create(data: { winner?: number }): void {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        const winner = data.winner ?? 0;

        // Winner text
        const winnerText = this.add.text(512, 160, `PLAYER ${winner} WINS`, {
            fontFamily: 'Arial Black',
            fontSize: '56px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5);

        // Scale-in animation
        winnerText.setScale(0);
        this.tweens.add({
            targets: winnerText,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
        });

        // REMATCH button
        this.createButton(512, 310, 'REMATCH', () => {
            this.scene.start('FightScene');
        });

        // MENU button
        this.createButton(512, 390, 'MENU', () => {
            this.scene.start('MainMenu');
        });
    }

    private createButton(x: number, y: number, label: string, onClick: () => void): void {
        const bg = this.add.rectangle(x, y, 240, 56, 0x333355)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });

        this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
            bg.fillColor = 0x555577;
        });
        bg.on('pointerout', () => {
            bg.fillColor = 0x333355;
        });
        bg.on('pointerdown', onClick);
    }
}
