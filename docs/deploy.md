# Deploy Guide

## Client — GitHub Pages

The client is a static Vite build deployed to GitHub Pages via GitHub Actions.

### Setup

1. Push the repo to GitHub
2. Go to **Settings > Pages > Source** and select **GitHub Actions**
3. Go to **Settings > Variables and secrets > Actions > Variables** and add:
   - `VITE_WS_URL` — production WebSocket URL (e.g. `wss://koreshki-server.deno.dev/ws`)
4. Push to `main` — the workflow builds and deploys automatically

### Manual build

```bash
VITE_WS_URL=wss://your-server.deno.dev/ws npm run build
```

Output is in `dist/`.

---

## Server — Deno Deploy

The server is a Deno WebSocket server deployed to [Deno Deploy](https://dash.deno.com).

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | HTTP server port (Deno Deploy sets this automatically) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (set to your Pages URL in production) |

### Deploy via `deployctl`

1. Install: `deno install -Arf jsr:@deno/deployctl`
2. Link project: `deployctl deploy --project=koreshki-server --entrypoint=server/main.ts`
3. Set env vars in Deno Deploy dashboard: **Settings > Environment Variables**
   - `CORS_ORIGIN` = `https://<username>.github.io`

### Deploy via GitHub integration

1. Create a project on [dash.deno.com](https://dash.deno.com)
2. Link the GitHub repo
3. Set entrypoint: `server/main.ts`
4. Set env vars in project settings

### Local development

```bash
# Terminal 1: game server
deno run --allow-net --allow-read --allow-env --config server/deno.json server/main.ts

# Terminal 2: client dev server
npm run dev
```

Default client connects to `ws://localhost:8000/ws`.

---

## Production checklist

- [ ] `VITE_WS_URL` points to production server (`wss://...`)
- [ ] `CORS_ORIGIN` set to Pages URL (not `*`)
- [ ] Server `/health` endpoint responds with 200
- [ ] WebSocket connects from deployed client
