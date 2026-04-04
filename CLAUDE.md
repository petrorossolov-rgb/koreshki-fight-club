# The Корешки Fight Club

Browser 2D fighting game (Phaser 3 + TypeScript + Vite) for a group of 17 friends.

## Constitution (Immutable Principles)

1. **Game Feel First** — every frame, every hitbox is tuned for fun. Technical perfection without fun is failure.
2. **Data-Driven Everything** — characters, moves, animations are JSON configs. Code knows nothing about "Vasya" or "Petro".
3. **Incremental Delivery** — every phase produces a playable build. Phase 1 must already be fun.
4. **Fixed Timestep Simulation** — all game logic runs at fixed 60 FPS, independent of render FPS.
5. **Keep Netcode Simple** — delay-based authoritative server, not rollback. Sufficient for 17 casual friends.
6. **Humor-Driven Design** — inside jokes, meme super moves, absurd descriptions matter more than technical polish.
7. **Mobile-First, Desktop-Compatible** — UI and controls designed for phone first, keyboard as fallback.
8. **Co-located Documentation** — all project documentation lives inside the repo (`docs/`), next to the code. Never store docs outside the project directory.

## Project Structure

```
docs/           — research, plans, design docs
src/            — game source code (TypeScript)
public/         — static assets (sprites, sounds, styles)
vite/           — Vite build configs
```

## Tech Stack

- **Engine:** Phaser 3.90 (TypeScript)
- **Bundler:** Vite 6
- **Hosting (client):** GitHub Pages
- **Hosting (server):** Deno Deploy
- **Sprites:** LuizMelo packs (CC0) with scale/palette/accessories customization
- **Touch controls:** nipplejs + custom buttons

## Phases

1. **Core + Online** — 1 fighter, basic combat, touch controls, WebSocket online
2. **Content** — data-driven 17 fighters, character select screen
3. **Polish** — combo system, UI, sounds, victory screen, lobby/invite links
4. **Expansion** — win stats, leaderboard, tournament mode
