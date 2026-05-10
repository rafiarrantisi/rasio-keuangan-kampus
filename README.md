# Rasio Keuangan Kampus — Simulator LAMEMBA

Simulator interaktif kesehatan keuangan perguruan tinggi berdasarkan 29 rasio keuangan, 10 indikator wajib LAMEMBA, dan metodologi *Composite Financial Index* (CFI).

## Fitur

- **Wizard 8 langkah** — input pendapatan, pengeluaran, neraca, anggaran RKAT, alokasi Tridharma, data mahasiswa/dosen
- **29 rasio keuangan** dalam 7 kategori (CFI, Likuiditas, Efisiensi, Utang, Endowment, Pendapatan, Akademik)
- **10 indikator LAMEMBA** dengan status TERPENUHI/BELUM secara otomatis
- **IKK Gauge** — Indeks Keberlanjutan Keuangan 0–4 dengan breakdown komponen
- **CFI Scorecard** — radar chart 5 dimensi berbobot
- **Simulasi What-If** — slider + numeric input per parameter, dampak langsung ke predikat & CFI
- **Analisis & Rekomendasi** — narasi dan estimasi kuantitatif berbasis kondisi aktual
- **Ringkasan Eksekutif** — otomatis, tidak hardcoded
- **Export PDF/Print** — satu klik via dialog print browser
- **Persistensi lokal** — SQLite via Express backend; fallback localStorage jika offline

## Prasyarat

- Node.js ≥ 18 (download: https://nodejs.org)
- npm ≥ 9 (sudah termasuk dalam installer Node.js)

## Setup & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server (development — auto-restart on file change)
npm run dev

# 3. Atau jalankan production
npm start
```

Buka browser ke **http://localhost:3000**

> Data disimpan di folder `data/` sebagai file JSON (`state.json`, `presets.json`). Keduanya dibuat otomatis saat pertama kali dijalankan. 4 preset universitas (Sangat Baik, Baik, Perhatian, Berisiko) di-seed otomatis.

## Struktur Folder

```
/
├── public/             ← Frontend (React CDN + Babel standalone — no build step)
│   ├── index.html
│   ├── app.jsx         ← Main app, wizard, what-if, result tabs
│   ├── engine.js       ← Kalkulasi 29 rasio + LAMEMBA + IKK + CFI
│   ├── analysis.js     ← Narasi & rekomendasi berbasis kondisi aktual
│   ├── api.js          ← Fetch wrapper ke backend
│   ├── data.js         ← Preset data & definisi field
│   ├── forms.jsx       ← Komponen input 6 langkah
│   ├── result.jsx      ← Chart, ratio card, gauge, verdict
│   ├── styles.css      ← Semua styling termasuk @media print
│   └── ...
├── server/
│   ├── index.js        ← Express server
│   └── db.js           ← JSON-file persistence (state.json + presets.json)
├── data/               ← Auto-dibuat saat server pertama kali jalan
│   ├── state.json      ← State terakhir yang disimpan (gitignored)
│   └── presets.json    ← 4 preset universitas (gitignored)
├── package.json
└── .gitignore
```

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/state` | Ambil state terakhir yang disimpan |
| PUT | `/api/state` | Simpan state (body: `{ data }`) |
| GET | `/api/presets` | Daftar 4 preset |
| GET | `/api/presets/:id` | Detail preset + data |

## Export PDF

Dari halaman Hasil, klik tombol **🖨 Cetak / PDF** → dialog print browser terbuka → pilih *"Save as PDF"*.

## Push ke GitHub (manual)

```bash
# Setelah inisialisasi git lokal:
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```
