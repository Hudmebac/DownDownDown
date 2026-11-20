import { SAVE_KEY } from './config.js';
import { freshProfileData } from './progress.js';

export const PROFILES_KEY = 'ddd.profiles.v1';
export const MAX_PROFILES = 8;
export const NAME_MAX = 14;

const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function sanitizeName(raw, fallback = 'Player') {
  const cleaned = String(raw == null ? '' : raw)
    .replace(/[^\w \-']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return cleaned || fallback;
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function mergeData(raw) {
  const base = freshProfileData();
  const data = { ...base, ...(raw || {}) };
  const rawSettings = (raw && raw.settings) || {};
  const settingsVersion = rawSettings.audioVersion || 1;
  data.settings = { ...base.settings, ...rawSettings, audioVersion: 2 };
  // Older saves started music on by default; the new default is silent until asked.
  if (settingsVersion < 2 && data.settings.music === 0.45) data.settings.music = 0;
  if (!Array.isArray(data.unlocks) || !data.unlocks.length) data.unlocks = base.unlocks;
  if (!Array.isArray(data.trails) || !data.trails.length) data.trails = base.trails;
  if (!Array.isArray(data.missions)) data.missions = [];
  return data;
}

export class ProfileStore {
  constructor() {
    this.list = [];
    this.activeId = null;
    this.load();
  }

  load() {
    const saved = readJSON(PROFILES_KEY);
    if (saved && Array.isArray(saved.list) && saved.list.length) {
      this.list = saved.list
        .filter((p) => p && p.id && p.data)
        .map((p, i) => ({
          id: String(p.id),
          name: sanitizeName(p.name, `Player ${i + 1}`),
          created: p.created || Date.now(),
          data: mergeData(p.data),
        }));
      if (this.list.length) {
        this.activeId = this.list.some((p) => p.id === saved.active) ? saved.active : this.list[0].id;
        return;
      }
    }
    this.loadLegacy();
  }

  loadLegacy() {
    const legacy = readJSON(SAVE_KEY);
    const profile = {
      id: uid(),
      name: sanitizeName(legacy && legacy.name, 'Player 1'),
      created: Date.now(),
      data: mergeData(legacy),
    };
    this.list = [profile];
    this.activeId = profile.id;
    this.save();
  }

  save() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify({ active: this.activeId, list: this.list }));
    } catch (e) {}
  }

  get active() {
    return this.list.find((p) => p.id === this.activeId) || this.list[0];
  }

  get full() {
    return this.list.length >= MAX_PROFILES;
  }

  suggestName() {
    const used = new Set(this.list.map((p) => p.name.toLowerCase()));
    for (let n = 1; n <= MAX_PROFILES + 1; n++) {
      if (!used.has(`player ${n}`)) return `Player ${n}`;
    }
    return 'Player';
  }

  create(name) {
    if (this.full) return null;
    const profile = {
      id: uid(),
      name: sanitizeName(name, this.suggestName()),
      created: Date.now(),
      data: freshProfileData(),
    };
    this.list.push(profile);
    this.activeId = profile.id;
    this.save();
    return profile;
  }

  switch(id) {
    if (!this.list.some((p) => p.id === id)) return false;
    this.activeId = id;
    this.save();
    return true;
  }

  rename(id, name) {
    const profile = this.list.find((p) => p.id === id);
    if (!profile) return false;
    profile.name = sanitizeName(name, profile.name);
    this.save();
    return true;
  }

  remove(id) {
    if (this.list.length <= 1) return false;
    const idx = this.list.findIndex((p) => p.id === id);
    if (idx < 0) return false;
    this.list.splice(idx, 1);
    if (this.activeId === id) this.activeId = this.list[Math.max(0, idx - 1)].id;
    this.save();
    return true;
  }
}
