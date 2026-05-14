// analysis.js — compute-driven analysis & recommendations
// Replaces the hardcoded buildRecs map with context-aware narratives.
// Exports (via window): buildAnalysis(result, data) and buildExecSummary(result, data)

;(function() {

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtPct(v, d=1) { return (v * 100).toFixed(d) + '%'; }
function fmtX(v)         { return v.toFixed(2) + '×'; }
function fmtRp(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e12) return sign + 'Rp ' + (abs/1e12).toFixed(1) + ' T';
  if (abs >= 1e9)  return sign + 'Rp ' + (abs/1e9).toFixed(1)  + ' M';
  if (abs >= 1e6)  return sign + 'Rp ' + (abs/1e6).toFixed(1)  + ' rb';
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}
function trend3(v, v1, v2) {
  // Returns 'up', 'down', 'stable' based on 3-year direction
  if (v === undefined || v1 === undefined) return 'stable';
  const d1 = v - v1;
  const d2 = (v1 !== undefined && v2 !== undefined) ? v1 - v2 : d1;
  if (d1 > 0 && d2 >= 0) return 'up';
  if (d1 < 0 && d2 <= 0) return 'down';
  if (d1 > 0 && d2 < 0) return 'recovering';
  if (d1 < 0 && d2 > 0) return 'deteriorating';
  return 'stable';
}
function trendLabel(t) {
  return { up: 'membaik', down: 'memburuk', recovering: 'mulai pulih', deteriorating: 'cenderung memburuk', stable: 'stabil' }[t] || 'stabil';
}

// ─── gap-to-target estimators ────────────────────────────────────────────────
// Each estimator returns { needed: Rp|null, unit: string, narrative: string }
// "needed" is the primary lever to fix the ratio.

function gapL1_RK(result, data) {
  const r = result.ratios.find(x => x.id === 'L1_RK');
  if (!r) return null;
  const d = result.derived.TS;
  const target = 0.30;
  if (r.v >= target) return null;
  const gap = target - r.v; // how many pp short
  // nonGov + X / (totalRev + X) = 0.30  → X = (0.30*totalRev - nonGov)/(1-0.30)
  const nonGov = d.nonGov || 0;
  const totalRev = d.totalRev || 1;
  const needed = (target * totalRev - nonGov) / (1 - target);
  return { needed: Math.round(needed), unit: 'tambahan pendapatan non-pemerintah', narrative:
    `Saat ini ${fmtPct(r.v)} (target ≥ ${fmtPct(target)}). Perlu tambahan ${fmtRp(needed)} pendapatan non-pemerintah (riset, donasi, auxiliary) agar RK ≥ 30%.` };
}

function gapL2_REO(result, data) {
  const r = result.ratios.find(x => x.id === 'L2_REO');
  if (!r) return null;
  const d = result.derived.TS;
  const TS = data.TS;
  const target = 0.65;
  if (r.v >= target) return null;
  // expOps / totalExp = 0.65 → realokasikan biaya non-ops ke dalam ops
  const totalExp = d.totalExp || 1;
  const expOps = TS.expOps || 0;
  const targetOps = target * totalExp;
  const needed = targetOps - expOps;
  return { needed: Math.round(needed), unit: 'realokasi ke Biaya Ops Langsung', narrative:
    `REO ${fmtPct(r.v)} (target ≥ ${fmtPct(target)}). Biaya Ops Langsung perlu dinaikkan ~${fmtRp(needed)} (atau total pengeluaran non-ops dikurangi) agar proporsi Tridharma ≥ 65%.` };
}

function gapL4_RISDM(result, data) {
  const r = result.ratios.find(x => x.id === 'L4_RISDM');
  if (!r) return null;
  const d = result.derived.TS;
  const TS = data.TS;
  const target = 0.15;
  if (r.v >= target) return null;
  const totalExp = d.totalExp || 1;
  const expSDM = TS.expSDM || 0;
  const needed = target * totalExp - expSDM;
  return { needed: Math.round(needed), unit: 'tambahan anggaran SDM', narrative:
    `RISDM ${fmtPct(r.v)} (target ≥ ${fmtPct(target)}). Anggaran SDM perlu ditambah ~${fmtRp(needed)} untuk mencapai minimal 15% dari total pengeluaran.` };
}

function gapL5_RISP(result, data) {
  const r = result.ratios.find(x => x.id === 'L5_RISP');
  if (!r) return null;
  const d = result.derived.TS;
  const TS = data.TS;
  const target = 0.20;
  if (r.v >= target) return null;
  const totalExp = d.totalExp || 1;
  const expSarpras = (TS.expCapex || 0) + (TS.expMaint || 0);
  const needed = target * totalExp - expSarpras;
  return { needed: Math.round(needed), unit: 'tambahan investasi sarpras (CapEx+Pemeliharaan)', narrative:
    `RISP ${fmtPct(r.v)} (target ≥ ${fmtPct(target)}). Investasi Sarpras (CapEx + Pemeliharaan) perlu ditambah ~${fmtRp(needed)} untuk mencapai 20%.` };
}

function gapL6_GRR(result, data) {
  const r = result.ratios.find(x => x.id === 'L6_GRR');
  if (!r) return null;
  const d1 = result.derived['TS-1'];
  const target = 0.05;
  if (r.v >= target) return null;
  const revTS1 = d1 ? d1.totalRev : 0;
  const needed = target * revTS1 - (result.derived.TS.totalRev - revTS1);
  const targetRev = revTS1 * (1 + target);
  return { needed: Math.round(Math.max(0, targetRev - result.derived.TS.totalRev)), unit: 'tambahan pendapatan dari TS-1', narrative:
    `GRR ${fmtPct(r.v)} (target ≥ ${fmtPct(target)}). Untuk mencapai pertumbuhan 5% dari TS-1, pendapatan TS harus minimal ${fmtRp(Math.round(targetRev))}, masih kurang ~${fmtRp(Math.round(Math.max(0, targetRev - result.derived.TS.totalRev)))}.` };
}

function gapL9_RL(result, data) {
  const r = result.ratios.find(x => x.id === 'L9_RL');
  if (!r) return null;
  const TS = data.TS;
  const d = result.derived.TS;
  const target = 1.0;
  if (r.v >= target) return null;
  const kwjJP = TS.bsKwjJP || 1;
  const needed = kwjJP - d.totalAsetLancar;
  return { needed: Math.round(Math.max(0, needed)), unit: 'tambahan aset lancar', narrative:
    `RL ${fmtX(r.v)} (target ≥ 1.00×). Aset Lancar (${fmtRp(d.totalAsetLancar)}) masih di bawah Kewajiban Jangka Pendek (${fmtRp(kwjJP)}). Perlu tambahan ~${fmtRp(needed)} aset lancar atau kurangi kewajiban jangka pendek.` };
}

function gapL10_ATT(result) {
  const r = result.ratios.find(x => x.id === 'L10_ATT');
  if (!r) return null;
  const failing = (r.triItems || []).filter(t => !t.ok);
  if (!failing.length) return null;
  const lines = failing.map(t => {
    const dev = ((t.prop - t.bobot) * 100).toFixed(1);
    return `${t.k} ${fmtPct(t.prop)} (target ${fmtPct(t.bobot)}, deviasi ${dev > 0 ? '+' : ''}${dev} pp)`;
  });
  return { needed: null, unit: 'rebalancing proporsi Tridharma', narrative:
    `Fungsi yang menyimpang: ${lines.join('; ')}. Sesuaikan proporsi agar setiap fungsi dalam batas ±10 pp dari bobot LAMEMBA.` };
}

function gapL8_IKK(result) {
  const r = result.ratios.find(x => x.id === 'L8_IKK');
  if (!r) return null;
  const target = 2.5;
  if (r.v >= target) return null;
  const comps = (result.IKK_components || []);
  const weakest = comps.length
    ? comps.slice().sort((a, b) => (a.norm * a.weight) - (b.norm * b.weight))[0]
    : null;
  const wName = weakest ? weakest.k.split('(')[0].trim() : '—';
  return { needed: null, unit: 'perbaikan komponen IKK', narrative:
    `IKK ${r.v.toFixed(2)} (target ≥ ${target}). Komponen terlemah: ${wName} (kontribusi ${weakest ? (weakest.norm*weakest.weight*4).toFixed(2) : '—'}/${(weakest ? weakest.weight*4 : 0).toFixed(2)}). Prioritaskan perbaikan ${wName}.` };
}

// ─── Action item templates (parametric) ──────────────────────────────────────
const ACTION_TEMPLATES = {
  L1_RK: [
    'Tingkatkan pendapatan riset & hibah kompetitif (target > 10% dari total pendapatan).',
    'Kembangkan unit auxiliary (klinik, training center, inkubator bisnis).',
    'Perkuat program alumni giving & CSR untuk boost pendapatan donasi.',
  ],
  L2_REO: [
    'Audit biaya non-akademik — pastikan overhead admin ≤ 15% total pengeluaran.',
    'Realokasi anggaran administrative support ke Biaya Operasional Langsung Tridharma.',
    'Tinjau ulang kontrak layanan eksternal yang tidak langsung mendukung akademik.',
  ],
  L3_VA: [
    'Terapkan monitoring varians bulanan dengan early warning untuk pos yang deviasi > 5%.',
    'Review anggaran kuartalan bersama PIC Budget Director & Warek II.',
    'Perkuat proses penyusunan RKAT dengan bottom-up input dari unit akademik.',
  ],
  L4_RISDM: [
    'Alokasikan anggaran sertifikasi & pelatihan dosen minimal 15% dari total pengeluaran.',
    'Perbesar proporsi hibah penelitian dosen internal dari anggaran SDM.',
    'Susun roadmap pengembangan kompetensi dosen 3–5 tahun.',
  ],
  L5_RISP: [
    'Susun master plan sarpras 5 tahun dengan rencana CapEx terperinci.',
    'Alokasikan minimal 20% total pengeluaran untuk CapEx + pemeliharaan rutin.',
    'Pertimbangkan skema PPP atau leasing untuk CapEx skala besar.',
  ],
  L6_GRR: [
    'Diversifikasi sumber pendapatan: kembangkan auxiliary, fundraising, dan kemitraan industri.',
    'Tingkatkan program enrollment — marketing digital, beasiswa prestasi, dan dual degree.',
    'Optimalkan monetisasi aset kampus (venue rental, research park, spin-off perusahaan).',
  ],
  L8_IKK: [
    'Identifikasi komponen IKK terlemah dari breakdown di tab Overview.',
    'Buat rencana perbaikan 12 bulan per komponen dengan KPI terukur.',
    'Laporkan progress IKK ke Dewan Pengawas setiap kuartal.',
  ],
  L9_RL: [
    'Restrukturisasi piutang mahasiswa — percepat penagihan & negosiasi cicilan.',
    'Negosiasi ulang tenor utang jangka pendek menjadi jangka panjang.',
    'Bangun cash reserve ekuivalen ≥ 1× kewajiban jangka pendek.',
  ],
  L10_ATT: [
    'Lakukan realokasi anggaran Tridharma sesuai saran rebalancing di Langkah 5.',
    'Tetapkan kebijakan proporsi Tridharma minimal dan maksimal per fungsi.',
    'Review alokasi setiap semester agar tetap dalam batas ±10 pp.',
  ],
  // Non-LAMEMBA
  dscr: [
    'Tingkatkan EBITDA melalui kenaikan pendapatan atau efisiensi biaya non-akademik.',
    'Restrukturisasi pinjaman untuk menurunkan cicilan tahunan (Annual Debt Service).',
  ],
  icr: [
    'Refinancing utang dengan bunga lebih rendah atau tenor lebih panjang.',
    'Naikkan EBITDA melalui surplus operasional.',
  ],
  debtAssets: [
    'Hindari penambahan utang baru; lunasi utang jangka panjang dengan surplus operasional.',
    'Perkuat aset bersih melalui donasi endowment atau surplus reinvested.',
  ],
  tuitDep: [
    'Diversifikasi pendapatan non-SPP (riset, auxiliary, donasi) untuk turunkan ketergantungan.',
    'Kembangkan program continuing education & sertifikasi profesional berbayar.',
  ],
  revConc: [
    'Kembangkan minimal 3 sumber pendapatan yang masing-masing > 10% total pendapatan.',
    'Perkuat endowment dan investment income untuk mengurangi dominasi SPP.',
  ],
};

// ─── Severity calculator (0–1, higher = more urgent) ─────────────────────────
function severity(r) {
  if (!r || r.status === 'ok' || r.status === 'info') return 0;
  if (r.status === 'bad') {
    if (r.lameba) return 1.0;
    // Non-LAMEMBA: estimate gap relative to benchmark
    if (r.format === 'pct') {
      const target = parseFloat(r.target) / 100 || 0;
      return Math.min(1, Math.abs(r.v - target) / (target || 0.01));
    }
    return 0.75;
  }
  return 0.4; // warn
}

// ─── Main: buildAnalysis ─────────────────────────────────────────────────────
function buildAnalysis(result, data) {
  const items = [];
  const gapFns = { L1_RK: gapL1_RK, L2_REO: gapL2_REO, L4_RISDM: gapL4_RISDM, L5_RISP: gapL5_RISP, L6_GRR: gapL6_GRR, L9_RL: gapL9_RL, L10_ATT: () => gapL10_ATT(result), L8_IKK: () => gapL8_IKK(result) };

  result.ratios.forEach(r => {
    if (r.status === 'ok' || r.status === 'info') return;

    const sev = severity(r);
    if (sev === 0) return;

    const trendDir  = trend3(r.v, r.v1, r.v2);
    const trendTxt  = trendLabel(trendDir);
    const gapFn     = gapFns[r.id];
    const gapInfo   = gapFn ? gapFn(result, data) : null;
    const actions   = ACTION_TEMPLATES[r.id] || [];

    // Determine priority: LAMEMBA bad → high, LAMEMBA warn → med, non-LAMEMBA bad → med-high
    const priority  = r.lameba && r.status === 'bad' ? 'high'
                    : r.status === 'bad'              ? 'med-high'
                    : 'med';

    // Build dynamic narrative
    let trendNote = '';
    if (r.v !== undefined && r.v1 !== undefined) {
      trendNote = ` Tren 3 tahun: ${trendTxt}`;
      if (trendDir === 'deteriorating') trendNote += ' — perlu perhatian segera meski belum melampaui batas kritis.';
      else if (trendDir === 'up') trendNote += ' — sudah ada perbaikan, pertahankan momentum.';
      else if (trendDir === 'recovering') trendNote += ' — tanda pemulihan mulai terlihat.';
    }

    // Title: always dynamic with actual value
    const valStr = window.fmtByType ? window.fmtByType(r.v, r.format) : r.v;
    const title  = buildTitle(r, valStr);

    items.push({
      id:           r.id,
      ratio:        r,
      severity:     sev,
      priority,
      title,
      narrative:    (gapInfo ? gapInfo.narrative : defaultNarrative(r, valStr)) + trendNote,
      kuantitatif:  gapInfo ? { needed: gapInfo.needed, unit: gapInfo.unit } : null,
      actionItems:  actions.slice(0, 3),
    });
  });

  // Sort: LAMEMBA bad first, then by severity desc
  items.sort((a, b) => {
    const la = a.ratio.lameba ? 1 : 0;
    const lb = b.ratio.lameba ? 1 : 0;
    if (lb !== la) return lb - la;
    return b.severity - a.severity;
  });

  return items;
}

function buildTitle(r, valStr) {
  const titles = {
    L1_RK:   `Tingkatkan Kemandirian Keuangan (saat ini ${valStr}, target ≥ 30%)`,
    L2_REO:  `Naikkan Efisiensi Operasional (saat ini ${valStr}, target ≥ 65%)`,
    L3_VA:   `Perketat Disiplin Anggaran (rata-rata varians ${valStr}, target ≤ 10%)`,
    L4_RISDM:`Tambah Investasi SDM (saat ini ${valStr}, target ≥ 15%)`,
    L5_RISP: `Tingkatkan Investasi Sarpras (saat ini ${valStr}, target ≥ 20%)`,
    L6_GRR:  `Akselerasi Pertumbuhan Pendapatan (saat ini ${valStr}, target ≥ 5%)`,
    L8_IKK:  `Perbaiki IKK (saat ini ${valStr}, target ≥ 2.5)`,
    L9_RL:   `Perkuat Likuiditas (RL ${valStr}, target ≥ 1.00×)`,
    L10_ATT: `Rebalancing Alokasi Tridharma (indeks ${valStr})`,
    dscr:    `Perkuat Debt Coverage (DSCR ${valStr}, target ≥ 2.00×)`,
    icr:     `Naikkan Interest Coverage (${valStr}, target ≥ 3.00×)`,
    debtAssets:`Turunkan Leverage (Debt/Assets ${valStr}, target < 25%)`,
    tuitDep: `Kurangi Ketergantungan SPP (saat ini ${valStr}, target < 50%)`,
    revConc: `Diversifikasi Pendapatan (konsentrasi ${valStr}, target < 60%)`,
  };
  return titles[r.id] || `Perbaiki ${r.name} (${valStr} vs target ${r.target})`;
}

function defaultNarrative(r, valStr) {
  return `Nilai saat ini ${valStr} belum memenuhi target ${r.target}. Tinjau komponen penyusun rasio dan lakukan penyesuaian kebijakan yang relevan.`;
}

// ─── Executive Summary ────────────────────────────────────────────────────────
function buildExecSummary(result, data) {
  const v = result.verdict;
  const cfi = result.CFI_total.toFixed(1);
  const lam = result.lamebaTerpenuhi;
  const ikk = result.IKK ? result.IKK.toFixed(2) : '—';

  const verdictDesc = {
    SANGAT_BAIK: 'Keuangan institusi berada dalam kondisi sangat kuat',
    BAIK:        'Keuangan institusi dalam kondisi baik dan stabil',
    PERHATIAN:   'Keuangan institusi memerlukan perhatian dan perbaikan pada beberapa indikator',
    BERISIKO:    'Keuangan institusi berada dalam kondisi berisiko dan memerlukan tindakan segera',
  };

  // Top 3 strengths (ok ratios with highest score)
  const strengths = result.ratios
    .filter(r => r.status === 'ok' && typeof r.score === 'number')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Top 3 weaknesses (bad/warn ratios sorted by severity)
  const weaknesses = result.ratios
    .filter(r => r.status === 'bad' || r.status === 'warn')
    .sort((a, b) => {
      const la = a.lameba ? 1 : 0, lb = b.lameba ? 1 : 0;
      if (lb !== la) return lb - la;
      return severity(b) - severity(a);
    })
    .slice(0, 3);

  // Trend signal across 3 years for total revenue
  const d = result.derived;
  const revTrend = d.TS && d['TS-1'] && d['TS-2']
    ? trend3(d.TS.totalRev, d['TS-1'].totalRev, d['TS-2'].totalRev) : 'stable';

  const sentVerdictLine = `${verdictDesc[v]} dengan skor CFI ${cfi}/100 dan ${lam} dari 10 indikator LAMEMBA terpenuhi (IKK ${ikk}/4.00).`;
  const sentStrength = strengths.length
    ? `Kekuatan utama: ${strengths.map(r => r.name).join(', ')}.`
    : '';
  const sentWeakness = weaknesses.length
    ? `Area yang perlu diperbaiki: ${weaknesses.map(r => r.name).join(', ')}.`
    : 'Semua indikator utama terpenuhi.';
  const sentTrend = `Tren pendapatan 3 tahun: ${trendLabel(revTrend)}.`;
  const sentAction = weaknesses.length
    ? `Prioritaskan perbaikan ${weaknesses[0].name} untuk peningkatan predikat terdekat.`
    : 'Pertahankan kinerja keuangan saat ini dan tingkatkan target ke predikat lebih tinggi.';

  return [sentVerdictLine, sentStrength, sentWeakness, sentTrend, sentAction]
    .filter(Boolean).join(' ');
}

// ─── Rich Narrative Generator (deterministic) ────────────────────────────────
// Returns structured output: { headline, paragraphs[], callouts[] }
// Used by PrintReport executive summary
function buildNarrative(result, data) {
  const v = result.verdict;
  const cfi = result.CFI_total;
  const lam = result.lamebaTerpenuhi;
  const ikk = result.IKK || 0;
  const d = result.derived || {};
  const TS = d.TS || {};
  const TS1 = d['TS-1'] || {};
  const TS2 = d['TS-2'] || {};

  const verdictLabels = {
    SANGAT_BAIK: 'SANGAT BAIK',
    BAIK: 'BAIK',
    PERHATIAN: 'PERHATIAN',
    BERISIKO: 'BERISIKO',
  };

  // ═══ Headline ═══
  const headline = (() => {
    if (v === 'SANGAT_BAIK') {
      return `Kondisi keuangan institusi berada dalam kategori ${verdictLabels[v]} dengan fondasi yang sangat kuat untuk mendukung tridharma dan ekspansi strategis.`;
    } else if (v === 'BAIK') {
      return `Kondisi keuangan institusi tergolong ${verdictLabels[v]}, memenuhi standar LAMEMBA dengan beberapa ruang optimasi untuk mencapai predikat tertinggi.`;
    } else if (v === 'PERHATIAN') {
      return `Kondisi keuangan institusi memerlukan ${verdictLabels[v].toLowerCase()} pada beberapa indikator kritis sebelum dapat mempertahankan akreditasi.`;
    } else {
      return `Kondisi keuangan institusi berada dalam kategori ${verdictLabels[v]} dan memerlukan tindakan korektif segera untuk menjaga kelangsungan operasional.`;
    }
  })();

  // ═══ Paragraphs ═══
  const paragraphs = [];

  // P1: Overall scorecard
  const cfiGap = (() => {
    if (cfi >= 85) return null;
    if (cfi >= 70) return { to: 'SANGAT BAIK', gap: 85 - cfi };
    if (cfi >= 50) return { to: 'BAIK', gap: 70 - cfi };
    return { to: 'PERHATIAN', gap: 50 - cfi };
  })();
  let p1 = `Skor Composite Financial Index (CFI) institusi adalah ${cfi.toFixed(1)} dari 100, dengan ${lam} dari 10 indikator LAMEMBA terpenuhi dan Indeks Kinerja Keuangan (IKK) sebesar ${ikk.toFixed(2)} dari 4.00.`;
  if (cfiGap) {
    p1 += ` Untuk mencapai predikat ${cfiGap.to}, dibutuhkan peningkatan CFI sebesar ${cfiGap.gap.toFixed(1)} poin.`;
  } else {
    p1 += ` Skor ini berada di atas threshold predikat tertinggi (≥ 85) — kinerja yang patut dipertahankan.`;
  }
  paragraphs.push(p1);

  // P2: Year-over-year revenue trend
  if (TS.totalRev && TS1.totalRev && TS2.totalRev) {
    const yoy = ((TS.totalRev - TS1.totalRev) / TS1.totalRev) * 100;
    const cagr = (Math.pow(TS.totalRev / TS2.totalRev, 0.5) - 1) * 100;
    const trendLabel = yoy > 5 ? 'tumbuh positif' : yoy > 0 ? 'tumbuh tipis' : yoy > -5 ? 'stagnan' : 'menurun';
    paragraphs.push(
      `Total pendapatan ${trendLabel} ${Math.abs(yoy).toFixed(1)}% year-over-year (TS-1 → TS), dengan CAGR 2 tahun sebesar ${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%. ${yoy > 5 ? 'Trajektori pertumbuhan yang sehat mendukung kapasitas investasi dan ekspansi.' : yoy > 0 ? 'Pertumbuhan moderat — diversifikasi sumber pendapatan dapat memperkuat resiliensi.' : yoy > -5 ? 'Pendapatan relatif stabil — fokus pada efisiensi operasional dan pengembangan sumber pendapatan baru.' : 'Penurunan pendapatan memerlukan analisis mendalam terhadap demand mahasiswa dan struktur biaya.'}`
    );
  }

  // P3: Expense composition
  if (TS.totalExp && TS.expOps) {
    const opsRatio = (TS.expOps / TS.totalExp) * 100;
    const sdmRatio = (TS.expSDM / TS.totalExp) * 100;
    const capexRatio = ((TS.expCapex || 0) + (TS.expMaint || 0)) / TS.totalExp * 100;
    const opsOk = opsRatio >= 65;
    const sdmOk = sdmRatio >= 15;
    const capexOk = capexRatio >= 20;
    const okCount = [opsOk, sdmOk, capexOk].filter(Boolean).length;
    paragraphs.push(
      `Komposisi pengeluaran menunjukkan REO ${opsRatio.toFixed(1)}% (target ≥65%), RISDM ${sdmRatio.toFixed(1)}% (target ≥15%), dan RISP ${capexRatio.toFixed(1)}% (target ≥20%). ${okCount === 3 ? 'Ketiga rasio efisiensi terpenuhi — alokasi sumber daya konsisten dengan best practice manajemen PT.' : okCount === 2 ? 'Dua dari tiga rasio efisiensi terpenuhi; satu komponen perlu rebalancing.' : okCount === 1 ? 'Hanya satu dari tiga rasio efisiensi yang memenuhi target; restrukturisasi alokasi anggaran direkomendasikan.' : 'Ketiga rasio efisiensi belum memenuhi target — review menyeluruh alokasi biaya operasional diperlukan.'}`
    );
  }

  // P4: Strengths & weaknesses summary
  const strengths = result.ratios
    .filter(r => r.status === 'ok')
    .sort((a, b) => (b.lameba ? 1 : 0) - (a.lameba ? 1 : 0))
    .slice(0, 3);
  const weaknesses = result.ratios
    .filter(r => r.status === 'bad' || r.status === 'warn')
    .sort((a, b) => {
      const la = a.lameba ? 1 : 0, lb = b.lameba ? 1 : 0;
      if (lb !== la) return lb - la;
      return (a.status === 'bad' ? 1 : 0) - (b.status === 'bad' ? 1 : 0);
    })
    .slice(0, 3);

  if (strengths.length > 0) {
    const items = strengths.map(s => s.name).join(', ');
    paragraphs.push(
      `Kekuatan utama institusi terletak pada: ${items}. Indikator-indikator ini menjadi modal untuk akselerasi pertumbuhan dan diferensiasi kompetitif.`
    );
  }
  if (weaknesses.length > 0) {
    const items = weaknesses.map(w => w.name + (w.lameba ? ' (LAMEMBA wajib)' : '')).join(', ');
    paragraphs.push(
      `Area yang memerlukan perhatian prioritas: ${items}. ${weaknesses.filter(w => w.lameba).length > 0 ? 'Indikator yang ditandai LAMEMBA wajib harus diperbaiki untuk mempertahankan/meningkatkan akreditasi.' : 'Walau bukan indikator wajib LAMEMBA, perbaikan area ini akan memperkuat profil keuangan keseluruhan.'}`
    );
  }

  // ═══ Callouts (decision-support snippets) ═══
  const callouts = [];

  // Verdict-aware callout
  if (v === 'SANGAT_BAIK') {
    callouts.push({
      type: 'positive',
      title: 'Status Sustainable',
      body: 'Institusi berada di posisi finansial sustainable. Fokus berikutnya: optimasi yield endowment dan pengembangan program strategis jangka panjang.',
    });
  } else if (v === 'BERISIKO') {
    callouts.push({
      type: 'risk',
      title: 'Tindakan Mendesak',
      body: 'Profil keuangan menunjukkan risiko material terhadap kelangsungan operasional. Diperlukan rapat darurat senat untuk merancang turnaround plan dalam 90 hari.',
    });
  }

  // Liquidity callout
  const liquidityRatio = result.ratios.find(r => r.id === 'L9_RL');
  if (liquidityRatio) {
    if (liquidityRatio.v < 1.0) {
      callouts.push({
        type: 'risk',
        title: 'Likuiditas di Bawah Threshold',
        body: `Rasio Likuiditas ${liquidityRatio.v.toFixed(2)}× berada di bawah target LAMEMBA L9 (≥ 1.00×). Aset lancar tidak cukup menutup kewajiban jangka pendek — perlu injeksi kas atau restrukturisasi utang.`,
      });
    } else if (liquidityRatio.v < 1.5) {
      callouts.push({
        type: 'warning',
        title: 'Likuiditas Marginal',
        body: `Rasio Likuiditas ${liquidityRatio.v.toFixed(2)}× memenuhi minimum LAMEMBA namun margin tipis. Pertimbangkan menambah cash reserve untuk buffer 6 bulan operasional.`,
      });
    }
  }

  // DSCR callout
  const dscr = result.ratios.find(r => r.id === 'dscr');
  if (dscr && dscr.v < 1.5) {
    callouts.push({
      type: 'warning',
      title: 'Debt Service Capacity',
      body: `DSCR ${dscr.v.toFixed(2)}× mendekati threshold kritis. EBITDA tidak jauh dari kewajiban cicilan utang; pertimbangkan refinancing atau pelunasan dipercepat.`,
    });
  }

  // Tridharma compliance
  if (TS.expOps && TS.triPend && TS.triRiset && TS.triPkM) {
    const triTotal = TS.triPend + TS.triRiset + TS.triPkM;
    if (triTotal > 0) {
      const pP = (TS.triPend / triTotal) * 100;
      const pR = (TS.triRiset / triTotal) * 100;
      const pM = (TS.triPkM / triTotal) * 100;
      const dev = Math.max(Math.abs(pP - 50), Math.abs(pR - 30), Math.abs(pM - 20));
      if (dev > 10) {
        callouts.push({
          type: 'warning',
          title: 'Alokasi Tridharma Tidak Seimbang',
          body: `Proporsi Pend/Riset/PkM adalah ${pP.toFixed(0)}%/${pR.toFixed(0)}%/${pM.toFixed(0)}% — deviasi ${dev.toFixed(0)} pp dari target LAMEMBA L10 (50/30/20). Rebalance alokasi anggaran tridharma direkomendasikan.`,
        });
      }
    }
  }

  // Endowment opportunity callout
  if (TS.bsEndowment && TS.bsAsetTetap) {
    const endowRatio = TS.bsEndowment / TS.bsAsetTetap;
    if (endowRatio > 1.5) {
      callouts.push({
        type: 'info',
        title: 'Endowment Dominan',
        body: `Endowment sebesar ${(endowRatio).toFixed(2)}× aset tetap. Potensi memperluas spending rate (target sehat 4–6%) untuk pendanaan beasiswa atau program strategis.`,
      });
    } else if (TS.bsEndowment < TS.totalRev * 0.5) {
      callouts.push({
        type: 'info',
        title: 'Pengembangan Endowment',
        body: 'Endowment relatif kecil terhadap pendapatan tahunan. Program fundraising alumni dan donasi terstruktur dapat memperkuat resiliensi jangka panjang.',
      });
    }
  }

  // Limit to top 4 callouts to avoid overload
  return {
    headline,
    paragraphs,
    callouts: callouts.slice(0, 4),
  };
}

// ─── Expose ───────────────────────────────────────────────────────────────────
window.buildAnalysis   = buildAnalysis;
window.buildExecSummary = buildExecSummary;
window.buildNarrative  = buildNarrative;

})();
