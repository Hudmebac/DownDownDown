import { CHARACTERS, TRAILS, VIEW } from './config.js';
import { MAX_PROFILES } from './profiles.js';
import { COLORS, font } from './ui.js';
import { TAU, alpha, clamp, fmt, rr } from '../core/utils.js';

const BTN = { primary: { variant: 'primary' }, secondary: { variant: 'secondary' } };

export class Screens {
  constructor(game) {
    this.game = game;
    this.deleteArm = { id: null, until: 0 };
  }

  render(ctx) {
    const g = this.game;
    switch (g.state) {
      case 'MENU':
        this.menu(ctx);
        break;
      case 'HOWTO':
        this.howTo(ctx);
        break;
      case 'HANGAR':
        this.hangar(ctx);
        break;
      case 'PROFILES':
        this.profiles(ctx);
        break;
      case 'SETTINGS':
        this.settings(ctx);
        break;
      case 'PAUSED':
        this.pause(ctx);
        break;
      case 'GAMEOVER':
        this.results(ctx);
        break;
      default:
        break;
    }
  }

  _scrim(ctx, strength = 0.72) {
    const grad = ctx.createLinearGradient(0, 0, VIEW.w, 0);
    grad.addColorStop(0, `rgba(4,7,14,${strength})`);
    grad.addColorStop(0.62, `rgba(4,7,14,${strength * 0.75})`);
    grad.addColorStop(1, `rgba(4,7,14,${strength * 0.25})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }

  menu(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    const t = g.time;
    this._scrim(ctx, 0.7);

    ctx.save();
    ctx.translate(88, 0);
    ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      const y = 128 + i * 50 + Math.sin(t * 1.3 + i * 0.7) * 3;
      ctx.save();
      ctx.translate(Math.sin(t * 0.9 + i) * 5, y);
      ctx.font = font(52, 900);
      const grad = ctx.createLinearGradient(0, -38, 0, 8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, pal.accent);
      ctx.fillStyle = grad;
      ctx.shadowColor = alpha(pal.accent, 0.55);
      ctx.shadowBlur = 26;
      ctx.fillText('DOWN', 0, 0);
      ctx.restore();
    }
    ctx.restore();

    ui.text(ctx, 'an endless descent', 88, 268, { size: 15, weight: 600, color: COLORS.muted });

    if (ui.button(ctx, 88, 292, 300, 62, 'PLAY', { ...BTN.primary, size: 24, sub: 'Enter / Space', id: 'play' })) {
      g.startRun();
    }
    if (ui.button(ctx, 88, 364, 300, 40, 'HOW TO PLAY', { size: 14, id: 'howto' })) g.setState('HOWTO');
    if (ui.button(ctx, 88, 412, 300, 40, 'HANGAR', { size: 14, id: 'hangar' })) g.setState('HANGAR');
    if (ui.button(ctx, 88, 460, 300, 40, 'PROFILES', { size: 14, id: 'profiles' })) g.setState('PROFILES');
    if (ui.button(ctx, 88, 508, 300, 40, 'SETTINGS', { size: 14, id: 'settings' })) g.setState('SETTINGS');

    const best = g.progress.data.best;
    ctx.textAlign = 'left';
    ui.text(ctx, `BEST ${best}m`, 88, 566, { size: 13, weight: 800, color: 'rgba(255,255,255,0.85)' });
    ui.gem(ctx, 208, 561, 8, pal.gem, t);
    ui.text(ctx, `${fmt(g.progress.data.shards)}`, 224, 566, { size: 13, weight: 800, color: 'rgba(255,255,255,0.85)' });

    ui.text(ctx, 'Press M to mute · Click PLAY or press Enter to start', 88, 590, { size: 11, weight: 600, color: 'rgba(255,255,255,0.35)' });

    if (ui.button(ctx, 700, 22, 232, 34, `PROFILE · ${g.profiles.active.name}`, { size: 11, id: 'profile-chip' })) {
      g.setState('PROFILES');
    }

    const s = g.progress.settings;
    const musicOn = s.music > 0;
    const sfxOn = s.sfx > 0;
    ui.panel(ctx, 700, 64, 232, 84, { radius: 12, fill: 'rgba(8,13,24,0.72)', shadow: false });
    ui.text(ctx, 'AUDIO', 716, 82, { size: 8.5, weight: 800, color: COLORS.muted });
    ui.text(ctx, 'MUSIC', 716, 105, { size: 9, weight: 700, color: 'rgba(238,244,255,0.62)' });
    const musicOnHit = this._radio(ctx, 806, 102, 'ON', musicOn);
    const musicOffHit = this._radio(ctx, 866, 102, 'OFF', !musicOn);
    if (musicOnHit && !musicOn) {
      s.music = 0.45;
      g.audio.setMusic(s.music);
      g.progress.save();
    } else if (musicOffHit && musicOn) {
      s.music = 0;
      g.audio.setMusic(0);
      g.progress.save();
    }
    ui.text(ctx, 'SFX', 716, 127, { size: 9, weight: 700, color: 'rgba(238,244,255,0.62)' });
    const sfxOnHit = this._radio(ctx, 806, 124, 'ON', sfxOn);
    const sfxOffHit = this._radio(ctx, 866, 124, 'OFF', !sfxOn);
    if (sfxOnHit && !sfxOn) {
      s.sfx = 0.7;
      g.audio.setSfx(s.sfx);
      g.audio.sfx('ui');
      g.progress.save();
    } else if (sfxOffHit && sfxOn) {
      s.sfx = 0;
      g.audio.setSfx(0);
      g.progress.save();
    }

    const px = 724;
    const platY = 404 + Math.sin(t * 1.1) * 4;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = alpha(pal.platformBody, 0.9);
    rr(ctx, px - 128, platY, 256, 16, 8);
    ctx.fill();
    ctx.fillStyle = alpha(pal.platformTop, 0.85);
    rr(ctx, px - 124, platY + 1, 248, 4, 2);
    ctx.fill();
    ctx.restore();
    ui.character(ctx, g.progress.char, px, platY - 22, 2.9, t);

    for (let i = 0; i < 5; i++) {
      const gx = px - 210 + i * 96;
      const gy = 250 + Math.sin(t * 1.6 + i * 1.3) * 16;
      ctx.globalAlpha = 0.75;
      ui.gem(ctx, gx, gy, 7, pal.gem, t + i);
      ctx.globalAlpha = 1;
    }

    const missions = g.progress.data.missions.filter((m) => !m.done).slice(0, 3);
    ui.panel(ctx, 560, 452, 372, 116, { radius: 14, fill: 'rgba(8,13,24,0.72)' });
    if (missions.length) {
      ui.text(ctx, 'MISSIONS', 580, 476, { size: 10, weight: 800, color: COLORS.muted });
      let my = 496;
      for (const m of missions) {
        ui.text(ctx, m.text, 580, my, { size: 11.5, weight: 600, color: 'rgba(238,244,255,0.8)' });
        ui.bar(ctx, 892, my - 7, 26, 4, clamp(m.prog / m.goal, 0, 1), { color: pal.accent });
        my += 24;
      }
    } else {
      ui.text(ctx, 'All missions complete!', 580, 502, { size: 12, weight: 700, color: pal.accent });
      ui.text(ctx, 'New ones unlock as you fall.', 580, 522, { size: 11, weight: 600, color: COLORS.muted });
    }
  }

  howTo(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    ctx.fillStyle = 'rgba(4,7,14,0.85)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ui.panel(ctx, 56, 36, 848, 540, { radius: 22 });
    ui.text(ctx, 'HOW TO PLAY', 92, 88, { size: 26, weight: 900 });
    ui.text(ctx, 'Controls on the left · the story of the Downward Kids on the right', 92, 108, {
      size: 10.5, weight: 500, color: COLORS.muted,
    });

    const rows = [
      ['A / D', 'Move left and right.'],
      ['SPACE', 'Jump. Hold it in the air to open your wings and slow the fall.'],
      ['SHIFT', 'Dash forward, even while falling.'],
      ['S / ↓', 'Tap to drop through a cloud ledge. Do not hold.'],
      ['M', 'Mute or unmute the music.'],
      ['ESC', 'Pause the run.'],
    ];
    let y = 146;
    for (const [key, desc] of rows) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      rr(ctx, 92, y - 16, 70, 24, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      rr(ctx, 92, y - 16, 70, 24, 7);
      ctx.stroke();
      ui.text(ctx, key, 127, y, { size: 10.5, weight: 800, color: '#ffffff', align: 'center' });
      const next = this._wrapText(ctx, desc, 176, y, 246, 14, {
        size: 10.8, weight: 600, color: 'rgba(238,244,255,0.82)',
      });
      y = next + 6;
    }

    ui.text(ctx, 'GOOD TO KNOW', 92, 322, { size: 10, weight: 800, color: alpha(pal.accent, 0.9) });
    const tips = [
      'Chain gems without missing to grow your multiplier up to x9.',
      'The storm above never stops. Keep falling!',
      'Cracked ledges crumble a heartbeat after you land.',
      'Lasers only cover part of a lane — slip through the open side.',
    ];
    let ty = 342;
    for (const tip of tips) {
      ctx.fillStyle = alpha(pal.accent, 0.85);
      ctx.beginPath();
      ctx.arc(96, ty - 4, 3, 0, TAU);
      ctx.fill();
      ty = this._wrapText(ctx, tip, 108, ty, 314, 14, { size: 10.2, weight: 500, color: 'rgba(238,244,255,0.75)' }) + 4;
    }

    ctx.fillStyle = alpha('#ffffff', 0.1);
    ctx.fillRect(448, 120, 1, 388);

    ui.text(ctx, 'THE STORY OF THE DOWNWARD KIDS', 480, 146, { size: 14, weight: 900, color: pal.accent });
    const story = [
      ['A VERY SMALL HERO',
        "The sky used to be one big playground, until the clouds piled up so high they started to grumble. The Maker needed somebody small, brave and bouncy to slip down through the world and let the fresh air in. So Pip was doodled first: a round little faller with a flappy scarf, two sturdy boots and a heart full of let's go."],
      [null,
        "Pip's wings are the secret. Hold jump and they open with a fwump, turning a scary drop into a gentle float. The other kids got their own tricks too: Bolt zooms, Nix hops twice, Wisp glides, Nova sparkles and Umbra tiptoes through the dark."],
      ['WHY DOWN?',
        'Because up is where the grumpy storm lives, and down is where the shiny things grow. Gems pop out of the walls like fizzy stars, and every metre you fall tucks a shard into your pocket.'],
      [null,
        "The world changes as you go: morning sky, warm forge, glass reef, frost, a humming garden, Last Light, the Quiet Below and the World's Core. Finish a full descent and the whole world loops around to begin again — faster every time. It never really ends."],
      ['WHY THIS GAME?',
        'It is one long friendly fall: short hops, bright colours, silly hats, and a storm that just wants you to keep moving. Falling is only flying with extra steps, and you can always get back up.'],
    ];
    let sy = 170;
    for (const [head, body] of story) {
      if (head) {
        sy = this._wrapText(ctx, head, 480, sy, 400, 13, { size: 9.5, weight: 800, color: alpha(pal.accent, 0.9) }) + 2;
      }
      sy = this._wrapText(ctx, body, 480, sy, 398, 14, { size: 10.2, weight: 500, color: 'rgba(238,244,255,0.76)' }) + 8;
    }

    if (ui.button(ctx, 92, 512, 180, 40, 'BACK', { size: 14, id: 'back-howto' })) g.setState('MENU');
  }

  _wrapText(ctx, text, x, y, maxW, lineH, opts = {}) {
    const { size = 11, weight = 500, color = 'rgba(238,244,255,0.75)' } = opts;
    ctx.font = font(size, weight);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    const words = String(text).split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, yy);
      yy += lineH;
    }
    return yy;
  }

  hangar(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    const data = g.progress.data;
    ctx.fillStyle = 'rgba(4,7,14,0.86)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    ui.text(ctx, 'HANGAR', 60, 84, { size: 28, weight: 900 });
    ui.text(ctx, 'Choose your faller and trail. Shards are earned by every run.', 60, 106, { size: 12, weight: 500, color: COLORS.muted });

    ui.gem(ctx, 786, 76, 9, pal.gem, g.time);
    ui.text(ctx, `${fmt(data.shards)}`, 900, 84, { size: 20, weight: 900, align: 'right' });

    const cardW = 250;
    const cardH = 150;
    let index = 0;
    for (const c of CHARACTERS) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 60 + col * 282;
      const y = 122 + row * 164;
      index += 1;
      const owned = g.progress.ownsChar(c.id);
      const equipped = data.char === c.id;
      const afford = data.shards >= c.cost;

      const over = this._over(x, y, cardW, cardH);
      ctx.fillStyle = equipped ? alpha(pal.accent, 0.14) : over ? 'rgba(24,32,48,0.92)' : 'rgba(12,18,30,0.86)';
      rr(ctx, x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = equipped ? alpha(pal.accent, 0.8) : over ? alpha('#ffffff', 0.28) : COLORS.stroke;
      ctx.lineWidth = equipped ? 2 : 1.2;
      rr(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();

      ui.character(ctx, c, x + 44, y + 88, 1.5, g.time + index, 1);
      ui.text(ctx, c.name, x + 88, y + 30, { size: 17, weight: 800 });
      ui.text(ctx, c.tag || '', x + 88, y + 45, { size: 8.5, weight: 800, color: alpha(pal.accent, 0.9) });

      const barX = x + 88;
      const barW = 112;
      ui.bar(ctx, barX, y + 57, barW, 4, (c.stats.speed - 280) / 120, { color: alpha(pal.accent, 0.9) });
      ui.text(ctx, 'SPD', x + 242, y + 60, { size: 8, weight: 700, color: COLORS.muted, align: 'right' });
      ui.bar(ctx, barX, y + 69, barW, 4, (c.stats.jump - 460) / 100, { color: alpha(pal.accent2, 0.9) });
      ui.text(ctx, 'JMP', x + 242, y + 72, { size: 8, weight: 700, color: COLORS.muted, align: 'right' });
      ui.bar(ctx, barX, y + 81, barW, 4, c.stats.air / 2, { color: 'rgba(255,255,255,0.75)' });
      ui.text(ctx, 'AIR', x + 242, y + 84, { size: 8, weight: 700, color: COLORS.muted, align: 'right' });

      ui.text(ctx, c.desc, x + 88, y + 100, { size: 8.8, weight: 500, color: 'rgba(238,244,255,0.6)' });

      const label = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${c.cost} SHARDS`;
      const clicked = ui.button(ctx, x + 88, y + 108, 150, 28, label, {
        variant: equipped ? 'ghost' : 'secondary',
        size: 10,
        disabled: equipped || (!owned && !afford),
        id: `char-${c.id}`,
        color: pal.accent,
      });
      if (clicked) {
        if (owned) {
          g.progress.equipChar(c.id);
          g.audio.sfx('buy');
        } else if (afford) {
          g.progress.buyChar(c.id);
          g.audio.sfx('buy');
          g.toast(`${c.name} unlocked`, pal.accent);
        }
      }
      if (equipped) {
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(x + cardW - 18, y + 18, 5, 0, TAU);
        ctx.fill();
      }
    }

    ui.text(ctx, 'TRAILS', 60, 454, { size: 11, weight: 800, color: COLORS.muted });
    let ti = 0;
    for (const tr of TRAILS) {
      const x = 60 + ti * 172;
      const y = 466;
      ti += 1;
      const owned = g.progress.ownsTrail(tr.id);
      const equipped = data.trail === tr.id;
      const afford = data.shards >= tr.cost;
      ctx.fillStyle = equipped ? alpha(pal.accent, 0.16) : 'rgba(12,18,30,0.86)';
      rr(ctx, x, y, 158, 56, 12);
      ctx.fill();
      ctx.strokeStyle = equipped ? alpha(pal.accent, 0.85) : COLORS.stroke;
      ctx.lineWidth = equipped ? 2 : 1;
      rr(ctx, x, y, 158, 56, 12);
      ctx.stroke();
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.arc(x + 22, y + 28, 8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x + 34, y + 28, 5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ui.text(ctx, tr.name, x + 50, y + 26, { size: 12, weight: 800 });
      ui.text(ctx, equipped ? 'EQUIPPED' : owned ? 'OWNED' : `${tr.cost}`, x + 50, y + 43, {
        size: 9.5, weight: 700, color: equipped ? pal.accent : owned ? COLORS.muted : afford ? '#ffffff' : COLORS.bad,
      });
      if (this._over(x, y, 158, 56) && g.input.pointer.clicked) {
        g.input.pointer.clicked = false;
        if (owned) {
          g.progress.equipTrail(tr.id);
          g.audio.sfx('ui');
        } else if (afford) {
          g.progress.buyTrail(tr.id);
          g.audio.sfx('buy');
          g.toast(`${tr.name} trail unlocked`, tr.color);
        } else {
          g.audio.sfx('deny');
        }
      }
    }

    if (ui.button(ctx, 60, 534, 150, 38, 'BACK', { size: 13, id: 'back-hangar' })) g.setState('MENU');
    ui.text(ctx, 'Every run pays shards for depth, gems, score and clean landings.', 232, 557, {
      size: 10.5, weight: 500, color: 'rgba(238,244,255,0.45)',
    });
  }

  profiles(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    const store = g.profiles;
    const locked = !!g.profileEditor;
    ctx.fillStyle = 'rgba(4,7,14,0.88)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    ui.text(ctx, 'PROFILES', 60, 84, { size: 28, weight: 900 });
    ui.text(ctx, 'Each profile keeps its own shards, bests and gear. Saved in this browser.', 60, 106, {
      size: 12, weight: 500, color: COLORS.muted,
    });
    ui.text(ctx, `${store.list.length} / ${MAX_PROFILES}`, 900, 84, { size: 11, weight: 800, color: COLORS.muted, align: 'right' });

    if (!locked && ui.button(ctx, 800, 96, 100, 30, 'BACK', { size: 11, id: 'back-profiles' })) g.setState('MENU');

    const cardW = 404;
    const cardH = 86;
    for (let i = 0; i < store.list.length; i++) {
      const p = store.list[i];
      const x = 60 + (i % 2) * 420;
      const y = 128 + Math.floor(i / 2) * 96;
      const active = p.id === store.activeId;
      const over = !locked && this._over(x, y, cardW, cardH);
      ctx.fillStyle = active ? alpha(pal.accent, 0.16) : over ? 'rgba(26,35,52,0.95)' : 'rgba(12,18,30,0.88)';
      rr(ctx, x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = active ? alpha(pal.accent, 0.85) : over ? alpha('#ffffff', 0.3) : COLORS.stroke;
      ctx.lineWidth = active ? 2 : 1.2;
      rr(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();

      const char = CHARACTERS.find((c) => c.id === p.data.char && (p.data.unlocks || []).includes(c.id)) || CHARACTERS[0];
      ui.character(ctx, char, x + 44, y + 56, 1.35, g.time + i, 1);
      ui.text(ctx, p.name, x + 88, y + 30, { size: 17, weight: 800 });
      ui.gem(ctx, x + 92, y + 49, 6, pal.gem, g.time + i);
      ui.text(ctx, `${fmt(p.data.shards)} shards · best ${p.data.best}m`, x + 104, y + 53, {
        size: 10.5, weight: 600, color: 'rgba(238,244,255,0.6)',
      });
      ui.text(ctx, active ? 'PLAYING NOW' : 'CLICK TO SWITCH', x + 88, y + 72, {
        size: 9, weight: 800, color: active ? pal.accent : 'rgba(238,244,255,0.35)',
      });
      if (active) {
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(x + cardW - 18, y + 18, 5, 0, TAU);
        ctx.fill();
      }
      if (over && g.input.pointer.clicked) {
        g.input.pointer.clicked = false;
        if (!active) g.switchProfile(p.id);
      }
    }

    if (store.list.length < MAX_PROFILES) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      const i = store.list.length;
      const x = 60 + (i % 2) * 420;
      const y = 128 + Math.floor(i / 2) * 96;
      rr(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ui.text(ctx, '+ NEW PROFILE', x + cardW / 2, y + cardH / 2 + 4, {
        size: 13, weight: 800, color: 'rgba(238,244,255,0.35)', align: 'center',
      });
    }

    if (!locked) {
      if (ui.button(ctx, 60, 518, 190, 42, 'NEW PROFILE', { ...BTN.primary, size: 13, id: 'profile-new', disabled: store.full })) {
        g.openProfileEditor('new');
      }
      if (ui.button(ctx, 266, 518, 130, 42, 'RENAME', { size: 12, id: 'profile-rename' })) {
        g.openProfileEditor('rename');
      }
      const armed = this.deleteArm.id === store.activeId && g.time < this.deleteArm.until;
      const del = ui.button(ctx, 412, 518, 168, 42, armed ? 'SURE? DELETE' : 'DELETE PROFILE', {
        size: 11, id: 'profile-delete', color: '#ff8a7a', disabled: store.list.length <= 1,
      });
      if (del) {
        if (armed) {
          this.deleteArm = { id: null, until: 0 };
          g.deleteProfile();
        } else {
          this.deleteArm = { id: store.activeId, until: g.time + 3.5 };
          g.audio.sfx('deny');
          g.toast('Press delete again to confirm', '#ff8a7a');
        }
      }
    }

    ui.text(ctx, 'Pick a card to play as that profile. Names are local to this device.', 60, 584, {
      size: 10.5, weight: 500, color: 'rgba(238,244,255,0.42)',
    });

    if (g.profileEditor) this._editor(ctx);
  }

  _editor(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    ctx.fillStyle = 'rgba(3,6,12,0.74)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ui.panel(ctx, 200, 190, 560, 212, { radius: 18 });
    const title = g.profileEditor.mode === 'new' ? 'NEW PROFILE' : 'RENAME PROFILE';
    ui.text(ctx, title, 240, 236, { size: 20, weight: 900 });
    ui.text(ctx, 'Type a name, or press Enter to keep the suggestion.', 240, 258, { size: 10.5, weight: 500, color: COLORS.muted });

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    rr(ctx, 240, 272, 480, 52, 12);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.accent, 0.7);
    ctx.lineWidth = 1.6;
    rr(ctx, 240, 272, 480, 52, 12);
    ctx.stroke();
    const value = g.input.textValue;
    ui.text(ctx, value || '', 260, 304, { size: 20, weight: 800 });
    if (g.time % 1 < 0.55) {
      ctx.fillStyle = pal.accent;
      const tw = ctx.measureText(value).width;
      ctx.fillRect(262 + tw, 288, 2, 22);
    }

    ui.text(ctx, 'Letters, numbers and spaces · Enter saves · Esc cancels', 240, 344, {
      size: 10, weight: 500, color: 'rgba(238,244,255,0.4)',
    });

    if (ui.button(ctx, 240, 354, 150, 34, 'CANCEL', { size: 12, id: 'editor-cancel' })) {
      g.closeProfileEditor();
    }
    if (ui.button(ctx, 404, 354, 190, 34, 'SAVE NAME', { ...BTN.primary, size: 12, id: 'editor-save' })) {
      g.commitProfileEditor();
    }
  }

  settings(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    const s = g.progress.settings;
    ctx.fillStyle = 'rgba(4,7,14,0.82)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ui.panel(ctx, 250, 86, 460, 420, { radius: 20 });
    ui.text(ctx, 'SETTINGS', 290, 134, { size: 24, weight: 900 });

    ui.text(ctx, 'MUSIC', 290, 190, { size: 12, weight: 800, color: COLORS.muted });
    const music = ui.slider(ctx, 470, 188, 200, s.music, 'music');
    if (music !== null) {
      s.music = music;
      g.audio.setMusic(music);
      g.progress.save();
    }

    ui.text(ctx, 'SOUND EFFECTS', 290, 238, { size: 12, weight: 800, color: COLORS.muted });
    const sfx = ui.slider(ctx, 470, 236, 200, s.sfx, 'sfx');
    if (sfx !== null) {
      s.sfx = sfx;
      g.audio.setSfx(sfx);
      g.progress.save();
    }

    ui.text(ctx, 'SCREEN SHAKE', 290, 290, { size: 12, weight: 800, color: COLORS.muted });
    const shake = ui.toggle(ctx, 594, 278, !!s.shake, 'shake');
    if (shake !== null) {
      s.shake = shake ? 1 : 0;
      g.progress.save();
      g.audio.sfx('ui');
    }

    ui.text(ctx, 'REDUCED MOTION', 290, 342, { size: 12, weight: 800, color: COLORS.muted });
    const reduce = ui.toggle(ctx, 594, 330, !!s.reduce, 'reduce');
    if (reduce !== null) {
      s.reduce = reduce ? 1 : 0;
      g.progress.save();
      g.audio.sfx('ui');
    }
    ui.text(ctx, 'Turns off screen shake and the speed lines at high fall speed.', 290, 362, {
      size: 10, weight: 500, color: 'rgba(238,244,255,0.45)',
    });

    ui.text(ctx, 'Space / Up: jump · hold in the air to slow the fall · Down: drop through a cloud · M: mute · Esc: pause', 290, 396, {
      size: 10, weight: 500, color: 'rgba(238,244,255,0.45)',
    });

    if (ui.button(ctx, 330, 418, 300, 44, 'BACK', { size: 14, id: 'back-settings' })) g.setState('MENU');
    ctx.fillStyle = alpha(pal.accent, 0.5);
    rr(ctx, 290, 152, 380, 2, 1);
    ctx.fill();
  }

  pause(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    ctx.fillStyle = 'rgba(4,7,14,0.7)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ui.panel(ctx, 300, 150, 360, 302, { radius: 20 });
    ui.text(ctx, 'PAUSED', 480, 202, { size: 26, weight: 900, align: 'center' });
    ui.text(ctx, 'The storm waits. So do you.', 480, 226, { size: 11.5, weight: 500, color: COLORS.muted, align: 'center' });

    if (ui.button(ctx, 332, 252, 296, 52, 'RESUME', { ...BTN.primary, size: 18, id: 'resume' })) g.setState('PLAYING');
    if (ui.button(ctx, 332, 314, 296, 40, 'RESTART', { size: 14, id: 'restart-pause' })) g.startRun();
    if (ui.button(ctx, 332, 362, 296, 40, 'QUIT TO MENU', { size: 14, id: 'quit-pause' })) g.quitToMenu();

    ui.text(ctx, 'ESC resumes', 480, 426, { size: 10, weight: 600, color: 'rgba(238,244,255,0.4)', align: 'center' });
    ctx.fillStyle = alpha(pal.accent, 0.4);
    rr(ctx, 340, 240, 280, 1.5, 1);
    ctx.fill();
  }

  results(ctx) {
    const g = this.game;
    const ui = g.ui;
    const pal = g.palette;
    const run = g.lastRun;
    if (!run) return;
    ctx.fillStyle = 'rgba(4,7,14,0.72)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ui.panel(ctx, 200, 64, 560, 472, { radius: 22 });

    ui.text(ctx, 'RUN OVER', 260, 116, { size: 22, weight: 900, color: COLORS.muted });
    if (run.newBest) {
      ctx.save();
      const pulse = 1 + Math.sin(g.time * 5) * 0.04;
      ctx.translate(640, 108);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = alpha(pal.accent, 0.16);
      rr(ctx, -104, -18, 208, 34, 17);
      ctx.fill();
      ctx.strokeStyle = alpha(pal.accent, 0.8);
      ctx.lineWidth = 1.4;
      rr(ctx, -104, -18, 208, 34, 17);
      ctx.stroke();
      ui.text(ctx, 'NEW PERSONAL BEST', 0, 3, { size: 11, weight: 900, color: pal.accent, align: 'center' });
      ctx.restore();
    } else {
      ui.text(ctx, `BEST ${g.progress.data.best}m`, 700, 108, { size: 12, weight: 800, color: 'rgba(238,244,255,0.55)', align: 'right' });
    }

    ui.text(ctx, `${Math.floor(run.depth)}`, 260, 196, { size: 62, weight: 900 });
    const dw = ctx.measureText(`${Math.floor(run.depth)}`).width;
    ui.text(ctx, 'm', 264 + dw, 196, { size: 22, weight: 800, color: alpha(pal.accent, 0.95) });
    ui.text(ctx, `DEEPEST POINT · DESCENT ${run.cycle || 1}`, 264, 220, { size: 10, weight: 700, color: COLORS.muted });

    const rows = [
      ['SCORE', fmt(run.score)],
      ['GEMS', `${run.gems}`],
      ['BEST CHAIN', `x${run.multBest || 1}`],
      ['PERFECT LANDINGS', `${run.perfects}`],
    ];
    let y = 244;
    for (const [k, v] of rows) {
      ui.text(ctx, k, 262, y, { size: 11, weight: 700, color: COLORS.muted });
      ui.text(ctx, v, 700, y, { size: 15, weight: 800, align: 'right' });
      y += 30;
    }

    ctx.fillStyle = alpha('#ffffff', 0.12);
    rr(ctx, 262, 364, 438, 1, 1);
    ctx.fill();

    ui.gem(ctx, 270, 392, 9, pal.gem, g.time);
    ui.text(ctx, `+${fmt(run.shards)} shards earned`, 288, 397, { size: 14, weight: 800, color: '#ffffff' });
    ui.text(ctx, `TOTAL ${fmt(g.progress.data.shards)}`, 700, 397, { size: 11, weight: 700, color: COLORS.muted, align: 'right' });
    if (run.parts && run.parts.length) {
      const line = run.parts.map((p) => `${p.label} +${p.value}`).join('   ·   ');
      ui.text(ctx, line, 270, 416, { size: 9.5, weight: 700, color: 'rgba(238,244,255,0.5)' });
    }

    let my = 436;
    for (const m of (run.completed || []).slice(0, 1)) {
      ui.text(ctx, `MISSION COMPLETE · ${m.text}`, 270, my, { size: 10, weight: 700, color: pal.accent });
      my += 18;
    }

    if (ui.button(ctx, 250, 452, 220, 56, 'RETRY', { ...BTN.primary, size: 18, sub: 'R', id: 'retry' })) g.startRun();
    if (ui.button(ctx, 490, 452, 220, 56, 'HANGAR', { size: 14, id: 'results-hangar' })) g.setState('HANGAR');
    ui.text(ctx, 'Esc returns to the menu', 480, 522, { size: 10, weight: 600, color: 'rgba(238,244,255,0.4)', align: 'center' });
  }

  _radio(ctx, x, y, label, active) {
    const g = this.game;
    const p = g.input.pointer;
    const over = p.x >= x - 8 && p.x <= x + 40 && p.y >= y - 12 && p.y <= y + 12;
    let clicked = false;
    if (over && p.clicked) {
      p.clicked = false;
      clicked = true;
    }
    const accent = g.palette.accent;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, TAU);
    ctx.fillStyle = over ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.strokeStyle = active ? accent : over ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (active) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, TAU);
      ctx.fill();
    }
    g.ui.text(ctx, label, x + 12, y + 3.5, {
      size: 9.5, weight: 700, color: active ? '#ffffff' : 'rgba(238,244,255,0.5)',
    });
    return clicked;
  }

  _over(x, y, w, h) {
    const p = this.game.input.pointer;
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }
}
