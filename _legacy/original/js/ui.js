import { REWARD_TIERS } from './rewards.js';
import { AREA_CONFIG } from './world.js';
import { CHARACTERS, CUSTOM_CHAR_INDEX, DEFAULT_CUSTOM_CHAR, hasCustomChar, loadCustomCharData, saveCustomCharData, getCharacterData } from './profile.js';
import { Player } from './player.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.animTimer = 0;
    this.menuPulse = 0;
    this.warningPulse = 0;
    this.menuButtons = [];
    this.selectedChar = 0;
    this.characterSelectActive = false;
    this.fallingLetters = [];
    this._letterSpawnTimer = 0;
    this.nameBuffer = '';
    this.customData = { ...DEFAULT_CUSTOM_CHAR };
    this.customName = '';
    this.customPreviewPlayer = null;
    this.customOptionHover = -1;
    this._hudTime = 0;
  }

  update(dt) {
    this.animTimer += dt;
    this.menuPulse += dt * 2;
    this.warningPulse += dt * 4;
    this._hudTime += dt;

    this._letterSpawnTimer += dt;
    if (this._letterSpawnTimer > 0.4 && this.fallingLetters.length < 25) {
      const chars = ['D', 'o', 'w', 'n', ',', ' '];
      this.fallingLetters.push({
        char: chars[Math.floor(Math.random() * chars.length)],
        x: Math.random() * this.game.width,
        y: -30,
        speed: 30 + Math.random() * 60,
        rot: (Math.random() - 0.5) * 0.05,
        angle: Math.random() * Math.PI * 2,
        size: 14 + Math.random() * 20,
        alpha: 0.3 + Math.random() * 0.4,
        wobble: Math.random() * 10,
        wobbleSpeed: 1 + Math.random() * 2,
      });
      this._letterSpawnTimer = 0;
    }

    for (const l of this.fallingLetters) {
      l.y += l.speed * dt;
      l.angle += l.rot;
      if (l.y > this.game.height + 40) l.y = -30;
    }
  }

  renderMenu(ctx) {
    const w = this.game.width;
    const h = this.game.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(0.3, '#2d1b69');
    grad.addColorStop(0.6, '#1a1a3e');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    let titleY = 140;
    let pulse = Math.sin(this.menuPulse) * 5;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.07)';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.fillText('Down, Down, Down', w / 2, titleY + pulse);
    ctx.restore();

    for (const l of this.fallingLetters) {
      const wobbleX = Math.sin(l.y * 0.02 + l.wobble) * l.wobble;
      ctx.save();
      ctx.translate(l.x + wobbleX, l.y);
      ctx.rotate(l.angle);
      ctx.globalAlpha = l.alpha * 0.45;
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${l.size}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.char, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(this.animTimer + i * 2.7) * 0.5 + 0.5) * w;
      const sy = ((i * 137 + this.animTimer * 30) % (h + 50)) - 25;
      const size = 2 + Math.sin(this.animTimer + i) * 1;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.1 + Math.sin(this.animTimer * 0.5 + i) * 0.05})`;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = j % 2 === 0 ? size : size * 0.4;
        if (j === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }

    titleY = 120;
    pulse = Math.sin(this.menuPulse) * 5;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.fillText('Down, Down, Down', w / 2 + 3, titleY + 3 + pulse);

    const titleGrad = ctx.createLinearGradient(w / 2 - 200, titleY, w / 2 + 200, titleY);
    titleGrad.addColorStop(0, '#FFD700');
    titleGrad.addColorStop(0.3, '#FFA500');
    titleGrad.addColorStop(0.6, '#FF69B4');
    titleGrad.addColorStop(1, '#00FFFF');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.fillText('Down, Down, Down', w / 2, titleY + pulse);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText("'When you fall down for the fun of it'", w / 2, titleY + 50);

    const btnY = 240;
    const btnW = 220;
    const btnH = 48;
    const btnX = (w - btnW) / 2;

    const hover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= btnY && this.game.input.mouseY <= btnY + btnH;
    const scale = hover ? 1.05 : 1;

    ctx.save();
    ctx.translate(w / 2, btnY + btnH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -(btnY + btnH / 2));

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#4ECDC4');
    btnGrad.addColorStop(1, '#2ECC71');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, btnX, btnY, btnW, btnH, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 24);
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('▶  PLAY', w / 2, btnY + 32);
    ctx.restore();

    const pracBtnY = btnY + btnH + 10;
    const pracHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= pracBtnY && this.game.input.mouseY <= pracBtnY + btnH;
    ctx.save();
    ctx.translate(w / 2, pracBtnY + btnH / 2);
    ctx.scale(pracHover ? 1.05 : 1, pracHover ? 1.05 : 1);
    ctx.translate(-w / 2, -(pracBtnY + btnH / 2));
    const pracGrad = ctx.createLinearGradient(btnX, pracBtnY, btnX, pracBtnY + btnH);
    pracGrad.addColorStop(0, '#FFA07A');
    pracGrad.addColorStop(1, '#FF6B6B');
    ctx.fillStyle = pracGrad;
    roundRect(ctx, btnX, pracBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🎮  Practice', w / 2, pracBtnY + 32);
    ctx.restore();

    const rewBtnY = pracBtnY + btnH + 10;
    const rewHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= rewBtnY && this.game.input.mouseY <= rewBtnY + btnH;
    ctx.save();
    ctx.translate(w / 2, rewBtnY + btnH / 2);
    ctx.scale(rewHover ? 1.05 : 1, rewHover ? 1.05 : 1);
    ctx.translate(-w / 2, -(rewBtnY + btnH / 2));
    const rewGrad = ctx.createLinearGradient(btnX, rewBtnY, btnX, rewBtnY + btnH);
    rewGrad.addColorStop(0, '#C084FC');
    rewGrad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = rewGrad;
    roundRect(ctx, btnX, rewBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🏆  Rewards', w / 2, rewBtnY + 32);
    ctx.restore();

    const leadBtnY = rewBtnY + btnH + 10;
    const leadHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= leadBtnY && this.game.input.mouseY <= leadBtnY + btnH;
    ctx.save();
    ctx.translate(w / 2, leadBtnY + btnH / 2);
    ctx.scale(leadHover ? 1.05 : 1, leadHover ? 1.05 : 1);
    ctx.translate(-w / 2, -(leadBtnY + btnH / 2));
    const leadGrad = ctx.createLinearGradient(btnX, leadBtnY, btnX, leadBtnY + btnH);
    leadGrad.addColorStop(0, '#4DD0E1');
    leadGrad.addColorStop(1, '#26A69A');
    ctx.fillStyle = leadGrad;
    roundRect(ctx, btnX, leadBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🏅  Leaderboard', w / 2, leadBtnY + 32);
    ctx.restore();

    const charDisplayX = w - 150;
    const charDisplayY = btnY - 10;
    const charDisplayW = 140;
    const charDisplayH = leadBtnY + btnH - btnY + 20;
    const charHover = this.game.input.mouseX >= charDisplayX && this.game.input.mouseX <= charDisplayX + charDisplayW && this.game.input.mouseY >= charDisplayY && this.game.input.mouseY <= charDisplayY + charDisplayH;
    ctx.save();
    if (charHover) {
      ctx.shadowColor = 'rgba(255,215,0,0.3)';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = charHover ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.35)';
    roundRect(ctx, charDisplayX, charDisplayY, charDisplayW, charDisplayH, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = charHover ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = charHover ? 2 : 1;
    roundRect(ctx, charDisplayX, charDisplayY, charDisplayW, charDisplayH, 16);
    ctx.stroke();

    const ci = this.game.profile ? this.game.profile.selectedCharacter : 0;
    if (!this._menuPlayer || this._menuPlayer.charIndex !== ci) {
      this._menuPlayer = new Player(0, 0);
      this._menuPlayer.setCharacter(ci);
      this._menuPlayer.portraitMode = true;
    }
    const mp = this._menuPlayer;
    mp.eyeBlink = this.animTimer * 1.2;
    const exprCycle2 = Math.sin(this.animTimer * 0.25);
    mp.expression = exprCycle2 > 0.3 ? 'happy' : exprCycle2 < -0.3 ? 'determined' : 'neutral';
    const charBob = Math.sin(this.animTimer * 2) * 3;
    ctx.save();
    ctx.translate(charDisplayX + charDisplayW / 2, charDisplayY + charDisplayH / 2 + charBob);
    mp.render(ctx);
    ctx.restore();

    const cd = getCharacterData(ci);
    ctx.fillStyle = charHover ? '#FFD700' : 'rgba(255,255,255,0.4)';
    ctx.font = '11px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText((cd ? cd.theme : '') + ' ' + (cd ? cd.name : ''), charDisplayX + charDisplayW / 2, charDisplayY + charDisplayH - 8);
    if (charHover) {
      ctx.fillStyle = 'rgba(255,215,0,0.5)';
      ctx.font = '9px "Comic Sans MS", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('✏ Click to edit', charDisplayX + charDisplayW / 2, charDisplayY + charDisplayH - 20);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('← → or A/D to move  |  Space to jump & soft-fall  |  Collect Tokens  |  Avoid hazards', w / 2, leadBtnY + btnH + 28);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('For ages 5-13', w / 2, leadBtnY + btnH + 52);

    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;
    const audio = this.game.audio;

    const volSliderX = 20;
    const volSliderY = h - 88;
    const volW = 100;
    const volH = 6;
    const volVal = audio.volume / 0.5;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, volSliderX, volSliderY, volW, volH, 3);
    ctx.fill();
    ctx.fillStyle = audio.musicMuted ? 'rgba(255,80,80,0.3)' : 'rgba(255,215,0,0.6)';
    roundRect(ctx, volSliderX, volSliderY, volW * volVal, volH, 3);
    ctx.fill();
    ctx.fillStyle = audio.musicMuted ? '#FF6666' : '#FFD700';
    ctx.beginPath();
    ctx.arc(volSliderX + volW * volVal, volSliderY + volH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('VOL', volSliderX + volW / 2, volSliderY - 5);
    ctx.restore();

    const musicBtnX = 20;
    const musicBtnY = h - 52;
    const sfxBtnX = 76;
    const sfxBtnY = h - 52;
    const btnWH = 46;
    const btnHH = 36;

    const musicHover = mx >= musicBtnX && mx <= musicBtnX + btnWH && my >= musicBtnY && my <= musicBtnY + btnHH;
    ctx.save();
    ctx.fillStyle = audio.musicMuted ? 'rgba(200,50,50,0.5)' : musicHover ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    roundRect(ctx, musicBtnX, musicBtnY, btnWH, btnHH, 18);
    ctx.fill();
    ctx.strokeStyle = audio.musicMuted ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, musicBtnX, musicBtnY, btnWH, btnHH, 18);
    ctx.stroke();
    ctx.fillStyle = audio.musicMuted ? '#FF6666' : '#FFD700';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(audio.musicMuted ? '🔇' : '🎵', musicBtnX + btnWH / 2, musicBtnY + btnHH / 2);
    ctx.restore();

    const sfxHover = mx >= sfxBtnX && mx <= sfxBtnX + btnWH && my >= sfxBtnY && my <= sfxBtnY + btnHH;
    ctx.save();
    ctx.fillStyle = audio.sfxMuted ? 'rgba(200,50,50,0.5)' : sfxHover ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    roundRect(ctx, sfxBtnX, sfxBtnY, btnWH, btnHH, 18);
    ctx.fill();
    ctx.strokeStyle = audio.sfxMuted ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, sfxBtnX, sfxBtnY, btnWH, btnHH, 18);
    ctx.stroke();
    ctx.fillStyle = audio.sfxMuted ? '#FF6666' : '#FFD700';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(audio.sfxMuted ? '🔇' : '🔊', sfxBtnX + btnWH / 2, sfxBtnY + btnHH / 2);
    ctx.restore();

    ctx.restore();
  }

  renderNameEntry(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = Date.now() / 1000;

    // Fun gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1a1a3e');
    bgGrad.addColorStop(0.5, '#2d1b69');
    bgGrad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Floating stars decoration
    ctx.save();
    for (let i = 0; i < 25; i++) {
      const sx = (Math.sin(t * 0.3 + i * 2.7) * 0.5 + 0.5) * w;
      const sy = (Math.cos(t * 0.5 + i * 1.3) * 0.5 + 0.5) * h;
      const size = 2 + Math.sin(t + i) * 1.5;
      const alpha = 0.3 + Math.sin(t * 2 + i) * 0.2;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(sx, sy, size, size);
      ctx.fillRect(sx - size, sy, size, size);
      ctx.fillRect(sx, sy - size, size, size);
      ctx.fillRect(sx + size, sy, size, size);
      ctx.fillRect(sx, sy + size, size, size);
    }
    ctx.restore();

    // Decorative rainbow arches
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const arcY = 60 + i * 35;
      ctx.strokeStyle = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC'][i % 5];
      ctx.globalAlpha = 0.15 + Math.sin(t + i) * 0.05;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, arcY + 40, 80 + i * 30, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();

    // Bouncing title
    ctx.save();
    ctx.textAlign = 'center';
    const bounce = Math.sin(t * 2) * 3;
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 40px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🌈 What is your name? 🌈', w / 2, 105 + bounce);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Pick a fun name for your adventure!', w / 2, 145);
    ctx.restore();

    // Fancy input box with glow
    const nameBuffer = this.nameBuffer || '';
    const displayText = nameBuffer + (Date.now() % 800 < 400 ? '|' : '');

    ctx.save();
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, w / 2 - 170, 175, 340, 64, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 3;
    roundRect(ctx, w / 2 - 170, 175, 340, 64, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(displayText, w / 2, 208);
    ctx.restore();

    // Fun instruction
    ctx.save();
    ctx.textAlign = 'center';
    const pulse = Math.sin(t * 2.5) * 0.15 + 0.85;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('✨ Type your name, then press Enter or click OK! ✨', w / 2, 265);
    ctx.restore();

    // OK Button with fun design
    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;
    const btnW = 160;
    const btnH = 56;
    const btnX = (w - btnW) / 2;
    const btnY = 295;
    const hover = mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;

    ctx.save();
    ctx.shadowColor = hover ? 'rgba(255,215,0,0.6)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = hover ? 25 : 10;
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, hover ? '#FF8C42' : '#FF6B6B');
    btnGrad.addColorStop(0.5, hover ? '#FF6B6B' : '#FF8C42');
    btnGrad.addColorStop(1, hover ? '#FF4444' : '#FF6B6B');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, btnX, btnY, btnW, btnH, 28);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 28);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Comic Sans MS", "Segoe UI", sans-serif';
    const btnBounce = hover ? Math.sin(t * 8) * 2 : 0;
    ctx.fillText('🌟 OK! 🌟', w / 2, btnY + btnH / 2 + btnBounce);

    // Decorative sparkles around button
    if (hover) {
      for (let i = 0; i < 6; i++) {
        const angle = t * 3 + i * Math.PI / 3;
        const dist = 35 + Math.sin(t * 5 + i) * 8;
        const sx = btnX + btnW / 2 + Math.cos(angle) * dist;
        const sy = btnY + btnH / 2 + Math.sin(angle) * dist;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4 + i) * 0.3;
        ctx.fillStyle = ['#FFD700', '#FF6B6B', '#6BCB77', '#4D96FF', '#C084FC', '#FFD93D'][i];
        ctx.beginPath();
        ctx.arc(sx, sy, 4 + Math.sin(t * 6 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  renderCharacterSelect(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = Date.now() / 1000;

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1a1a3e');
    bgGrad.addColorStop(0.4, '#2d1b69');
    bgGrad.addColorStop(0.7, '#1a3a4e');
    bgGrad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(t * 0.2 + i * 3.1) * 0.5 + 0.5) * w;
      const sy = (Math.cos(t * 0.4 + i * 1.7) * 0.5 + 0.5) * h;
      const size = 2 + Math.sin(t + i * 0.5) * 1.5;
      ctx.globalAlpha = 0.2 + Math.sin(t * 2 + i) * 0.1;
      ctx.fillStyle = ['#FFD700','#FF6B6B','#6BCB77','#4D96FF','#C084FC'][i % 5];
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 3, sy - 2, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const bounce = Math.sin(t * 2) * 3;
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Choose Your Character! 🌟', w / 2, 14 + bounce);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Click a friend to play!', w / 2, 52);
    ctx.restore();

    const chars = CHARACTERS;
    const showCustom = true;
    this._charPreviews = this._charPreviews || [];
    for (let i = this._charPreviews.length; i < chars.length; i++) {
      const p = new Player(0, 0);
      p.setCharacter(i);
      p.portraitMode = true;
      this._charPreviews.push(p);
    }

    const cols = 4;
    const cardW = 130;
    const cardH = 108;
    const gapX = 10;
    const gapY = 8;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (w - totalW) / 2;
    const startY = 68;

    const mx2 = this.game.input.mouseX;
    const my2 = this.game.input.mouseY;

    const renderCard = (charData, idx, isCustom) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      const sel = idx === this.selectedChar;
      const hover = mx2 >= cx && mx2 <= cx + cardW && my2 >= cy && my2 <= cy + cardH;
      const bob = Math.sin(t * 2 + idx * 1.5) * 2;

      ctx.save();
      if (sel) {
        ctx.shadowColor = charData.color;
        ctx.shadowBlur = 20 + Math.sin(t * 4) * 6;
      } else if (hover) {
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 12;
      }
      const bg = ctx.createLinearGradient(cx, cy + bob, cx, cy + cardH + bob);
      bg.addColorStop(0, sel ? 'rgba(255,215,0,0.25)' : hover ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)');
      bg.addColorStop(1, sel ? 'rgba(255,215,0,0.1)' : hover ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)');
      ctx.fillStyle = bg;
      roundRect(ctx, cx, cy + bob, cardW, cardH, 14);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = sel ? '#FFD700' : hover ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = sel ? 3 : 1.5;
      roundRect(ctx, cx, cy + bob, cardW, cardH, 14);
      ctx.stroke();
      ctx.restore();

      const cardCenterX = cx + cardW / 2;

      if (isCustom) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px "Comic Sans MS", sans-serif';
        ctx.fillText('🌟 Custom', cardCenterX, cy + bob + 10);
        ctx.font = 'bold 28px "Comic Sans MS", sans-serif';
        ctx.fillText('✨', cardCenterX, cy + bob + 42);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 11px "Comic Sans MS", sans-serif';
        ctx.fillText('Build your own!', cardCenterX, cy + bob + 74);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '10px "Comic Sans MS", sans-serif';
        ctx.fillText('Click to create', cardCenterX, cy + bob + 92);
        ctx.restore();
      } else {
        const preview = this._charPreviews[idx];
        if (preview) {
          preview.eyeBlink = t * 1.2 + idx * 7;
          const exprCycle = Math.sin(t * 0.3 + idx * 2.1);
          let expression = 'neutral';
          if (exprCycle > 0.5) expression = 'happy';
          if (exprCycle < -0.5) expression = 'determined';

          preview.expression = expression;
          preview.portraitBounce = Math.sin(t * 2 + idx * 1.5) * 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = sel ? '#FFFFFF' : 'rgba(255,255,255,0.85)';
          ctx.font = 'bold 12px "Comic Sans MS", "Segoe UI", sans-serif';
          ctx.fillText(charData.theme + ' ' + charData.name, cardCenterX, cy + bob + 10);

          ctx.translate(cardCenterX, cy + bob + 38);
          ctx.translate(0, preview.portraitBounce);
          preview.render(ctx);
          ctx.restore();

          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = sel ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
          ctx.font = '10px "Comic Sans MS", "Segoe UI", sans-serif';
          ctx.fillText(charData.tag, cardCenterX, cy + bob + 72);

          if (charData.stats) {
            const s = charData.stats;
            const barW = cardW - 14;
            const barX = cx + 7;
            const barH = 7;
            const barY = cy + bob + 78;

            const drawBar = (label, val, min, max, color, by) => {
              const pct = Math.max(0, Math.min(1, (val - min) / (max - min)));
              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              roundRect(ctx, barX, by, barW, barH, 2);
              ctx.fill();
              ctx.fillStyle = color;
              const segs = 8;
              const segW = (barW - 2) / segs;
              for (let i = 0; i < segs; i++) {
                if (i / segs <= pct) {
                  const sAlpha = sel ? 1 : 0.7;
                  ctx.globalAlpha = sAlpha * (0.6 + 0.4 * Math.sin(i * 0.5 + t * 2));
                  roundRect(ctx, barX + 1 + i * segW, by + 1, segW - 1, barH - 2, 1.5);
                  ctx.fill();
                }
              }
              ctx.globalAlpha = 1;
              ctx.fillStyle = sel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)';
              ctx.font = 'bold 8px "Comic Sans MS", sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(label, barX, by - 1);
              ctx.textAlign = 'right';
              ctx.fillStyle = color;
              ctx.font = 'bold 8px "Comic Sans MS", sans-serif';
              ctx.fillText(val, barX + barW, by - 1);
            };

            drawBar('Spd', s.speed, 240, 350, '#4DD0E1', barY);
            drawBar('Jump', s.jump, 45, 65, '#81C784', barY + barH + 2);
            if (s.bonusPoints > 1) {
              ctx.fillStyle = '#FFD700';
              ctx.font = 'bold 9px "Comic Sans MS", sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText(`x${s.bonusPoints}`, barX + barW, barY + barH - 1);
            }
            ctx.restore();
          } else {
            ctx.restore();
          }
        }
      }
    };

    for (let i = 0; i < chars.length; i++) {
      renderCard(chars[i], i, false);
    }

    const customIdx = chars.length;
    const customCol = customIdx % cols;
    const customRow = Math.floor(customIdx / cols);
    if (customCol < cols) {
      renderCard({ name: 'Custom', color: '#FFD700' }, customIdx, true);
    }

    const nameDisplay = this.game.profile && this.game.profile.hasName() ? this.game.profile.name : 'Adventurer';
    const cardsBottom = startY + 3 * (cardH + gapY);
    const nameY = cardsBottom + 14;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Playing as: ' + nameDisplay, w / 2, nameY);

    const nameBtnW = 130;
    const nameBtnH = 22;
    const nameBtnX = (w - nameBtnW) / 2;
    const nameBtnY = nameY + 4;
    const nameHover = mx2 >= nameBtnX && mx2 <= nameBtnX + nameBtnW && my2 >= nameBtnY && my2 <= nameBtnY + nameBtnH;
    ctx.save();
    ctx.fillStyle = nameHover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, nameBtnX, nameBtnY, nameBtnW, nameBtnH, 11);
    ctx.fill();
    ctx.strokeStyle = nameHover ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, nameBtnX, nameBtnY, nameBtnW, nameBtnH, 11);
    ctx.stroke();
    ctx.fillStyle = nameHover ? '#FFD700' : 'rgba(255,255,255,0.4)';
    ctx.font = '11px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✏ Change Name', w / 2, nameBtnY + 11);
    ctx.restore();

    const btnY = nameY + 54;
    const btnW = 200;
    const btnH2 = 48;
    const btnX = (w - btnW) / 2;
    const btnHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= btnY && this.game.input.mouseY <= btnY + btnH2;

    ctx.save();
    ctx.shadowColor = btnHover ? 'rgba(255,215,0,0.6)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = btnHover ? 30 : 10;
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH2);
    btnGrad.addColorStop(0, btnHover ? '#FF8C42' : '#4ECDC4');
    btnGrad.addColorStop(0.5, btnHover ? '#FF6B6B' : '#2ECC71');
    btnGrad.addColorStop(1, btnHover ? '#FF4444' : '#27AE60');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, btnX, btnY, btnW, btnH2, 24);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, btnY, btnW, btnH2, 24);
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const btnBounce = btnHover ? Math.sin(t * 8) * 2 : 0;
    ctx.fillText('🌟 LET\'S GO! 🌟', w / 2, btnY + btnH2 / 2 + btnBounce);
    ctx.restore();

    if (btnHover) {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const angle = t * 3 + i * Math.PI / 3;
        const dist = 40 + Math.sin(t * 5 + i) * 8;
        const sx = btnX + btnW / 2 + Math.cos(angle) * dist;
        const sy = btnY + btnH2 / 2 + Math.sin(angle) * dist;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4 + i) * 0.3;
        ctx.fillStyle = ['#FFD700', '#FF6B6B', '#6BCB77', '#4D96FF', '#C084FC', '#FFD93D'][i];
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + Math.sin(t * 6 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const backBtnY = btnY + btnH2 + 14;
    const backBtnW = 130;
    const backBtnH = 30;
    const backBtnX = (w - backBtnW) / 2;
    const backHover = this.game.input.mouseX >= backBtnX && this.game.input.mouseX <= backBtnX + backBtnW &&
      this.game.input.mouseY >= backBtnY && this.game.input.mouseY <= backBtnY + backBtnH;
    ctx.save();
    ctx.fillStyle = backHover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 15);
    ctx.fill();
    ctx.strokeStyle = backHover ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 15);
    ctx.stroke();
    ctx.fillStyle = backHover ? '#FFD700' : 'rgba(255,255,255,0.5)';
    ctx.font = '12px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Back to Menu', w / 2, backBtnY + backBtnH / 2);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '11px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← → to pick  |  Click to choose  |  Enter or click GO to start!', w / 2, backBtnY + 38);
  }


  renderHUD(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const hasWorld = this.game.world !== null;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, 10, 10, 200, 105, 12);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255,215,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 16px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`⭐ ${this.game.starsCollected}`, 25, 16);
    ctx.shadowBlur = 0;

    if (hasWorld) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`📏 ${Math.floor(this.game.world.totalDistance)}m`, 25, 42);
    }

    ctx.fillStyle = '#6DD5FA';
    ctx.font = 'bold 11px "Comic Sans MS", "Segoe UI", sans-serif';
    if (hasWorld) {
    const diff = this.game.world.getRewardDifficulty(this.game.rewards ? this.game.rewards.currentTier : 0);
    ctx.fillText(`Difficulty: ${diff.icon} ${diff.name}`, 25, 65);
    } else {
    ctx.fillText('Difficulty: 🌱 Beginner', 25, 65);
    }

    const hearts = '❤️'.repeat(Math.max(0, this.game.lives));
    const emptyHearts = '🖤'.repeat(Math.max(0, this.game.maxLives - Math.max(0, this.game.lives)));
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`${hearts}${emptyHearts}`, 25, 85);

    const pu = this.game.player ? this.game.player.powerUp : null;
    const puTimer = this.game.player ? this.game.player.powerUpTimer : 0;
    if (pu && puTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const icons = { wings: '🪽', rocket: '🚀', shield: '🛡', x2: '✨', streak: '💜' };
      const colors = { wings: '#CCCCFF', rocket: '#FF6600', shield: '#00CCFF', x2: '#FFD700', streak: '#FF64FF' };
      ctx.fillStyle = colors[pu] || '#CCCCFF';
      ctx.shadowColor = colors[pu] || 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
      const label = pu === 'streak' ? `x${Math.min(this.game._streakFactor || 1, 256)}` : `x2`;
      ctx.fillText(`${icons[pu] || '✦'} ${label} ${Math.ceil(puTimer)}s`, w / 2, 10);
      ctx.restore();
    }

    if (this.game._puNotification) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const alpha = Math.min(1, this.game._puNotification.timer);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(this.game._puNotification.message, w / 2, 36);
      ctx.restore();
    }

    if (this.game._missedStarNotification) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const alpha2 = Math.min(1, this.game._missedStarNotification.timer * 2);
      ctx.globalAlpha = alpha2;
      ctx.shadowColor = 'rgba(255,60,60,0.5)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText('❌ Streak Lost!', w / 2, 62);
      ctx.restore();
    }

    if (this.game._respawnTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 42px "Comic Sans MS", "Segoe UI", sans-serif';
      const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.85;
      ctx.globalAlpha = pulse;
      ctx.fillText('Get Ready! 🌟', w / 2, h / 2);
      ctx.restore();
    }

    if (this.game.enemy && this.game.enemy.active) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const pulse = Math.sin(this.warningPulse) * 0.25 + 0.75;
      ctx.shadowColor = `rgba(255, 0, 0, ${pulse * 0.6})`;
      ctx.shadowBlur = 16;
      ctx.fillStyle = `rgba(255, 30, 30, ${pulse * 0.95})`;
      ctx.font = 'bold 28px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText('⚠  ENEMY CHASING!  ⚠', w / 2, 70);
      ctx.restore();
    }

    if (this.game.rewards) {
      const notifs = this.game.rewards.notifications;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i < notifs.length; i++) {
        const alpha = Math.min(1, notifs[i].timer);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.shadowColor = 'rgba(255,215,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('🎉 ' + notifs[i].message, w / 2, 135 + i * 30);
        ctx.shadowBlur = 0;
      }

      const streak = this.game.rewards ? this.game.rewards.streak : 0;
      ctx.save();
      const pulse = streak >= 7 ? 1 + 0.1 * Math.sin(this._hudTime * 8) : 1;
      const barW = 165;
      const barH = 8;
      const barX = w - 175;
      const barY = 60;
      const fill = Math.min(1, streak / 10);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, barX, barY - 10, barW, 35, 13);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, barX + 2, barY + 10, barW - 4, barH, 4);
      ctx.fill();

      let barColor = '#4DD0E1';
      if (streak >= 9) barColor = '#FF8A65';
      else if (streak >= 7) barColor = '#FFD54F';
      else if (streak >= 5) barColor = '#81C784';
      else if (streak >= 3) barColor = '#4FC3F7';

      ctx.fillStyle = barColor;
      roundRect(ctx, barX + 2, barY + 10, (barW - 4) * fill, barH, 4);
      ctx.fill();

      if (streak >= 7) {
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 8 * pulse;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = streak >= 10 ? '#45FF45' : '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.font = `bold ${Math.round(12 * pulse)}px "Comic Sans MS", "Segoe UI", sans-serif`;
      ctx.fillText(`🔥 ${streak}/10`, barX + barW / 2, barY - 4);
      ctx.shadowBlur = 0;
      ctx.restore();

      if (hasWorld) {
      const area = this.game.world.area;
      const ac = AREA_CONFIG[area] || AREA_CONFIG[1];
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, w - 175, 90, 165, 26, 13);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = ac.badgeColor;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3;
      ctx.font = 'bold 11px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(`🗺 ${ac.name}`, w - 92, 96);
      ctx.shadowBlur = 0;
      ctx.restore();

      if (this.game._areaNotification > 0) {
        const alpha = Math.min(1, this.game._areaNotification);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
        roundRect(ctx, w / 2 - 180, h / 2 - 40, 360, 80, 16);
        ctx.fill();
        ctx.shadowColor = ac.notifShadow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `${ac.notifColor}${alpha})`;
        ctx.font = 'bold 28px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText(`🌍 ${ac.name}!`, w / 2, h / 2 - 5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.font = '16px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('New challenges await!', w / 2, h / 2 + 25);
        ctx.restore();
      }

      if (this.game.rewards) {
      const tier = this.game.rewards.getTier();
      const prog = this.game.rewards.progress;
      const req = tier.req;

      const barCX = w / 2;
      const barCY = h - 35;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      roundRect(ctx, barCX - 160, barCY - 12, 320, 24, 12);
      ctx.fill();

      const fillPct = prog / req;
      if (fillPct > 0) {
        const fillGrad = ctx.createLinearGradient(barCX - 155, barCY - 7, barCX - 155 + 310 * fillPct, barCY - 7);
        fillGrad.addColorStop(0, tier.color);
        fillGrad.addColorStop(0.5, '#FFD700');
        fillGrad.addColorStop(1, tier.color);
        ctx.fillStyle = fillGrad;
        roundRect(ctx, barCX - 155, barCY - 7, 310 * fillPct, 14, 7);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.font = 'bold 12px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${tier.icon} ${prog}/${req}`, barCX, barCY - 14);
      ctx.shadowBlur = 0;

      ctx.restore();

      if (this.game.rewards.currentTier > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText(`${REWARD_TIERS[this.game.rewards.currentTier - 1].icon} ✓  →  ${tier.icon}`, barCX, h - 2);
        ctx.restore();
      }
      }
      }
      }

    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    if (this.game.state === 'PLAYING') {
      ctx.save();
      const pBtnX = w - 38;
      const pBtnY = 8;
      const pBtnS = 28;
      const pBtnR = 14;
      const pBtnHover = mx >= pBtnX - pBtnS/2 && mx <= pBtnX + pBtnS/2 && my >= pBtnY && my <= pBtnY + pBtnS;
      ctx.fillStyle = pBtnHover ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)';
      roundRect(ctx, pBtnX - pBtnS/2, pBtnY, pBtnS, pBtnS, pBtnR);
      ctx.fill();
      ctx.fillStyle = pBtnHover ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 16px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸', pBtnX, pBtnY + pBtnS/2);
      ctx.restore();
    }

    const audio = this.game.audio;

    const musicBtnX = 20;
    const musicBtnY = h - 52;
    const sfxBtnX = 76;
    const sfxBtnY = h - 52;
    const btnWH = 46;
    const btnHH = 36;

    const musicHover = mx >= musicBtnX && mx <= musicBtnX + btnWH && my >= musicBtnY && my <= musicBtnY + btnHH;
    ctx.save();
    ctx.fillStyle = audio.musicMuted ? 'rgba(200,50,50,0.5)' : musicHover ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    roundRect(ctx, musicBtnX, musicBtnY, btnWH, btnHH, 18);
    ctx.fill();
    ctx.strokeStyle = audio.musicMuted ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, musicBtnX, musicBtnY, btnWH, btnHH, 18);
    ctx.stroke();
    ctx.fillStyle = audio.musicMuted ? '#FF6666' : '#FFD700';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(audio.musicMuted ? '🔇' : '🎵', musicBtnX + btnWH / 2, musicBtnY + btnHH / 2);
    ctx.restore();

    const sfxHover = mx >= sfxBtnX && mx <= sfxBtnX + btnWH && my >= sfxBtnY && my <= sfxBtnY + btnHH;
    ctx.save();
    ctx.fillStyle = audio.sfxMuted ? 'rgba(200,50,50,0.5)' : sfxHover ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    roundRect(ctx, sfxBtnX, sfxBtnY, btnWH, btnHH, 18);
    ctx.fill();
    ctx.strokeStyle = audio.sfxMuted ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, sfxBtnX, sfxBtnY, btnWH, btnHH, 18);
    ctx.stroke();
    ctx.fillStyle = audio.sfxMuted ? '#FF6666' : '#FFD700';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(audio.sfxMuted ? '🔇' : '🔊', sfxBtnX + btnWH / 2, sfxBtnY + btnHH / 2);
    ctx.restore();

    ctx.restore();
  }

  renderMobileControls(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const inp = this.game.input;
    const bottom = h - 75;

    ctx.save();

    const buttons = [
      { id: 'left', cx: 70, cy: bottom, r: 38, label: '◀', color: '#4ECDC4' },
      { id: 'right', cx: 195, cy: bottom, r: 38, label: '▶', color: '#4ECDC4' },
      { id: 'jump', cx: w - 70, cy: bottom, r: 42, label: 'JUMP', color: '#FF6B6B', fontSize: 13 },
    ];

    for (const b of buttons) {
      const pressed = b.id === 'left' ? (inp.touchLeft || inp.mouseLeft) :
                      b.id === 'right' ? (inp.touchRight || inp.mouseRight) :
                      (inp.touchJump || inp.spaceHeld);
      const scale = pressed ? 0.88 : 1;
      const baseAlpha = pressed ? 0.95 : 0.6;

      ctx.save();
      ctx.globalAlpha = baseAlpha;

      ctx.translate(b.cx, b.cy);
      ctx.scale(scale, scale);
      ctx.translate(-b.cx, -b.cy);

      if (pressed) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = pressed ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = pressed ? b.color : b.color + '80';
      ctx.lineWidth = pressed ? 3 : 2;
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = pressed ? '#FFFFFF' : b.color;
      ctx.shadowColor = pressed ? 'rgba(255,255,255,0.3)' : 'transparent';
      ctx.shadowBlur = pressed ? 8 : 0;
      ctx.font = 'bold ' + (b.fontSize || 22) + 'px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.cx, b.cy + 1);
      ctx.restore();
    }

    ctx.restore();
  }

  renderPauseOverlay(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = Date.now() / 1000;

    const pulse = Math.sin(t * 3) * 0.05 + 0.95;
    ctx.save();

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, 450);
    bgGrad.addColorStop(0, 'rgba(20, 20, 60, 0.85)');
    bgGrad.addColorStop(1, 'rgba(5, 5, 20, 0.95)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const cardW = 340;
    const cardH = 340;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    ctx.shadowColor = 'rgba(255, 215, 0, 0.25)';
    ctx.shadowBlur = 35;
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(25, 25, 70, 0.95)');
    cardGrad.addColorStop(0.5, 'rgba(40, 20, 60, 0.95)');
    cardGrad.addColorStop(1, 'rgba(15, 15, 45, 0.95)');
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 * pulse})`;
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('⏸ Paused', w / 2, cardY + 28);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Take a breather!', w / 2, cardY + 70);

    const btnW = 240;
    const btnH = 48;
    const btnX = (w - btnW) / 2;

    const resumeBtnY = cardY + 110;
    const restartBtnY = cardY + 170;
    const quitBtnY = cardY + 230;

    const resumeHover = mx >= btnX && mx <= btnX + btnW && my >= resumeBtnY && my <= resumeBtnY + btnH;
    ctx.save();
    ctx.shadowColor = resumeHover ? 'rgba(78, 205, 196, 0.7)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = resumeHover ? 25 : 10;
    ctx.globalAlpha = resumeHover ? 1 : 0.9;
    const resScale = resumeHover ? 1.04 : 1;
    ctx.translate(btnX + btnW / 2, resumeBtnY + btnH / 2);
    ctx.scale(resScale, resScale);
    ctx.translate(-(btnX + btnW / 2), -(resumeBtnY + btnH / 2));
    const resGrad = ctx.createLinearGradient(btnX, resumeBtnY, btnX, resumeBtnY + btnH);
    resGrad.addColorStop(0, '#4ECDC4');
    resGrad.addColorStop(1, '#2ECC71');
    ctx.fillStyle = resGrad;
    roundRect(ctx, btnX, resumeBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = resumeHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, resumeBtnY, btnW, btnH, 24);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('▶ Resume', w / 2, resumeBtnY + 32);
    ctx.shadowBlur = 0;
    ctx.restore();

    const restartHover = mx >= btnX && mx <= btnX + btnW && my >= restartBtnY && my <= restartBtnY + btnH;
    ctx.save();
    ctx.shadowColor = restartHover ? 'rgba(255, 200, 50, 0.7)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = restartHover ? 25 : 10;
    ctx.globalAlpha = restartHover ? 1 : 0.9;
    const rstScale = restartHover ? 1.04 : 1;
    ctx.translate(btnX + btnW / 2, restartBtnY + btnH / 2);
    ctx.scale(rstScale, rstScale);
    ctx.translate(-(btnX + btnW / 2), -(restartBtnY + btnH / 2));
    const rstGrad = ctx.createLinearGradient(btnX, restartBtnY, btnX, restartBtnY + btnH);
    rstGrad.addColorStop(0, '#FFB74D');
    rstGrad.addColorStop(1, '#FF9800');
    ctx.fillStyle = rstGrad;
    roundRect(ctx, btnX, restartBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = restartHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, restartBtnY, btnW, btnH, 24);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🔄 Restart', w / 2, restartBtnY + 32);
    ctx.shadowBlur = 0;
    ctx.restore();

    const quitHover = mx >= btnX && mx <= btnX + btnW && my >= quitBtnY && my <= quitBtnY + btnH;
    ctx.save();
    ctx.shadowColor = quitHover ? 'rgba(255, 120, 120, 0.7)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = quitHover ? 25 : 10;
    ctx.globalAlpha = quitHover ? 1 : 0.9;
    const qScale = quitHover ? 1.04 : 1;
    ctx.translate(btnX + btnW / 2, quitBtnY + btnH / 2);
    ctx.scale(qScale, qScale);
    ctx.translate(-(btnX + btnW / 2), -(quitBtnY + btnH / 2));
    const qGrad = ctx.createLinearGradient(btnX, quitBtnY, btnX, quitBtnY + btnH);
    qGrad.addColorStop(0, '#FF8A80');
    qGrad.addColorStop(1, '#E53935');
    ctx.fillStyle = qGrad;
    roundRect(ctx, btnX, quitBtnY, btnW, btnH, 24);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = quitHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, quitBtnY, btnW, btnH, 24);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🏠 Main Menu', w / 2, quitBtnY + 32);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Press ESC to go back', w / 2, cardY + cardH - 8);

    ctx.restore();
  }

  renderGameOver(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = this.animTimer;

    ctx.save();

    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 450);
    grad.addColorStop(0, 'rgba(80, 20, 40, 0.85)');
    grad.addColorStop(1, 'rgba(10, 5, 15, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const sparkleTimer = t * 3;
    for (let i = 0; i < 20; i++) {
      const sx = (Math.sin(sparkleTimer + i * 2.1) * 0.5 + 0.5) * w;
      const sy = (Math.cos(sparkleTimer * 0.7 + i * 1.3) * 0.5 + 0.5) * h;
      ctx.globalAlpha = 0.15 + Math.sin(sparkleTimer * 2 + i) * 0.1;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + Math.sin(sparkleTimer + i) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const ci = this.game.profile ? this.game.profile.selectedCharacter : 0;
    if (!this._gameOverPlayer || this._gameOverPlayer.charIndex !== ci) {
      this._gameOverPlayer = new Player(0, 0);
      this._gameOverPlayer.setCharacter(ci);
      this._gameOverPlayer.portraitMode = true;
    }
    const gp = this._gameOverPlayer;
    gp.eyeBlink = t * 1.2;
    gp.expression = 'hurt';
    const charBob2 = Math.sin(t * 2) * 3;

    ctx.save();
    ctx.translate(160, 240 + charBob2);
    gp.render(ctx);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const titlePulse = Math.sin(t * 3) * 3;
    ctx.shadowColor = 'rgba(255, 100, 100, 0.5)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 48px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Nice Try!', w / 2, 20 + titlePulse);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText("You're doing great! Keep practicing! 🌟", w / 2, 72);

    const cardX = 270;
    const cardY = 110;
    const cardW2 = w - cardX - 30;
    const cardH2 = 230;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, cardX, cardY, cardW2, cardH2, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW2, cardH2, 16);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(255,215,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`⭐ ${this.game.starsCollected}`, cardX + 16, cardY + 12);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'white';
    ctx.font = '22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`📏 ${Math.floor(this.game.world.totalDistance)}m`, cardX + 16, cardY + 52);

    ctx.fillStyle = '#FF8A80';
    ctx.font = '22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`❤️ ${this.game.lives}/${this.game.maxLives}`, cardX + 16, cardY + 92);

    const rewards = this.game.rewards;
    if (rewards) {
      ctx.fillStyle = '#81C784';
      ctx.font = '20px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(`🔥 ${rewards.bestStreak || 0}`, cardX + 16, cardY + 132);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
    const cd = getCharacterData(ci);
    ctx.fillText((cd ? cd.theme : '') + ' ' + (cd ? cd.name : ''), cardX + 16, cardY + 180);

    const playBtnY = 390;
    const menuBtnY = 450;
    const btnW = 260;
    const btnH = 50;
    const btnX = (w - btnW) / 2;

    const playHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= playBtnY && this.game.input.mouseY <= playBtnY + btnH;

    ctx.save();
    ctx.shadowColor = playHover ? 'rgba(78,205,196,0.7)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = playHover ? 30 : 10;
    const playScale = playHover ? 1.05 : 1;
    ctx.translate(btnX + btnW / 2, playBtnY + btnH / 2);
    ctx.scale(playScale, playScale);
    ctx.translate(-(btnX + btnW / 2), -(playBtnY + btnH / 2));
    const btnGrad1 = ctx.createLinearGradient(btnX, playBtnY, btnX, playBtnY + btnH);
    btnGrad1.addColorStop(0, '#4ECDC4');
    btnGrad1.addColorStop(0.5, '#3BC8B0');
    btnGrad1.addColorStop(1, '#2ECC71');
    ctx.fillStyle = btnGrad1;
    roundRect(ctx, btnX, playBtnY, btnW, btnH, 25);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = playHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, playBtnY, btnW, btnH, 25);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const playBounce = playHover ? Math.sin(t * 8) * 2 : 0;
    ctx.fillText('🔄 Play Again', btnX + btnW / 2, playBtnY + 26 + playBounce);
    ctx.shadowBlur = 0;
    ctx.restore();

    const menuHover = this.game.input.mouseX >= btnX && this.game.input.mouseX <= btnX + btnW &&
      this.game.input.mouseY >= menuBtnY && this.game.input.mouseY <= menuBtnY + btnH;

    ctx.save();
    ctx.shadowColor = menuHover ? 'rgba(255,180,100,0.7)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = menuHover ? 30 : 10;
    ctx.translate(btnX + btnW / 2, menuBtnY + btnH / 2);
    ctx.scale(menuHover ? 1.05 : 1, menuHover ? 1.05 : 1);
    ctx.translate(-(btnX + btnW / 2), -(menuBtnY + btnH / 2));
    const btnGrad2 = ctx.createLinearGradient(btnX, menuBtnY, btnX, menuBtnY + btnH);
    btnGrad2.addColorStop(0, '#FF8A65');
    btnGrad2.addColorStop(0.5, '#FF7043');
    btnGrad2.addColorStop(1, '#E64A19');
    ctx.fillStyle = btnGrad2;
    roundRect(ctx, btnX, menuBtnY, btnW, btnH, 25);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = menuHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, menuBtnY, btnW, btnH, 25);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const menuBounce = menuHover ? Math.sin(t * 8) * 2 : 0;
    ctx.fillText('🏠 Main Menu', btnX + btnW / 2, menuBtnY + 26 + menuBounce);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore();
  }

  renderMiniGameIndicator(ctx) {
    if (this.game.miniGameManager.active) return;

    ctx.save();
    ctx.textAlign = 'center';
    const pulse = Math.sin(this.animTimer * 2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.4})`;
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.restore();
  }

  renderRewardTable(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const rewards = this.game.rewards;
    const t = this.animTimer;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(0.5, '#2d1b69');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 20; i++) {
      const sx = ((i * 137 + t * 20) % w);
      const sy = ((i * 97 + t * 8) % h);
      ctx.fillStyle = `rgba(255, 215, 0, ${0.04 + Math.sin(t + i) * 0.03})`;
      ctx.beginPath();
      const r = 1.5 + Math.sin(t * 0.5 + i * 2) * 0.5;
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.textAlign = 'center';
    const titleGrad = ctx.createLinearGradient(w / 2 - 200, 30, w / 2 + 200, 30);
    titleGrad.addColorStop(0, '#FFD700');
    titleGrad.addColorStop(0.3, '#FFA500');
    titleGrad.addColorStop(0.6, '#FF69B4');
    titleGrad.addColorStop(1, '#00FFFF');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 36px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🏆  Reward Tiers', w / 2, 55);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 10, 10, 90, 35, 18);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Back', 55, 28);
    ctx.restore();

    if (rewards) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(`🔥 Streak: ${rewards.streak}/10   ⭐ Total: ${rewards.totalStars}   🏅 Best: ${rewards.bestStreak || 0}`, 110, 33);
      ctx.restore();
    }

    const cols = 3;
    const cardW = Math.min(300, Math.floor((w - 60) / cols));
    const cardH = 105;
    const gapX = 10;
    const gapY = 10;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (w - totalW) / 2;
    const startY = 80;

    for (let i = 0; i < REWARD_TIERS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      const tier = REWARD_TIERS[i];
      const isCurrent = i === rewards.currentTier;
      const isUnlocked = rewards.unlockedTiers[i] || i === 0;

      ctx.save();
      const cardBg = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      cardBg.addColorStop(0, isCurrent ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.06)');
      cardBg.addColorStop(1, isCurrent ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.02)');
      ctx.fillStyle = cardBg;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = isCurrent ? tier.color : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = isCurrent ? 2.5 : 1;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.stroke();

      if (isCurrent) {
        ctx.shadowColor = tier.color;
        ctx.shadowBlur = 12 + Math.sin(t * 3) * 4;
        ctx.strokeStyle = tier.color;
        ctx.lineWidth = 2;
        roundRect(ctx, cx, cy, cardW, cardH, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.font = '26px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(tier.icon, cx + 10, cy + 10);

      ctx.fillStyle = isUnlocked ? tier.color : 'rgba(255,255,255,0.35)';
      ctx.font = `bold ${isCurrent ? 14 : 12}px "Comic Sans MS", "Segoe UI", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(tier.name, cx + 44, cy + 14);

      if (isUnlocked && !isCurrent) {
        ctx.fillStyle = 'rgba(100,255,100,0.5)';
        ctx.font = 'bold 10px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('✅ Unlocked', cx + cardW - 10, cy + 14);
      } else if (isCurrent) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('★ ACTIVE', cx + cardW - 10, cy + 14);
      }

      ctx.fillStyle = isUnlocked ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)';
      ctx.font = '10px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tier.lore, cx + cardW / 2, cy + 48);

      if (isCurrent) {
        const barX = cx + 10;
        const barY = cy + cardH - 20;
        const barW = cardW - 20;
        const barH = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        roundRect(ctx, barX, barY, barW, barH, 5);
        ctx.fill();
        const pct = Math.min(1, rewards.progress / tier.req);
        const pulseW = Math.sin(t * 4) * 0.03 + 1;
        ctx.fillStyle = tier.color;
        roundRect(ctx, barX, barY, barW * pct, barH, 5);
        ctx.fill();

        ctx.shadowColor = tier.color;
        ctx.shadowBlur = 8;
        roundRect(ctx, barX, barY, barW * pct, barH, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'white';
        ctx.font = 'bold 8px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rewards.progress}/${tier.req}`, barX + barW / 2, barY + barH / 2);

        if (row > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.font = '8px "Comic Sans MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('⬆ Unlock more tiers by collecting stars!', cx + cardW / 2, cy + 4);
        }
      }

      ctx.restore();
    }
  }

  handleMenuClick(mx, my) {
    const w = this.game.width;
    if (this.game.state === 'MENU') {
      const btnY = 240;
      const btnW = 220;
      const btnH = 48;
      const btnX = (w - btnW) / 2;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        this.game.audio.playButton();
        return 'play';
      }
      const pracBtnY = btnY + btnH + 10;
      if (mx >= btnX && mx <= btnX + btnW && my >= pracBtnY && my <= pracBtnY + btnH) {
        this.game.audio.playButton();
        return 'practice';
      }
      const rewBtnY = pracBtnY + btnH + 10;
      if (mx >= btnX && mx <= btnX + btnW && my >= rewBtnY && my <= rewBtnY + btnH) {
        this.game.audio.playButton();
        return 'rewards';
      }
      const leadBtnY = rewBtnY + btnH + 10;
      if (mx >= btnX && mx <= btnX + btnW && my >= leadBtnY && my <= leadBtnY + btnH) {
        this.game.audio.playButton();
        return 'leaderboard';
      }
      const volSliderX = 20;
      const volSliderY = this.game.height - 88;
      const volW = 100;
      const volH = 16;
      if (mx >= volSliderX && mx <= volSliderX + volW && my >= volSliderY && my <= volSliderY + volH) {
        const v = (mx - volSliderX) / volW;
        this.game.audio.setVolume(v * 0.5);
        return 'volume';
      }
      const musicBtnX = 20;
      const sfxBtnX = 76;
      const toggleY = this.game.height - 52;
      const toggleWH = 46;
      const toggleHH = 36;
      if (mx >= musicBtnX && mx <= musicBtnX + toggleWH && my >= toggleY && my <= toggleY + toggleHH) {
        this.game.audio.toggleMusic();
        return 'togglemusic';
      }
      if (mx >= sfxBtnX && mx <= sfxBtnX + toggleWH && my >= toggleY && my <= toggleY + toggleHH) {
        this.game.audio.toggleSfx();
        return 'togglesfx';
      }
      const charPanelX = w - 150;
      const charPanelY = 230;
      const charPanelW = 140;
      const charPanelH = 242;
      if (mx >= charPanelX && mx <= charPanelX + charPanelW && my >= charPanelY && my <= charPanelY + charPanelH) {
        this.game.audio.playButton();
        return 'char_select';
      }
    }
    if (this.game.state === 'REWARD_TABLE') {
      if (mx >= 10 && mx <= 100 && my >= 10 && my <= 45) {
        this.game.audio.playButton();
        return 'back';
      }
    }
    if (this.game.state === 'LEADERBOARD') {
      if (mx >= 10 && mx <= 100 && my >= 10 && my <= 45) {
        this.game.audio.playButton();
        return 'back';
      }
    }
    if (this.game.state === 'PRACTICE_MENU') {
      const btnW = 320;
      const btnH = 64;
      const btnX = (w - btnW) / 2;
      const lessons = this.game.practiceLessons;
      const startY = 128;
      for (let i = 0; i < lessons.length; i++) {
        const by = startY + i * 72;
        if (mx >= btnX && mx <= btnX + btnW && my >= by && my <= by + btnH) {
          this.game.audio.playButton();
          return 'practice_' + lessons[i].id;
        }
      }
      if (mx >= 10 && mx <= 100 && my >= 10 && my <= 45) {
        this.game.audio.playButton();
        return 'back';
      }
    }
    if (this.game.state === 'NAME_ENTRY') {
      const btnW = 160;
      const btnH = 56;
      const btnX = (w - btnW) / 2;
      const btnY = 295;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        this.game.audio.playButton();
        return 'name_done';
      }
    }
    if (this.game.state === 'CHARACTER_SELECT') {
      const cols = 4;
      const cardW = 130;
      const cardH = 108;
      const gapX = 10;
      const gapY = 8;
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (w - totalW) / 2;
      const startY = 68;

      for (let i = 0; i < 9; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = startX + col * (cardW + gapX);
        const cy = startY + row * (cardH + gapY);
        if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
          if (i === 8) {
            return 'customize';
          }
          this.selectedChar = i;
          return 'select_char';
        }
      }

      const cardsBottom = startY + 3 * (cardH + gapY);
      const nameBtnW = 130;
      const nameBtnH = 22;
      const nameBtnX = (w - nameBtnW) / 2;
      const nameLabelY = cardsBottom + 14;
      const nameBtnY = nameLabelY + 4;
      if (mx >= nameBtnX && mx <= nameBtnX + nameBtnW && my >= nameBtnY && my <= nameBtnY + nameBtnH) {
        this.game.audio.playButton();
        return 'change_name';
      }

      const btnY = nameLabelY + 54;
      const btnW = 200;
      const btnH2 = 48;
      const btnX = (w - btnW) / 2;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH2) {
        this.game.audio.playButton();
        return 'start';
      }
      const backBX = (w - 130) / 2;
      const backBW = 130;
      const backBY = btnY + btnH2 + 14;
      const backBH = 30;
      if (mx >= backBX && mx <= backBX + backBW && my >= backBY && my <= backBY + backBH) {
        this.game.audio.playButton();
        return 'back';
      }
    }
    if (this.game.state === 'CUSTOMIZE') {
      const previewX = 60;
      const previewY = 100;
      const previewW = 190;
      const previewH = 240;
      const leftX = previewX + previewW + 30;
      const optW = w - leftX - 30;
      const optStartY = 100;
      const optH = 36;
      const optGap = 8;

      const options = [
        { act: 'hair' },
        { act: 'haircolor' },
        { act: 'shirt' },
        { act: 'accessory' },
        { act: 'skin' },
        { act: 'shoes' },
      ];

      for (let i = 0; i < options.length; i++) {
        const oy = optStartY + i * (optH + optGap);
        const arrowSize = 28;
        const arrowLeftX = leftX + optW - 72;
        const arrowRightX = leftX + optW - 32;

        if (mx >= arrowLeftX && mx <= arrowLeftX + arrowSize && my >= oy + (optH - arrowSize) / 2 && my <= oy + (optH + arrowSize) / 2) {
          return 'custom_option_' + options[i].act + '_prev';
        }
        if (mx >= arrowRightX && mx <= arrowRightX + arrowSize && my >= oy + (optH - arrowSize) / 2 && my <= oy + (optH + arrowSize) / 2) {
          return 'custom_option_' + options[i].act + '_next';
        }
      }

      const nameLabelY = optStartY + options.length * (optH + optGap) + 12;
      const nameBX = leftX + 50;
      const nameBY = nameLabelY;
      const nameBW = 200;
      const nameBH = 36;
      if (mx >= nameBX && mx <= nameBX + nameBW && my >= nameBY && my <= nameBY + nameBH) {
        const newName = prompt('Enter character name:', this.customName || 'My Hero');
        if (newName && newName.trim()) {
          this.customName = newName.trim();
          this.customData.name = this.customName;
          saveCustomCharData(this.customData);
        }
        return 'custom_name';
      }

      const saveBY = nameBY + nameBH + 16;
      const saveBW = 200;
      const saveBH = 44;
      if (mx >= nameBX && mx <= nameBX + saveBW && my >= saveBY && my <= saveBY + saveBH) {
        this.game.audio.playButton();
        this.customData.name = this.customName || 'My Hero';
        saveCustomCharData(this.customData);
        return 'save_custom';
      }

      const backBY = saveBY + saveBH + 12;
      const backBH = 36;
      if (mx >= nameBX && mx <= nameBX + saveBW && my >= backBY && my <= backBY + backBH) {
        this.game.audio.playButton();
        return 'back';
      }

      const randomBX = previewX;
      const randomBY = previewY + previewH + 10;
      const randomBW = previewW;
      const randomBH = 36;
      if (mx >= randomBX && mx <= randomBX + randomBW && my >= randomBY && my <= randomBY + randomBH) {
        this.game.audio.playButton();
        return 'randomize_custom';
      }
    }

    if (this.game.state === 'GAMEOVER') {
      const btnW = 220;
      const btnH = 50;
      const btnX = (w - btnW) / 2;
      if (mx >= btnX && mx <= btnX + btnW && my >= 410 && my <= 410 + btnH) {
        this.game.audio.playButton();
        return 'restart';
      }
      if (mx >= btnX && mx <= btnX + btnW && my >= 475 && my <= 475 + btnH) {
        this.game.audio.playButton();
        return 'menu';
      }
    }

    if (this.game.state === 'PAUSED') {
      const w = this.game.width;
      const cardX = (w - 320) / 2;
      const cardY = (this.game.height - 460) / 2;

      const secX = cardX + 20;
      const toggleY = cardY + 132;
      const toggleW = 100;
      const toggleH = 26;
      const musicX = secX + 12;
      const sfxX = musicX + toggleW + 8;
      if (mx >= musicX && mx <= musicX + toggleW && my >= toggleY && my <= toggleY + toggleH) {
        this.game.audio.playButton();
        return 'togglemusic';
      }
      if (mx >= sfxX && mx <= sfxX + toggleW && my >= toggleY && my <= toggleY + toggleH) {
        this.game.audio.playButton();
        return 'togglesfx';
      }

      const volSliderX = secX + 62;
      const volSliderW = 320 - 40 - 70;
      const volGrabY = toggleY + toggleH + 6 + 20;
      if (mx >= volSliderX && mx <= volSliderX + volSliderW && my >= volGrabY - 10 && my <= volGrabY + 10) {
        const v = (mx - volSliderX) / volSliderW;
        this.game.audio.setVolume(v * 0.5);
        return 'volume';
      }

      const btnW = 200;
      const btnH = 44;
      const btnX = (w - btnW) / 2;
      const resumeBtnY = cardY + 210;
      const restartBtnY = cardY + 262;
      const quitBtnY = cardY + 314;
      if (mx >= btnX && mx <= btnX + btnW && my >= resumeBtnY && my <= resumeBtnY + btnH) {
        this.game.audio.playButton();
        return 'resume';
      }
      if (mx >= btnX && mx <= btnX + btnW && my >= restartBtnY && my <= restartBtnY + btnH) {
        this.game.audio.playButton();
        return 'restart';
      }
      if (mx >= btnX && mx <= btnX + btnW && my >= quitBtnY && my <= quitBtnY + btnH) {
        this.game.audio.playButton();
        return 'quit';
      }
    }

    return null;
  }

  renderLeaderboard(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const profile = this.game.profile;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(0.5, '#2d1b69');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 20; i++) {
      const sx = (Math.sin(Date.now() / 2000 + i * 2.7) * 0.5 + 0.5) * w;
      const sy = ((i * 197 + Date.now() / 100) % (h + 50)) - 25;
      const size = 1.5 + Math.sin(Date.now() / 1000 + i) * 1;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.08 + Math.sin(Date.now() / 1500 + i) * 0.05})`;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = j % 2 === 0 ? size : size * 0.4;
        if (j === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.textAlign = 'center';
    const titleGrad = ctx.createLinearGradient(w / 2 - 200, 30, w / 2 + 200, 30);
    titleGrad.addColorStop(0, '#4DD0E1');
    titleGrad.addColorStop(0.5, '#FFD700');
    titleGrad.addColorStop(1, '#4DD0E1');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 36px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🏅  Leaderboard', w / 2, 55);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 10, 10, 90, 35, 18);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Back', 55, 28);
    ctx.restore();

    const nameDisplay = profile && profile.hasName() ? profile.name : 'Adventurer';
    const tier = this.game.rewards ? REWARD_TIERS[this.game.rewards.currentTier] : REWARD_TIERS[0];

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Player: ' + nameDisplay, w / 2, 120);

    const stats = [
      { label: 'Best Tier', value: profile ? REWARD_TIERS[Math.max(profile.bestTier, this.game.rewards ? this.game.rewards.currentTier : 0)].icon + ' ' + REWARD_TIERS[Math.max(profile.bestTier, this.game.rewards ? this.game.rewards.currentTier : 0)].name : tier.icon + ' ' + tier.name },
      { label: 'Total Stars', value: '⭐ ' + (profile ? profile.totalStars : (this.game.rewards ? this.game.rewards.totalStars : 0)) },
      { label: 'Best Streak', value: '🔥 ' + (profile ? profile.bestStreak : 0) },
      { label: 'Max Distance', value: '📏 ' + (profile ? profile.maxDistance : 0) + 'm' },
      { label: 'Current Tier', value: tier.icon + ' ' + tier.name + ' (' + (this.game.rewards ? this.game.rewards.progress + '/' + tier.req : '0/25') + ')' },
    ];

    const startY = 170;
    const cardH = 52;
    const cardGap = 8;

    for (let i = 0; i < stats.length; i++) {
      const cy = startY + i * (cardH + cardGap);
      const isEven = i % 2 === 0;

      ctx.fillStyle = isEven ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
      roundRect(ctx, w / 2 - 220, cy, 440, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      roundRect(ctx, w / 2 - 220, cy, 440, cardH, 12);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '16px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stats[i].label, w / 2 - 200, cy + 32);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stats[i].value, w / 2 + 200, cy + 32);
    }

    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Keep falling to unlock more rewards! 🌟', w / 2, h - 30);
    ctx.restore();
  }

  renderPracticeMenu(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = Date.now() / 1000;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0d0d2b');
    bgGrad.addColorStop(0.3, '#1a0a3e');
    bgGrad.addColorStop(0.7, '#1a0a3e');
    bgGrad.addColorStop(1, '#0d0d2b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 15; i++) {
      const sx = (Math.sin(t * 0.3 + i * 2.7) * 0.5 + 0.5) * w;
      const sy = ((i * 137 + t * 20) % h);
      ctx.fillStyle = `rgba(255, 215, 0, ${0.06 + Math.sin(t + i) * 0.03})`;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = j % 2 === 0 ? 1.5 : 0.6;
        if (j === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }

    const cardX = 40;
    const cardY = 25;
    const cardW = w - 80;
    const cardH = 85;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(15, 15, 40, 0.92)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,215,0,0.3)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 34px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🎯 Practice Area', w / 2, cardY + 44);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Master the basics before diving into the full game!', w / 2, cardY + 72);
    ctx.restore();

    const btnW = 320;
    const btnH = 64;
    const btnX = (w - btnW) / 2;
    const startY = cardY + cardH + 18;
    const lessons = this.game.practiceLessons;
    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    const lessonColors = [
      { base: '#3a6a9a', hover: '#5a8aba', accent: '#88CCFF' },
      { base: '#3a8a6a', hover: '#5aab8a', accent: '#66DD88' },
      { base: '#8a7a3a', hover: '#ab9a5a', accent: '#DDCC66' },
      { base: '#6a3a9a', hover: '#8a5aba', accent: '#BB88FF' },
      { base: '#9a3a3a', hover: '#ba5a5a', accent: '#FF8888' },
    ];

    for (let i = 0; i < lessons.length; i++) {
      const by = startY + i * 72;
      const hover = mx >= btnX && mx <= btnX + btnW && my >= by && my <= by + btnH;
      const lc = lessonColors[i % lessonColors.length];

      ctx.save();
      if (hover) {
        ctx.shadowColor = lc.accent + '66';
        ctx.shadowBlur = 22;
      }
      const grad = ctx.createLinearGradient(btnX, by, btnX, by + btnH);
      grad.addColorStop(0, hover ? lc.hover : lc.base);
      grad.addColorStop(1, hover ? lc.base : '#2a2a5a');
      ctx.fillStyle = grad;
      roundRect(ctx, btnX, by, btnW, btnH, 18);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = hover ? lc.accent : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = hover ? 2.5 : 1;
      roundRect(ctx, btnX, by, btnW, btnH, 18);
      ctx.stroke();

      const iconX = btnX + 16;
      const iconY = by + btnH / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '28px sans-serif';
      ctx.fillText(lessons[i].icon, iconX + 16, iconY);
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hover ? '#FFFFFF' : 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 18px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(lessons[i].title, btnX + 56, by + 26);

      ctx.fillStyle = hover ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)';
      ctx.font = '12px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(lessons[i].desc, btnX + 56, by + 48);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(255,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#CC4444';
    roundRect(ctx, 10, 10, 90, 38, 19);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 10, 10, 90, 38, 19);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Back', 55, 29);
    ctx.restore();
  }

  renderPracticeOverlay(ctx, lessonId, showHelp) {
    const w = this.game.width;
    const h = this.game.height;

    if (showHelp > 0) {
      const alpha = Math.min(1, showHelp);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = alpha;

      const cardW = Math.min(500, w - 80);
      const cardH = 260;
      const cardX = (w - cardW) / 2;
      const cardY = (h - cardH) / 2 - 20;

      ctx.fillStyle = 'rgba(20, 20, 50, 0.95)';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
      ctx.shadowBlur = 30;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.stroke();

      ctx.textAlign = 'center';
      let title = '';
      let instruction = '';

      const lessons = this.game.practiceLessons;
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        title = lesson.title;
        instruction = lesson.desc;
      }

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 34px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.shadowColor = 'rgba(255,215,0,0.4)';
      ctx.shadowBlur = 12;
      ctx.fillText(title, w / 2, cardY + 70);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(instruction, w / 2, cardY + 130);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '15px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText('Press ESC to return to menu', w / 2, cardY + 190);

      ctx.restore();
    }

    if (lessonId === 'minigames' && this.game._practiceMiniGameSelect) {
      this._renderMiniGameSelect(ctx);
    } else if (lessonId === 'minigames' && this.game.miniGameManager.active) {
      this.game.miniGameManager.render(ctx);
    }

    this._renderPracticeExit(ctx);
  }

  _renderMiniGameSelect(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    ctx.fillStyle = 'rgba(5, 5, 20, 0.95)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('🎮 Choose a Mini-Game!', w / 2, 55);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '15px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click any game to try it out. Practice makes perfect!', w / 2, 85);

    const games = [
      { id: 'catch', icon: '⭐', name: 'Catch Stars', desc: 'Click falling stars to catch them!', color: '#FFD700' },
      { id: 'timing', icon: '🎯', name: 'Tap Timing', desc: 'Stop the marker in the green zone!', color: '#4ECDC4' },
      { id: 'puzzle', icon: '🧮', name: 'Quick Puzzle', desc: 'Solve simple math problems!', color: '#FF6B6B' },
      { id: 'match', icon: '🃏', name: 'Match Pairs', desc: 'Find matching pairs of cards!', color: '#C084FC' },
      { id: 'colortap', icon: '🎨', name: 'Colour Tap', desc: 'Tap the colour that matches!', color: '#FB923C' },
      { id: 'whack', icon: '🔨', name: 'Whack-a-Star', desc: 'Whack the popping stars!', color: '#FF69B4' },
      { id: 'count', icon: '🔢', name: 'Count Stars', desc: 'Count how many stars appear!', color: '#00D2FF' },
    ];

    const cols = 3;
    const cardW = 230;
    const cardH = 160;
    const gapX = 16;
    const gapY = 16;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (w - totalW) / 2;
    const startY = 110;

    for (let i = 0; i < games.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      const hover = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      ctx.save();
      if (hover) {
        ctx.shadowColor = games[i].color;
        ctx.shadowBlur = 24;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10;
      }
      const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      cardGrad.addColorStop(0, hover ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)');
      cardGrad.addColorStop(1, hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)');
      ctx.fillStyle = cardGrad;
      roundRect(ctx, cx, cy, cardW, cardH, 18);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.strokeStyle = hover ? games[i].color : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = hover ? 3 : 1;
      roundRect(ctx, cx, cy, cardW, cardH, 18);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = games[i].color;
      ctx.font = '36px sans-serif';
      ctx.fillText(games[i].icon, cx + cardW / 2, cy + 55);

      ctx.fillStyle = hover ? '#FFFFFF' : 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 18px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(games[i].name, cx + cardW / 2, cy + 92);

      ctx.fillStyle = hover ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)';
      ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(games[i].desc, cx + cardW / 2, cy + 122);

      ctx.fillStyle = hover ? games[i].color : 'rgba(255,255,255,0.3)';
      ctx.font = '13px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText('▶ Click to Play', cx + cardW / 2, cy + 148);
    }
  }

  _renderPracticeExit(ctx) {
    const w = this.game.width;
    const h = this.game.height;

    ctx.save();
    ctx.shadowColor = 'rgba(255,0,0,0.4)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#CC3333';
    roundRect(ctx, w - 125, 10, 115, 42, 21);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, w - 125, 10, 115, 42, 21);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Exit', w - 67, 37);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, 10, h - 45, 340, 35, 17);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const lesson = this.game.practiceLessons.find(l => l.id === this.game._practiceId);
    if (lesson) {
      ctx.fillText(`${lesson.icon} ${lesson.title}  |  Press ESC to exit`, 22, h - 22);
    }
    ctx.restore();
  }

  renderBackground(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const scroll = this.game.world.scrollY;
    const area = this.game.world.area;
    const ac = AREA_CONFIG[area] || AREA_CONFIG[1];

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, ac.bg[0]);
    grad.addColorStop(0.3, ac.bg[1]);
    grad.addColorStop(0.5, ac.bg[2]);
    grad.addColorStop(0.7, ac.bg[3]);
    grad.addColorStop(1, ac.bg[4]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const starColor = ac.starColor;
    ctx.save();
    for (let layer = 0; layer < 3; layer++) {
      const speed = 0.02 + layer * 0.03;
      const count = 12 + layer * 6;
      const baseSize = 0.5 + layer * 0.6;
      ctx.globalAlpha = 0.3 + layer * 0.15;
      for (let i = 0; i < count; i++) {
        const sx = ((i * 157 + layer * 73 + scroll * speed + layer * 20) % w);
        const sy = ((i * 109 + layer * 41 + scroll * speed * 0.4) % h);
        ctx.fillStyle = starColor + (0.05 + Math.sin(i + layer) * 0.04) + ')';
        ctx.beginPath();
        const s = baseSize + Math.sin(i * 0.7 + layer) * 0.5;
        ctx.arc(sx, sy, Math.max(0.3, s), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  initCustomize() {
    this.customData = { ...loadCustomCharData() };
    this.customName = this.customData.name || 'My Hero';
    this.customPreviewPlayer = null;
    this.customOptionHover = -1;
    this._hudTime = 0;
  }

  randomizeCustomData() {
    const hairStyles = ['spiky', 'flowing', 'twintails', 'messy', 'wavy', 'curly', 'ponytail', 'sleek'];
    const hairColors = ['#FF4444', '#FFAA33', '#FFD700', '#4CAF50', '#00BCD4', '#9B59B6', '#E91E63', '#6D4C41'];
    const shirtColors = ['#45B7D1', '#4D96FF', '#34D399', '#2DD4BF', '#81C784', '#80DEEA', '#A5D6A7', '#B3E5FC'];
    const accessories = ['none', 'backpack', 'scarf', 'headband', 'goggles', 'flower_crown', 'tiara', 'earmuffs'];
    const skinTones = ['#FFDDBB', '#FFE4B5', '#F5D0C5', '#FDDCB5', '#F5ECD5', '#FCE4EC'];
    const shoeStyles = ['sneakers', 'sandals', 'boots', 'flip-flops', 'barefoot', 'ballet'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const d = this.customData;
    d.hair.style = pick(hairStyles);
    d.hair.color = pick(hairColors);
    d.shirtColor = pick(shirtColors);
    d.accessory.type = pick(accessories);
    d.skin = pick(skinTones);
    d.outfit.shoes = pick(shoeStyles);
    d.color = d.shirtColor;
    d.hatColor = d.hair.color;
    saveCustomCharData(d);
  }

  handleCustomOption(action) {
    const d = this.customData;
    const hairStyles = ['spiky', 'flowing', 'twintails', 'messy', 'wavy', 'curly', 'ponytail', 'sleek'];
    const hairColors = ['#FF4444', '#FFAA33', '#FFD700', '#4CAF50', '#00BCD4', '#9B59B6', '#E91E63', '#6D4C41'];
    const shirtColors = ['#45B7D1', '#4D96FF', '#34D399', '#2DD4BF', '#81C784', '#80DEEA', '#A5D6A7', '#B3E5FC'];
    const accessories = ['none', 'backpack', 'scarf', 'headband', 'goggles', 'flower_crown', 'tiara', 'earmuffs'];
    const skinTones = ['#FFDDBB', '#FFE4B5', '#F5D0C5', '#FDDCB5', '#F5ECD5', '#FCE4EC'];
    const shoeStyles = ['sneakers', 'sandals', 'boots', 'flip-flops', 'barefoot', 'ballet'];

    if (action === 'custom_option_hair_next') {
      const idx = (hairStyles.indexOf(d.hair.style) + 1) % hairStyles.length;
      d.hair.style = hairStyles[idx];
    } else if (action === 'custom_option_hair_prev') {
      const idx = (hairStyles.indexOf(d.hair.style) - 1 + hairStyles.length) % hairStyles.length;
      d.hair.style = hairStyles[idx];
    } else if (action === 'custom_option_haircolor_next') {
      const idx = (hairColors.indexOf(d.hair.color) + 1) % hairColors.length;
      d.hair.color = hairColors[idx];
    } else if (action === 'custom_option_haircolor_prev') {
      const idx = (hairColors.indexOf(d.hair.color) - 1 + hairColors.length) % hairColors.length;
      d.hair.color = hairColors[idx];
    } else if (action === 'custom_option_shirt_next') {
      const idx = (shirtColors.indexOf(d.shirtColor) + 1) % shirtColors.length;
      d.shirtColor = shirtColors[idx];
    } else if (action === 'custom_option_shirt_prev') {
      const idx = (shirtColors.indexOf(d.shirtColor) - 1 + shirtColors.length) % shirtColors.length;
      d.shirtColor = shirtColors[idx];
    } else if (action === 'custom_option_accessory_next') {
      const idx = (accessories.indexOf(d.accessory.type) + 1) % accessories.length;
      d.accessory.type = accessories[idx];
    } else if (action === 'custom_option_accessory_prev') {
      const idx = (accessories.indexOf(d.accessory.type) - 1 + accessories.length) % accessories.length;
      d.accessory.type = accessories[idx];
    } else if (action === 'custom_option_skin_next') {
      const idx = (skinTones.indexOf(d.skin) + 1) % skinTones.length;
      d.skin = skinTones[idx];
    } else if (action === 'custom_option_skin_prev') {
      const idx = (skinTones.indexOf(d.skin) - 1 + skinTones.length) % skinTones.length;
      d.skin = skinTones[idx];
    } else if (action === 'custom_option_shoes_next') {
      const idx = (shoeStyles.indexOf(d.outfit.shoes) + 1) % shoeStyles.length;
      d.outfit.shoes = shoeStyles[idx];
    } else if (action === 'custom_option_shoes_prev') {
      const idx = (shoeStyles.indexOf(d.outfit.shoes) - 1 + shoeStyles.length) % shoeStyles.length;
      d.outfit.shoes = shoeStyles[idx];
    }
    d.color = d.shirtColor;
    d.hatColor = d.hair.color;
    saveCustomCharData(d);
  }

  renderCustomize(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const t = this.animTimer;
    const d = this.customData;

    ctx.save();

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1a1a3e');
    bgGrad.addColorStop(0.4, '#2d1b69');
    bgGrad.addColorStop(0.7, '#1a3a4e');
    bgGrad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('✨ Create Your Character!', w / 2, 20);

    const previewX = 60;
    const previewY = 100;
    const previewW = 190;
    const previewH = 240;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, previewX, previewY, previewW, previewH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, previewX, previewY, previewW, previewH, 16);
    ctx.stroke();

    const cx = previewX + previewW / 2;
    const cy = previewY + previewH / 2 + 10;

    if (!this.customPreviewPlayer) {
      this.customPreviewPlayer = new Player(0, 0);
    }
    const pp = this.customPreviewPlayer;
    pp.setCharacter(CUSTOM_CHAR_INDEX);
    pp.charData = d;
    pp.animState = 'idle';
    pp.facingRight = true;
    pp.eyeTarget = 'right';
    pp.portraitMode = true;
    pp.portraitBounce = Math.sin(t * 2) * 3;

    const exprCycle = Math.sin(t * 0.4);
    pp.expression = exprCycle > 0.3 ? 'happy' : exprCycle < -0.3 ? 'determined' : 'neutral';
    pp.eyeBlink = t * 1.2;

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, previewX + 4, previewY + 4, previewW - 8, previewH - 8, 12);
    ctx.clip();
    const pGrad = ctx.createLinearGradient(previewX, previewY, previewX, previewY + previewH);
    pGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
    pGrad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = pGrad;
    ctx.fillRect(previewX, previewY, previewW, previewH);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 12; i++) {
      const sx = ((i * 71 + t * 5) % (previewW - 20)) + 10;
      const sy = ((i * 53 + t * 2) % (previewH - 20)) + 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + pp.portraitBounce);
    pp.render(ctx, 0);
    ctx.restore();

    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    const randomBX = previewX;
    const randomBY = previewY + previewH + 10;
    const randomBW = previewW;
    const randomBH = 36;
    const randomHover = mx >= randomBX && mx <= randomBX + randomBW && my >= randomBY && my <= randomBY + randomBH;
    ctx.fillStyle = randomHover ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.08)';
    roundRect(ctx, randomBX, randomBY, randomBW, randomBH, 12);
    ctx.fill();
    ctx.strokeStyle = randomHover ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, randomBX, randomBY, randomBW, randomBH, 12);
    ctx.stroke();
    ctx.fillStyle = randomHover ? '#FFD700' : 'rgba(255,215,0,0.6)';
    ctx.font = 'bold 14px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎲 Randomize!', randomBX + randomBW / 2, randomBY + randomBH / 2);

    const leftX = previewX + previewW + 30;
    const optW = w - leftX - 30;
    const optStartY = 100;
    const optH = 36;
    const optGap = 8;

    const options = [
      { label: 'Hair', get: () => d.hair.style, act: 'hair' },
      { label: 'Hair Color', get: () => d.hair.color, act: 'haircolor' },
      { label: 'Shirt', get: () => d.shirtColor, act: 'shirt' },
      { label: 'Accessory', get: () => d.accessory.type, act: 'accessory' },
      { label: 'Skin', get: () => d.skin, act: 'skin' },
      { label: 'Shoes', get: () => d.outfit.shoes, act: 'shoes' },
    ];

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const oy = optStartY + i * (optH + optGap);
      const isColor = opt.label === 'Hair Color' || opt.label === 'Shirt' || opt.label === 'Skin';

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, leftX, oy, optW, optH, 10);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '13px "Comic Sans MS", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.label, leftX + 10, oy + optH / 2);

      const valText = opt.get();
      const displayVal = isColor ? '' : valText.replace(/_/g, ' ');

      if (isColor) {
        ctx.fillStyle = valText;
        ctx.beginPath();
        ctx.arc(leftX + optW - 38, oy + optH / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(displayVal, leftX + optW / 2, oy + optH / 2);
      }

      const arrowSize = 28;
      const arrowLeftX = leftX + optW - 72;
      const arrowRightX = leftX + optW - 32;

      ctx.fillStyle = mx >= arrowLeftX && mx <= arrowLeftX + arrowSize && my >= oy + (optH - arrowSize) / 2 && my <= oy + (optH + arrowSize) / 2
        ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(arrowLeftX + arrowSize / 2, oy + optH / 2, arrowSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◀', arrowLeftX + arrowSize / 2, oy + optH / 2 + 1);

      ctx.fillStyle = mx >= arrowRightX && mx <= arrowRightX + arrowSize && my >= oy + (optH - arrowSize) / 2 && my <= oy + (optH + arrowSize) / 2
        ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(arrowRightX + arrowSize / 2, oy + optH / 2, arrowSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('▶', arrowRightX + arrowSize / 2, oy + optH / 2 + 1);
    }

    const nameLabelY = optStartY + options.length * (optH + optGap) + 12;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Name', leftX, nameLabelY + 18);

    const nameBX = leftX + 50;
    const nameBY = nameLabelY;
    const nameBW = 200;
    const nameBH = 36;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, nameBX, nameBY, nameBW, nameBH, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '16px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.customName || 'My Hero', nameBX + nameBW / 2, nameBY + nameBH / 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, nameBX, nameBY, nameBW, nameBH, 10);
    ctx.stroke();

    const saveBX = leftX + 50;
    const saveBY = nameBY + nameBH + 16;
    const saveBW = 200;
    const saveBH = 44;
    const saveHover = mx >= saveBX && mx <= saveBX + saveBW && my >= saveBY && my <= saveBY + saveBH;
    const saveGrad = ctx.createLinearGradient(saveBX, saveBY, saveBX, saveBY + saveBH);
    saveGrad.addColorStop(0, saveHover ? '#45B7D1' : '#2A9DBF');
    saveGrad.addColorStop(1, saveHover ? '#2A9DBF' : '#1A7A99');
    ctx.fillStyle = saveGrad;
    roundRect(ctx, saveBX, saveBY, saveBW, saveBH, 22);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Save Character!', saveBX + saveBW / 2, saveBY + saveBH / 2);

    const backBX = leftX + 50;
    const backBY = saveBY + saveBH + 12;
    const backBW = 200;
    const backBH = 36;
    const backHover = mx >= backBX && mx <= backBX + backBW && my >= backBY && my <= backBY + backBH;
    ctx.fillStyle = backHover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, backBX, backBY, backBW, backBH, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px "Comic Sans MS", sans-serif';
    ctx.fillText('← Back', backBX + backBW / 2, backBY + backBH / 2);

    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
