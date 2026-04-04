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

// ── Scene ─────────────────────────────────────────────────────────

export class CharacterSelect extends Scene {
    private data_!: CharSelectData;
    private manifest!: ManifestData;
    private entries: ManifestEntry[] = [];

    // Grid state
    private cells: GameObjects.Container[] = [];
    private selectedIndex = -1;
    private highlightBorder: GameObjects.Rectangle | null = null;

    // Detail panel (populated in T10)
    detailContainer!: GameObjects.Container;

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

        // Detail panel placeholder container (T10 will populate)
        this.detailContainer = this.add.container(0, 0);

        // Confirm button placeholder container (T11 will populate)
        this.confirmContainer = this.add.container(0, 0);
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
