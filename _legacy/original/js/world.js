export const AREA_CONFIG = {
  1: {
    name: 'Sky Meadows',
    threshold: 10000,
    bg: ['#1a1a3e', '#2d1b69', '#4a2080', '#2d1b69', '#1a1a3e'],
    starColor: 'rgba(255,255,255,',
    platform: ['#6BCB77', '#4CAF50', '#388E3C'],
    breakable: ['#D4A574', '#C49A6C', '#B8895C', '#A0784C'],
    badgeColor: '#88CCFF',
    notifColor: 'rgba(100,200,255,',
    notifShadow: 'rgba(100,200,255,0.6)',
    enemy: { body: ['#FF6666', '#DD2222', '#AA0000', '#660000'], stroke: '#FF4444', mouth: '#FF4444', mouthBorder: '#CC0000', trail: 'rgba(255,0,0,', glow: 'rgba(255,0,0,0.18)' },
  },
  2: {
    name: 'Lava Caverns',
    threshold: 25000,
    bg: ['#1a0a00', '#3d1100', '#662200', '#3d1100', '#1a0a00'],
    starColor: 'rgba(255,150,50,',
    platform: ['#8B6914', '#6B4F10', '#4B350C'],
    breakable: ['#8B4513', '#7A3B10', '#6B300D', '#5A260A'],
    badgeColor: '#FF8844',
    notifColor: 'rgba(255,150,50,',
    notifShadow: 'rgba(255,100,0,0.6)',
    enemy: { body: ['#FF9933', '#DD4400', '#AA1100', '#550000'], stroke: '#FF6600', mouth: '#FF6622', mouthBorder: '#CC3300', trail: 'rgba(255,100,0,', glow: 'rgba(255,100,0,0.18)' },
  },
  3: {
    name: 'Crystal Depths',
    threshold: 45000,
    bg: ['#0a1628', '#0d2847', '#1a4a6b', '#0d2847', '#0a1628'],
    starColor: 'rgba(100,200,255,',
    platform: ['#4FC3F7', '#29B6F6', '#0288D1'],
    breakable: ['#80DEEA', '#4DD0E1', '#26C6DA', '#00ACC1'],
    badgeColor: '#4FC3F7',
    notifColor: 'rgba(100,200,255,',
    notifShadow: 'rgba(0,150,255,0.6)',
    enemy: { body: ['#4FC3F7', '#0288D1', '#01579B', '#002171'], stroke: '#00BFFF', mouth: '#00BFFF', mouthBorder: '#0099CC', trail: 'rgba(0,150,255,', glow: 'rgba(0,150,255,0.18)' },
  },
  4: {
    name: 'Mechanical Forge',
    threshold: 70000,
    bg: ['#14100a', '#2d1a10', '#4a2818', '#2d1a10', '#14100a'],
    starColor: 'rgba(255,180,50,',
    platform: ['#BDBDBD', '#9E9E9E', '#757575'],
    breakable: ['#A1887F', '#8D6E63', '#795548', '#5D4037'],
    badgeColor: '#FF8A65',
    notifColor: 'rgba(255,180,100,',
    notifShadow: 'rgba(255,150,80,0.6)',
    enemy: { body: ['#A1887F', '#8D6E63', '#6D4C41', '#4E342E'], stroke: '#8D6E63', mouth: '#A1887F', mouthBorder: '#6D4C41', trail: 'rgba(150,100,80,', glow: 'rgba(150,100,80,0.18)' },
  },
  5: {
    name: 'Void Nexus',
    threshold: Infinity,
    bg: ['#0d0d1a', '#1a0d2e', '#2d1a4a', '#1a0d2e', '#0d0d1a'],
    starColor: 'rgba(200,150,255,',
    platform: ['#CE93D8', '#BA68C8', '#8E24AA'],
    breakable: ['#E1BEE7', '#CE93D8', '#AB47BC', '#7B1FA2'],
    badgeColor: '#CE93D8',
    notifColor: 'rgba(200,150,255,',
    notifShadow: 'rgba(180,100,255,0.6)',
    enemy: { body: ['#CE93D8', '#9C27B0', '#6A1B9A', '#4A148C'], stroke: '#CE93D8', mouth: '#CE93D8', mouthBorder: '#9C27B0', trail: 'rgba(180,100,255,', glow: 'rgba(180,100,255,0.18)' },
  },
};

