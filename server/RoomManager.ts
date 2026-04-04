import type { ServerMsg } from "@shared/types.ts";
import { sendMsg } from "./main.ts";

export interface Room {
  code: string;
  players: [WebSocket | null, WebSocket | null];
  ready: [boolean, boolean];
  started: boolean;
  onDestroy?: () => void;
  onInput?: (playerIndex: 0 | 1, bits: number) => void;
}

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
    started: false,
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
    if (room.players[0]) sendMsg(room.players[0], { type: "fight_start", playerIndex: 0 });
    if (room.players[1]) sendMsg(room.players[1], { type: "fight_start", playerIndex: 1 });
  }
}

export function handleDisconnect(ws: WebSocket): void {
  const entry = playerToRoom.get(ws);
  if (!entry) return;
  const { room, index } = entry;

  room.players[index] = null;
  playerToRoom.delete(ws);

  console.log(`[room] ${room.code}: player ${index + 1} disconnected`);

  // Notify opponent
  const opponentIndex = index === 0 ? 1 : 0;
  const opponent = room.players[opponentIndex];
  if (opponent) {
    sendMsg(opponent, { type: "opponent_disconnected" });
  }

  // Destroy room if both players gone
  if (!room.players[0] && !room.players[1]) {
    destroyRoom(room);
  }
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
