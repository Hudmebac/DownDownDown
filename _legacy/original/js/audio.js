export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
    this.audioElement = null;
    this.musicPlaying = false;

    this.menuTracks = ['downdowndownmenu1.mp3', 'downdowndownmenu2.mp3'];
    this.gameTracks = ['downdowndowngame1.mp3', 'downdowndowngame2.mp3'];
    this.baseUrl = 'public/sound/';
    this._chasePlaying = false;
    this._startedOnce = false;
    this._activeTrackId = 0;
    this._menuIndex = -1;
    this._gameIndex = -1;
    this.musicMuted = false;
    this.sfxMuted = false;
    this.volume = 0.18;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicMuted ? 0 : this.volume;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxMuted ? 0 : 0.3;
    this.sfxGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNote(freq, duration, type = 'sine', gain = 0.3, dest = null) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  playStarCollect() {
    if (!this.ctx) return;
    this.resume();
    this.playNote(880, 0.1, 'sine', 0.25);
    setTimeout(() => this.playNote(1320, 0.15, 'sine', 0.2), 60);
    setTimeout(() => this.playNote(1760, 0.2, 'sine', 0.15), 120);
  }

  playBigStar() {
    if (!this.ctx) return;
    this.resume();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playNote(f, 0.3, 'sine', 0.3);
      }, i * 100);
    });
    setTimeout(() => {
      this.playNote(1319, 0.5, 'triangle', 0.25);
      this.playNote(1568, 0.5, 'triangle', 0.2);
    }, 450);
  }

  playFloorBreak() {
    if (!this.ctx) return;
    this.resume();
    const duration = 0.15;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100 + Math.random() * 200, this.ctx.currentTime + i * 0.03);
      g.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.03 + duration);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + i * 0.03);
      osc.stop(this.ctx.currentTime + i * 0.03 + duration);
    }
  }

  playCloudPop() {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playEnemyChase() {
    if (!this.ctx) return;
    this.resume();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150 + i * 30, this.ctx.currentTime);
        osc.frequency.setValueAtTime(120 + i * 20, this.ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.15, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
      }, i * 180);
    }
  }

  playMiniGameStart() {
    if (!this.ctx) return;
    this.resume();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playNote(f, 0.2, 'triangle', 0.25);
      }, i * 80);
    });
  }

  playMiniGameComplete() {
    if (!this.ctx) return;
    this.resume();
    const notes = [784, 988, 1175, 1319, 1568];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playNote(f, 0.15, 'sine', 0.2);
      }, i * 70);
    });
  }

  playJump() {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHurt() {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playButton() {
    if (!this.ctx) return;
    this.resume();
    this.playNote(600, 0.08, 'sine', 0.15);
    setTimeout(() => this.playNote(800, 0.1, 'sine', 0.12), 50);
  }

  startMusic(type) {
    this._stopPlayback();
    this._activeTrackId = (this._activeTrackId || 0) + 1;
    const tracks = type === 'menu' ? this.menuTracks : this.gameTracks;
    const idxKey = type === 'menu' ? '_menuIndex' : '_gameIndex';
    if (this[idxKey] === -1) {
      this[idxKey] = Math.floor(Math.random() * tracks.length);
    } else {
      this[idxKey] = (this[idxKey] + 1) % tracks.length;
    }
    this._musicType = type;
    this._musicTracks = tracks;
    this._musicIdxKey = idxKey;
    this.musicPlaying = true;
    this._startedOnce = true;
    this._playCurrent();
  }

  _playCurrent() {
    if (!this.musicPlaying) return;
    const tracks = this._musicTracks;
    const idxKey = this._musicIdxKey;
    this.audioElement = new Audio(this.baseUrl + tracks[this[idxKey]]);
    this.audioElement.volume = this.musicMuted ? 0 : this.volume;
    const el = this.audioElement;
    const onEnd = () => {
      if (el !== this.audioElement) return;
      this.audioElement = null;
      this[idxKey] = (this[idxKey] + 1) % tracks.length;
      this._playCurrent();
    };
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', () => {
      if (el !== this.audioElement) return;
      this.audioElement = null;
      setTimeout(onEnd, 1000);
    });
    el.play().catch(() => {
      if (el !== this.audioElement) return;
      this.musicPlaying = false;
      this._startedOnce = false;
    });
  }

  _stopPlayback() {
    this.musicPlaying = false;
    this._musicType = null;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
      this.audioElement = null;
    }
  }

  stopMusic() {
    this._stopPlayback();
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    if (this.audioElement) {
      this.audioElement.volume = this.musicMuted ? 0 : this.volume;
    }
    return this.musicMuted;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audioElement && !this.musicMuted) {
      this.audioElement.volume = this.volume;
    }
    if (this.ctx && this.musicGain && !this.musicMuted) {
      this.musicGain.gain.value = this.volume;
    }
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.value = this.sfxMuted ? 0 : 0.3;
    }
    return this.sfxMuted;
  }

  startChaseMusic() {
    this._chasePlaying = true;
    this._playChaseLoop();
  }

  _playChaseLoop() {
    if (!this._chasePlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bpm = 160;
    const beat = 60 / bpm;

    for (let i = 0; i < 8; i++) {
      const t = now + i * beat;
      const freq = 200 + (i % 4) * 60;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.6);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + beat * 0.6);

      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(80, t);
      g2.gain.setValueAtTime(0.04, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.8);
      osc2.connect(g2);
      g2.connect(this.musicGain);
      osc2.start(t);
      osc2.stop(t + beat * 0.8);
    }

    this._chaseTimeout = setTimeout(() => {
      this._playChaseLoop();
    }, 8 * beat * 1000);
  }

  stopChaseMusic() {
    this._chasePlaying = false;
    if (this._chaseTimeout) {
      clearTimeout(this._chaseTimeout);
      this._chaseTimeout = null;
    }
  }
}
