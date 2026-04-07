import { Scene, GameObjects } from 'phaser';
import type { CharacterConfig } from '@shared/types';
import type { NetworkClient } from '@game/net/NetworkClient';
import { SoundManager } from '@game/systems/SoundManager';

// ── Types ─────────────────────────────────────────────────────────

export interface CharSelectData {
    mode: 'local' | 'online';
    networkClient?: NetworkClient;
    playerIndex?: 0 | 1;
    soundManager?: SoundManager;
}

interface ManifestEntry {
    id: string;
    file: string;
    displayName: string;
    nickname: string;
    description: string;
    category: string;
    tint: number;
    stats: { power: number; speed: number; health: number };
}

interface ManifestData {
    version: number;
    characters: ManifestEntry[];
}

// ── Constants ─────────────────────────────────────────────────────

const GAME_W = 1024;
const GAME_H = 576;

const CELL_GAP = 10;
const GRID_TOP = 60;
const GRID_BOTTOM = 470; // leave room for confirm button

const STAT_COLORS: Record<string, number> = {
    power: 0xff4444,
    speed: 0x4488ff,
    health: 0x44cc44,
};
const STAT_LABELS: Record<string, string> = {
    power: 'PWR',
    speed: 'SPD',
    health: 'HP',
};
const STAT_MAX = 8;
const BAR_W = 120;
const BAR_H = 14;

const MIN_TOUCH_SIZE = 44;

// ── Scene ─────────────────────────────────────────────────────────

export class CharacterSelect extends Scene {
    private data_!: CharSelectData;
    private manifest!: ManifestData;
    private entries: ManifestEntry[] = [];

    // Grid layout (computed dynamically)
    private gridCols = 6;
    private cellSize = 130;

    // Grid state
    private cells: GameObjects.Container[] = [];
    selectedIndex = -1;
    private highlightBorder: GameObjects.Rectangle | null = null;
    private pulseTween: Phaser.Tweens.Tween | null = null;

    // Detail panel (slide-up overlay)
    private detailContainer!: GameObjects.Container;
    private previewImage: GameObjects.Image | null = null;
    private detailName!: GameObjects.Text;
    private detailNickname!: GameObjects.Text;
    private detailDesc!: GameObjects.Text;
    private statBars: GameObjects.Rectangle[] = [];
    private statLabels: GameObjects.Text[] = [];
    private isMobile = false;

    // Flow state
    private headerText!: GameObjects.Text;
    private currentPlayer: 0 | 1 = 0;
    private lockedChoices: [ManifestEntry | null, ManifestEntry | null] = [null, null];
    private confirmBtn!: GameObjects.Rectangle;
    private confirmText!: GameObjects.Text;

    // Online flow state
    private waitingForOpponent = false;

    // Random cycling state
    private isRandomCycling = false;

    // Sound
    private soundManager: SoundManager | null = null;

    constructor() {
        super('CharacterSelect');
    }

