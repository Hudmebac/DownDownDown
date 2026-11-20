# Down-Down-Down — Prototype Notes

## Project Overview
Hyper-casual infinite vertical scroller HTML5 Canvas game with a ninja character falling through hazards, collecting power-ups, and earning rewards.

## Architecture
- **Vanilla JS** (ES6 classes, no frameworks) — `js/` directory has 10 modules
- **Single-file per module**: audio.js, entities.js, game.js, main.js, minigames.js, player.js, profile.js, rewards.js, ui.js, world.js
- **Rendered on Canvas** via 2D context
- `index.html` loads all JS files in order, no bundler

## Key Files
| File | Purpose |
|------|---------|
| `js/game.js` | Main game loop, state machine (MENU/PLAYING/PAUSED/GAME_OVER/PRACTICE), collision detection, rendering orchestration |
| `js/world.js` | Procedural world generation: platforms, hazards, power-ups, chests, clouds, backgrounds. Scroll-based section generation. |
| `js/player.js` | Player class with physics (gravity, velocity), movement, dash, animations, character skins |
| `js/entities.js` | Entity classes: Hazard, Reward, PowerUp, Chest, Platform, Cloud, BackgroundElement |
| `js/ui.js` | All UI rendering: menus, HUD, pause screen, game over screen, minimap, reward tier popups |
| `js/rewards.js` | Reward/tier system: streak tracking, tier progression, reward unlocks |
| `js/profile.js` | LocalStorage-based profile persistence (coins, tier, streak, score, high score) |
| `js/audio.js` | AudioContext-based sound effects using oscillator synthesis (no audio files) |
| `js/main.js` | Entry point: instantiates Game, attaches event handlers, starts loop |
| `js/minigames.js` | Simple minigames (currently only coin flip) |

## Game States
- **MENU**: Title screen with play/practice/rewards buttons
- **NAME_ENTRY**: "What is your name?" screen (shown if no name saved), keyboard + OK button → CHARACTER_SELECT
- **CHARACTER_SELECT**: Character picker with 8 characters, click to select, click START or press Enter/Space/Up to begin
- **PLAYING**: Main gameplay loop
- **PAUSED**: Pause overlay (not fully implemented)
- **GAME_OVER**: Death screen with score, restart, back to menu
- **PRACTICE_MENU**: Practice lesson selection
- **PRACTICE**: Invincible practice mode with optional minigames
- **REWARD_TABLE**: Reward tier progression view

## Data Flow
- `main.js` creates `Game` instance → `Game` owns `world`, `player`, `ui`, `rewards`, `audio`, `profile`
- `game.update(dt)`: world.update → player.update → collision checks → ui update
- `game.render(ctx)`: world.render (background → clouds → platforms → hazards → powerups → chests) → player.render → particle effects → ui overlay
- Player uses `worldY` (world-space vertical coordinate); scrollY = camera's world-space Y position

## Collision System
- **Platforms**: player falls through until landing on top; uses `_checkPlatformCollision()` in game.js
- **Hazards (spikes/traps)**: full AABB overlap → `_loseLife()`, skips if player has `invulnerableTimer > 0` or `powerUp === 'shield'`
- **Enemies**: AABB overlap → `_loseLife()`, skips if `invulnerableTimer > 0`
- **Power-ups**: AABB collection → activates power-up on player
- **Chests**: AABB collection → `rewards.openChest()`
- **Falling off screen**: `worldY > scrollY + height + 300` → `_loseLife()`

## Life System
- `game.lives` starts at 1 (configurable via `LIVES` constant)
- All death paths go through `_loseLife()`: decrements lives, respawns player at `scrollY - 200` with 2-second invulnerability, resets streak. If lives reach 0 → `_gameOver()`.