export class World {
  constructor(gameWidth, gameHeight) {
    this.width = gameWidth;
    this.height = gameHeight;
    this.scrollY = 0;
    this.difficulty = 0;
    this.totalDistance = 0;

    this.gravity = 150;
    this.baseFallSpeed = 29;
    this.fallSpeed = 29;
    this.maxFallSpeed = 112;
    this._baseFallSpeedBase = 29;
    this._maxFallSpeedBase = 112;
    this._rewardTier = 0;

    this.sections = [];
    this.breakableFloors = [];
    this.clouds = [];
    this.hazards = [];
    this.stars = [];
    this.powerUps = [];
    this.chests = [];
    this.platforms = [];

    this._sectionHeight = 600;
    this._generatedUpTo = 0;
    this._cleanupBehind = -600;
    this._rngSeed = Date.now();
    this.lessonMode = null;
    this.area = 1;
    this._areaThresholds = [10000, 25000, 45000, 70000];
    this._sideSpike = null;
    this._sideSpikeCooldown = 0;
    this._missedStar = false;
  }

  reset() {
    this.scrollY = 0;
    this.difficulty = 0;
    this.fallSpeed = this.baseFallSpeed;
    this.totalDistance = 0;
    this.sections = [];
    this.breakableFloors = [];
    this.clouds = [];
    this.hazards = [];
    this.stars = [];
    this.powerUps = [];
    this.chests = [];
    this.platforms = [];
    this._generatedUpTo = 0;
    this._rngSeed = Date.now();
    this.area = 1;
    this._sideSpike = null;
    this._sideSpikeCooldown = 0;
    this._missedStar = false;
  }

  init() {
    this._generateAhead();
  }

  updateDifficulty(deltaY) {
    this.totalDistance += Math.max(0, deltaY);
    this.difficulty = Math.min(10, Math.floor(this.totalDistance / 8000));
    const tierBonus = this._rewardTier * 2;
    this.fallSpeed = Math.min(
      this.maxFallSpeed + this._rewardTier * 4,
      this._baseFallSpeedBase + tierBonus + this.difficulty * 2
    );
    let newArea = 1;
    for (let i = 0; i < this._areaThresholds.length; i++) {
      if (this.totalDistance >= this._areaThresholds[i]) newArea = i + 2;
    }
    if (newArea !== this.area) {
      this.area = newArea;
      return true;
    }
    return false;
  }

  setRewardTier(tier) {
    this._rewardTier = tier;
  }


  getRewardDifficulty(rewardTier) {
    const tiers = [
      { name: 'Beginner', icon: '🌱', level: 1 },
      { name: 'Explorer', icon: '🔍', level: 2 },
      { name: 'Adventurer', icon: '🏔', level: 3 },
      { name: 'Hero', icon: '🎖', level: 4 },
      { name: 'Champion', icon: '🏆', level: 5 },
      { name: 'Legend', icon: '🎯', level: 6 },
      { name: 'Mythic', icon: '✨', level: 7 },
    ];
    return tiers[Math.min(rewardTier, tiers.length - 1)];
  }


  _generateAhead() {
    while (this._generatedUpTo < this._sectionHeight * 4) {
      this._generateSection(this._generatedUpTo);
      this._generatedUpTo += this._sectionHeight;
    }
  }

  _generateSection(sectionY) {
    const platforms = this._generatePlatformsInSection(sectionY);
    const hazards = this._generateHazardsInSection(sectionY);
    this._generateCloudsInSection(sectionY);
    this._generateStarsInSection(sectionY, platforms);
    this._generatePowerUpsInSection(sectionY, platforms);
    this._generateChestInSection(sectionY);
    this.sections.push({ y: sectionY });
  }