    init(data?: CharSelectData): void {
        this.data_ = data ?? { mode: 'local' };
        this.selectedIndex = -1;
        this.highlightBorder = null;
        this.pulseTween = null;
        this.cells = [];
        this.statBars = [];
        this.statLabels = [];
        this.previewImage = null;
        this.currentPlayer = 0;
        this.lockedChoices = [null, null];
        this.waitingForOpponent = false;
        this.isRandomCycling = false;
        this.soundManager = data?.soundManager ?? null;
        if (this.soundManager) this.soundManager.transferTo(this);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        this.manifest = this.cache.json.get('char_manifest') as ManifestData;
        this.entries = this.manifest.characters;

        // Determine layout based on actual viewport width
        const viewW = window.innerWidth;
        this.isMobile = viewW < 768;
        this.gridCols = viewW < 480 ? 3 : viewW < 768 ? 4 : 6;

        // Calculate cell size to fit available space
        const totalCells = this.entries.length + 1; // +1 for random
        const rows = Math.ceil(totalCells / this.gridCols);
        const availW = GAME_W - 60; // margins
        const availH = GRID_BOTTOM - GRID_TOP;
        const maxCellW = Math.floor((availW - (this.gridCols - 1) * CELL_GAP) / this.gridCols);
        const maxCellH = Math.floor((availH - (rows - 1) * CELL_GAP) / rows);
        this.cellSize = Math.min(130, maxCellW, maxCellH);
        // Ensure minimum touch target
        this.cellSize = Math.max(this.cellSize, MIN_TOUCH_SIZE);

        // Header
        this.headerText = this.add.text(GAME_W / 2, 28, '', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        this.createGrid();
        this.createDetailPanel();
        this.createConfirmButton();

        // Start flow
        if (this.data_.mode === 'local') {
            this.setPlayerTurn(0);
        } else {
            this.headerText.setText('ВЫБЕРИ БОЙЦА');
            this.events.on('characterSelected', (_index: number, entry: ManifestEntry) => {
                this.updateDetailPanel(entry);
                if (!this.waitingForOpponent) {
                    this.showConfirmButton(true);
                }
            });
            this.setupOnlineCallbacks();
        }
    }

    // ── Grid ──────────────────────────────────────────────────────

    private createGrid(): void {
        const totalCells = this.entries.length + 1;
        const rows = Math.ceil(totalCells / this.gridCols);
        const totalW = this.gridCols * this.cellSize + (this.gridCols - 1) * CELL_GAP;
        const totalH = rows * this.cellSize + (rows - 1) * CELL_GAP;
        const startX = GAME_W / 2 - totalW / 2 + this.cellSize / 2;
        const startY = GRID_TOP + (GRID_BOTTOM - GRID_TOP) / 2 - totalH / 2 + this.cellSize / 2;

        for (let i = 0; i < totalCells; i++) {
            const col = i % this.gridCols;
            const row = Math.floor(i / this.gridCols);
            const cx = startX + col * (this.cellSize + CELL_GAP);
            const cy = startY + row * (this.cellSize + CELL_GAP);

            if (i < this.entries.length) {
                this.createCharCell(i, cx, cy, this.entries[i]);
            } else {
                this.createRandomCell(i, cx, cy);
            }
        }
    }

    private createCharCell(index: number, cx: number, cy: number, entry: ManifestEntry): void {
        const container = this.add.container(cx, cy);

        // Dark background
        const bg = this.add.rectangle(0, 0, this.cellSize, this.cellSize, 0x1a1a3e)
            .setStrokeStyle(2, 0x333366);

        // Character sprite: idle frame 0 from character's own spritesheet
        const sprite = this.add.sprite(0, -8, entry.id, 0);
        // Scale sprite to fit cell with some padding
        const spriteScale = (this.cellSize - 30) / 126; // 126 = frame size
        sprite.setScale(spriteScale);

        // Name text below sprite
        const fontSize = this.cellSize < 80 ? '10px' : '12px';
        const nameText = this.add.text(0, this.cellSize / 2 - 14, entry.displayName, {
            fontFamily: 'Arial', fontSize, color: '#cccccc',
            align: 'center',
        }).setOrigin(0.5);

        container.add([bg, sprite, nameText]);
        this.cells[index] = container;

        // Make cell interactive
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.selectCell(index));
    }

    private createRandomCell(index: number, cx: number, cy: number): void {
        const container = this.add.container(cx, cy);

        const bg = this.add.rectangle(0, 0, this.cellSize, this.cellSize, 0x1a1a3e)
            .setStrokeStyle(2, 0x333366);

        const qSize = this.cellSize < 80 ? '28px' : '36px';
        const questionMark = this.add.text(0, -4, '?', {
            fontFamily: 'Arial Black', fontSize: qSize, color: '#ffcc00',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);

        const fontSize = this.cellSize < 80 ? '10px' : '12px';
        const label = this.add.text(0, this.cellSize / 2 - 14, 'RANDOM', {
            fontFamily: 'Arial', fontSize, color: '#cccccc',
            align: 'center',
        }).setOrigin(0.5);

        container.add([bg, questionMark, label]);
        this.cells[index] = container;

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.selectCell(index));
    }

