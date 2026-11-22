import { BIOMES, CHUNK_H, CYCLE, EDGE, PHYS, PX_PER_METER, STORM, VIEW, biomeIndexAt } from './config.js';
import { buildChunk, tierForDepth } from './levelgen.js';
import { updatePlatform, updateHazard, hazardRect, updatePickup } from './entities.js';
import { aabb, clamp } from '../core/utils.js';

export class World {
  constructor() {
    this.seed = 1;
    this.reset(1);
  }

  reset(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.platforms = [];
    this.hazards = [];
    this.pickups = [];
    this.decor = [];
    this.time = 0;
    this.chunkIndex = 0;
    this.generatedTo = 0;
    this.depthM = 0;
    this.bestY = 0;
    this.stormY = -STORM.startAhead;
    this.stormSpeed = STORM.baseSpeed;
    this.stormGrace = 0;
    this.biome = 0;
    this.palette = BIOMES[0];
    this.biomeChanged = false;
    this.cycle = 0;
    this.cycleChanged = false;
    this.localDepth = 0;
    this.hazardScale = 1;
    this.maxFall = PHYS.maxFall;
    this._nearCooldown = new Map();
    this.edgeWalls = 0;
    this._edgeCool = 0;
    this._hugSide = 0;
    this._hugTime = 0;
    this.ensureGenerated(VIEW.h * 4);
  }

  clearSpawn(cx, y) {
    const left = cx - 110;
    const right = cx + 110;
    this.platforms = this.platforms.filter(
      (p) => !(p.y > y + 4 && p.y < y + 360 && p.x < right && p.x + p.w > left)
    );
    this.hazards = this.hazards.filter(
      (h) => !(h.y > y - 90 && h.y < y + 380 && h.x < right + 40 && h.x + (h.w || 40) > left - 40)
    );
  }

  ensureGenerated(untilY) {
    let guard = 0;
    while (this.generatedTo < untilY && guard < 40) {
      const depthOfChunk = (this.chunkIndex * CHUNK_H) / PX_PER_METER;
      const cycle = Math.floor(depthOfChunk / CYCLE.depth);
      const tier = tierForDepth(depthOfChunk - cycle * CYCLE.depth);
      const chunk = buildChunk(this.seed + cycle * 104729, this.chunkIndex, tier);
      this.platforms.push(...chunk.platforms);
      this.hazards.push(...chunk.hazards);
      this.pickups.push(...chunk.pickups);
      this.decor.push(...chunk.decor);
      this.generatedTo += CHUNK_H;
      this.chunkIndex += 1;
      guard += 1;
    }
  }

  update(dt, player, handlers) {
    this.time += dt;
    this.bestY = Math.max(this.bestY, player.y);
    this.depthM = this.bestY / PX_PER_METER;
    const prevCycle = this.cycle;
    this.cycle = Math.floor(this.depthM / CYCLE.depth);
    this.cycleChanged = this.cycle !== prevCycle;
    this.localDepth = this.depthM - this.cycle * CYCLE.depth;
    const hazardBoost = 1 + Math.min(0.8, this.cycle * CYCLE.hazardStep);
    this.hazardScale = Math.min(CYCLE.maxHazard, (player.powerups.slow > 0 ? 0.42 : 1) * hazardBoost);
    this.maxFall = PHYS.maxFall + Math.min(90, this.depthM * 0.08);
    // Crossing into a new descent stuns the storm for a moment: it keeps
    // crawling while you drop into the fresh layout, then picks the pace back up.
    if (this.cycleChanged) this.stormGrace = STORM.cycleGrace;
    else this.stormGrace = Math.max(0, this.stormGrace - dt);
    // One pace at every depth; a storm left far behind hurries to catch up.
    const lead = player.y - this.stormY;
    const pull = Math.max(0, lead - STORM.leash) * STORM.leashGain;
    const grace = this.stormGrace > 0 ? STORM.graceScale : 1;
    this.stormSpeed = Math.min(STORM.maxSpeed, STORM.baseSpeed + pull) * grace;
    this.stormY += this.stormSpeed * dt;

    const idx = biomeIndexAt(this.localDepth);
    this.biomeChanged = idx !== this.biome;
    if (this.biomeChanged) this.biome = idx;
    this.palette = BIOMES[this.biome];

    this.ensureGenerated(player.y + VIEW.h * 2);
    this._updateEdge(dt, player, handlers);

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (updatePlatform(p, dt, this.time)) handlers.onBreak?.(p);
      if (p.broken && p.removeIn <= 0) this.platforms.splice(i, 1);
      else if (p.y < player.y - VIEW.h * 1.6) this.platforms.splice(i, 1);
    }

