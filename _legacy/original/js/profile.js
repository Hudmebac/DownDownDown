export const CUSTOM_CHAR_INDEX = 8;
export const DEFAULT_CUSTOM_CHAR = {
  name: 'My Hero',
  color: '#FF6B6B',
  hatColor: '#4ECDC4',
  shirtColor: '#45B7D1',
  theme: '✨',
  tag: 'Your creation!',
  skin: '#FFDDBB',
  hair: { style: 'spiky', color: '#FF4444', secondary: '#FF8844' },
  eyes: { shape: 'round', color: '#2C3E50' },
  outfit: { top: 't-shirt', bottoms: 'shorts', shoes: 'sneakers' },
  accessory: { type: 'backpack', color: '#4ECDC4', size: 1 },
  stats: { speed: 280, jump: 55, bonusPoints: 1, trailColor: '#FFD700' },
};

export class PlayerProfile {
  constructor() {
    this.name = '';
    this.selectedCharacter = 0;
    this.bestTier = 0;
    this.totalStars = 0;
    this.bestStreak = 0;
    this.maxDistance = 0;
    this._nameBuffer = '';
    this._load();
  }

  hasName() {
    return this.name.length > 0;
  }

  confirmName(nameBuffer) {
    const n = (nameBuffer || '').trim();
    if (n.length > 0) {
      this.name = n;
      this.save();
      return true;
    }
    return false;
  }

  setCharacter(index) {
    this.selectedCharacter = index;
    this.save();
  }

  updateStats(rewards, distance) {
    let updated = false;
    if (rewards) {
      if (rewards.currentTier > this.bestTier) {
        this.bestTier = rewards.currentTier;
        updated = true;
      }
      if (rewards.totalStars > this.totalStars) {
        this.totalStars = rewards.totalStars;
        updated = true;
      }
      const rs = rewards.bestStreak || 0;
      if (rs > this.bestStreak) {
        this.bestStreak = rs;
        updated = true;
      }
    }
    if (distance > this.maxDistance) {
      this.maxDistance = Math.floor(distance);
      updated = true;
    }
    if (updated) this.save();
  }