    // ── Detail Panel ──────────────────────────────────────────────

    private createDetailPanel(): void {
        this.detailContainer = this.add.container(0, 0);

        if (this.isMobile) {
            // Mobile: slide-up overlay covering bottom half
            const panelBg = this.add.rectangle(GAME_W / 2, GAME_H, GAME_W, GAME_H * 0.55, 0x111128, 0.95)
                .setStrokeStyle(1, 0x333366).setOrigin(0.5, 1);
            this.detailContainer.add(panelBg);

            const panelTop = GAME_H * 0.45;

            // Portrait on left
            this.detailName = this.add.text(220, panelTop + 15, '', {
                fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3,
            });
            this.detailContainer.add(this.detailName);

            this.detailNickname = this.add.text(220, panelTop + 44, '', {
                fontFamily: 'Arial', fontSize: '16px', color: '#ffcc00',
                fontStyle: 'italic',
            });
            this.detailContainer.add(this.detailNickname);

            this.detailDesc = this.add.text(220, panelTop + 70, '', {
                fontFamily: 'Arial', fontSize: '13px', color: '#aaaaaa',
                wordWrap: { width: 320 },
            });
            this.detailContainer.add(this.detailDesc);

            // Stats
            this.createStatBars(600, panelTop + 20);
        } else {
            // Desktop: fixed panel below grid
            const panelY = GRID_BOTTOM + 5;
            const panelH = GAME_H - panelY - 10;
            const panelBg = this.add.rectangle(GAME_W / 2, panelY + panelH / 2, 960, panelH, 0x111128, 0.85)
                .setStrokeStyle(1, 0x333366);
            this.detailContainer.add(panelBg);

            this.detailName = this.add.text(260, panelY + 8, '', {
                fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3,
            });
            this.detailContainer.add(this.detailName);

            this.detailNickname = this.add.text(260, panelY + 38, '', {
                fontFamily: 'Arial', fontSize: '16px', color: '#ffcc00',
                fontStyle: 'italic',
            });
            this.detailContainer.add(this.detailNickname);

            this.detailDesc = this.add.text(260, panelY + 62, '', {
                fontFamily: 'Arial', fontSize: '13px', color: '#aaaaaa',
                wordWrap: { width: 360 },
            });
            this.detailContainer.add(this.detailDesc);

            this.createStatBars(700, panelY + 12);
        }

        this.detailContainer.setVisible(false);
    }

    private createStatBars(x: number, startY: number): void {
        const statKeys = ['power', 'speed', 'health'];
        for (let i = 0; i < statKeys.length; i++) {
            const key = statKeys[i];
            const y = startY + i * (BAR_H + 12);

            const label = this.add.text(x, y, STAT_LABELS[key], {
                fontFamily: 'Arial', fontSize: '13px', color: '#cccccc',
            }).setOrigin(0, 0.5);
            this.detailContainer.add(label);
            this.statLabels.push(label);

            const barBg = this.add.rectangle(x + 40, y, BAR_W, BAR_H, 0x222244).setOrigin(0, 0.5);
            this.detailContainer.add(barBg);

            const bar = this.add.rectangle(x + 40, y, 0, BAR_H, STAT_COLORS[key]).setOrigin(0, 0.5);
            this.detailContainer.add(bar);
            this.statBars.push(bar);
        }
    }

