import { POWERUPS, STORM, VIEW, touchLayout } from './config.js';
import { TAU, alpha, clamp, fmt, rr } from '../core/utils.js';
import { COLORS, font } from './ui.js';
import { drawIcon } from './entities.js';

export class HUD {
  constructor(game) {
    this.game = game;
  }

  render(ctx) {
    const g = this.game;
    const run = g.run;
    if (!run) return;
    const pal = g.palette;
    const t = g.time;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = 'rgba(6,10,18,0.42)';
    rr(ctx, 18, 18, 190, 118, 16);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.accent, 0.22);
    ctx.lineWidth = 1;
    rr(ctx, 18, 18, 190, 118, 16);
    ctx.stroke();

    for (let i = 0; i < run.maxHearts; i++) {
      g.ui.heart(ctx, 38 + i * 26, 44, 10, i < run.hearts, g._lucky ? '#ffd166' : undefined);
    }

    g.ui.text(ctx, 'DEPTH', 34, 74, { size: 10, weight: 800, color: COLORS.muted });
    g.ui.text(ctx, `${Math.floor(run.depth)}`, 34, 104, { size: 32, weight: 900, color: '#ffffff' });
    const dw = ctx.measureText(`${Math.floor(run.depth)}`).width;
    g.ui.text(ctx, 'm', 40 + dw, 104, { size: 14, weight: 700, color: alpha(pal.accent, 0.9) });

    g.ui.text(ctx, `SCORE ${fmt(run.score)}`, 34, 126, { size: 12, weight: 700, color: COLORS.muted });

    ctx.textAlign = 'right';
    const gemX = VIEW.w - 32;
    g.ui.text(ctx, `${run.gems}`, gemX, 46, { size: 24, weight: 900, color: '#ffffff', align: 'right' });
    g.ui.gem(ctx, gemX - ctx.measureText(`${run.gems}`).width - 22, 38, 9, pal.gem, t);
    g.ui.text(ctx, `DESCENT ${g.world.cycle + 1}`, gemX, 66, {
      size: 9.5, weight: 800, color: COLORS.muted, align: 'right',
    });

    let py = 82;
    for (const key of Object.keys(POWERUPS)) {
      const timer = g.player.powerups[key];
      const active = key === 'shield' ? g.player.shield : timer > 0;
      if (!active) continue;
      const def = POWERUPS[key];
      ctx.fillStyle = 'rgba(8,12,22,0.6)';
      rr(ctx, VIEW.w - 74, py - 16, 42, 32, 10);
      ctx.fill();
      ctx.strokeStyle = alpha(def.color, 0.6);
      ctx.lineWidth = 1.4;
      rr(ctx, VIEW.w - 74, py - 16, 42, 32, 10);
      ctx.stroke();
      g.ui.icon(ctx, key, VIEW.w - 53, py, 9, def.color);
      if (key !== 'shield' && def.duration > 0) {
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(VIEW.w - 53, py, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(timer / def.duration, 0, 1));
        ctx.stroke();
      }
      py += 38;
    }

    if (run.mult > 1) {
      const cx = VIEW.w / 2;
      const w = 132;
      ctx.fillStyle = 'rgba(8,12,22,0.6)';
      rr(ctx, cx - w / 2, 18, w, 46, 14);
      ctx.fill();
      ctx.strokeStyle = alpha(pal.accent, 0.5);
      ctx.lineWidth = 1.4;
      rr(ctx, cx - w / 2, 18, w, 46, 14);
      ctx.stroke();
      ctx.textAlign = 'center';
      g.ui.text(ctx, `x${run.mult}`, cx, 44, { size: 24, weight: 900, color: pal.accent2, align: 'center', glow: alpha(pal.accent2, 0.7) });
      ctx.textAlign = 'left';
      g.ui.bar(ctx, cx - w / 2 + 16, 54, w - 32, 4, clamp(run.comboTimer / 2.6, 0, 1), { color: pal.accent2 });
    }

    if (run.combo > 0) {
      g.ui.text(ctx, `${run.combo} chain`, VIEW.w / 2, 82, { size: 11, weight: 700, color: COLORS.muted, align: 'center' });
    }

    const dashReady = clamp(1 - g.player.dashCd / 0.85, 0, 1);
    ctx.fillStyle = 'rgba(6,10,18,0.4)';
    rr(ctx, 18, VIEW.h - 40, 120, 20, 10);
    ctx.fill();
    ctx.fillStyle = alpha(pal.accent, dashReady >= 1 ? 0.9 : 0.45);
    rr(ctx, 21, VIEW.h - 37, 114 * dashReady, 14, 7);
    ctx.fill();
    g.ui.text(ctx, dashReady >= 1 ? 'DASH READY' : 'DASH', 24, VIEW.h - 26, {
      size: 9, weight: 800, color: dashReady >= 1 ? '#08101c' : COLORS.muted,
    });

