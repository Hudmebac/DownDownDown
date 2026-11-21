import { BIOMES, PX_PER_METER, SCORE, STORM, VIEW, biomeIndexAt } from './config.js';
import { TAU, alpha, clamp, damp, fmt, mixPalette, rr } from '../core/utils.js';
import { Input } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { FX, vignette } from '../core/fx.js';
import { Progress } from './progress.js';
import { ProfileStore, sanitizeName } from './profiles.js';
import { World } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { HUD } from './hud.js';
import { Screens } from './screens.js';
import { renderDecor, renderHazard, renderPickup, renderPlatform } from './entities.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.profiles = new ProfileStore();
    this.progress = new Progress(this.profiles);
    this.profileEditor = null;
    this.audio = new Audio(this.progress.settings);
    this.fx = new FX();
    this.ui = new UI(this);
    this.world = new World();
    this.player = new Player();
    this.hud = new HUD(this);
    this.screens = new Screens(this);

    this.state = 'MENU';
    this.time = 0;
    this.cam = 0;
    this.menuCam = 0;
    this.menuPalette = BIOMES[0];
    this.palette = BIOMES[0];
    this.palettePrev = BIOMES[0];
    this.paletteMix = 1;
    this.biomeBanner = null;
    this.toasts = [];
    this.run = null;
    this.lastRun = null;
    this.fadeIn = 1;
    this.acc = 0;
    this.lastTs = 0;
    this._unlocked = false;
    this._scale = 1;
    this._lucky = false;
    this._luckyBuf = '';
    this._luckySig = this._decode([0x6d, 0x76, 0x74, 0x6d, 0x76, 0x74]);
    this._luckyFx = 0;
    this._costume = null;
    this._lookBuf = '';
    this._lookCodes = [
      { id: 'red', sig: this._decode([0x7a, 0x76, 0x65, 0x7e, 0x78]), flash: '#e23b2e', toast: 'A red-capped plumber joins the descent' },
      { id: 'green', sig: this._decode([0x7b, 0x62, 0x7e, 0x70, 0x7e]), flash: '#4fbf4a', toast: 'A green-capped plumber joins the descent' },
      { id: 'dino', sig: this._decode([0x6e, 0x78, 0x64, 0x7f, 0x7e]), flash: '#5cc84a', toast: 'A hungry green dinosaur joins the descent' },
    ];
    this._lookMutedBefore = null;
    this._lookMuteRestore = null;
    this._dadBuf = '';
    this._dadSig = this._decode([0x73, 0x76, 0x73, 0x73, 0x76, 0x73]);

    this.handlers = {
      onGem: (p) => this.onGem(p),
      onHeart: () => this.onHeart(),
      onPower: (p) => this.onPower(p),
      onHurt: (h) => this.onHurt(h),
      onEdgeWall: (w) => this.onEdgeWall(w),
      onBreak: (p) => this.onBreak(p),
    };

    this.player.setLoadout(this.progress.char, this.progress.trail);

    try {
      this._ignoreRotate = window.sessionStorage.getItem('ddd.rotate.dismissed') === '1';
    } catch (e) {
      this._ignoreRotate = false;
    }
    this._ox = 0;
    this._oy = 0;
    this._view = { s: 1, ox: 0, oy: 0 };

    this.resize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => window.setTimeout(() => this.resize(), 120));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
      this._bindDisplayControls();
      this._boundFrame = (ts) => this.frame(ts);
    }
  }

  _decode(bytes) {
    let out = '';
    for (const v of bytes) out += String.fromCharCode(v ^ 0x17);
    return out;
  }

  _detectMobile() {
    if (typeof window === 'undefined') return false;
    const touch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0);
    if (!touch) return false;
    const mq = typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q).matches : () => false;
    const smallest = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    return mq('(pointer: coarse)') || mq('(hover: none)') || (smallest > 0 && smallest <= 820);
  }

  get mobileView() {
    const mode = this.progress.settings.display;
    if (mode === 'mobile') return true;
    if (mode === 'desktop') return false;
    return this._detectMobile();
  }

  get showTouch() {
    return this.input.touchMode || this.mobileView;
  }

  setDisplay(mode) {
    this.progress.settings.display = mode === 'mobile' ? 'mobile' : 'desktop';
    this.progress.save();
    this.audio.sfx('ui');
    this.resize();
  }

  _bindDisplayControls() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const dismiss = document.getElementById('rotate-dismiss');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        this._ignoreRotate = true;
        try {
          window.sessionStorage.setItem('ddd.rotate.dismissed', '1');
        } catch (e) { /* storage blocked, keep it for this run only */ }
        this.resize();
      });
    }
    const desktop = document.getElementById('rotate-desktop');
    if (desktop) desktop.addEventListener('click', () => this.setDisplay('desktop'));

    // app mode plays fullscreen: the first tap on the game is a user gesture, so it can go fullscreen
    const root = document.documentElement;
    if (root && typeof root.requestFullscreen === 'function' && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('pointerdown', () => {
        if (!this.mobileView || document.fullscreenElement) return;
        const pending = root.requestFullscreen({ navigationUI: 'hide' });
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      }, { passive: true });
      document.addEventListener('fullscreenchange', () => this.resize());
    }
  }

  resize() {
    if (typeof window === 'undefined') return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mobile = this.mobileView;
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (root && root.classList) root.classList.toggle('mobile-view', mobile);
    const stage = this.canvas.parentElement;
    let cssW;
    let cssH;
    if (mobile) {
      cssW = Math.max(1, Math.floor((stage && stage.clientWidth) || window.innerWidth));
      cssH = Math.max(1, Math.floor((stage && stage.clientHeight) || window.innerHeight));
    } else {
      const fit = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
      cssW = Math.max(1, Math.floor(VIEW.w * fit));
      cssH = Math.max(1, Math.floor(VIEW.h * fit));
    }
    // the game always draws in a 960x600 design space; mobile mode centres it in a full-bleed canvas
    const s = Math.min(cssW / VIEW.w, cssH / VIEW.h);
    const ox = mobile ? Math.round((cssW - VIEW.w * s) / 2) : 0;
    const oy = mobile ? Math.round((cssH - VIEW.h * s) / 2) : 0;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this._scale = s * dpr;
    this._ox = ox * dpr;
    this._oy = oy * dpr;
    this._view = { s, ox, oy };
    this.canvas.__view = this._view;
    this.ctx.imageSmoothingEnabled = true;
    this._applyDisplayChrome(mobile, cssW, cssH);
  }

  _applyDisplayChrome(mobile, cssW, cssH) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const hint = document.getElementById('rotate-hint');
    if (!hint) return;
    const portrait = mobile && cssH > cssW;
    hint.hidden = !(portrait && !this._ignoreRotate);
  }

  start() {
    this.lastTs = typeof performance !== 'undefined' ? performance.now() : 0;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.audio.pause();
        else this.audio.resumeMusic();
      });
      window.addEventListener('pagehide', () => this.audio.stop());
      window.addEventListener('beforeunload', () => this.audio.stop());
    }
    this.audio.music('menu');
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(this._boundFrame);
  }

  frame(ts) {
    const raw = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    const dt = clamp(Number.isFinite(raw) ? raw : 0.016, 0, 0.05);
    this.acc += dt;
    let steps = 0;
    while (this.acc >= 1 / 60 && steps < 4) {
      this.update(1 / 60);
      this.acc -= 1 / 60;
      steps += 1;
    }
    this.render();
    this.input.endFrame();
    requestAnimationFrame(this._boundFrame);
  }

  setState(next) {
    this.state = next;
    this.fadeIn = Math.max(this.fadeIn, 0.65);
    if (next === 'PLAYING') this.audio.music('game');
    else this.audio.music('menu');
  }

  startRun() {
    const trail = this.progress.trail;
    this.player.setLoadout(this.progress.char, trail);
    this.player.reset(VIEW.w / 2, 240);
    this.player.costume = this._costume;
    this.world.reset();
    this.world.clearSpawn(VIEW.w / 2, 240);
    this.player.vy = 220;
    for (let i = 0; i < 3; i++) {
      const gx = VIEW.w / 2 + (i % 2 === 0 ? -38 : 38);
      const gy = 350 + i * 92;
      this.world.pickups.push({ type: 'gem', x: gx, y: gy, baseY: gy, r: 11, taken: false, t: i * 1.3 });
    }
    this.cam = this.player.y - VIEW.h * 0.42;
    this.palette = BIOMES[0];
    this.palettePrev = BIOMES[0];
    this.paletteMix = 1;
    this.biomeBanner = null;
    this.fx.clear();
    this.toasts.length = 0;
    this.run = {
      startY: this.player.y,
      lastY: this.player.y,
      depth: 0,
      score: 0,
      gems: 0,
      hearts: 3,
      maxHearts: 4,
      combo: 0,
      mult: 1,
      multBest: 1,
      comboTimer: 0,
      perfects: 0,
      dashes: 0,
      powerups: 0,
      stormTimer: 0.8,
      elapsed: 0,
      cycle: 1,
    };
    if (this._lucky) {
      this.run.maxHearts = 5;
      this.run.hearts = 5;
    }
    this.setState('PLAYING');
    this.audio.sfx('start');
    this.toast(
      this.mobileView ? 'Hold a side to steer · tap JUMP to float' : 'Hold Space or Up to slow your fall',
      this.palette.accent
    );
    if (this._lucky) this.toast('You feel unstoppable', '#ffd166');
    const look = this._lookCodes.find((c) => c.id === this._costume);
    if (look) this.toast(look.toast, look.flash);
  }

  quitToMenu() {
    this.state = 'MENU';
    this.audio.music('menu');
    this.fadeIn = 0.6;
    this.run = null;
  }

  toast(text, color) {
    this.toasts.push({ text, color, t: 2.4, max: 2.4 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  onGem(p) {
    const run = this.run;
    if (!run) return;
    run.gems += 1;
    run.combo += 1;
    run.comboTimer = SCORE.comboWindow;
    run.mult = clamp(1 + Math.floor(run.combo / SCORE.comboStep), 1, SCORE.comboMax);
    run.multBest = Math.max(run.multBest, run.mult);
    run.score += SCORE.gem * run.mult;
    this.audio.sfx('gem', { combo: run.combo });
    this.fx.burst(p.x, p.y, { count: 8, speed: 170, life: 0.45, size: 2.6, color: this.palette.gem, gravity: 220 });
    this.fx.text(p.x, p.y - 12, `+${SCORE.gem * run.mult}`, { size: 12, color: this.palette.gem, life: 0.6 });
    if (run.mult > 1 && run.combo % SCORE.comboStep === 0) {
      this.fx.ring(p.x, p.y, { color: this.palette.accent2, r1: 48, life: 0.4 });
    }
  }

  onHeart() {
    if (!this.run) return;
    const before = this.run.hearts;
    this.run.hearts = Math.min(this.run.maxHearts, this.run.hearts + 1);
    if (this.run.hearts > before) {
      this.toast('+1 heart', '#ff8fa3');
      this.audio.sfx('powerup');
    } else {
      this.run.score += 100;
      this.fx.text(this.player.x + this.player.w / 2, this.player.y, '+100', { size: 13, color: '#ff8fa3' });
      this.audio.sfx('gem');
    }
  }

  onPower(p) {
    if (!this.run) return;
    const player = this.player;
    player.addPower(p.kind);
    this.run.powerups += 1;
    this.run.score += SCORE.powerup;
    const name = p.kind === 'shield' ? 'SHIELD' : p.kind === 'magnet' ? 'MAGNET' : p.kind === 'slow' ? 'SLOW TIME' : 'FEATHER';
    this.toast(name, this.palette.accent2);
    this.audio.sfx('powerup');
    this.fx.ring(p.x, p.y, { color: this.palette.accent2, r0: 10, r1: 90, life: 0.5, width: 4 });
    this.fx.burst(p.x, p.y, { count: 16, speed: 240, life: 0.7, size: 3, color: this.palette.accent2 });
  }

  onBreak(p) {
    this.audio.sfx('crumble');
    for (let i = 0; i < 8; i++) {
      this.fx.burst(p.x + Math.random() * p.w, p.y, {
        count: 2, speed: 120, life: 0.7, size: 3.5, color: '#c69a6b', gravity: 900, spread: 1.4, angle: Math.PI / 2,
      });
    }
  }

  onHurt(hazard) {
    const player = this.player;
    if (!this.run || this.state !== 'PLAYING') return;
    const dx = player.x + player.w / 2 - (hazard.x + (hazard.w || 0) / 2);
    if (this._lucky) {
      if (this._luckyFx <= 0) {
        this._luckyFx = 0.6;
        this.fx.ring(player.x + player.w / 2, player.y + player.h / 2, { color: '#ffd166', r0: 18, r1: 62, life: 0.35, width: 2 });
      }
      return;
    }
    const result = player.hurt(Math.sign(dx) || 1);
    if (result === 'none') return;
    if (result === 'shield') {
      this.audio.sfx('shielded');
      this.fx.ring(player.x + player.w / 2, player.y + player.h / 2, { color: '#6ee7ff', r0: 20, r1: 90, life: 0.45, width: 4 });
      this.fx.shakeIt(4);
      return;
    }
    this.run.hearts -= 1;
    this.run.combo = 0;
    this.run.mult = 1;
    this.run.comboTimer = 0;
    this.audio.sfx('hurt');
    this.fx.shakeIt(this.shakeEnabled() ? 14 : 0);
    this.fx.flashIt('#ff5577', 0.34);
    this.fx.burst(player.x + player.w / 2, player.y + player.h / 2, {
      count: 14, speed: 260, life: 0.6, size: 3.4, color: '#ff7a8a', gravity: 500,
    });
    if (this.run.hearts <= 0) this.endRun();
  }

  // A shared secret: type "dad dad" and the well pays out, as often as you like.
  dadShards() {
    this.progress.data.shards += 1000;
    this.progress.save();
    this.audio.sfx('buy');
    this.fx.flashIt('#ffd166', 0.26);
    this.toast('+1,000 shards', '#ffd166');
    if (this.state === 'PLAYING' && this.player) {
      const px = this.player.x + this.player.w / 2;
      const py = this.player.y + this.player.h / 2;
      this.fx.ring(px, py, { color: '#ffd166', r0: 16, r1: 120, life: 0.5, width: 4 });
      this.fx.burst(px, py, { count: 20, speed: 280, life: 0.8, size: 3.2, color: '#ffd166', gravity: 240 });
    }
  }

  onEdgeWall(wall) {
    if (!this.run) return;
    this.audio.sfx('wall');
    this.fx.shakeIt(this.shakeEnabled() ? 6 : 0);
    if (!this._wallTip) {
      this._wallTip = true;
      this.toast('The well walls close in — stop clinging to the edges', this.palette.hazard);
    } else {
      this.toast(`${wall.side === 'left' ? 'LEFT' : 'RIGHT'} WALL`, this.palette.hazard);
    }
  }

  endRun() {
    if (!this.run || this.state !== 'PLAYING') return;
    const r = this.run;
    const result = this.progress.endRun({
      depth: r.depth,
      score: r.score,
      gems: r.gems,
      combo: r.multBest,
      perfects: r.perfects,
    });
    const extra = this.progress.addTotals({ dashes: r.dashes, powerups: r.powerups, perfects: r.perfects });
    this.lastRun = {
      ...r,
      cycle: this.world.cycle + 1,
      shards: result.shards,
      parts: result.parts,
      newBest: result.newBest,
      completed: [...result.completed, ...extra],
    };
    this.audio.sfx('death');
    if (result.newBest) this.audio.sfx('newbest');
    this.fx.flashIt('#ffffff', 0.5);
    this.fx.shakeIt(this.shakeEnabled() ? 18 : 0);
    this.state = 'GAMEOVER';
    this.fadeIn = 0.5;
    this.audio.music('menu');
  }

  update(dt) {
    this.time += dt;
    this.audio.update(dt);
    this.fx.update(dt);
    this.fadeIn = Math.max(0, this.fadeIn - dt * 2.2);
    this._luckyFx = Math.max(0, this._luckyFx - dt);

    if (this.state === 'MENU' || this.state === 'PLAYING') {
      for (const key of this.input.takeTyped()) {
        if (key.length !== 1 || key < 'a' || key > 'z') continue;
        this._luckyBuf = (this._luckyBuf + key).slice(-this._luckySig.length);
        if (this._luckyBuf === this._luckySig) {
          this._luckyBuf = '';
          if (!this._lucky) {
            this._lucky = true;
            if (this.run) {
              this.run.maxHearts = 5;
              this.run.hearts = 5;
            }
            this.audio.sfx('newbest');
            this.fx.flashIt('#ffd166', 0.2);
            this.toast('A golden warmth settles over you', '#ffd166');
          }
        }
        this._dadBuf = (this._dadBuf + key).slice(-this._dadSig.length);
        if (this._dadBuf === this._dadSig) {
          this._dadBuf = '';
          this.dadShards();
        }
        this._lookBuf = (this._lookBuf + key).slice(-5);
        if (this._lookBuf === this._lookCodes[0].sig[0]) this._lookMutedBefore = this.audio.muted;
        for (const code of this._lookCodes) {
          if (this._lookBuf !== code.sig) continue;
          this._lookBuf = '';
          if (code.id === 'red' && this._lookMutedBefore !== null) {
            this._lookMuteRestore = this._lookMutedBefore;
            this._lookMutedBefore = null;
          }
          if (this._costume === code.id) continue;
          this._costume = code.id;
          this.player.costume = code.id;
          this.audio.sfx('powerup');
          this.fx.flashIt(code.flash, 0.16);
          this.toast(code.toast, code.flash);
        }
      }
    }

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].t -= dt;
      if (this.toasts[i].t <= 0) this.toasts.splice(i, 1);
    }
    if (this.biomeBanner) {
      this.biomeBanner.t -= dt;
      if (this.biomeBanner.t <= 0) this.biomeBanner = null;
    }

    if (this.profileEditor) {
      if (this.input.textCancel) {
        this.closeProfileEditor();
        this.audio.sfx('deny');
      } else if (this.input.textEnter) {
        this.commitProfileEditor();
      }
    }

    if (!this._unlocked && (this.input.pointer.down || this.input.keys.size > 0)) {
      this._unlocked = true;
      this.audio.unlock();
    }

    if (this.input.wasTapped('m')) {
      this.audio.setMuted(!this.audio.muted);
      this.toast(this.audio.muted ? 'Sound off' : 'Sound on', this.palette.accent);
    }
    if (this._lookMuteRestore !== null) {
      this.audio.setMuted(this._lookMuteRestore);
      this.toasts = this.toasts.filter((t) => t.text !== 'Sound off' && t.text !== 'Sound on');
      this._lookMuteRestore = null;
    }

    if (this.input.pausePressed) {
      if (this.state === 'PLAYING') this.setState('PAUSED');
      else if (this.state === 'PAUSED') this.setState('PLAYING');
      else if (['HOWTO', 'HANGAR', 'MISSIONS', 'PROFILES', 'SETTINGS'].includes(this.state)) this.setState('MENU');
    }

    switch (this.state) {
      case 'MENU':
      case 'HOWTO':
      case 'HANGAR':
      case 'MISSIONS':
      case 'PROFILES':
      case 'SETTINGS':
        this.menuCam += 26 * dt;
        this.menuPalette = BIOMES[biomeIndexAt((this.time * 34) % 3800)];
        this.palette = this.menuPalette;
        if (this.state === 'MENU' && (this.input.wasTapped('enter') || this.input.jumpPressed)) this.startRun();
        break;
      case 'PLAYING':
        this.updateRun(dt);
        break;
      case 'GAMEOVER':
        if (this.input.wasTapped('r') || this.input.wasTapped('enter')) this.startRun();
        else if (this.input.pausePressed) this.quitToMenu();
        break;
      default:
        break;
    }
  }

  updateRun(dt) {
    const player = this.player;
    const run = this.run;
    if (!run) return;
    run.elapsed += dt;
    if (this._lucky) run.hearts = run.maxHearts;

    player.update(dt, this.input, this.world);
    this.world.update(dt, player, this.handlers);

    const dy = Math.max(0, player.y - run.lastY);
    run.lastY = player.y;
    run.depth = Math.max(run.depth, (player.y - run.startY) / PX_PER_METER);
    run.score += dy * 0.4;

    if (run.comboTimer > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) {
        run.combo = 0;
        run.mult = 1;
      }
    }

    const target = player.y - VIEW.h * 0.42;
    if (target > this.cam) this.cam = damp(this.cam, target, 9, dt);
    else this.cam = Math.max(target, this.cam - 220 * dt);

    for (const ev of player.events) this.handlePlayerEvent(ev);

    if (player.wingsActive) {
      this.wingTimer = (this.wingTimer || 0) - dt;
      if (this.wingTimer <= 0) {
        this.wingTimer = 0.09;
        this.fx.burst(player.x + player.w / 2, player.y + player.h * 0.4, {
          count: 2, speed: 70, life: 0.4, size: 2, color: '#ffffff', gravity: 80, spread: 2.4, angle: Math.PI / 2,
        });
      }
    }

    const near = this.world.nearestHazard(player, 34);
    if (near && player.invuln <= 0) {
      run.score += SCORE.nearMiss;
      this.fx.text(player.x + player.w / 2, player.y, `CLOSE +${SCORE.nearMiss}`, { size: 11, color: '#ffffff', life: 0.7 });
    }

    if (this.world.stormTouching(player) && !this._lucky) {
      run.stormTimer -= dt;
      if (run.stormTimer <= 0) {
        run.stormTimer = STORM.damageInterval;
        this.onHurt({ x: player.x, w: player.w });
        this.toast('THE STORM HAS YOU', '#ff7a9a');
      }
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 14);
      this.fx.flashIt('#ff2d5e', 0.06 + pulse * 0.05);
    } else {
      run.stormTimer = Math.min(run.stormTimer, STORM.damageInterval * 0.6);
    }

    if (this.world.biomeChanged) {
      const b = BIOMES[this.world.biome];
      this.palettePrev = this.palette;
      this.paletteMix = 0;
      if (!this.world.cycleChanged) {
        this.biomeBanner = { name: b.name, tagline: b.tagline, t: 3.6, max: 3.6 };
        this.audio.sfx('biome');
        this.toast(`${b.name} · ${b.tagline}`, b.accent);
        this.fx.flashIt(b.accent, 0.18);
      }
    }
    if (this.world.cycleChanged) {
      const set = this.world.cycle + 1;
      if (!this.world.biomeChanged) {
        this.palettePrev = this.palette;
        this.paletteMix = 0;
      }
      this.biomeBanner = { name: `DESCENT ${set}`, tagline: 'Same world, sharper edges — everything is faster', t: 4, max: 4 };
      this.toast(`Descent ${set} · the world speeds up`, '#ffd166');
      this.audio.sfx('biome');
      this.fx.flashIt('#ffd166', 0.22);
    }
    if (this.paletteMix < 1) this.paletteMix = Math.min(1, this.paletteMix + dt / 1.2);
    this.palette = this.paletteMix >= 1 ? this.world.palette : mixPalette(this.palettePrev, this.world.palette, this.paletteMix);

    if (run.hearts <= 0) this.endRun();
  }

  handlePlayerEvent(ev) {
    const run = this.run;
    if (!run) return;
    const player = this.player;
    const px = player.x + player.w / 2;
    const py = player.y + player.h;
    switch (ev.type) {
      case 'jump':
        this.audio.sfx('jump');
        this.fx.burst(px, py, { count: 6, speed: 130, life: 0.3, size: 2.4, color: '#ffffff', spread: 1.6, angle: Math.PI / 2, gravity: 300 });
        break;
      case 'double':
        this.audio.sfx('double');
        this.fx.ring(px, py - 10, { color: this.palette.accent, r0: 8, r1: 44, life: 0.3, width: 2.4 });
        this.fx.burst(px, py, { count: 10, speed: 170, life: 0.45, size: 2.6, color: this.palette.accent, spread: TAU, gravity: 200 });
        break;
      case 'dash':
        run.dashes += 1;
        this.audio.sfx('dash');
        this.fx.shakeIt(this.shakeEnabled() ? 3 : 0);
        this.fx.burst(px, player.y + player.h / 2, {
          count: 12, speed: 260, life: 0.4, size: 2.6, color: this.palette.accent, gravity: 0, spread: 2.2, angle: player.facing > 0 ? Math.PI : 0,
        });
        break;
      case 'land': {
        this.audio.sfx('land');
        const count = Math.round(clamp(ev.impact / 90, 3, 12));
        this.fx.burst(px, py, { count, speed: 120, life: 0.35, size: 2.6, color: '#ffffff', spread: 2.4, angle: -Math.PI / 2, gravity: 500 });
        if (ev.perfect) {
          run.perfects += 1;
          run.score += SCORE.perfect;
          this.audio.sfx('perfect');
          this.fx.text(px, py - 20, `PERFECT +${SCORE.perfect}`, { size: 13, color: this.palette.accent2, life: 0.9, stroke: 'rgba(0,0,0,0.4)' });
          this.fx.ring(px, py, { color: this.palette.accent2, r0: 10, r1: 66, life: 0.4, width: 3 });
        }
        break;
      }
      case 'bounce':
        this.audio.sfx('bounce');
        this.fx.ring(px, py, { color: this.palette.accent2, r0: 12, r1: 100, life: 0.45, width: 3 });
        this.fx.shakeIt(this.shakeEnabled() ? 5 : 0);
        break;
      case 'crumble':
        this.audio.sfx('crumble');
        this.fx.shakeIt(this.shakeEnabled() ? 3 : 0);
        break;
      default:
        break;
    }
  }

  shakeEnabled() {
    return !!this.progress.settings.shake;
  }

  render() {
    const ctx = this.ctx;
    if (this._ox || this._oy) {
      // paint the letterbox gutters so the app-mode canvas never shows page background
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const gutter = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gutter.addColorStop(0, '#0a1424');
      gutter.addColorStop(1, '#04060b');
      ctx.fillStyle = gutter;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.setTransform(this._scale, 0, 0, this._scale, this._ox, this._oy);
    this.ui.begin();

    const inRun = ['PLAYING', 'PAUSED', 'GAMEOVER'].includes(this.state);
    if (inRun) {
      this.renderRun(ctx);
    } else {
      this.renderBackground(ctx, this.menuCam, this.palette, true);
      this.renderMenuGlow(ctx);
    }

    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.hud.render(ctx);
    }
    this.screens.render(ctx);
    this.ui.end();

    if (this.state === 'MENU') {
      vignette(ctx, VIEW.w, VIEW.h, 0.5);
    }
    this.fx.renderFlash(ctx, VIEW.w, VIEW.h);

    if (this.fadeIn > 0.01) {
      ctx.fillStyle = `rgba(4,7,14,${clamp(this.fadeIn, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
  }

  renderRun(ctx) {
    const cam = this.cam;
    const pal = this.palette;
    this.renderBackground(ctx, cam, pal, false);
    this.renderWalls(ctx, pal);

    const shakeOn = this.shakeEnabled() && !this.progress.settings.reduce;
    const sx = shakeOn ? (Math.random() - 0.5) * this.fx.shake : 0;
    const sy = shakeOn ? (Math.random() - 0.5) * this.fx.shake : 0;

    ctx.save();
    ctx.translate(sx, sy - cam);
    for (const d of this.world.decor) {
      if (d.y > cam - 80 && d.y < cam + VIEW.h + 80) renderDecor(ctx, d, pal);
    }
    for (const p of this.world.platforms) {
      if (p.y > cam - 60 && p.y < cam + VIEW.h + 60) renderPlatform(ctx, p, pal, this.world.time);
    }
    for (const p of this.world.pickups) {
      if (p.y > cam - 60 && p.y < cam + VIEW.h + 60) renderPickup(ctx, p, pal, this.world.time);
    }
    for (const h of this.world.hazards) {
      if (h.y > cam - 140 && h.y < cam + VIEW.h + 140) renderHazard(ctx, h, pal, this.world.time);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    this.player.render(ctx, cam);
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    this.fx.renderWorld(ctx, cam);
    ctx.restore();

    this.renderSpeedLines(ctx);
    this.renderStorm(ctx);
    vignette(ctx, VIEW.w, VIEW.h, 0.5);
  }

  renderBackground(ctx, cam, pal, animate) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(1, pal.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    const glow = ctx.createRadialGradient(VIEW.w * 0.5, VIEW.h * 0.3, 20, VIEW.w * 0.5, VIEW.h * 0.3, VIEW.w * 0.7);
    glow.addColorStop(0, alpha(pal.glow, 0.24));
    glow.addColorStop(1, alpha(pal.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    const layers = [
      { speed: 0.0016, base: 0.62, amp: 30, fill: pal.ridges[0], alpha: 1 },
      { speed: 0.0026, base: 0.76, amp: 24, fill: pal.ridges[1], alpha: 0.85 },
      { speed: 0.0042, base: 0.9, amp: 18, fill: pal.ridges[2], alpha: 0.9 },
    ];
    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = layer.fill;
      ctx.beginPath();
      ctx.moveTo(0, VIEW.h);
      for (let x = 0; x <= VIEW.w; x += 20) {
        const y =
          VIEW.h * layer.base +
          Math.sin(x * 0.005 + cam * layer.speed * 3 + layer.base * 10) * layer.amp +
          Math.sin(x * 0.014 - cam * layer.speed * 5) * (layer.amp * 0.5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(VIEW.w, VIEW.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const moteCount = 30;
    for (let i = 0; i < moteCount; i++) {
      const seedX = (i * 137.5) % VIEW.w;
      const speed = 0.15 + (i % 5) * 0.06;
      const y = ((i * 211 + cam * speed) % (VIEW.h + 80)) - 40;
      const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.2 + i * 1.7);
      const a = (0.1 + (i % 4) * 0.06) * (0.6 + twinkle * 0.6);
      ctx.fillStyle = alpha(pal.accent, a);
      const s = (1.4 + (i % 3) * 0.9) * (0.75 + twinkle * 0.45);
      const mx = seedX + Math.sin(cam * 0.001 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(mx, y - s);
      ctx.lineTo(mx + s * 0.55, y);
      ctx.lineTo(mx, y + s);
      ctx.lineTo(mx - s * 0.55, y);
      ctx.closePath();
      ctx.fill();
    }

    if (animate) {
      const gx = VIEW.w * 0.72;
      const gy = VIEW.h * 0.22;
      const halo = ctx.createRadialGradient(gx, gy, 8, gx, gy, 190);
      halo.addColorStop(0, alpha(pal.accent2, 0.28));
      halo.addColorStop(1, alpha(pal.accent2, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
  }

  renderMenuGlow(ctx) {
    const grad = ctx.createLinearGradient(0, VIEW.h * 0.78, 0, VIEW.h);
    grad.addColorStop(0, 'rgba(4,8,16,0)');
    grad.addColorStop(1, 'rgba(4,8,16,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, VIEW.h * 0.78, VIEW.w, VIEW.h * 0.22);
  }

  renderWalls(ctx, pal) {
    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : VIEW.w - 14;
      const grad = ctx.createLinearGradient(x, 0, x + 14, 0);
      grad.addColorStop(0, 'rgba(3,6,12,0.92)');
      grad.addColorStop(1, 'rgba(3,6,12,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 14, VIEW.h);
      ctx.fillStyle = alpha(pal.accent, 0.18);
      ctx.fillRect(side === 0 ? 12 : VIEW.w - 15, 0, 2, VIEW.h);
      for (let i = 0; i < 12; i++) {
        const y = i * 54 + (Math.floor(this.cam / 54) * 54) % 54;
        ctx.fillStyle = alpha(pal.accent, 0.08);
        ctx.fillRect(side === 0 ? 2 : VIEW.w - 12, y - this.cam % 54, 10, 26);
      }
    }
  }

  renderSpeedLines(ctx) {
    const p = this.player;
    if (!p || p.vy < 340 || this.progress.settings.reduce) return;
    const k = clamp((p.vy - 340) / 240, 0, 1);
    ctx.strokeStyle = alpha('#ffffff', 0.05 + k * 0.14);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) {
      const x = 30 + ((i * 173) % (VIEW.w - 60));
      const y = (((i * 197 - this.time * 1400 * k) % 700) + 700) % 700 - 50;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 34 + 50 * k);
      ctx.stroke();
    }
  }

  renderStorm(ctx) {
    const sy = this.world.stormY - this.cam;
    if (sy < -160) return;
    const h = Math.min(sy, VIEW.h);
    if (h > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(5,2,10,0.99)');
      g.addColorStop(0.6, 'rgba(20,5,30,0.92)');
      g.addColorStop(1, 'rgba(46,10,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.w, h);

      const t = this.time;
      ctx.strokeStyle = alpha('#ff4d8d', 0.16 + 0.08 * Math.sin(t * 3));
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 110;
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.quadraticCurveTo(x + Math.sin(t * 1.4 + i) * 24, h - 34, x + Math.sin(t * 0.9 + i) * 14, h - 74);
        ctx.stroke();
      }
    }
  }

  syncLoadout() {
    this.player.setLoadout(this.progress.char, this.progress.trail);
  }

  applyAudioSettings() {
    this.audio.setSfx(this.progress.settings.sfx);
    this.audio.setMusic(this.progress.settings.music);
  }

  switchProfile(id) {
    if (!this.profiles.switch(id)) return false;
    this.progress.rebind(this.profiles);
    this.syncLoadout();
    this.applyAudioSettings();
    this.run = null;
    this.state = 'MENU';
    this.fadeIn = 0.6;
    this.audio.sfx('buy');
    this.toast(`Playing as ${this.profiles.active.name}`, this.palette.accent);
    return true;
  }

  createProfile(name) {
    const profile = this.profiles.create(name);
    if (!profile) return false;
    this.progress.rebind(this.profiles);
    this.syncLoadout();
    this.applyAudioSettings();
    this.fadeIn = 0.6;
    this.audio.sfx('newbest');
    this.toast(`Profile created: ${profile.name}`, this.palette.accent);
    return true;
  }

  deleteProfile() {
    const active = this.profiles.active;
    if (!this.profiles.remove(active.id)) {
      this.toast('You need at least one profile', '#ff8a7a');
      return false;
    }
    this.progress.rebind(this.profiles);
    this.syncLoadout();
    this.applyAudioSettings();
    this.fadeIn = 0.6;
    this.toast('Profile deleted', this.palette.accent);
    return true;
  }

  openProfileEditor(mode) {
    if (mode === 'new' && this.profiles.full) {
      this.toast('All profile slots are in use', '#ff8a7a');
      return;
    }
    this.profileEditor = { mode };
    const initial = mode === 'rename' ? this.profiles.active.name : this.profiles.suggestName();
    this.input.beginText(initial, 14);
  }

  closeProfileEditor() {
    this.input.endText();
    this.profileEditor = null;
  }

  commitProfileEditor() {
    if (!this.profileEditor) return;
    const mode = this.profileEditor.mode;
    const fallback = mode === 'rename' ? this.profiles.active.name : this.profiles.suggestName();
    const name = sanitizeName(this.input.textValue, fallback);
    if (mode === 'new') {
      if (!this.createProfile(name)) this.toast('All profile slots are in use', '#ff8a7a');
    } else {
      this.profiles.rename(this.profiles.active.id, name);
      this.audio.sfx('ui');
      this.toast('Profile renamed', this.palette.accent);
    }
    this.closeProfileEditor();
  }
}
