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
  left: { x: 22, y: 468, w: 94, h: 94 },
  right: { x: 128, y: 468, w: 94, h: 94 },
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
    id: 'pip', name: 'Pip', cost: 0, hat: 'tuft', tag: 'BALANCED',
    desc: 'Friendly and sure-footed.',
    color: '#ff7a6b', accent: '#ffd166', trail: '#ffd166',
    stats: { speed: 330, jump: 480, gravity: 1700, air: 1 },
  },
  {
    id: 'bolt', name: 'Bolt', cost: 300, hat: 'spike', tag: 'FAST & FLOATY',
    desc: 'Fast, floaty, commits hard.',
    color: '#4cc9f0', accent: '#f72585', trail: '#4cc9f0',
    stats: { speed: 382, jump: 490, gravity: 1780, air: 1 },
  },
  {
    id: 'nix', name: 'Nix', cost: 480, hat: 'horns', tag: 'DOUBLE JUMP',
    desc: 'Heavy jumper, extra air hop.',
    color: '#9b5de5', accent: '#f15bb5', trail: '#c77dff',
    stats: { speed: 306, jump: 540, gravity: 1580, air: 2 },
  },
  {
    id: 'wisp', name: 'Wisp', cost: 700, hat: 'antenna', tag: 'GLIDE',
    desc: 'Glides on a held jump.',
    color: '#8ae68a', accent: '#fdffd2', trail: '#8ae68a',
    stats: { speed: 322, jump: 500, gravity: 1480, air: 1, glide: true },
  },
  {
    id: 'nova', name: 'Nova', cost: 1000, hat: 'crown', tag: 'ALL-ROUNDER',
    desc: 'No real weaknesses.',
    color: '#ffd166', accent: '#ff7a6b', trail: '#ffd166',
    stats: { speed: 350, jump: 520, gravity: 1660, air: 2 },
  },
  {
    id: 'umbra', name: 'Umbra', cost: 1500, hat: 'hood', tag: 'FAST FALLER',
    desc: 'Quick, heavy, hard to catch.',
    color: '#2f3350', accent: '#ef476f', trail: '#ef476f',
    stats: { speed: 372, jump: 536, gravity: 1620, air: 2 },
  },
];

export const TRAILS = [
  { id: 'ember', name: 'Ember', cost: 0, color: '#ffd166', style: 'dot', desc: 'Warm sparks that follow you down.' },
  { id: 'comet', name: 'Comet', cost: 180, color: '#6ee7ff', style: 'streak', desc: 'A cold blue streak.' },
  { id: 'blossom', name: 'Blossom', cost: 300, color: '#ff9ecd', style: 'petal', desc: 'Petals shaken loose as you fall.' },
  { id: 'aurora', name: 'Aurora', cost: 450, color: '#8ae68a', style: 'ribbon', desc: 'A ribbon of green light.' },
  { id: 'void', name: 'Void', cost: 700, color: '#c77dff', style: 'streak', desc: 'The dark itself, trailing behind.' },
];

export const MISSION_POOL = [
  { id: 'gems40', text: 'Collect 40 gems in one run', ev: 'runGems', mode: 'max', goal: 40, reward: 40 },
  { id: 'depth300', text: 'Reach 300m deep', ev: 'runDepth', mode: 'max', goal: 300, reward: 60 },
  { id: 'gems150', text: 'Collect 150 gems in total', ev: 'gems', mode: 'add', goal: 150, reward: 50 },
  { id: 'score2500', text: 'Score 2,500 in one run', ev: 'runScore', mode: 'max', goal: 2500, reward: 55 },
  { id: 'dash15', text: 'Dash 15 times', ev: 'dashes', mode: 'add', goal: 15, reward: 35 },
  { id: 'perfect12', text: 'Stick 12 perfect landings in one run', ev: 'runPerfect', mode: 'max', goal: 12, reward: 45 },
  { id: 'power6', text: 'Grab 6 power-ups', ev: 'powerups', mode: 'add', goal: 6, reward: 40 },
  { id: 'runs3', text: 'Finish 3 runs', ev: 'runs', mode: 'add', goal: 3, reward: 35 },
  { id: 'depth800', text: 'Reach 800m deep', ev: 'runDepth', mode: 'max', goal: 800, reward: 90 },
  { id: 'combo8', text: 'Reach a x8 combo', ev: 'runCombo', mode: 'max', goal: 8, reward: 65 },
  { id: 'gems500', text: 'Collect 500 gems in total', ev: 'gems', mode: 'add', goal: 500, reward: 110 },
  { id: 'biomes3', text: 'Reach Glass Reef in one run', ev: 'runDepth', mode: 'max', goal: 550, reward: 70 },
  { id: 'depth1500', text: 'Reach 1500m deep', ev: 'runDepth', mode: 'max', goal: 1500, reward: 120 },
  { id: 'depth2200', text: 'Reach Last Light at 2200m', ev: 'runDepth', mode: 'max', goal: 2200, reward: 170 },
  { id: 'depth3800', text: 'Finish a full descent (3800m)', ev: 'runDepth', mode: 'max', goal: 3800, reward: 260 },
];

export const POWERUPS = {
  shield: { name: 'Shield', color: '#6ee7ff', icon: 'shield', duration: 0 },
  magnet: { name: 'Magnet', color: '#ffd166', icon: 'magnet', duration: 7 },
  slow: { name: 'Slow Time', color: '#c77dff', icon: 'clock', duration: 5 },
  glide: { name: 'Feather', color: '#8ae68a', icon: 'feather', duration: 7 },
};
