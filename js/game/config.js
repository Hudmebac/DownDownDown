export const VIEW = { w: 960, h: 600 };
export const CHUNK_H = 720;
export const SAVE_KEY = 'ddd.save.v2';
export const PX_PER_METER = 32;
export const WALL = 18;

export const PHYS = {
  gravity: 1700,
  maxFall: 480,
  speed: 330,
  accelGround: 3000,
  accelAir: 1800,
  frictionGround: 2600,
  frictionAir: 480,
  jump: 480,
  jumpCut: 0.42,
  riseGravity: 0.62,
  airJumps: 1,
  coyote: 0.1,
  buffer: 0.13,
  dashSpeed: 660,
  dashTime: 0.15,
  dashCooldown: 0.85,
  glideFall: 130,
  wingFall: 230,
  wingDrag: 2600,
  fallBoost: 100,
  fallBoostRate: 32,
  w: 30,
  h: 38,
  hitInset: 4,
};

export const SCORE = {
  gem: 15,
  perfect: 40,
  nearMiss: 25,
  powerup: 60,
  comboStep: 5,
  comboMax: 9,
  comboWindow: 2.6,
};

// Shard income. Every run pays for depth, gems, score and clean landings.
export const ECONOMY = {
  depthDiv: 7,
  gemDiv: 6,
  scoreDiv: 150,
  perfectEach: 3,
  biomeEach: 8,
  missionsPerCache: 3,
  bonusBase: 150,
  bonusStep: 100,
};

// One full pass through all eight biomes. Finish it and the next descent
// begins: same world, new layouts, faster storm and hazards, depth keeps going.
export const CYCLE = {
  depth: 3800,
  speedStep: 0.12,
  hazardStep: 0.1,
  maxStorm: 430,
  maxHazard: 1.8,
};

export const STORM = {
  startAhead: 900,
  baseSpeed: 100,
  speedPerMeter: 0.14,
  maxSpeed: 300,
  damageInterval: 1.3,
  warnRange: 260,
};

export const TOUCH = {
  // movement is split: holding anywhere on the left half steers left, the right half steers right
  split: 0.5,
  dash: { x: 648, y: 456, w: 102, h: 102 },
  jump: { x: 776, y: 424, w: 140, h: 140 },
};

