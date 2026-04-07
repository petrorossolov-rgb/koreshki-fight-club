import { Scene } from 'phaser';
import type { CharacterConfig } from '@shared/types';

interface MatchStats {
    hits: [number, number];
    damage: [number, number];
    maxCombo: [number, number];
}

interface GameOverData {
    winner?: number;
    mode?: string;
    winnerName?: string;
    winnerTint?: number;
    matchStats?: MatchStats;
    p1Config?: CharacterConfig;
    p2Config?: CharacterConfig;
}

export class GameOver extends Scene {
    constructor() {
        super('GameOver');
    }

    create(data: GameOverData): void {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        const winner = data.winner ?? 0;
        const winnerIdx = winner - 1; // 0-based
        const isOnline = data.mode === 'online';
        const winnerName = data.winnerName ?? `PLAYER ${winner}`;
        const winnerTint = data.winnerTint ?? 0xFFCC00;
        const tintColor = '#' + (winnerTint & 0xFFFFFF).toString(16).padStart(6, '0');

        const p1Config = data.p1Config;
        const p2Config = data.p2Config;
        const winnerConfig = winnerIdx === 0 ? p1Config : p2Config;

        // Confetti particles (behind everything)
        this.emitConfetti(winnerTint);

        // Winner sprite with idle animation
        if (winnerConfig) {
            this.showWinnerSprite(winnerConfig, winnerIdx, winnerTint);
        }

        // Winner text
        const winnerText = this.add.text(512, 60, `${winnerName} WINS!`, {
            fontFamily: 'Arial Black',
            fontSize: '48px',
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

        // Stats table
        if (data.matchStats && p1Config && p2Config) {
            this.showStatsTable(data.matchStats, p1Config, p2Config, winnerIdx);
        }

        // Buttons — position lower to make room for stats
        const btnY = winnerConfig ? 460 : 310;

        if (!isOnline) {
            this.createButton(512, btnY, 'REMATCH', () => {
                this.scene.start('CharacterSelect', { mode: 'local' });
            });
        }

        this.createButton(512, btnY + 70, 'MENU', () => {
            this.scene.start('MainMenu');
        });
    }

    private emitConfetti(baseTint: number): void {
        // Generate a small square texture for confetti
        const key = 'confetti_px';
        if (!this.textures.exists(key)) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff);
            g.fillRect(0, 0, 8, 8);
            g.generateTexture(key, 8, 8);
            g.destroy();  // remove from display list after generating texture
        }

        // Color variations from winner tint
        const r = (baseTint >> 16) & 0xFF;
        const g = (baseTint >> 8) & 0xFF;
        const b = baseTint & 0xFF;
        const tints: number[] = [
            baseTint,
            ((Math.min(r + 60, 255)) << 16) | ((Math.min(g + 60, 255)) << 8) | Math.min(b + 60, 255),
            ((Math.max(r - 40, 0)) << 16) | ((Math.max(g - 40, 0)) << 8) | Math.max(b - 40, 0),
            0xFFFFFF,
            0xFFD700,
        ];

        this.add.particles(0, 0, key, {
            x: { min: 0, max: 1024 },
            y: -10,
            gravityY: 80,
            speedY: { min: 30, max: 80 },
            speedX: { min: -30, max: 30 },
            rotate: { min: 0, max: 360 },
            scaleX: { min: 0.4, max: 1.2 },
            scaleY: { min: 0.4, max: 1.0 },
            alpha: { start: 1, end: 0.3 },
            lifespan: 6000,
            frequency: 80,
            quantity: 2,
            tint: tints,
        }).setDepth(-1);
    }

    private showWinnerSprite(config: CharacterConfig, playerIndex: number, tint: number): void {
        const prefix = `${config.id}_p${playerIndex}_`;

        // Create idle animation if not exists
        const animKey = prefix + 'idle';
        if (!this.anims.exists(animKey)) {
            const idleDef = config.animations['idle'];
            if (idleDef) {
                this.anims.create({
                    key: animKey,
                    frames: this.anims.generateFrameNumbers(config.id, {
                        start: idleDef.frameStart,
                        end: idleDef.frameEnd,
                    }),
                    frameRate: idleDef.frameRate,
                    repeat: -1,
                });
            }
        }

        const sprite = this.add.sprite(512, 340, config.id);
        sprite.setOrigin(0.5, 1);
        sprite.setScale(config.scale * 2.5); // Large display
        if (tint !== 0xFFFFFF) sprite.setTint(tint);
        sprite.play(animKey);

        // Fade-in from below
        sprite.setAlpha(0);
        sprite.y += 30;
        this.tweens.add({
            targets: sprite,
            alpha: 1,
            y: sprite.y - 30,
            duration: 600,
            ease: 'Power2',
        });
    }

    private showStatsTable(stats: MatchStats, p1Config: CharacterConfig, p2Config: CharacterConfig, winnerIdx: number): void {
        const tableY = 370;
        const colP1X = 300;
        const colLabelX = 512;
        const colP2X = 724;
        const rowH = 32;

        const nameStyle = {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center' as const,
        };
        const headerStyle = {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa',
            align: 'center' as const,
        };
        const valueStyle = {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center' as const,
        };
        const winnerStyle = {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#FFD700',
            align: 'center' as const,
        };

        // Player names row
        const p1Name = p1Config.nickname || p1Config.id;
        const p2Name = p2Config.nickname || p2Config.id;
        this.add.text(colP1X, tableY, p1Name, winnerIdx === 0 ? winnerStyle : nameStyle).setOrigin(0.5);
        this.add.text(colLabelX, tableY, 'VS', headerStyle).setOrigin(0.5);
        this.add.text(colP2X, tableY, p2Name, winnerIdx === 1 ? winnerStyle : nameStyle).setOrigin(0.5);

        // Separator line
        const lineY = tableY + 18;
        this.add.rectangle(512, lineY, 500, 1, 0x444466);

        // Stat rows
        const rows: [string, number, number][] = [
            ['HITS', stats.hits[0], stats.hits[1]],
            ['DAMAGE', stats.damage[0], stats.damage[1]],
            ['MAX COMBO', stats.maxCombo[0], stats.maxCombo[1]],
        ];

        rows.forEach(([label, v1, v2], i) => {
            const y = tableY + 30 + (i + 1) * rowH;
            this.add.text(colP1X, y, String(v1), valueStyle).setOrigin(0.5);
            this.add.text(colLabelX, y, label, headerStyle).setOrigin(0.5);
            this.add.text(colP2X, y, String(v2), valueStyle).setOrigin(0.5);
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
