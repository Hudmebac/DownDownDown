import { AREA_CONFIG } from './world.js';

export class StarManager {
  constructor(world) {
    this.world = world;
    this.sparkles = [];
    this.collectedCount = 0;
    this.rewards = null;
  }

  update(dt) {
    this.sparkles = this.sparkles.filter(s => {
      s.life -= dt;
      s.y -= 40 * dt;
      s.x += Math.sin(s.life * 10) * 30 * dt;
      return s.life > 0;
    });
  }

  collectStar(star) {
    if (star.collected) return false;
    star.collected = true;
    this.collectedCount++;
    for (let i = 0; i < 8; i++) {
      this.sparkles.push({
        x: star.x + star.size / 2,
        y: star.y + star.size / 2,
        vx: (Math.random() - 0.5) * 120,
        vy: -Math.random() * 80 - 40,
        life: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
      });
    }
    return true;
  }

  renderSparkles(ctx) {
    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00FFFF'];
    for (const s of this.sparkles) {
      const alpha = Math.min(1, s.life * 2);
      const ci = Math.floor((s.x * 7 + s.y * 13) % colors.length);
      ctx.fillStyle = colors[ci];
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(Math.round(s.x), Math.round(s.y), s.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderStars(ctx) {
    const now = Date.now() / 1000;
    const tier = this.rewards ? this.rewards.currentTier : 0;
    const tierColors = [
      { c1: '#FFF9C4', c2: '#FFD700', c3: '#FFA000', glow: 'rgba(255, 215, 0, 0.2)' },
      { c1: '#FFFFFF', c2: '#FFEE58', c3: '#FFB300', glow: 'rgba(255, 238, 88, 0.35)' },
      { c1: '#FFB3FF', c2: '#FF69B4', c3: '#FF1493', glow: 'rgba(255, 105, 180, 0.25)' },
      { c1: '#FF9A9E', c2: '#FAD0C4', c3: '#A18CD1', glow: 'rgba(250, 208, 196, 0.25)' },
      { c1: '#FFD700', c2: '#DAA520', c3: '#B8860B', glow: 'rgba(218, 165, 32, 0.3)' },
    ];
    const tc = tierColors[Math.min(tier, tierColors.length - 1)];
    const sizeMul = 1 + tier * 0.12;

    const render = (star) => {
      const sy = this.world.getScreenY(star.y);
      const bob = Math.sin(now * 3 + star.bobTimer) * 3;
      const px = Math.round(star.x + star.size / 2);
      const py = Math.round(sy + bob + star.size / 2);
      const s = star.size * sizeMul;

      ctx.save();
      ctx.translate(px, py);

      if (tier >= 3) {
        const arcCount = 2 + (tier - 2);
        for (let a = 0; a < arcCount; a++) {
          const arcAngle = now * 2 + a * (Math.PI * 2 / arcCount);
          const arcR = s * 0.8 + Math.sin(now * 3 + a) * 4;
          ctx.strokeStyle = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#C084FC'][a % 5];
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.7 + Math.sin(now * 4 + a) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, arcR, arcAngle, arcAngle + Math.PI * 0.8);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (tier >= 4) {
        ctx.fillStyle = '#DAA520';
        ctx.beginPath();
        ctx.ellipse(0, 2, s * 0.7, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = `${Math.round(s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☘', 0, 0);
        ctx.restore();
        return;
      }

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5);
      grad.addColorStop(0, tc.c1);
      grad.addColorStop(0.3, tc.c2);
      grad.addColorStop(1, tc.c3);
      ctx.fillStyle = grad;

      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? s : s * 0.4;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.5);
      glow.addColorStop(0, tc.glow);
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, s * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    for (const star of this.world.getVisibleStars()) {
      render(star);
    }
  }
}

export class Enemy {
  constructor(gameWidth, gameHeight) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.width = 32;
    this.height = 32;
    this.speed = 30;
    this.duration = 4.8;
    this.timer = 0;
    this.chaseCooldown = 15;
    this.bobTimer = 0;
    this.angryTimer = 0;
    this._trail = [];
  }

  spawn(playerX, playerY) {
    const side = Math.random() > 0.5 ? 1 : -1;
    this.x = playerX + side * (100 + Math.random() * 80);
    this.y = playerY - 60 - Math.random() * 100;
    if (this.x < 0) this.x = 20;
    if (this.x > this.gameWidth - this.width) this.x = this.gameWidth - this.width - 20;
    if (this.y < -50) this.y = -50;
    this.active = true;
    this.timer = this.duration;
    this.angryTimer = 0;
    this._trail = [];
  }

  update(dt, playerX, playerY) {
    if (!this.active) return;

    this.timer -= dt;
    this.angryTimer += dt;
    this.bobTimer += dt * 4;

    if (this.timer <= 0) {
      this.active = false;
      return 'expired';
    }

    this.speed = 30;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const moveSpeed = this.speed * dt;
      this.x += (dx / dist) * moveSpeed;
      this.y += (dy / dist) * moveSpeed;
    }

    if (this.y > this.gameHeight + 100 || this.y < -200) {
      this.active = false;
    }

    this._trail.push({ x: this.x + this.width / 2, y: this.y + this.height / 2, life: 1 });
    this._trail = this._trail.filter(t => {
      t.life -= dt * 3;
      return t.life > 0;
    });

    return null;
  }

  checkCollision(player) {
    if (!this.active) return false;
    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }

  render(ctx, area, playerX) {
    if (!this.active) return;
    if (this.y < -50 || this.y > this.gameHeight + 50) return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);
    const shake = Math.sin(this.angryTimer * 30) * 2;
    const bob = Math.sin(this.bobTimer) * 2;

    const ec = AREA_CONFIG[area] ? AREA_CONFIG[area].enemy : AREA_CONFIG[1].enemy;

    for (const t of this._trail) {
      const alpha = t.life * 0.2;
      ctx.fillStyle = `${ec.trail}${alpha})`;
      ctx.beginPath();
      ctx.arc(Math.round(t.x), Math.round(t.y), 5 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(px + this.width / 2 + shake, py + this.height / 2 + bob);

    const pulse = 1 + Math.sin(this.angryTimer * 8) * 0.05;
    ctx.scale(pulse, pulse);

    const bodyColor1 = ec.body[0];
    const bodyColor2 = ec.body[1];
    const bodyColor3 = ec.body[2];
    const bodyColor4 = ec.body[3];
    const strokeColor = ec.stroke;
    const mouthColor = ec.mouth;
    const mouthBorder = ec.mouthBorder;

    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 4, this.width / 1.2);
    bodyGrad.addColorStop(0, bodyColor1);
    bodyGrad.addColorStop(0.25, bodyColor2);
    bodyGrad.addColorStop(0.6, bodyColor3);
    bodyGrad.addColorStop(1, bodyColor4);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 1.2, 0, Math.PI * 2);
    ctx.stroke();

    const earBob = Math.sin(this.angryTimer * 12) * 2;
    ctx.fillStyle = bodyColor2;
    ctx.beginPath();
    ctx.ellipse(-11, -6 + earBob, 4, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(11, -6 + earBob, 4, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-11, -6 + earBob, 4, 7, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(11, -6 + earBob, 4, 7, 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FF6666';
    ctx.beginPath();
    ctx.arc(-5, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-5, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#220000';
    ctx.beginPath();
    ctx.arc(-5 + (playerX > px ? 1 : -1), -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 + (playerX > px ? 1 : -1), -3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-4 + (playerX > px ? 1 : -1), -5, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6 + (playerX > px ? 1 : -1), -5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mouthColor;
    ctx.beginPath();
    ctx.ellipse(0, 7, 7, 4.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = mouthBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 7, 7, 4.5, 0, 0, Math.PI);
    ctx.stroke();

    ctx.fillStyle = mouthBorder;
    ctx.beginPath();
    ctx.ellipse(0, 6, 4, 2.5, 0, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = '#FFAA00';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i - 1) * 0.6 + Math.sin(this.angryTimer * 10) * 0.2;
      ctx.save();
      ctx.translate(Math.cos(angle) * 14, Math.sin(angle) * 14 - 2);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -10);
      ctx.lineTo(4, -10);
      ctx.closePath();
      ctx.fillStyle = '#FFAA00';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const glow2 = ctx.createRadialGradient(0, -2, 0, 0, -2, this.width / 1.0);
    glow2.addColorStop(0, ec.glow);
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.arc(0, -2, this.width / 1.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, options = {}) {
    const {
      speed = 100,
      size = 4,
      life = 0.6,
      color = '#FFD700',
      spread = Math.PI * 2,
      gravity = 200,
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 50,
        size: size * (0.5 + Math.random() * 0.5),
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color,
        gravity,
      });
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  render(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
