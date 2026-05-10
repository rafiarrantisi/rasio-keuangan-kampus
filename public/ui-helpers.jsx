// Shared UI helpers
const fmtRp = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e12) return sign + 'Rp ' + (abs / 1e12).toFixed(2) + ' T';
  if (abs >= 1e9) return sign + 'Rp ' + (abs / 1e9).toFixed(2) + ' M';
  if (abs >= 1e6) return sign + 'Rp ' + (abs / 1e6).toFixed(1) + ' jt';
  if (abs >= 1e3) return sign + 'Rp ' + (abs / 1e3).toFixed(0) + ' rb';
  return sign + 'Rp ' + abs.toFixed(0);
};
const fmtRpFull = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n < 0 ? '−Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID');
};
const fmtPct = (n, d = 2) => (n === null || n === undefined || isNaN(n)) ? '—' : (n * 100).toFixed(d) + '%';
const fmtX = (n, d = 2) => (n === null || n === undefined || isNaN(n)) ? '—' : n.toFixed(d) + '×';
const fmtIdx = (n, d = 2) => (n === null || n === undefined || isNaN(n)) ? '—' : n.toFixed(d);

function fmtByType(v, type) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  switch (type) {
    case 'pct': return fmtPct(v);
    case 'x': return fmtX(v);
    case 'days': return Math.round(v) + ' hari';
    case 'rp': return fmtRp(v);
    case 'ratio': return v.toFixed(1) + ':1';
    case 'index': return v.toFixed(2);
    default: return v.toFixed(2);
  }
}

const VERDICT_INFO = {
  SANGAT_BAIK: { label: 'SANGAT BAIK', sub: 'Fondasi keuangan sangat kuat. Memenuhi seluruh standar LAMEMBA dengan margin signifikan. Status: Sustainable.', color: '#f5d27a' },
  BAIK: { label: 'BAIK', sub: 'Memenuhi standar LAMEMBA dengan baik. Kondisi keuangan stabil, dengan beberapa area yang masih bisa dioptimalkan.', color: '#b8d8b6' },
  PERHATIAN: { label: 'PERHATIAN', sub: 'Sebagian indikator belum terpenuhi. Diperlukan perbaikan struktural pada area kritis untuk mencegah penurunan.', color: '#f0c987' },
  BERISIKO: { label: 'BERISIKO', sub: 'Banyak indikator gagal memenuhi standar. Diperlukan tindakan korektif segera untuk menjaga keberlanjutan keuangan.', color: '#f0a3a3' },
};

const STEPS = [
  { id: 'preset', n: 0, title: 'Mulai', desc: 'Pilih preset atau mulai dari nol' },
  { id: 'rev', n: 1, title: 'Pendapatan', desc: 'Sumber pendapatan institusi' },
  { id: 'exp', n: 2, title: 'Pengeluaran', desc: 'Komponen biaya operasional' },
  { id: 'bs', n: 3, title: 'Neraca', desc: 'Aset, kewajiban, ekuitas' },
  { id: 'budget', n: 4, title: 'Anggaran', desc: 'RKAT vs realisasi' },
  { id: 'tri', n: 5, title: 'Tridharma', desc: 'Alokasi Pend / Rist / PkM' },
  { id: 'people', n: 6, title: 'Mahasiswa & Dosen', desc: 'Jumlah & endowment' },
  { id: 'result', n: 7, title: 'Hasil & Analisis', desc: 'Predikat, rasio, rekomendasi' },
];

function StatusPill({ s }) {
  const map = {
    ok: { c: 'status-ok', t: 'TERPENUHI' },
    warn: { c: 'status-warn', t: 'PERHATIAN' },
    bad: { c: 'status-bad', t: 'BELUM' },
    info: { c: 'status-info', t: 'INFO' },
  };
  const m = map[s] || { c: 'status-neutral', t: '—' };
  return <span className={'status ' + m.c}>{m.t}</span>;
}

function Sparkline({ data, w = 90, h = 30, color = '#1f3b6b' }) {
  const arr = data.filter(x => x !== null && x !== undefined && !isNaN(x));
  if (arr.length < 2) return <svg width={w} height={h}></svg>;
  const min = Math.min(...arr), max = Math.max(...arr);
  const range = max - min || 1;
  const pts = arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  return (
    <svg width={w} height={h} className="chart">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 2.5 : 1.5} fill={i === pts.length - 1 ? color : '#fff'} stroke={color} strokeWidth="1" />)}
    </svg>
  );
}

window.fmtRp = fmtRp;
window.fmtRpFull = fmtRpFull;
window.fmtPct = fmtPct;
window.fmtX = fmtX;
window.fmtIdx = fmtIdx;
window.fmtByType = fmtByType;
window.VERDICT_INFO = VERDICT_INFO;
window.STEPS = STEPS;
window.StatusPill = StatusPill;
window.Sparkline = Sparkline;