    for (const h of this.hazards) updateHazard(h, dt, this.time, player, this.hazardScale);
    this._edgeShove(dt, player);

    const hb = player.hitbox();
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if ((h.type === 'wall' && h.state === 'gone') || h.y < player.y - VIEW.h * 1.7) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (player.invuln > 0) continue;
      const r = hazardRect(h);
      if (r && aabb(hb.x, hb.y, hb.w, hb.h, r.x, r.y, r.w, r.h)) {
        handlers.onHurt?.(h);
        break;
      }
    }

    const magnet = player.powerups.magnet > 0;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.y < player.y - VIEW.h * 1.7) {
        this.pickups.splice(i, 1);
        continue;
      }
      updatePickup(p, dt, this.time, player, magnet);
      if (p.taken) {
        this.pickups.splice(i, 1);
        continue;
      }
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const reach = p.type === 'gem' ? 26 : 30;
      if (dx * dx + dy * dy < reach * reach) {
        p.taken = true;
        this.pickups.splice(i, 1);
        if (p.type === 'gem') handlers.onGem?.(p);
        else if (p.type === 'heart') handlers.onHeart?.(p);
        else handlers.onPower?.(p);
      }
    }

    for (let i = this.decor.length - 1; i >= 0; i--) {
      if (this.decor[i].y < player.y - VIEW.h * 1.7) this.decor.splice(i, 1);
    }
  }

  // Camping an edge skips most of the layout, so the well grows a wall out of
  // whichever side the player leans on, warns, then presses them back inside.
  _updateEdge(dt, player, handlers) {
    if (this._edgeCool > 0) this._edgeCool = Math.max(0, this._edgeCool - dt);
    const cx = player.x + player.w / 2;
    let side = 0;
    if (cx < EDGE.hugDist) side = -1;
    else if (cx > VIEW.w - EDGE.hugDist) side = 1;
    const live = this.hazards.some((h) => h.type === 'wall');
    if (live || side === 0 || this.depthM < EDGE.minDepth || this._edgeCool > 0) {
      this._hugSide = side;
      this._hugTime = 0;
      return;
    }
    if (side !== this._hugSide) {
      this._hugSide = side;
      this._hugTime = 0;
      return;
    }
    this._hugTime += dt;
    if (this._hugTime < EDGE.triggerTime) return;
    this._hugTime = 0;
    this._edgeCool = EDGE.cooldown;
    const wall = {
      type: 'wall',
      side: side < 0 ? 'left' : 'right',
      y: player.y + player.h / 2 - EDGE.height / 2,
      h: EDGE.height,
      depth: 0,
      t: 0,
      state: 'warn',
    };
    this.hazards.push(wall);
    this.edgeWalls += 1;
    handlers?.onEdgeWall?.(wall);
  }

  // Contact shoves even while invulnerable, so standing inside the wall is never safe.
  _edgeShove(dt, player) {
    for (const h of this.hazards) {
      if (h.type !== 'wall') continue;
      const r = hazardRect(h);
      if (!r) continue;
      const hb = player.hitbox();
      if (!aabb(hb.x, hb.y, hb.w, hb.h, r.x, r.y, r.w, r.h)) continue;
      const dir = h.side === 'left' ? 1 : -1;
      player.x = clamp(player.x + dir * EDGE.push * dt, 14, VIEW.w - 14 - player.w);
    }
  }

  platformsNear(y) {
    const out = [];
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (p.y > y - 90 && p.y < y + 90) out.push(p);
    }
    return out;
  }

  stormTouching(player) {
    return player.y + 12 < this.stormY;
  }

  stormWarning(player) {
    return clamp(1 - (player.y - this.stormY) / STORM.warnRange, 0, 1);
  }

  nearestHazard(player, radius = 30) {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    for (const h of this.hazards) {
      if (h.type === 'wall') continue;
      const key = h;
      if ((this._nearCooldown.get(key) || 0) > this.time) continue;
      const r = hazardRect(h);
      if (!r) continue;
      const nx = clamp(cx, r.x, r.x + r.w);
      const ny = clamp(cy, r.y, r.y + r.h);
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < radius && d > 1) {
        this._nearCooldown.set(key, this.time + 1.2);
        return h;
      }
    }
    return null;
  }

  clearNearMissCooldowns() {
    this._nearCooldown.clear();
  }
}
