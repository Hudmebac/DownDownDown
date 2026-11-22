import { CHARACTERS, TRAILS, MISSION_POOL, ECONOMY, biomeIndexAt } from './config.js';

const MISSION_ACTIVE = 3;
// Cleared missions sit out this many draws before they can come back around.
const MISSION_COOLDOWN = 45;

export const freshProfileData = () => ({
  name: '',
  best: 0,
  bestScore: 0,
  shards: 0,
  runs: 0,
  gems: 0,
  unlocks: ['pip'],
  trails: ['ember'],
  char: 'pip',
  trail: 'ember',
  settings: { music: 0, sfx: 0.7, shake: 1, reduce: 0, hand: 'right', audioVersion: 2 },
  missions: [],
  missionDeck: [],
  missionCooldown: [],
  missionsDone: 0,
  bonusClaimed: 0,
  seenHowTo: false,
});

export class Progress {
  constructor(store) {
    this.store = store;
    this.data = store.active.data;
    this.ensureMissions();
  }

  rebind(store) {
    this.store = store;
    this.data = store.active.data;
    this.ensureMissions();
  }

  save() {
    this.store.save();
  }

  get settings() {
    return this.data.settings;
  }

  get char() {
    const found = CHARACTERS.find((c) => c.id === this.data.char);
    return found && this.ownsChar(found.id) ? found : CHARACTERS[0];
  }

  get trail() {
    const found = TRAILS.find((t) => t.id === this.data.trail);
    return found && this.ownsTrail(found.id) ? found : TRAILS[0];
  }

  ownsChar(id) {
    return this.data.unlocks.includes(id);
  }

  ownsTrail(id) {
    return this.data.trails.includes(id);
  }

  equipChar(id) {
    if (!this.ownsChar(id)) return false;
    this.data.char = id;
    this.save();
    return true;
  }

  equipTrail(id) {
    if (!this.ownsTrail(id)) return false;
    this.data.trail = id;
    this.save();
    return true;
  }

  buyChar(id) {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def || this.ownsChar(id) || this.data.shards < def.cost) return false;
    this.data.shards -= def.cost;
    this.data.unlocks.push(id);
    this.data.char = id;
    this.save();
    return true;
  }

  buyTrail(id) {
    const def = TRAILS.find((t) => t.id === id);
    if (!def || this.ownsTrail(id) || this.data.shards < def.cost) return false;
    this.data.shards -= def.cost;
    this.data.trails.push(id);
    this.data.trail = id;
    this.save();
    return true;
  }

  bonusInfo() {
    const perCache = ECONOMY.missionsPerCache;
    const total = this.data.missionsDone || 0;
    const claimed = this.data.bonusClaimed || 0;
    const unlocked = Math.floor(total / perCache);
    return {
      perCache,
      total,
      claimed,
      unlocked,
      claimable: Math.max(0, unlocked - claimed),
      into: total % perCache,
      toNext: perCache - (total % perCache),
      value: ECONOMY.bonusBase + claimed * ECONOMY.bonusStep,
    };
  }

  claimBonus() {
    const info = this.bonusInfo();
    if (info.claimable <= 0) return 0;
    this.data.shards += info.value;
    this.data.bonusClaimed = (this.data.bonusClaimed || 0) + 1;
    this.save();
    return info.value;
  }

  ensureMissions() {
    if (!Array.isArray(this.data.missions)) this.data.missions = [];
    if (!Array.isArray(this.data.missionDeck)) this.data.missionDeck = [];
    if (!Array.isArray(this.data.missionCooldown)) this.data.missionCooldown = [];
    this.data.missions = this.data.missions.filter((m) => !m.done);
    let attempts = 0;
    while (this.data.missions.length < MISSION_ACTIVE && attempts < MISSION_POOL.length) {
      attempts += 1;
      const def = this._nextMission();
      if (!def) break;
      if (this.data.missions.some((m) => m.id === def.id)) continue;
      this.data.missions.push(this._makeMission(def));
    }
    this.save();
  }

  _nextMission() {
    const blocked = new Set(this.data.missionCooldown);
    for (let guard = 0; guard < MISSION_POOL.length + 2; guard++) {
      if (!this.data.missionDeck.length) {
        const ids = MISSION_POOL.map((m) => m.id).filter((id) => !blocked.has(id));
        if (!ids.length) return null;
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        this.data.missionDeck = ids;
      }
      const id = this.data.missionDeck.pop();
      if (blocked.has(id)) continue;
      const def = MISSION_POOL.find((m) => m.id === id);
      if (def) return def;
    }
    return null;
  }

  _makeMission(def) {
    return { id: def.id, ev: def.ev, mode: def.mode, goal: def.goal, reward: def.reward, text: def.text, prog: 0, done: false };
  }

  record(ev, value, mode = 'add') {
    const completed = [];
    let changed = false;
    for (const m of this.data.missions) {
      if (m.done || m.ev !== ev) continue;
      m.prog = mode === 'max' ? Math.max(m.prog, value) : m.prog + value;
      changed = true;
      if (m.prog >= m.goal) {
        m.done = true;
        this.data.shards += m.reward;
        this.data.missionsDone = (this.data.missionsDone || 0) + 1;
        this.data.missionCooldown.push(m.id);
        while (this.data.missionCooldown.length > MISSION_COOLDOWN) this.data.missionCooldown.shift();
        completed.push(m);
      }
    }
    if (changed) this.save();
    return completed;
  }

  rewardParts({ depth, score, gems, perfects = 0 }) {
    const biome = biomeIndexAt(depth);
    const parts = [
      { label: 'DEPTH', value: Math.floor(depth / ECONOMY.depthDiv) },
      { label: 'GEMS', value: Math.floor(gems / ECONOMY.gemDiv) },
      { label: 'SCORE', value: Math.floor(score / ECONOMY.scoreDiv) },
      { label: 'LANDINGS', value: perfects * ECONOMY.perfectEach },
      { label: 'BIOMES', value: biome * ECONOMY.biomeEach },
    ];
    return parts.filter((p) => p.value > 0);
  }

  endRun({ depth, score, gems, combo, perfects = 0 }) {
    const data = this.data;
    data.runs += 1;
    data.gems += gems;
    const newBest = depth > data.best;
    if (newBest) data.best = Math.floor(depth);
    if (score > data.bestScore) data.bestScore = Math.floor(score);

    const parts = this.rewardParts({ depth, score, gems, perfects });
    const earned = parts.reduce((sum, p) => sum + p.value, 0);
    data.shards += earned;

    const completed = [
      ...this.record('runDepth', Math.floor(depth), 'max'),
      ...this.record('runScore', Math.floor(score), 'max'),
      ...this.record('runGems', gems, 'max'),
      ...this.record('runCombo', combo, 'max'),
      ...this.record('runPerfect', perfects, 'max'),
      ...this.record('gems', gems, 'add'),
      ...this.record('runs', 1, 'add'),
    ];
    this.ensureMissions();
    this.save();
    return { shards: earned, parts, newBest, completed };
  }

  addTotals({ dashes = 0, powerups = 0, perfects = 0 }) {
    const completed = [
      ...this.record('dashes', dashes, 'add'),
      ...this.record('powerups', powerups, 'add'),
      ...this.record('perfect', perfects, 'add'),
    ];
    this.ensureMissions();
    return completed;
  }
}
