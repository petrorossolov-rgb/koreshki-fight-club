import { Scene, GameObjects } from 'phaser';
import { isTouchDevice } from '@game/ui/TouchControls';
import { NetworkClient, NetState } from '@game/net/NetworkClient';
import type { FightSceneData } from '@game/scenes/FightScene';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws';

type MenuView = 'main' | 'online' | 'create' | 'join' | 'waiting';

export class MainMenu extends Scene {
    private net: NetworkClient | null = null;
    private view: MenuView = 'main';
    private uiContainer!: GameObjects.Container;
    private statusText!: GameObjects.Text;
    private codeInput = '';

    constructor() {
        super('MainMenu');
    }

    create(): void {
        this.add.image(512, 288, 'background');
        this.add.image(512, 140, 'logo');

        this.uiContainer = this.add.container(0, 0);
        this.statusText = this.add.text(512, 500, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#ff6666',
            align: 'center',
        }).setOrigin(0.5);

        // Fullscreen button on touch devices
        if (isTouchDevice()) {
            this.createFullscreenButton();
            this.tryLockOrientation();
        }

        this.showMainView();
    }

    // ── Views ──────────────────────────────────────────────────────

    private clearUI(): void {
        this.uiContainer.removeAll(true);
        this.statusText.setText('');
        this.codeInput = '';
    }

    private showMainView(): void {
        this.view = 'main';
        this.clearUI();

        this.addButton(512, 280, 'LOCAL', () => {
            this.scene.start('FightScene', { mode: 'local' } as FightSceneData);
        });

        this.addButton(512, 350, 'ONLINE', () => {
            this.showOnlineView();
        });
    }

    private showOnlineView(): void {
        this.view = 'online';
        this.clearUI();

        this.addButton(512, 280, 'CREATE ROOM', () => {
            this.connectAndDo(() => this.net!.createRoom());
        });

        this.addButton(512, 350, 'JOIN ROOM', () => {
            this.showJoinView();
        });

        this.addButton(512, 420, 'BACK', () => {
            this.disconnectNet();
            this.showMainView();
        });
    }

    private showCreateWaitingView(code: string): void {
        this.view = 'create';
        this.clearUI();

        this.addLabel(512, 260, 'ROOM CODE:', '24px');
        this.addLabel(512, 310, code, '56px', '#ffcc00');
        this.addLabel(512, 370, 'Waiting for opponent...', '20px', '#aaaaaa');

        this.addButton(512, 440, 'CANCEL', () => {
            this.disconnectNet();
            this.showOnlineView();
        });
    }

    private showJoinView(): void {
        this.view = 'join';
        this.clearUI();

        this.addLabel(512, 260, 'ENTER ROOM CODE:', '24px');

        const codeDisplay = this.add.text(512, 320, '____', {
            fontFamily: 'Courier New', fontSize: '56px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);
        this.uiContainer.add(codeDisplay);

        // Keyboard input for code
        this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            if (this.view !== 'join') return;
            const key = event.key.toUpperCase();
            if (key === 'BACKSPACE' && this.codeInput.length > 0) {
                this.codeInput = this.codeInput.slice(0, -1);
            } else if (/^[A-Z]$/.test(key) && this.codeInput.length < 4) {
                this.codeInput += key;
            }
            codeDisplay.setText(this.codeInput.padEnd(4, '_'));

            if (this.codeInput.length === 4) {
                this.connectAndDo(() => this.net!.joinRoom(this.codeInput));
            }
        });

        this.addButton(512, 420, 'BACK', () => {
            this.disconnectNet();
            this.showOnlineView();
        });
    }

    private showWaitingForReady(): void {
        this.view = 'waiting';
        this.clearUI();
        this.addLabel(512, 300, 'Connected! Starting...', '28px', '#66ff66');
    }

    // ── Networking ─────────────────────────────────────────────────

    private connectAndDo(action: () => void): void {
        if (this.net && this.net.state !== NetState.Disconnected) {
            action();
            return;
        }

        this.net = new NetworkClient();
        this.setupNetCallbacks();
        this.statusText.setText('Connecting...');

        // Store the action to run after connection
        const originalOnStateChange = this.net.callbacks.onStateChange;
        this.net.callbacks.onStateChange = (state: NetState) => {
            originalOnStateChange?.(state);
            if (state === NetState.Connected) {
                this.net!.callbacks.onStateChange = originalOnStateChange ?? undefined;
                action();
            } else if (state === NetState.Disconnected) {
                this.statusText.setText('Connection failed');
            }
        };

        this.net.connect(WS_URL);
    }

    private setupNetCallbacks(): void {
        if (!this.net) return;

        this.net.callbacks.onRoomCreated = (code: string) => {
            this.showCreateWaitingView(code);
        };

        this.net.callbacks.onRoomJoined = () => {
            // Joiner auto-sends ready
            this.net!.sendReady();
        };

        this.net.callbacks.onOpponentJoined = () => {
            // Creator auto-sends ready when opponent joins
            this.net!.sendReady();
            this.showWaitingForReady();
        };

        this.net.callbacks.onFightStart = (playerIndex: 0 | 1) => {
            this.scene.start('FightScene', {
                mode: 'online',
                networkClient: this.net,
                playerIndex,
            } as FightSceneData);
            // Don't null out net — FightScene takes ownership
            this.net = null;
        };

        this.net.callbacks.onOpponentDisconnected = () => {
            this.statusText.setText('Opponent disconnected');
            this.showOnlineView();
        };

        this.net.callbacks.onError = (message: string) => {
            this.statusText.setText(message);
        };
    }

    private disconnectNet(): void {
        if (this.net) {
            this.net.disconnect();
            this.net = null;
        }
    }

    // ── UI Helpers ─────────────────────────────────────────────────

    private addButton(x: number, y: number, label: string, onClick: () => void): void {
        const bg = this.add.rectangle(x, y, 280, 52, 0x333355)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: '26px', color: '#ffffff',
        }).setOrigin(0.5);

        bg.on('pointerover', () => { bg.fillColor = 0x555577; });
        bg.on('pointerout', () => { bg.fillColor = 0x333355; });
        bg.on('pointerdown', onClick);

        this.uiContainer.add([bg, text]);
    }

    private addLabel(x: number, y: number, text: string, size: string, color = '#ffffff'): void {
        const label = this.add.text(x, y, text, {
            fontFamily: 'Arial Black', fontSize: size, color,
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5);
        this.uiContainer.add(label);
    }

    private createFullscreenButton(): void {
        const btn = this.add.text(512, 540, '[ FULLSCREEN ]', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#aaaaff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                this.tryLockOrientation();
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    private tryLockOrientation(): void {
        try {
            const orientation = screen.orientation as ScreenOrientation & {
                lock?(type: string): Promise<void>;
            };
            orientation.lock?.('landscape')?.catch(() => {});
        } catch {
            // Orientation lock not supported
        }
    }
}