export const BIOMES = [
  {
    id: 'skywell',
    name: 'The Skywell',
    tagline: 'Morning air and broken ledges',
    at: 0,
    skyTop: '#081428',
    skyMid: '#12314f',
    skyBot: '#2e6f8f',
    glow: '#6ee7ff',
    accent: '#6ee7ff',
    accent2: '#ffd166',
    ridges: ['#0c2137', '#09182a', '#06101d'],
    platformTop: '#8ceaff',
    platformBody: '#2a6285',
    gem: '#ffe066',
    haze: '#12405c',
    hazard: '#ff6b6b',
  },
  {
    id: 'ember',
    name: 'Ashen Forge',
    tagline: 'The air turns to cinders',
    at: 200,
    skyTop: '#170806',
    skyMid: '#3d150b',
    skyBot: '#7d2c11',
    glow: '#ff8a3d',
    accent: '#ff8a3d',
    accent2: '#ffd166',
    ridges: ['#2c1109', '#1f0b05', '#140704'],
    platformTop: '#ffb26b',
    platformBody: '#6b2a12',
    gem: '#ffcf7a',
    haze: '#54200c',
    hazard: '#ff4444',
  },
  {
    id: 'reef',
    name: 'Glass Reef',
    tagline: 'Light bends in the deep',
    at: 550,
    skyTop: '#03161a',
    skyMid: '#093c3f',
    skyBot: '#0f6d75',
    glow: '#4fe3c1',
    accent: '#4fe3c1',
    accent2: '#ffd166',
    ridges: ['#062a2d', '#041e21', '#031518'],
    platformTop: '#a8fff0',
    platformBody: '#1a6b6f',
    gem: '#9dfff0',
    haze: '#0d4a50',
    hazard: '#ff7ab8',
  },
  {
    id: 'frost',
    name: 'Frostfall',
    tagline: 'Cold enough to crack stone',
    at: 1000,
    skyTop: '#070f22',
    skyMid: '#1a2a52',
    skyBot: '#46609f',
    glow: '#a5c8ff',
    accent: '#a5c8ff',
    accent2: '#e0f2ff',
    ridges: ['#101d3a', '#0c162b', '#080f1e'],
    platformTop: '#dcecff',
    platformBody: '#33518f',
    gem: '#bfe0ff',
    haze: '#1e3563',
    hazard: '#8fb8ff',
  },
  {
    id: 'garden',
    name: 'Hollow Garden',
    tagline: 'Something is growing down here',
    at: 1550,
    skyTop: '#0b0513',
    skyMid: '#26103a',
    skyBot: '#562072',
    glow: '#c77dff',
    accent: '#c77dff',
    accent2: '#8ae68a',
    ridges: ['#1d0b2b', '#150820', '#0d0516'],
    platformTop: '#efc2ff',
    platformBody: '#4d2270',
    gem: '#f0a6ff',
    haze: '#33104a',
    hazard: '#8ae68a',
  },
  {
    id: 'lastlight',
    name: 'Last Light',
    tagline: 'The last warm light',
    at: 2200,
    skyTop: '#170407',
    skyMid: '#440e15',
    skyBot: '#9c2f28',
    glow: '#ffd166',
    accent: '#ffd166',
    accent2: '#ff7a6b',
    ridges: ['#2a090d', '#1e0609', '#130406'],
    platformTop: '#ffe6a3',
    platformBody: '#8a2a24',
    gem: '#ffe6a3',
    haze: '#5c1614',
    hazard: '#ff5c5c',
  },
  {
    id: 'abyss',
    name: 'The Quiet Below',
    tagline: 'No light has ever reached here',
    at: 2900,
    skyTop: '#03040c',
    skyMid: '#0a0f24',
    skyBot: '#161d3f',
    glow: '#7b8cff',
    accent: '#8fa2ff',
    accent2: '#5eead4',
    ridges: ['#070a18', '#05070f', '#030409'],
    platformTop: '#b9c6ff',
    platformBody: '#1f2a5c',
    gem: '#9fb0ff',
    haze: '#0c1230',
    hazard: '#ff6b9d',
  },
  {
    id: 'core',
    name: "World's Core",
    tagline: 'The bottom of everything',
    at: 3700,
    skyTop: '#120302',
    skyMid: '#3d0c04',
    skyBot: '#8a2b08',
    glow: '#ffb347',
    accent: '#ffb347',
    accent2: '#fff1c9',
    ridges: ['#200604', '#150302', '#0c0201'],
    platformTop: '#ffd9a0',
    platformBody: '#7a2a0c',
    gem: '#ffe3ae',
    haze: '#4a1204',
    hazard: '#ff4d4d',
  },
];

export function biomeIndexAt(depth) {
  let idx = 0;
  for (let i = 0; i < BIOMES.length; i++) if (depth >= BIOMES[i].at) idx = i;
  return idx;
}

