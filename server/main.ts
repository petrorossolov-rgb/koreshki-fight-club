import type { ClientMsg, ServerMsg } from "@shared/types.ts";

const PORT = parseInt(Deno.env.get("PORT") ?? "8000", 10);

function sendMsg(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function handleWebSocket(ws: WebSocket): void {
  console.log("[ws] client connected");

  ws.addEventListener("message", (event) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      console.warn("[ws] invalid JSON, dropping message");
      return;
    }

    switch (msg.type) {
      case "create_room":
      case "join_room":
      case "ready":
      case "input":
        // Handled by RoomManager (T25) and GameRoom (T26)
        break;
      default:
        sendMsg(ws, { type: "error", message: "Unknown message type" });
    }
  });

  ws.addEventListener("close", () => {
    console.log("[ws] client disconnected");
  });

  ws.addEventListener("error", (e) => {
    console.error("[ws] error:", e);
  });
}

Deno.serve({ port: PORT }, (req: Request): Response => {
  const url = new URL(req.url);

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
    return new Response("OK", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
});

console.log(`[server] listening on port ${PORT}`);

export { sendMsg, handleWebSocket };
