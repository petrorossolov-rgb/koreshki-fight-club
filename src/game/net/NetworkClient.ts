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
    onError?: (message: string) => void;
}

// ── NetworkClient ──────────────────────────────────────────────────

export class NetworkClient {
    private ws: WebSocket | null = null;
    private _state: NetState = NetState.Disconnected;
    private _playerIndex: 0 | 1 = 0;
    private _roomCode = '';
    public callbacks: NetworkCallbacks = {};

    get state(): NetState { return this._state; }
    get playerIndex(): 0 | 1 { return this._playerIndex; }
    get roomCode(): string { return this._roomCode; }

    connect(url: string): void {
        if (this.ws) this.cleanup();

        this.setState(NetState.Connecting);
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => {
            this.setState(NetState.Connected);
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
            this.setState(NetState.Disconnected);
            this.ws = null;
        });

        this.ws.addEventListener('error', () => {
            this.callbacks.onError?.('Connection failed');
        });
    }

    disconnect(): void {
        this.cleanup();
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

            case 'opponent_disconnected':
                this.setState(NetState.Connected);
                this._roomCode = '';
                this.callbacks.onOpponentDisconnected?.();
                break;

            case 'error':
                this.callbacks.onError?.(msg.message);
                break;
        }
    }

    private setState(newState: NetState): void {
        this._state = newState;
        this.callbacks.onStateChange?.(newState);
    }

    private cleanup(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._state = NetState.Disconnected;
        this._roomCode = '';
    }
}
