import { Scene } from 'phaser';
import type { CharacterConfig, GameState, GameEvent } from '@shared/types';
import { RoundPhase } from '@shared/types';
import { FIXED_DT } from '@shared/constants';
import { createFightEngine, type FightEngine } from '@shared/FightEngine';
import { Fighter } from '@game/entities/Fighter';
import { InputManager, NetworkSource } from '@game/systems/InputManager';
import { HealthBar } from '@game/ui/HealthBar';
import { RoundDisplay } from '@game/ui/RoundDisplay';
import { HitSpark } from '@game/ui/HitSpark';
import { ComboCounter } from '@game/ui/ComboCounter';
import { CooldownIndicator } from '@game/ui/CooldownIndicator';
import { NetworkClient } from '@game/net/NetworkClient';
import type { SoundManager } from '@game/systems/SoundManager';

export interface FightSceneData {
    mode: 'local' | 'online';
    networkClient?: NetworkClient;
    playerIndex?: 0 | 1;
    p1Config?: CharacterConfig;
    p2Config?: CharacterConfig;
    soundManager?: SoundManager;
}

export class FightScene extends Scene {
    private engine!: FightEngine;
    private fighters!: [Fighter, Fighter];
    private inputManager!: InputManager;
    private healthBars!: [HealthBar, HealthBar];
    private roundDisplay!: RoundDisplay;
    private hitSpark!: HitSpark;
    private comboCounters!: [ComboCounter, ComboCounter];
    private cooldownIndicators!: [CooldownIndicator, CooldownIndicator];
    private accumulator = 0;

    // Config state
    private p1Config!: CharacterConfig;
    private p2Config!: CharacterConfig;

    // Sound
    private soundManager: SoundManager | null = null;

    // Online mode state
    private mode: 'local' | 'online' = 'local';
    private networkClient: NetworkClient | null = null;
    private localPlayerIndex: 0 | 1 = 0;
    private remoteState: GameState | null = null;
    private remoteEvents: GameEvent[] = [];

    constructor() {
        super('FightScene');
    }

    init(data?: FightSceneData): void {
        this.mode = data?.mode ?? 'local';
        this.soundManager = data?.soundManager ?? null;
        this.networkClient = data?.networkClient ?? null;
        this.localPlayerIndex = data?.playerIndex ?? 0;
        this.remoteState = null;

        // Use provided configs or fallback to cached default
        const fallback = () => this.cache.json.get('char_default') as CharacterConfig;
        this.p1Config = data?.p1Config ?? fallback();
        this.p2Config = data?.p2Config ?? fallback();
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        if (this.soundManager) {
            this.soundManager.transferTo(this);
            this.soundManager.playMusic('bgm_fight');
        }

        this.engine = createFightEngine({ p1Config: this.p1Config, p2Config: this.p2Config });

        this.fighters = [
            new Fighter(this, this.p1Config, 0),
            new Fighter(this, this.p2Config, 1),
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
            new HealthBar(this, 0, this.p1Config.maxHp, this.p1Config.nickname || this.p1Config.id),
            new HealthBar(this, 1, this.p2Config.maxHp, this.p2Config.nickname || this.p2Config.id),
        ];
        this.roundDisplay = new RoundDisplay(this);
        this.hitSpark = new HitSpark(this);
        this.comboCounters = [
            new ComboCounter(this, 0),
            new ComboCounter(this, 1),
        ];
        this.cooldownIndicators = [
            new CooldownIndicator(this, 0),
            new CooldownIndicator(this, 1),
        ];

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

        // Process visual effects — use server events in online mode to avoid double effects
        if (this.mode === 'online') {
            if (this.remoteEvents.length > 0) {
                this.processEvents(this.remoteEvents);
                this.remoteEvents = [];
            }
        } else {
            this.processEvents(this.engine.events);
        }

        const { fighters, roundPhase, roundTimer, hitStop } = this.engine.state;

        // Hit-stop zoom effect
        this.cameras.main.setZoom(hitStop > 0 ? 1.02 : 1.0);

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

        // Combo counters
        this.comboCounters[0].update(this, fighters[0].comboCount, fighters[0].comboDamage);
        this.comboCounters[1].update(this, fighters[1].comboCount, fighters[1].comboDamage);

        // Cooldown indicators
        const p1CdFrames = this.p1Config.specialCooldownFrames ?? 0;
        const p2CdFrames = this.p2Config.specialCooldownFrames ?? 0;
        this.cooldownIndicators[0].update(this, fighters[0].specialCooldown, p1CdFrames);
        this.cooldownIndicators[1].update(this, fighters[1].specialCooldown, p2CdFrames);

        // Transition to GameOver on match end
        if (roundPhase === RoundPhase.MatchEnd) {
            this.soundManager?.stopMusic();
            this.cleanupNetwork();
            const winnerIdx = fighters[0].roundWins > fighters[1].roundWins ? 0 : 1;
            const winnerConfig = winnerIdx === 0 ? this.p1Config : this.p2Config;
            this.scene.start('GameOver', {
                winner: winnerIdx + 1,
                mode: this.mode,
                winnerName: winnerConfig.nickname || winnerConfig.id,
                winnerTint: winnerConfig.tint,
            });
        }
    }

    private setupNetworkCallbacks(): void {
        if (!this.networkClient) return;

        this.networkClient.callbacks.onStateUpdate = (state: GameState, _frame: number, events?: GameEvent[]) => {
            this.remoteState = state;
            if (events) this.remoteEvents = events;
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
            local.comboCount = remote.comboCount;
            local.comboDamage = remote.comboDamage;
            local.specialCooldown = remote.specialCooldown;
            local.isCrouching = remote.isCrouching;
        }
        state.roundPhase = serverState.roundPhase;
        state.roundTimer = serverState.roundTimer;
        state.currentRound = serverState.currentRound;
        state.phaseFrames = serverState.phaseFrames;
        state.hitStop = serverState.hitStop;
    }

    private processEvents(events: GameEvent[]): void {
        const cam = this.cameras.main;
        const snd = this.soundManager;
        for (const evt of events) {
            switch (evt.type) {
                case 'hit':
                    cam.shake(100, 0.005);
                    this.hitSpark.emit(evt.x, evt.y);
                    snd?.play(evt.damage >= 15 ? 'hit_heavy' : 'hit_light');
                    break;
                case 'block':
                    snd?.play('block', 0.6);
                    break;
                case 'ko':
                    cam.shake(300, 0.02);
                    snd?.play('ko');
                    if (this.mode === 'local') {
                        this.time.timeScale = 0.3;
                        this.time.delayedCall(1000, () => {
                            this.time.timeScale = 1.0;
                        });
                    }
                    break;
                case 'round_start':
                    snd?.play('fight');
                    break;
                case 'special_used':
                    cam.shake(200, 0.01);
                    snd?.play('special');
                    break;
            }
        }
    }

    private cleanupNetwork(): void {
        if (this.networkClient) {
            this.networkClient.callbacks.onStateUpdate = undefined;
            this.networkClient.callbacks.onOpponentDisconnected = undefined;
        }
    }
}
