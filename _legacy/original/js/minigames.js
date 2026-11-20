export class MiniGameManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.type = null;
    this.timer = 0;
    this.duration = 20;
    this.readyTimer = 0;
    this.triggerCooldown = 0;

    this.readyMessages = {
      'catch': 'Get Ready to click! ⭐',
      'timing': 'Get Ready to use Space or Click when on Marker 🎯',
      'match': 'Get Ready! 👀',
      'colortap': 'Get Ready! 🎨',
      'whack': 'Get Ready to Whack! 🔨',
    };

    this.miniGames = {
      'catch': new CatchStarsGame(game),
      'timing': new TapTimingGame(game),
      'puzzle': new QuickPuzzleGame(game),
      'match': new MatchPairsGame(game),
      'colortap': new ColourTapGame(game),
      'whack': new WhackStarGame(game),
      'count': new CountStarsGame(game),
    };
  }

  tryTrigger() {
    return false;
  }

  startMiniGame(type) {
    if (this.active) return;
    if (!this.miniGames[type]) return;
    this.type = type;
    this.active = true;
    const tier = this.game.rewards ? this.game.rewards.currentTier : 0;
    this.timer = Math.max(7, this.duration - tier * 0.3);
    this.completed = false;
    this.reward = 0;
    this.readyTimer = this.readyMessages[type] ? 2.5 : 0;
    this.miniGames[type].init();
    if (!this.readyTimer) {
      this.game.audio.playMiniGameStart();
    }
  }

  update(dt, input) {
    if (!this.active) {
      this.triggerCooldown = Math.max(0, this.triggerCooldown - dt);
      return;
    }

    if (this.readyTimer > 0) {
      this.readyTimer -= dt;
      if (this.readyTimer <= 0) {
        this.game.audio.playMiniGameStart();
        if (this.type === 'match') {
          this.miniGames[this.type].hideCards();
        }
      }
      return;
    }

    this.timer -= dt;
    const mg = this.miniGames[this.type];
    mg.update(dt, input);

    if (mg.isComplete) {
      this.completed = true;
      this.reward = mg.reward;
      this._finish();
      return;
    }

    if (this.timer <= 0) {
      this.reward = 0;
      mg.finish();
      this.active = false;
      this.triggerCooldown = 5;
      this.game.audio.playMiniGameComplete();
    }
  }

  _finish() {
    this.active = false;
    this.triggerCooldown = 5;
    if (this.reward > 0) {
      if (this.game.rewards && !this.game._practiceId) {
        this.game.rewards.miniGameSuccess(this.game);
      } else if (this.game.lives < this.game.maxLives) {
        this.game.lives += 1;
      }
      this.game.audio.playMiniGameComplete();
    }
  }

  render(ctx, dt) {
    if (!this.active) return;

    const w = this.game.width;
    const h = this.game.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    if (this.readyTimer > 0) {
      this._renderReadyScreen(ctx);
      if (this.type === 'match') {
        this.miniGames[this.type].render(ctx, dt);
      }
      return;
    }

    ctx.save();

    this.miniGames[this.type].render(ctx, dt);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 4;
    roundRect(ctx, 40, 40, w - 80, h - 80, 24);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`⭐ Mini-Game! ⭐`, w / 2, 95);
    ctx.restore();

    const timeLeft = Math.ceil(this.timer);
    const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.shadowColor = `rgba(255,255,255,${pulse * 0.3})`;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 22px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`⏱ Time: ${timeLeft}s`, w / 2, 130);
    ctx.restore();
  }

  _renderReadyScreen(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const pulse = Math.sin(Date.now() / 400) * 0.15 + 0.85;

    ctx.save();
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 4;
    roundRect(ctx, 40, 40, w - 80, h - 80, 24);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.font = 'bold 48px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText('Get Ready! 🌟', w / 2, h / 2 - 30);
    ctx.restore();

    const msg = this.readyMessages[this.type];
    if (msg) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 24px "Comic Sans MS", "Segoe UI", sans-serif';
      ctx.fillText(msg, w / 2, h / 2 + 35);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${pulse * 0.5})`;
    ctx.font = '18px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.fillText(`Starting in ${Math.ceil(this.readyTimer)}s...`, w / 2, h / 2 + 75);
    ctx.restore();
  }
}

class CatchStarsGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 8;
    this.caught = 0;
    this.fallingStars = [];
    this.spawnTimer = 0;
    this.sparkles = [];
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.caught = 0;
    this.fallingStars = [];
    this.sparkles = [];
    this.spawnTimer = 0;
  }

  update(dt, input) {
    if (this.isComplete) return;

    this.spawnTimer += dt;
    if (this.spawnTimer > 0.4 - Math.min(0.2, this.caught * 0.015) && this.fallingStars.length < 10) {
      this.fallingStars.push({
        x: 60 + Math.random() * (this.game.width - 120),
        y: 100,
        size: 10 + Math.random() * 8,
        speed: 80 + Math.random() * 100,
        caught: false,
        hue: Math.random() * 360,
      });
      this.spawnTimer = 0;
    }

    for (const star of this.fallingStars) {
      if (star.caught) continue;
      star.y += star.speed * dt;
      if (input.mouseClicked) {
        const dx = input.mouseX - star.x;
        const dy = input.mouseY - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < star.size + 15) {
          star.caught = true;
          this.caught++;
          this.game.audio.playStarCollect();
          for (let i = 0; i < 10; i++) {
            this.sparkles.push({ x: star.x, y: star.y, vx: (Math.random() - 0.5) * 120, vy: Math.random() * -80 - 40, life: 0.5, hue: star.hue });
          }
          if (this.caught >= this.target) {
            this.isComplete = true;
            this.reward = 6 + Math.floor(Math.random() * 3);
          }
        }
      }
    }

    this.fallingStars = this.fallingStars.filter(s => !s.caught && s.y < this.game.height);
    this.sparkles = this.sparkles.filter(s => { s.life -= dt; return s.life > 0; });
  }

  finish() {
    this.reward = Math.max(1, Math.floor(this.caught / 2));
  }

  render(ctx, dt) {
    const cx = this.game.width / 2;
    for (const s of this.sparkles) {
      s.x += s.vx * (dt || 0.016);
      s.y += s.vy * (dt || 0.016);
      s.vy += 200 * (dt || 0.016);
      ctx.globalAlpha = Math.max(0, s.life / 0.5);
      ctx.fillStyle = `hsl(${s.hue}, 100%, 70%)`;
      ctx.beginPath();
      ctx.arc(Math.round(s.x), Math.round(s.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const star of this.fallingStars) {
      if (star.caught) continue;
      const px = Math.round(star.x);
      const py = Math.round(star.y);
      const s = star.size;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, s);
      grad.addColorStop(0, '#FFF9C4');
      grad.addColorStop(0.5, '#FFD700');
      grad.addColorStop(1, '#FFA000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? s : s * 0.4;
        if (i === 0) ctx.moveTo(px + Math.cos(angle) * r, py + Math.sin(angle) * r);
        else ctx.lineTo(px + Math.cos(angle) * r, py + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();

      const glow = ctx.createRadialGradient(px, py, 0, px, py, s * 2);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, s * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('Catch 8 stars to win!', cx, this.game.height - 120);
  }
}

class TapTimingGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 7;
    this.successes = 0;
    this.indicator = 0;
    this.speed = 100;
    this.direction = 1;
    this.sweetSpot = 0;
    this.sweetSpotWidth = 35;
    this.barWidth = 320;
    this.barX = 0;
    this.particles = [];
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.successes = 0;
    this.indicator = 0;
    this.speed = 100;
    this.direction = 1;
    this.particles = [];
    this._newSpot();
  }

  _newSpot() {
    this.sweetSpot = 40 + Math.random() * (this.barWidth - 80);
    this.indicator = 0;
    this.direction = 1;
    this.barX = (this.game.width - this.barWidth) / 2;
  }

  update(dt, input) {
    if (this.isComplete) return;

    this.speed += dt * 15;
    this.indicator += this.speed * dt * this.direction;
    if (this.indicator > this.barWidth) { this.indicator = this.barWidth; this.direction = -1; }
    if (this.indicator < 0) { this.indicator = 0; this.direction = 1; }

    this.particles = this.particles.filter(p => { p.life -= dt; return p.life > 0; });

    if (input.mouseClicked || input.spacePressed) {
      const diff = Math.abs(this.indicator - this.sweetSpot);
      if (diff < this.sweetSpotWidth) {
        this.successes++;
        this.game.audio.playStarCollect();
        for (let i = 0; i < 6; i++) {
          this.particles.push({ x: this.barX + this.indicator, y: 245, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.4, color: '#4ECDC4' });
        }
        if (this.successes >= this.target) {
          this.isComplete = true;
          this.reward = 6 + Math.floor(Math.random() * 3);
        } else {
          this._newSpot();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          this.particles.push({ x: this.barX + this.indicator, y: 245, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 40, life: 0.3, color: '#FF6B6B' });
        }
        this._newSpot();
      }
    }
  }

  finish() {
    this.reward = Math.max(1, Math.floor(this.successes / 2) + 1);
  }

  render(ctx, dt) {
    const cx = this.game.width / 2;
    const by = 245;
    for (const p of this.particles) {
      p.x += p.vx * (dt || 0.016);
      p.y += p.vy * (dt || 0.016);
      p.vy += 200 * (dt || 0.016);
      ctx.globalAlpha = Math.max(0, p.life / 0.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('Press SPACE or click when marker is in the green zone!', cx, by + 65);
  }
}

class QuickPuzzleGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 4;
    this.solved = 0;
    this.question = '';
    this.answer = 0;
    this.choices = [];
    this.showing = false;
    this.hasError = false;
    this.errorTimer = 0;
    this.streak = 0;
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.solved = 0;
    this.hasError = false;
    this.errorTimer = 0;
    this.streak = 0;
    this._newQuestion();
  }

  _newQuestion() {
    let a = 2 + Math.floor(Math.random() * 10);
    let b = 2 + Math.floor(Math.random() * 10);
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans;
    if (op === '+') ans = a + b;
    else if (op === '-') { if (a < b) { let t = a; a = b; b = t; } ans = a - b; }
    else { a = Math.floor(Math.random() * 8) + 2; b = Math.floor(Math.random() * 9) + 2; ans = a * b; }

    this.question = `${a} ${op} ${b} = ?`;
    this.answer = ans;
    this.choices = [ans];
    while (this.choices.length < 4) {
      const fake = ans + Math.floor(Math.random() * 7) - 3;
      if (!this.choices.includes(fake) && fake >= 0) this.choices.push(fake);
    }
    this.choices.sort(() => Math.random() - 0.5);
    this.showing = true;
  }

  update(dt, input) {
    if (this.isComplete) return;
    if (this.hasError) {
      this.errorTimer -= dt;
      if (this.errorTimer <= 0) { this.hasError = false; this._newQuestion(); }
      return;
    }
    if (input.mouseClicked && this.showing) {
      const mx = input.mouseX;
      const my = input.mouseY;
      const cx = this.game.width / 2;
      const startY = 280;
      for (let i = 0; i < this.choices.length; i++) {
        const bx = cx - 80 + (i % 2) * 160;
        const by = startY + Math.floor(i / 2) * 60;
        if (mx >= bx && mx <= bx + 140 && my >= by && my <= by + 45) {
          if (this.choices[i] === this.answer) {
            this.solved++;
            this.streak++;
            this.game.audio.playStarCollect();
            if (this.solved >= this.target) {
              this.isComplete = true;
              this.reward = 6 + Math.floor(Math.random() * 3);
            } else { this._newQuestion(); }
          } else {
            this.streak = 0;
            this.hasError = true;
            this.errorTimer = 1;
          }
          break;
        }
      }
    }
  }

  finish() {
    this.reward = Math.max(1, this.solved);
  }

  render(ctx) {
    const cx = this.game.width / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Quick Puzzle! ${this.solved}/${this.target}`, cx, 170);

    if (this.streak > 1) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText(`🔥 ${this.streak}x streak!`, cx, 195);
    }

    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255,215,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.fillText(this.question, cx, 250);
    ctx.shadowBlur = 0;

    if (this.hasError) {
      ctx.fillStyle = '#FFB74D';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText('Better Luck Next Time! 💪', cx, 275);
      return;
    }

    const startY = 290;
    for (let i = 0; i < this.choices.length; i++) {
      const bx = cx - 80 + (i % 2) * 160;
      const by = startY + Math.floor(i / 2) * 60;
      const grad = ctx.createLinearGradient(bx, by, bx, by + 45);
      grad.addColorStop(0, '#5a5a9a');
      grad.addColorStop(1, '#3a3a7a');
      ctx.fillStyle = grad;
      roundRect(ctx, bx, by, 140, 45, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, 140, 45, 12);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillText(this.choices[i], bx + 70, by + 30);
    }
  }
}

class MatchPairsGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 4;
    this.found = 0;
    this.cards = [];
    this.flipped = [];
    this.locked = false;
    this.matchTimer = 0;
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.found = 0;
    this.flipped = [];
    this.locked = false;
    this.matchTimer = 0;
    const symbols = ['⭐', '🌈', '🍎', '🎵', '💎', '🦋', '🌺', '🔥'];
    const picked = symbols.sort(() => Math.random() - 0.5).slice(0, this.target);
    this.cards = [...picked, ...picked].sort(() => Math.random() - 0.5).map((s, i) => ({
      id: i, symbol: s, revealed: true, matched: false,
    }));
  }

  hideCards() {
    for (const c of this.cards) {
      c.revealed = false;
    }
  }

  update(dt, input) {
    if (this.isComplete) return;
    if (this.locked) {
      this.matchTimer -= dt;
      if (this.matchTimer <= 0) {
        for (const fi of this.flipped) this.cards[fi].revealed = false;
        this.flipped = [];
        this.locked = false;
      }
      return;
    }
    if (input.mouseClicked) {
      const mx = input.mouseX;
      const my = input.mouseY;
      const cx = this.game.width / 2;
      const cols = 4;
      const cardW = 80;
      const cardH = 80;
      const gap = 10;
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = cx - totalW / 2;
      const startY = 200;
      for (let i = 0; i < this.cards.length; i++) {
        const bx = startX + (i % cols) * (cardW + gap);
        const by = startY + Math.floor(i / cols) * (cardH + gap);
        if (!this.cards[i].matched && !this.cards[i].revealed &&
            mx >= bx && mx <= bx + cardW && my >= by && my <= by + cardH) {
          this.cards[i].revealed = true;
          this.flipped.push(i);
          if (this.flipped.length === 2) {
            const a = this.cards[this.flipped[0]];
            const b = this.cards[this.flipped[1]];
            if (a.symbol === b.symbol) {
              a.matched = true; b.matched = true;
              this.flipped = [];
              this.found++;
              this.game.audio.playStarCollect();
              if (this.found >= this.target) { this.isComplete = true; this.reward = 6 + Math.floor(Math.random() * 3); }
            } else { this.locked = true; this.matchTimer = 0.8; }
          }
          break;
        }
      }
    }
  }

  finish() { this.reward = Math.max(1, this.found); }

  render(ctx) {
    const cx = this.game.width / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Match the Pairs! ${this.found}/${this.target}`, cx, 150);

    const cols = 4;
    const cardW = 80;
    const cardH = 80;
    const gap = 10;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 200;

    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      const bx = startX + (i % cols) * (cardW + gap);
      const by = startY + Math.floor(i / cols) * (cardH + gap);
      if (c.matched) {
        ctx.fillStyle = 'rgba(100, 255, 100, 0.15)';
        roundRect(ctx, bx, by, cardW, cardH, 12);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.symbol, bx + cardW / 2, by + cardH / 2 + 12);
      } else if (c.revealed) {
        ctx.fillStyle = '#FFD700';
        roundRect(ctx, bx, by, cardW, cardH, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.symbol, bx + cardW / 2, by + cardH / 2 + 12);
      } else {
        const grad = ctx.createLinearGradient(bx, by, bx, by + cardH);
        grad.addColorStop(0, '#4ECDC4');
        grad.addColorStop(1, '#2ECC71');
        ctx.fillStyle = grad;
        roundRect(ctx, bx, by, cardW, cardH, 12);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', bx + cardW / 2, by + cardH / 2 + 10);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('Find 4 matching pairs!', cx, this.game.height - 120);
  }
}

class ColourTapGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 5;
    this.done = 0;
    this.targetColor = '';
    this.colors = [];
    this.colorNames = { '#FF4444': 'Red', '#44BB44': 'Green', '#4488FF': 'Blue', '#FFAA00': 'Orange', '#CC44CC': 'Purple', '#FF69B4': 'Pink', '#00DDDD': 'Cyan' };
  }

  init() { this.isComplete = false; this.reward = 0; this.done = 0; this._pick(); }

  _pick() {
    const allColors = ['#FF4444', '#44BB44', '#4488FF', '#FFAA00', '#CC44CC', '#FF69B4', '#00DDDD'];
    this.targetColor = allColors[Math.floor(Math.random() * allColors.length)];
    this.colors = [this.targetColor];
    const others = allColors.filter(c => c !== this.targetColor);
    while (this.colors.length < 4) {
      const pick = others[Math.floor(Math.random() * others.length)];
      if (!this.colors.includes(pick)) this.colors.push(pick);
    }
    this.colors.sort(() => Math.random() - 0.5);
  }

  update(dt, input) {
    if (this.isComplete) return;
    if (input.mouseClicked) {
      const mx = input.mouseX;
      const my = input.mouseY;
      const cx = this.game.width / 2;
      const startY = 280;
      for (let i = 0; i < this.colors.length; i++) {
        const bx = cx - 130 + (i % 2) * 140;
        const by = startY + Math.floor(i / 2) * 70;
        if (mx >= bx && mx <= bx + 120 && my >= by && my <= by + 55) {
          if (this.colors[i] === this.targetColor) {
            this.done++;
            this.game.audio.playStarCollect();
            if (this.done >= this.target) { this.isComplete = true; this.reward = 6 + Math.floor(Math.random() * 3); }
            else { this._pick(); }
          } else { this._pick(); }
          break;
        }
      }
    }
  }

  finish() { this.reward = Math.max(1, this.done); }

  render(ctx) {
    const cx = this.game.width / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Colour Tap! ${this.done}/${this.target}`, cx, 150);
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Tap the colour that matches:', cx, 195);

    ctx.fillStyle = this.targetColor;
    ctx.beginPath();
    ctx.arc(cx, 235, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    const startY = 280;
    for (let i = 0; i < this.colors.length; i++) {
      const bx = cx - 130 + (i % 2) * 140;
      const by = startY + Math.floor(i / 2) * 70;
      ctx.fillStyle = this.colors[i];
      roundRect(ctx, bx, by, 120, 55, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, 120, 55, 14);
      ctx.stroke();
    }
  }
}

class WhackStarGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 10;
    this.hit = 0;
    this.moles = [];
    this.spawnTimer = 0;
    this.missed = 0;
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.hit = 0;
    this.moles = [];
    this.spawnTimer = 0;
    this.missed = 0;
  }

  update(dt, input) {
    if (this.isComplete) return;
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.6 && this.moles.length < 5) {
      const cols = 3;
      const holes = cols * 2;
      const taken = this.moles.map(m => m.hole);
      for (let attempt = 0; attempt < 10; attempt++) {
        const hole = Math.floor(Math.random() * holes);
        if (!taken.includes(hole)) {
          this.moles.push({ hole, timer: 1.2 + Math.random() * 0.5, hit: false });
          break;
        }
      }
      this.spawnTimer = 0;
    }
    for (const m of this.moles) {
      m.timer -= dt;
    }
    this.moles = this.moles.filter(m => {
      if (m.timer <= 0 && !m.hit) this.missed++;
      return m.timer > 0;
    });
    if (this.missed >= 5) {
      this.isComplete = true;
      this.reward = Math.max(1, Math.floor(this.hit / 2));
    }
    if (input.mouseClicked) {
      const mx = input.mouseX;
      const my = input.mouseY;
      const cols = 3;
      const holeW = 100;
      const holeH = 80;
      const gap = 20;
      const totalW = cols * holeW + (cols - 1) * gap;
      const startX = (this.game.width - totalW) / 2 + holeW / 2;
      const startY = 200;
      for (const m of this.moles) {
        if (m.hit) continue;
        const col = m.hole % cols;
        const row = Math.floor(m.hole / cols);
        const cx = startX + col * (holeW + gap);
        const cy = startY + row * (holeH + gap);
        if (Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) < 35) {
          m.hit = true;
          this.hit++;
          this.game.audio.playStarCollect();
          if (this.hit >= this.target) { this.isComplete = true; this.reward = 6 + Math.floor(Math.random() * 3); }
          break;
        }
      }
    }
  }

  finish() { this.reward = Math.max(1, Math.floor(this.hit / 2)); }

  render(ctx) {
    const cx = this.game.width / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Whack-a-Star! ${this.hit}/${this.target}`, cx, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(`Misses: ${this.missed}/5`, cx, 185);

    const cols = 3;
    const holeW = 100;
    const holeH = 80;
    const gap = 20;
    const totalW = cols * holeW + (cols - 1) * gap;
    const startX = (this.game.width - totalW) / 2;
    const startY = 200;

    for (let i = 0; i < cols * 2; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (holeW + gap) + holeW / 2;
      const by = startY + row * (holeH + gap) + holeH / 2;
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.ellipse(bx, by + 10, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a0a';
      ctx.beginPath();
      ctx.ellipse(bx, by + 15, 35, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const m of this.moles) {
      if (m.hit) continue;
      const col = m.hole % cols;
      const row = Math.floor(m.hole / cols);
      const bx = startX + col * (holeW + gap) + holeW / 2;
      const by = startY + row * (holeH + gap) + holeH / 2;
      const bob = Math.sin(m.timer * 6) * 3;
      const pop = Math.min(1, (1.5 - m.timer) * 2);
      const py = by - 10 - pop * 30 + bob;
      if (pop < 0.1) continue;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = j % 2 === 0 ? 20 * pop : 8 * pop;
        if (j === 0) ctx.moveTo(bx + Math.cos(a) * r, py + Math.sin(a) * r);
        else ctx.lineTo(bx + Math.cos(a) * r, py + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2C3E50';
      ctx.beginPath();
      ctx.arc(bx - 5, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 5, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(bx - 4, py - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 6, py - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E57373';
      ctx.beginPath();
      ctx.arc(bx, py + 4, 3, 0, Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('Click stars as they pop up! Miss 5 and game ends!', cx, this.game.height - 120);
  }
}

class CountStarsGame {
  constructor(game) {
    this.game = game;
    this.isComplete = false;
    this.reward = 0;
    this.target = 5;
    this.done = 0;
    this.flashCount = 0;
    this.flashStars = [];
    this.flashTimer = 0;
    this.phase = 'showing';
    this.showTimer = 0;
    this.answer = 0;
    this.userAnswer = 0;
    this.choices = [];
    this.round = 0;
  }

  init() {
    this.isComplete = false;
    this.reward = 0;
    this.done = 0;
    this.round = 0;
    this._nextRound();
  }

  _nextRound() {
    this.round++;
    this.flashCount = 3 + Math.floor(Math.random() * 4);
    this.flashStars = [];
    const cols = 4;
    const gap = 40;
    const startX = (this.game.width - (cols * 30 + (cols - 1) * gap)) / 2 + 15;
    const startY = 240;
    const used = [];
    for (let i = 0; i < this.flashCount; i++) {
      let pos;
      do { pos = { x: startX + Math.floor(Math.random() * cols) * (30 + gap), y: startY + Math.floor(Math.random() * 3) * (30 + gap) }; }
      while (used.some(p => Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20));
      used.push(pos);
      this.flashStars.push({ ...pos, visible: true });
    }
    this.answer = this.flashCount;
    this.phase = 'showing';
    this.showTimer = 2;
    this.choices = [this.answer];
    const offsets = [-2, -1, 1, 2];
    for (const off of offsets) {
      const val = this.answer + off;
      if (val >= 0 && !this.choices.includes(val)) this.choices.push(val);
    }
    this.choices.sort(() => Math.random() - 0.5);
  }

  update(dt, input) {
    if (this.isComplete) return;
    if (this.phase === 'showing') {
      this.showTimer -= dt;
      if (this.showTimer <= 0) { this.phase = 'answering'; }
      return;
    }
    if (input.mouseClicked) {
      const mx = input.mouseX;
      const my = input.mouseY;
      const cx = this.game.width / 2;
      const startY = 360;
      for (let i = 0; i < this.choices.length; i++) {
        const bx = cx - 95 + (i % 2) * 190;
        const by = startY + Math.floor(i / 2) * 65;
        if (mx >= bx && mx <= bx + 170 && my >= by && my <= by + 52) {
          if (this.choices[i] === this.answer) {
            this.done++;
            this.game.audio.playStarCollect();
            if (this.done >= this.target) { this.isComplete = true; this.reward = 6 + Math.floor(Math.random() * 3); }
            else { this._nextRound(); }
          } else {
            this.game.audio.playHurt();
            this._nextRound();
          }
          break;
        }
      }
    }
  }

  finish() { this.reward = Math.max(1, this.done); }

  render(ctx) {
    const cx = this.game.width / 2;
    const mx = this.game.input.mouseX;
    const my = this.game.input.mouseY;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔢 Count Stars! ${this.done}/${this.target}`, cx, 160);

    if (this.phase === 'showing') {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText(`Memorize! ${Math.ceil(this.showTimer)}s`, cx, 200);
      for (const s of this.flashStars) {
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 18);
        grad.addColorStop(0, '#FFF9C4');
        grad.addColorStop(0.5, '#FFD700');
        grad.addColorStop(1, '#FFA000');
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = j % 2 === 0 ? 14 : 6;
          if (j === 0) ctx.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
          else ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText('How many stars were there?', cx, 200);
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText('Click the correct number!', cx, 225);

      const startY = 360;
      for (let i = 0; i < this.choices.length; i++) {
        const bx = cx - 95 + (i % 2) * 190;
        const by = startY + Math.floor(i / 2) * 65;
        const hover = mx >= bx && mx <= bx + 170 && my >= by && my <= by + 52;

        ctx.save();
        if (hover) {
          ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
          ctx.shadowBlur = 16;
        }
        const grad = ctx.createLinearGradient(bx, by, bx, by + 52);
        grad.addColorStop(0, hover ? '#3a6a9a' : '#2a4a7a');
        grad.addColorStop(1, hover ? '#2a4a7a' : '#1a3a5a');
        ctx.fillStyle = grad;
        roundRect(ctx, bx, by, 170, 52, 14);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.strokeStyle = hover ? 'rgba(100, 200, 255, 0.6)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = hover ? 3 : 1;
        roundRect(ctx, bx, by, 170, 52, 14);
        ctx.stroke();

        ctx.fillStyle = hover ? '#FFFFFF' : 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.choices[i], bx + 85, by + 36);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Watch carefully, then answer!', cx, this.game.height - 120);
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
