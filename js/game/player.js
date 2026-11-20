import { PHYS, VIEW } from './config.js';
import { TAU, alpha, approach, clamp, damp, rr } from '../core/utils.js';
import { drawDino, drawFaller, drawFriend, drawPlumber } from './ui.js';

const INSET = PHYS.hitInset;

export class Player {
  constructor() {
    this.def = null;
    this.trailDef = null;
    this.costume = null;
    this.reset(VIEW.w / 2, 200);
  }

  reset(x, y) {
    this.x = x - PHYS.w / 2;
    this.y = y;
    this.w = PHYS.w;
    this.h = PHYS.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.groundRef = null;
    this.coyote = 0;
    this.buffer = 0;
    this.airJumps = this.maxAirJumps();
    this.jumpsUsed = 0;
    this.dashTimer = 0;
    this.dashCd = 0;
    this.dashDir = 1;
    this.invuln = 0;
    this.shield = false;
    this.powerups = { magnet: 0, slow: 0, glide: 0 };
    this.facing = 1;
    this.squashX = 1;
    this.squashY = 1;
    this.trail = [];
    this.trailTimer = 0;
    this.anim = 0;
    this.blink = 0;
    this.dropTimer = 0;
    this.jumpHeldLast = false;
    this.airTime = 0;
    this.fallTime = 0;
    this.wingsActive = false;
    this.landImpact = 0;
    this.events = [];
    this.alive = true;
  }

  maxAirJumps() {
    return this.def?.stats?.air ?? PHYS.airJumps;
  }

  setLoadout(charDef, trailDef) {
    this.def = charDef;
    this.trailDef = trailDef;
    this.airJumps = Math.min(this.airJumps, this.maxAirJumps());
  }

  hitbox() {
    return { x: this.x + INSET, y: this.y + INSET, w: this.w - INSET * 2, h: this.h - INSET * 2 };
  }

  glideActive() {
    return this.powerups.glide > 0 || !!this.def?.stats?.glide;
  }

  addPower(kind) {
    if (kind === 'shield') {
      this.shield = true;
      return;
    }
    this.powerups[kind] = Math.max(this.powerups[kind] || 0, 0) + (kind === 'magnet' ? 7 : kind === 'slow' ? 5 : 7);
  }

  hurt(dir = 0) {
    if (this.invuln > 0) return 'none';
    if (this.shield) {
      this.shield = false;
      this.invuln = 0.9;
      this.vx = dir * 260;
      this.vy = -180;
      return 'shield';
    }
    this.invuln = 1.4;
    this.vx = dir * 300;
    this.vy = -260;
    this.squashX = 0.7;
    this.squashY = 1.3;
    return 'hit';
  }

