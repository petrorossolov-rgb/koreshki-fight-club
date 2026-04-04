import { Scene } from 'phaser';

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create(data: { winner?: number; mode?: string; winnerName?: string; winnerTint?: number }): void {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        const winner = data.winner ?? 0;
        const isOnline = data.mode === 'online';
        const winnerName = data.winnerName ?? `PLAYER ${winner}`;
        const winnerTint = data.winnerTint ?? 0xFFCC00;

        // Convert tint number to CSS hex color
        const tintColor = '#' + (winnerTint & 0xFFFFFF).toString(16).padStart(6, '0');

        // Winner text
        const winnerText = this.add.text(512, 160, `${winnerName} WINS!`, {
            fontFamily: 'Arial Black',
            fontSize: '56px',
            color: tintColor,
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

        // REMATCH button (only in local mode — online rematch needs lobby)
        if (!isOnline) {
            this.createButton(512, 310, 'REMATCH', () => {
                this.scene.start('CharacterSelect', { mode: 'local' });
            });
        }

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
