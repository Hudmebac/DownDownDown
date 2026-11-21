import { CHUNK_H, VIEW } from './config.js';
import { TAU, clamp, makeRng, rand } from '../core/utils.js';

const LEFT = 54;
const RIGHT = VIEW.w - 54;

class Builder {
  constructor(seed, index, tier) {
    this.rng = makeRng(seed + index * 7919);
    this.index = index;
    this.tier = tier;
    this.cy = index * CHUNK_H;
    this.platforms = [];
    this.hazards = [];
    this.pickups = [];
    this.decor = [];
  }

  plat(x, y, w, type = 'solid', opts = {}) {
    const rng = this.rng;
    this.platforms.push({
      x: clamp(x, LEFT - 20, RIGHT - w + 20),
      y,
      w: clamp(w, 70, VIEW.w - 100),
      h: 14,
      type,
      broken: false,
      timer: 0,
      shake: 0,
      squash: 0,
      vx: opts.vx || 0,
      originX: x,
      range: opts.range || 0,
      speed: opts.speed || 1,
      phase: opts.phase ?? rng.range(0, TAU),
    });
  }

  spike(x, y, w, dir = 'up') {
    const h = 17;
    this.hazards.push({ type: 'spike', x, y: dir === 'up' ? y - h : y, w, h, dir });
  }

  saw(x, y, r = 20, opts = {}) {
    this.hazards.push({
      type: 'saw',
      x,
      y,
      r,
      baseX: x,
      baseY: y,
      amp: opts.amp || 0,
      axis: opts.axis || 'x',
      speed: opts.speed || 1.3,
      phase: opts.phase ?? this.rng.range(0, TAU),
      angle: 0,
    });
  }

  laser(x, y, w, opts = {}) {
    this.hazards.push({
      type: 'laser',
      x,
      y,
      w,
      h: 12,
      period: opts.period || 3.4,
      onTime: opts.onTime || 1.1,
      warnTime: opts.warnTime || 0.6,
      phase: opts.phase || 0,
      state: 'off',
      timer: 0,
      active: false,
    });
  }

  // A wall-mounted beam. Always short enough to leave a wide walk-through lane.
  beam(y, opts = {}) {
    const w = clamp(opts.w || this.rng.range(160, 220), 130, VIEW.w - 420);
    const fromLeft = opts.side === undefined ? this.rng.chance(0.5) : opts.side === 'left';
    const x = fromLeft ? LEFT - 12 : RIGHT + 12 - w;
    this.laser(x, y, w, opts);
    return { x, w, fromLeft, openX: fromLeft ? VIEW.w - 130 : 130 };
  }

  crusher(x, y, w, h, opts = {}) {
    this.hazards.push({
      type: 'crusher',
      x,
      y,
      w,
      h,
      baseY: y,
      range: opts.range || 150,
      period: opts.period || 3,
      phase: opts.phase || 0,
      offset: 0,
      warn: 0,
    });
  }

  gloom(x, y) {
    this.hazards.push({ type: 'gloom', x, y, w: 30, h: 30, vx: 0, vy: 0, t: rand(0, 6), homeX: x, homeY: y });
  }

  gem(x, y) {
    this.pickups.push({ type: 'gem', x, y, baseY: y, r: 11, taken: false, t: this.rng.range(0, TAU) });
  }

  gemLine(x1, y1, x2, y2, n = 3) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      this.gem(clamp(x1 + (x2 - x1) * t, LEFT, RIGHT), y1 + (y2 - y1) * t);
    }
  }

  gemArc(cx, cy, n, spread, height) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = cx + (t - 0.5) * spread;
      const y = cy - Math.sin(t * Math.PI) * height;
      this.gem(clamp(x, LEFT, RIGHT), y);
    }
  }

  heart(x, y) {
    this.pickups.push({ type: 'heart', x, y, baseY: y, r: 14, taken: false, t: this.rng.range(0, TAU) });
  }

  power(x, y, kind) {
    this.pickups.push({ type: 'power', kind, x, y, baseY: y, r: 16, taken: false, t: this.rng.range(0, TAU) });
  }

  deco(kind, x, y, size = 1) {
    this.decor.push({ kind, x, y, size, seed: this.rng.range(0, 100) });
  }
}

