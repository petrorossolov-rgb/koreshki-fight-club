# Deploy Guide

## Client — GitHub Pages

The client is a static Vite build deployed to GitHub Pages via GitHub Actions.

### Setup

1. Push the repo to GitHub
2. Go to **Settings > Pages > Source** and select **GitHub Actions**
3. Go to **Settings > Variables and secrets > Actions > Variables** and add:
   - `VITE_WS_URL` — production WebSocket URL: `wss://koreshki-fight-club.duckdns.org/ws`
4. Push to `main` — the workflow builds and deploys automatically

### Manual build

```bash
VITE_WS_URL=wss://koreshki-fight-club.duckdns.org/ws npm run build
```

Output is in `dist/`.

---

## Server — VPS (Deno + nginx + systemd)

The server runs on a VPS at `koreshki-fight-club.duckdns.org`. Nginx handles SSL termination and reverse proxies to the Deno process on port 8000.

### Infrastructure

- **VPS:** Ubuntu 24.04, 1 CPU, 512MB RAM
- **Domain:** koreshki-fight-club.duckdns.org (free DuckDNS subdomain)
- **SSL:** Let's Encrypt via certbot (auto-renew)
- **Process manager:** systemd (`koreshki-server.service`)
- **Reverse proxy:** nginx (HTTPS/WSS → localhost:8000)

### Environment variables

Set in `/etc/systemd/system/koreshki-server.service`:

| Variable | Value | Description |
|---|---|---|
| `PORT` | `8000` | HTTP server port |
| `CORS_ORIGIN` | `https://petrorossolov-rgb.github.io` | Allowed CORS origin |
| `CLIENT_URL` | `https://petrorossolov-rgb.github.io/koreshki-fight-club` | Client URL for invite redirects |

### Auto-deploy

Push to `main` (files in `server/`) triggers `.github/workflows/deploy-server.yml`:
1. SSH into VPS as `koreshki`
2. `git pull origin main`
3. `sudo systemctl restart koreshki-server`
4. Health check: `curl http://localhost:8000/health`

Requires GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

### Manual deploy

```bash
ssh koreshki@194.67.66.221
cd /opt/koreshki-fight-club
git pull
sudo systemctl restart koreshki-server
```

### First-time setup

```bash
ssh root@VPS_IP 'bash -s' < server/deploy.sh
```

See also: `server/nginx.conf.example`, `server/koreshki-server.service`.

### Character config loading

The server loads all 17 character configs at startup from `public/data/characters/manifest.json` via `server/charConfigs.ts`. Each player's character selection is validated against loaded configs.

- Manifest: `public/data/characters/manifest.json`
- Config module: `server/charConfigs.ts` — exports `getCharConfig(id)`, `getDefaultConfig()`, `getAllCharIds()`
- If manifest fails to load, the server exits with code 1

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

- [x] `VITE_WS_URL` points to production server (`wss://koreshki-fight-club.duckdns.org/ws`)
- [x] `CORS_ORIGIN` set to Pages URL (not `*`)
- [x] `CLIENT_URL` set to Pages URL (for `/join/:code` invite redirects)
- [ ] Server `/health` endpoint responds with 200
- [ ] WebSocket connects from deployed client
- [ ] Invite link redirect works: `https://server/join/ABCD` → client with `?room=ABCD`
