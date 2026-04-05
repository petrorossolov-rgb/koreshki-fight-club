import type { ClientMsg, ServerMsg, GameState, GameEvent } from '@shared/types';

// ── Connection States ──────────────────────────────────────────────

export const enum NetState {
    Disconnected = 'disconnected',
    Connecting   = 'connecting',
    Connected    = 'connected',
    InRoom       = 'inRoom',
    InFight      = 'inFight',
}

// ── Callback types ─────────────────────────────────────────────────

export interface NetworkCallbacks {
    onStateChange?: (state: NetState) => void;
    onRoomCreated?: (code: string) => void;
    onRoomJoined?: (playerIndex: 0 | 1) => void;
    onOpponentJoined?: () => void;
    onOpponentSelected?: () => void;
    onFightStart?: (playerIndex: 0 | 1, p1CharId: string, p2CharId: string) => void;
    onStateUpdate?: (state: GameState, frame: number, events?: GameEvent[]) => void;
    onOpponentDisconnected?: () => void;
    onOpponentDisconnecting?: (graceSeconds: number) => void;
    onOpponentReconnected?: () => void;
    onReconnecting?: (attempt: number, max: number) => void;
    onReconnected?: () => void;
    onReconnectFailed?: () => void;
    onError?: (message: string) => void;
}

// ── NetworkClient ──────────────────────────────────────────────────

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 8000];
const SESSION_KEY = 'koreshki_reconnect';

export class NetworkClient {
    private ws: WebSocket | null = null;
    private _state: NetState = NetState.Disconnected;
    private _playerIndex: 0 | 1 = 0;
    private _roomCode = '';
    private _serverUrl = '';
    private reconnectAttempt = 0;
    private reconnectTimer: number | null = null;
    private isReconnecting = false;
    public callbacks: NetworkCallbacks = {};

    get state(): NetState { return this._state; }
    get playerIndex(): 0 | 1 { return this._playerIndex; }
    get roomCode(): string { return this._roomCode; }

    connect(url: string): void {
        if (this.ws) this.cleanup(false);
        this._serverUrl = url;

        this.setState(NetState.Connecting);
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => {
            if (this.isReconnecting) {
                // Send rejoin on reconnect
                const saved = this.getSavedSession();
                if (saved) {
                    this.send({ type: 'rejoin_room', code: saved.roomCode, playerIndex: saved.playerIndex });
                }
            } else {
                this.setState(NetState.Connected);
            }
        });

        this.ws.addEventListener('message', (event) => {
            let msg: ServerMsg;
            try {
                msg = JSON.parse(event.data as string);
            } catch {
                return;
            }
            this.handleMessage(msg);
        });

        this.ws.addEventListener('close', () => {
            this.ws = null;
            // If was in room/fight, attempt reconnect
            if ((this._state === NetState.InRoom || this._state === NetState.InFight) && !this.isReconnecting) {
                this.saveSession();
                this.startReconnect();
            } else if (this.isReconnecting) {
                this.attemptReconnect();
            } else {
                this.setState(NetState.Disconnected);
            }
        });

        this.ws.addEventListener('error', () => {
            if (!this.isReconnecting) {
                this.callbacks.onError?.('Connection failed');
            }
        });
    }

    disconnect(): void {
        this.cancelReconnect();
        this.clearSession();
        this.cleanup(true);
    }

    // ── Convenience methods ────────────────────────────────────────

    createRoom(): void {
        this.send({ type: 'create_room' });
    }

    joinRoom(code: string): void {
        this.send({ type: 'join_room', code: code.toUpperCase() });
    }

    sendReady(): void {
        this.send({ type: 'ready' });
    }

    selectCharacter(characterId: string): void {
        this.send({ type: 'select_character', characterId });
    }

    sendInput(frame: number, bits: number): void {
        this.send({ type: 'input', frame, bits });
    }

    // ── Reconnect logic ────────────────────────────────────────────

    private saveSession(): void {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                roomCode: this._roomCode,
                playerIndex: this._playerIndex,
            }));
        } catch { /* sessionStorage unavailable */ }
    }

    private getSavedSession(): { roomCode: string; playerIndex: 0 | 1 } | null {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    private clearSession(): void {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
    }

    private startReconnect(): void {
        this.isReconnecting = true;
        this.reconnectAttempt = 0;
        this.attemptReconnect();
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempt >= RECONNECT_DELAYS.length) {
            this.isReconnecting = false;
            this.clearSession();
            this.setState(NetState.Disconnected);
            this.callbacks.onReconnectFailed?.();
            return;
        }

        const delay = RECONNECT_DELAYS[this.reconnectAttempt];
        this.reconnectAttempt++;
        this.callbacks.onReconnecting?.(this.reconnectAttempt, RECONNECT_DELAYS.length);

        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(this._serverUrl);
        }, delay);
    }

    private cancelReconnect(): void {
        this.isReconnecting = false;
        this.reconnectAttempt = 0;
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ── Internals ──────────────────────────────────────────────────

    private send(msg: ClientMsg): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    private handleMessage(msg: ServerMsg): void {
        switch (msg.type) {
            case 'room_created':
                this._roomCode = msg.code;
                this.setState(NetState.InRoom);
                this.callbacks.onRoomCreated?.(msg.code);
                break;

            case 'room_joined':
                this._playerIndex = msg.playerIndex;
                if (this._state !== NetState.InRoom) {
                    this.setState(NetState.InRoom);
                }
                this.callbacks.onRoomJoined?.(msg.playerIndex);
                break;

            case 'opponent_joined':
                this.callbacks.onOpponentJoined?.();
                break;

            case 'opponent_selected':
                this.callbacks.onOpponentSelected?.();
                break;

            case 'fight_start':
                this._playerIndex = msg.playerIndex;
                this.setState(NetState.InFight);
                this.callbacks.onFightStart?.(msg.playerIndex, msg.p1CharId, msg.p2CharId);
                break;

            case 'state_update':
                this.callbacks.onStateUpdate?.(msg.state, msg.frame, msg.events);
                break;

            case 'rejoin_success':
                this.isReconnecting = false;
                this.reconnectAttempt = 0;
                this.clearSession();
                this.setState(NetState.InFight);
                this.callbacks.onStateUpdate?.(msg.state, msg.frame);
                this.callbacks.onReconnected?.();
                break;

            case 'opponent_disconnecting':
                this.callbacks.onOpponentDisconnecting?.(msg.graceSeconds);
                break;

            case 'opponent_reconnected':
                this.callbacks.onOpponentReconnected?.();
                break;

            case 'opponent_disconnected':
                this.cancelReconnect();
                this.clearSession();
                this.setState(NetState.Connected);
                this._roomCode = '';
                this.callbacks.onOpponentDisconnected?.();
                break;

            case 'error':
                if (this.isReconnecting) {
                    // Rejoin failed (wrong code, slot taken, etc.) — stop reconnecting
                    this.cancelReconnect();
                    this.clearSession();
                    this.setState(NetState.Disconnected);
                    this.callbacks.onReconnectFailed?.();
                } else {
                    this.callbacks.onError?.(msg.message);
                }
                break;
        }
    }

    private setState(newState: NetState): void {
        this._state = newState;
        this.callbacks.onStateChange?.(newState);
    }

    private cleanup(updateState: boolean): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (updateState) {
            this._state = NetState.Disconnected;
            this._roomCode = '';
        }
    }
}
