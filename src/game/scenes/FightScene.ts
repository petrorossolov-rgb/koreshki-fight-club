import { Scene } from 'phaser';
import type { CharacterConfig } from '@shared/types';
import { RoundPhase } from '@shared/types';
import { FIXED_DT } from '@shared/constants';
import { createFightEngine, type FightEngine } from '@shared/FightEngine';
import { Fighter } from '@game/entities/Fighter';
import { InputManager } from '@game/systems/InputManager';
import { HealthBar } from '@game/ui/HealthBar';
import { RoundDisplay } from '@game/ui/RoundDisplay';

export class FightScene extends Scene {
    private engine!: FightEngine;
    private fighters!: [Fighter, Fighter];
    private inputManager!: InputManager;
    private healthBars!: [HealthBar, HealthBar];
    private roundDisplay!: RoundDisplay;
    private accumulator = 0;

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

        this.inputManager = new InputManager(this);

        this.healthBars = [
            new HealthBar(this, 0),
            new HealthBar(this, 1),
        ];
        this.roundDisplay = new RoundDisplay(this);

        this.accumulator = 0;
    }

    update(_time: number, delta: number): void {
        this.accumulator += delta;

        while (this.accumulator >= FIXED_DT) {
            const p1 = this.inputManager.readInput(0);
            const p2 = this.inputManager.readInput(1);
            this.engine.step([p1.bits, p2.bits]);
            this.inputManager.tick();
            this.accumulator -= FIXED_DT;
        }

        const { fighters, roundPhase, roundTimer } = this.engine.state;

        // Sync visuals to authoritative state
        this.fighters[0].syncToState(fighters[0]);
        this.fighters[1].syncToState(fighters[1]);

        // Update HUD
        this.healthBars[0].update(fighters[0].hp);
        this.healthBars[1].update(fighters[1].hp);
        this.roundDisplay.update(this, roundTimer, roundPhase, [
            fighters[0].roundWins,
            fighters[1].roundWins,
        ]);

        // Transition to GameOver on match end
        if (roundPhase === RoundPhase.MatchEnd) {
            const winner = fighters[0].roundWins > fighters[1].roundWins ? 1 : 2;
            this.scene.start('GameOver', { winner });
        }
    }
}
