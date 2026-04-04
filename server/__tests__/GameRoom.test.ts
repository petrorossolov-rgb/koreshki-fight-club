import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { startGameRoom, stopGameRoom } from "../GameRoom.ts";
import type { Room } from "../RoomManager.ts";

// ── Mock WebSocket ─────────────────────────────────────────────────

interface MockWS extends WebSocket {
  sentMessages: string[];
}

function createMockWS(): MockWS {
  const sent: string[] = [];
  return {
    readyState: WebSocket.OPEN,
    send(data: string) { sent.push(data); },
    sentMessages: sent,
    close() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  } as unknown as MockWS;
}

// ── Minimal CharacterConfig for tests ──────────────────────────────

const testConfig = {
  id: "test",
  name: "test",
  displayName: "Test",
  spriteSheet: "test.png",
  frameWidth: 64,
  frameHeight: 64,
  animations: {
    idle: { key: "idle", frameStart: 0, frameEnd: 3, frameRate: 10, repeat: -1 },
    run: { key: "run", frameStart: 4, frameEnd: 11, frameRate: 10, repeat: -1 },
    jump: { key: "jump", frameStart: 12, frameEnd: 13, frameRate: 10, repeat: 0 },
    fall: { key: "fall", frameStart: 14, frameEnd: 15, frameRate: 10, repeat: -1 },
    crouch: { key: "crouch", frameStart: 16, frameEnd: 16, frameRate: 10, repeat: 0 },
    attack: { key: "attack", frameStart: 17, frameEnd: 20, frameRate: 15, repeat: 0 },
    takeHit: { key: "takeHit", frameStart: 21, frameEnd: 23, frameRate: 10, repeat: 0 },
    death: { key: "death", frameStart: 24, frameEnd: 28, frameRate: 10, repeat: 0 },
  },
  moves: {
    punch: {
      name: "Punch",
      damage: 80,
      startup: 3,
      active: 3,
      recovery: 8,
      hitbox: { x: 30, y: -60, width: 50, height: 30 },
      knockbackX: 5,
      knockbackY: -2,
      hitStunFrames: 12,
      blockStunFrames: 8,
    },
    kick: {
      name: "Kick",
      damage: 120,
      startup: 5,
      active: 4,
      recovery: 12,
      hitbox: { x: 25, y: -40, width: 60, height: 40 },
      knockbackX: 8,
      knockbackY: -3,
      hitStunFrames: 18,
      blockStunFrames: 10,
    },
  },
  pushbox: { x: -20, y: -100, width: 40, height: 100 },
  hurtbox: { x: -25, y: -110, width: 50, height: 110 },
  walkSpeed: 4,
  jumpVelY: -12,
  weight: 1,
  description: "Test fighter",
  nickname: "Tester",
  scale: 1.0,
  tint: 16777215,
  portraitFrame: 0,
  maxHp: 1000,
};

function createMockRoom(): Room {
  return {
    code: "TEST",
    players: [createMockWS(), createMockWS()],
    ready: [true, true],
    selectedChars: [null, null],
    started: true,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

Deno.test("startGameRoom creates game loop with intervalId", () => {
  const room = createMockRoom();
  const grState = startGameRoom(room, testConfig, testConfig);

  assertNotEquals(grState.intervalId, 0);
  assertEquals(grState.frameCount, 0);
  assertEquals(grState.inputs, [0, 0]);

  stopGameRoom(grState);
});

Deno.test("stopGameRoom clears interval", () => {
  const room = createMockRoom();
  const grState = startGameRoom(room, testConfig, testConfig);
  assertNotEquals(grState.intervalId, 0);

  stopGameRoom(grState);
  assertEquals(grState.intervalId, 0);
});

Deno.test("onInput updates player input bits", () => {
  const room = createMockRoom();
  const grState = startGameRoom(room, testConfig, testConfig);

  room.onInput!(0, 17); // LEFT | PUNCH
  room.onInput!(1, 2);  // RIGHT

  assertEquals(grState.inputs[0], 17);
  assertEquals(grState.inputs[1], 2);

  stopGameRoom(grState);
});

Deno.test("game loop increments frameCount and broadcasts state", async () => {
  const room = createMockRoom();
  const ws1 = room.players[0] as MockWS;
  const ws2 = room.players[1] as MockWS;

  const grState = startGameRoom(room, testConfig, testConfig);

  // Wait enough time for several ticks (~100ms = ~6 ticks at 16.67ms each)
  await new Promise((r) => setTimeout(r, 120));

  // Should have run several frames
  const frames = grState.frameCount;
  assertNotEquals(frames, 0);

  // Should have broadcast at least once (every 3rd tick)
  const stateUpdates1 = ws1.sentMessages
    .map((m) => JSON.parse(m))
    .filter((m: Record<string, unknown>) => m.type === "state_update");
  assertNotEquals(stateUpdates1.length, 0);

  // Both players should receive same number of updates
  const stateUpdates2 = ws2.sentMessages
    .map((m) => JSON.parse(m))
    .filter((m: Record<string, unknown>) => m.type === "state_update");
  assertEquals(stateUpdates1.length, stateUpdates2.length);

  stopGameRoom(grState);
});

Deno.test("room.onDestroy stops game loop", () => {
  const room = createMockRoom();
  const grState = startGameRoom(room, testConfig, testConfig);
  assertNotEquals(grState.intervalId, 0);

  // Trigger destroy
  room.onDestroy!();
  assertEquals(grState.intervalId, 0);
});

Deno.test("startGameRoom with different configs per player", async () => {
  const bigConfig = { ...testConfig, id: "big", maxHp: 1100, walkSpeed: 2.8 };
  const smallConfig = { ...testConfig, id: "small", maxHp: 900, walkSpeed: 5.0 };
  const room = createMockRoom();
  const ws1 = room.players[0] as MockWS;

  const grState = startGameRoom(room, bigConfig, smallConfig);

  // Wait for a broadcast
  await new Promise((r) => setTimeout(r, 120));

  const stateUpdates = ws1.sentMessages
    .map((m) => JSON.parse(m))
    .filter((m: Record<string, unknown>) => m.type === "state_update");
  assertNotEquals(stateUpdates.length, 0);

  // Verify fighters have different HP from configs
  const lastUpdate = stateUpdates[stateUpdates.length - 1];
  assertEquals(lastUpdate.state.fighters[0].hp, 1100);
  assertEquals(lastUpdate.state.fighters[1].hp, 900);

  stopGameRoom(grState);
});
