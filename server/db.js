// server/db.js — JSON-file persistence (no native compilation required)
// State  → data/state.json
// Presets → data/presets.json  (seeded once from public/data.js)

const path = require('path');
const fs   = require('fs');

const DATA_DIR     = path.join(__dirname, '..', 'data');
const STATE_FILE   = path.join(DATA_DIR, 'state.json');
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json');

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

// ── Init (called on server start) ─────────────────────────────────────────────
function init() {
  ensureDataDir();
  if (!fs.existsSync(PRESETS_FILE)) seedPresets();
}

module.exports = { init, getState, saveState, getPresetList, getPreset };
