import type { GameState } from "@shared/types.ts";
import { sendMsg } from "./utils.ts";

export interface Room {
  code: string;
  players: [WebSocket | null, WebSocket | null];
  ready: [boolean, boolean];
  selectedChars: [string | null, string | null];
  started: boolean;
  disconnectTimers: [number | null, number | null];
  onDestroy?: () => void;
  onInput?: (playerIndex: 0 | 1, bits: number) => void;
  onFightStart?: (room: Room) => void;
  onGetState?: () => { state: GameState; frame: number } | null;
}

const GRACE_PERIOD_MS = 15_000;

const rooms = new Map<string, Room>();
const playerToRoom = new Map<WebSocket, { room: Room; index: 0 | 1 }>();

// ── Room code generation ───────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code: string;
  let attempts = 0;
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    attempts++;
    if (attempts > 1000) throw new Error("Failed to generate unique room code");
  } while (rooms.has(code));
  return code;
}

// ── Public API ─────────────────────────────────────────────────────

export function createRoom(ws: WebSocket): Room {
  const code = generateCode();
  const room: Room = {
    code,
    players: [ws, null],
    ready: [false, false],
    selectedChars: [null, null],
    started: false,
    disconnectTimers: [null, null],
  };
  rooms.set(code, room);
  playerToRoom.set(ws, { room, index: 0 });

  console.log(`[room] created: ${code}`);
  sendMsg(ws, { type: "room_created", code });
  sendMsg(ws, { type: "room_joined", playerIndex: 0 });

  return room;
}

export function joinRoom(ws: WebSocket, code: string): Room | null {
  const room = rooms.get(code);
  if (!room) {
    sendMsg(ws, { type: "error", message: `Room ${code} not found` });
    return null;
  }
  if (room.players[1] !== null) {
    sendMsg(ws, { type: "error", message: `Room ${code} is full` });
    return null;
  }

  room.players[1] = ws;
  playerToRoom.set(ws, { room, index: 1 });

  console.log(`[room] ${code}: player 2 joined`);
  sendMsg(ws, { type: "room_joined", playerIndex: 1 });

  // Notify player 1
  if (room.players[0]) {
    sendMsg(room.players[0], { type: "opponent_joined" });
  }

  return room;
}

export function selectCharacter(ws: WebSocket, characterId: string, isValidId: (id: string) => boolean): void {
  const entry = playerToRoom.get(ws);
  if (!entry) return;
  const { room, index } = entry;

  if (!isValidId(characterId)) {
    sendMsg(ws, { type: "error", message: `Unknown character: ${characterId}` });
    return;
  }

  room.selectedChars[index] = characterId;
  console.log(`[room] ${room.code}: player ${index + 1} selected ${characterId}`);

  // Notify opponent
  const opponentIndex = index === 0 ? 1 : 0;
  const opponent = room.players[opponentIndex];
  if (opponent) {
    sendMsg(opponent, { type: "opponent_selected" });
  }

  // Both selected → start fight
  if (room.selectedChars[0] && room.selectedChars[1] && !room.started) {
    room.started = true;
    const p1CharId = room.selectedChars[0];
    const p2CharId = room.selectedChars[1];
    console.log(`[room] ${room.code}: fight starting (${p1CharId} vs ${p2CharId})`);
    if (room.players[0]) sendMsg(room.players[0], { type: "fight_start", playerIndex: 0, p1CharId, p2CharId });
    if (room.players[1]) sendMsg(room.players[1], { type: "fight_start", playerIndex: 1, p1CharId, p2CharId });
    room.onFightStart?.(room);
  }
}

export function setReady(ws: WebSocket): void {
  const entry = playerToRoom.get(ws);
  if (!entry) return;
  const { room, index } = entry;
  room.ready[index] = true;

  console.log(`[room] ${room.code}: player ${index + 1} ready`);

  // Both ready → start fight
  if (room.ready[0] && room.ready[1] && !room.started) {
    room.started = true;
    console.log(`[room] ${room.code}: fight starting`);
    if (room.players[0]) sendMsg(room.players[0], { type: "fight_start", playerIndex: 0, p1CharId: "default", p2CharId: "default" });
    if (room.players[1]) sendMsg(room.players[1], { type: "fight_start", playerIndex: 1, p1CharId: "default", p2CharId: "default" });
    room.onFightStart?.(room);
  }
}

export function handleDisconnect(ws: WebSocket): void {
  const entry = playerToRoom.get(ws);
  if (!entry) return;
  const { room, index } = entry;

  room.players[index] = null;
  playerToRoom.delete(ws);

  console.log(`[room] ${room.code}: player ${index + 1} disconnected`);

  const opponentIndex = (index === 0 ? 1 : 0) as 0 | 1;
  const opponent = room.players[opponentIndex];

  // If game hasn't started or no opponent, use immediate cleanup
  if (!room.started || !opponent) {
    if (opponent) {
      sendMsg(opponent, { type: "opponent_disconnected" });
    }
    if (!room.players[0] && !room.players[1]) {
      destroyRoom(room);
    }
    return;
  }

  // Game in progress — start grace timer
  sendMsg(opponent, { type: "opponent_disconnecting", graceSeconds: GRACE_PERIOD_MS / 1000 });

  room.disconnectTimers[index] = setTimeout(() => {
    room.disconnectTimers[index] = null;
    console.log(`[room] ${room.code}: player ${index + 1} grace period expired`);
    const opp = room.players[opponentIndex];
    if (opp) {
      sendMsg(opp, { type: "opponent_disconnected" });
    }
    if (!room.players[0] && !room.players[1]) {
      destroyRoom(room);
    }
  }, GRACE_PERIOD_MS) as unknown as number;
}

export function rejoinRoom(ws: WebSocket, code: string, playerIndex: 0 | 1): boolean {
  const room = rooms.get(code);
  if (!room) {
    sendMsg(ws, { type: "error", message: `Room ${code} not found` });
    return false;
  }
  if (!room.started) {
    sendMsg(ws, { type: "error", message: "Game not in progress" });
    return false;
  }
  if (room.players[playerIndex] !== null) {
    sendMsg(ws, { type: "error", message: "Slot already occupied" });
    return false;
  }

  // Clear grace timer
  if (room.disconnectTimers[playerIndex] !== null) {
    clearTimeout(room.disconnectTimers[playerIndex]!);
    room.disconnectTimers[playerIndex] = null;
  }

  // Re-seat player
  room.players[playerIndex] = ws;
  playerToRoom.set(ws, { room, index: playerIndex });

  console.log(`[room] ${room.code}: player ${playerIndex + 1} rejoined`);

  // Send current game state to reconnecting player
  const snapshot = room.onGetState?.();
  if (snapshot) {
    sendMsg(ws, { type: "rejoin_success", state: snapshot.state, frame: snapshot.frame });
  }

  // Notify opponent
  const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
  const opponent = room.players[opponentIndex];
  if (opponent) {
    sendMsg(opponent, { type: "opponent_reconnected" });
  }

  return true;
}

export function destroyRoom(room: Room): void {
  room.onDestroy?.();
  rooms.delete(room.code);
  // Clean up any remaining player mappings
  for (const [ws, entry] of playerToRoom) {
    if (entry.room === room) {
      playerToRoom.delete(ws);
    }
  }
  console.log(`[room] destroyed: ${room.code}`);
}

export function getPlayerRoom(ws: WebSocket): { room: Room; index: 0 | 1 } | undefined {
  return playerToRoom.get(ws);
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getRoomCount(): number {
  return rooms.size;
}
