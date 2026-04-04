import { Scene } from 'phaser';
import type { CharacterConfig } from '@shared/types';
import { InputBit } from '@shared/types';
import { FIXED_DT } from '@shared/constants';
import { createFightEngine, type FightEngine } from '@shared/FightEngine';
import { Fighter } from '@game/entities/Fighter';

export class FightScene extends Scene {
    private engine!: FightEngine;
    private fighters!: [Fighter, Fighter];
    private accumulator = 0;
    private keyW!: Phaser.Input.Keyboard.Key;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyS!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;

    constructor() {
        super('FightScene');
    }

    preload(): void {
        const config = this.cache.json.get('char_default') as CharacterConfig;
        Fighter.loadAssets(this, config);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        const config = this.cache.json.get('char_default') as CharacterConfig;

        this.engine = createFightEngine({ p1Config: config, p2Config: config });

        this.fighters = [
            new Fighter(this, config, 0),
            new Fighter(this, config, 1),
        ];

        // Sync initial positions
        this.fighters[0].syncToState(this.engine.state.fighters[0]);
        this.fighters[1].syncToState(this.engine.state.fighters[1]);

        // Temporary inline keyboard (P1: WASD)
        this.keyW = this.input.keyboard!.addKey('W');
        this.keyA = this.input.keyboard!.addKey('A');
        this.keyS = this.input.keyboard!.addKey('S');
        this.keyD = this.input.keyboard!.addKey('D');

        this.accumulator = 0;
    }

    update(_time: number, delta: number): void {
        this.accumulator += delta;

        while (this.accumulator >= FIXED_DT) {
            const p1Bits = this.readP1Input();
            this.engine.step([p1Bits, 0]);
            this.accumulator -= FIXED_DT;
        }

        // Sync visuals to authoritative state
        this.fighters[0].syncToState(this.engine.state.fighters[0]);
        this.fighters[1].syncToState(this.engine.state.fighters[1]);
    }

    private readP1Input(): number {
        let bits = 0;
        if (this.keyA.isDown) bits |= InputBit.LEFT;
        if (this.keyD.isDown) bits |= InputBit.RIGHT;
        if (this.keyW.isDown) bits |= InputBit.UP;
        if (this.keyS.isDown) bits |= InputBit.DOWN;
        return bits;
    }
}
