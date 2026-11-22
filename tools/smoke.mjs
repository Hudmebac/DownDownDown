import assert from 'node:assert/strict';

const noop = () => {};
const gradient = { addColorStop: noop };
const ctxTarget = {
  canvas: null,
  globalAlpha: 1,
  lineWidth: 1,
  shadowBlur: 0,
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  fillStyle: '#000',
  strokeStyle: '#000',
  shadowColor: '#000',
  lineCap: 'butt',
  lineJoin: 'miter',
  imageSmoothingEnabled: true,
  measureText: (s) => ({ width: String(s).length * 8 }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  createPattern: () => ({}),
  getImageData: () => ({ data: [] }),
  setLineDash: noop,
  getLineDash: () => [],
};
const ctx = new Proxy(ctxTarget, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return noop;
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
});

const canvas = {
  width: 960,
  height: 600,
  style: {},
  getContext: () => ctx,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
  setPointerCapture: noop,
  releasePointerCapture: noop,
};
ctxTarget.canvas = canvas;

const store = new Map();
globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 800,
};
globalThis.document = { addEventListener: noop, removeEventListener: noop };
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../js/game/game.js');
const { BIOMES, CYCLE, VIEW } = await import('../js/game/config.js');
const { World } = await import('../js/game/world.js');
const { buildChunk, pathExists } = await import('../js/game/levelgen.js');

const game = new Game(canvas);
assert.equal(game.progress.settings.music, 0, 'music is off by default');
const log = [];
const note = (msg) => log.push(msg);

let checked = 0;
let rescued = 0;
for (let tier = 0; tier <= 14; tier++) {
  for (let seed = 1; seed <= 24; seed++) {
    const index = seed % 6;
    const chunk = buildChunk(seed, index, tier);
    const top = index * 720;
    assert.ok(pathExists(chunk.platforms, top, top + 720), `chunk tier ${tier} seed ${seed} is passable`);
    for (const h of chunk.hazards) {
      if (h.type === 'laser') {
        assert.ok(h.w <= VIEW.w - 420, `laser leaves a lane, got ${h.w}px`);
      }
    }
    const ladder = chunk.platforms.some((p) => Math.abs(p.y - (top + 80)) < 2 && Math.abs(p.x - (VIEW.w / 2 - 95)) < 2);
    if (ladder) rescued += 1;
    checked += 1;
  }
}
note(`${checked} generated chunks passable (${rescued} needed a safety ledge)`);

game.start();
game.startRun();
assert.equal(game.state, 'PLAYING', 'run starts');
assert.ok(game.world.platforms.length > 0, 'platforms generated');
assert.ok(game.world.hazards.length > 0, 'hazards generated');
assert.ok(game.world.pickups.length > 0, 'pickups generated');
const startHazards = game.world.hazards.length;
void startHazards;
note(`generated ${game.world.platforms.length} platforms / ${game.world.hazards.length} hazards / ${game.world.pickups.length} pickups`);

for (let i = 0; i < 120; i++) game.update(1 / 60);
game.render();
assert.ok(game.run.depth > 0, `depth should advance, got ${game.run.depth}`);
assert.ok(Number.isFinite(game.cam), 'camera finite');
note(`fell ${game.run.depth.toFixed(1)}m in 2s`);

game.player.onGround = true;
game.player.coyote = 0.1;
game.input.jumpPressed = true;
game.update(1 / 60);
assert.ok(game.player.vy < 0, `jump should go up, vy=${game.player.vy}`);
note('jump impulse ok');

const gem = game.world.pickups.find((p) => p.type === 'gem');
assert.ok(gem, 'gem exists');
game.player.x = gem.x - game.player.w / 2;
game.player.y = gem.y - game.player.h / 2;
const beforeGems = game.run.gems;
game.world.update(1 / 60, game.player, game.handlers);
assert.ok(game.run.gems > beforeGems, 'gem collection works');
note(`gem collection ok (chain ${game.run.combo}, x${game.run.mult})`);

const spike = { type: 'spike', x: 480, y: 400, w: 40, h: 17, dir: 'up' };
game.world.hazards.push(spike);
game.player.invuln = 0;
game.player.x = spike.x + spike.w / 2 - game.player.w / 2;
game.player.y = spike.y - 4;
const heartsBefore = game.run.hearts;
game.world.update(1 / 60, game.player, game.handlers);
assert.ok(game.run.hearts === heartsBefore - 1, 'spike removes a heart');
note('hazard damage ok');

game.player.invuln = 0;
const heartsBeforeStorm = game.run.hearts;
game.onHurt({ x: game.player.x + 10, w: 10 });
assert.equal(game.run.hearts, heartsBeforeStorm - 1, 'direct damage removes a heart');
game.run.hearts = 3;
game.player.invuln = 0;

