// api.js — thin fetch wrapper for the backend API
// All functions return Promise. Backend runs at same origin (localhost:3000 in dev).

;(function() {

const BASE = ''; // same origin — no need to specify host

async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status });
  }
  return res.json();
}

// ── State (single-project) ──────────────────────────────────────────────────
// Returns { data, updated_at } or throws 404-ish error if no state saved yet
async function apiGetState() {
  return apiFetch('GET', '/api/state');
}

// Saves data to server. data = { TS, 'TS-1', 'TS-2' }
async function apiSaveState(data) {
  return apiFetch('PUT', '/api/state', { data });
}

// ── Presets ─────────────────────────────────────────────────────────────────
// Returns [{ id, name, label }]
async function apiGetPresets() {
  return apiFetch('GET', '/api/presets');
}

// Returns { id, name, label, data }
async function apiGetPreset(id) {
  return apiFetch('GET', '/api/presets/' + encodeURIComponent(id));
}

// ── Profiles / Projects (multi-save) ────────────────────────────────────────
async function apiGetProfiles() { return apiFetch('GET', '/api/profiles'); }
async function apiGetProfile(id) { return apiFetch('GET', '/api/profiles/' + encodeURIComponent(id)); }
async function apiSaveProfile(id, name, data, extras) {
  return apiFetch('PUT', '/api/profiles/' + encodeURIComponent(id), { name, data, ...(extras || {}) });
}
async function apiDeleteProfile(id) { return apiFetch('DELETE', '/api/profiles/' + encodeURIComponent(id)); }
async function apiDuplicateProfile(id) { return apiFetch('POST', '/api/profiles/' + encodeURIComponent(id) + '/duplicate'); }

// Project aliases (semantic naming for multi-project page)
const apiGetProjects = apiGetProfiles;
const apiGetProject = apiGetProfile;
const apiSaveProject = apiSaveProfile;
const apiDeleteProject = apiDeleteProfile;
const apiDuplicateProject = apiDuplicateProfile;

// ── Health ───────────────────────────────────────────────────────────────────
async function apiHealth() {
  return apiFetch('GET', '/api/health');
}

// ── Expose ───────────────────────────────────────────────────────────────────
window.apiGetState      = apiGetState;
window.apiSaveState     = apiSaveState;
window.apiGetPresets    = apiGetPresets;
window.apiGetPreset     = apiGetPreset;
window.apiHealth        = apiHealth;
window.apiGetProfiles   = apiGetProfiles;
window.apiGetProfile    = apiGetProfile;
window.apiSaveProfile   = apiSaveProfile;
window.apiDeleteProfile = apiDeleteProfile;
window.apiDuplicateProfile = apiDuplicateProfile;
window.apiGetProjects   = apiGetProjects;
window.apiGetProject    = apiGetProject;
window.apiSaveProject   = apiSaveProject;
window.apiDeleteProject = apiDeleteProject;
window.apiDuplicateProject = apiDuplicateProject;

})();
