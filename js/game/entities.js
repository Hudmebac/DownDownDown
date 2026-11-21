import { TAU, alpha, clamp, rr, shade } from '../core/utils.js';
import { EDGE, POWERUPS, VIEW } from './config.js';

export function updatePlatform(p, dt, time) {
  if (p.range) p.x = p.originX + Math.sin(time * p.speed + p.phase) * p.range;
  p.squash = Math.max(0, p.squash - dt * 3.2);
  if (p.timer > 0) {
    p.timer -= dt;
    p.shake = Math.sin(time * 60) * 2.4;
    if (p.timer <= 0) {
      p.broken = true;
      p.removeIn = 0.55;
      return true;
    }
  }
  if (p.broken) {
    p.removeIn -= dt;
    p.y += 520 * dt;
  }
  return false;
}

export function updateHazard(h, dt, time, player, scale = 1) {
  switch (h.type) {
    case 'saw': {
      h.angle = (h.angle || 0) + dt * 7 * scale;
      const off = Math.sin(time * h.speed + h.phase) * h.amp;
      if (h.axis === 'y') {
        h.y = h.baseY + off;
      } else {
        h.x = h.baseX + off;
      }
      break;
    }
    case 'laser': {
      h.timer += dt * scale;
      const cycle = h.period;
      const t = (h.timer + h.phase) % cycle;
      if (t < h.warnTime) {
        h.state = 'warn';
        h.active = false;
      } else if (t < h.warnTime + h.onTime) {
        h.state = 'on';
        h.active = true;
      } else {
        h.state = 'off';
        h.active = false;
      }
      break;
    }
    case 'crusher': {
      h.timer = (h.timer || 0) + dt * scale;
      const t = (h.timer + h.phase) % h.period;
      const norm = t / h.period;
      let k;
      if (norm < 0.45) k = 0;
      else if (norm < 0.55) k = (norm - 0.45) / 0.1;
      else if (norm < 0.7) k = 1;
      else if (norm < 0.85) k = 1 - (norm - 0.7) / 0.15;
      else k = 0;
      h.warn = norm > 0.3 && norm < 0.45 ? 1 : 0;
      h.offset = k * h.range;
      h.y = h.baseY + h.offset;
      break;
    }
    case 'gloom': {
      h.t += dt * scale;
      const dx = player.x + player.w / 2 - (h.x + h.w / 2);
      const dy = player.y + player.h / 2 - (h.y + h.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      if (d < 420) {
        h.vx += (dx / d) * 34 * dt * scale;
        h.vy += (dy / d) * 34 * dt * scale;
      }
      h.vx *= 0.98;
      h.vy *= 0.98;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      break;
    }
    case 'wall': {
      h.t += dt;
      // match the fall speed and sit slightly ahead of it, so the wall is
      // already in the lane when it opens instead of trailing behind the player
      const fall = Math.max(0, player.vy || 0);
      const reach = (EDGE.follow + fall) * dt;
      const target = player.y + player.h / 2 - h.h / 2 + EDGE.lead;
      h.y += clamp(target - h.y, -reach, reach);
      const t = h.t - EDGE.warn;
      if (h.t < EDGE.warn) {
        h.state = 'warn';
        h.depth = 0;
      } else if (t < EDGE.extend) {
        h.state = 'grow';
        h.depth = EDGE.depth * (t / EDGE.extend);
      } else if (t < EDGE.extend + EDGE.hold) {
        h.state = 'hold';
        h.depth = EDGE.depth;
      } else if (t < EDGE.extend + EDGE.hold + EDGE.retract) {
        h.state = 'shrink';
        h.depth = EDGE.depth * (1 - (t - EDGE.extend - EDGE.hold) / EDGE.retract);
      } else {
        h.state = 'gone';
        h.depth = 0;
      }
      break;
    }
    default:
      break;
  }
}

export function hazardRect(h) {
  switch (h.type) {
    case 'saw':
      return { x: h.x - h.r * 0.78, y: h.y - h.r * 0.78, w: h.r * 1.56, h: h.r * 1.56 };
    case 'laser':
      return h.active ? { x: h.x, y: h.y - h.h / 2, w: h.w, h: h.h } : null;
    case 'crusher':
      return { x: h.x, y: h.y, w: h.w, h: h.h };
    case 'wall':
      if (!(h.depth > 8)) return null;
      return h.side === 'left'
        ? { x: 0, y: h.y, w: h.depth, h: h.h }
        : { x: VIEW.w - h.depth, y: h.y, w: h.depth, h: h.h };
    default:
      return { x: h.x, y: h.y, w: h.w, h: h.h };
  }
}

export function renderPlatform(ctx, p, pal, time) {
  if (p.broken && p.removeIn <= 0) return;
  const y = p.y;
  const shake = p.shake || 0;
  const squash = p.squash || 0;
  ctx.save();
  ctx.globalAlpha = p.broken ? clamp(p.removeIn / 0.55, 0, 1) : 1;
  ctx.translate(shake, 0);
  const h = p.h + squash * 4;
  const top = p.type === 'bounce' ? pal.accent2 : p.type === 'crumble' ? '#e0a870' : pal.platformTop;
  const body = p.type === 'bounce' ? '#b8632e' : p.type === 'crumble' ? '#7a5230' : pal.platformBody;

  const g = ctx.createLinearGradient(0, y, 0, y + h + 10);
  g.addColorStop(0, top);
  g.addColorStop(0.28, body);
  g.addColorStop(1, alpha(body, 0.25));
  ctx.fillStyle = g;
  rr(ctx, p.x, y, p.w, h, 7);
  ctx.fill();

  ctx.fillStyle = alpha('#ffffff', 0.55);
  rr(ctx, p.x + 3, y + 1.5, p.w - 6, 2.6, 2);
  ctx.fill();

  if (p.type === 'crumble') {
    ctx.strokeStyle = alpha('#3b2413', 0.6);
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 4; i++) {
      const cx = p.x + (p.w / 4) * i;
      ctx.beginPath();
      ctx.moveTo(cx, y + 2);
      ctx.lineTo(cx - 5, y + h * 0.6);
      ctx.lineTo(cx + 4, y + h);
      ctx.stroke();
    }
  }
  if (p.type === 'bounce') {
    ctx.strokeStyle = alpha('#ffe6a3', 0.9);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const bx = p.x + 14 + i * (p.w - 24) / 3;
      ctx.moveTo(bx - 6, y + h + 7);
      ctx.lineTo(bx, y + h + 1);
      ctx.lineTo(bx + 6, y + h + 7);
    }
    ctx.stroke();
  }
  if (p.type === 'cloud') {
    ctx.fillStyle = alpha('#ffffff', 0.16);
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.25, y + h + 4, p.w * 0.3, 10, 0, 0, TAU);
    ctx.ellipse(p.x + p.w * 0.7, y + h + 6, p.w * 0.28, 8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function renderHazard(ctx, h, pal, time) {
  switch (h.type) {
    case 'spike': {
      const n = Math.max(2, Math.round(h.w / 13));
      const tw = h.w / n;
      const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, pal.hazard);
      g.addColorStop(1, alpha(pal.hazard, 0.55));
      ctx.fillStyle = g;
      ctx.shadowColor = alpha(pal.hazard, 0.65);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = h.x + i * tw;
        if (h.dir === 'up') {
          ctx.moveTo(x, h.y + h.h);
          ctx.lineTo(x + tw / 2, h.y);
          ctx.lineTo(x + tw, h.y + h.h);
        } else {
          ctx.moveTo(x, h.y);
          ctx.lineTo(x + tw / 2, h.y + h.h);
          ctx.lineTo(x + tw, h.y);
        }
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case 'saw': {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle || 0);
      ctx.shadowColor = alpha(pal.hazard, 0.7);
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#d8dbe6';
      ctx.beginPath();
      const teeth = 10;
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i * Math.PI) / teeth;
        const rad = i % 2 === 0 ? h.r : h.r * 0.78;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = pal.hazard;
      ctx.beginPath();
      ctx.arc(0, 0, h.r * 0.44, 0, TAU);
      ctx.fill();
      ctx.fillStyle = alpha('#ffffff', 0.5);
      ctx.beginPath();
      ctx.arc(-h.r * 0.14, -h.r * 0.14, h.r * 0.16, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'laser': {
      const cy = h.y;
      ctx.fillStyle = alpha('#ffffff', 0.18);
      rr(ctx, h.x - 6, cy - 12, 10, 24, 4);
      ctx.fill();
      rr(ctx, h.x + h.w - 4, cy - 12, 10, 24, 4);
      ctx.fill();
      if (h.state === 'warn') {
        const blink = 0.35 + 0.45 * Math.abs(Math.sin(time * 26));
        ctx.strokeStyle = alpha(pal.hazard, blink);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(h.x, cy);
        ctx.lineTo(h.x + h.w, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (h.state === 'on') {
        const flicker = 0.75 + 0.25 * Math.sin(time * 40);
        ctx.shadowColor = pal.hazard;
        ctx.shadowBlur = 22;
        const g = ctx.createLinearGradient(0, cy - h.h / 2, 0, cy + h.h / 2);
        g.addColorStop(0, alpha('#ffffff', 0.15));
        g.addColorStop(0.5, alpha(pal.hazard, flicker));
        g.addColorStop(1, alpha('#ffffff', 0.15));
        ctx.fillStyle = g;
        rr(ctx, h.x, cy - h.h / 2, h.w, h.h, 5);
        ctx.fill();
        ctx.fillStyle = alpha('#ffffff', 0.75);
        rr(ctx, h.x + 2, cy - 2, h.w - 4, 4, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      break;
    }
    case 'crusher': {
      ctx.fillStyle = alpha(pal.hazard, 0.12);
      rr(ctx, h.x - 3, h.baseY - 88, h.w + 6, 90, 6);
      ctx.fill();
      ctx.fillStyle = '#3a3f52';
      const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
      g.addColorStop(0, '#6b7280');
      g.addColorStop(1, '#2f3444');
      ctx.fillStyle = g;
      rr(ctx, h.x, h.y, h.w, h.h, 8);
      ctx.fill();
      ctx.fillStyle = alpha(pal.hazard, h.warn ? 0.8 : 0.5);
      for (let i = 0; i < 5; i++) {
        const x = h.x + 8 + i * ((h.w - 16) / 5);
        ctx.beginPath();
        ctx.moveTo(x, h.y + h.h);
        ctx.lineTo(x + (h.w - 16) / 10, h.y + h.h + 12);
        ctx.lineTo(x + (h.w - 16) / 5, h.y + h.h);
        ctx.fill();
      }
      break;
    }
    case 'gloom': {
      const bob = Math.sin(time * 3 + h.t) * 3;
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h / 2 + bob;
      ctx.shadowColor = alpha(pal.hazard, 0.6);
      ctx.shadowBlur = 18;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, h.w * 0.75);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, pal.hazard);
      g.addColorStop(1, alpha(pal.hazard, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, h.w * 0.75, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1b1226';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 2, 3.4, 4.6, 0, 0, TAU);
      ctx.ellipse(cx + 6, cy - 2, 3.4, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = alpha('#ffffff', 0.9);
      ctx.beginPath();
      ctx.arc(cx - 6 + 1, cy - 3, 1.3, 0, TAU);
      ctx.arc(cx + 6 + 1, cy - 3, 1.3, 0, TAU);
      ctx.fill();
      break;
    }
    case 'wall': {
      const left = h.side === 'left';
      const d = Math.max(0, h.depth);
      const top = h.y - 26;
      const bot = h.y + h.h + 26;
      const warn = h.state === 'warn';
      const pulse = 0.5 + 0.5 * Math.sin(time * (warn ? 22 : 10));
      const edgeX = left ? 0 : VIEW.w;
      const tint = pal.hazard;
      ctx.save();

      // the seam that throbs before the wall arrives
      ctx.shadowColor = alpha(tint, 0.85);
      ctx.shadowBlur = warn ? 12 + pulse * 20 : 20;
      ctx.fillStyle = alpha(tint, warn ? 0.32 + pulse * 0.55 : 0.85);
      ctx.fillRect(left ? 0 : VIEW.w - 6, top, 6, bot - top);
      ctx.shadowBlur = 0;

      if (d > 1) {
        const g = ctx.createLinearGradient(edgeX, 0, left ? d : VIEW.w - d, 0);
        g.addColorStop(0, alpha('#ffffff', 0.6));
        g.addColorStop(0.1, alpha(tint, 0.92));
        g.addColorStop(0.65, alpha(tint, 0.62));
        g.addColorStop(1, alpha(tint, 0.16));
        ctx.fillStyle = g;
        ctx.fillRect(left ? 0 : VIEW.w - d, top, d, bot - top);

        // inward face: blunt lobes in the organic biomes, blades everywhere else
        const dir = left ? 1 : -1;
        const face = left ? d : VIEW.w - d;
        const soft = pal.id === 'garden' || pal.id === 'abyss';
        const step = 26;
        ctx.beginPath();
        for (let y = top; y < bot; y += step) {
          ctx.moveTo(face, y);
          if (soft) ctx.quadraticCurveTo(face + dir * 15, y + step * 0.5, face, y + step);
          else {
            ctx.lineTo(face + dir * 14, y + step * 0.5);
            ctx.lineTo(face, y + step);
          }
        }
        ctx.fillStyle = g;
        ctx.fill();

        ctx.strokeStyle = alpha('#ffffff', 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(face, top);
        ctx.lineTo(face, bot);
        ctx.stroke();

        if (pal.id === 'ember' || pal.id === 'lastlight') {
          ctx.fillStyle = alpha(pal.accent2, 0.3 + pulse * 0.25);
          ctx.fillRect(left ? 0 : VIEW.w - d * 0.55, top, d * 0.55, bot - top);
        }
      }
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

export function updatePickup(p, dt, time, player, magnet) {
  p.t += dt;
  if (p.taken) return false;
  if (p.type === 'gem' && magnet) {
    const dx = player.x + player.w / 2 - p.x;
    const dy = player.y + player.h / 2 - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 230 && d > 1) {
      const pull = 640 * dt;
      p.x += (dx / d) * pull;
      p.y += (dy / d) * pull;
      p.baseY = p.y;
    }
  }
  return true;
}

export function renderPickup(ctx, p, pal, time) {
  const bob = Math.sin(time * 3.2 + p.t) * 4;
  const x = p.x;
  const y = p.y + bob;
  ctx.save();
  if (p.type === 'gem') {
    const s = p.r;
    const w = s * 0.8;
    ctx.shadowColor = pal.gem;
    ctx.shadowBlur = 18;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 1.6 + p.t) * 0.18);
    const g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, shade(pal.gem, 0.15));
    g.addColorStop(1, alpha(pal.gem, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = alpha('#ffffff', 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(0, -s);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, s);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = alpha('#ffffff', 0.7);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(w * 0.36, 0);
    ctx.lineTo(0, s * 0.18);
    ctx.closePath();
    ctx.fill();
  } else if (p.type === 'heart') {
    const s = p.r;
    ctx.shadowColor = '#ff6b8b';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff6b8b';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.75);
    ctx.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.45, y - s * 0.95, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 1.2, y - s * 0.1, x, y + s * 0.75);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (p.type === 'power') {
    const def = POWERUPS[p.kind];
    const s = p.r;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 20;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2 + p.t) * 0.15);
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, alpha('#ffffff', 0.95));
    g.addColorStop(1, alpha(def.color, 0.75));
    ctx.fillStyle = g;
    rr(ctx, -s, -s, s * 2, s * 2, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#101322';
    drawIcon(ctx, p.kind, 0, 0, s * 0.55);
  }
  ctx.restore();
}

export function drawIcon(ctx, kind, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#101322';
  ctx.strokeStyle = '#101322';
  ctx.lineWidth = Math.max(1.6, s * 0.16);
  if (kind === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.8, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.8, s * 0.6, 0, s);
    ctx.quadraticCurveTo(-s * 0.8, s * 0.6, -s * 0.8, -s * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.72, Math.PI, 0);
    ctx.lineWidth = s * 0.4;
    ctx.stroke();
    ctx.fillRect(-s * 0.92, 0, s * 0.4, s * 0.62);
    ctx.fillRect(s * 0.52, 0, s * 0.4, s * 0.62);
  } else if (kind === 'slow') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.8, 0, TAU);
    ctx.lineWidth = s * 0.22;
    ctx.stroke();
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s * 0.45);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.35, s * 0.2);
    ctx.stroke();
  } else if (kind === 'glide') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.2);
    ctx.quadraticCurveTo(0, -s * 1.05, s * 0.85, s * 0.2);
    ctx.quadraticCurveTo(0, s * 0.5, -s * 0.85, s * 0.2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderDecor(ctx, d, pal) {
  const x = d.x;
  const y = d.y;
  const s = d.size;
  ctx.save();
  ctx.globalAlpha = 0.55;
  if (d.kind === 'crystal') {
    ctx.fillStyle = alpha(pal.accent, 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * s);
    ctx.lineTo(x + 11 * s, y);
    ctx.lineTo(x, y + 16 * s);
    ctx.lineTo(x - 11 * s, y);
    ctx.closePath();
    ctx.fill();
  } else if (d.kind === 'vine') {
    ctx.strokeStyle = alpha(pal.accent2, 0.5);
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 40 * s);
    ctx.bezierCurveTo(x + 18 * s, y - 18 * s, x - 16 * s, y + 4 * s, x + 4 * s, y + 26 * s);
    ctx.stroke();
  } else if (d.kind === 'pipe') {
    ctx.fillStyle = '#1c2334';
    rr(ctx, x - 10 * s, y - 30 * s, 20 * s, 60 * s, 6 * s);
    ctx.fill();
    ctx.fillStyle = alpha(pal.accent, 0.35);
    rr(ctx, x - 5 * s, y - 26 * s, 6 * s, 50 * s, 3 * s);
    ctx.fill();
  } else if (d.kind === 'shard') {
    ctx.fillStyle = alpha(pal.accent2, 0.5);
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y);
    ctx.lineTo(x, y - 14 * s);
    ctx.lineTo(x + 8 * s, y);
    ctx.lineTo(x, y + 10 * s);
    ctx.fill();
  } else {
    ctx.fillStyle = alpha(pal.accent, 0.4);
    ctx.beginPath();
    ctx.ellipse(x, y, 14 * s, 7 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 2 * s, y - 2, 4 * s, 10 * s);
  }
  ctx.restore();
}

export const WORLD_WIDTH = VIEW.w;