    private updateDetailPanel(entry: ManifestEntry): void {
        this.detailContainer.setVisible(true);

        this.detailName.setText(entry.displayName);
        this.detailNickname.setText(`"${entry.nickname}"`);
        this.detailDesc.setText(entry.description);

        // Update stat bars
        const statKeys = ['power', 'speed', 'health'];
        for (let i = 0; i < statKeys.length; i++) {
            const value = entry.stats[statKeys[i] as keyof typeof entry.stats];
            this.statBars[i].width = (value / STAT_MAX) * BAR_W;
        }

        // Update portrait image
        if (this.previewImage) {
            this.previewImage.destroy();
            this.previewImage = null;
        }

        const portraitKey = `${entry.id}-portrait`;
        if (this.textures.exists(portraitKey)) {
            const imgY = this.isMobile ? GAME_H * 0.45 + 60 : GRID_BOTTOM + 50;
            const imgX = this.isMobile ? 100 : 130;
            const imgScale = this.isMobile ? 0.55 : 0.6;

            this.previewImage = this.add.image(imgX, imgY, portraitKey);
            this.previewImage.setScale(imgScale);
            this.detailContainer.add(this.previewImage);
        }

        // Mobile: slide-up animation
        if (this.isMobile && !this.detailContainer.getData('shown')) {
            this.detailContainer.setData('shown', true);
            this.detailContainer.y = 200;
            this.tweens.add({
                targets: this.detailContainer,
                y: 0,
                duration: 250,
                ease: 'Back.easeOut',
            });
        }
    }

    // ── Confirm Button ────────────────────────────────────────────