  save() {
    try {
      localStorage.setItem('ddd_profile', JSON.stringify({
        name: this.name,
        selectedCharacter: this.selectedCharacter,
        bestTier: this.bestTier,
        totalStars: this.totalStars,
        bestStreak: this.bestStreak,
        maxDistance: this.maxDistance,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('ddd_profile');
      if (!raw) return;
      const data = JSON.parse(raw);
      this.name = data.name || '';
      this.selectedCharacter = data.selectedCharacter || 0;
      this.bestTier = data.bestTier || 0;
      this.totalStars = data.totalStars || 0;
      this.bestStreak = data.bestStreak || 0;
      this.maxDistance = data.maxDistance || 0;
    } catch (e) {}
  }
}

export function getCharacterData(index) {
  if (index === CUSTOM_CHAR_INDEX) {
    return loadCustomCharData();
  }
  return CHARACTERS[index % CHARACTERS.length] || CHARACTERS[0];
}

export function loadCustomCharData() {
  try {
    const raw = localStorage.getItem('ddd_custom_char');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_CUSTOM_CHAR;
}

export function saveCustomCharData(data) {
  try {
    localStorage.setItem('ddd_custom_char', JSON.stringify(data));
  } catch (e) {}
}

export function hasCustomChar() {
  try {
    return !!localStorage.getItem('ddd_custom_char');
  } catch (e) { return false; }
}

export const CHARACTERS = [
  { name: 'Ruby',    color: '#FF6B6B', hatColor: '#4ECDC4', shirtColor: '#45B7D1', theme: '🍓', tag: 'Bouncy as a berry!', skin: '#FFDDBB',
    hair: { style: 'spiky', color: '#FF4444', secondary: '#FF8844' },
    eyes: { shape: 'round', color: '#2C3E50' },
    outfit: { top: 't-shirt', bottoms: 'shorts', shoes: 'sneakers' },
    accessory: { type: 'backpack', color: '#4ECDC4', size: 1 },
    stats: { speed: 300, jump: 58, bonusPoints: 1.5, trailColor: '#FF6B6B' } },
  { name: 'Sunny',   color: '#FFD93D', hatColor: '#6BCB77', shirtColor: '#4D96FF', theme: '☀️', tag: 'Bright as a sunny day!', skin: '#FFE4B5',
    hair: { style: 'flowing', color: '#FFAA33', secondary: '#FFD700' },
    eyes: { shape: 'happy', color: '#2C3E50' },
    outfit: { top: 'tank-top', bottoms: 'skirt', shoes: 'sandals' },
    accessory: { type: 'scarf', color: '#6BCB77', size: 1 },
    stats: { speed: 280, jump: 52, bonusPoints: 1, trailColor: '#FFD93D' } },
  { name: 'Violet',  color: '#C084FC', hatColor: '#F472B6', shirtColor: '#34D399', theme: '🌸', tag: 'Sweet as a spring bloom!', skin: '#F5D0C5',
    hair: { style: 'twintails', color: '#9B59B6', secondary: '#C084FC' },
    eyes: { shape: 'almond', color: '#4A235A' },
    outfit: { top: 't-shirt', bottoms: 'skirt', shoes: 'boots' },
    accessory: { type: 'headband', color: '#F472B6', size: 1 },
    stats: { speed: 260, jump: 56, bonusPoints: 2, trailColor: '#C084FC' } },
  { name: 'Blaze',   color: '#FB923C', hatColor: '#A78BFA', shirtColor: '#2DD4BF', theme: '🔥', tag: 'Fierce like a little dragon!', skin: '#FDDCB5',
    hair: { style: 'messy', color: '#E67E22', secondary: '#FF4444' },
    eyes: { shape: 'wide', color: '#2C3E50' },
    outfit: { top: 'jacket', bottoms: 'pants', shoes: 'boots' },
    accessory: { type: 'goggles', color: '#A78BFA', size: 1 },
    stats: { speed: 340, jump: 48, bonusPoints: 1, trailColor: '#FB923C' } },
  { name: 'Bubbles', color: '#4DD0E1', hatColor: '#FF8A65', shirtColor: '#81C784', theme: '🌊', tag: 'Splashy as a ocean wave!', skin: '#FFF0E0',
    hair: { style: 'wavy', color: '#00BCD4', secondary: '#4DD0E1' },
    eyes: { shape: 'round', color: '#006064' },
    outfit: { top: 'tank-top', bottoms: 'shorts', shoes: 'flip-flops' },
    accessory: { type: 'shell_necklace', color: '#FFD54F', size: 1 },
    stats: { speed: 270, jump: 62, bonusPoints: 1, trailColor: '#4DD0E1' } },
  { name: 'Sprout',  color: '#81C784', hatColor: '#FFD54F', shirtColor: '#A5D6A7', theme: '🌿', tag: 'Growing like a young tree!', skin: '#F5ECD5',
    hair: { style: 'curly', color: '#6D4C41', secondary: '#8D6E63' },
    eyes: { shape: 'sleepy', color: '#3E2723' },
    outfit: { top: 'overalls', bottoms: 'shorts', shoes: 'barefoot' },
    accessory: { type: 'flower_crown', color: '#FFD54F', size: 1 },
    stats: { speed: 250, jump: 50, bonusPoints: 1.5, trailColor: '#81C784' } },
  { name: 'Sparkle', color: '#F48FB1', hatColor: '#CE93D8', shirtColor: '#80DEEA', theme: '✨', tag: 'Twinkly as a night sky!', skin: '#FCE4EC',
    hair: { style: 'ponytail', color: '#E91E63', secondary: '#F48FB1' },
    eyes: { shape: 'almond', color: '#4A148C' },
    outfit: { top: 't-shirt', bottoms: 'skirt', shoes: 'ballet' },
    accessory: { type: 'tiara', color: '#FFD700', size: 1 },
    stats: { speed: 290, jump: 54, bonusPoints: 1, trailColor: '#F48FB1' } },
  { name: 'Frost',   color: '#80DEEA', hatColor: '#E0E0E0', shirtColor: '#B3E5FC', theme: '❄️', tag: 'Chilly as a snowflake!', skin: '#E8F5E9',
    hair: { style: 'sleek', color: '#B0BEC5', secondary: '#ECEFF1' },
    eyes: { shape: 'sleepy', color: '#37474F' },
    outfit: { top: 'sweater', bottoms: 'pants', shoes: 'boots' },
    accessory: { type: 'earmuffs', color: '#E0E0E0', size: 1 },
    stats: { speed: 260, jump: 60, bonusPoints: 1, trailColor: '#80DEEA' } },
];