  _generatePlatformsInSection(sectionY) {
    const count = 4 + Math.floor(this.difficulty * 0.3) + Math.floor(Math.random() * 3);
    const sectionPlatforms = [];
    for (let i = 0; i < count; i++) {
      let x, y, w;
      let valid = false;
      let attempts = 30;
      while (attempts > 0 && !valid) {
        x = 20 + Math.random() * (this.width - 160);
        y = sectionY + 60 + Math.random() * (this._sectionHeight - 100);
        w = 60 + Math.random() * 80;
        valid = true;
        for (const existing of sectionPlatforms) {
          const hOverlap = Math.abs(existing.x + existing.w / 2 - x - w / 2) < (Math.max(existing.w, w) * 0.65);
          const vOverlap = Math.abs(existing.y - y) < 65;
          if (hOverlap && vOverlap) {
            valid = false;
            break;
          }
        }
        attempts--;
      }
      if (!valid) continue;
      const isBreakable = this.difficulty > 2 && Math.random() < 0.15;
      const isCloud = !isBreakable && Math.random() < 0.08;
      sectionPlatforms.push({
        x, y, w, h: 14,
        broken: false,
        breakTimer: 0,
        isBreakable,
        isCloud,
        cloudOpacity: isCloud ? 0.7 + Math.random() * 0.3 : 1,
        area: this.area,
      });
    }
    if (this.difficulty > 3 && Math.random() < 0.05 && !this.lessonMode) {
      for (let i = 0; i < 4; i++) {
        const cfY = sectionY + 80 + i * 120 + Math.random() * 30;
        sectionPlatforms.push({
          x: 10 + Math.random() * 20, y: cfY, w: this.width - 40 - Math.random() * 20, h: 14,
          broken: false, breakTimer: 0, isBreakable: false, isCloud: true,
          cloudOpacity: 0.6 + Math.random() * 0.2,
          breakSpeed: 5,
          area: this.area,
        });
      }
    }
    this.platforms.push(...sectionPlatforms);
    return sectionPlatforms;
  }

  _generateHazardsInSection(sectionY) {
    const count = Math.floor(Math.random() * 3) + Math.floor(this.difficulty * 0.2);
    const sectionHazards = [];
    for (let i = 0; i < count; i++) {
      const isStalactite = Math.random() < 0.3;
      const x = 10 + Math.random() * (this.width - 40);
      const y = sectionY + 40 + Math.random() * (this._sectionHeight - 60);
      const w = isStalactite ? 16 + Math.random() * 12 : 20 + Math.random() * 16;
      const h = isStalactite ? 30 + Math.random() * 30 : 14 + Math.random() * 8;
      sectionHazards.push({
        x, y, w, h,
        type: isStalactite ? 'stalactite' : (Math.random() < 0.4 ? 'trap' : 'spike'),
        warningPulse: 0,
      });
    }
    this.hazards.push(...sectionHazards);
    return sectionHazards;
  }

  _generatePowerUpsInSection(sectionY, platforms) {
    if (Math.random() > 0.12) return;
    if (platforms.length === 0) return;
    const plat = platforms[Math.floor(Math.random() * platforms.length)];
    const types = ['shield', 'wings', 'rocket', 'x2', 'streak'];
    this.powerUps.push({
      x: plat.x + plat.w / 2 - 12,
      y: plat.y - 30,
      size: 24,
      type: types[Math.floor(Math.random() * types.length)],
      collected: false,
      bobTimer: Math.random() * Math.PI * 2,
    });
  }

  _generateChestInSection(sectionY) {
    const chestChance = Math.min(0.12, 0.04 + this.totalDistance * 0.000002);
    if (Math.random() > chestChance) return;
    if (!this.chests) this.chests = [];
    this.chests.push({
      x: 60 + Math.random() * (this.width - 140),
      y: sectionY + 50,
      w: 30, h: 26,
      collected: false,
    });
  }

