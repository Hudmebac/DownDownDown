const TRACKS = {
  menu: ['public/sound/down.mp3'],
  game: [
    'public/sound/downinst.mp3',
    'public/sound/downbeetinst.mp3',
    'public/sound/downstars.mp3',
  ],
};

const VOLUME = 0.85;

export class Audio {
  constructor(settings) {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.sfxVolume = settings?.sfx ?? 0.7;
    this.musicVolume = settings?.music ?? 0.45;
    this.muted = false;
    this.el = null;
    this.kind = null;
    this.index = { menu: -1, game: -1 };
    this.fade = 0;
    this.fadeTarget = 0;
    this._switchTimer = 0;
    this._pendingKind = null;
    this._noise = null;
    this._wanted = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      try {
        this.ctx = new AC();
      } catch (e) {
        return false;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.muted ? 0 : this.sfxVolume;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.muted ? 0 : this.musicVolume;
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  setSfx(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.muted ? 0 : this.sfxVolume;
  }

  unlock() {
    this.ensure();
    if (!this._wanted) return;
    if (this.el && !this.el.paused) return;
    this.el = null;
    this.kind = null;
    this._start(this._wanted);
  }

  pause() {
    this.fadeTarget = 0;
    this.fade = 0;
    if (this.el) this.el.pause();
  }

  stop() {
    this.fadeTarget = 0;
    this.fade = 0;
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el.load();
      this.el = null;
    }
    this.kind = null;
    this._wanted = null;
    this._pendingKind = null;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resumeMusic() {
    if (this.el) {
      this.fadeTarget = 1;
      this.el.play().catch(() => {});
    } else {
      this.unlock();
    }
  }

  setMusic(v) {
    const wasOff = this.musicVolume <= 0.001;
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.el) {
      this.el.volume = this.muted ? 0 : this.musicVolume * this.fade * VOLUME;
      if (this.musicVolume <= 0.001) this.el.pause();
    }
    if (wasOff && this.musicVolume > 0.001) {
      if (this.el) this.el.play().catch(() => {});
      else this.unlock();
    }
  }

  tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.3, delay = 0, attack = 0.005, bus = null }) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.15, gain = 0.15, filter = 1200, delay = 0 }) {
    if (!this.ensure()) return;
    if (!this._noise) {
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(filter, t0);
    bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  sfx(name, p = {}) {
    if (this.muted && name !== 'ui') return;
    switch (name) {
      case 'jump':
        this.tone({ freq: 320, to: 620, dur: 0.16, type: 'triangle', gain: 0.16 });
        break;
      case 'double':
        this.tone({ freq: 520, to: 880, dur: 0.18, type: 'triangle', gain: 0.14 });
        this.tone({ freq: 780, to: 1180, dur: 0.14, type: 'sine', gain: 0.08, delay: 0.04 });
        break;
      case 'dash':
        this.noise({ dur: 0.2, gain: 0.12, filter: 2200 });
        this.tone({ freq: 180, to: 90, dur: 0.18, type: 'sawtooth', gain: 0.08 });
        break;
      case 'land':
        this.tone({ freq: 160, to: 90, dur: 0.1, type: 'sine', gain: 0.13 });
        break;
      case 'perfect':
        this.tone({ freq: 880, dur: 0.12, type: 'triangle', gain: 0.1 });
        this.tone({ freq: 1320, dur: 0.18, type: 'triangle', gain: 0.08, delay: 0.07 });
        break;
      case 'gem': {
        const step = Math.min(8, p.combo || 0);
        const base = 660 * Math.pow(1.0595, step * 2);
        this.tone({ freq: base, dur: 0.1, type: 'sine', gain: 0.13 });
        this.tone({ freq: base * 1.5, dur: 0.12, type: 'sine', gain: 0.07, delay: 0.03 });
        break;
      }
      case 'hurt':
        this.tone({ freq: 260, to: 70, dur: 0.34, type: 'square', gain: 0.16 });
        this.noise({ dur: 0.25, gain: 0.16, filter: 500 });
        break;
      case 'shielded':
        this.tone({ freq: 900, to: 420, dur: 0.24, type: 'triangle', gain: 0.16 });
        break;
      case 'powerup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.11, delay: i * 0.06 }));
        break;
      case 'bounce':
        this.tone({ freq: 220, to: 900, dur: 0.2, type: 'sine', gain: 0.16 });
        break;
      case 'crumble':
        this.noise({ dur: 0.22, gain: 0.1, filter: 700 });
        break;
      case 'start':
        [392, 523, 659, 880].forEach((f, i) => this.tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.12, delay: i * 0.08 }));
        break;
      case 'ui':
        this.tone({ freq: p.hover ? 900 : 620, dur: p.hover ? 0.04 : 0.08, type: 'sine', gain: p.hover ? 0.03 : 0.08 });
        break;
      case 'buy':
        [660, 880, 1180].forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.1, delay: i * 0.06 }));
        break;
      case 'deny':
        this.tone({ freq: 180, to: 120, dur: 0.16, type: 'square', gain: 0.1 });
        break;
      case 'mission':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone({ freq: f, dur: 0.2, type: 'sine', gain: 0.1, delay: i * 0.07 }));
        break;
      case 'biome':
        [392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.5, type: 'sine', gain: 0.09, delay: i * 0.1 }));
        break;
      case 'storm':
        this.tone({ freq: 110, to: 60, dur: 0.5, type: 'sawtooth', gain: 0.08 });
        break;
      case 'death':
        [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: 0.35, type: 'triangle', gain: 0.14, delay: i * 0.12 }));
        break;
      case 'newbest':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.12, delay: i * 0.09 }));
        break;
      case 'warn':
        this.tone({ freq: 520, to: 520, dur: 0.1, type: 'square', gain: 0.05 });
        break;
      default:
        break;
    }
  }

  music(kind) {
    this._wanted = kind;
    if (this.kind === kind && this.el) return;
    this._pendingKind = null;
    if (this.el) {
      this._pendingKind = kind;
      this.fadeTarget = 0;
    } else {
      this._start(kind);
    }
  }

  _start(kind) {
    if (this.musicVolume <= 0.001) return;
    const AudioCtor = typeof window !== 'undefined' ? window.Audio : null;
    if (!AudioCtor) return;
    const list = TRACKS[kind];
    if (!list) return;
    let idx = this.index[kind];
    idx = idx < 0 ? Math.floor(Math.random() * list.length) : (idx + 1) % list.length;
    this.index[kind] = idx;
    let el;
    try {
      el = new AudioCtor(list[idx]);
    } catch (e) {
      return;
    }
    if (!el || typeof el.addEventListener !== 'function' || typeof el.play !== 'function') return;
    el.loop = false;
    el.preload = 'auto';
    el.volume = 0;
    el.addEventListener('ended', () => {
      if (this.el === el) {
        this.el = null;
        this._start(this.kind);
      }
    });
    el.addEventListener('error', () => {
      if (this.el === el) {
        this.el = null;
        this.kind = null;
      }
    });
    this.el = el;
    this.kind = kind;
    this.fade = 0;
    this.fadeTarget = 1;
    el.play().catch(() => {
      if (this.el === el) {
        this.el = null;
        this.kind = null;
      }
    });
  }

  stopMusic() {
    this.fadeTarget = 0;
    this._pendingKind = null;
  }

  setMuted(on) {
    this.muted = on;
    if (this.sfxBus) this.sfxBus.gain.value = on ? 0 : this.sfxVolume;
    if (this.el) this.el.volume = on ? 0 : this.musicVolume * this.fade * VOLUME;
  }

  update(dt) {
    this.fade = Math.min(1, Math.max(0, this.fade + (this.fadeTarget - this.fade) * Math.min(1, dt * 4)));
    if (this.el) {
      this.el.volume = this.muted ? 0 : Math.max(0, Math.min(1, this.musicVolume * this.fade * VOLUME));
      if (this.fade < 0.02 && this.fadeTarget === 0 && this._pendingKind) {
        const kind = this._pendingKind;
        this._pendingKind = null;
        this.el.pause();
        this.el = null;
        this.kind = null;
        this._start(kind);
      }
    }
  }
}
