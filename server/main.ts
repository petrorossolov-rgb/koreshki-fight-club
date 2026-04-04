import type { ClientMsg } from "@shared/types.ts";
import { createRoom, joinRoom, setReady, selectCharacter, handleDisconnect, getPlayerRoom } from "./RoomManager.ts";
import { startGameRoom } from "./GameRoom.ts";
import { loadAllConfigs, getDefaultConfig, getCharConfig } from "./charConfigs.ts";

// ── Load all character configs from manifest ──────────────────────
try {
  await loadAllConfigs(import.meta.url);
} catch (e) {
  console.error("[server] failed to load character configs:", e);
  Deno.exit(1);
}

const defaultConfig = getDefaultConfig();

const PORT = parseInt(Deno.env.get("PORT") ?? "8000", 10);
const CORS_ORIGIN = Deno.env.get("CORS_ORIGIN") ?? "*";

// ── Rate limiting ──────────────────────────────────────────────────
const MAX_MESSAGES_PER_SEC = 120; // 2x of 60Hz input rate

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<WebSocket, RateLimitState>();

function isRateLimited(ws: WebSocket): boolean {
  const now = Date.now();
  let state = rateLimits.get(ws);
  if (!state || now >= state.resetAt) {
    state = { count: 0, resetAt: now + 1000 };
    rateLimits.set(ws, state);
  }
  state.count++;
  return state.count > MAX_MESSAGES_PER_SEC;
}

// ── Message validation ─────────────────────────────────────────────

const VALID_TYPES = new Set(["create_room", "join_room", "ready", "input", "select_character"]);

function validateMessage(data: unknown): ClientMsg | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_TYPES.has(obj.type)) return null;

  switch (obj.type) {
    case "create_room":
      return { type: "create_room" };
    case "join_room":
      if (typeof obj.code !== "string" || obj.code.length !== 4) return null;
      return { type: "join_room", code: obj.code.toUpperCase() };
    case "ready":
      return { type: "ready" };
    case "input":
      if (typeof obj.frame !== "number" || typeof obj.bits !== "number") return null;
      if (obj.bits < 0 || obj.bits > 255 || !Number.isInteger(obj.bits)) return null;
      if (!Number.isInteger(obj.frame) || obj.frame < 0) return null;
      return { type: "input", frame: obj.frame, bits: obj.bits };
    case "select_character":
      if (typeof obj.characterId !== "string" || obj.characterId.length === 0) return null;
      return { type: "select_character", characterId: obj.characterId };
    default:
      return null;
  }
}

// ── WebSocket handling ─────────────────────────────────────────────

function handleWebSocket(ws: WebSocket): void {
  console.log("[ws] client connected");

  ws.addEventListener("message", (event) => {
    // Rate limit check
    if (isRateLimited(ws)) {
      console.warn("[ws] rate limited, dropping message");
      return;
    }

    // Parse JSON
    let raw: unknown;
    try {
      raw = JSON.parse(event.data as string);
    } catch {
      console.warn("[ws] invalid JSON, dropping message");
      return;
    }

    // Validate message structure
    const msg = validateMessage(raw);
    if (!msg) {
      console.warn("[ws] invalid message structure, dropping:", JSON.stringify(raw).slice(0, 100));
      return;
    }

    switch (msg.type) {
      case "create_room": {
        const room = createRoom(ws);
        room.onFightStart = (r) => {
          const p1 = getCharConfig(r.selectedChars[0]!) ?? defaultConfig;
          const p2 = getCharConfig(r.selectedChars[1]!) ?? defaultConfig;
          startGameRoom(r, p1, p2);
        };
        break;
      }
      case "join_room": {
        const room = joinRoom(ws, msg.code);
        if (room && !room.onFightStart) {
          room.onFightStart = (r) => {
            const p1 = getCharConfig(r.selectedChars[0]!) ?? defaultConfig;
            const p2 = getCharConfig(r.selectedChars[1]!) ?? defaultConfig;
            startGameRoom(r, p1, p2);
          };
        }
        break;
      }
      case "select_character":
        selectCharacter(ws, msg.characterId, (id) => getCharConfig(id) !== undefined);
        break;
      case "ready":
        setReady(ws);
        break;
      case "input": {
        const entry = getPlayerRoom(ws);
        if (entry) {
          // Forward to GameRoom (T26)
          entry.room.onInput?.(entry.index, msg.bits);
        }
        break;
      }
    }
  });

  ws.addEventListener("close", () => {
    rateLimits.delete(ws);
    handleDisconnect(ws);
    console.log("[ws] client disconnected");
  });

  ws.addEventListener("error", (e) => {
    console.error("[ws] error:", e);
  });
}

// ── HTTP server ────────────────────────────────────────────────────

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve({ port: PORT }, (req: Request): Response => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname === "/ws") {
    const upgrade = req.headers.get("upgrade") ?? "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleWebSocket(socket);
    return response;
  }

  // Health check
  if (url.pathname === "/health") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
});

console.log(`[server] listening on port ${PORT}`);

export { handleWebSocket, validateMessage, isRateLimited };