    private createConfirmButton(): void {
        const btnW = this.isMobile ? GAME_W - 40 : 280;
        const btnH = Math.max(48, MIN_TOUCH_SIZE);
        const btnY = GAME_H - 30;

        this.confirmBtn = this.add.rectangle(GAME_W / 2, btnY, btnW, btnH, 0x333355)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });

        this.confirmText = this.add.text(GAME_W / 2, btnY, 'ПОДТВЕРДИТЬ', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff',
        }).setOrigin(0.5);

        this.confirmBtn.on('pointerover', () => { this.confirmBtn.fillColor = 0x555577; });
        this.confirmBtn.on('pointerout', () => { this.confirmBtn.fillColor = 0x333355; });
        this.confirmBtn.on('pointerdown', () => this.onConfirm());

        this.confirmBtn.setVisible(false);
        this.confirmText.setVisible(false);
    }

    private showConfirmButton(visible: boolean): void {
        this.confirmBtn.setVisible(visible);
        this.confirmText.setVisible(visible);
    }

    // ── Local Flow ────────────────────────────────────────────────

    private setPlayerTurn(player: 0 | 1): void {
        this.currentPlayer = player;
        this.selectedIndex = -1;
        if (this.highlightBorder) {
            this.highlightBorder.destroy();
            this.highlightBorder = null;
        }
        this.stopPulseTween();
        this.detailContainer.setVisible(false);
        this.detailContainer.setData('shown', false);
        this.showConfirmButton(false);

        const color = player === 0 ? '#4488ff' : '#ff4444';
        const label = player === 0 ? 'P1' : 'P2';
        this.headerText.setText(`${label}: ВЫБЕРИ БОЙЦА`);
        this.headerText.setColor(color);

        this.events.removeAllListeners('characterSelected');
        this.events.on('characterSelected', (_index: number, entry: ManifestEntry) => {
            this.updateDetailPanel(entry);
            this.showConfirmButton(true);
            if (this.highlightBorder) {
                this.highlightBorder.setStrokeStyle(3, player === 0 ? 0x4488ff : 0xff4444);
            }
        });
    }

    private onConfirm(): void {
        if (this.selectedIndex < 0) return;
        this.soundManager?.play('ui_confirm');
        const entry = this.entries[this.selectedIndex];

        if (this.data_.mode === 'local') {
            this.lockedChoices[this.currentPlayer] = entry;

            if (this.currentPlayer === 0) {
                this.showP1Lock(entry);
                this.setPlayerTurn(1);
            } else {
                this.loadConfigsAndStart();
            }
        } else {
            this.onOnlineConfirm(entry);
        }
    }

    // ── Online Flow ───────────────────────────────────────────────

    private setupOnlineCallbacks(): void {
        const net = this.data_.networkClient;
        if (!net) return;

        net.callbacks.onOpponentSelected = () => {
            this.showOpponentCheckmark();
        };

        net.callbacks.onFightStart = (playerIndex: 0 | 1, p1CharId: string, p2CharId: string) => {
            this.onlineFightStart(playerIndex, p1CharId, p2CharId);
        };

        net.callbacks.onOpponentDisconnected = () => {
            this.cleanupOnlineCallbacks();
            this.scene.start('MainMenu');
        };
    }

    private cleanupOnlineCallbacks(): void {
        const net = this.data_.networkClient;
        if (!net) return;
        net.callbacks.onOpponentSelected = undefined;
        net.callbacks.onFightStart = undefined;
        net.callbacks.onOpponentDisconnected = undefined;
    }

    private onOnlineConfirm(entry: ManifestEntry): void {
        const net = this.data_.networkClient;
        if (!net || this.waitingForOpponent) return;

        this.waitingForOpponent = true;
        net.selectCharacter(entry.id);

        this.cells.forEach(cell => {
            cell.each((child: GameObjects.GameObject) => {
                if (child instanceof GameObjects.Rectangle) {
                    child.disableInteractive();
                }
            });
        });

        this.showConfirmButton(false);
        this.headerText.setText('Ожидание соперника...');
        this.headerText.setColor('#ffcc00');

        this.add.text(GAME_W / 2, GAME_H - 30, 'Ваш выбор подтверждён', {
            fontFamily: 'Arial', fontSize: '18px', color: '#66ff66',
        }).setOrigin(0.5);
    }

    private showOpponentCheckmark(): void {
        this.add.text(GAME_W / 2, GAME_H - 10, '✓ Соперник выбрал бойца', {
            fontFamily: 'Arial', fontSize: '16px', color: '#66ff66',
        }).setOrigin(0.5);
    }

    private onlineFightStart(playerIndex: 0 | 1, p1CharId: string, p2CharId: string): void {
        this.cleanupOnlineCallbacks();

        const toLoad: { id: string; file: string }[] = [];
        for (const charId of [p1CharId, p2CharId]) {
            if (!this.cache.json.has(charId)) {
                const entry = this.entries.find(e => e.id === charId);
                if (entry) {
                    toLoad.push({ id: entry.id, file: entry.file });
                }
            }
        }

        if (toLoad.length === 0) {
            this.transitionToFight(playerIndex, p1CharId, p2CharId);
            return;
        }

        this.headerText.setText('ЗАГРУЗКА...');
        this.headerText.setColor('#ffffff');

        for (const item of toLoad) {
            this.load.json(item.id, item.file);
        }
        this.load.once('complete', () => {
            this.transitionToFight(playerIndex, p1CharId, p2CharId);
        });
        this.load.start();
    }

    private transitionToFight(playerIndex: 0 | 1, p1CharId: string, p2CharId: string): void {
        const p1Config = this.cache.json.get(p1CharId) as CharacterConfig;
        const p2Config = this.cache.json.get(p2CharId) as CharacterConfig;

        this.scene.start('FightScene', {
            mode: 'online',
            networkClient: this.data_.networkClient,
            playerIndex,
            p1Config,
            p2Config,
            soundManager: this.data_.soundManager,
        });
    }

    // ── Local Flow Helpers ────────────────────────────────────────

    private showP1Lock(_entry: ManifestEntry): void {
        const cell = this.cells[this.selectedIndex];
        this.add.rectangle(cell.x, cell.y, this.cellSize, this.cellSize, 0x4488ff, 0.3);
        const lockText = this.add.text(cell.x, cell.y - 20, 'P1', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#4488ff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);
        this.add.existing(lockText);
    }

    private loadConfigsAndStart(): void {
        const p1Entry = this.lockedChoices[0]!;
        const p2Entry = this.lockedChoices[1]!;

        this.headerText.setText('ЗАГРУЗКА...');
        this.headerText.setColor('#ffffff');
        this.showConfirmButton(false);

        const toLoad: { id: string; file: string }[] = [];
        if (!this.cache.json.has(p1Entry.id)) {
            toLoad.push({ id: p1Entry.id, file: p1Entry.file });
        }
        if (p2Entry.id !== p1Entry.id && !this.cache.json.has(p2Entry.id)) {
            toLoad.push({ id: p2Entry.id, file: p2Entry.file });
        }

        if (toLoad.length === 0) {
            this.startFight(p1Entry, p2Entry);
            return;
        }

        for (const item of toLoad) {
            this.load.json(item.id, item.file);
        }
        this.load.once('complete', () => {
            this.startFight(p1Entry, p2Entry);
        });
        this.load.start();
    }

    private startFight(p1Entry: ManifestEntry, p2Entry: ManifestEntry): void {
        const p1Config = this.cache.json.get(p1Entry.id) as CharacterConfig;
        const p2Config = this.cache.json.get(p2Entry.id) as CharacterConfig;

        this.scene.start('FightScene', {
            mode: 'local',
            p1Config,
            p2Config,
            soundManager: this.data_.soundManager,
        });
    }

    // ── Selection ─────────────────────────────────────────────────

    selectCell(index: number): void {
        if (this.isRandomCycling) return;

        if (index === this.entries.length) {
            this.startRandomCycle();
            return;
        }

        if (index < 0 || index >= this.entries.length) return;
        this.applySelection(index);
    }

    private applySelection(index: number): void {
        this.selectedIndex = index;
        this.soundManager?.play('ui_select');

        // Update highlight
        if (this.highlightBorder) this.highlightBorder.destroy();
        this.stopPulseTween();

        const cell = this.cells[index];
        this.highlightBorder = this.add.rectangle(
            cell.x, cell.y, this.cellSize + 6, this.cellSize + 6
        ).setStrokeStyle(3, 0x44aaff).setFillStyle(0x000000, 0);

        // Scale pulse on selected cell
        cell.setScale(1);
        this.pulseTween = this.tweens.add({
            targets: cell,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.events.emit('characterSelected', index, this.entries[index]);
    }

    private stopPulseTween(): void {
        if (this.pulseTween) {
            this.pulseTween.stop();
            this.pulseTween = null;
        }
        // Reset all cell scales
        this.cells.forEach(c => c?.setScale(1));
    }

    private startRandomCycle(): void {
        this.isRandomCycling = true;
        this.showConfirmButton(false);

        const totalSteps = Phaser.Math.Between(12, 18);
        let step = 0;
        let current = Phaser.Math.Between(0, this.entries.length - 1);

        const cycleOnce = () => {
            let next = Phaser.Math.Between(0, this.entries.length - 1);
            while (next === current && this.entries.length > 1) {
                next = Phaser.Math.Between(0, this.entries.length - 1);
            }
            current = next;

            if (this.highlightBorder) this.highlightBorder.destroy();
            this.stopPulseTween();
            const cell = this.cells[current];
            this.highlightBorder = this.add.rectangle(
                cell.x, cell.y, this.cellSize + 6, this.cellSize + 6
            ).setStrokeStyle(3, 0xffcc00).setFillStyle(0x000000, 0);

            step++;
            if (step < totalSteps) {
                this.time.delayedCall(100, cycleOnce);
            } else {
                this.isRandomCycling = false;
                this.applySelection(current);
            }
        };

        cycleOnce();
    }

    getSelectedEntry(): ManifestEntry | null {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.entries.length) return null;
        return this.entries[this.selectedIndex];
    }

    getSelectedIndex(): number {
        return this.selectedIndex;
    }

    getMode(): CharSelectData['mode'] {
        return this.data_.mode;
    }

    getCharSelectData(): CharSelectData {
        return this.data_;
    }

    getEntries(): ManifestEntry[] {
        return this.entries;
    }
}