export const CHARACTERS = [
  {
    id: 'pip', name: 'Pip', hat: 'tuft', tag: 'BALANCED',
    desc: 'Friendly and sure-footed.',
    color: '#ff7a6b', accent: '#ffd166', trail: '#ffd166',
    stats: { speed: 330, jump: 480, gravity: 1700, air: 1 },
  },
  {
    id: 'bolt', name: 'Bolt', hat: 'spike', tag: 'FAST & FLOATY',
    desc: 'Fast, floaty, all-in.',
    color: '#4cc9f0', accent: '#f72585', trail: '#4cc9f0',
    stats: { speed: 382, jump: 490, gravity: 1780, air: 1 },
  },
  {
    id: 'nix', name: 'Nix', hat: 'horns', tag: 'DOUBLE JUMP',
    desc: 'Heavy jumper, extra hop.',
    color: '#9b5de5', accent: '#f15bb5', trail: '#c77dff',
    stats: { speed: 306, jump: 540, gravity: 1580, air: 2 },
  },
  {
    id: 'wisp', name: 'Wisp', hat: 'antenna', tag: 'GLIDE',
    desc: 'Glides on a held jump.',
    color: '#8ae68a', accent: '#fdffd2', trail: '#8ae68a',
    stats: { speed: 322, jump: 500, gravity: 1480, air: 1, glide: true },
  },
  {
    id: 'nova', name: 'Nova', hat: 'crown', tag: 'ALL-ROUNDER',
    desc: 'No real weaknesses.',
    color: '#ffd166', accent: '#ff7a6b', trail: '#ffd166',
    stats: { speed: 350, jump: 520, gravity: 1660, air: 2 },
  },
  {
    id: 'umbra', name: 'Umbra', hat: 'hood', tag: 'FAST FALLER',
    desc: 'Quick, heavy, elusive.',
    color: '#2f3350', accent: '#ef476f', trail: '#ef476f',
    stats: { speed: 372, jump: 536, gravity: 1620, air: 2 },
  },

  // Heroes and villains cost more than the original crew, and each rung of
  // the ladder is pricier than the last.
  {
    id: 'mario', name: 'Mario', group: 'heroes', look: 'plumber', initial: 'M',
    tag: 'ALL-ROUNDER', desc: 'Jumps first, asks later.',
    color: '#e23b2e', accent: '#e23b2e', suit: '#2f5fd0', trail: '#e23b2e',
    stats: { speed: 340, jump: 512, gravity: 1680, air: 1 },
  },
  {
    id: 'luigi', name: 'Luigi', group: 'heroes', look: 'plumber', initial: 'L',
    tag: 'FLOATY',    desc: 'Tall, cautious, floaty.',
    color: '#4fbf4a', accent: '#4fbf4a', suit: '#2f5fd0', trail: '#4fbf4a',
    stats: { speed: 362, jump: 540, gravity: 1600, air: 1 },
  },
  {
    id: 'peach', name: 'Peach', group: 'heroes', look: 'peach',
    tag: 'GLIDE', desc: 'Drifts down on a held jump.',
    color: '#ff8fc7', accent: '#ffe08a', trail: '#ff9ecd',
    stats: { speed: 320, jump: 520, gravity: 1560, air: 2, glide: true },
  },
  {
    id: 'yoshi', name: 'Yoshi', group: 'heroes', look: 'dino',
    tag: 'FLUTTER JUMP', desc: 'A second hop in mid-air.',
    color: '#5cc84a', accent: '#5cc84a', trail: '#5cc84a',
    stats: { speed: 352, jump: 512, gravity: 1620, air: 2 },
  },
  {
    id: 'toadette', name: 'Toadette', group: 'heroes', look: 'toad',
    tag: 'SPRY', desc: 'Tiny, quick, hard to hit.',
    color: '#ff87b5', accent: '#ffd166', suit: '#fdf3f7', trail: '#ff87b5',
    stats: { speed: 372, jump: 488, gravity: 1700, air: 1 },
  },
  {
    id: 'yellowtoad', name: 'Yellow Toad', group: 'heroes', look: 'toad',
    tag: 'STEADY', desc: 'Plods on no matter what.',
    color: '#ffd94a', accent: '#ffffff', suit: '#3b6fd4', trail: '#ffd94a',
    stats: { speed: 344, jump: 496, gravity: 1660, air: 2 },
  },
  {
    id: 'wario', name: 'Wario', group: 'heroes', look: 'plumber', initial: 'W',
    tag: 'HEAVY HITTER',    desc: 'Slow start, huge jump.',
    color: '#f4c542', accent: '#f4c542', suit: '#7b4bd8', trail: '#f4c542',
    stats: { speed: 296, jump: 552, gravity: 1580, air: 2 },
  },

  {
    id: 'goomba', name: 'Goomba', group: 'enemies', look: 'goomba',
    tag: 'STUBBORN', desc: 'Angry, and always walking.',
    color: '#a4642f', accent: '#7a4620', trail: '#c98a4b',
    stats: { speed: 300, jump: 474, gravity: 1740, air: 1 },
  },
  {
    id: 'piranha', name: 'Piranha Plant', group: 'enemies', look: 'plant',
    tag: 'SNAP', desc: 'All teeth, no patience.',
    color: '#e63946', accent: '#ffffff', trail: '#e63946',
    stats: { speed: 318, jump: 492, gravity: 1660, air: 1 },
  },
  {
    id: 'drybones', name: 'Dry Bones', group: 'enemies', look: 'bones',
    tag: 'RATTLES',    desc: 'Falls apart, keeps going.',
    color: '#efe8d6', accent: '#8fe08a', trail: '#cfead0',
    stats: { speed: 352, jump: 486, gravity: 1650, air: 2 },
  },
  {
    id: 'thwomp', name: 'Thwomp', group: 'enemies', look: 'rock',
    tag: 'DEAD WEIGHT',    desc: 'Drops like a cross anvil.',
    color: '#8f98aa', accent: '#5d677a', trail: '#8f98aa',
    stats: { speed: 288, jump: 566, gravity: 1840, air: 1 },
  },
  {
    id: 'diddy', name: 'Diddy Kong', group: 'enemies', look: 'ape',
    tag: 'SPEEDY',    desc: 'Small, fast, full of beans.',
    color: '#8a5a2b', accent: '#e23b2e', trail: '#e23b2e',
    stats: { speed: 392, jump: 516, gravity: 1710, air: 2 },
  },
  {
    id: 'donkey', name: 'Donkey Kong', group: 'enemies', look: 'ape',
    tag: 'POWERHOUSE', desc: 'A whole barrel of momentum.',
    color: '#7a4a24', accent: '#e23b2e', trail: '#c98a4b',
    stats: { speed: 306, jump: 558, gravity: 1780, air: 2 },
  },  {
    id: 'bowser', name: 'Bowser', group: 'enemies', look: 'turtle',
    tag: 'FINAL BOSS', desc: 'The descent has a king.',
    color: '#3f8f3a', accent: '#f0a33c', trail: '#f0a33c',
    stats: { speed: 300, jump: 548, gravity: 1760, air: 2 },
  },

  // Themed collections pulled from the deeper biomes. They sit above the
  // heroes and villains on the price ladder.
  {
    id: 'angler', name: 'Angler', group: 'reef', look: 'fish',
    tag: 'LURE', desc: 'Glows in the deep dark.',
    color: '#3f6fa8', accent: '#8ef0d0', trail: '#8ef0d0',
    stats: { speed: 324, jump: 496, gravity: 1620, air: 2 },
  },
  {
    id: 'jelly', name: 'Jelly', group: 'reef', look: 'jelly',
    tag: 'DRIFTER', desc: 'Floats wherever it likes.',
    color: '#c77dff', accent: '#ffb3f0', trail: '#e0b3ff',
    stats: { speed: 316, jump: 502, gravity: 1500, air: 1, glide: true },
  },
  {
    id: 'crab', name: 'Crab', group: 'reef', look: 'crab',
    tag: 'SIDEWAYS', desc: 'Pinches, then walks off.',
    color: '#e2452f', accent: '#ffd166', trail: '#ff7a5c',
    stats: { speed: 336, jump: 486, gravity: 1740, air: 1 },
  },
  {
    id: 'squid', name: 'Squid', group: 'reef', look: 'squid',
    tag: 'INKY', desc: 'Leaves a cloud behind.',
    color: '#7b4bd8', accent: '#b9a3ff', trail: '#b9a3ff',
    stats: { speed: 348, jump: 500, gravity: 1660, air: 2 },
  },
  {
    id: 'seahorse', name: 'Seahorse', group: 'reef', look: 'seahorse',
    tag: 'TINY', desc: 'Small, upright, unhurried.',
    color: '#ffb347', accent: '#6ee7ff', trail: '#ffb347',
    stats: { speed: 306, jump: 530, gravity: 1580, air: 2 },
  },
  {
    id: 'coral', name: 'Coral', group: 'reef', look: 'coral',
    tag: 'BLOOMS', desc: 'Slow but hard to break.',
    color: '#ff7a9c', accent: '#ffd166', trail: '#ff7a9c',
    stats: { speed: 292, jump: 560, gravity: 1800, air: 2 },
  },

  {
    id: 'pulsar', name: 'Pulsar', group: 'void', look: 'star',
    tag: 'BLINKS', desc: 'Beats like a second heart.',
    color: '#8fa2ff', accent: '#e0e6ff', trail: '#8fa2ff',
    stats: { speed: 360, jump: 520, gravity: 1680, air: 2 },
  },
  {
    id: 'watcher', name: 'Watcher', group: 'void', look: 'eye',
    tag: 'STARES', desc: 'It has seen you already.',
    color: '#5eead4', accent: '#8fa2ff', trail: '#5eead4',
    stats: { speed: 300, jump: 506, gravity: 1640, air: 2 },
  },
  {
    id: 'wraith', name: 'Wraith', group: 'void', look: 'wraith',
    tag: 'DRIFTS', desc: 'Quiet, cold, and patient.',
    color: '#3a3f5c', accent: '#8fa2ff', trail: '#8fa2ff',
    stats: { speed: 342, jump: 514, gravity: 1580, air: 2 },
  },
  {
    id: 'moonling', name: 'Moonling', group: 'void', look: 'moon',
    tag: 'CRESCENT', desc: 'Half here, half elsewhere.',
    color: '#f0ead6', accent: '#8fa2ff', trail: '#f0ead6',
    stats: { speed: 330, jump: 524, gravity: 1540, air: 2, glide: true },
  },
  {
    id: 'meteor', name: 'Meteor', group: 'void', look: 'meteor',
    tag: 'BURNS', desc: 'Arrives already on fire.',
    color: '#8a4a2a', accent: '#ffb347', trail: '#ffb347',
    stats: { speed: 290, jump: 566, gravity: 1860, air: 1 },
  },
  {
    id: 'rift', name: 'Rift', group: 'void', look: 'glitch',
    tag: 'GLITCHES', desc: 'Flickers out of alignment.',
    color: '#2f3350', accent: '#5eead4', trail: '#5eead4',
    stats: { speed: 392, jump: 508, gravity: 1720, air: 2 },
  },

  // Halloween set. Top of the price ladder.
  {
    id: 'pumpkin', name: 'Pumpkin', group: 'spooky', look: 'pumpkin',
    tag: 'CARVED', desc: 'Grins through the dark.',
    color: '#ff8a3d', accent: '#5fbf4a', trail: '#ff9a3d',
    stats: { speed: 300, jump: 486, gravity: 1760, air: 1 },
  },
  {
    id: 'ghost', name: 'Ghost', group: 'spooky', look: 'ghost',
    tag: 'SHEET', desc: 'Polite but see-through.',
    color: '#eef4ff', accent: '#8fa2ff', trail: '#cfe0ff',
    stats: { speed: 322, jump: 514, gravity: 1520, air: 2, glide: true },
  },
  {
    id: 'bat', name: 'Bat', group: 'spooky', look: 'bat',
    tag: 'FLUTTER', desc: 'Hangs around, then goes.',
    color: '#9b5de5', accent: '#ffd166', trail: '#9b5de5',
    stats: { speed: 372, jump: 508, gravity: 1660, air: 2 },
  },
  {
    id: 'witch', name: 'Witch', group: 'spooky', look: 'witch',
    tag: 'BREWS', desc: 'Cackles on the way down.',
    color: '#7b4bd8', accent: '#8fe08a', trail: '#b9a3ff',
    stats: { speed: 334, jump: 526, gravity: 1600, air: 2, glide: true },
  },
  {
    id: 'vampire', name: 'Vampire', group: 'spooky', look: 'vampire',
    tag: 'BITES', desc: 'Prefers the night shift.',
    color: '#2f3350', accent: '#e2452f', trail: '#e2452f',
    stats: { speed: 360, jump: 512, gravity: 1700, air: 2 },
  },
  {
    id: 'mummy', name: 'Mummy', group: 'spooky', look: 'mummy',
    tag: 'WRAPPED', desc: 'Slow, wrapped, unstoppable.',
    color: '#e8e0c8', accent: '#8a7f6a', trail: '#e8e0c8',
    stats: { speed: 292, jump: 552, gravity: 1800, air: 1 },
  },
];