## Difficulty / Reward System
- **No difficulty tiers shown to player** — removed in favor of reward tier progression
- `world.js` still uses distance-based difficulty internally (fall speed, obstacle density, chest chance scale with `this.totalDistance` and `this._areaThreshold`)
- `world.getRewardDifficulty(rewardTier)` maps levels 0-6 to named tiers (Beginner → Mythic)
- `rewards.js` tracks streaks: consecutive chests opened increases streak, hitting a hazard or enemy resets streak
- Reward tiers unlock at streak thresholds: streak >= (tier * 3 + 2)

## Coordinates & Scrolling
- World coordinate system: Y increases downward
- `scrollY` = top of visible area, advanced by world.update() based on player position
- Section-based generation: when player approaches the bottom of current section, new section is generated at +1800px intervals
- Visible entities filtered by proximity to scrollY
- Cleanup removes entities far above scrollY

## Known Fixes Applied
1. **chests not spawning**: `world.js` method `_generateChestInSection()` was defined but never called from `_generateSection()` — added `this._generateChestInSection(sectionY)`
2. **trap death no respawn**: `_gameOver()` was called directly from hazard/enemy collisions — replaced with `_loseLife()`; added `invulnerableTimer` on player (2s invulnerability + blinking after respawn)
3. **difficulty tier popup removed**: world.js `getDifficultyTier()` removed, `checkDifficultyTier()` removed; game.js no longer calls difficulty tier check
4. **reward tier popup added**: `rewards.js` `getTierName()` returns tier name; `ui.js` shows popup when tier changes
5. **ui2.js → ui.js**: Fixed obstacles list reference (was `this.obsList` → `this.obstacles`), renamed file to ui.js
6. **getRewardDifficulty**: Added to world.js to expose named reward tiers for UI
7. **Lives system**: Consolidated all death paths to use `_loseLife()` for consistent life/death flow
8. **Missing semicolons**: Trivial but fixed throughout
9. **OK button dead on name entry**: `profile.confirmName()` read `_nameBuffer` (always empty) while keyboard input went to `ui.nameBuffer` — fixed by passing buffer as parameter. Also hitbox mismatch: new 160x56 button at y=295 wasn't synced to `handleMenuClick` which had old 140x48 at y=290.
10. **Music overlapping on click**: `startMusic('menu')` was called on every click when `musicPlaying` was false (could flicker due to async autoplay rejection). Added `_startedOnce` flag to AudioManager — only starts music once, reset on async play() failure.
11. **Music stopped too early**: Removed `audio.stopMusic()` from Play/Practice button handlers — music now plays through NAME_ENTRY and CHARACTER_SELECT screens until `startGame()` starts gameplay music.
12. **Kid-friendly name entry screen**: Redesigned with gradient background, floating stars, rainbow arches, bouncing title, glowing input box, colorful OK button with hover sparkles, Comic Sans font.
13. **Music rotation system**: Refactored audio.js music system. Two track lists (menuTracks/gameTracks), separate `_menuIndex`/`_gameIndex` rotation pointers. `startMusic(type)` advances rotation, `_playCurrent()` handles playback with `el !== this.audioElement` identity check to prevent stale callbacks from creating overlapping tracks. `stopMusic()` delegates to `_stopPlayback()` which pauses+clears the audio element.
14. **OK button still broken**: Second `confirmName()` call at game.js:172 (OK button click handler) wasn't updated to pass `this.ui.nameBuffer` — only the Enter key handler was fixed. Both paths now pass the buffer.
15. **Music filenames updated**: `down.mp3`/`downstars.mp3` → `downdowndownmenu1.mp3`/`downdowndownmenu2.mp3`; `downinst.mp3`/`downbeetinst.mp3` → `downdowndowngame1.mp3`/`downdowndowngame2.mp3`.

## Testing / Running
- Open `index.html` in a browser (double-click or serve with start_server.bat)
- No test framework — manual testing in browser
- No build step — edit JS files and refresh browser

## Coding Conventions
- **2-space indentation**, no semicolons (project style is inconsistent; match surrounding code)
- **No comments** unless asked
- Class names: PascalCase; methods: camelCase
- `private` methods prefixed with `_`
- 30 FPS cap in requestAnimationFrame loop (`dt` multiplier applied)