function pickPower(b) {
  const kinds = ['shield', 'magnet', 'slow', 'glide'];
  return b.rng.pick(kinds);
}

function pZigzag(b) {
  const rows = 4 + Math.min(3, Math.floor(b.tier / 2));
  const step = (CHUNK_H - 150) / rows;
  let side = b.rng.sign();
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 90 + i * step;
    const w = b.rng.range(200, 265) - Math.min(50, b.tier * 5);
    const x = side > 0 ? b.rng.range(LEFT, LEFT + 90) : b.rng.range(RIGHT - w - 90, RIGHT - w);
    const type = b.tier > 2 && b.rng.chance(0.14) ? 'crumble' : 'solid';
    const moving = b.tier > 3 && b.rng.chance(0.18);
    b.plat(x, y, w, type, moving ? { range: b.rng.range(18, 46), speed: b.rng.range(0.7, 1.4) } : {});
    if (b.tier > 0 && b.rng.chance(0.3)) b.spike(x + w / 2 - 13, y, 26);
    const laneX = side > 0 ? Math.max(x + w + 60, VIEW.w / 2) : Math.min(x - 60, VIEW.w / 2);
    b.gem(clamp(laneX, LEFT, RIGHT), y + 52);
    b.gem(clamp(laneX, LEFT, RIGHT), y + 96);
    side *= -1;
  }
  b.gemLine(VIEW.w / 2, b.cy + 40, VIEW.w / 2, b.cy + 80, 2);
}

function pShaft(b) {
  const rows = 5;
  const step = (CHUNK_H - 130) / rows;
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 80 + i * step;
    const w = b.rng.range(120, 175);
    const left = i % 2 === 0;
    const x = left ? b.rng.range(LEFT, LEFT + 50) : b.rng.range(RIGHT - w - 50, RIGHT - w);
    b.plat(x, y, w, 'solid');
    b.gem(VIEW.w / 2 + b.rng.range(-40, 40), y + step * 0.5);
    if (b.tier > 0 && i % 2 === 1) {
      b.saw(VIEW.w / 2, y + step * 0.5, 19, { amp: b.rng.range(70, 130), speed: b.rng.range(0.8, 1.5) });
    }
  }
  b.gemLine(VIEW.w / 2, b.cy + 30, VIEW.w / 2, b.cy + 140, 3);
  if (b.tier > 0) b.spike(b.rng.chance(0.5) ? LEFT + 30 : RIGHT - 90, b.cy + CHUNK_H - 110, 60);
}

function pCrumble(b) {
  const rows = 5;
  const step = (CHUNK_H - 140) / rows;
  let side = b.rng.sign();
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 90 + i * step;
    const w = 150 - b.tier * 5;
    const x = side > 0 ? LEFT + b.rng.range(10, 70) : RIGHT - w - b.rng.range(10, 70);
    b.plat(x, y, Math.max(100, w), 'crumble');
    b.gem(x + w / 2, y - 46);
    side *= -1;
  }
  b.heart(VIEW.w / 2, b.cy + CHUNK_H - 130);
  b.gemLine(VIEW.w / 2, b.cy + 40, LEFT + 90, b.cy + 120, 3);
}

function pSawAlley(b) {
  const rows = 3;
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 140 + i * 195;
    const leftW = b.rng.range(210, 290);
    b.plat(LEFT - 10, y, leftW, 'solid');
    b.plat(RIGHT - leftW + 10, y, leftW, 'solid');
    b.saw(VIEW.w / 2, y - 40, 22, { axis: 'x', amp: b.rng.range(90, 150), speed: b.rng.range(0.9, 1.6) });
    b.gem(VIEW.w / 2, y + 34);
    b.gem(VIEW.w / 2 - 40, y + 34);
    b.gem(VIEW.w / 2 + 40, y + 34);
    if (b.tier > 2) b.spike(LEFT + leftW - 60, y, 34);
  }
  b.gemLine(VIEW.w / 2, b.cy + 40, VIEW.w / 2, b.cy + 120, 2);
}

