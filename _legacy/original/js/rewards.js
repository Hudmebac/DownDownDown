export const REWARD_TIERS = [
  { name: 'Mini Star', icon: '⭐', req: 25, lore: 'Soft clouds and gentle platforms welcome your first fall.', color: '#FFD700' },
  { name: 'Big Star', icon: '🌟', req: 50, lore: 'Here come the traps! Watch for spikes and tricky gaps.', color: '#FF8C00' },
  { name: 'Rainbow Star', icon: '🌠', req: 75, lore: 'Winds pick up as colourful hazards paint the sky.', color: '#FF69B4' },
  { name: 'Rainbow', icon: '🌈', req: 100, lore: 'Breakable floors crumble beneath you. Keep moving!', color: '#FF4444' },
  { name: 'Pot of Gold', icon: '🏆', req: 100, lore: 'Dark clouds roll in, hiding dangers within.', color: '#DAA520' },
  { name: 'Leprechaun', icon: '🍀', req: 100, lore: 'Stalactites and narrow ledges test your nerve.', color: '#228B22' },
  { name: 'Golden Leprechaun', icon: '🪙', req: 100, lore: 'Lava glows below as the cavern tightens around you.', color: '#B8860B' },
  { name: 'Leprechaun King', icon: '👑', req: 100, lore: 'The enemy sniffs you out more eagerly now.', color: '#8B008B' },
  { name: 'Crown of Clovers', icon: '🍃', req: 100, lore: 'Double the traps, double the trouble.', color: '#006400' },
  { name: 'Emerald Spirit', icon: '💚', req: 100, lore: 'The shadows deepen but a green light guides you.', color: '#50C878' },
  { name: 'Aurora Guardian', icon: '🌌', req: 100, lore: 'Sideways gusts push you off course.', color: '#00CED1' },
  { name: 'Cosmic Sprite', icon: '✨', req: 100, lore: 'Clouds vanish beneath your feet. Trust your timing.', color: '#9370DB' },
  { name: 'Starborn Entity', icon: '💫', req: 100, lore: 'Everything you have faced returns, faster and fiercer.', color: '#DA70D6' },
  { name: 'Celestial Titan', icon: '🌍', req: 100, lore: 'Master every move. The depths have no mercy.', color: '#4169E1' },
  { name: 'Eternal Light', icon: '☀️', req: 100, lore: 'Beyond all challenge lies pure, joyful flight.', color: '#FF6347' },
];

export class RewardSystem {
  constructor() {
    this.currentTier = 0;
    this.progress = 0;
    this.streak = 0;
    this.notifications = [];
    this.totalStars = 0;
    this.bestStreak = 0;
    this.unlockedTiers = [true];
  }

  getTier() {
    return REWARD_TIERS[this.currentTier];
  }

  collectStar(multiplier = 1) {
    const prevStreak = this.streak;
    this.streak += multiplier;
    this.progress += multiplier;
    this.totalStars += multiplier;
    let leveledUp = false;
    let miniGameReady = false;
    let milestone = 0;

    const milestones = [3, 5, 7, 9];
    for (const m of milestones) {
      if (prevStreak < m && this.streak >= m) {
        milestone = m;
        break;
      }
    }

    if (this.streak >= 10) {
      this.streak = 0;
      miniGameReady = true;
    }

    const req = REWARD_TIERS[this.currentTier].req;
    while (this.progress >= req && this.currentTier < REWARD_TIERS.length - 1) {
      this.progress -= req;
      this.currentTier++;
      this.unlockedTiers[this.currentTier] = true;
      leveledUp = true;
      this.notifications.push({
        message: `${REWARD_TIERS[this.currentTier].icon} ${REWARD_TIERS[this.currentTier].name} Unlocked!`,
        timer: 3,
      });
    }

    return { leveledUp, miniGameReady, milestone };
  }

  openChest() {
    const bonus = 5 + Math.floor(Math.random() * 6);
    this.progress += bonus;
    this.totalStars += bonus;
    this.notifications.push({ message: `🎁 Chest! +${bonus} Stars!`, timer: 2.5 });
    const req = REWARD_TIERS[this.currentTier].req;
    while (this.progress >= req && this.currentTier < REWARD_TIERS.length - 1) {
      this.progress -= req;
      this.currentTier++;
      this.unlockedTiers[this.currentTier] = true;
      this.notifications.push({
        message: `${REWARD_TIERS[this.currentTier].icon} ${REWARD_TIERS[this.currentTier].name} Unlocked!`,
        timer: 3,
      });
    }
  }

  resetStreak() {
    this.streak = 0;
  }

  miniGameSuccess(game) {
    if (game.lives < game.maxLives) {
      game.lives++;
      this.notifications.push({ message: '❤️ Extra Life!', timer: 2 });
    } else {
      this.progress += 10;
      this.notifications.push({ message: '⭐ +10 Progress!', timer: 2 });
      const req = REWARD_TIERS[this.currentTier].req;
      while (this.progress >= req && this.currentTier < REWARD_TIERS.length - 1) {
        this.progress -= req;
        this.currentTier++;
        this.unlockedTiers[this.currentTier] = true;
        this.notifications.push({
          message: `${REWARD_TIERS[this.currentTier].icon} ${REWARD_TIERS[this.currentTier].name} Unlocked!`,
          timer: 3,
        });
      }
    }
  }

  update(dt) {
    this.notifications = this.notifications.filter(n => {
      n.timer -= dt;
      return n.timer > 0;
    });
  }
}
