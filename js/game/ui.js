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
    const opts = { bob: Math.sin(t * 2.4) * 2, t, facing: 1, shadow: true };
    if (def.look) drawFriend(ctx, def, opts);
    else drawFaller(ctx, def, opts);
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

export function drawPlumber(ctx, outfit, opts = {}) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false, shadow = false } = opts;
  const green = outfit === 'green';
  const dir = facing >= 0 ? 1 : -1;
  const shirt = green ? '#4fbf4a' : '#e23b2e';
  const shirtDark = green ? '#2f8a35' : '#a81f1a';
  const overalls = '#2f4fc0';
  const overallsDark = '#1d348f';
  const skin = '#f7c8a0';
  const skinShade = '#e3a475';
  const hair = '#3a2415';
  const shoe = '#6b3a1f';
  const ink = 'rgba(7,11,20,0.5)';
  const swing = legSwing * 0.34;
  const armSwing = -legSwing * 0.24;

  ctx.save();
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 18, 4.8, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = overalls;
  rr(ctx, -8.6, 4.8 + bob + swing, 7.8, 11.4, 3.4);
  ctx.fill();
  rr(ctx, 0.8, 4.8 + bob - swing, 7.8, 11.4, 3.4);
  ctx.fill();

  ctx.fillStyle = shoe;
  rr(ctx, -9.9, 14.8 + bob + swing, 10.4, 5.3, 2.6);
  ctx.fill();
  rr(ctx, -0.5, 14.8 + bob - swing, 10.4, 5.3, 2.6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, -8.6, 15.7 + bob + swing, 4.6, 1.2, 0.6);
  ctx.fill();
  rr(ctx, 0.8, 15.7 + bob - swing, 4.6, 1.2, 0.6);
  ctx.fill();

  ctx.fillStyle = shirtDark;
  rr(ctx, -15.2, -6.6 + bob + armSwing, 5.4, 12.4, 2.7);
  ctx.fill();
  rr(ctx, 9.8, -6.6 + bob - armSwing, 5.4, 12.4, 2.7);
  ctx.fill();
  ctx.fillStyle = '#fbfbf7';
  ctx.beginPath();
  ctx.arc(-12.5, 7.0 + bob + armSwing, 3.15, 0, TAU);
  ctx.arc(12.5, 7.0 + bob - armSwing, 3.15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(-11, -8, 11, 14);
  bodyGrad.addColorStop(0, shade(shirt, 0.18));
  bodyGrad.addColorStop(0.6, shirt);
  bodyGrad.addColorStop(1, shirtDark);
  ctx.fillStyle = bodyGrad;
  rr(ctx, -11, -7.6 + bob, 22, 19.6, 7.4);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = overalls;
  rr(ctx, -10.6, 2.0 + bob, 21.2, 10.3, 5.2);
  ctx.fill();
  ctx.strokeStyle = alpha(overallsDark, 0.65);
  ctx.lineWidth = 1;
  ctx.stroke();
  rr(ctx, -6.3, -5.0 + bob, 12.6, 9.4, 3.0);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -8.5, -8.0 + bob, 3.2, 7.2, 1.6);
  ctx.fill();
  rr(ctx, 5.3, -8.0 + bob, 3.2, 7.2, 1.6);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(-5.4, -0.8 + bob, 1.55, 0, TAU);
  ctx.arc(5.4, -0.8 + bob, 1.55, 0, TAU);
  ctx.fill();

  ctx.fillStyle = skinShade;
  rr(ctx, -3.2, -10.5 + bob, 6.4, 4.6, 2.2);
  ctx.fill();

  const hy = -17 + bob;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, hy, 10.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = skinShade;
  ctx.beginPath();
  ctx.ellipse(dir * -9.2, hy + 1.5, 2.6, 3.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(dir * -8.2, hy - 2.0, 2.4, 4.6, -dir * 0.2, 0, TAU);
  ctx.fill();

  const eyeY = hy + 1.2;
  const look = dir * 1.0;
  if (blink) {
    ctx.fillStyle = '#1d2940';
    rr(ctx, -5.8 + look, eyeY - 0.9, 4.1, 1.8, 0.9);
    ctx.fill();
    rr(ctx, 1.7 + look, eyeY - 0.9, 4.1, 1.8, 0.9);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-3.7 + look, eyeY, 2.6, 3.0, 0, 0, TAU);
    ctx.ellipse(3.7 + look, eyeY, 2.6, 3.0, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2b4c8c';
    ctx.beginPath();
    ctx.arc(-3.5 + look * 1.2, eyeY + 0.2, 1.35, 0, TAU);
    ctx.arc(3.9 + look * 1.2, eyeY + 0.2, 1.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.9 + look * 1.2, eyeY - 0.3, 0.45, 0, TAU);
    ctx.arc(3.5 + look * 1.2, eyeY - 0.3, 0.45, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = skinShade;
  ctx.beginPath();
  ctx.ellipse(dir * 8.6, hy + 3.6, 4.5, 3.8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath();
  ctx.ellipse(dir * 7.3, hy + 2.7, 1.6, 1.1, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(dir * 5.6, hy + 7.2, 5.4, 2.6, dir * 0.12, 0, TAU);
  ctx.ellipse(dir * 2.0, hy + 7.3, 3.4, 2.2, 0, 0, TAU);
  ctx.ellipse(dir * 9.5, hy + 7.0, 3.0, 2.0, dir * 0.3, 0, TAU);
  ctx.fill();

  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, hy - 5.4, 11.3, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = shade(shirt, -0.08);
  ctx.beginPath();
  ctx.ellipse(dir * 5.0, hy - 5.4, 12.6, 2.8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  const ex = dir * 3.4;
  const ey = hy - 8.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex, ey, 3.0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alpha('#081020', 0.35);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (green) {
    ctx.moveTo(ex - 1.1, ey - 1.2);
    ctx.lineTo(ex - 1.1, ey + 1.2);
    ctx.lineTo(ex + 1.3, ey + 1.2);
  } else {
    ctx.moveTo(ex - 1.4, ey + 1.2);
    ctx.lineTo(ex - 0.8, ey - 1.2);
    ctx.lineTo(ex, ey + 0.2);
    ctx.lineTo(ex + 0.8, ey - 1.2);
    ctx.lineTo(ex + 1.4, ey + 1.2);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawDino(ctx, outfit, opts = {}) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false, shadow = false } = opts;
  const dir = facing >= 0 ? 1 : -1;
  const hide = '#5cc84a';
  const hideDark = '#3a9a33';
  const hideLight = '#84e26b';
  const belly = '#fdf6e3';
  const saddle = '#e2452f';
  const saddleDark = '#a82c1c';
  const boot = '#8a5a2b';
  const bootDark = '#5a3717';
  const ink = 'rgba(7,11,20,0.5)';
  const swing = legSwing * 0.34;
  const armSwing = -legSwing * 0.24;

  ctx.save();
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 18, 4.8, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.moveTo(-dir * 4, 0 + bob);
  ctx.quadraticCurveTo(-dir * 18, -4 + bob, -dir * 24, 6 + bob);
  ctx.quadraticCurveTo(-dir * 17, 9 + bob, -dir * 4, 11 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = alpha(belly, 0.45);
  ctx.beginPath();
  ctx.ellipse(-dir * 14, 5 + bob, 6.2, 2.2, dir * 0.22, 0, TAU);
  ctx.fill();

  ctx.fillStyle = hide;
  rr(ctx, -8.2, 4.6 + bob + swing, 7.6, 9.8, 3.4);
  ctx.fill();
  rr(ctx, 0.6, 4.6 + bob - swing, 7.6, 9.8, 3.4);
  ctx.fill();

  ctx.fillStyle = boot;
  rr(ctx, -9.6, 12.6 + bob + swing, 10.2, 6.0, 2.8);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  rr(ctx, -0.6, 12.6 + bob - swing, 10.2, 6.0, 2.8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = alpha(bootDark, 0.9);
  rr(ctx, -9.6 + (dir > 0 ? 3.2 : 0), 15.0 + bob + swing, 7.0, 3.2, 1.6);
  ctx.fill();
  rr(ctx, -0.6 + (dir > 0 ? 3.2 : 0), 15.0 + bob - swing, 7.0, 3.2, 1.6);
  ctx.fill();

  ctx.fillStyle = hide;
  rr(ctx, -14.0, -5.2 + bob + armSwing, 5.0, 9.6, 2.4);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  rr(ctx, 9.0, -5.2 + bob - armSwing, 5.0, 9.6, 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hideLight;
  ctx.beginPath();
  ctx.arc(-11.5, 4.4 + bob + armSwing, 2.6, 0, TAU);
  ctx.arc(11.5, 4.4 + bob - armSwing, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(-11, -8, 11, 14);
  bodyGrad.addColorStop(0, hideLight);
  bodyGrad.addColorStop(0.6, hide);
  bodyGrad.addColorStop(1, hideDark);
  ctx.fillStyle = bodyGrad;
  rr(ctx, -10.5, -8.0 + bob, 21, 18.8, 8.6);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha(belly, 0.96);
  ctx.beginPath();
  ctx.ellipse(dir * 3.2, 2.6 + bob, 6.6, 8.2, dir * 0.08, 0, TAU);
  ctx.fill();

  const sx = -dir * 5.6;
  ctx.fillStyle = saddle;
  ctx.beginPath();
  ctx.ellipse(sx, -1.6 + bob, 7.0, 8.4, -dir * 0.22, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = alpha(saddleDark, 0.55);
  ctx.beginPath();
  ctx.ellipse(sx - dir * 1.4, -1.0 + bob, 4.0, 6.0, -dir * 0.22, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alpha('#ffffff', 0.55);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(sx, -1.6 + bob, 5.4, 6.6, -dir * 0.22, 0, TAU);
  ctx.stroke();

  const hy = -17 + bob;
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.arc(0, hy, 10.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = hideLight;
  ctx.beginPath();
  ctx.ellipse(dir * 6.4, hy + 3.6, 9.4, 7.2, dir * 0.05, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.ellipse(dir * 12.0, hy + 0.8, 1.5, 1.1, 0, 0, TAU);
  ctx.ellipse(dir * 9.0, hy + 0.0, 1.3, 1.0, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(dir * 1.6, hy + 6.4);
  ctx.quadraticCurveTo(dir * 7.4, hy + 9.2, dir * 13.2, hy + 4.4);
  ctx.stroke();

  const eyeY = hy - 3.4;
  const look = dir * 1.1;
  if (blink) {
    ctx.fillStyle = '#1d2940';
    rr(ctx, -5.6 + look, eyeY - 0.9, 4.0, 1.8, 0.9);
    ctx.fill();
    rr(ctx, 1.6 + look, eyeY - 0.9, 4.0, 1.8, 0.9);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-3.4 + look, eyeY, 3.0, 3.6, 0, 0, TAU);
    ctx.ellipse(3.8 + look, eyeY, 3.0, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = alpha(ink, 0.6);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#1d2940';
    ctx.beginPath();
    ctx.arc(-3.2 + look * 1.3, eyeY + 0.2, 1.5, 0, TAU);
    ctx.arc(4.0 + look * 1.3, eyeY + 0.2, 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.6 + look * 1.3, eyeY - 0.3, 0.5, 0, TAU);
    ctx.arc(3.6 + look * 1.3, eyeY - 0.3, 0.5, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = alpha('#ff9d8a', 0.35);
  ctx.beginPath();
  ctx.ellipse(dir * 1.8, hy + 4.4, 3.0, 2.0, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ── Hangar roster art ──────────────────────────────────────────────────────
// Everything below shares one silhouette (feet near y=22, head near y=-17) so
// the new hangar cards line up with the originals.

const FRIEND_INK = 'rgba(7,11,20,0.5)';
const FRIEND_SKIN = '#f7c8a0';
const FRIEND_SKIN_DARK = '#e0a878';
const FRIEND_HAIR = '#4a2c17';

function friendShadow(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 24, 16, 4.4, 0, 0, TAU);
  ctx.fill();
}

function friendEyes(ctx, y, opts = {}) {
  const { gap = 3.4, r = 2.1, blink = false, look = 0, white = 0, pupil = '#20263a' } = opts;
  if (blink) {
    ctx.fillStyle = pupil;
    rr(ctx, -gap - r, y - 0.95, r * 2, 1.9, 0.95);
    ctx.fill();
    rr(ctx, gap - r, y - 0.95, r * 2, 1.9, 0.95);
    ctx.fill();
    return;
  }
  if (white > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-gap, y, r + white, r + white, 0, 0, TAU);
    ctx.ellipse(gap, y, r + white, r + white, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = pupil;
  ctx.beginPath();
  ctx.arc(-gap + look, y, r, 0, TAU);
  ctx.arc(gap + look, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = alpha('#ffffff', 0.9);
  ctx.beginPath();
  ctx.arc(-gap + look - r * 0.35, y - r * 0.42, r * 0.34, 0, TAU);
  ctx.arc(gap + look - r * 0.35, y - r * 0.42, r * 0.34, 0, TAU);
  ctx.fill();
}

function friendPlumber(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.28;
  const cap = def.color || '#e23b2e';
  const shirt = def.accent || cap;
  const suit = def.suit || '#2f5fd0';

  ctx.fillStyle = FRIEND_HAIR;
  rr(ctx, -9.8, 16.2 + bob + swing, 10, 5.6, 2.7);
  ctx.fill();
  rr(ctx, -0.2, 16.2 + bob - swing, 10, 5.6, 2.7);
  ctx.fill();

  ctx.fillStyle = suit;
  rr(ctx, -8.4, 5.6 + bob + swing, 7.8, 11, 3.3);
  ctx.fill();
  rr(ctx, 0.6, 5.6 + bob - swing, 7.8, 11, 3.3);
  ctx.fill();

  const g = ctx.createLinearGradient(-11, -8, 11, 14);
  g.addColorStop(0, shade(shirt, 0.22));
  g.addColorStop(1, alpha(shirt, 0.85));
  ctx.fillStyle = g;
  rr(ctx, -10.6, -7.6 + bob, 21.2, 17.6, 7.8);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = suit;
  rr(ctx, -8.8, 0.2 + bob, 17.6, 10, 4.8);
  ctx.fill();
  rr(ctx, -7.4, -6.6 + bob, 3.4, 9.4, 1.7);
  ctx.fill();
  rr(ctx, 4, -6.6 + bob, 3.4, 9.4, 1.7);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(-5.6, 1.2 + bob, 1.6, 0, TAU);
  ctx.arc(5.6, 1.2 + bob, 1.6, 0, TAU);
  ctx.fill();

  ctx.fillStyle = shirt;
  rr(ctx, -14.4, -4.8 + bob, 4.8, 10, 2.3);
  ctx.fill();
  rr(ctx, 9.6, -4.8 + bob, 4.8, 10, 2.3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-12 + dir * 0.6, 6 + bob, 2.6, 0, TAU);
  ctx.arc(12 + dir * 0.6, 6 + bob, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.fillStyle = FRIEND_SKIN;
  ctx.beginPath();
  ctx.arc(0, -16 + bob, 10.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = FRIEND_SKIN;
  ctx.beginPath();
  ctx.arc(dir * 9.2, -14.4 + bob, 2.7, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = FRIEND_SKIN_DARK;
  ctx.beginPath();
  ctx.ellipse(dir * 3.4, -12 + bob, 3.5, 2.9, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  friendEyes(ctx, -18 + bob, { gap: 3.2, r: 2.05, blink, look: dir * 0.9, white: 0.7, pupil: '#2a3650' });

  ctx.fillStyle = FRIEND_HAIR;
  ctx.beginPath();
  ctx.ellipse(dir * -1.2, -9.4 + bob, 4.4, 2.2, -0.14 * dir, 0, TAU);
  ctx.ellipse(dir * 4.4, -9.6 + bob, 3.4, 2, 0.14 * dir, 0, TAU);
  ctx.fill();

  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(0, -21 + bob, 10.6, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(dir * 7.2, -21.4 + bob, 7.4, 2.6, dir * 0.08, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = alpha('#000000', 0.14);
  ctx.beginPath();
  ctx.ellipse(dir * 7.2, -21.2 + bob, 6.8, 1.9, dir * 0.08, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dir * 3.4, -24.8 + bob, 3.1, 0, TAU);
  ctx.fill();
  if (def.initial) {
    ctx.fillStyle = cap;
    ctx.font = font(5.2, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.initial, dir * 3.4, -24.6 + bob);
  }
}

function friendPeach(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.24;
  const dress = def.color || '#ff8fc7';
  const hair = def.accent || '#ffe08a';
  const gold = '#ffd166';

  ctx.fillStyle = '#d4557f';
  rr(ctx, -8.6, 18.4 + bob + swing, 8.4, 4.6, 2.2);
  ctx.fill();
  rr(ctx, 0.2, 18.4 + bob - swing, 8.4, 4.6, 2.2);
  ctx.fill();

  const g = ctx.createLinearGradient(-14, -6, 14, 20);
  g.addColorStop(0, shade(dress, 0.24));
  g.addColorStop(1, alpha(dress, 0.8));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-7.4, -4 + bob);
  ctx.quadraticCurveTo(-9.6, 8 + bob, -15.4, 19.4 + bob + swing * 0.4);
  ctx.quadraticCurveTo(0, 23 + bob, 15.4, 19.4 + bob - swing * 0.4);
  ctx.quadraticCurveTo(9.6, 8 + bob, 7.4, -4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-13.4, 16.4 + bob);
  ctx.quadraticCurveTo(0, 20 + bob, 13.4, 16.4 + bob);
  ctx.stroke();

  ctx.fillStyle = dress;
  rr(ctx, -7.6, -10 + bob, 15.2, 9, 5);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#6ee7ff';
  ctx.beginPath();
  ctx.arc(0, -5.4 + bob, 1.8, 0, TAU);
  ctx.fill();

  ctx.fillStyle = FRIEND_SKIN;
  rr(ctx, -12.8, -7 + bob, 4.4, 8.6, 2.1);
  ctx.fill();
  rr(ctx, 8.4, -7 + bob, 4.4, 8.6, 2.1);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-10.6, 2.4 + bob, 2.4, 0, TAU);
  ctx.arc(10.6, 2.4 + bob, 2.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(0, -16 + bob, 13.4, 13, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-dir * 10.4, -6 + bob, 4.6, 12, dir * 0.12, 0, TAU);
  ctx.fill();

  ctx.fillStyle = FRIEND_SKIN;
  ctx.beginPath();
  ctx.arc(0, -16 + bob, 9.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -18.4 + bob, 9.8, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(0, -20.4 + bob, -9.8, -18.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-8.4, -10 + bob, 3.4, 6.4, 0.2, 0, TAU);
  ctx.ellipse(8.4, -10 + bob, 3.4, 6.4, -0.2, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -15.6 + bob, { gap: 3, r: 1.9, blink, look: dir * 0.8, white: 1.1, pupil: '#2c4a8a' });

  ctx.fillStyle = '#e2637f';
  ctx.beginPath();
  ctx.ellipse(dir * 0.8, -9.6 + bob, 2, 1.1, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#6ee7ff';
  ctx.beginPath();
  ctx.arc(-8.2, -11 + bob, 1.1, 0, TAU);
  ctx.arc(8.2, -11 + bob, 1.1, 0, TAU);
  ctx.fill();

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-6.4, -24.4 + bob);
  ctx.lineTo(-6.4, -28.4 + bob);
  ctx.lineTo(-3.2, -26.2 + bob);
  ctx.lineTo(0, -30 + bob);
  ctx.lineTo(3.2, -26.2 + bob);
  ctx.lineTo(6.4, -28.4 + bob);
  ctx.lineTo(6.4, -24.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ff8fc7';
  ctx.beginPath();
  ctx.arc(0, -27 + bob, 1.1, 0, TAU);
  ctx.fill();
}

function friendToad(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.22;
  const cap = def.color || '#ff87b5';
  const vest = def.suit || '#f7f1e8';

  ctx.fillStyle = FRIEND_HAIR;
  rr(ctx, -8.6, 18.2 + bob + swing, 8.6, 4.8, 2.3);
  ctx.fill();
  rr(ctx, 0, 18.2 + bob - swing, 8.6, 4.8, 2.3);
  ctx.fill();

  ctx.fillStyle = vest;
  rr(ctx, -7.4, 6 + bob, 14.8, 12.4, 5.6);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = alpha('#ffffff', 0.9);
  ctx.beginPath();
  ctx.arc(0, 10.6 + bob, 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = FRIEND_SKIN;
  rr(ctx, -10.8, 4 + bob, 4.2, 8.6, 2.1);
  ctx.fill();
  rr(ctx, 6.6, 4 + bob, 4.2, 8.6, 2.1);
  ctx.fill();

  ctx.fillStyle = FRIEND_SKIN;
  ctx.beginPath();
  ctx.arc(0, -2.4 + bob, 8.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const cg = ctx.createLinearGradient(0, -22 + bob, 0, -6 + bob);
  cg.addColorStop(0, shade(cap, 0.24));
  cg.addColorStop(1, cap);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(0, -7.4 + bob, 16, 13.6, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.88);
  ctx.beginPath();
  ctx.ellipse(-7.4, -13 + bob, 3.4, 3, -0.2, 0, TAU);
  ctx.ellipse(3.4, -16.6 + bob, 2.7, 2.4, 0.1, 0, TAU);
  ctx.ellipse(9.4, -10.4 + bob, 2.4, 2.1, 0.2, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -3.4 + bob, { gap: 3.2, r: 1.8, blink, look: dir * 0.8, white: 1.2, pupil: '#233048' });

  ctx.strokeStyle = '#8a4a3a';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(dir * 0.6, 1 + bob, 2.6, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (def.id === 'toadette') {
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(-15.4, -2.6 + bob, 4, 5.2, 0.3, 0, TAU);
    ctx.ellipse(15.4, -2.6 + bob, 4, 5.2, -0.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = alpha('#ffffff', 0.9);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function friendBowser(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.24;
  const skin = def.color || '#3f8f3a';
  const skinDark = '#2f6f2b';
  const shell = def.accent || '#f0a33c';
  const belly = '#f2d59b';
  const cream = '#f6ecd2';

  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.moveTo(-dir * 6, 6 + bob);
  ctx.quadraticCurveTo(-dir * 20, 8 + bob, -dir * 22, 16 + bob);
  ctx.quadraticCurveTo(-dir * 14, 14 + bob, -dir * 5, 13 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = skin;
  rr(ctx, -9.4, 10 + bob + swing, 8.6, 8.4, 3.6);
  ctx.fill();
  rr(ctx, 0.8, 10 + bob - swing, 8.6, 8.4, 3.6);
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(-6.2, 18.6 + bob + swing, 4.4, 2.2, 0, 0, TAU);
  ctx.ellipse(4.4, 18.6 + bob - swing, 4.4, 2.2, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = cream;
  for (let i = 0; i < 3; i++) {
    const sy = -8 + i * 8 + bob;
    ctx.beginPath();
    ctx.moveTo(-dir * 15.6, sy);
    ctx.lineTo(-dir * 23.2, sy + 2 + i);
    ctx.lineTo(-dir * 15.2, sy + 4.8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(-dir * 7.2, 1 + bob, 11.4, 13.4, -dir * 0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = alpha('#7a4a12', 0.35);
  ctx.beginPath();
  ctx.ellipse(-dir * 7.2, 2 + bob, 6.6, 8.6, -dir * 0.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = skin;
  rr(ctx, -10.4, -8 + bob, 20.8, 18, 8);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(dir * 2.4, 2.4 + bob, 7, 8, dir * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alpha('#b08a4a', 0.55);
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(dir * 2.4 - 5.4, -1.6 + i * 3.4 + bob);
    ctx.quadraticCurveTo(dir * 2.4, 0.4 + i * 3.4 + bob, dir * 2.4 + 5.4, -1.6 + i * 3.4 + bob);
    ctx.stroke();
  }

  ctx.fillStyle = skin;
  rr(ctx, -14.2, -5 + bob, 5, 10.4, 2.4);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  rr(ctx, 9.2, -5 + bob, 5, 10.4, 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.arc(-11.8, 6.4 + bob, 2.6, 0, TAU);
  ctx.arc(11.8, 6.4 + bob, 2.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(-8.4, -24.6 + bob);
  ctx.lineTo(-11.8, -32.4 + bob);
  ctx.lineTo(-4.4, -27.6 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8.4, -24.6 + bob);
  ctx.lineTo(11.8, -32.4 + bob);
  ctx.lineTo(4.4, -27.6 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -19 + bob, 11.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = '#d9482b';
  ctx.beginPath();
  ctx.moveTo(-10.4, -24 + bob);
  ctx.quadraticCurveTo(-4, -33 + bob, 2, -28 + bob);
  ctx.quadraticCurveTo(6, -34 + bob, 10.6, -24.6 + bob);
  ctx.quadraticCurveTo(4, -21.4 + bob, -10.4, -24 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(dir * 6.2, -13.6 + bob, 8.4, 6.2, dir * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = '#7a5a2a';
  ctx.beginPath();
  ctx.ellipse(dir * 8.2, -16.4 + bob, 1.3, 1, 0, 0, TAU);
  ctx.ellipse(dir * 11.6, -16 + bob, 1.2, 0.9, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(dir * 0.6, -12.4 + bob);
  ctx.quadraticCurveTo(dir * 6.4, -8.6 + bob, dir * 12.8, -11.8 + bob);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const tx = dir * (2.4 + i * 3.8);
    ctx.beginPath();
    ctx.moveTo(tx, -12 + bob);
    ctx.lineTo(tx + dir * 2.2, -12 + bob);
    ctx.lineTo(tx + dir * 1.1, -9.4 + bob);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.ellipse(-4, -20.4 + bob, 3.2, 3.6, 0, 0, TAU);
  ctx.ellipse(4, -20.4 + bob, 3.2, 3.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alpha(FRIEND_INK, 0.8);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = '#1b2230';
  ctx.beginPath();
  ctx.ellipse(dir * -4 + dir * 0.8, -20.2 + bob, 1, 2.4, 0, 0, TAU);
  ctx.ellipse(dir * 4 + dir * 0.8, -20.2 + bob, 1, 2.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2f6f2b';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-8.6, -25 + bob);
  ctx.lineTo(-1.6, -23 + bob);
  ctx.moveTo(8.6, -25 + bob);
  ctx.lineTo(1.6, -23 + bob);
  ctx.stroke();
}

function friendApe(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.26;
  const fur = def.color || '#8a5a2b';
  const furDark = '#5f3a17';
  const muzzle = '#e8cfa8';
  const diddy = def.id === 'diddy';

  ctx.fillStyle = furDark;
  rr(ctx, -9.4, 17 + bob + swing, 8.4, 5.2, 2.4);
  ctx.fill();
  rr(ctx, 1, 17 + bob - swing, 8.4, 5.2, 2.4);
  ctx.fill();

  ctx.fillStyle = fur;
  rr(ctx, -8.2, 8 + bob + swing, 7.4, 10, 3.2);
  ctx.fill();
  rr(ctx, 0.8, 8 + bob - swing, 7.4, 10, 3.2);
  ctx.fill();

  ctx.fillStyle = fur;
  rr(ctx, -15, -5 + bob, 5.4, 13, 2.6);
  ctx.fill();
  rr(ctx, 9.6, -5 + bob, 5.4, 13, 2.6);
  ctx.fill();
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.arc(-12.2, 8.4 + bob, 2.8, 0, TAU);
  ctx.arc(12.2, 8.4 + bob, 2.8, 0, TAU);
  ctx.fill();

  ctx.fillStyle = fur;
  rr(ctx, -11, -8 + bob, 22, 19, 8.4);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = alpha(muzzle, 0.85);
  ctx.beginPath();
  ctx.ellipse(dir * 1.6, 3.4 + bob, 7.4, 7.8, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(0, -18 + bob, 11.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(-11.6, -17 + bob, 4.6, 0, TAU);
  ctx.arc(11.6, -17 + bob, 4.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = muzzle;
  ctx.beginPath();
  ctx.arc(-11.6, -17 + bob, 2.4, 0, TAU);
  ctx.arc(11.6, -17 + bob, 2.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = muzzle;
  ctx.beginPath();
  ctx.ellipse(dir * 1.4, -12.6 + bob, 7.8, 6.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(dir * -1.4, -14.6 + bob, 1.2, 0.9, 0, 0, TAU);
  ctx.ellipse(dir * 4.4, -14.6 + bob, 1.2, 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(dir * 1.4, -10.4 + bob, 3.2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  friendEyes(ctx, -19.6 + bob, { gap: 3.6, r: 2, blink, look: dir * 0.9, white: 1.4, pupil: '#20242c' });

  ctx.strokeStyle = furDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6.6, -24.6 + bob);
  ctx.lineTo(-1.8, -23.2 + bob);
  ctx.moveTo(6.6, -24.6 + bob);
  ctx.lineTo(1.8, -23.2 + bob);
  ctx.stroke();

  if (diddy) {
    ctx.fillStyle = def.accent || '#e23b2e';
    ctx.beginPath();
    ctx.arc(0, -23.4 + bob, 9, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FRIEND_INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(dir * 7.4, -23 + bob, 6.8, 2.4, dir * 0.08, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -26.4 + bob, 2.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = def.accent || '#e23b2e';
    ctx.beginPath();
    ctx.arc(0, -26.4 + bob, 1.3, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = furDark;
    ctx.beginPath();
    ctx.arc(0, -29.4 + bob, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = def.accent || '#e23b2e';
    ctx.beginPath();
    ctx.moveTo(-3.4, -7.4 + bob);
    ctx.lineTo(3.4, -7.4 + bob);
    ctx.lineTo(0, 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FRIEND_INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8 + bob, 2.7, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function friendBones(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.26;
  const bone = def.color || '#efe8d6';
  const boneDark = '#c9c2ad';
  const glow = def.accent || '#8fe08a';

  ctx.fillStyle = bone;
  rr(ctx, -7.4, 8 + bob + swing, 6, 10.4, 3);
  ctx.fill();
  rr(ctx, 1.4, 8 + bob - swing, 6, 10.4, 3);
  ctx.fill();
  ctx.fillStyle = boneDark;
  rr(ctx, -8.6, 17.6 + bob + swing, 7.6, 4.2, 2);
  ctx.fill();
  rr(ctx, 1, 17.6 + bob - swing, 7.6, 4.2, 2);
  ctx.fill();

  ctx.fillStyle = bone;
  rr(ctx, -9.6, -8.4 + bob, 19.2, 15.6, 6);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = alpha('#8b8474', 0.75);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-6.4, -4.4 + i * 3.8 + bob);
    ctx.quadraticCurveTo(0, -2 + i * 3.8 + bob, 6.4, -4.4 + i * 3.8 + bob);
    ctx.stroke();
  }

  ctx.fillStyle = bone;
  rr(ctx, -13.4, -5.4 + bob, 4.4, 12, 2.2);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  rr(ctx, 9, -5.4 + bob, 4.4, 12, 2.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(-11.2, 7.6 + bob, 2.2, 0, TAU);
  ctx.arc(11.2, 7.6 + bob, 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(0, -17 + bob, 11, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = bone;
  rr(ctx, -7, -9.4 + bob, 14, 5.2, 2.4);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = '#1b2230';
  ctx.beginPath();
  ctx.ellipse(-4.4, -19 + bob, 3.4, 4.2, 0, 0, TAU);
  ctx.ellipse(4.4, -19 + bob, 3.4, 4.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-4.2 + dir * 0.9, -18.4 + bob, 1.5, 0, TAU);
  ctx.arc(4.6 + dir * 0.9, -18.4 + bob, 1.5, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#2a3244';
  ctx.beginPath();
  ctx.moveTo(0, -15.2 + bob);
  ctx.lineTo(-1.7, -12.4 + bob);
  ctx.lineTo(1.7, -12.4 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#9a9684';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-3.6 + i * 2.4, -9.2 + bob);
    ctx.lineTo(-3.6 + i * 2.4, -4.8 + bob);
    ctx.stroke();
  }
}

function friendThwomp(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const stone = def.color || '#8f98aa';
  const stoneDark = def.accent || '#5d677a';
  const stoneLight = '#c3cbd8';

  ctx.save();
  ctx.translate(0, bob);
  const g = ctx.createLinearGradient(-18, -24, 18, 20);
  g.addColorStop(0, shade(stone, 0.2));
  g.addColorStop(0.6, stone);
  g.addColorStop(1, stoneDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-17, -22);
  ctx.lineTo(17, -22);
  ctx.quadraticCurveTo(19, -22, 19, -20);
  ctx.lineTo(19, 18);
  ctx.quadraticCurveTo(19, 20, 17, 20);
  ctx.lineTo(-17, 20);
  ctx.quadraticCurveTo(-19, 20, -19, 18);
  ctx.lineTo(-19, -20);
  ctx.quadraticCurveTo(-19, -22, -17, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = stoneLight;
  for (const sx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(sx - 5, -22);
    ctx.lineTo(sx, -28.6);
    ctx.lineTo(sx + 5, -22);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = alpha('#2a3040', 0.85);
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.lineTo(-2.6, -7.4);
  ctx.lineTo(-2.6, -11.6);
  ctx.lineTo(-12, -15.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -12);
  ctx.lineTo(2.6, -7.4);
  ctx.lineTo(2.6, -11.6);
  ctx.lineTo(12, -15.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.ellipse(-7.4, -5.4, 3.2, 3.8, 0.2, 0, TAU);
  ctx.ellipse(7.4, -5.4, 3.2, 3.8, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1b2230';
  ctx.beginPath();
  ctx.arc(-6.6 + dir, -5, 1.7, 0, TAU);
  ctx.arc(8.2 + dir, -5, 1.7, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#2a3040';
  rr(ctx, -10.4, 4, 20.8, 6.6, 2);
  ctx.fill();
  ctx.fillStyle = '#f0ead6';
  for (let i = 0; i < 4; i++) {
    const tx = -9 + i * 5.2;
    ctx.beginPath();
    ctx.moveTo(tx, 4);
    ctx.lineTo(tx + 2.6, 4);
    ctx.lineTo(tx + 1.3, 7.6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = alpha('#2a3040', 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-13.4, -20);
  ctx.lineTo(-11, -14.4);
  ctx.lineTo(-13, -10);
  ctx.moveTo(12.4, 12.4);
  ctx.lineTo(15.4, 8.4);
  ctx.stroke();
  ctx.restore();
}

function friendPlant(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const red = def.color || '#e63946';
  const stem = '#3f9d4a';
  const stemDark = '#2c7a36';

  ctx.strokeStyle = stemDark;
  ctx.lineWidth = 5.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 20 + bob);
  ctx.quadraticCurveTo(dir * 3, 6 + bob, 0, -4 + bob);
  ctx.stroke();

  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.ellipse(-9.4, 12 + bob, 7, 3.4, 0.5, 0, TAU);
  ctx.ellipse(9.4, 14 + bob, 7.4, 3.6, -0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1;
  ctx.stroke();

  const g = ctx.createRadialGradient(-3, -14 + bob, 2, 0, -10 + bob, 16);
  g.addColorStop(0, shade(red, 0.3));
  g.addColorStop(1, alpha(red, 0.85));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -10 + bob, 13.4, 11.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  for (const [sx, sy, sr] of [[-6.4, -16.4, 2.6], [2.6, -18.2, 2.2], [7.4, -12.4, 2], [-2.4, -8.6, 1.8]]) {
    ctx.beginPath();
    ctx.arc(sx, sy + bob, sr, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = '#7d1d24';
  ctx.beginPath();
  ctx.ellipse(dir * 1.6, -5.4 + bob, 8.6, 5.4, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ff8f9a';
  ctx.beginPath();
  ctx.ellipse(dir * 1.6, -9.8 + bob, 9.4, 2.4, 0, 0, TAU);
  ctx.ellipse(dir * 1.6, -1.2 + bob, 8.4, 2.2, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  for (const tx of [-4.4, -0.6, 3.2, 7]) {
    const bx = dir * tx;
    ctx.beginPath();
    ctx.moveTo(bx, -9.4 + bob);
    ctx.lineTo(bx + dir * 2.2, -9.4 + bob);
    ctx.lineTo(bx + dir * 1.1, -5.4 + bob);
    ctx.closePath();
    ctx.fill();
  }

  friendEyes(ctx, -18.6 + bob, { gap: 4.2, r: 1.8, blink, look: dir * 0.8, white: 1.4, pupil: '#20303a' });
}

function friendGoomba(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const swing = legSwing * 0.2;
  const cap = def.color || '#a4642f';
  const capDark = def.accent || '#7a4620';

  ctx.fillStyle = capDark;
  rr(ctx, -10.6, 14.6 + bob + swing, 9.8, 6, 3);
  ctx.fill();
  rr(ctx, 1.2, 14.6 + bob - swing, 9.8, 6, 3);
  ctx.fill();

  const g = ctx.createLinearGradient(0, -22 + bob, 0, 16 + bob);
  g.addColorStop(0, shade(cap, 0.22));
  g.addColorStop(1, capDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-16.6, 14 + bob);
  ctx.quadraticCurveTo(-16.6, -20 + bob, 0, -21 + bob);
  ctx.quadraticCurveTo(16.6, -20 + bob, 16.6, 14 + bob);
  ctx.quadraticCurveTo(0, 18.6 + bob, -16.6, 14 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha('#f0d8b0', 0.2);
  ctx.beginPath();
  ctx.ellipse(0, -2 + bob, 12.4, 9.4, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9.6, -9.6 + bob);
  ctx.lineTo(-2.4, -5.6 + bob);
  ctx.moveTo(9.6, -9.6 + bob);
  ctx.lineTo(2.4, -5.6 + bob);
  ctx.stroke();

  friendEyes(ctx, -3.2 + bob, { gap: 4.6, r: 2.1, blink, look: dir * 0.9, white: 1.5, pupil: '#1a2030' });

  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6.4, 6.2 + bob);
  ctx.quadraticCurveTo(0, 8.4 + bob, 6.4, 6.2 + bob);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-5.4, 6.4 + bob);
  ctx.lineTo(-2.6, 6.4 + bob);
  ctx.lineTo(-4, 9.6 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2.6, 6.4 + bob);
  ctx.lineTo(5.4, 6.4 + bob);
  ctx.lineTo(4, 9.6 + bob);
  ctx.closePath();
  ctx.fill();
}

function friendFish(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const body = def.color || '#3f6fa8';
  const lure = def.accent || '#8ef0d0';

  ctx.strokeStyle = alpha(body, 0.9);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(dir * 1.6, -13 + bob);
  ctx.quadraticCurveTo(dir * 3.4, -24 + bob, dir * 10, -26 + bob);
  ctx.stroke();
  ctx.fillStyle = alpha(lure, 0.28);
  ctx.beginPath();
  ctx.arc(dir * 10, -26 + bob, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lure;
  ctx.beginPath();
  ctx.arc(dir * 10, -26 + bob, 3, 0, TAU);
  ctx.fill();

  ctx.fillStyle = alpha(body, 0.92);
  ctx.beginPath();
  ctx.moveTo(-dir * 8, -3 + bob);
  ctx.quadraticCurveTo(-dir * 22, -13 + bob, -dir * 25, -2 + bob);
  ctx.quadraticCurveTo(-dir * 19, 1 + bob, -dir * 23, 9 + bob);
  ctx.quadraticCurveTo(-dir * 13, 7 + bob, -dir * 7, 4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = alpha(shade(body, 0.45), 0.85);
  ctx.beginPath();
  ctx.moveTo(-2, -12 + bob);
  ctx.quadraticCurveTo(1, -23 + bob, 9, -13 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, 8 + bob);
  ctx.quadraticCurveTo(0, 16 + bob, 8, 9 + bob);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createLinearGradient(0, -16 + bob, 0, 14 + bob);
  g.addColorStop(0, shade(body, 0.28));
  g.addColorStop(1, body);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -2 + bob, 13.6, 12.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha('#e8f4ff', 0.32);
  ctx.beginPath();
  ctx.ellipse(dir * 1.2, 4 + bob, 8.4, 5.8, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const tx = dir * (1.6 + i * 3);
    ctx.beginPath();
    ctx.moveTo(tx, 1.6 + bob);
    ctx.lineTo(tx + dir * 2.4, 1.6 + bob);
    ctx.lineTo(tx + dir * 1.2, 5.4 + bob);
    ctx.closePath();
    ctx.fill();
  }

  friendEyes(ctx, -6.4 + bob, { gap: 4.6, r: 2.4, blink, look: dir * 0.7, white: 1.6, pupil: '#0e2233' });

  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-dir * 4.4, -10.4 + bob);
  ctx.lineTo(-dir * 9, -12.6 + bob);
  ctx.stroke();
}

function friendJelly(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const bell = def.color || '#c77dff';
  const glow = def.accent || '#ffb3f0';

  ctx.strokeStyle = alpha(bell, 0.85);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    const sway = Math.sin(i * 1.7) * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, 0 + bob);
    ctx.bezierCurveTo(x + sway, 8 + bob, x - sway, 15 + bob, x + sway * 0.6, 21 + bob);
    ctx.stroke();
  }

  ctx.save();
  ctx.shadowColor = alpha(glow, 0.8);
  ctx.shadowBlur = 14;
  const g = ctx.createLinearGradient(0, -22 + bob, 0, 2 + bob);
  g.addColorStop(0, alpha(glow, 0.95));
  g.addColorStop(1, alpha(bell, 0.72));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14.6, -1.4 + bob);
  ctx.quadraticCurveTo(-15.4, -21 + bob, 0, -22 + bob);
  ctx.quadraticCurveTo(15.4, -21 + bob, 14.6, -1.4 + bob);
  ctx.quadraticCurveTo(7.4, 3.4 + bob, 0, -1.4 + bob);
  ctx.quadraticCurveTo(-7.4, 3.4 + bob, -14.6, -1.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = alpha('#ffffff', 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.35);
  ctx.beginPath();
  ctx.ellipse(-5.6, -15 + bob, 3.2, 2.4, -0.4, 0, TAU);
  ctx.ellipse(4.4, -17.4 + bob, 2.4, 1.8, 0.3, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -8.4 + bob, { gap: 3.6, r: 1.9, blink, look: dir * 0.8, pupil: '#2a1b3d' });

  ctx.strokeStyle = alpha('#2a1b3d', 0.8);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(dir * 0.6, -4.4 + bob, 2.4, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

function friendCrab(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const shell = def.color || '#e2452f';
  const shellDark = '#a82c1c';

  ctx.strokeStyle = shellDark;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = 4 + i * 4 + bob;
      ctx.beginPath();
      ctx.moveTo(side * 10, y);
      ctx.quadraticCurveTo(side * 16, y + 3, side * 19, y + 8 + legSwing * 0.2 * side);
      ctx.stroke();
    }
  }

  for (const side of [-1, 1]) {
    ctx.fillStyle = shade(shell, 0.12);
    ctx.beginPath();
    ctx.ellipse(side * 15.4, -6 + bob, 5.4, 4.6, side * 0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = FRIEND_INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = shellDark;
    ctx.beginPath();
    ctx.moveTo(side * 19.4, -9.4 + bob);
    ctx.lineTo(side * 22.4, -12 + bob);
    ctx.lineTo(side * 19.6, -6 + bob);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = shellDark;
  ctx.lineWidth = 2.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 4, -8 + bob);
    ctx.lineTo(side * 4.6, -17 + bob);
    ctx.stroke();
  }

  const g = ctx.createLinearGradient(0, -12 + bob, 0, 12 + bob);
  g.addColorStop(0, shade(shell, 0.24));
  g.addColorStop(1, shellDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -1 + bob, 14.6, 9.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = alpha('#000000', 0.18);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-9, -6.4 + bob);
  ctx.quadraticCurveTo(0, -10 + bob, 9, -6.4 + bob);
  ctx.moveTo(-8, 2.4 + bob);
  ctx.quadraticCurveTo(0, 6.4 + bob, 8, 2.4 + bob);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4.6, -17 + bob, 3.2, 0, TAU);
  ctx.arc(4.6, -17 + bob, 3.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  if (blink) {
    ctx.strokeStyle = '#20263a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6.4, -17 + bob);
    ctx.lineTo(-2.8, -17 + bob);
    ctx.moveTo(2.8, -17 + bob);
    ctx.lineTo(6.4, -17 + bob);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#20263a';
    ctx.beginPath();
    ctx.arc(-4.6 + dir * 0.8, -17 + bob, 1.5, 0, TAU);
    ctx.arc(4.6 + dir * 0.8, -17 + bob, 1.5, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = '#5a1a12';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -1.4 + bob, 3.6, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function friendSquid(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const body = def.color || '#7b4bd8';
  const light = def.accent || '#b9a3ff';

  ctx.strokeStyle = alpha(light, 0.9);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    const sway = Math.sin(i * 1.9) * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, 4 + bob);
    ctx.quadraticCurveTo(x + sway, 12 + bob, x - sway, 19 + bob);
    ctx.stroke();
  }

  ctx.fillStyle = alpha(light, 0.55);
  ctx.beginPath();
  ctx.moveTo(-6, -20 + bob);
  ctx.quadraticCurveTo(-14, -22 + bob, -12, -12 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -20 + bob);
  ctx.quadraticCurveTo(14, -22 + bob, 12, -12 + bob);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createLinearGradient(0, -24 + bob, 0, 8 + bob);
  g.addColorStop(0, shade(body, 0.3));
  g.addColorStop(1, alpha(body, 0.9));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10.6, 4 + bob);
  ctx.quadraticCurveTo(-12.6, -18 + bob, 0, -22 + bob);
  ctx.quadraticCurveTo(12.6, -18 + bob, 10.6, 4 + bob);
  ctx.quadraticCurveTo(0, 8 + bob, -10.6, 4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.3);
  ctx.beginPath();
  ctx.arc(-4.4, -13 + bob, 1.6, 0, TAU);
  ctx.arc(3.6, -16 + bob, 1.2, 0, TAU);
  ctx.arc(6.4, -8 + bob, 1.1, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -6 + bob, { gap: 4, r: 2.4, blink, look: dir * 0.8, white: 1.6, pupil: '#1b1230' });

  ctx.strokeStyle = '#2a1b3d';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2.4, 0.6 + bob);
  ctx.quadraticCurveTo(0, 2.6 + bob, 2.4, 0.6 + bob);
  ctx.stroke();
}

function friendSeahorse(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const body = def.color || '#ffb347';
  const fin = def.accent || '#6ee7ff';

  ctx.strokeStyle = shade(body, 0.1);
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(dir * 1.4, -8 + bob);
  ctx.bezierCurveTo(-dir * 6, -2 + bob, dir * 7, 6 + bob, -dir * 1, 13 + bob);
  ctx.stroke();
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-dir * 1, 13 + bob);
  ctx.bezierCurveTo(-dir * 8, 18 + bob, -dir * 2, 23 + bob, dir * 2, 20 + bob);
  ctx.stroke();

  ctx.strokeStyle = alpha('#ffffff', 0.5);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(dir * 1.4, -4 + i * 4 + bob, 4.4, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  ctx.fillStyle = alpha(fin, 0.85);
  ctx.beginPath();
  ctx.moveTo(-dir * 4, 0 + bob);
  ctx.quadraticCurveTo(-dir * 12, -4 + bob, -dir * 6, 8 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(dir * 1.4, -14 + bob, 8.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = shade(body, 0.15);
  rr(ctx, dir > 0 ? 6.4 : -14.4, -15.4 + bob, 8, 4.4, 2.2);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = alpha(fin, 0.9);
  ctx.beginPath();
  ctx.moveTo(-1.6, -21 + bob);
  ctx.lineTo(1.6, -27 + bob);
  ctx.lineTo(4.6, -20.4 + bob);
  ctx.closePath();
  ctx.fill();

  friendEyes(ctx, -15.4 + bob, { gap: 3, r: 1.8, blink, look: dir * 0.7, white: 1.1, pupil: '#2a1b10' });
}

function friendCoral(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const coral = def.color || '#ff7a9c';
  const coralDark = '#c94f74';

  ctx.fillStyle = '#2f4b57';
  rr(ctx, -13, 12 + bob, 26, 10, 5);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = coral;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 7, -6 + bob);
    ctx.quadraticCurveTo(side * 15, -12 + bob, side * 13, -20 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(side * 13, -16 + bob);
    ctx.quadraticCurveTo(side * 18, -18 + bob, side * 19, -22 + bob);
    ctx.stroke();
  }

  const g = ctx.createLinearGradient(0, -18 + bob, 0, 14 + bob);
  g.addColorStop(0, shade(coral, 0.28));
  g.addColorStop(1, coralDark);
  ctx.fillStyle = g;
  rr(ctx, -10.6, -18 + bob, 21.2, 30, 9);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.35);
  for (const [px, py, pr] of [[-4.4, -12, 1.6], [4.4, -9, 1.3], [-3, -4, 1.1], [5.6, 2.4, 1.2]]) {
    ctx.beginPath();
    ctx.arc(px, py + bob, pr, 0, TAU);
    ctx.fill();
  }

  friendEyes(ctx, -10.4 + bob, { gap: 4, r: 2.1, blink, look: dir * 0.8, white: 1.4, pupil: '#3a1526' });

  ctx.strokeStyle = '#7a2a44';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(dir * 0.6, -4.6 + bob, 2.6, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function friendStar(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const body = def.color || '#8fa2ff';
  const glow = def.accent || '#e0e6ff';

  ctx.save();
  ctx.translate(0, -8 + bob);
  ctx.rotate(Math.sin(bob * 0.3) * 0.06);
  ctx.shadowColor = alpha(glow, 0.9);
  ctx.shadowBlur = 18;
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 19 : 8;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = alpha('#ffffff', 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  friendEyes(ctx, -10 + bob, { gap: 4.4, r: 2, blink, look: dir * 0.7, white: 1.4, pupil: '#1b2230' });

  ctx.fillStyle = alpha('#ffffff', 0.8);
  for (const [sx, sy, sr] of [[-16, -20, 1.4], [15, -16, 1.1], [12, 4, 1.2]]) {
    ctx.beginPath();
    ctx.arc(sx, sy + bob, sr, 0, TAU);
    ctx.fill();
  }
}

function friendEye(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const iris = def.color || '#5eead4';
  const ring = def.accent || '#8fa2ff';

  ctx.strokeStyle = '#1e2a4a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    ctx.beginPath();
    ctx.moveTo(x, 8 + bob);
    ctx.quadraticCurveTo(x + (i % 2 ? 5 : -5), 16 + bob, x + (i % 2 ? -2 : 3), 22 + bob);
    ctx.stroke();
  }

  const g = ctx.createRadialGradient(-4, -22 + bob, 4, 0, -13 + bob, 22);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c9d4ea');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -13 + bob, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.strokeStyle = alpha('#ff6b8a', 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, -2 + bob);
  ctx.quadraticCurveTo(-8, -6 + bob, -11, -10 + bob);
  ctx.moveTo(12, -4 + bob);
  ctx.quadraticCurveTo(8, -8 + bob, 11, -12 + bob);
  ctx.stroke();

  if (blink) {
    ctx.fillStyle = '#c9d4ea';
    rr(ctx, -12, -14 + bob, 24, 13, 3);
    ctx.fill();
  } else {
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(dir * 2, -13 + bob, 7.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a1020';
    ctx.beginPath();
    ctx.arc(dir * 2.6, -13 + bob, 3.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dir * 1, -16 + bob, 1.5, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = ring;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -13 + bob, 19, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function friendWraith(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const cloak = def.color || '#3a3f5c';
  const cloakDark = '#1e2138';
  const glow = def.accent || '#8fa2ff';

  ctx.fillStyle = alpha(cloak, 0.85);
  ctx.beginPath();
  ctx.moveTo(-13, 6 + bob);
  ctx.quadraticCurveTo(-10, 16 + bob, -5, 20 + bob);
  ctx.quadraticCurveTo(-1, 14 + bob, 2, 20 + bob);
  ctx.quadraticCurveTo(7, 16 + bob, 11, 20 + bob);
  ctx.quadraticCurveTo(14, 12 + bob, 12, 5 + bob);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createLinearGradient(0, -26 + bob, 0, 12 + bob);
  g.addColorStop(0, shade(cloak, 0.18));
  g.addColorStop(1, cloakDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12.4, 6 + bob);
  ctx.quadraticCurveTo(-14, -16 + bob, 0, -26 + bob);
  ctx.quadraticCurveTo(14, -16 + bob, 12.4, 6 + bob);
  ctx.quadraticCurveTo(0, 11 + bob, -12.4, 6 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha('#ffffff', 0.12);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#0a0c16';
  ctx.beginPath();
  ctx.ellipse(dir * 1, -13 + bob, 7.4, 8.4, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-2.8 + dir, -14 + bob, 1.7, 0, TAU);
  ctx.arc(3.4 + dir, -14 + bob, 1.7, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = alpha(cloak, 0.95);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -6 + bob);
  ctx.quadraticCurveTo(-17, 0 + bob, -14, 6 + bob);
  ctx.moveTo(11, -6 + bob);
  ctx.quadraticCurveTo(17, 0 + bob, 14, 6 + bob);
  ctx.stroke();
}

function friendMoon(ctx, def, o) {
  const { bob = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const pale = def.color || '#f0ead6';
  const glow = def.accent || '#8fa2ff';

  ctx.save();
  ctx.shadowColor = alpha(glow, 0.85);
  ctx.shadowBlur = 20;
  ctx.fillStyle = pale;
  ctx.beginPath();
  ctx.arc(0, -12 + bob, 15.6, Math.PI * 0.32, Math.PI * 1.68);
  ctx.arc(dir * 6.4, -12 + bob, 12.4, Math.PI * 1.68, Math.PI * 0.32, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = alpha('#ffffff', 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = alpha('#c9c2ad', 0.5);
  ctx.beginPath();
  ctx.arc(-6.4, -18 + bob, 2.4, 0, TAU);
  ctx.arc(-8.4, -7 + bob, 1.6, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(-4, 0);
  friendEyes(ctx, -14 + bob, { gap: 3.4, r: 1.9, blink, look: dir * 0.6, pupil: '#2a2a44' });
  ctx.restore();

  ctx.strokeStyle = '#8a7f6a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-5.4 + dir, -8.4 + bob, 2.4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = alpha(glow, 0.9);
  for (const [sx, sy, sr] of [[15, -24, 1.6], [18, -6, 1.2], [10, 6, 1.4], [-16, 2, 1.2]]) {
    ctx.beginPath();
    ctx.arc(sx, sy + bob, sr, 0, TAU);
    ctx.fill();
  }
}

function friendMeteor(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const rock = def.color || '#8a4a2a';
  const rockDark = '#5c2f17';
  const flame = def.accent || '#ffb347';

  for (let i = 0; i < 3; i++) {
    const fx = -dir * (10 + i * 5);
    const fy = 4 + i * 4 + bob;
    ctx.fillStyle = alpha(flame, 0.5 - i * 0.12);
    ctx.beginPath();
    ctx.moveTo(fx + dir * 4, fy - 6);
    ctx.quadraticCurveTo(fx - dir * 12, fy, fx - dir * 8, fy + 10);
    ctx.quadraticCurveTo(fx + dir * 2, fy + 6, fx + dir * 4, fy + 2);
    ctx.closePath();
    ctx.fill();
  }

  const g = ctx.createRadialGradient(-4, -18 + bob, 3, 0, -8 + bob, 22);
  g.addColorStop(0, shade(rock, 0.3));
  g.addColorStop(1, rockDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -8 + bob, 15.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha('#000000', 0.22);
  for (const [cx, cy, cr] of [[-7, -16, 3], [5, -18, 2.2], [8, -2, 2.6], [-4, 1, 2]]) {
    ctx.beginPath();
    ctx.arc(cx, cy + bob, cr, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.ellipse(-4.4, -10 + bob, 2.8, 3.2, 0.2, 0, TAU);
  ctx.ellipse(4.4, -10 + bob, 2.8, 3.2, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1b1010';
  ctx.beginPath();
  ctx.arc(-4 + dir, -10 + bob, 1.3, 0, TAU);
  ctx.arc(4.8 + dir, -10 + bob, 1.3, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = rockDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8.4, -15 + bob);
  ctx.lineTo(-1.6, -13 + bob);
  ctx.moveTo(8.4, -15 + bob);
  ctx.lineTo(1.6, -13 + bob);
  ctx.stroke();
  ctx.strokeStyle = '#2a1008';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, -1 + bob);
  ctx.quadraticCurveTo(0, -3 + bob, 4, -1 + bob);
  ctx.stroke();
}

function friendGlitch(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const dark = def.color || '#2f3350';
  const glow = def.accent || '#5eead4';

  const blocks = [
    [-11, -8, 8, 8], [-2, -10, 9, 6], [8, -6, 6, 9],
    [-10, 1, 11, 8], [2, 2, 8, 7], [-6, 10, 9, 8], [4, 11, 7, 6],
  ];
  for (let i = 0; i < blocks.length; i++) {
    const [rx, ry, rw, rh] = blocks[i];
    const jitter = ((i * 7) % 5) - 2;
    ctx.fillStyle = i % 3 === 0 ? shade(dark, 0.16) : dark;
    ctx.globalAlpha = 0.85 + (i % 2) * 0.15;
    ctx.fillRect(rx * dir + jitter, ry + bob, rw, rh);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = shade(dark, 0.1);
  ctx.fillRect(-9, -26 + bob, 18, 15);

  ctx.fillStyle = glow;
  ctx.fillRect(-6 + dir, -21 + bob, 4, 3);
  ctx.fillRect(2 + dir, -21 + bob, 4, 3);

  ctx.fillStyle = alpha(glow, 0.5);
  ctx.fillRect(-15, -18 + bob, 4, 2);
  ctx.fillRect(12, -3 + bob, 5, 2);
  ctx.fillRect(9, 8 + bob, 3, 3);
  ctx.fillStyle = alpha('#ffffff', 0.35);
  ctx.fillRect(-13, 4 + bob, 3, 2);
}

function friendPumpkin(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1 } = o;
  const rind = def.color || '#ff8a3d';
  const rindDark = '#c95a1c';
  const stem = def.accent || '#5fbf4a';
  const glow = '#ffe38a';

  ctx.fillStyle = '#3a2a1a';
  rr(ctx, -8.6, 16.2 + bob + legSwing * 0.2, 8, 5.2, 2.4);
  ctx.fill();
  rr(ctx, 0.6, 16.2 + bob - legSwing * 0.2, 8, 5.2, 2.4);
  ctx.fill();

  const g = ctx.createRadialGradient(-5, -16 + bob, 4, 0, -6 + bob, 21);
  g.addColorStop(0, shade(rind, 0.35));
  g.addColorStop(1, rindDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -6 + bob, 15.6, 14.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = alpha('#7a2f0c', 0.35);
  ctx.lineWidth = 1.4;
  for (const rx of [-9, -4.5, 4.5, 9]) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.55, -18.4 + bob);
    ctx.quadraticCurveTo(rx * 1.45, -6 + bob, rx * 0.55, 6.4 + bob);
    ctx.stroke();
  }

  ctx.strokeStyle = stem;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -19 + bob);
  ctx.quadraticCurveTo(2, -26 + bob, 6.4, -27 + bob);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = alpha(glow, 0.9);
  ctx.shadowBlur = 12;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-9.6, -12 + bob);
  ctx.lineTo(-3.2, -12 + bob);
  ctx.lineTo(-6.4, -4.8 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9.6, -12 + bob);
  ctx.lineTo(3.2, -12 + bob);
  ctx.lineTo(6.4, -4.8 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9.4, 1.4 + bob);
  ctx.lineTo(-5.4, 4.8 + bob);
  ctx.lineTo(-2.2, 1.8 + bob);
  ctx.lineTo(0.6, 5 + bob);
  ctx.lineTo(3.6, 1.8 + bob);
  ctx.lineTo(6.4, 4.8 + bob);
  ctx.lineTo(9.4, 1.4 + bob);
  ctx.lineTo(9.4, 6.4 + bob);
  ctx.quadraticCurveTo(0, 9.6 + bob, -9.4, 6.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function friendGhost(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const sheet = def.color || '#eef4ff';
  const glow = def.accent || '#8fa2ff';

  ctx.save();
  ctx.shadowColor = alpha(glow, 0.8);
  ctx.shadowBlur = 16;
  const g = ctx.createLinearGradient(0, -26 + bob, 0, 10 + bob);
  g.addColorStop(0, alpha('#ffffff', 0.96));
  g.addColorStop(1, alpha(sheet, 0.72));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -5 + bob, 14, Math.PI, TAU);
  ctx.quadraticCurveTo(13.4, 8 + bob, 8, 4.4 + bob);
  ctx.quadraticCurveTo(4, 10.4 + bob, 0, 5.4 + bob);
  ctx.quadraticCurveTo(-4, 10.4 + bob, -8, 4.4 + bob);
  ctx.quadraticCurveTo(-13.4, 8 + bob, -14, -5 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = alpha(glow, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.5);
  ctx.beginPath();
  ctx.ellipse(-5, -15 + bob, 3.2, 2.2, -0.4, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -9 + bob, { gap: 3.8, r: 2.1, blink: false, look: dir * 0.7, pupil: '#25304a' });

  ctx.fillStyle = '#25304a';
  ctx.beginPath();
  ctx.ellipse(dir * 0.6, -2.4 + bob, 2.2, 2.8, 0, 0, TAU);
  ctx.fill();
}

function friendBat(ctx, def, o) {
  const { bob = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const fur = def.color || '#9b5de5';
  const furDark = '#6b3aa8';

  for (const side of [-1, 1]) {
    ctx.fillStyle = alpha(furDark, 0.92);
    ctx.beginPath();
    ctx.moveTo(side * 5, -10 + bob);
    ctx.quadraticCurveTo(side * 17, -20 + bob, side * 25, -10 + bob);
    ctx.quadraticCurveTo(side * 18, -5 + bob, side * 19, 0 + bob);
    ctx.quadraticCurveTo(side * 13, -2 + bob, side * 12, 5 + bob);
    ctx.quadraticCurveTo(side * 8, 0 + bob, side * 4, 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FRIEND_INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.strokeStyle = alpha(fur, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(side * 8, -8 + bob);
    ctx.quadraticCurveTo(side * 19, -12 + bob, side * 24, -10 + bob);
    ctx.stroke();
  }

  const g = ctx.createLinearGradient(0, -18 + bob, 0, 12 + bob);
  g.addColorStop(0, shade(fur, 0.25));
  g.addColorStop(1, furDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -3 + bob, 9.6, 12.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-8.6, -12 + bob);
  ctx.lineTo(-9.6, -24 + bob);
  ctx.lineTo(-2.6, -15 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8.6, -12 + bob);
  ctx.lineTo(9.6, -24 + bob);
  ctx.lineTo(2.6, -15 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.ellipse(-3.8, -8 + bob, 2.6, 3, 0.2, 0, TAU);
  ctx.ellipse(3.8, -8 + bob, 2.6, 3, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1b1020';
  ctx.beginPath();
  ctx.arc(-3.4 + dir, -8 + bob, 1.2, 0, TAU);
  ctx.arc(4.2 + dir, -8 + bob, 1.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-3.4, 2 + bob);
  ctx.lineTo(-1.4, 2 + bob);
  ctx.lineTo(-2.4, 5.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.4, 2 + bob);
  ctx.lineTo(3.4, 2 + bob);
  ctx.lineTo(2.4, 5.4 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = furDark;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4.4, 8 + bob);
  ctx.lineTo(-5.4, 13 + bob);
  ctx.moveTo(4.4, 8 + bob);
  ctx.lineTo(5.4, 13 + bob);
  ctx.stroke();
}

function friendWitch(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const robe = def.color || '#7b4bd8';
  const robeDark = '#4a2a8a';
  const skin = def.accent || '#8fe08a';
  const hair = '#3a2a1a';

  ctx.fillStyle = '#2a1a33';
  rr(ctx, -9.2, 18.8 + bob + legSwing * 0.2, 8.4, 4.4, 2.1);
  ctx.fill();
  rr(ctx, 0.4, 18.8 + bob - legSwing * 0.2, 8.4, 4.4, 2.1);
  ctx.fill();

  const g = ctx.createLinearGradient(0, -12 + bob, 0, 20 + bob);
  g.addColorStop(0, shade(robe, 0.2));
  g.addColorStop(1, robeDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, -8 + bob);
  ctx.lineTo(-15, 19 + bob);
  ctx.quadraticCurveTo(0, 22 + bob, 15, 19 + bob);
  ctx.lineTo(8, -8 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = alpha('#ffffff', 0.16);
  rr(ctx, -8, -10 + bob, 16, 5, 2.5);
  ctx.fill();

  ctx.fillStyle = robeDark;
  rr(ctx, -13.4, -6 + bob, 4.4, 10, 2.2);
  ctx.fill();
  rr(ctx, 9, -6 + bob, 4.4, 10, 2.2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-11.2, 5 + bob, 2.2, 0, TAU);
  ctx.arc(11.2, 5 + bob, 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -16 + bob, 9.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = shade(skin, 0.2);
  ctx.beginPath();
  ctx.ellipse(dir * 4.4, -13.6 + bob, 2.4, 2, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(-8, -14 + bob, 3, 6, 0.2, 0, TAU);
  ctx.ellipse(8, -14 + bob, 3, 6, -0.2, 0, TAU);
  ctx.fill();

  friendEyes(ctx, -16.4 + bob, { gap: 3.4, r: 2, blink, look: dir * 0.8, white: 0.9, pupil: '#2a1b10' });

  ctx.strokeStyle = '#2a1b10';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(dir * 1.2, -11.4 + bob, 2.4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = robeDark;
  ctx.beginPath();
  ctx.ellipse(dir * 1.2, -22.6 + bob, 14.4, 3.4, -dir * 0.04, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-8.4, -23 + bob);
  ctx.quadraticCurveTo(-4, -32 + bob, 2.4, -36 + bob);
  ctx.quadraticCurveTo(5, -30 + bob, 8.4, -23 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#ffd166';
  rr(ctx, -2.6, -25 + bob, 5.4, 4.2, 1);
  ctx.fill();
}

function friendVampire(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1, blink = false } = o;
  const dir = facing >= 0 ? 1 : -1;
  const cape = def.color || '#2f3350';
  const lining = def.accent || '#e2452f';
  const suit = '#1b1e30';
  const skin = '#f0e2d2';

  ctx.fillStyle = lining;
  ctx.beginPath();
  ctx.moveTo(-9, -10 + bob);
  ctx.quadraticCurveTo(-20, 4 + bob, -16, 20 + bob + legSwing * 0.2);
  ctx.quadraticCurveTo(0, 14 + bob, 16, 20 + bob - legSwing * 0.2);
  ctx.quadraticCurveTo(20, 4 + bob, 9, -10 + bob);
  ctx.closePath();
  ctx.fill();

  for (const side of [-1, 1]) {
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(side * 7, -10 + bob);
    ctx.quadraticCurveTo(side * 17, 2 + bob, side * 14, 19 + bob);
    ctx.quadraticCurveTo(side * 9, 12 + bob, side * 6, 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alpha(lining, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  ctx.fillStyle = '#12141f';
  rr(ctx, -8.8, 17.6 + bob + legSwing * 0.2, 8, 5, 2.4);
  ctx.fill();
  rr(ctx, 0.8, 17.6 + bob - legSwing * 0.2, 8, 5, 2.4);
  ctx.fill();

  ctx.fillStyle = suit;
  rr(ctx, -7.8, 8 + bob + legSwing * 0.2, 6.8, 10, 3);
  ctx.fill();
  rr(ctx, 1, 8 + bob - legSwing * 0.2, 6.8, 10, 3);
  ctx.fill();

  ctx.fillStyle = suit;
  rr(ctx, -9.8, -8 + bob, 19.6, 17, 7.4);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = alpha(lining, 0.9);
  ctx.beginPath();
  ctx.moveTo(-3.4, -8 + bob);
  ctx.lineTo(3.4, -8 + bob);
  ctx.lineTo(0, 2.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0e2d2';
  ctx.beginPath();
  ctx.arc(0, -7.4 + bob, 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = suit;
  rr(ctx, -13.4, -6 + bob, 4.2, 10, 2.1);
  ctx.fill();
  rr(ctx, 9.2, -6 + bob, 4.2, 10, 2.1);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-11.4, 5 + bob, 2.1, 0, TAU);
  ctx.arc(11.4, 5 + bob, 2.1, 0, TAU);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -17 + bob, 9.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = '#141024';
  ctx.beginPath();
  ctx.arc(0, -19.4 + bob, 9.9, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5.4, -19.6 + bob);
  ctx.lineTo(5.4, -19.6 + bob);
  ctx.lineTo(0, -13.4 + bob);
  ctx.closePath();
  ctx.fill();

  friendEyes(ctx, -17.2 + bob, { gap: 3.4, r: 2, blink, look: dir * 0.8, white: 1, pupil: '#c2172a' });

  ctx.strokeStyle = '#141024';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6.4, -22.6 + bob);
  ctx.lineTo(-1.6, -21.2 + bob);
  ctx.moveTo(6.4, -22.6 + bob);
  ctx.lineTo(1.6, -21.2 + bob);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-3.2, -9.6 + bob);
  ctx.lineTo(-1.2, -9.6 + bob);
  ctx.lineTo(-2.2, -6.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.2, -9.6 + bob);
  ctx.lineTo(3.2, -9.6 + bob);
  ctx.lineTo(2.2, -6.4 + bob);
  ctx.closePath();
  ctx.fill();
}

function friendMummy(ctx, def, o) {
  const { bob = 0, legSwing = 0, facing = 1 } = o;
  const dir = facing >= 0 ? 1 : -1;
  const wrap = def.color || '#e8e0c8';
  const wrapDark = '#b3aa92';
  const glow = '#8fe08a';

  ctx.strokeStyle = alpha(wrap, 0.9);
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-dir * 8, 6 + bob);
  ctx.bezierCurveTo(-dir * 18, 10 + bob, -dir * 22, 4 + bob, -dir * 26, 14 + bob);
  ctx.stroke();

  ctx.fillStyle = wrap;
  rr(ctx, -8, 8 + bob + legSwing * 0.2, 6.8, 10.4, 3);
  ctx.fill();
  rr(ctx, 1.2, 8 + bob - legSwing * 0.2, 6.8, 10.4, 3);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = wrap;
  rr(ctx, -9.8, -8 + bob, 19.6, 17.4, 7.6);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.strokeStyle = alpha(wrapDark, 0.9);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-9.4, -5 + i * 3.6 + bob);
    ctx.lineTo(9.4, -6.6 + i * 3.6 + bob);
    ctx.stroke();
  }

  ctx.fillStyle = wrap;
  rr(ctx, -13.4, -6 + bob, 4.4, 10, 2.2);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  rr(ctx, 9, -6 + bob, 4.4, 10, 2.2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = alpha(wrapDark, 0.85);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11.2, 3 + bob);
  ctx.lineTo(-11.8, 10 + bob);
  ctx.moveTo(11.2, 3 + bob);
  ctx.lineTo(11.8, 10 + bob);
  ctx.stroke();

  ctx.fillStyle = wrap;
  ctx.beginPath();
  ctx.arc(0, -17 + bob, 9.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FRIEND_INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.strokeStyle = alpha(wrapDark, 0.9);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-9, -21 + i * 4 + bob);
    ctx.lineTo(9, -22.4 + i * 4 + bob);
    ctx.stroke();
  }

  ctx.fillStyle = '#2a2434';
  rr(ctx, -6.6, -21.6 + bob, 13.2, 3.6, 1.6);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-3.4, -19.8 + bob, 1.4, 0, TAU);
  ctx.arc(3.4, -19.8 + bob, 1.4, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawFriend(ctx, def, opts = {}) {
  ctx.save();
  if (opts.shadow) friendShadow(ctx);
  if (def.look === 'dino') {
    drawDino(ctx, def.id, { ...opts, shadow: false });
    ctx.restore();
    return;
  }
  switch (def.look) {
    case 'plumber':
      friendPlumber(ctx, def, opts);
      break;
    case 'peach':
      friendPeach(ctx, def, opts);
      break;
    case 'toad':
      friendToad(ctx, def, opts);
      break;
    case 'turtle':
      friendBowser(ctx, def, opts);
      break;
    case 'ape':
      friendApe(ctx, def, opts);
      break;
    case 'bones':
      friendBones(ctx, def, opts);
      break;
    case 'rock':
      friendThwomp(ctx, def, opts);
      break;
    case 'plant':
      friendPlant(ctx, def, opts);
      break;
    case 'goomba':
      friendGoomba(ctx, def, opts);
      break;
    case 'fish':
      friendFish(ctx, def, opts);
      break;
    case 'jelly':
      friendJelly(ctx, def, opts);
      break;
    case 'crab':
      friendCrab(ctx, def, opts);
      break;
    case 'squid':
      friendSquid(ctx, def, opts);
      break;
    case 'seahorse':
      friendSeahorse(ctx, def, opts);
      break;
    case 'coral':
      friendCoral(ctx, def, opts);
      break;
    case 'star':
      friendStar(ctx, def, opts);
      break;
    case 'eye':
      friendEye(ctx, def, opts);
      break;
    case 'wraith':
      friendWraith(ctx, def, opts);
      break;
    case 'moon':
      friendMoon(ctx, def, opts);
      break;
    case 'meteor':
      friendMeteor(ctx, def, opts);
      break;
    case 'glitch':
      friendGlitch(ctx, def, opts);
      break;
    case 'pumpkin':
      friendPumpkin(ctx, def, opts);
      break;
    case 'ghost':
      friendGhost(ctx, def, opts);
      break;
    case 'bat':
      friendBat(ctx, def, opts);
      break;
    case 'witch':
      friendWitch(ctx, def, opts);
      break;
    case 'vampire':
      friendVampire(ctx, def, opts);
      break;
    case 'mummy':
      friendMummy(ctx, def, opts);
      break;
    default:
      drawFaller(ctx, def, { ...opts, shadow: false });
      break;
  }
  ctx.restore();
}
