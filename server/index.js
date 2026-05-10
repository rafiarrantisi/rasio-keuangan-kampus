// server/index.js — Express app
const express = require('express');
const path    = require('path');
const db      = require('./db');

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
    const record = db.getState();
    if (!record) return res.status(404).json({ error: 'No saved state' });
    res.json(record);
  } catch (e) {
    console.error('[GET /api/state]', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/state', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'Missing "data" in body' });
    const updated_at = db.saveState(data);
    res.json({ ok: true, updated_at });
  } catch (e) {
    console.error('[PUT /api/state]', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Presets ────────────────────────────────────────────────────────────────
app.get('/api/presets', (req, res) => {
  try {
    res.json(db.getPresetList());
  } catch (e) {
    console.error('[GET /api/presets]', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/presets/:id', (req, res) => {
  try {
    const preset = db.getPreset(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    res.json(preset);
  } catch (e) {
    console.error('[GET /api/presets/:id]', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Profiles ──────────────────────────────────────────────────────────────
app.get('/api/profiles', (req, res) => {
  try { res.json(db.getProfiles()); }
  catch (e) { console.error('[GET /api/profiles]', e); res.status(500).json({ error: e.message }); }
});

app.get('/api/profiles/:id', (req, res) => {
  try {
    const profile = db.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (e) { console.error('[GET /api/profiles/:id]', e); res.status(500).json({ error: e.message }); }
});

app.put('/api/profiles/:id', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Missing "name" or "data"' });
    const updated_at = db.saveProfile(req.params.id, name, data);
    res.json({ ok: true, updated_at });
  } catch (e) { console.error('[PUT /api/profiles/:id]', e); res.status(500).json({ error: e.message }); }
});

app.delete('/api/profiles/:id', (req, res) => {
  try {
    db.deleteProfile(req.params.id);
    res.json({ ok: true });
  } catch (e) { console.error('[DELETE /api/profiles/:id]', e); res.status(500).json({ error: e.message }); }
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
  // Initialize data directory + seed presets on startup
  try { db.init(); } catch (e) { console.error('[startup] DB error:', e); }
});
