import { Scene, GameObjects } from 'phaser';
import type { NetworkClient } from '@game/net/NetworkClient';

// ── Types ─────────────────────────────────────────────────────────

export interface CharSelectData {
    mode: 'local' | 'online';
    networkClient?: NetworkClient;
    playerIndex?: 0 | 1;
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

const GRID_COLS = 6;
const GRID_ROWS = 3;
const CELL_W = 140;
const CELL_H = 80;
const CELL_GAP = 12;
const GRID_TOP = 70;
const GRID_LEFT_BASE = 512; // center of 1024

const SHARED_TEXTURE = 'martial-hero';

const DETAIL_Y = 340;
const DETAIL_H = 180;

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

// ── Scene ─────────────────────────────────────────────────────────

export class CharacterSelect extends Scene {
    private data_!: CharSelectData;
    private manifest!: ManifestData;
    private entries: ManifestEntry[] = [];

    // Grid state
    private cells: GameObjects.Container[] = [];
    selectedIndex = -1;
    private highlightBorder: GameObjects.Rectangle | null = null;

    // Detail panel
    private detailContainer!: GameObjects.Container;
    private previewSprite: GameObjects.Sprite | null = null;
    private detailName!: GameObjects.Text;
    private detailNickname!: GameObjects.Text;
    private detailDesc!: GameObjects.Text;
    private statBars: GameObjects.Rectangle[] = [];
    private statLabels: GameObjects.Text[] = [];

    // Confirm button (populated in T11)
    confirmContainer!: GameObjects.Container;

    constructor() {
        super('CharacterSelect');
    }