// Shop pricing rule: every collection opens at 600 shards, and each next
// character in the same collection costs more than the one before it.
const HANGAR_STEPS = { fallers: 250, heroes: 400, enemies: 550, reef: 700, void: 900, spooky: 1100 };
{
  const seen = {};
  for (const c of CHARACTERS) {
    const group = c.group || 'fallers';
    const index = seen[group] || 0;
    seen[group] = index + 1;
    c.cost = 600 + index * (HANGAR_STEPS[group] || 300);
  }
}

export const TRAILS = [
  { id: 'ember', name: 'Ember', cost: 0, color: '#ffd166', style: 'dot', desc: 'Warm sparks that follow you down.' },
  { id: 'comet', name: 'Comet', cost: 180, color: '#6ee7ff', style: 'streak', desc: 'A cold blue streak.' },
  { id: 'blossom', name: 'Blossom', cost: 300, color: '#ff9ecd', style: 'petal', desc: 'Petals shaken loose as you fall.' },
  { id: 'aurora', name: 'Aurora', cost: 450, color: '#8ae68a', style: 'ribbon', desc: 'A ribbon of green light.' },
  { id: 'void', name: 'Void', cost: 700, color: '#c77dff', style: 'streak', desc: 'The dark itself, trailing behind.' },
];

