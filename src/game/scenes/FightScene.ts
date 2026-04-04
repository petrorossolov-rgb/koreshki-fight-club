import { Scene } from 'phaser';
import type { CharacterConfig, GameState } from '@shared/types';
import { RoundPhase } from '@shared/types';
import { FIXED_DT } from '@shared/constants';
import { createFightEngine, type FightEngine } from '@shared/FightEngine';
import { Fighter } from '@game/entities/Fighter';
import { InputManager, NetworkSource } from '@game/systems/InputManager';
import { HealthBar } from '@game/ui/HealthBar';
import { RoundDisplay } from '@game/ui/RoundDisplay';
import { NetworkClient } from '@game/net/NetworkClient';

export interface FightSceneData {
    mode: 'local' | 'online';
    networkClient?: NetworkClient;
    playerIndex?: 0 | 1;
}

export class FightScene extends Scene {
    private engine!: FightEngine;
    private fighters!: [Fighter, Fighter];
    private inputManager!: InputManager;
    private healthBars!: [HealthBar, HealthBar];
    private roundDisplay!: RoundDisplay;
    private accumulator = 0;

    // Online mode state
    private mode: 'local' | 'online' = 'local';
    private networkClient: NetworkClient | null = null;
    private localPlayerIndex: 0 | 1 = 0;
    private remoteState: GameState | null = null;

    constructor() {
        super('FightScene');
    }

    init(data?: FightSceneData): void {
        this.mode = data?.mode ?? 'local';
        this.networkClient = data?.networkClient ?? null;
        this.localPlayerIndex = data?.playerIndex ?? 0;
        this.remoteState = null;
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

        // In online mode, set remote player's source to NetworkSource
        if (this.mode === 'online' && this.networkClient) {
            const remoteIndex = this.localPlayerIndex === 0 ? 1 : 0;
            this.inputManager.setSource(remoteIndex, new NetworkSource());
            this.setupNetworkCallbacks();
        }

        this.healthBars = [
            new HealthBar(this, 0),
            new HealthBar(this, 1),
        ];
        this.roundDisplay = new RoundDisplay(this);

        this.accumulator = 0;
    }

    update(_time: number, delta: number): void {
        // In online mode, apply server state when received
        if (this.mode === 'online' && this.remoteState) {
            this.applyServerState(this.remoteState);
            this.remoteState = null;
        }

        this.accumulator += delta;

        while (this.accumulator >= FIXED_DT) {
            const p1 = this.inputManager.readInput(0);
            const p2 = this.inputManager.readInput(1);

            // In online mode, send local input to server
            if (this.mode === 'online' && this.networkClient) {
                const localInput = this.localPlayerIndex === 0 ? p1 : p2;
                this.networkClient.sendInput(localInput.frame, localInput.bits);
            }

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
            this.cleanupNetwork();
            const winner = fighters[0].roundWins > fighters[1].roundWins ? 1 : 2;
            this.scene.start('GameOver', { winner, mode: this.mode });
        }
    }

    private setupNetworkCallbacks(): void {
        if (!this.networkClient) return;

        this.networkClient.callbacks.onStateUpdate = (state: GameState, _frame: number) => {
            this.remoteState = state;
        };

        this.networkClient.callbacks.onOpponentDisconnected = () => {
            this.cleanupNetwork();
            this.scene.start('MainMenu');
        };
    }

    private applyServerState(serverState: GameState): void {
        const state = this.engine.state;

        // Overwrite game state from server (authoritative)
        for (let i = 0; i < 2; i++) {
            const local = state.fighters[i];
            const remote = serverState.fighters[i];
            local.x = remote.x;
            local.y = remote.y;
            local.velX = remote.velX;
            local.velY = remote.velY;
            local.hp = remote.hp;
            local.facingRight = remote.facingRight;
            local.topState = remote.topState;
            local.subState = remote.subState;
            local.frameInState = remote.frameInState;
            local.currentMove = remote.currentMove;
            local.hitConfirmed = remote.hitConfirmed;
            local.stunDuration = remote.stunDuration;
            local.hitStopFrames = remote.hitStopFrames;
            local.roundWins = remote.roundWins;
        }
        state.roundPhase = serverState.roundPhase;
        state.roundTimer = serverState.roundTimer;
        state.currentRound = serverState.currentRound;
        state.phaseFrames = serverState.phaseFrames;
        state.hitStop = serverState.hitStop;
    }

    private cleanupNetwork(): void {
        if (this.networkClient) {
            this.networkClient.callbacks.onStateUpdate = undefined;
            this.networkClient.callbacks.onOpponentDisconnected = undefined;
        }
    }
}
