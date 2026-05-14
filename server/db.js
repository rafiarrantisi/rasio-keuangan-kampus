// server/db.js — JSON-file persistence (no native compilation required)
// State  → data/state.json
// Presets → data/presets.json  (seeded once from public/data.js)

const path = require('path');
const fs   = require('fs');

const DATA_DIR      = path.join(__dirname, '..', 'data');
const STATE_FILE    = path.join(DATA_DIR, 'state.json');
const PRESETS_FILE  = path.join(DATA_DIR, 'presets.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

// ── Ensure data/ exists ───────────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── State ─────────────────────────────────────────────────────────────────────
function getState() {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState(data) {
  ensureDataDir();
  const now = new Date().toISOString();
  const record = { data, updated_at: now };
  fs.writeFileSync(STATE_FILE, JSON.stringify(record, null, 2), 'utf8');
  return now;
}

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESET_ORDER = ['SANGAT_BAIK', 'BAIK', 'PERHATIAN', 'BERISIKO'];
const PRESET_LABELS = {
  SANGAT_BAIK: 'Sangat Baik',
  BAIK:        'Baik',
  PERHATIAN:   'Perhatian',
  BERISIKO:    'Berisiko',
};

function loadPresets() {
  ensureDataDir();

  // Seed from data.js if presets.json doesn't exist yet
  if (!fs.existsSync(PRESETS_FILE)) {
    seedPresets();
  }

  try {
    return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function seedPresets() {
  const dataPath = path.join(__dirname, '..', 'public', 'data.js');
  if (!fs.existsSync(dataPath)) {
    console.warn('[db] Seed skipped — data.js not found.');
    return;
  }

  try {
    const src  = fs.readFileSync(dataPath, 'utf8');
    const mock = {};
    const fn   = new Function('window', src); // eslint-disable-line no-new-func
    fn(mock);
    const presets = mock.PRESETS;
    if (!presets) { console.warn('[db] Seed skipped — PRESETS not found in data.js'); return; }

    const out = {};
    for (const [id, pData] of Object.entries(presets)) {
      out[id] = { id, name: PRESET_LABELS[id] || id, label: PRESET_LABELS[id] || id, data: pData };
      console.log(`[db] Preset seeded: ${id}`);
    }
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(out, null, 2), 'utf8');
  } catch (e) {
    console.error('[db] Seed error:', e.message);
  }
}

function getPresetList() {
  const presets = loadPresets();
  return PRESET_ORDER
    .filter(id => presets[id])
    .map(id => ({ id, name: presets[id].name, label: presets[id].label }));
}

function getPreset(id) {
  const presets = loadPresets();
  return presets[id] || null;
}

// ── Profiles (multi-save) ─────────────────────────────────────────────────────
function loadProfiles() {
  ensureDataDir();
  if (!fs.existsSync(PROFILES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8')); }
  catch { return []; }
}

function writeProfiles(profiles) {
  ensureDataDir();
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
}

function getProfiles() {
  // Return metadata only (skip full data field for list listing)
  return loadProfiles().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    campus_type: p.campus_type || null,
    tags: p.tags || [],
    result_summary: p.result_summary || null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

function getProfile(id) {
  return loadProfiles().find(p => p.id === id) || null;
}

function saveProfile(id, name, data, extras = {}) {
  const profiles = loadProfiles();
  const now = new Date().toISOString();
  const idx = profiles.findIndex(p => p.id === id);
  const baseFields = {
    id,
    name,
    data,
    description: extras.description || '',
    campus_type: extras.campus_type || null,
    tags: extras.tags || [],
    result_summary: extras.result_summary || null,
    updated_at: now,
  };
  if (idx >= 0) {
    // Append snapshot before overwriting (max 20 snapshots per project)
    const prev = profiles[idx];
    if (prev.data && JSON.stringify(prev.data) !== JSON.stringify(data)) {
      const snapshots = Array.isArray(prev.snapshots) ? prev.snapshots : [];
      snapshots.push({
        ts: prev.updated_at || now,
        data: prev.data,
        result_summary: prev.result_summary || null,
        label: extras.snapshot_label || null,
      });
      // Keep only most recent 20
      while (snapshots.length > 20) snapshots.shift();
      profiles[idx] = { ...prev, ...baseFields, snapshots };
    } else {
      profiles[idx] = { ...prev, ...baseFields };
    }
  } else {
    profiles.push({ ...baseFields, created_at: now, snapshots: [] });
  }
  writeProfiles(profiles);
  return now;
}

function getSnapshots(id) {
  const proj = loadProfiles().find(p => p.id === id);
  if (!proj) return [];
  return Array.isArray(proj.snapshots) ? proj.snapshots : [];
}

function restoreSnapshot(id, snapshotTs) {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const proj = profiles[idx];
  const snapshots = Array.isArray(proj.snapshots) ? proj.snapshots : [];
  const snap = snapshots.find(s => s.ts === snapshotTs);
  if (!snap) return null;
  const now = new Date().toISOString();
  // Save current as a snapshot before restoring
  const newSnapshots = [...snapshots];
  newSnapshots.push({
    ts: proj.updated_at || now,
    data: proj.data,
    result_summary: proj.result_summary || null,
    label: 'Auto-snapshot sebelum restore',
  });
  while (newSnapshots.length > 20) newSnapshots.shift();
  profiles[idx] = {
    ...proj,
    data: snap.data,
    result_summary: snap.result_summary,
    updated_at: now,
    snapshots: newSnapshots,
  };
  writeProfiles(profiles);
  return profiles[idx];
}

function deleteSnapshot(id, snapshotTs) {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx < 0) return false;
  const proj = profiles[idx];
  const snapshots = Array.isArray(proj.snapshots) ? proj.snapshots : [];
  profiles[idx] = { ...proj, snapshots: snapshots.filter(s => s.ts !== snapshotTs) };
  writeProfiles(profiles);
  return true;
}

function deleteProfile(id) {
  const profiles = loadProfiles().filter(p => p.id !== id);
  writeProfiles(profiles);
}

function duplicateProfile(id) {
  const profiles = loadProfiles();
  const src = profiles.find(p => p.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const newId = 'proj_' + Date.now();
  const copy = {
    ...src,
    id: newId,
    name: (src.name || 'Project') + ' (salinan)',
    created_at: now,
    updated_at: now,
  };
  profiles.push(copy);
  writeProfiles(profiles);
  return copy;
}

// ── Init (called on server start) ─────────────────────────────────────────────
function init() {
  ensureDataDir();
  if (!fs.existsSync(PRESETS_FILE)) seedPresets();
}

module.exports = {
  init, getState, saveState,
  getPresetList, getPreset,
  getProfiles, getProfile, saveProfile, deleteProfile, duplicateProfile,
  getSnapshots, restoreSnapshot, deleteSnapshot,
};
