import type { CharacterConfig, GameState } from "@shared/types.ts";
import { FIXED_DT } from "@shared/constants.ts";
import { createFightEngine } from "@shared/FightEngine.ts";
import type { Room } from "./RoomManager.ts";
import { sendMsg } from "./main.ts";

const STATE_BROADCAST_INTERVAL = 3; // every 3rd tick → ~20Hz

export interface GameRoomState {
  intervalId: number;
  frameCount: number;
  inputs: [number, number]; // latest bits per player
}

export function startGameRoom(room: Room, config: CharacterConfig): GameRoomState {
  const engine = createFightEngine({ p1Config: config, p2Config: config });
  const grState: GameRoomState = {
    intervalId: 0,
    frameCount: 0,
    inputs: [0, 0],
  };

  // Wire input callback
  room.onInput = (playerIndex: 0 | 1, bits: number) => {
    grState.inputs[playerIndex] = bits;
  };

  // Game loop at ~60Hz
  grState.intervalId = setInterval(() => {
    engine.step(grState.inputs);
    grState.frameCount++;

    // Broadcast state at ~20Hz
    if (grState.frameCount % STATE_BROADCAST_INTERVAL === 0) {
      broadcastState(room, engine.state, grState.frameCount);
    }
  }, FIXED_DT) as unknown as number;

  // Clean up on room destroy
  room.onDestroy = () => {
    stopGameRoom(grState);
  };

  console.log(`[game] ${room.code}: game loop started`);
  return grState;
}

export function stopGameRoom(grState: GameRoomState): void {
  if (grState.intervalId) {
    clearInterval(grState.intervalId);
    grState.intervalId = 0;
    console.log("[game] game loop stopped");
  }
}

function broadcastState(room: Room, state: GameState, frame: number): void {
  const msg = { type: "state_update" as const, state, frame };
  if (room.players[0]) sendMsg(room.players[0], msg);
  if (room.players[1]) sendMsg(room.players[1], msg);
}
