# Down, Down, Down — Agent Context

Project root: `F:\HeliosDownDownDown`.

Endless vertical-descent platformer. Vanilla ES modules, HTML5 canvas, no build step, no dependencies.

The original prototype lives in `_legacy/original/` for reference. Nothing in the runtime imports from it.

## Run

The game ships as one self-contained file: **`DownDownDown.html`** (built by
`node tools/build-single.mjs`). Double-click it, or run `start_server.bat`, which opens it in
Chrome/Edge by full path. No server is required.

The multi-file ES-module version is for development and cannot load from `file://`:

- `serve-web.bat` — serves this folder on port 8080 (open `http://localhost:8080/`)
- `npm start` — same thing
- `npm run smoke` — headless gameplay test
- After editing `js/` or `css/`, rebuild the single file with `node tools/build-single.mjs`

## Verify

```bash
npm run smoke        # node tools/smoke.mjs
```

The smoke test stubs the DOM/canvas, boots a real `Game`, plays ~60 seconds of scripted input, exercises jump/gem/hazard/purchase/results flows and renders every screen. It is the fastest way to catch broken modules or NaN physics.

## Architecture

| File | Purpose |
|------|---------|
| `index.html` | Canvas shell; only `js/main.js` is loaded |
| `js/main.js` | Instantiates `Game`, starts the loop |
| `js/game/game.js` | State machine, fixed-step loop, camera, storm, scoring, rendering order |
| `js/game/world.js` | Chunk streaming, cleanup, storm front, biome palette, collision queries |
| `js/game/levelgen.js` | Seeded chunk builder + 8 hand-designed descent patterns |
| `js/game/entities.js` | Platform/hazard/pickup update + rendering, `hazardRect()` |
| `js/game/player.js` | Physics (coyote time, jump buffer, double jump, dash, glide), powerups, procedural character |
| `js/game/config.js` | All tuning: `PHYS`, `SCORE`, `STORM`, `BIOMES`, `CHARACTERS`, `TRAILS`, `MISSION_POOL`, `TOUCH` |
| `js/game/progress.js` | Per-profile unlocks, missions, run rewards and shard breakdown |
| `js/game/profiles.js` | Local accounts: create, rename, switch, delete, legacy-save migration |
| `js/game/screens.js` | Menu, how-to, hangar, settings, pause, results |
| `js/game/hud.js` | Hearts, depth, combo, powerup timers, storm warning, touch pads |
| `js/game/ui.js` | Immediate-mode buttons, panels, sliders, character preview |
| `js/core/input.js` | Keyboard + pointer + multi-touch, logical-coordinate mapping |
| `js/core/audio.js` | WebAudio SFX synth; mp3 music rotation from `public/sound/` |
| `js/core/fx.js` | Particles, floating text, rings, shake, flash, vignette |
| `js/core/utils.js` | Math, seeded RNG, colour mixing, rounded rects, stars |

## Loop and states

`MENU → PLAYING → PAUSED / GAMEOVER`, plus `HOWTO`, `HANGAR`, `PROFILES`, `SETTINGS`.

Fixed 1/60 updates with an accumulator (max 4 steps per frame), rendering once per frame, `input.endFrame()` last.

The game is built around **designed chunks**, not random scatter: each chunk is 720px tall, picks one pattern (zigzag, shaft, crumble, saw alley, laser gauntlet, bounce, islands, gemfall, switchback, funnel, cascade, laser gate), and is seeded so a run can be reproduced from `world.seed` + chunk index.

Patterns unlock as `tierForDepth` rises (`floor(depth/110)`, capped at 14). `buildChunk` finishes with `ensurePath`: if `pathExists` finds no traversable route down the chunk, it adds a centre safety ladder and clears hazards around it. Lasers (`Builder.beam`) are wall-mounted and capped at `VIEW.w - 420`, so they always leave an open lane — never a full-width wall.

## Core mechanics

- Gravity-driven fall; `coyote` + jump buffer + one air jump (two for some characters); Shift dash.
- Holding jump while falling engages wings: descent drops to `PHYS.wingFall` (Wisp/Feather to `glideFall`).
  Falling without wings builds `fallTime`, which raises the terminal speed by up to `PHYS.fallBoost`.
- Storm front descends continuously (`STORM`) and damages campers — it is the pacing clock.
- Combo: each gem adds chain; multiplier `1 + floor(chain/5)` capped at 9, 2.6s window.
- Perfect landing: land with no jumps used and low horizontal speed for bonus score.
- Powerups: shield, magnet, slow time (0.42x hazard speed), feather/glide.
- Depth in metres = world px / 32. Biome thresholds live in `BIOMES[].at`; eight biomes run from The Skywell to World's Core at 3700m.
- **Descents:** every `CYCLE.depth` (3800m) a full pass finishes and the next descent starts. Biomes and pattern tiers reset, chunk seeds are offset by cycle, the storm gains 12% per descent (capped at 430px/s) and hazards 10% (capped at 1.8x). Total depth keeps counting, so the run never completes — it just gets faster.
- 3 hearts, max 4; run ends at 0. Score → shards → shop/missions.
- Shard payout is itemised: depth, gems, score, perfect landings, biomes (`ECONOMY`).

## Save data

`localStorage['ddd.profiles.v1']` — `{ active, list }`. Each entry is `{ id, name, created, data }`, where `data` holds best, bestScore, shards, runs, gems, unlocks, trails, equipped char/trail, settings and missions. Up to 8 profiles live in the same browser.

The old single-save key `ddd.save.v2` is read once on first launch and migrated into `Player 1`. Bump the profiles key when the schema changes incompatibly.

## Conventions

- 2-space indent, semicolons, single quotes.
- ES module `import`/`export`; no bundler, no dependencies.
- World Y increases downward; camera `cam` is the world Y at the top of the screen.
- Screen coordinates = world coordinates minus `cam` (except UI which is screen space).
- Hazard hitboxes go through `hazardRect()`; the player's hitbox is inset by `PHYS.hitInset`.
- Buttons are immediate mode: draw + hit-test in the same call, return `true` on click.
- Prefer tuning in `config.js` over scattering magic numbers.