assert.equal(BIOMES.length, 8, 'eight biomes exist');
assert.equal(BIOMES[7].at, 3700, 'core biome sits at 3700m');

const cycleWorld = new World();
cycleWorld.bestY = (CYCLE.depth + 20) * 32;
cycleWorld.update(1 / 60, game.player, game.handlers);
assert.equal(cycleWorld.cycle, 1, 'second descent starts after a full set');
assert.equal(cycleWorld.biome, 0, 'biomes restart with each descent');
const openedGrace = cycleWorld.stormSpeed;
cycleWorld.stormGrace = 0;
cycleWorld.update(1 / 60, game.player, game.handlers);
assert.ok(openedGrace < cycleWorld.stormSpeed * 0.5, 'a new descent stuns the storm');
assert.ok(cycleWorld.stormSpeed > 100, 'storm speeds up with the set');
assert.ok(cycleWorld.hazardScale > 1, 'hazards speed up with the set');
note(`cycle check: descent ${cycleWorld.cycle + 1}, storm opens at ${openedGrace.toFixed(0)}px/s, settles at ${cycleWorld.stormSpeed.toFixed(0)}px/s, hazards x${cycleWorld.hazardScale.toFixed(2)}`);

const biome = BIOMES[2];
assert.ok(biome, 'biome config exists');
game.world.depthM = 600;
game.palette = biome;
game.render();

game.run.depth = 321;
game.run.score = 4567;
game.run.gems = 88;
game.run.perfects = 4;
game.endRun();
assert.equal(game.state, 'GAMEOVER', 'run ends');
assert.ok(game.lastRun, 'run summary created');
assert.ok(game.progress.data.best >= 321, 'best depth saved');
assert.ok(store.has('ddd.profiles.v1'), 'profiles persisted');
assert.ok(game.lastRun.parts && game.lastRun.parts.length > 0, 'reward breakdown present');
note(`run summary: depth ${game.lastRun.depth | 0}m, ${game.lastRun.shards} shards`);

for (const state of ['MENU', 'HOWTO', 'HANGAR', 'PROFILES', 'SETTINGS', 'PAUSED', 'GAMEOVER', 'PLAYING']) {
  game.state = state;
  game.render();
}
note('all screens render without throwing');

game.progress.data.shards = 5000;
assert.ok(game.progress.buyChar('bolt'), 'character purchase works');
assert.equal(game.progress.data.char, 'bolt', 'purchased character auto-equips');
assert.ok(game.progress.buyTrail('comet'), 'trail purchase works');
note('shop unlock flow ok');

const firstProfile = game.profiles.active.id;
assert.ok(game.createProfile('Tester'), 'profile creation works');
assert.equal(game.profiles.list.length, 2, 'two profiles exist');
assert.equal(game.progress.data.shards, 0, 'new profile starts empty');
assert.ok(game.switchProfile(firstProfile), 'profile switch works');
assert.equal(game.profiles.active.id, firstProfile, 'switched back to first profile');
assert.ok(game.profiles.rename(firstProfile, 'Renamed'), 'profile rename works');
assert.equal(game.profiles.active.name, 'Renamed', 'rename applied');
const tester = game.profiles.list.find((p) => p.name === 'Tester');
assert.ok(tester, 'tester profile exists');
assert.ok(game.switchProfile(tester.id), 'switch to tester');
assert.ok(game.deleteProfile(), 'profile delete works');
assert.equal(game.profiles.list.length, 1, 'profile deleted');
note('profile create/switch/rename/delete ok');

game.startRun();
game.progress.data.char = 'bolt';
for (let i = 0; i < 3600; i++) {
  game.input.right = i % 240 < 120;
  game.input.left = !game.input.right;
  if (i % 45 === 0) game.input.jumpPressed = true;
  if (i % 130 === 0) game.input.dashPressed = true;
  game.update(1 / 60);
  if (i % 25 === 0) game.render();
  const p = game.player;
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `player position finite at frame ${i}`);
  game.run.hearts = 3;
  if (game.state !== 'PLAYING') break;
}
assert.ok(game.world.chunkIndex > 6, `chunks streamed, got ${game.world.chunkIndex}`);
assert.ok(game.run.depth > 40, `survived a real descent, got ${game.run.depth.toFixed(1)}m`);
note(`60s simulated descent reached ${game.run.depth.toFixed(1)}m across ${game.world.chunkIndex} chunks`);
assert.equal(game.state, 'PLAYING', 'still playing after simulation');

console.log('SMOKE OK');
for (const line of log) console.log(`  · ${line}`);