  update(dt, input, world) {
    this.events.length = 0;
    this.wingsActive = false;
    const stats = this.def?.stats || { speed: PHYS.speed, jump: PHYS.jump, gravity: PHYS.gravity, air: 1 };

    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.anim += dt * (this.onGround ? Math.min(1.4, 0.3 + Math.abs(this.vx) / 320) : 0.6);
    this.blink -= dt;
    if (this.blink < -0.2 - Math.random() * 2.6) this.blink = 0.12;
    for (const k of Object.keys(this.powerups)) this.powerups[k] = Math.max(0, this.powerups[k] - dt);

    const axis = input.axis;
    if (input.jumpQueued) {
      this.buffer = PHYS.buffer;
      input.consumeJump();
    }
    if (input.dashQueued) {
      input.consumeDash();
      if (this.dashCd <= 0 && this.dashTimer <= 0) {
        this.dashTimer = PHYS.dashTime;
        this.dashCd = PHYS.dashCooldown;
        this.dashDir = axis !== 0 ? axis : this.facing;
        this.facing = this.dashDir;
        this.onGround = false;
        this.vy = 0;
        this.events.push({ type: 'dash' });
      }
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * PHYS.dashSpeed;
      this.vy = 0;
    } else {
      const accel = this.onGround ? PHYS.accelGround : PHYS.accelAir;
      if (axis !== 0) {
        this.vx = approach(this.vx, axis * stats.speed, accel * dt);
        this.facing = axis;
      } else {
        const fr = this.onGround ? PHYS.frictionGround : PHYS.frictionAir;
        this.vx = approach(this.vx, 0, fr * dt);
      }
      const wings = !this.onGround && input.wantsJump && this.vy > 0;
      this.wingsActive = wings;
      if (wings) {
        const cap = this.glideActive() ? PHYS.glideFall : PHYS.wingFall;
        this.vy = approach(this.vy, cap, PHYS.wingDrag * dt);
        this.fallTime = 0;
      } else {
        const gMul = this.vy > 0 ? 1.1 : PHYS.riseGravity;
        this.vy += stats.gravity * gMul * dt;
        if (this.vy > 0) this.fallTime += dt;
        else this.fallTime = 0;
        const boost = Math.min(PHYS.fallBoost, this.fallTime * PHYS.fallBoostRate);
        const cap = world.maxFall + boost;
        if (this.vy > cap) this.vy = cap;
      }
      if (this.jumpHeldLast && !input.wantsJump && this.vy < -160) this.vy *= PHYS.jumpCut;
    }
    this.jumpHeldLast = input.wantsJump;

    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);

    if (this.buffer > 0 && this.dashTimer <= 0) {
      if (this.onGround || this.coyote > 0) {
        this.vy = -stats.jump;
        this.onGround = false;
        this.groundRef = null;
        this.buffer = 0;
        this.coyote = 0;
        this.fallTime = 0;
        this.jumpsUsed = 1;
        this.squashX = 0.78;
        this.squashY = 1.24;
        this.events.push({ type: 'jump' });
      } else if (this.airJumps > 0) {
        this.airJumps -= 1;
        this.jumpsUsed += 1;
        this.fallTime = 0;
        this.vy = -stats.jump * 0.92;
        this.buffer = 0;
        this.squashX = 0.8;
        this.squashY = 1.22;
        this.events.push({ type: 'double' });
        for (let i = 0; i < 8; i++) this.events.push({ type: 'airburst' });
      }
    }

    if (input.downQueued && this.onGround && this.groundRef && this.groundRef.type === 'cloud') {
      this.onGround = false;
      this.groundRef = null;
      this.y += 8;
      this.dropTimer = 0.26;
      input.consumeDown?.();
    }

    this.x += this.vx * dt;
    const minX = 14;
    const maxX = VIEW.w - 14 - this.w;
    if (this.x < minX) {
      this.x = minX;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > maxX) {
      this.x = maxX;
      if (this.vx > 0) this.vx = 0;
    }

    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;

    if (this.vy >= 0) {
      const candidates = world.platformsNear(this.y + this.h);
      for (const p of candidates) {
        if (this.x + this.w <= p.x + 3 || this.x >= p.x + p.w - 3) continue;
        if (this.dropTimer > 0 && p.type === 'cloud') continue;
        if (prevBottom <= p.y + 2 && this.y + this.h >= p.y) {
          const impact = this.vy;
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.groundRef = p;
          this.coyote = PHYS.coyote;
          this.airJumps = this.maxAirJumps();
          this.fallTime = 0;
          p.squash = Math.min(1, impact / 700);
          if (p.type === 'bounce') {
            this.vy = -640;
            this.onGround = false;
            this.groundRef = null;
            this.events.push({ type: 'bounce' });
          } else {
            const wasAir = this.airTime > 0.12;
            if (wasAir) {
              const perfect = this.jumpsUsed === 0 && Math.abs(this.vx) < 150 && impact > 420;
              this.events.push({ type: 'land', impact, perfect, platform: p });
            }
            if (p.type === 'crumble' && p.timer <= 0) {
              p.timer = 0.55;
              this.events.push({ type: 'crumble' });
            }
            this.airTime = 0;
            this.jumpsUsed = 0;
          }
          break;
        }
      }
    }