function pGauntlet(b) {
  const rows = 4;
  const step = (CHUNK_H - 150) / rows;
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 100 + i * step;
    const w = b.rng.range(150, 210);
    const left = i % 2 === 0;
    b.plat(left ? LEFT : RIGHT - w, y, w, 'solid');
    if (i < rows - 1) {
      const gateY = y + step * 0.55;
      const gate = b.beam(gateY, {
        side: left ? 'left' : 'right',
        w: b.rng.range(170, 230),
        period: 3.6 - Math.min(1.1, b.tier * 0.1),
      });
      b.gem(gate.openX, gateY);
      b.gem(VIEW.w / 2, gateY - 26);
    }
  }
  b.gemLine(VIEW.w / 2, b.cy + 30, VIEW.w / 2, b.cy + 90, 2);
}

function pBounce(b) {
  const base = b.cy + CHUNK_H - 190;
  b.plat(VIEW.w / 2 - 90, base, 180, 'bounce');
  b.gemArc(VIEW.w / 2, base - 200, 5, 260, 70);
  b.plat(LEFT + 20, b.cy + 130, 190, 'solid');
  b.plat(RIGHT - 210, b.cy + 300, 190, 'solid');
  b.gemLine(LEFT + 110, b.cy + 90, VIEW.w / 2 - 90, base - 40, 3);
  if (b.tier > 1) b.saw(VIEW.w / 2 + 150, b.cy + 420, 20, { axis: 'y', amp: 90, speed: 1.1 });
  b.gem(VIEW.w / 2, base - 60);
}

function pIslands(b) {
  const rng = b.rng;
  const count = 6 + Math.min(3, b.tier);
  const gap = (CHUNK_H - 160) / count;
  for (let i = 0; i < count; i++) {
    const y = b.cy + 90 + i * gap;
    const w = rng.range(105, 165);
    const x = rng.range(LEFT, RIGHT - w);
    b.plat(x, y, w, rng.chance(0.18) ? 'crumble' : 'solid');
    b.gem(x + w / 2, y - 52);
    if (i % 2 === 1 && b.tier > 0) {
      const hx = x + w / 2 + rng.sign() * rng.range(80, 150);
      b.spike(clamp(hx - 15, LEFT, RIGHT - 30), y + 40, 30);
    }
  }
  if (b.tier > 2) b.gloom(rng.range(LEFT + 60, RIGHT - 60), b.cy + 360);
  b.gemLine(VIEW.w / 2, b.cy + 30, VIEW.w / 2, b.cy + 100, 2);
}

function pGemfall(b) {
  const rng = b.rng;
  b.plat(VIEW.w / 2 - 110, b.cy + CHUNK_H - 150, 220, 'solid');
  b.plat(LEFT, b.cy + 120, 150, 'solid');
  b.plat(RIGHT - 150, b.cy + 300, 150, 'solid');
  for (let i = 0; i < 4; i++) {
    b.gemArc(VIEW.w / 2 + rng.range(-140, 140), b.cy + 150 + i * 120, 5, 200, 60);
  }
  if (b.tier > 1) b.saw(VIEW.w / 2, b.cy + 400, 24, { axis: 'x', amp: 200, speed: 0.55 });
  if (b.tier > 3) b.gloom(VIEW.w / 2, b.cy + 240);
  if (b.tier > 2) b.spike(VIEW.w / 2 - 20, b.cy + CHUNK_H - 150, 40);
}

function pSwitchback(b) {
  const rows = 5;
  const step = (CHUNK_H - 160) / rows;
  let side = b.rng.sign();
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 105 + i * step;
    const w = b.rng.range(190, 250);
    const x = side > 0 ? LEFT + b.rng.range(6, 46) : RIGHT - w - b.rng.range(6, 46);
    const type = i === 2 && b.tier > 4 ? 'crumble' : 'solid';
    b.plat(x, y, w, type, i % 2 === 0 && b.tier > 5 ? { range: b.rng.range(20, 40), speed: 0.9 } : {});
    b.gem(x + w * 0.5, y - 48);
    b.gem(x + w * 0.5 + side * 40, y - 86);
    if (b.tier > 2 && b.rng.chance(0.35)) b.spike(x + w * 0.5 - 12, y, 24);
    side *= -1;
  }
  b.gemArc(VIEW.w / 2, b.cy + CHUNK_H - 180, 4, 220, 40);
}

