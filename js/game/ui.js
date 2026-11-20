import { TAU, alpha, clamp, easeOutCubic, rr, shade } from '../core/utils.js';

export const COLORS = {
  ink: '#070a14',
  panel: '#101725',
  panelLight: '#1a2334',
  stroke: 'rgba(255,255,255,0.14)',
  text: '#eef4ff',
  muted: 'rgba(238,244,255,0.6)',
  good: '#6ee7b7',
  bad: '#ff8a7a',
};

export function font(size, weight = 700) {
  return `${weight} ${size}px "Segoe UI", system-ui, -apple-system, sans-serif`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.dragging = null;
    this._hoverId = null;
    this._hoverNow = null;
  }

  begin() {
    this._hoverNow = null;
  }

  end() {
    if (this._hoverNow !== this._hoverId) {
      if (this._hoverNow) this.game.audio.sfx('ui', { hover: true });
      this._hoverId = this._hoverNow;
    }
  }

  get accent() {
    return this.game.palette.accent;
  }

  clicked(x, y, w, h) {
    const p = this.game.input.pointer;
    return p.clicked && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }

  button(ctx, x, y, w, h, label, opts = {}) {
    const { input } = this.game;
    const p = input.pointer;
    const id = opts.id || label;
    const disabled = !!opts.disabled;
    const over = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    let clicked = false;
    if (over && p.clicked) {
      p.clicked = false;
      if (disabled) this.game.audio.sfx('deny');
      else clicked = true;
    }
    if (over && !disabled) this._hoverNow = id;

    const variant = opts.variant || 'secondary';
    const press = over && p.down ? 1 : 0;
    const scale = 1 + (over && !disabled ? 0.012 : 0);
    const accent = opts.color || this.accent;
    const offsetY = press * 1.5;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + offsetY);
    ctx.scale(scale, scale);
    const bx = -w / 2;
    const by = -h / 2;

    if (variant === 'primary') {
      const g = ctx.createLinearGradient(0, by, 0, by + h);
      g.addColorStop(0, shade(accent, 0.28));
      g.addColorStop(1, accent);
      ctx.fillStyle = disabled ? alpha(accent, 0.3) : g;
      rr(ctx, bx, by, w, h, Math.min(16, h / 2));
      ctx.fill();
      ctx.fillStyle = alpha('#ffffff', 0.32);
      rr(ctx, bx + 4, by + 3, w - 8, Math.min(10, h * 0.22), 6);
      ctx.fill();
      ctx.strokeStyle = alpha('#ffffff', 0.28);
      ctx.lineWidth = 1.2;
      rr(ctx, bx, by, w, h, Math.min(16, h / 2));
      ctx.stroke();
    } else if (variant === 'ghost') {
      if (over) {
        ctx.fillStyle = alpha('#ffffff', 0.07);
        rr(ctx, bx, by, w, h, 12);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = disabled ? 'rgba(20,26,40,0.4)' : over ? 'rgba(30,40,62,0.92)' : 'rgba(16,23,37,0.82)';
      rr(ctx, bx, by, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = over && !disabled ? alpha(accent, 0.65) : COLORS.stroke;
      ctx.lineWidth = 1.4;
      rr(ctx, bx, by, w, h, 12);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sub = opts.sub;
    const labelSize = opts.size || 18;
    ctx.fillStyle = variant === 'primary' ? '#0a1020' : disabled ? 'rgba(238,244,255,0.32)' : COLORS.text;
    ctx.font = font(labelSize, 800);
    const labelY = sub ? -h * 0.12 : 0;
    ctx.fillText(label, 0, labelY);
    if (sub) {
      ctx.font = font(11, 700);
      ctx.fillStyle = variant === 'primary' ? 'rgba(10,16,32,0.62)' : COLORS.muted;
      ctx.fillText(sub, 0, h * 0.24);
    }
    ctx.restore();
    return clicked;
  }

  panel(ctx, x, y, w, h, opts = {}) {
    const { radius = 18, fill = 'rgba(12,18,30,0.9)', stroke = COLORS.stroke, shadow = true } = opts;
    if (shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = fill;
      rr(ctx, x, y, w, h, radius);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = fill;
      rr(ctx, x, y, w, h, radius);
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    rr(ctx, x, y, w, h, radius);
    ctx.stroke();
  }

  text(ctx, str, x, y, opts = {}) {
    const { size = 16, weight = 600, color = COLORS.text, align = 'left', baseline = 'alphabetic', glow = null } = opts;
    ctx.font = font(size, weight);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    if (glow) ctx.shadowBlur = 0;
  }

  bar(ctx, x, y, w, h, value, opts = {}) {
    const color = opts.color || this.accent;
    ctx.fillStyle = opts.bg || 'rgba(255,255,255,0.12)';
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    const v = clamp(value, 0, 1);
    if (v > 0) {
      ctx.fillStyle = color;
      rr(ctx, x, y, Math.max(h, w * v), h, h / 2);
      ctx.fill();
    }
  }

  slider(ctx, x, y, w, value, id) {
    const { input } = this.game;
    const p = input.pointer;
    const over = p.x > x - 12 && p.x < x + w + 12 && p.y > y - 18 && p.y < y + 18;
    if (over && p.clicked) {
      this.dragging = id;
      p.clicked = false;
    }
    if (!p.down && this.dragging === id) this.dragging = null;
    let out = null;
    if (this.dragging === id) {
      out = clamp((p.x - x) / w, 0, 1);
      value = out;
      p.clicked = false;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(ctx, x, y - 3, w, 6, 3);
    ctx.fill();
    ctx.fillStyle = this.accent;
    rr(ctx, x, y - 3, Math.max(6, w * value), 6, 3);
    ctx.fill();
    const kx = x + w * value;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = alpha(this.accent, 0.8);
    ctx.shadowBlur = over || this.dragging === id ? 16 : 8;
    ctx.beginPath();
    ctx.arc(kx, y, over || this.dragging === id ? 9 : 7.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    return out;
  }

  toggle(ctx, x, y, value, id) {
    const { input } = this.game;
    const p = input.pointer;
    const w = 52;
    const h = 26;
    const over = p.x > x - 6 && p.x < x + w + 6 && p.y > y - 10 && p.y < y + h + 10;
    let out = null;
    if (over && p.clicked) {
      p.clicked = false;
      out = !value;
      this.game.audio.sfx('ui');
    }
    ctx.fillStyle = value ? alpha(this.accent, 0.85) : 'rgba(255,255,255,0.16)';
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + (value ? w - h / 2 : h / 2), y + h / 2, h / 2 - 4, 0, TAU);
    ctx.fill();
    return out;
  }

  heart(ctx, x, y, s, filled, color = '#ff6b8b') {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.75);
    ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.45, -s * 0.95, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.45, -s * 0.95, s * 1.2, -s * 0.1, 0, s * 0.75);
    if (filled) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
    } else {
      ctx.strokeStyle = alpha(color, 0.35);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  gem(ctx, x, y, r, color, t = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.5) * 0.16);
    const w = r * 0.78;
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, color);
    g.addColorStop(1, alpha(color, 0.6));
    ctx.fillStyle = g;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = alpha('#ffffff', 0.55);
    ctx.lineWidth = Math.max(0.8, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(0, -r);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, r);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = alpha('#ffffff', 0.7);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(w * 0.36, 0);
    ctx.lineTo(0, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  icon(ctx, kind, x, y, s, color = '#101322') {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, s * 0.18);
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
      ctx.arc(0, 0, s * 0.7, Math.PI, 0);
      ctx.lineWidth = s * 0.4;
      ctx.stroke();
      ctx.fillRect(-s * 0.9, 0, s * 0.4, s * 0.6);
      ctx.fillRect(s * 0.5, 0, s * 0.4, s * 0.6);
    } else if (kind === 'clock') {
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
    } else if (kind === 'feather') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, s * 0.2);
      ctx.quadraticCurveTo(0, -s * 1.05, s * 0.85, s * 0.2);
      ctx.quadraticCurveTo(0, s * 0.5, -s * 0.85, s * 0.2);
      ctx.fill();
    } else if (kind === 'gem') {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.75, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.75, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  character(ctx, def, x, y, scale = 1, t = 0, facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * facing, scale);
    drawFaller(ctx, def, { bob: Math.sin(t * 2.4) * 2, t, facing: 1, shadow: true });
    ctx.restore();
  }

  sparkle(ctx, x, y, r, color, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.6);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    const s = r * (0.75 + Math.sin(t * 4) * 0.25);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.46, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.46, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  bannerText(ctx, str, size = 44) {
    ctx.save();
    ctx.font = font(size, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, this.accent);
    ctx.fillStyle = g;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  shakeForButton(t) {
    return easeOutCubic(t) * 20;
  }
}