    const warn = g.world.stormWarning(g.player);
    if (warn > 0.02) {
      const bandH = 26 + warn * 46;
      const grad = ctx.createLinearGradient(0, 0, 0, bandH);
      grad.addColorStop(0, `rgba(40,4,30,${0.35 + warn * 0.5})`);
      grad.addColorStop(1, 'rgba(40,4,30,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW.w, bandH);
      ctx.textAlign = 'center';
      const pulse = 0.6 + 0.4 * Math.sin(t * 9);
      g.ui.text(ctx, warn > 0.65 ? 'THE STORM IS ON YOU' : 'THE STORM IS CLOSING IN', VIEW.w / 2, 32, {
        size: 13, weight: 900, color: `rgba(255,120,150,${pulse})`, align: 'center',
      });
      ctx.textAlign = 'left';
    }

    if (g.biomeBanner && g.biomeBanner.t > 0) {
      const b = g.biomeBanner;
      const k = 1 - b.t / b.max;
      const a = b.t > b.max - 0.5 ? (b.max - b.t) / 0.5 : Math.min(1, b.t / 0.7);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.textAlign = 'center';
      g.ui.text(ctx, b.name.toUpperCase(), VIEW.w / 2, 168 - k * 10, { size: 30, weight: 900, color: '#ffffff', align: 'center', glow: alpha(pal.accent, 0.8) });
      g.ui.text(ctx, b.tagline, VIEW.w / 2, 194 - k * 10, { size: 13, weight: 600, color: alpha('#ffffff', 0.75), align: 'center' });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    if (g.toasts.length) {
      let ty = 226;
      for (const toast of g.toasts) {
        const a = clamp(toast.t / 0.4, 0, 1);
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.font = font(14, 800);
        const w = ctx.measureText(toast.text).width + 34;
        ctx.fillStyle = 'rgba(8,12,22,0.78)';
        rr(ctx, VIEW.w / 2 - w / 2, ty - 16, w, 30, 15);
        ctx.fill();
        ctx.strokeStyle = alpha(toast.color || pal.accent, 0.6);
        ctx.lineWidth = 1.2;
        rr(ctx, VIEW.w / 2 - w / 2, ty - 16, w, 30, 15);
        ctx.stroke();
        g.ui.text(ctx, toast.text, VIEW.w / 2, ty + 5, { size: 14, weight: 800, color: '#ffffff', align: 'center' });
        ctx.globalAlpha = 1;
        ty += 38;
      }
      ctx.textAlign = 'left';
    }

    if (g.showTouch) this.renderTouch(ctx, pal);
    ctx.restore();
  }

  renderTouch(ctx, pal) {
    const g = this.game;
    const boxes = touchLayout(g.progress.settings.hand);
    const touch = g.input.touch;
    const pad = (b, active, radius = 26) => {
      ctx.fillStyle = active ? alpha(pal.accent, 0.26) : 'rgba(255,255,255,0.07)';
      rr(ctx, b.x, b.y, b.w, b.h, radius);
      ctx.fill();
      ctx.strokeStyle = active ? alpha(pal.accent, 0.8) : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.8;
      rr(ctx, b.x, b.y, b.w, b.h, radius);
      ctx.stroke();
    };

    // one thumb steers on its own pads, the other jumps and dashes
    for (const name of ['left', 'right']) {
      const b = boxes[name];
      const held = touch[name];
      pad(b, held, 24);
      const dir = name === 'left' ? -1 : 1;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      ctx.strokeStyle = alpha('#ffffff', held ? 0.95 : 0.6);
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + dir * -8, cy - 16);
      ctx.lineTo(cx + dir * 12, cy);
      ctx.lineTo(cx + dir * -8, cy + 16);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    const labelled = (b, text, size, active) => {
      pad(b, active);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      g.ui.text(ctx, text, b.x + b.w / 2, b.y + b.h / 2, {
        size, weight: 900, color: active ? '#ffffff' : 'rgba(255,255,255,0.85)', align: 'center',
      });
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    };
    labelled(boxes.dash, 'DASH', 13, touch.dash);
    labelled(boxes.jump, 'JUMP', 18, touch.jump);
  }
}
