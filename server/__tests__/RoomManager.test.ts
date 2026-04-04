import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createRoom,
  joinRoom,
  setReady,
  handleDisconnect,
  getPlayerRoom,
  getRoom,
  getRoomCount,
  destroyRoom,
} from "../RoomManager.ts";

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
    // Stubs for WebSocket interface (unused)
    close() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  } as unknown as MockWS;
}

function lastMsg(ws: MockWS): Record<string, unknown> {
  return JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
}

// ── Tests ──────────────────────────────────────────────────────────

Deno.test("createRoom returns room with 4-letter code", () => {
  const ws = createMockWS();
  const room = createRoom(ws);

  assertExists(room);
  assertEquals(room.code.length, 4);
  assertEquals(/^[A-Z]{4}$/.test(room.code), true);
  assertEquals(room.players[0], ws);
  assertEquals(room.players[1], null);

  // Player receives room_created and room_joined
  assertEquals(ws.sentMessages.length, 2);
  assertEquals(JSON.parse(ws.sentMessages[0]).type, "room_created");
  assertEquals(JSON.parse(ws.sentMessages[1]).type, "room_joined");
  assertEquals(JSON.parse(ws.sentMessages[1]).playerIndex, 0);

  destroyRoom(room);
});

Deno.test("joinRoom assigns playerIndex 1", () => {
  const ws1 = createMockWS();
  const ws2 = createMockWS();
  const room = createRoom(ws1);

  const joined = joinRoom(ws2, room.code);
  assertExists(joined);
  assertEquals(room.players[1], ws2);

  // P2 gets room_joined with index 1
  const joinedMsg = lastMsg(ws2);
  assertEquals(joinedMsg.type, "room_joined");
  assertEquals(joinedMsg.playerIndex, 1);

  // P1 gets opponent_joined
  const opponentMsg = lastMsg(ws1);
  assertEquals(opponentMsg.type, "opponent_joined");

  destroyRoom(room);
});

Deno.test("joinRoom with invalid code returns null and sends error", () => {
  const ws = createMockWS();
  const result = joinRoom(ws, "ZZZZ");

  assertEquals(result, null);
  assertEquals(lastMsg(ws).type, "error");
});

Deno.test("joinRoom to full room returns null and sends error", () => {
  const ws1 = createMockWS();
  const ws2 = createMockWS();
  const ws3 = createMockWS();
  const room = createRoom(ws1);
  joinRoom(ws2, room.code);

  const result = joinRoom(ws3, room.code);
  assertEquals(result, null);
  assertEquals(lastMsg(ws3).type, "error");

  destroyRoom(room);
});

Deno.test("setReady triggers fight_start when both ready", () => {
  const ws1 = createMockWS();
  const ws2 = createMockWS();
  const room = createRoom(ws1);
  joinRoom(ws2, room.code);

  let fightStarted = false;
  room.onFightStart = () => { fightStarted = true; };

  setReady(ws1);
  assertEquals(room.started, false);

  setReady(ws2);
  assertEquals(room.started, true);
  assertEquals(fightStarted, true);

  // Both players receive fight_start
  const p1Msgs = ws1.sentMessages.map((m) => JSON.parse(m));
  const p2Msgs = ws2.sentMessages.map((m) => JSON.parse(m));
  const p1Start = p1Msgs.find((m: Record<string, unknown>) => m.type === "fight_start");
  const p2Start = p2Msgs.find((m: Record<string, unknown>) => m.type === "fight_start");
  assertExists(p1Start);
  assertExists(p2Start);
  assertEquals(p1Start.playerIndex, 0);
  assertEquals(p2Start.playerIndex, 1);

  destroyRoom(room);
});

Deno.test("handleDisconnect notifies opponent", () => {
  const ws1 = createMockWS();
  const ws2 = createMockWS();
  const room = createRoom(ws1);
  joinRoom(ws2, room.code);
  const code = room.code;

  handleDisconnect(ws1);
  assertEquals(lastMsg(ws2).type, "opponent_disconnected");
  assertEquals(room.players[0], null);

  // Room still exists (P2 still in)
  assertExists(getRoom(code));

  handleDisconnect(ws2);
  // Room destroyed after both disconnect
  assertEquals(getRoom(code), undefined);
});

Deno.test("getPlayerRoom returns correct entry", () => {
  const ws1 = createMockWS();
  const ws2 = createMockWS();
  const room = createRoom(ws1);
  joinRoom(ws2, room.code);

  const entry1 = getPlayerRoom(ws1);
  assertExists(entry1);
  assertEquals(entry1.index, 0);
  assertEquals(entry1.room.code, room.code);

  const entry2 = getPlayerRoom(ws2);
  assertExists(entry2);
  assertEquals(entry2.index, 1);

  destroyRoom(room);
});

Deno.test("destroyRoom cleans up maps", () => {
  const ws = createMockWS();
  const room = createRoom(ws);
  const code = room.code;
  const countBefore = getRoomCount();

  destroyRoom(room);
  assertEquals(getRoom(code), undefined);
  assertEquals(getRoomCount(), countBefore - 1);
  assertEquals(getPlayerRoom(ws), undefined);
});