  _generateStarsInSection(sectionY, platforms) {
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const x = 10 + Math.random() * (this.width - 30);
      const y = sectionY + 20 + Math.random() * (this._sectionHeight - 40);
      this.stars.push({
        x, y, size: 10 + Math.random() * 6,
        collected: false,
        bobTimer: Math.random() * Math.PI * 2,
      });
    }
  }

  _generateCloudsInSection(sectionY) {
    const count = 2 + Math.floor(Math.random() * 3);
    const sectionClouds = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (this.width + 80) - 40;
      const y = sectionY + Math.random() * this._sectionHeight;
      const w = 60 + Math.random() * 100;
      const h = 20 + Math.random() * 20;
      sectionClouds.push({
        x, y, w, h,
        cloudOpacity: 0.5 + Math.random() * 0.5,
        speed: 2 + Math.random() * 4 * (Math.random() < 0.5 ? 1 : -1),
        cloudType: Math.floor(Math.random() * 3),
      });
    }
    this.clouds.push(...sectionClouds);
    return sectionClouds;
  }

  generateLessonLayout(type) {
    this.platforms = [];
    this.hazards = [];
    this.clouds = [];
    this.stars = [];
    this.powerUps = [];
    this.chests = [];

    if (type === 'fall') {
      for (let i = 0; i < 6; i++) {
        this.platforms.push({
          x: 60 + Math.random() * (this.width - 220), y: i * 500 + 200, w: 200 + Math.random() * 80, h: 14,
          broken: false, breakTimer: 0, isBreakable: false, isCloud: false, cloudOpacity: 1, area: this.area,
        });
      }
    } else if (type === 'jump') {
      for (let i = 0; i < 10; i++) {
        const side = i % 2;
        const gap = 80 + i * 12;
        this.platforms.push({
          x: side === 0 ? 40 : this.width - 160 - gap / 2, y: i * 400 + 200, w: 120 + gap / 2, h: 14,
          broken: false, breakTimer: 0, isBreakable: false, isCloud: false, cloudOpacity: 1, area: this.area,
        });
      }
    } else if (type === 'clouds') {
      for (let i = 0; i < 12; i++) {
        this.platforms.push({
          x: 0, y: i * 350 + 200, w: this.width, h: 14,
          broken: false, breakTimer: 0, isBreakable: false, isCloud: true, cloudOpacity: 0.6, area: this.area,
        });
      }
    } else if (type === 'enemy') {
      this.lessonCorridor = 300;
      for (let i = 0; i < 10; i++) {
        const cy = i * 350 + 200;
        const cx = (this.width - 200) / 2;
        this.platforms.push({
          x: cx, y: cy, w: 200, h: 14,
          broken: false, breakTimer: 0, isBreakable: false, isCloud: false, cloudOpacity: 1, area: this.area,
        });
        this.hazards.push({
          x: 0, y: cy + 40, w: cx, h: 14, type: 'spike', warningPulse: 0,
        });
        this.hazards.push({
          x: cx + 200, y: cy + 40, w: cx, h: 14, type: 'spike', warningPulse: 0,
        });
      }
    }
  }

  update(dt, playerY, playerVY) {
    const targetScroll = playerY - this.height * 0.35;
    this.scrollY += (targetScroll - this.scrollY) * Math.min(1, dt * 8);
    if (playerVY > 0) {
      this.updateDifficulty(playerVY * dt);
    }

    while (this._generatedUpTo < this.scrollY + this.height * 5) {
      this._generateSection(this._generatedUpTo);
      this._generatedUpTo += this._sectionHeight;
    }

    const cleanupY = this.scrollY + this._cleanupBehind;

    this._missedStar = false;
    const missThreshold = this.scrollY - 20;
    for (const star of this.stars) {
      if (!star.collected && !star._missed && star.y < missThreshold) {
        star._missed = true;
        this._missedStar = true;
      }
    }

    this.platforms = this.platforms.filter(p => p.y > cleanupY);
    this.hazards = this.hazards.filter(h => h.y > cleanupY);
    this.stars = this.stars.filter(s => s.y > cleanupY);
    this.powerUps = this.powerUps.filter(p => p.y > cleanupY);
    this.clouds = this.clouds.filter(c => c.y > cleanupY);
    if (this.chests) this.chests = this.chests.filter(c => c.y > cleanupY);
    this.sections = this.sections.filter(s => s.y > cleanupY);

    for (const c of this.clouds) {
      c.x += (c.speed || 0) * dt;
    }

    if (this.lessonMode) {
      this._sideSpike = null;
      this._sideSpikeCooldown = 999;
    } else {
      this._sideSpikeCooldown -= dt;
      if (this._sideSpike) {
        const s = this._sideSpike;
        s.timer -= dt;
        if (s.phase === 'warning' && s.timer <= 0) {
          s.phase = 'extending';
          s.timer = 0.4;
        } else if (s.phase === 'extending') {
          s.extendAmount = Math.min(1, s.extendAmount + dt * 3);
          if (s.timer <= 0) {
            s.phase = 'active';
            s.timer = 0.8 + Math.random() * 0.5;
          }
        } else if (s.phase === 'active' && s.timer <= 0) {
          s.phase = 'retracting';
          s.timer = 0.4;
        } else if (s.phase === 'retracting') {
          s.extendAmount = Math.max(0, s.extendAmount - dt * 3);
          if (s.timer <= 0 || s.extendAmount <= 0) {
            this._sideSpike = null;
            this._sideSpikeCooldown = Math.max(4, 12 - this.difficulty);
          }
        }
      } else if (this.difficulty > 0 && this._sideSpikeCooldown <= 0) {
        const chance = Math.min(0.008, 0.001 + this.difficulty * 0.0008);
        if (Math.random() < chance) {
          const side = Math.random() < 0.5 ? 'left' : 'right';
          this._sideSpike = {
            side,
            phase: 'warning',
            timer: Math.max(0.8, 2.5 - this.difficulty * 0.15),
            extendAmount: 0,
          };
        }
      }
    }
  }

  getScreenY(worldY) {
    return worldY - this.scrollY;
  }

  getVisibleStars() {
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.stars.filter(s => !s.collected && s.y > top && s.y < bottom);
  }

  getVisibleHazards() {
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.hazards.filter(h => h.y > top && h.y < bottom);
  }

  getVisiblePlatforms() {
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.platforms.filter(p => p.y > top && p.y < bottom);
  }

  getAllPlatforms() {
    return this.platforms;
  }

getVisibleChests() {
    if (!this.chests) return [];
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.chests.filter(c => !c.collected && c.y > top && c.y < bottom);
  }

  getSideSpike() {
    return this._sideSpike;
  }

  getSideSpikeScreenX(side, width) {
    const spikeWidth = width / 8;
    return side === 'left' ? 0 : width - spikeWidth;
  }

  getSideSpikeExtendWidth(width) {
    return width / 8;
  }


  getPlatformAbove(y) {
    let best = null;
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (p.y < y && (!best || p.y > best.y)) {
        best = p;
      }
    }
    return best;
  }

  getVisibleClouds() {
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.clouds.filter(c => {
      return c.y > top && c.y < bottom && c.cloudOpacity > 0.01;
    });
  }

  getHazardsWithWarning() {
    const top = this.scrollY - 60;
    const bottom = this.scrollY + this.height + 300;
    return this.hazards.filter(h => h.y > top && h.y < bottom);
  }

  getVisiblePowerUps() {
    const top = this.scrollY - 50;
    const bottom = this.scrollY + this.height + 50;
    return this.powerUps.filter(p => p.y > top && p.y < bottom && !p.collected);
  }
}
