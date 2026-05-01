// server/db.js — SQLite init, migration runner, and seed
const path = require('path');
const fs   = require('fs');

let db;

function getDb() {
  if (db) return db;

  const Database = require('better-sqlite3');
  const dbPath   = path.join(__dirname, '..', 'data', 'rkk.db');

  // Ensure data/ directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const isNew = !fs.existsSync(dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  // Seed presets only on fresh DB
  if (isNew) seedPresets(db);

  return db;
}

function runMigrations(db) {
  const migrDir = path.join(__dirname, 'migrations');
  const files   = fs.readdirSync(migrDir).filter(f => f.endsWith('.sql')).sort();

  // Simple applied-migrations tracking via a meta table
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);

  for (const file of files) {
    const alreadyApplied = db.prepare(`SELECT 1 FROM _migrations WHERE name = ?`).get(file);
    if (alreadyApplied) continue;

    const sql = fs.readFileSync(path.join(migrDir, file), 'utf8');
    db.exec(sql);
    db.prepare(`INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`).run(file, new Date().toISOString());
    console.log(`[db] Migration applied: ${file}`);
  }
}

function seedPresets(db) {
  // Load presets from public/data.js via a lightweight eval approach.
  // The file exposes `window.PRESETS` — we re-read it and extract the object.
  const dataPath = path.join(__dirname, '..', 'public', 'data.js');
  if (!fs.existsSync(dataPath)) {
    console.warn('[db] Seed skipped — data.js not found.');
    return;
  }

  try {
    // Execute data.js in a mock browser context to extract PRESETS
    const src = fs.readFileSync(dataPath, 'utf8');
    const mock = {};
    const fn   = new Function('window', src);
    fn(mock);
    const presets = mock.PRESETS;
    if (!presets) { console.warn('[db] Seed skipped — PRESETS not found in data.js'); return; }

    const insert = db.prepare(`INSERT OR REPLACE INTO presets (id, name, label, data_json) VALUES (?, ?, ?, ?)`);
    const labels = {
      SANGAT_BAIK: 'Sangat Baik',
      BAIK:        'Baik',
      PERHATIAN:   'Perhatian',
      BERISIKO:    'Berisiko',
    };
    const seedMany = db.transaction(() => {
      for (const [id, pData] of Object.entries(presets)) {
        insert.run(id, labels[id] || id, labels[id] || id, JSON.stringify(pData));
        console.log(`[db] Preset seeded: ${id}`);
      }
    });
    seedMany();
  } catch (e) {
    console.error('[db] Seed error:', e.message);
  }
}

module.exports = { getDb };
