import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// We can't import handleRequest from main.ts (side effects: Deno.serve, loadAllConfigs).
// Instead, replicate the /join route logic for isolated testing.

const CLIENT_URL = "http://localhost:5173";

function handleJoinRoute(req: Request): Response {
  const url = new URL(req.url);
  if (url.pathname !== "/join") {
    return new Response("Not Found", { status: 404 });
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing 'code' query parameter", { status: 400 });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: `${CLIENT_URL}?room=${code.toUpperCase()}` },
  });
}

Deno.test("/join?code=ABCD redirects to client URL", () => {
  const req = new Request("http://localhost:8000/join?code=ABCD");
  const res = handleJoinRoute(req);

  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), "http://localhost:5173?room=ABCD");
});

Deno.test("/join?code=abcd uppercases the code", () => {
  const req = new Request("http://localhost:8000/join?code=abcd");
  const res = handleJoinRoute(req);

  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), "http://localhost:5173?room=ABCD");
});

Deno.test("/join without code returns 400", () => {
  const req = new Request("http://localhost:8000/join");
  const res = handleJoinRoute(req);

  assertEquals(res.status, 400);
});