function pFunnel(b) {
  const rows = 6;
  const step = (CHUNK_H - 140) / rows;
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 90 + i * step;
    const w = b.rng.range(120, 175);
    const left = i % 2 === 0;
    b.plat(left ? LEFT : RIGHT - w, y, w, 'solid');
    const innerX = left ? LEFT + w + 40 : RIGHT - w - 40;
    b.gem(clamp(innerX, LEFT, RIGHT), y - 30);
    if (i % 3 === 2 && b.tier > 3) {
      b.saw(VIEW.w / 2 + b.rng.range(-50, 50), y + step * 0.42, 18, { axis: 'x', amp: 80, speed: 1.2 });
    }
  }
  b.gemLine(VIEW.w / 2, b.cy + 36, VIEW.w / 2, b.cy + 96, 2);
}

function pCascade(b) {
  const cols = 7;
  const step = (CHUNK_H - 170) / cols;
  for (let i = 0; i < cols; i++) {
    const y = b.cy + 95 + i * step;
    const t = i / (cols - 1);
    const x = LEFT + 70 + (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * (RIGHT - LEFT - 220);
    const w = b.rng.range(120, 165);
    const px = clamp(x, LEFT, RIGHT - w);
    b.plat(px, y, w, 'solid');
    b.gem(px + w / 2, y - 44);
  }
  b.gemArc(VIEW.w / 2, b.cy + CHUNK_H - 230, 4, 240, 50);
  if (b.tier > 4) b.saw(VIEW.w / 2, b.cy + CHUNK_H - 320, 20, { amp: 120, speed: 0.9 });
}

function pLaserGate(b) {
  const rows = 4;
  const step = (CHUNK_H - 170) / rows;
  for (let i = 0; i < rows; i++) {
    const y = b.cy + 105 + i * step;
    const w = b.rng.range(160, 210);
    const left = i % 2 === 0;
    b.plat(left ? LEFT : RIGHT - w, y, w, 'solid', b.tier > 5 && i % 2 ? { range: 28, speed: 0.8 } : {});
    const gateY = y + step * 0.5;
    const fromLeft = i % 2 === 1;
    const gate = b.beam(gateY, {
      side: fromLeft ? 'left' : 'right',
      w: b.rng.range(160, 210),
      phase: b.rng.range(0, 2),
      period: 3.2,
    });
    b.gem(gate.openX, gateY + 20);
    b.gem(VIEW.w / 2, gateY - 34);
  }
  b.gemLine(VIEW.w / 2, b.cy + 30, VIEW.w / 2, b.cy + 80, 2);
}

// Ledges pinned to the screen edges, so the sides are not an empty lane to
// float down. Higher tiers stud some of them with spikes toward the middle.
function sideShelves(b) {
  if (!b.rng.chance(0.75)) return;
  const rows = 3 + (b.tier > 4 ? 1 : 0);
  const step = CHUNK_H / (rows + 1);
  let side = b.rng.sign();
  for (let i = 0; i < rows; i++) {
    const y = b.cy + step * (i + 1) + b.rng.range(-22, 22);
    const w = b.rng.range(128, 178);
    const x = side > 0 ? LEFT : RIGHT - w;
    const crowded = b.platforms.some((p) => Math.abs(p.y - y) < 30 && p.x < x + w && p.x + p.w > x);
    if (!crowded) {
      b.plat(x, y, w, 'solid');
      if (b.tier > 2 && b.rng.chance(0.35)) b.spike(side > 0 ? x + w - 46 : x + 16, y, 30);
    }
    side *= -1;
  }
}

const PATTERNS = [
  { fn: pZigzag, weight: () => 3, min: 0 },
  { fn: pShaft, weight: () => 2.4, min: 0 },
  { fn: pCrumble, weight: (t) => (t > 1 ? 1.6 : 0.5), min: 0 },
  { fn: pSawAlley, weight: (t) => (t > 1 ? 2 : 0.8), min: 1 },
  { fn: pGauntlet, weight: (t) => (t > 2 ? 2 : 0.4), min: 1 },
  { fn: pBounce, weight: () => 0.9, min: 0 },
  { fn: pIslands, weight: () => 2, min: 0 },
  { fn: pGemfall, weight: (t) => (t > 2 ? 1.6 : 0.7), min: 0 },
  { fn: pSwitchback, weight: () => 1.7, min: 2 },
  { fn: pFunnel, weight: () => 1.5, min: 3 },
  { fn: pCascade, weight: () => 1.4, min: 4 },
  { fn: pLaserGate, weight: () => 1.4, min: 5 },
];

export function pathExists(platforms, startY, endY) {
  const nodes = platforms.filter((p) => !p.broken && p.y >= startY - 40 && p.y <= endY + 40);
  if (nodes.length < 2) return false;
  const start = nodes.filter((p) => p.y <= startY + 200);
  if (!start.length) return false;
  const seen = new Set(start);
  let frontier = start;
  const goalY = endY - 110;
  while (frontier.length) {
    const next = [];
    for (const a of frontier) {
      if (a.y >= goalY) return true;
      for (const b of nodes) {
        if (seen.has(b)) continue;
        const dy = b.y - a.y;
        if (dy < -70 || dy > 300) continue;
        const gap = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
        const reach = 340 + Math.max(0, dy) * 0.55;
        if (gap > reach) continue;
        seen.add(b);
        next.push(b);
      }
    }
    frontier = next;
  }
  return false;
}

function clearHazardsNear(b, x, y, w) {
  b.hazards = b.hazards.filter((h) => {
    const hw = h.w || (h.r ? h.r * 2 : 30);
    const hx = h.x - (h.r || 0);
    const xOverlap = hx < x + w + 24 && hx + hw > x - 24;
    const yOverlap = h.y > y - 90 && h.y < y + 36;
    return !(xOverlap && yOverlap);
  });
}

// Guarantees a physical route down the chunk. Most chunks pass untouched;
// a centre ladder is only added when the generated layout has a real gap.
function ensurePath(b) {
  if (pathExists(b.platforms, b.cy, b.cy + CHUNK_H)) return false;
  const spots = [80, 260, 440, 600];
  const w = 190;
  const x = VIEW.w / 2 - w / 2;
  for (const off of spots) {
    const y = b.cy + off;
    const overlaps = b.platforms.some(
      (p) => Math.abs(p.y - y) < 26 && p.x < x + w && p.x + p.w > x
    );
    if (!overlaps) {
      b.plat(x, y, w, 'solid');
      clearHazardsNear(b, x, y, w);
    }
  }
  return true;
}

export function buildChunk(seed, index, tier) {
  const b = new Builder(seed, index, tier);
  const pool = PATTERNS.filter((p) => tier >= p.min);
  let total = 0;
  for (const p of pool) total += p.weight(tier);
  let roll = b.rng.next() * total;
  let chosen = pool[0].fn;
  for (const p of pool) {
    roll -= p.weight(tier);
    if (roll <= 0) {
      chosen = p.fn;
      break;
    }
  }
  chosen(b);

  if (index >= 2 && b.hazards.length === 0) {
    b.saw(VIEW.w / 2, b.cy + b.rng.range(250, CHUNK_H - 250), 20, { amp: 110, speed: 1.1 });
  }

  const catchY = b.cy + CHUNK_H - 96;
  const hasCatch = b.platforms.some((p) => p.y > catchY - 40 && p.y < b.cy + CHUNK_H - 20);
  if (!hasCatch) {
    const w = b.rng.range(170, 240);
    b.plat(b.rng.range(LEFT + 60, RIGHT - 60 - w), catchY, w, 'solid');
  }

  ensurePath(b);
  sideShelves(b);

  if (b.rng.chance(0.16)) b.power(b.rng.range(LEFT + 60, RIGHT - 60), b.cy + b.rng.range(120, CHUNK_H - 160), pickPower(b));
  if (b.rng.chance(0.1)) b.heart(b.rng.range(LEFT + 60, RIGHT - 60), b.cy + b.rng.range(140, CHUNK_H - 180));

  for (let i = 0; i < 3; i++) {
    const side = b.rng.chance(0.5) ? 'left' : 'right';
    const kind = b.rng.pick(['crystal', 'vine', 'pipe', 'shard', 'mushroom']);
    b.deco(kind, side === 'left' ? b.rng.range(6, 48) : b.rng.range(VIEW.w - 48, VIEW.w - 6), b.cy + b.rng.range(0, CHUNK_H), b.rng.range(0.7, 1.5));
  }

  return {
    platforms: b.platforms,
    hazards: b.hazards,
    pickups: b.pickups,
    decor: b.decor,
    tier,
  };
}

export function tierForDepth(depthM) {
  return clamp(Math.floor(depthM / 110), 0, 14);
}