    if (this.onGround) {
      const p = this.groundRef;
      if (!p || p.broken || this.x + this.w < p.x + 4 || this.x > p.x + p.w - 4) {
        this.onGround = false;
        this.groundRef = null;
        this.coyote = PHYS.coyote;
      } else {
        this.y = p.y - this.h;
        if (p.range) this.x = clamp(this.x + (p.x - (p.lastX ?? p.x)), 14, VIEW.w - 14 - this.w);
        p.lastX = p.x;
      }
    }

    if (!this.onGround) this.airTime += dt;

    this.squashX = damp(this.squashX, 1, 12, dt);
    this.squashY = damp(this.squashY, 1, 12, dt);

    this.trailTimer -= dt;
    const speed = Math.hypot(this.vx, this.vy);
    if (this.trailTimer <= 0 && speed > 40) {
      this.trailTimer = 0.024;
      this.trail.push({ x: this.x + this.w / 2, y: this.y + this.h / 2, life: 0.4, max: 0.4 });
      if (this.trail.length > 26) this.trail.shift();
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0);
  }

  render(ctx, cam) {
    const def = this.def || { color: '#ff7a6b', accent: '#ffd166', hat: 'tuft' };
    const trailDef = this.trailDef || { color: '#ffd166', style: 'dot' };
    const cx = this.x + this.w / 2;
    const sy = this.y - cam;
    const cy = sy + this.h / 2;

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (t.life / t.max) * 0.5 * (i / this.trail.length + 0.25);
      const ty = t.y - cam;
      if (ty < -30 || ty > 640) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = trailDef.color;
      if (trailDef.style === 'streak') {
        ctx.fillRect(t.x - 3, ty - 8, 6, 16);
      } else if (trailDef.style === 'petal') {
        ctx.beginPath();
        ctx.ellipse(t.x, ty, 5, 3, i * 0.6, 0, TAU);
        ctx.fill();
      } else if (trailDef.style === 'ribbon') {
        ctx.fillRect(t.x - 2, ty - 4, 4, 8);
      } else {
        ctx.beginPath();
        ctx.arc(t.x, ty, 3.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (this.onGround && this.groundRef) {
      ctx.fillStyle = alpha('#000000', 0.28);
      ctx.beginPath();
      ctx.ellipse(cx, this.groundRef.y + 2, 18, 5, 0, 0, TAU);
      ctx.fill();
    }

    if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.squashX, this.squashY);
    const tilt = clamp(this.vx / 1400, -0.22, 0.22);
    ctx.rotate(tilt);

    const bob = this.onGround ? Math.sin(this.anim * 8) * 1.6 : Math.sin(this.anim * 3) * 1.2;
    const legSwing = this.onGround ? Math.sin(this.anim * 12) * 7 : 4;

    if (this.wingsActive) {
      const flap = 0.5 + 0.5 * Math.sin(this.anim * 26);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle =
        this.costume === 'green' ? '#4fbf4a' : this.costume === 'red' ? '#e23b2e' : this.costume === 'dino' ? '#5cc84a' : def.accent;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          side * 15,
          -2 + bob,
          10,
          4 + flap * 6,
          side * (0.55 - flap * 0.45),
          0,
          TAU
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const look = {
      bob,
      legSwing,
      facing: this.facing > 0 ? 1 : -1,
      blink: this.blink > 0,
      t: this.anim,
    };
    if (this.costume === 'dino') drawDino(ctx, this.costume, look);
    else if (this.costume) drawPlumber(ctx, this.costume, look);
    else if (def.look) drawFriend(ctx, def, look);
    else drawFaller(ctx, def, look);

    if (this.shield) {
      ctx.strokeStyle = alpha('#6ee7ff', 0.75 + Math.sin(this.anim * 6) * 0.2);
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#6ee7ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -4, 26, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

}
