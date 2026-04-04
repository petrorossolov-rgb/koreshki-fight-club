import type { ServerMsg } from "@shared/types.ts";

export function sendMsg(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
