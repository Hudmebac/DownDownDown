# ⬇️ Down, Down, Down

> **An endless vertical-descent platformer.**
>
> Hold jump to open your wings, chain gems, dodge the storm, and see how deep you can get.
>
> Every **3,800 m** finishes a descent, and the next one starts faster.

🎮 **Vanilla JavaScript** • 🖼️ **HTML5 Canvas** • 📦 **No Dependencies** • ⚡ **No Build Tooling Required To Play**

---

## 🎮 Play

- **`DownDownDown.html`** — the entire game in one file. Double-click it. No server, no install.
- **`dist/index.html`** — the same build laid out for hosting, with the soundtrack beside it.
- **`index.html`** — the multi-file development version. Browsers block ES modules on `file://`, so serve it (`npm start`) or use `serve-web.bat`.

> 💾 Profiles, shards, unlocks and settings live in the browser's `localStorage`.

---

## 🎯 Controls

| Action | Keyboard | Touch |
| :--- | :--- | :--- |
| Move | `A` / `D` or `←` / `→` | left / right pads |
| Jump | `Space`, `W`, `↑` | jump pad |
| Glide | hold jump while falling | hold jump pad |
| Dash | `Shift` | dash pad |
| Pause | `Esc` / `P` | pause button |

> 🪽 Holding jump in the air opens your wings and slows the fall; dropping without gliding builds speed.
>
> 🎯 One air jump by default, two for characters that pay for it.

---

## 🌎 How a Run Works

### 🧩 World Generation

- **Designed chunks, not scatter.** The world streams in 720 px chunks, each built from one of a dozen hand-authored patterns: zigzag, shaft, crumble, saw alley, laser gauntlet, bounce, islands, gemfall, switchback, funnel, cascade, laser gate. A path-existence check adds a safety ladder if a chunk ever seals itself.
- **Patterns escalate with depth.** Higher tiers unlock harder patterns as `floor(depth / 110)` climbs, capped at tier 14.

### 🏔️ Biomes

- **Eight biomes** run from The Skywell at 0 m through Ashen Forge, Glass Reef, Frostfall, Hollow Garden, Last Light and The Quiet Below to World's Core at 3,700 m.

### ⛈️ The Storm

- **The storm is the clock.** It descends at one steady pace at every depth and always comes back for anyone who hovers: falling buys distance, standing still spends it. Hazards sharpen 10% per descent.

### 💎 Scoring

- **Combo and perfect landings.** Each gem extends the chain; the multiplier is `1 + floor(chain / 5)`, capped at 9.
- Landing with no jumps used and little horizontal speed pays a perfect-landing bonus.

### ⚡ Power-Ups

- Power-ups: shield, magnet, slow time and feather glide.
- Three hearts (four with an upgrade), a dash, and a shard payout itemised by depth, gems, score, perfect landings and biomes.

---

## 🚀 Progression

Shards earned in a run spend in the **Hangar**, which holds **38 characters** across six collections:

| Collection | Count | First Price | Step |
| :--- | :---: | :---: | :---: |
| Base roster | 6 | 0 | — |
| Heroes | 7 | 600 | +400 |
| Enemies | 7 | 600 | +550 |
| Reef | 6 | 600 | +700 |
| Void | 6 | 600 | +900 |
| Spooky | 6 | 600 | +1,100 |

> 🎭 Every themed collection starts at 600 shards and climbs per character, so the last Spooky costume costs 6,100.
>
> ✨ Five trails unlock alongside the roster.
>
> 👥 Up to eight local profiles can share a browser, each with its own unlocks, bests and settings.

---

## 📋 Mission Board

The board deals **three missions at a time** from a catalogue of **250**, generated from ten objective families:

- Run depth
- Gems in a run
- Lifetime gems
- Run score
- Combo
- Perfect landings in a run
- Dashes
- Power-ups
- Runs finished
- Lifetime perfect landings

Each family has its own goal ladder, from a **100 m warm-up** to **4,600 m**, so missions scale from quick to serious.

### Rewards & Rules

- ✅ Cleared missions pay out immediately.
- 🔄 A cleared card cannot come straight back: it sits in a 45-mission cooldown and is skipped until it ages out.
- 💾 The deck and cooldown are saved per profile, so the board survives a reload.
- 🎁 Every three lifetime clears unlocks a **bonus cache** worth `150 + 100 × caches already claimed` shards, claimed by hand on the board.

---

## 📁 Project Structure

```
DownDownDown.html        single-file build (generated)
index.html               development shell
css/style.css            page shell styling
js/main.js               boots the game loop
js/game/                 game.js, world.js, levelgen.js, entities.js, player.js,
                         config.js, progress.js, profiles.js, screens.js, hud.js, ui.js
js/core/                 input.js, audio.js, fx.js, utils.js
public/sound/            soundtrack and stingers
tools/                   build-single.mjs, smoke.mjs
dist/                    hosting build output (generated)
_legacy/original/        original prototype, kept for reference
ARCHITECTURE.md          deeper notes on the loop, states, chunks and save format
```

---

## 🛠️ Development

```bash
npm start                     # python -m http.server 8080 → http://localhost:8080/
npm run smoke                 # headless boot + ~60 s of scripted gameplay
node tools/build-single.mjs   # rebuild DownDownDown.html and dist/
```

> 🔨 `tools/build-single.mjs` inlines the HTML template, CSS and every ES module into `DownDownDown.html`. Run it after touching anything in `js/` or `css/`, or the single-file build will be stale.
>
> 🧪 `npm run smoke` stubs the DOM and canvas, boots a real `Game`, plays scripted input through jump, gem, hazard, purchase and results flows and renders every screen. It is the quickest way to catch a broken module or NaN physics.
>
> 🎛️ All tuning lives in `js/game/config.js`: `PHYS`, `SCORE`, `STORM`, `BIOMES`, `CHARACTERS`, `TRAILS`, `MISSION_POOL`, `ECONOMY`, `TOUCH`.

---

## ☁️ Deployment

**Netlify** — connect the repository and Netlify reads `netlify.toml`, runs `node tools/build-single.mjs` and publishes `dist/`. Or run the build locally and drag `dist` onto <https://app.netlify.com/drop>.

**GitHub Pages / any static host** — publish `dist/` (or the single `DownDownDown.html` renamed to `index.html`); it serves over HTTPS with no server-side code. Sound files must sit in `public/sound/` beside the page.

---

## 🌐 Browser Support

> ✅ Current Chrome, Edge, Firefox and Safari. Audio starts after the first interaction, as browsers require. Touch controls appear automatically on touch devices and can be toggled in Settings.