    init(data?: CharSelectData): void {
        this.data_ = data ?? { mode: 'local' };
        this.selectedIndex = -1;
        this.highlightBorder = null;
        this.cells = [];
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        this.manifest = this.cache.json.get('char_manifest') as ManifestData;
        this.entries = this.manifest.characters;

        // Header
        this.add.text(512, 30, 'ВЫБЕРИ БОЙЦА', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        this.createGrid();
        this.createDetailPanel();

        // Confirm button placeholder container (T11 will populate)
        this.confirmContainer = this.add.container(0, 0);

        // Listen for selection changes to update detail panel
        this.events.on('characterSelected', (_index: number, entry: ManifestEntry) => {
            this.updateDetailPanel(entry);
        });
    }

    // ── Grid ──────────────────────────────────────────────────────

    private createGrid(): void {
        const totalW = GRID_COLS * CELL_W + (GRID_COLS - 1) * CELL_GAP;
        const startX = GRID_LEFT_BASE - totalW / 2 + CELL_W / 2;
        const startY = GRID_TOP + CELL_H / 2;

        // 17 characters + 1 "?" cell = 18 = 6×3
        const totalCells = GRID_COLS * GRID_ROWS;

        for (let i = 0; i < totalCells; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const cx = startX + col * (CELL_W + CELL_GAP);
            const cy = startY + row * (CELL_H + CELL_GAP);

            if (i < this.entries.length) {
                this.createCharCell(i, cx, cy, this.entries[i]);
            } else if (i === this.entries.length) {
                this.createRandomCell(i, cx, cy);
            }
            // remaining cells stay empty (currently exactly 18 = 17+1)
        }
    }

    private createCharCell(index: number, cx: number, cy: number, entry: ManifestEntry): void {
        const container = this.add.container(cx, cy);

        // Dark background
        const bg = this.add.rectangle(0, 0, CELL_W, CELL_H, 0x1a1a3e)
            .setStrokeStyle(2, 0x333366);

        // Tinted portrait sprite (small thumbnail)
        const sprite = this.add.sprite(0, -5, SHARED_TEXTURE, entry.stats.power > 0 ? 0 : 0);
        sprite.setScale(0.4);
        if (entry.tint !== 0xFFFFFF) sprite.setTint(entry.tint);

        // Name text below sprite
        const nameText = this.add.text(0, 28, entry.displayName, {
            fontFamily: 'Arial', fontSize: '12px', color: '#cccccc',
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

        const bg = this.add.rectangle(0, 0, CELL_W, CELL_H, 0x1a1a3e)
            .setStrokeStyle(2, 0x333366);

        const questionMark = this.add.text(0, -2, '?', {
            fontFamily: 'Arial Black', fontSize: '36px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);

        const label = this.add.text(0, 28, 'RANDOM', {
            fontFamily: 'Arial', fontSize: '12px', color: '#cccccc',
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

        // Background panel
        const panelBg = this.add.rectangle(512, DETAIL_Y + DETAIL_H / 2, 920, DETAIL_H, 0x111128, 0.85)
            .setStrokeStyle(1, 0x333366);
        this.detailContainer.add(panelBg);

        // Name (center-left)
        this.detailName = this.add.text(280, DETAIL_Y + 15, '', {
            fontFamily: 'Arial Black', fontSize: '26px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
        });
        this.detailContainer.add(this.detailName);

        // Nickname
        this.detailNickname = this.add.text(280, DETAIL_Y + 50, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#ffcc00',
            fontStyle: 'italic',
        });
        this.detailContainer.add(this.detailNickname);

        // Description
        this.detailDesc = this.add.text(280, DETAIL_Y + 80, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#aaaaaa',
            wordWrap: { width: 360 },
        });
        this.detailContainer.add(this.detailDesc);

        // Stat bars (right side)
        const statX = 720;
        const statKeys = ['power', 'speed', 'health'];
        for (let i = 0; i < statKeys.length; i++) {
            const key = statKeys[i];
            const y = DETAIL_Y + 25 + i * (BAR_H + 14);

            const label = this.add.text(statX, y, STAT_LABELS[key], {
                fontFamily: 'Arial', fontSize: '13px', color: '#cccccc',
            }).setOrigin(0, 0.5);
            this.detailContainer.add(label);
            this.statLabels.push(label);

            // Bar background
            const barBg = this.add.rectangle(statX + 40, y, BAR_W, BAR_H, 0x222244).setOrigin(0, 0.5);
            this.detailContainer.add(barBg);

            // Bar fill
            const bar = this.add.rectangle(statX + 40, y, 0, BAR_H, STAT_COLORS[key]).setOrigin(0, 0.5);
            this.detailContainer.add(bar);
            this.statBars.push(bar);
        }

        // Initially hidden until a character is selected
        this.detailContainer.setVisible(false);
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

        // Update preview sprite
        if (this.previewSprite) {
            this.previewSprite.destroy();
            this.previewSprite = null;
        }

        // Create idle animation for preview
        const animKey = `preview_${entry.id}_idle`;
        if (!this.anims.exists(animKey)) {
            // idle animation: frames 0-9 (same for all chars sharing the spritesheet)
            this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(SHARED_TEXTURE, { start: 0, end: 9 }),
                frameRate: 10,
                repeat: -1,
            });
        }

        this.previewSprite = this.add.sprite(140, DETAIL_Y + DETAIL_H / 2 + 20, SHARED_TEXTURE);
        this.previewSprite.setOrigin(0.5, 1);
        this.previewSprite.play(animKey);

        // Apply character visual properties
        // Scale relative to 1.0: show at ~1.5x for nice preview size
        this.previewSprite.setScale(entry.category === 'big' ? 1.5 : entry.category === 'tall' ? 1.4 : entry.category === 'short' ? 1.1 : 1.3);
        if (entry.tint !== 0xFFFFFF) this.previewSprite.setTint(entry.tint);

        this.detailContainer.add(this.previewSprite);
    }

    // ── Selection ─────────────────────────────────────────────────

    selectCell(index: number): void {
        // Random cell → pick random character
        if (index === this.entries.length) {
            index = Phaser.Math.Between(0, this.entries.length - 1);
        }

        if (index < 0 || index >= this.entries.length) return;
        this.selectedIndex = index;

        // Update highlight
        if (this.highlightBorder) this.highlightBorder.destroy();

        const cell = this.cells[index];
        this.highlightBorder = this.add.rectangle(
            cell.x, cell.y, CELL_W + 6, CELL_H + 6
        ).setStrokeStyle(3, 0x44aaff).setFillStyle(0x000000, 0);

        // Emit event for detail panel (T10) and confirm button (T11)
        this.events.emit('characterSelected', index, this.entries[index]);
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
