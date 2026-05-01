// server/index.js — Express app
const express = require('express');
const path    = require('path');
const { getDb } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// ── Static frontend ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── App State (single-project persistence) ─────────────────────────────────
app.get('/api/state', (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT data_json, updated_at FROM app_state WHERE id = 1').get();
    if (!row) return res.status(404).json({ error: 'No saved state' });
    res.json({ data: JSON.parse(row.data_json), updated_at: row.updated_at });
  } catch (e) {
    console.error('[GET /api/state]', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/state', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'Missing "data" in body' });
    const db  = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO app_state (id, data_json, updated_at) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `).run(JSON.stringify(data), now);
    res.json({ ok: true, updated_at: now });
  } catch (e) {
    console.error('[PUT /api/state]', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Presets ────────────────────────────────────────────────────────────────
app.get('/api/presets', (req, res) => {
  try {
    const db   = getDb();
    const rows = db.prepare('SELECT id, name, label FROM presets ORDER BY CASE id WHEN "SANGAT_BAIK" THEN 1 WHEN "BAIK" THEN 2 WHEN "PERHATIAN" THEN 3 WHEN "BERISIKO" THEN 4 ELSE 5 END').all();
    res.json(rows);
  } catch (e) {
    console.error('[GET /api/presets]', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/presets/:id', (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT id, name, label, data_json FROM presets WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Preset not found' });
    res.json({ id: row.id, name: row.name, label: row.label, data: JSON.parse(row.data_json) });
  } catch (e) {
    console.error('[GET /api/presets/:id]', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Fallback to index.html (SPA) ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✓ Rasio Keuangan Kampus berjalan di http://localhost:${PORT}`);
  console.log(`  Frontend  → http://localhost:${PORT}`);
  console.log(`  API docs  → GET /api/health\n`);
  // Initialize DB on startup (triggers migration + seed if first run)
  try { getDb(); } catch (e) { console.error('[startup] DB error:', e); }
});
