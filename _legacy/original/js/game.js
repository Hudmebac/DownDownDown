import { World, AREA_CONFIG } from './world.js';
import { Player } from './player.js';
import { AudioManager } from './audio.js';
import { StarManager, Enemy, ParticleSystem } from './entities.js';
import { MiniGameManager } from './minigames.js';
import { UI } from './ui.js';
import { RewardSystem, REWARD_TIERS } from './rewards.js';
import { PlayerProfile, CUSTOM_CHAR_INDEX, saveCustomCharData } from './profile.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.state = 'MENU';
    this.starsCollected = 0;
    this.gameOver = false;
    this.lastTime = 0;
    this.running = false;

    this.input = { left: false, right: false, mouseX: 0, mouseY: 0, mouseClicked: false, mouseDown: false, mouseLeft: false, mouseRight: false, mouseJump: false, spacePressed: false, spaceHeld: false, jumpHeld: false, touchLeft: false, touchRight: false, touchJump: false };
    this._setupInput();

    this.audio = new AudioManager();
    this.world = new World(this.width, this.height);
    this.player = new Player(this.width / 2 - 15, -100);
    this.starManager = new StarManager(this.world);
    this.enemy = new Enemy(this.width, this.height);
    this.particles = new ParticleSystem();
    this.miniGameManager = new MiniGameManager(this);
    this.ui = new UI(this);
    this.rewards = new RewardSystem();
    this.starManager.rewards = this.rewards;
    this.profile = new PlayerProfile();
    this.ui.selectedChar = this.profile.selectedCharacter;

    this._practiceId = null;
    this._practiceTimer = 0;
    this._practiceShowHelp = 0;
    this._practiceMiniGameSelect = false;
    this.lives = 1;
    this.maxLives = 3;
    this._areaNotification = 0;
    this._respawnTimer = 0;
    this._streakFactor = 1;
    this._puNotification = null;
    this._missedStarNotification = null;

    this._transitionAlpha = 0;
    this._transitionTarget = null;
    this._transitioning = false;
    this._transitionDir = 0;

    this._initKeyHandler();
  }

  _setupInput() {
    this.input.mouseClicked = false;
  }

  _initKeyHandler() {
    document.addEventListener('keydown', (e) => {
      if (this.state === 'NAME_ENTRY') {
        if (e.key === 'Enter') {
          if (this.profile.confirmName(this.ui.nameBuffer)) {
            this.ui.selectedChar = this.profile.selectedCharacter;
            this.state = 'CHARACTER_SELECT';
          }
          e.preventDefault();
        } else if (e.key === 'Backspace') {
          this.ui.nameBuffer = (this.ui.nameBuffer || '').slice(0, -1);
          e.preventDefault();
        } else if (e.key.length === 1 && e.key.match(/^[a-zA-Z0-9 _-]$/) && (this.ui.nameBuffer || '').length < 12) {
          this.ui.nameBuffer = (this.ui.nameBuffer || '') + e.key;
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.input.left = true;
        if (this.state === 'CHARACTER_SELECT') {
          const col = this.ui.selectedChar % 4;
          if (col > 0) this.ui.selectedChar--;
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.input.right = true;
        if (this.state === 'CHARACTER_SELECT') {
          const col = this.ui.selectedChar % 4;
          if (col < 3 && this.ui.selectedChar < 8) this.ui.selectedChar++;
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.input.jumpHeld = true;
        if (this.state === 'CHARACTER_SELECT') {
          this.ui.selectedChar = Math.max(0, this.ui.selectedChar - 4);
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (this.state === 'CHARACTER_SELECT') {
          this.ui.selectedChar = Math.min(8, this.ui.selectedChar + 4);
          e.preventDefault();
        }
      }
      if (e.key === ' ') {
        this.input.spacePressed = true;
        this.input.spaceHeld = true;
        this.input.jumpHeld = true;
        if (this.state === 'CHARACTER_SELECT') {
          this.startGame();
        }
        e.preventDefault();
      }
      if (e.key === 'Enter' && this.state === 'CHARACTER_SELECT') {
        this.startGame();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        if (this.state === 'PLAYING') {
          this.state = 'PAUSED';
          e.preventDefault();
        } else if (this.state === 'PAUSED') {
          this.state = 'PLAYING';
          e.preventDefault();
        } else if (this.state === 'CHARACTER_SELECT' || this.state === 'NAME_ENTRY') {
          this.transitionTo('MENU');
          this.audio.startMusic('menu');
          e.preventDefault();
        } else if (this.state === 'PRACTICE' || this.state === 'PRACTICE_MENU') {
          this.transitionTo('MENU');
          this.audio.stopMusic();
          this.audio.startMusic('menu');
          e.preventDefault();
        } else if (this.state === 'LEADERBOARD' || this.state === 'REWARD_TABLE') {
          this.transitionTo('MENU');
          e.preventDefault();
        } else if (this.state === 'CUSTOMIZE') {
          this.state = 'CHARACTER_SELECT';
          e.preventDefault();
        }
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.input.jumpHeld = false;
      if (e.key === ' ') { this.input.spacePressed = false; this.input.spaceHeld = false; this.input.jumpHeld = false; }
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      this.input.mouseX = (e.clientX - rect.left) * scaleX;
      this.input.mouseY = (e.clientY - rect.top) * scaleY;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'PLAYING' || this.state === 'PRACTICE') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        this.input.mouseX = (e.clientX - rect.left) * scaleX;
        const bottomZone = this.height - 140;
        if (this.input.mouseY > bottomZone) {
          this.input.mouseLeft = this.input.mouseX < 140;
          this.input.mouseRight = this.input.mouseX >= 140 && this.input.mouseX < 300;
          this.input.mouseJump = this.input.mouseX > this.width - 130;
        }
        this.input.mouseDown = true;
      }
    });
    document.addEventListener('mouseup', () => {
      this.input.mouseDown = false;
      this.input.mouseLeft = false;
      this.input.mouseRight = false;
      this.input.mouseJump = false;
    });

    this._handleTouch = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      if (this.state === 'PLAYING' || this.state === 'PRACTICE') {
        this.input.touchLeft = false;
        this.input.touchRight = false;
        this.input.touchJump = false;
      }
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const tx = (touch.clientX - rect.left) * scaleX;
        const ty = (touch.clientY - rect.top) * scaleY;
        if (i === 0) {
          this.input.mouseX = tx;
          this.input.mouseY = ty;
        }
        if (this.state === 'PLAYING' || this.state === 'PRACTICE') {
          const bottomZone = this.height - 140;
          if (ty > bottomZone) {
            if (tx < 140) this.input.touchLeft = true;
            else if (tx >= 140 && tx < 300) this.input.touchRight = true;
            else if (tx > this.width - 130) this.input.touchJump = true;
          }
        }
      }
      if (e.type === 'touchstart') {
        this.input.mouseClicked = true;
        this.input.mouseDown = true;
        this.audio.init();
        this.audio.resume();
        if (!this.audio._startedOnce && this.state === 'MENU') {
          this.audio.startMusic('menu');
        }
        if (e.touches.length === 1 && this.state !== 'PLAYING' && this.state !== 'PRACTICE') {
          this._processMenuClick(this.input.mouseX, this.input.mouseY);
        }
      }
    };

    this._endTouch = (e) => {
      e.preventDefault();
      this.input.mouseDown = false;
      this.input.touchLeft = false;
      this.input.touchRight = false;
      this.input.touchJump = false;
    };

    this.canvas.addEventListener('touchstart', this._handleTouch, { passive: false });
    this.canvas.addEventListener('touchmove', this._handleTouch, { passive: false });
    this.canvas.addEventListener('touchend', this._endTouch, { passive: false });
    this.canvas.addEventListener('touchcancel', this._endTouch, { passive: false });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      this.input.mouseX = mx;
      this.input.mouseY = my;
      this.input.mouseClicked = true;

      this.audio.init();
      this.audio.resume();
      if (!this.audio._startedOnce && this.state === 'MENU') {
        this.audio.startMusic('menu');
      }

      this._processMenuClick(mx, my);

      const toggleY = this.height - 52;
      const toggleWH = 46;
      const toggleHH = 36;
      if (this.state !== 'MENU') {
        if (mx >= 20 && mx <= 20 + toggleWH && my >= toggleY && my <= toggleY + toggleHH) {
          this.audio.toggleMusic();
        }
        if (mx >= 76 && mx <= 76 + toggleWH && my >= toggleY && my <= toggleY + toggleHH) {
          this.audio.toggleSfx();
        }
      }

      if (this.state === 'PLAYING') {
        const pBtnX = this.width - 38;
        const pBtnY = 8;
        const pBtnS = 28;
        if (mx >= pBtnX - pBtnS/2 && mx <= pBtnX + pBtnS/2 && my >= pBtnY && my <= pBtnY + pBtnS) {
          this.state = 'PAUSED';
        }
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      this.input.mouseX = mx;
      this.input.mouseY = my;
      this.input.mouseClicked = true;
      this.audio.init();
      this.audio.resume();
      this._processMenuClick(mx, my);
    });
  }

  _processMenuClick(mx, my) {
    const action = this.ui.handleMenuClick(mx, my);
    if (this.state === 'MENU') {
      if (action === 'play') {
        if (this.profile && !this.profile.hasName()) {
          this.ui.nameBuffer = '';
          this.transitionTo('NAME_ENTRY');
        } else {
          this.transitionTo('CHARACTER_SELECT');
        }
      } else if (action === 'practice') {
        this.transitionTo('PRACTICE_MENU');
      } else if (action === 'rewards') {
        this.transitionTo('REWARD_TABLE');
      } else if (action === 'leaderboard') {
        this.transitionTo('LEADERBOARD');
      } else if (action === 'char_select') {
        this.ui.selectedChar = this.profile ? this.profile.selectedCharacter : 0;
        this.transitionTo('CHARACTER_SELECT');
      }
    } else if (this.state === 'PRACTICE_MENU') {
      if (action && action.startsWith('practice_')) {
        this.startPractice(action.slice(9));
      } else if (action === 'back') {
        this.transitionTo('MENU');
        this.audio.startMusic('menu');
      }
    } else if (this.state === 'CHARACTER_SELECT') {
      if (action === 'select_char') {
        if (this.profile) this.profile.setCharacter(this.ui.selectedChar);
        this.startGame();
        return;
      } else if (action === 'start') {
        this.startGame();
      } else if (action === 'change_name') {
        this.ui.nameBuffer = this.profile ? this.profile.name : '';
        this.transitionTo('NAME_ENTRY');
      } else if (action === 'customize') {
        this.ui.initCustomize();
        this.state = 'CUSTOMIZE';
      } else if (action === 'back') {
        this.transitionTo('MENU');
        this.audio.startMusic('menu');
      }
    } else if (this.state === 'CUSTOMIZE') {
      if (action === 'back') {
        this.state = 'CHARACTER_SELECT';
      } else if (action === 'save_custom') {
        this.ui.customData.name = this.ui.customName || 'My Hero';
        saveCustomCharData(this.ui.customData);
        this.ui.selectedChar = CUSTOM_CHAR_INDEX;
        if (this.profile) this.profile.setCharacter(CUSTOM_CHAR_INDEX);
        this.transitionTo('CHARACTER_SELECT');
      } else if (action && action.startsWith('custom_option_')) {
        this.ui.handleCustomOption(action);
      } else if (action === 'randomize_custom') {
        this.ui.randomizeCustomData();
      }
    } else if (this.state === 'NAME_ENTRY') {
      if (action === 'name_done') {
        if (this.profile.confirmName(this.ui.nameBuffer)) {
          this.ui.selectedChar = this.profile.selectedCharacter;
          this.transitionTo('CHARACTER_SELECT');
        }
      }
    } else if (this.state === 'GAMEOVER') {
      if (action === 'restart') {
        this.restartGame();
      } else if (action === 'menu') {
        this.audio.stopMusic();
        this.audio.stopChaseMusic();
        this.transitionTo('MENU');
        this.audio.startMusic('menu');
      }
    } else if (this.state === 'PAUSED') {
      if (action === 'resume') {
        this.state = 'PLAYING';
      } else if (action === 'restart') {
        this.restartGame();
      } else if (action === 'quit') {
        this.audio.stopMusic();
        this.audio.stopChaseMusic();
        this.transitionTo('MENU');
        this.audio.startMusic('menu');
      }
    } else if (this.state === 'REWARD_TABLE') {
      if (action === 'back') {
        this.transitionTo('MENU');
      }
    } else if (this.state === 'LEADERBOARD') {
      if (action === 'back') {
        this.state = 'MENU';
      }
    }
  }

  practiceLessons = [
    { id: 'fall', title: 'Learn to Fall', desc: 'Land on platforms as you descend!', icon: '🌊' },
    { id: 'jump', title: 'Learn to Jump', desc: 'Jump between platforms over gaps!', icon: '⬆' },
    { id: 'clouds', title: 'Learn Clouds', desc: 'Cloud floors break as you land!', icon: '☁' },
    { id: 'minigames', title: 'Learn Mini Games', desc: 'Practice all the mini-games!', icon: '🎮' },
    { id: 'enemy', title: 'Avoid the Enemy', desc: 'Dodge the enemy and spikes!', icon: '👾' },
  ];

  startPractice(id) {
    this.starsCollected = 0;
    this.gameOver = false;
    this._practiceId = id;
    this._practiceTimer = 0;
    this._practiceShowHelp = 4;
    this._practiceMiniGameSelect = false;
    this.lives = 1;
    this._areaNotification = 0;

    if (id === 'minigames') {
      this.state = 'PRACTICE';
      this._practiceMiniGameSelect = true;
      this._practiceShowHelp = 0;
      this.world = null;
      this.player = null;
      this.starManager = null;
      this.enemy = null;
      this.particles = null;
      this.miniGameManager = new MiniGameManager(this);
      this.audio.startMusic('playing');
      return;
    }

    this.state = 'PRACTICE';
    this.world = new World(this.width, this.height);
    this.world.lessonMode = id;
    this.world.init();
    this.world.difficulty = 0;
    this.world.totalDistance = 0;
    this.world.generateLessonLayout(id);
    const startPlat = this.world.getPlatformAbove(999999);
    const startY = startPlat ? startPlat.y - 42 : this.world.scrollY;
    this.player = new Player(this.width / 2 - 15, startY);
    this.player.setCharacter(this.ui.selectedChar);
    this.world.scrollY = startY - this.height * 0.35;
    this.starManager = new StarManager(this.world);
    this.starManager.collectedCount = 0;
    this.starManager.rewards = this.rewards;
    this.enemy = new Enemy(this.width, this.height);
    this.particles = new ParticleSystem();
    this.miniGameManager = new MiniGameManager(this);
    this.miniGameManager.triggerCooldown = 5;
    this.lastTime = performance.now();
    this.audio.startMusic('playing');
  }

  restartGame() {
    this.audio.stopMusic();
    this.audio.stopChaseMusic();
    this.startGame();
  }

  startGame() {
    this.starsCollected = 0;
    this.gameOver = false;
    this.lives = 1;
    this._areaNotification = 0;
    if (this.rewards) this.rewards.resetStreak();

    this.world = new World(this.width, this.height);
    this.world.init();
    this.world.setRewardTier(0);
    const bestPlat = this.world.getPlatformAbove(999999);
    let spawnY = -100;
    if (bestPlat) {
      spawnY = bestPlat.y - this.player.height;
      this.world.scrollY = spawnY - this.height * 0.35;
    }
    this.player = new Player(this.width / 2 - 15, spawnY);
    this.player.setCharacter(this.ui.selectedChar);
    this.starManager = new StarManager(this.world);
    this.starManager.collectedCount = 0;
    this.starManager.rewards = this.rewards;
    this.enemy = new Enemy(this.width, this.height);
    this.particles = new ParticleSystem();
    this.miniGameManager = new MiniGameManager(this);
    this.lastTime = performance.now();
    this._respawnTimer = 0;
    this._streakFactor = 1;
    this._puNotification = null;
    this._missedStarNotification = null;

    this.state = 'PLAYING';
    this.audio.startMusic('playing');
    this.transitionTo('PLAYING');
  }

  transitionTo(newState, delay = 0) {
    if (this._transitioning) return;
    this._transitioning = true;
    this._transitionTarget = newState;
    this._transitionTimer = -delay;
    this._transitionPhase = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.audio.init();
    this.audio.startMusic('menu');
    this.loop(this.lastTime);
  }

  loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this._renderDt = dt;
    this.update(dt);
    this.render();

    this.input.mouseClicked = false;
    this.input.spacePressed = false;

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.ui.update(dt);
    if (this.rewards) this.rewards.update(dt);

    if (this._transitioning) {
      this._transitionTimer += dt;
      const t = this._transitionTimer;
      if (this._transitionPhase === 0) {
        this._transitionAlpha = Math.min(1, t / 0.15);
        if (t >= 0.15) {
          this._transitionPhase = 1;
          this._transitionTimer = 0;
          if (this._transitionTarget && this._transitionTarget !== this.state) {
            this.state = this._transitionTarget;
            this.audio.init();
          }
        }
      } else if (this._transitionPhase === 1) {
        if (t >= 0.08) {
          this._transitionPhase = 2;
          this._transitionTimer = 0;
        }
      } else if (this._transitionPhase === 2) {
        this._transitionAlpha = Math.max(0, 1 - t / 0.12);
        if (t >= 0.12) {
          this._transitioning = false;
          this._transitionAlpha = 0;
          this._transitionTarget = null;
        }
      }
    }

    if (this.state === 'PLAYING') {
      if (this._respawnTimer > 0) {
        this._respawnTimer -= dt;
        if (this._respawnTimer <= 0) {
          const respawnPlat = this.world.getPlatformAbove(this.world.scrollY + this.height);
          const ry = respawnPlat ? respawnPlat.y - 36 : this.world.scrollY + 100;
          this.player = new Player(this.width / 2 - 15, ry);
          this.player.setCharacter(this.ui.selectedChar);
          this.player.invulnerableTimer = 2;
          this._respawnTimer = 0;
        }
        return;
      }
      const prevArea = this.world.area;
      this.world.update(dt, this.player.worldY, this.player.vy);
      if (this.world.area !== prevArea) {
        this._areaNotification = 5;
      }
      if (this._areaNotification > 0) this._areaNotification -= dt;

      if (this.world._missedStar && this.rewards && this.rewards.streak > 0) {
        this.rewards.resetStreak();
        this._missedStarNotification = { timer: 2.5 };
        this.audio.playHurt();
      }
      if (this._missedStarNotification) {
        this._missedStarNotification.timer -= dt;
        if (this._missedStarNotification.timer <= 0) this._missedStarNotification = null;
      }

      const collisionResult = this.player.update(dt, this.world, this.input);
      if (collisionResult && collisionResult.break) {
        this.audio.playFloorBreak();
        this.particles.emit(
          collisionResult.x + collisionResult.w / 2,
          this.world.getScreenY(collisionResult.y),
          10,
          { color: '#8B4513', speed: 80, size: 3 }
        );
      }

      if (!this.player.alive) {
        this._loseLife();
        return;
      }

      if (this.player.worldY > this.world.scrollY + this.height + 300) {
        this.player.alive = false;
        this._loseLife();
        return;
      }

      const enemyResult = this.enemy.update(
        dt,
        this.player.x,
        this.player.worldY - this.world.scrollY + this.player.height
      );
      if (this.player.powerUp !== 'shield' && this.enemy.checkCollision({
        x: this.player.x,
        y: this.player.worldY - this.world.scrollY,
        width: this.player.width,
        height: this.player.height,
      })) {
        this.player.alive = false;
        this._loseLife();
        return;
      }
      if (enemyResult === 'expired') {
        this.audio.stopChaseMusic();
        this.enemy.chaseCooldown = 8;
      }

      this.enemy.chaseCooldown = Math.max(0, this.enemy.chaseCooldown - dt);

      if (!this.enemy.active && this.world.difficulty > 0) {
        const chance = Math.min(0.006, 0.001 + this.world.difficulty * 0.0006);
        if (Math.random() < chance && this.enemy.chaseCooldown <= 0) {
          this.enemy.spawn(
            this.player.x,
            this.player.worldY - this.world.scrollY
          );
          this.audio.playEnemyChase();
          this.audio.startChaseMusic();
        }
      }

      for (const star of this.world.getVisibleStars()) {
        const sy = this.world.getScreenY(star.y);
        if (
          !star.collected &&
          this.player.x + this.player.width > star.x &&
          this.player.x < star.x + star.size &&
          this.player.worldY < star.y + star.size &&
          this.player.worldY + this.player.height > star.y
        ) {
          if (this.starManager.collectStar(star)) {
            let mul = 1;
            if (this.player && this.player.powerUp === 'x2' && this.player.powerUpTimer > 0) mul = 2;
            if (this.player && this.player.powerUp === 'streak' && this.player.powerUpTimer > 0) {
              mul = this._streakFactor;
              this._streakFactor *= 2;
            }
            if (this.player && this.player.bonusPoints && this.player.bonusPoints > 1 && this.player.powerUp !== 'streak') {
              mul = Math.round(mul * this.player.bonusPoints);
            }
            this.starsCollected += mul;
            const result = this.rewards ? this.rewards.collectStar(mul) : { miniGameReady: false };
            this.audio.playStarCollect();
            this.particles.emit(star.x + star.size / 2, sy + star.size / 2, 6, { color: '#FFD700', speed: 80 });
            if (result.miniGameReady && !this.miniGameManager.active) {
              const types = Object.keys(this.miniGameManager.miniGames);
              const pick = types[Math.floor(Math.random() * types.length)];
              this.miniGameManager.startMiniGame(pick);
              this.state = 'MINIGAME';
            }
            if (result.milestone > 0) {
              const msColors = { 3: '#4DD0E1', 5: '#81C784', 7: '#FFD54F', 9: '#FF8A65' };
              const c = msColors[result.milestone] || '#FFD700';
              this.particles.emit(star.x + star.size / 2, sy + star.size / 2, 12, { color: c, speed: 120, size: 3 });
              this.audio.playBigStar();
            }
          }
        }
      }

      for (const chest of this.world.getVisibleChests()) {
        if (
          this.player.x + this.player.width > chest.x &&
          this.player.x < chest.x + chest.w &&
          this.player.worldY + this.player.height > chest.y &&
          this.player.worldY < chest.y + chest.h
        ) {
          chest.collected = true;
          this.audio.playBigStar();
          this.particles.emit(chest.x + chest.w / 2, this.world.getScreenY(chest.y) + chest.h / 2, 15, { color: '#FFD700', speed: 120, size: 4 });
          if (this.rewards) this.rewards.openChest();
        }
      }

      for (const pu of this.world.getVisiblePowerUps()) {
        if (
          !pu.collected &&
          this.player.x + this.player.width > pu.x &&
          this.player.x < pu.x + (pu.size || 20) &&
          this.player.worldY + this.player.height > pu.y &&
          this.player.worldY < pu.y + (pu.size || 20)
        ) {
          pu.collected = true;
          const durations = { wings: 5, rocket: 4, shield: 5, x2: 20, streak: 10 };
          this.player.activatePowerUp(pu.type, durations[pu.type]);
          if (pu.type === 'streak') this._streakFactor = 1;
          const puNames = { wings: '🪽 Wings! Slow Fall', rocket: '🚀 Rocket! Speed Boost', shield: '🛡 Shield! Protected', x2: '✨ x2! Double Rewards!', streak: '💜 Streak Doubler!' };
          this._puNotification = { message: puNames[pu.type] || '✦ Power-Up!', timer: 2.5 };
          this.audio.playStarCollect();
          this.particles.emit(pu.x + 7, this.world.getScreenY(pu.y) + 7, 8, { color: '#00FFFF', speed: 100 });
        }
      }

      for (const hazard of this.world.getVisibleHazards()) {
        if (this.player.powerUp === 'shield') continue;
        if (this.player.invulnerableTimer > 0) continue;
        if (
          this.player.x + this.player.width > hazard.x + 4 &&
          this.player.x < hazard.x + hazard.w - 4 &&
          this.player.worldY + this.player.height > hazard.y + 4 &&
          this.player.worldY < hazard.y + hazard.h - 4
        ) {
          this._loseLife();
          return;
        }
      }

      const sideSpike = this.world.getSideSpike();
      if (sideSpike && (sideSpike.phase === 'extending' || sideSpike.phase === 'active') && sideSpike.extendAmount > 0.3) {
        if (this.player.powerUp !== 'shield' && this.player.invulnerableTimer <= 0) {
          const spikeWidth = this.world.getSideSpikeExtendWidth(this.width);
          const hitLeft = sideSpike.side === 'left' && this.player.x < spikeWidth * sideSpike.extendAmount;
          const hitRight = sideSpike.side === 'right' && this.player.x + this.player.width > this.width - spikeWidth * sideSpike.extendAmount;
          if (hitLeft || hitRight) {
            this._loseLife();
            return;
          }
        }
      }

      if (this._puNotification) {
        this._puNotification.timer -= dt;
        if (this._puNotification.timer <= 0) this._puNotification = null;
      }
      this.starManager.update(dt);
      this.particles.update(dt);
    }

    if (this.state === 'PRACTICE') {
      if (this.rewards && this.world) this.world.setRewardTier(this.rewards.currentTier);
      if (this._respawnTimer > 0) {
        this._respawnTimer -= dt;
        if (this._respawnTimer <= 0) {
          const respawnPlat = this.world ? this.world.getPlatformAbove(this.world.scrollY + this.height) : null;
          const ry = respawnPlat ? respawnPlat.y - 36 : (this.world ? this.world.scrollY + 100 : 0);
          this.player = new Player(this.width / 2 - 15, ry);
          this.player.setCharacter(this.ui.selectedChar);
          this.player.invulnerableTimer = 2;
          this._respawnTimer = 0;
        }
        return;
      }
      const pid = this._practiceId;
      this._practiceTimer += dt;
      this._practiceShowHelp = Math.max(0, this._practiceShowHelp - dt);

      if (pid === 'minigames' && this._practiceMiniGameSelect) {
        this.miniGameManager.update(dt, this.input);
        if (this.miniGameManager.active) {
          this._practiceMiniGameSelect = false;
        }
        this.ui.update(dt);
        return;
      }

      if (pid === 'minigames' && this.miniGameManager.active) {
        this.miniGameManager.update(dt, this.input);
        if (this.miniGameManager.active === false) {
          this._practiceMiniGameSelect = true;
        }
        if (this.miniGameManager.active && this.state !== 'MINIGAME') {
          this.state = 'MINIGAME';
        }
        return;
      }

      if (!this.world) return;
      this.world.update(dt, this.player.worldY, this.player.vy);

      if (this.world._missedStar && this.rewards && this.rewards.streak > 0) {
        this.rewards.resetStreak();
        this._missedStarNotification = { timer: 2.5 };
        this.audio.playHurt();
      }
      if (this._missedStarNotification) {
        this._missedStarNotification.timer -= dt;
        if (this._missedStarNotification.timer <= 0) this._missedStarNotification = null;
      }

      const collisionResult = this.player.update(dt, this.world, this.input);
      if (collisionResult && collisionResult.break) {
        this.audio.playFloorBreak();
        this.particles.emit(collisionResult.x + collisionResult.w / 2, this.world.getScreenY(collisionResult.y), 10, { color: '#8B4513', speed: 80, size: 3 });
      }

      if (pid === 'enemy') {
        if (!this.player.alive) {
          this._loseLife();
          return;
        }
        if (this.player.worldY > this.world.scrollY + this.height + 300) {
          this._loseLife();
          return;
        }
      } else {
        if (!this.player.alive) {
          const p = this.world.getPlatformAbove(this.world.scrollY + this.height);
          const ry = p ? p.y - this.player.height : this.world.scrollY + 100;
          this.player = new Player(this.width / 2 - 15, ry);
          this.player.setCharacter(this.ui.selectedChar);
        }
        if (this.player.worldY > this.world.scrollY + this.height + 300) {
          const p = this.world.getPlatformAbove(this.world.scrollY + this.height);
          const ry = p ? p.y - this.player.height : this.world.scrollY + 100;
          this.player = new Player(this.width / 2 - 15, ry);
          this.player.setCharacter(this.ui.selectedChar);
        }
      }

      if (pid === 'minigames') {
        this.miniGameManager.triggerCooldown = Math.min(this.miniGameManager.triggerCooldown, 2);
      }

      if (pid !== 'enemy') {
        this.enemy.chaseCooldown = 999;
        if (this.enemy.active) {
          this.enemy.active = false;
          this.audio.stopChaseMusic();
        }
      } else {
        this.enemy.chaseCooldown = Math.max(0, this.enemy.chaseCooldown - dt);
        if (!this.enemy.active && Math.random() < 0.003) {
          this.enemy.spawn(this.player.x, this.player.worldY - this.world.scrollY);
          this.audio.playEnemyChase();
          this.audio.startChaseMusic();
        }
        const eResult = this.enemy.update(dt, this.player.x, this.player.worldY - this.world.scrollY + this.player.height);
        if (this.player.powerUp !== 'shield' && this.enemy.checkCollision({ x: this.player.x, y: this.player.worldY - this.world.scrollY, width: this.player.width, height: this.player.height })) {
          this._loseLife();
          return;
        }
        if (eResult === 'expired') {
          this.audio.stopChaseMusic();
        }
      }

      if (pid !== 'minigames') {
        this.miniGameManager.triggerCooldown = 999;
      }

      for (const star of this.world.getVisibleStars()) {
        const sy = this.world.getScreenY(star.y);
        if (!star.collected && this.player.x + this.player.width > star.x && this.player.x < star.x + star.size && this.player.worldY < star.y + star.size && this.player.worldY + this.player.height > star.y) {
          if (this.starManager.collectStar(star)) {
            let pmul = 1;
            if (this.player && this.player.bonusPoints && this.player.bonusPoints > 1) {
              pmul = Math.round(this.player.bonusPoints);
            }
            this.starsCollected += pmul;
            const result = this.rewards ? this.rewards.collectStar(pmul) : { miniGameReady: false };
            this.audio.playStarCollect();
            this.particles.emit(star.x + star.size / 2, sy + star.size / 2, 6, { color: '#FFD700', speed: 80 });
            if (result.miniGameReady && !this.miniGameManager.active && pid === 'minigames') {
              const types = Object.keys(this.miniGameManager.miniGames);
              const pick = types[Math.floor(Math.random() * types.length)];
              this.miniGameManager.startMiniGame(pick);
              this.state = 'MINIGAME';
            }
            if (result.milestone > 0) {
              const msColors = { 3: '#4DD0E1', 5: '#81C784', 7: '#FFD54F', 9: '#FF8A65' };
              const c2 = msColors[result.milestone] || '#FFD700';
              this.particles.emit(star.x + star.size / 2, sy + star.size / 2, 12, { color: c2, speed: 120, size: 3 });
              this.audio.playBigStar();
            }
          }
        }
      }

      for (const hazard of this.world.getVisibleHazards()) {
        if (this.player.powerUp === 'shield') continue;
        if (pid !== 'enemy' && pid !== 'jump') continue;
        if (this.player.x + this.player.width > hazard.x + 4 && this.player.x < hazard.x + hazard.w - 4 && this.player.worldY + this.player.height > hazard.y + 4 && this.player.worldY < hazard.y + hazard.h - 4) {
          if (pid === 'enemy') {
          this.player.alive = false;
          this._loseLife();
          return;
          }
          const p = this.world.getPlatformAbove(this.world.scrollY + this.height);
          const ry = p ? p.y - this.player.height : this.world.scrollY + 100;
          this.player = new Player(this.width / 2 - 15, ry);
          this.player.setCharacter(this.ui.selectedChar);
        }
      }

      this.starManager.update(dt);
      this.particles.update(dt);

      if (pid === 'minigames' || this.miniGameManager.active) {
        if (this.miniGameManager.active && this.state !== 'MINIGAME') {
          this.state = 'MINIGAME';
        }
      }
    }

    if (this.state === 'MINIGAME') {
      this.miniGameManager.update(dt, this.input);
      if (this.miniGameManager.active === false) {
          if (this._practiceId === 'minigames') {
            this._practiceMiniGameSelect = true;
            this.state = 'PRACTICE';
          } else if (this._practiceId) {
            this.state = 'PRACTICE';
          } else {
            this.state = 'PLAYING';
          }
      }
    }
  }

  _gameOver() {
    this.gameOver = true;
    this.state = 'GAMEOVER';
    this.audio.playHurt();
    this.audio.stopMusic();
    this.audio.stopChaseMusic();
    if (this.rewards) {
      if (this.rewards.streak > (this.rewards.bestStreak || 0)) {
        this.rewards.bestStreak = this.rewards.streak;
      }
      this.rewards.resetStreak();
    }
    if (this.profile) {
      this.profile.updateStats(this.rewards, this.world ? this.world.totalDistance : 0);
      this.profile.setCharacter(this.ui.selectedChar);
    }
  }

  _loseLife() {
    if (this.lives > 0) {
      this.lives--;
      this._respawnTimer = 2.5;
      this.player = null;
      this.audio.playHurt();
    if (this.rewards) {
      const lastStreak = this.rewards.streak;
      if (lastStreak > (this.rewards.bestStreak || 0)) {
        this.rewards.bestStreak = lastStreak;
      }
      this.rewards.resetStreak();
    }
    } else {
      this._gameOver();
    }
  }

  _getMiniGameFromClick(mx, my) {
    const cols = 3;
    const cardW = 230;
    const cardH = 160;
    const gapX = 16;
    const gapY = 16;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (this.width - totalW) / 2;
    const startY = 110;

    const games = ['catch', 'timing', 'puzzle', 'match', 'colortap', 'whack', 'count'];
    for (let i = 0; i < games.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
        return games[i];
      }
    }
    return null;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.state === 'MENU') {
      this.ui.renderMenu(ctx);
      return;
    }

    if (this.state === 'PRACTICE_MENU') {
      this.ui.renderPracticeMenu(ctx);
      return;
    }

    if (this.state === 'CHARACTER_SELECT') {
      this.ui.renderCharacterSelect(ctx);
      return;
    }

    if (this.state === 'NAME_ENTRY') {
      this.ui.renderNameEntry(ctx);
      return;
    }

    if (this.state === 'REWARD_TABLE') {
      this.ui.renderRewardTable(ctx);
      return;
    }

    if (this.state === 'LEADERBOARD') {
      this.ui.renderLeaderboard(ctx);
      return;
    }

    if (this.state === 'CUSTOMIZE') {
      this.ui.renderCustomize(ctx);
      return;
    }

    const scrollY = this.world ? this.world.scrollY : 0;
    if (this.world) this.ui.renderBackground(ctx);

    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'PRACTICE' || this.state === 'MINIGAME' || this.state === 'GAMEOVER') {
      if (this.world) {
      const corridor = this.world.lessonCorridor || 0;
      if (corridor > 0) {
        const wallW = (this.width - corridor) / 2;
        const wallGrad = ctx.createLinearGradient(0, 0, wallW, 0);
        wallGrad.addColorStop(0, '#3d2817');
        wallGrad.addColorStop(0.5, '#2a1a0e');
        wallGrad.addColorStop(1, '#1a0f08');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, wallW, this.height);
        ctx.fillRect(this.width - wallW, 0, wallW, this.height);
        ctx.fillStyle = '#5c3a1e';
        for (let y = 0; y < this.height; y += 40) {
          ctx.fillRect(wallW - 2, y, 2, 20);
          ctx.fillRect(this.width - wallW, y, 2, 20);
        }
      }
      for (const plat of this.world.getVisiblePlatforms()) {
        const sy = this.world.getScreenY(plat.y);
        if (plat.broken) continue;

        if (plat.isCloud) {
          if (plat.cloudOpacity <= 0.01) continue;
          ctx.globalAlpha = plat.cloudOpacity;
          if (plat.breakSpeed && plat.breakSpeed > 1) {
            const grad = ctx.createLinearGradient(plat.x, sy, plat.x, sy + 14);
            grad.addColorStop(0, 'rgba(200, 220, 240, 0.7)');
            grad.addColorStop(0.5, 'rgba(220, 235, 250, 0.6)');
            grad.addColorStop(1, 'rgba(200, 220, 240, 0.7)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(Math.round(plat.x + plat.w / 2), Math.round(sy + 7), plat.w / 2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            for (let j = 0; j < 5; j++) {
              const puffX = plat.x + plat.w * (0.1 + j * 0.2) + Math.sin(j * 2.3) * 15;
              const puffY = sy + 4 + Math.cos(j * 1.7) * 3;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.beginPath();
              ctx.ellipse(Math.round(puffX), Math.round(puffY), 25, 5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(Math.round(plat.x + plat.w / 2), Math.round(sy + 5), plat.w / 2, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(Math.round(plat.x + plat.w / 4), Math.round(sy + 3), plat.w / 4, 4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (plat.isBreakable) {
          ctx.globalAlpha = 1;
          const bc = AREA_CONFIG[plat.area] || AREA_CONFIG[1];
          const grad = ctx.createLinearGradient(plat.x, sy, plat.x, sy + plat.h);
          grad.addColorStop(0, bc.breakable[0]);
          grad.addColorStop(0.3, bc.breakable[1]);
          grad.addColorStop(0.7, bc.breakable[2]);
          grad.addColorStop(1, bc.breakable[3]);
          ctx.fillStyle = grad;
          roundRect(ctx, Math.round(plat.x), Math.round(sy), plat.w, plat.h, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
          ctx.lineWidth = 1;
          roundRect(ctx, Math.round(plat.x), Math.round(sy), plat.w, plat.h, 4);
          ctx.stroke();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(Math.round(plat.x + plat.w * 0.3), Math.round(sy), 2, plat.h);
          ctx.fillRect(Math.round(plat.x + plat.w * 0.6), Math.round(sy), 2, plat.h);
          ctx.globalAlpha = 1;
        } else {
          const pc = AREA_CONFIG[plat.area] || AREA_CONFIG[1];
          const grad = ctx.createLinearGradient(plat.x, sy, plat.x, sy + plat.h);
          grad.addColorStop(0, pc.platform[0]);
          grad.addColorStop(0.5, pc.platform[1]);
          grad.addColorStop(1, pc.platform[2]);
          ctx.fillStyle = grad;
          roundRect(ctx, Math.round(plat.x), Math.round(sy), plat.w, plat.h, 4);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(Math.round(plat.x + 4), Math.round(sy + 2), plat.w - 8, 3);

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 0.5;
          roundRect(ctx, Math.round(plat.x), Math.round(sy), plat.w, plat.h, 4);
          ctx.stroke();
        }
      }

      for (const hazard of this.world.getHazardsWithWarning()) {
        const sy = this.world.getScreenY(hazard.y);
        const warnLen = 65;
        const warnTop = sy - warnLen;
        const warnBottom = sy;
        const visTop = Math.max(0, warnTop);
        const visBot = Math.min(this.height, warnBottom);
        const visH = visBot - visTop;
        if (visH <= 0) continue;
        const distBelow = Math.max(0, sy - this.height * 0.4);
        const intensity = Math.max(0, 1 - distBelow / 350);
        if (intensity <= 0.01) continue;
        const pulse = Math.sin(Date.now() / 250 + hazard.x * 0.1) * 0.25 + 0.75;
        ctx.save();
        ctx.globalAlpha = intensity * 0.5 * pulse;
        const grad = ctx.createLinearGradient(hazard.x, visTop, hazard.x, visBot);
        grad.addColorStop(0, 'rgba(255, 200, 50, 0)');
        grad.addColorStop(0.5, 'rgba(255, 160, 0, 0.35)');
        grad.addColorStop(1, 'rgba(255, 80, 0, 0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(Math.round(hazard.x), Math.round(visTop), hazard.w, visH);
        ctx.restore();
      }

      for (const hazard of this.world.getVisibleHazards()) {
        const sy = this.world.getScreenY(hazard.y);
        if (hazard.type === 'stalactite') {
          ctx.save();
          ctx.fillStyle = '#8B4513';
          const grad = ctx.createLinearGradient(hazard.x, sy, hazard.x, sy + hazard.h);
          grad.addColorStop(0, '#5C2A0A');
          grad.addColorStop(0.3, '#7A3B10');
          grad.addColorStop(0.7, '#4A2508');
          grad.addColorStop(1, '#2A1505');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(Math.round(hazard.x), Math.round(sy));
          ctx.lineTo(Math.round(hazard.x + hazard.w / 2), Math.round(sy + hazard.h));
          ctx.lineTo(Math.round(hazard.x + hazard.w), Math.round(sy));
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
          ctx.beginPath();
          ctx.moveTo(Math.round(hazard.x + 2), Math.round(sy));
          ctx.lineTo(Math.round(hazard.x + hazard.w / 2), Math.round(sy + hazard.h - 4));
          ctx.lineTo(Math.round(hazard.x + hazard.w - 2), Math.round(sy));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          continue;
        }
        ctx.fillStyle = '#FF4444';
        const spikeCount = 3;
        const sw = hazard.w / spikeCount;
        ctx.beginPath();
        ctx.moveTo(Math.round(hazard.x), Math.round(sy + hazard.h));
        for (let i = 0; i < spikeCount; i++) {
          ctx.lineTo(Math.round(hazard.x + i * sw + sw / 2), Math.round(sy));
          ctx.lineTo(Math.round(hazard.x + (i + 1) * sw), Math.round(sy + hazard.h));
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#CC0000';
        ctx.beginPath();
        ctx.moveTo(Math.round(hazard.x), Math.round(sy + hazard.h));
        for (let i = 0; i < spikeCount; i++) {
          ctx.lineTo(Math.round(hazard.x + i * sw + sw / 2), Math.round(sy + 3));
          ctx.lineTo(Math.round(hazard.x + (i + 1) * sw), Math.round(sy + hazard.h));
        }
        ctx.closePath();
        ctx.fill();
      }

      const sideSpike = this.world.getSideSpike();
      if (sideSpike) {
        const t = Date.now() / 1000;
        const ssw = this.world.getSideSpikeExtendWidth(this.width);
        if (sideSpike.phase === 'warning') {
          const pulse = Math.sin(t * 8) * 0.3 + 0.7;
          const grad = ctx.createLinearGradient(
            sideSpike.side === 'left' ? 0 : this.width, 0,
            sideSpike.side === 'left' ? ssw : this.width - ssw, 0
          );
          const alpha = pulse * 0.6;
          grad.addColorStop(0, `rgba(255, 60, 0, ${alpha})`);
          grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, this.width, this.height);
        } else if (sideSpike.phase === 'extending' || sideSpike.phase === 'active' || sideSpike.phase === 'retracting') {
          if (sideSpike.extendAmount > 0.05) {
            const extW = ssw * sideSpike.extendAmount;
            const wallX = sideSpike.side === 'left' ? 0 : this.width - extW;

            // Wall base - solid dark rock texture
            const wallGrad = ctx.createLinearGradient(wallX, 0, wallX + extW, 0);
            wallGrad.addColorStop(0, '#1a0a05');
            wallGrad.addColorStop(0.3, '#3a1a08');
            wallGrad.addColorStop(0.6, '#5a2a0a');
            wallGrad.addColorStop(0.85, '#4a2010');
            wallGrad.addColorStop(1, 'rgba(60, 25, 10, 0)');
            ctx.fillStyle = wallGrad;
            ctx.fillRect(wallX, 0, extW, this.height);

            // Brick lines on wall surface
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            for (let row = 0; row < Math.ceil(this.height / 24); row++) {
              const by = row * 24;
              const offset = row % 2 === 0 ? 0 : 12;
              const lineX = sideSpike.side === 'left' ? wallX + 8 : this.width - wallX - 8;
              ctx.strokeStyle = 'rgba(0,0,0,0.1)';
              if (sideSpike.side === 'left') {
                ctx.beginPath();
                ctx.moveTo(wallX + offset, by + 12);
                ctx.lineTo(Math.min(wallX + extW, wallX + offset + 40), by + 12);
                ctx.stroke();
              } else {
                ctx.beginPath();
                ctx.moveTo(this.width - wallX - offset, by + 12);
                ctx.lineTo(Math.max(this.width - wallX - extW, this.width - wallX - offset - 40), by + 12);
                ctx.stroke();
              }
            }

            // Crack lines at the wall edge where spikes emerge
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
              const cy = (i / 8) * this.height;
              const crackX = sideSpike.side === 'left' ? extW * 0.3 : this.width - extW * 0.3;
              const crackLen = 8 + Math.sin(i * 3.7) * 4;
              ctx.beginPath();
              if (sideSpike.side === 'left') {
                ctx.moveTo(crackX, cy);
                ctx.lineTo(crackX - crackLen, cy + 4 + Math.sin(i * 2.3) * 3);
              } else {
                ctx.moveTo(crackX, cy);
                ctx.lineTo(crackX + crackLen, cy + 4 + Math.sin(i * 2.3) * 3);
              }
              ctx.stroke();
            }

            // Spike triangles with gradient and 3D effect
            const spikeCount = 8;
            const spikeH = 28;
            const gap = this.height / spikeCount;
            const spikeIntensity = sideSpike.phase === 'extending' ? 0.7 + sideSpike.extendAmount * 0.3 : 1;
            for (let i = 0; i < spikeCount; i++) {
              const sy2 = i * gap + (gap - spikeH) / 2;
              const tipX = sideSpike.side === 'left' ? extW : wallX;
              const baseX = sideSpike.side === 'left' ? 0 : this.width;
              const spikeW = extW * spikeIntensity;

              // Shadow behind spike
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.beginPath();
              ctx.moveTo(baseX + (sideSpike.side === 'left' ? 2 : -2), sy2 + 2);
              ctx.lineTo(tipX + (sideSpike.side === 'left' ? 0 : 0), sy2 + spikeH / 2 + 2);
              ctx.lineTo(baseX + (sideSpike.side === 'left' ? 2 : -2), sy2 + spikeH + 2);
              ctx.closePath();
              ctx.fill();

              // Main spike body - gradient from dark at base to bright at tip
              const spikeGrad = ctx.createLinearGradient(
                baseX, 0, tipX, 0
              );
              const isActive = sideSpike.phase === 'active';
              spikeGrad.addColorStop(0, isActive ? '#4a0000' : '#2a0000');
              spikeGrad.addColorStop(0.5, isActive ? '#BB2222' : '#882222');
              spikeGrad.addColorStop(1, isActive ? '#FF4444' : '#CC3333');
              ctx.fillStyle = spikeGrad;

              ctx.beginPath();
              ctx.moveTo(baseX, sy2 + 1);
              ctx.lineTo(tipX, sy2 + spikeH / 2);
              ctx.lineTo(baseX, sy2 + spikeH - 1);
              ctx.closePath();
              ctx.fill();

              // Highlight edge on the spike
              ctx.strokeStyle = isActive ? 'rgba(255,100,100,0.4)' : 'rgba(255,80,80,0.2)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(baseX, sy2 + 2);
              ctx.lineTo(tipX, sy2 + spikeH / 2);
              ctx.stroke();
            }

            // Dust particles at wall edge when extending/retracting
            if (sideSpike.phase === 'extending' || sideSpike.phase === 'retracting') {
              const dustX = sideSpike.side === 'left' ? extW * 0.6 : this.width - extW * 0.6;
              for (let i = 0; i < 3; i++) {
                const pSeed = ((i * 137 + Date.now() * 0.003) % 100) / 100;
                const pY = (pSeed * this.height);
                const pSize = 1.5 + Math.sin(Date.now() * 0.005 + i * 2) * 1;
                ctx.fillStyle = `rgba(180, 140, 100, ${0.3 + Math.sin(Date.now() * 0.01 + i) * 0.2})`;
                ctx.beginPath();
                ctx.arc(dustX + (Math.random() - 0.5) * 8, pY + (Math.random() - 0.5) * 8, pSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }

      this.starManager.renderStars(ctx);
      this.starManager.renderSparkles(ctx);

      for (const chest of this.world.getVisibleChests()) {
        const sy = this.world.getScreenY(chest.y);
        const bob = Math.sin(Date.now() / 400 + chest.x * 0.1) * 3;
        const px = Math.round(chest.x);
        const py = Math.round(sy + bob);

        ctx.save();
        const chestGrad = ctx.createLinearGradient(px, py, px, py + chest.h);
        chestGrad.addColorStop(0, '#D4A574');
        chestGrad.addColorStop(0.3, '#C49A6C');
        chestGrad.addColorStop(0.7, '#B8895C');
        chestGrad.addColorStop(1, '#8B6914');
        ctx.fillStyle = chestGrad;
        roundRect(ctx, px, py, chest.w, chest.h, 4);
        ctx.fill();

        ctx.strokeStyle = '#6B4F10';
        ctx.lineWidth = 2;
        roundRect(ctx, px, py, chest.w, chest.h, 4);
        ctx.stroke();

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(px + 4, py + chest.h / 2 - 2, chest.w - 8, 4);

        ctx.fillStyle = '#8B6914';
        ctx.beginPath();
        ctx.arc(px + chest.w / 2, py + chest.h / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', px + chest.w / 2, py + chest.h / 2);

        const glow = ctx.createRadialGradient(px + chest.w / 2, py + chest.h / 2, 0, px + chest.w / 2, py + chest.h / 2, 30);
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px + chest.w / 2, py + chest.h / 2, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      for (const pu of this.world.getVisiblePowerUps()) {
        const sy = this.world.getScreenY(pu.y);
        const bob = Math.sin(Date.now() / 300 + pu.bobTimer) * 4;
        const puSize = (pu.size || 20) * 1.3;
        const px = Math.round(pu.x + puSize / 2);
        const py = Math.round(sy + puSize / 2 + bob);
        ctx.save();

        const t2 = Date.now() / 1000;
        const pulse = Math.sin(t2 * 3) * 0.2 + 0.8;
        const outerGlow = ctx.createRadialGradient(px, py, 0, px, py, puSize * 3);
        outerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * pulse})`);
        outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(px, py, puSize * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, puSize * 1.8 + Math.sin(t2 * 4) * 3, 0, Math.PI * 2);
        ctx.stroke();

        if (pu.type === 'wings') {
          ctx.fillStyle = '#E8E8FF';
          ctx.beginPath();
          ctx.ellipse(px, py, 14, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#AAAACC';
          ctx.beginPath();
          ctx.ellipse(px - 10, py - 4, 14, 5, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(px + 10, py - 4, 14, 5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8888BB';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('W', px, py + 1);
        } else if (pu.type === 'rocket') {
          ctx.fillStyle = '#E0E0E0';
          ctx.beginPath();
          ctx.ellipse(px, py - 4, 10, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FF4444';
          ctx.beginPath();
          ctx.ellipse(px, py - 2, 8, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4488FF';
          ctx.beginPath();
          ctx.arc(px, py - 8, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px - 2, py - 9, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 2, py - 9, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FF8800';
          ctx.beginPath();
          ctx.ellipse(px, py + 10, 5, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFCC00';
          ctx.beginPath();
          ctx.ellipse(px, py + 10, 3, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (pu.type === 'shield') {
          ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#00CCFF';
          ctx.beginPath();
          ctx.arc(px, py, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#CCEEFF';
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S', px, py);
        } else if (pu.type === 'x2') {
          ctx.fillStyle = `rgba(255, 215, 0, ${0.4 * pulse})`;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('x2', px, py + 1);
        } else if (pu.type === 'streak') {
          ctx.fillStyle = `rgba(255, 100, 255, ${0.4 * pulse})`;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FF64FF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FF64FF';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('∞', px, py + 1);
        }

        ctx.restore();
      }

      if (this.player) this.player.render(ctx, scrollY);

      if (this.enemy) this.enemy.render(ctx, this.world ? this.world.area : 1, this.player ? this.player.x : 0);

      if (this.particles) this.particles.render(ctx);

      if (this.state === 'MINIGAME') {
        this.miniGameManager.render(ctx, this._renderDt);
      }

      const vigGrad = ctx.createRadialGradient(this.width / 2, this.height / 2, this.height * 0.3, this.width / 2, this.height / 2, this.height * 0.75);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      this.ui.renderHUD(ctx);

      if (this.state === 'PLAYING' || this.state === 'PRACTICE') {
        this.ui.renderMobileControls(ctx);
      }

      if (this.state === 'PRACTICE') {
        this.ui.renderPracticeOverlay(ctx, this._practiceId, this._practiceShowHelp);
      }

      if (this.state === 'PAUSED') {
        this.ui.renderPauseOverlay(ctx);
      }

      if (this.state === 'GAMEOVER') {
        this.ui.renderGameOver(ctx);
      }
    }

    if (this._transitionAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._transitionAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.width, this.height);
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
