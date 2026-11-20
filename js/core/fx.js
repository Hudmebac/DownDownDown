import { TAU, alpha, clamp, rand } from './utils.js';

export class FX {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.shake = 0;
    this.shakeMax = 18;
    this.flash = 0;
    this.flashColor = '#ffffff';
  }

  burst(x, y, opts = {}) {
    const {
      count = 10,
      speed = 200,
      life = 0.6,
      size = 3.5,
      color = '#ffe066',
      gravity = 700,
      drag = 1.8,
      spread = TAU,
      angle = -Math.PI / 2,
      glow = true,
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.35 + Math.random() * 0.85);
      this.parts.push({
        x: x + rand(-4, 4),
        y: y + rand(-4, 4),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.6 + Math.random() * 0.7),
        max: life,
        size: size * (0.5 + Math.random() * 0.8),
        color,
        gravity,
        drag,
        glow,
      });
    }
  }

  spark(x, y, color, opts = {}) {
    this.burst(x, y, { count: 3, speed: 90, life: 0.35, size: 2.2, color, gravity: 200, ...opts });
  }

  ring(x, y, opts = {}) {
    const { color = '#ffe066', r0 = 6, r1 = 70, life = 0.45, width = 3, fill = false } = opts;
    this.rings.push({ x, y, r0, r1, life, max: life, color, width, fill });
  }

  text(x, y, str, opts = {}) {
    const { color = '#ffffff', size = 18, life = 0.9, vy = -70, weight = 800, stroke = null } = opts;
    this.texts.push({ x, y, str, color, size, life, max: life, vy, weight, stroke });
  }

  shakeIt(v) {
    this.shake = Math.min(this.shakeMax, this.shake + v);
  }

  flashIt(color = '#ffffff', v = 0.5) {
    this.flashColor = color;
    this.flash = Math.max(this.flash, v);
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      const d = 1 - Math.min(0.9, p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 1 - Math.min(0.9, dt * 2.4);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    this.shake *= Math.exp(-7 * dt);
    if (this.shake < 0.05) this.shake = 0;
    this.flash *= Math.exp(-6 * dt);
    if (this.flash < 0.01) this.flash = 0;
  }

  renderWorld(ctx, cam) {
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = r.r0 + (r.r1 - r.r0) * t;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y - cam, rad, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      const sy = p.y - cam;
      if (sy < -40 || sy > 660) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
      }
      ctx.beginPath();
      ctx.arc(p.x, sy, Math.max(0.5, p.size * a), 0, TAU);
      ctx.fill();
      if (p.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = `${t.weight} ${t.size}px "Segoe UI", system-ui, sans-serif`;
      const sy = t.y - cam;
      if (t.stroke) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = t.stroke;
        ctx.strokeText(t.str, t.x, sy);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, sy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderFlash(ctx, w, h) {
    if (this.flash <= 0.01) return;
    ctx.globalAlpha = Math.min(0.85, this.flash);
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  clear() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.shake = 0;
    this.flash = 0;
  }
}

export function vignette(ctx, w, h, strength = 0.55, color = '#000000') {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, alpha(color, 0));
  g.addColorStop(1, alpha(color, strength));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