function drawHat(ctx, def, top, bob = 0) {
  const accent = def.accent || '#ffd166';
  ctx.fillStyle = accent;
  ctx.strokeStyle = 'rgba(8,11,20,0.35)';
  ctx.lineWidth = 1;
  switch (def.hat) {
    case 'spike':
      ctx.beginPath();
      ctx.moveTo(-6, top + 2 + bob);
      ctx.quadraticCurveTo(-1, top - 12 + bob, 6, top - 13 + bob);
      ctx.quadraticCurveTo(3, top - 3 + bob, 6, top + 2 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'horns':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 7, top + 2 + bob);
        ctx.quadraticCurveTo(s * 10, top - 7 + bob, s * 15, top - 9 + bob);
        ctx.quadraticCurveTo(s * 12, top - 1 + bob, s * 10, top + 2 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'antenna':
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, top + 2 + bob);
      ctx.quadraticCurveTo(3, top - 8 + bob, 9, top - 12 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(9, top - 12 + bob, 3.4, 0, TAU);
      ctx.fill();
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(-9, top + 2 + bob);
      ctx.lineTo(-9, top - 6 + bob);
      ctx.lineTo(-4.5, top - 1.5 + bob);
      ctx.lineTo(0, top - 9 + bob);
      ctx.lineTo(4.5, top - 1.5 + bob);
      ctx.lineTo(9, top - 6 + bob);
      ctx.lineTo(9, top + 2 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = alpha('#ffffff', 0.85);
      ctx.beginPath();
      ctx.arc(-4.5, top - 1 + bob, 1.2, 0, TAU);
      ctx.arc(0, top - 4.5 + bob, 1.4, 0, TAU);
      ctx.arc(4.5, top - 1 + bob, 1.2, 0, TAU);
      ctx.fill();
      break;
    case 'hood':
      ctx.beginPath();
      ctx.arc(0, top + 5 + bob, 13, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(15, top + 10 + bob, 0, top + 7 + bob);
      ctx.quadraticCurveTo(-15, top + 10 + bob, -13, top + 5 + bob);
      ctx.fill();
      ctx.strokeStyle = alpha('#ffffff', 0.25);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, top + 5 + bob, 11.6, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.moveTo(-5, top + 2 + bob);
      ctx.quadraticCurveTo(-3, top - 7 + bob, 1, top - 4 + bob);
      ctx.quadraticCurveTo(3, top - 9 + bob, 6, top - 1 + bob);
      ctx.quadraticCurveTo(4, top + 2 + bob, -5, top + 2 + bob);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

export function drawFaller(ctx, def, opts = {}) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false, shadow = false, t = 0 } = opts;
  const body = def.color || '#ff7a6b';
  const accent = def.accent || '#ffd166';
  const ink = 'rgba(7,11,20,0.5)';

  ctx.save();
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 17, 4.6, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = '#2a3149';
  rr(ctx, -8.2, 8 + bob + legSwing * 0.3, 7.6, 11.5, 3.4);
  ctx.fill();
  rr(ctx, 0.8, 8 + bob - legSwing * 0.3, 7.6, 11.5, 3.4);
  ctx.fill();
  ctx.fillStyle = '#171d2e';
  rr(ctx, -9.2, 16.6 + bob + legSwing * 0.3, 9.4, 4.2, 2.1);
  ctx.fill();
  rr(ctx, 0, 16.6 + bob - legSwing * 0.3, 9.4, 4.2, 2.1);
  ctx.fill();

  const dir = facing >= 0 ? -1 : 1;
  const wave = Math.sin(t * 5) * 2.4;
  ctx.fillStyle = alpha(accent, 0.92);
  ctx.beginPath();
  ctx.moveTo(dir * 7, -8 + bob);
  ctx.quadraticCurveTo(dir * 21, -12 + bob + wave, dir * 29, -3 + bob + wave * 1.4);
  ctx.quadraticCurveTo(dir * 20, 1 + bob + wave, dir * 6, -2 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = alpha(body, 0.92);
  rr(ctx, -14.2, -4 + bob, 4.6, 11, 2.3);
  ctx.fill();
  rr(ctx, 9.6, -4 + bob, 4.6, 11, 2.3);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(-12, 7.4 + bob, 2.2, 0, TAU);
  ctx.arc(12, 7.4 + bob, 2.2, 0, TAU);
  ctx.fill();

  const g = ctx.createLinearGradient(-12, -10, 12, 14);
  g.addColorStop(0, shade(body, 0.18));
  g.addColorStop(0.55, body);
  g.addColorStop(1, alpha(body, 0.78));
  ctx.fillStyle = g;
  rr(ctx, -11, -9 + bob, 22, 21, 8);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  rr(ctx, -11, -9 + bob, 22, 21, 8);
  ctx.stroke();
  ctx.fillStyle = alpha('#ffffff', 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 3 + bob, 6.8, 5.6, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = accent;
  rr(ctx, -10.2, -11.5 + bob, 20.4, 4.6, 2.3);
  ctx.fill();

  ctx.fillStyle = shade(body, 0.06);
  ctx.beginPath();
  ctx.arc(0, -17 + bob, 11.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -17 + bob, 11.6, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#f6efe6';
  ctx.beginPath();
  ctx.ellipse(0, -15.4 + bob, 7.9, 6.9, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = alpha(accent, 0.4);
  ctx.beginPath();
  ctx.arc(-6.2, -11.4 + bob, 1.9, 0, TAU);
  ctx.arc(6.2, -11.4 + bob, 1.9, 0, TAU);
  ctx.fill();

  const eyeY = -17 + bob;
  const look = facing * 1.1;
  if (blink) {
    ctx.fillStyle = '#202636';
    rr(ctx, -5.4, eyeY - 0.9, 4.2, 1.8, 0.9);
    ctx.fill();
    rr(ctx, 1.2, eyeY - 0.9, 4.2, 1.8, 0.9);
    ctx.fill();
  } else {
    ctx.fillStyle = '#202636';
    ctx.beginPath();
    ctx.arc(-3.3 + look, eyeY, 2.25, 0, TAU);
    ctx.arc(3.3 + look, eyeY, 2.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4 + look, eyeY - 1, 0.85, 0, TAU);
    ctx.arc(2.6 + look, eyeY - 1, 0.85, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = '#202636';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(look * 0.4, eyeY + 3.6, 2.3, 0.25, Math.PI - 0.25);
  ctx.stroke();

  drawHat(ctx, def, -28, bob);
  ctx.restore();
}