// Mission catalogue. Ten objective families, each with its own ladder of
// goals, for 250 distinct cards. The board only ever shows three at a time and
// cleared cards sit in a cooldown before the rest of the catalogue cycles back.
const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const MISSION_KINDS = [
  {
    ev: 'runDepth',
    mode: 'max',
    goals: [
      100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
      1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800, 3000, 3200,
      3400, 3600, 3800, 4200, 4600,
    ],
    text: (g) => `Reach ${groupDigits(g)}m deep in one run`,
    reward: (g) => 20 + Math.round(g / 12),
  },
  {
    ev: 'gems',
    mode: 'add',
    goals: [
      50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2400,
      2800, 3200, 3600, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000,
    ],
    text: (g) => `Collect ${groupDigits(g)} gems in total`,
    reward: (g) => 20 + Math.round(g / 25),
  },
  {
    ev: 'runGems',
    mode: 'max',
    goals: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200, 225, 250, 275, 300, 350],
    text: (g) => `Collect ${g} gems in one run`,
    reward: (g) => 25 + Math.round(g / 4),
  },
  {
    ev: 'runScore',
    mode: 'max',
    goals: [
      800, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4500, 5000, 5500, 6000,
      6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 18000,
      20000, 22500, 25000, 30000,
    ],
    text: (g) => `Score ${groupDigits(g)} in one run`,
    reward: (g) => 20 + Math.round(g / 150),
  },
  {
    ev: 'runCombo',
    mode: 'max',
    goals: [4, 5, 6, 7, 8, 9],
    text: (g) => `Reach a x${g} combo`,
    reward: (g) => 30 + g * 8,
  },
  {
    ev: 'runPerfect',
    mode: 'max',
    goals: [3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160],
    text: (g) => `Stick ${g} perfect landings in one run`,
    reward: (g) => 20 + g * 3,
  },
  {
    ev: 'dashes',
    mode: 'add',
    goals: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250, 300, 350, 400],
    text: (g) => `Dash ${g} times`,
    reward: (g) => 15 + Math.round(g * 1.2),
  },
  {
    ev: 'powerups',
    mode: 'add',
    goals: [3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160],
    text: (g) => `Grab ${g} power-ups`,
    reward: (g) => 20 + g * 4,
  },
  {
    ev: 'runs',
    mode: 'add',
    goals: [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 200],
    text: (g) => `Finish ${g} runs`,
    reward: (g) => 20 + g * 3,
  },
  {
    ev: 'perfect',
    mode: 'add',
    goals: [10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 150, 175, 200, 250, 300, 350, 400, 500],
    text: (g) => `Land ${groupDigits(g)} perfect landings in total`,
    reward: (g) => 20 + g * 2,
  },
];

export const MISSION_POOL = MISSION_KINDS.flatMap((kind) =>
  kind.goals.map((goal) => ({
    id: `${kind.ev}:${goal}`,
    ev: kind.ev,
    mode: kind.mode,
    goal,
    reward: kind.reward(goal),
    text: kind.text(goal),
  }))
);

export const POWERUPS = {
  shield: { name: 'Shield', color: '#6ee7ff', icon: 'shield', duration: 0 },
  magnet: { name: 'Magnet', color: '#ffd166', icon: 'magnet', duration: 7 },
  slow: { name: 'Slow Time', color: '#c77dff', icon: 'clock', duration: 5 },
  glide: { name: 'Feather', color: '#8ae68a', icon: 'feather', duration: 7 },
};
