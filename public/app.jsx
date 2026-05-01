// Main app — wizard shell that wires all the pieces together
const { useState, useEffect, useMemo, useRef } = React;

const EMPTY_YEAR = Object.fromEntries(Object.keys(window.FIELDS).map(k => [k, 0]));
const EMPTY_DATA = { TS: { ...EMPTY_YEAR }, 'TS-1': { ...EMPTY_YEAR }, 'TS-2': { ...EMPTY_YEAR } };

const STORAGE_KEY = 'rkk_data_v1';
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showRecommendations": true,
  "highlightLameba": true,
  "numberFormat": "compact",
  "accentColor": "#b8862c"
}/*EDITMODE-END*/;

function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(EMPTY_DATA));
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweak, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawerRatio, setDrawerRatio] = useState(null);
  const [resultTab, setResultTab] = useState('overview');
  const [whatIf, setWhatIf] = useState({ enabled: false, overrides: {} });
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'offline'
  const saveTimer = useRef(null);

  // On mount: try to restore state from server, fallback to localStorage
  useEffect(() => {
    if (typeof window.apiGetState !== 'function') return; // api.js not loaded
    window.apiGetState().then(res => {
      if (res && res.data) {
        setData(res.data);
        setSaveStatus('saved');
      }
    }).catch(err => {
      // 404 = no state saved yet (normal on first run), other errors = offline
      if (err.status !== 404) setSaveStatus('offline');
    });
  }, []);

  // Auto-save: persist to localStorage immediately + debounce server save 1.5s
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    if (typeof window.apiSaveState !== 'function') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      window.apiSaveState(data)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('offline'));
    }, 1500);
  }, [data]);

  const onChange = (yr, key, val) => {
    setData(d => ({ ...d, [yr]: { ...d[yr], [key]: val } }));
  };
  const loadPreset = (key) => {
    setData(JSON.parse(JSON.stringify(window.PRESETS[key])));
    setStep(1);
  };
  const reset = () => setData(JSON.parse(JSON.stringify(EMPTY_DATA)));
  const copyToTS = (fromYr) => {
    setData(d => ({ ...d, TS: { ...d.TS, ...d[fromYr] } }));
  };

  // Apply what-if overrides on top of data
  const effectiveData = useMemo(() => {
    if (!whatIf.enabled) return data;
    return { ...data, TS: { ...data.TS, ...whatIf.overrides } };
  }, [data, whatIf]);

  const result = useMemo(() => window.computeAll(effectiveData), [effectiveData]);

  return (
    <div className={'app density-' + tweak.density} style={{'--accent': tweak.accentColor}}>
      <Header step={step} onStep={setStep} onReset={reset} onTweaks={() => setTweaksOpen(true)} saveStatus={saveStatus} />
      <Sidebar step={step} onStep={setStep} result={result} hasData={hasAnyData(data)} />
      <main className="main">
        {step === 0 && <StepStart onPreset={loadPreset} onBlank={() => { reset(); setStep(1); }} />}
        {step === 1 && <window.StepRev data={data} onChange={onChange} />}
        {step === 2 && <window.StepExp data={data} onChange={onChange} />}
        {step === 3 && <window.StepBS data={data} onChange={onChange} />}
        {step === 4 && <window.StepBudget data={data} onChange={onChange} />}
        {step === 5 && <window.StepTri data={data} onChange={onChange} />}
        {step === 6 && <window.StepPeople data={data} onChange={onChange} />}
        {step === 7 && <ResultPage result={result} data={data} tab={resultTab} setTab={setResultTab}
                                   whatIf={whatIf} setWhatIf={setWhatIf} onPickRatio={setDrawerRatio}
                                   showRecs={tweak.showRecommendations} />}
        {step !== 0 && <StepNav step={step} onStep={setStep} onCopyTS1={() => copyToTS('TS-1')} />}
      </main>
      <window.RatioDrawer ratio={drawerRatio} onClose={() => setDrawerRatio(null)} />
      {tweaksOpen && <TweaksPanel title="Tweaks" onClose={() => setTweaksOpen(false)}>
        <TweakSection title="Tampilan">
          <TweakRadio label="Density" value={tweak.density} onChange={v => setTweak('density', v)}
            options={[{value:'compact',label:'Padat'},{value:'comfortable',label:'Sedang'},{value:'roomy',label:'Lega'}]} />
          <TweakRadio label="Format Angka" value={tweak.numberFormat} onChange={v => setTweak('numberFormat', v)}
            options={[{value:'compact',label:'Ringkas'},{value:'full',label:'Penuh'}]} />
          <TweakColor label="Warna Aksen" value={tweak.accentColor} onChange={v => setTweak('accentColor', v)} />
        </TweakSection>
        <TweakSection title="Hasil">
          <TweakToggle label="Tampilkan Rekomendasi" value={tweak.showRecommendations} onChange={v => setTweak('showRecommendations', v)} />
          <TweakToggle label="Highlight LAMEMBA" value={tweak.highlightLameba} onChange={v => setTweak('highlightLameba', v)} />
        </TweakSection>
      </TweaksPanel>}
    </div>
  );
}

function hasAnyData(d) {
  return Object.values(d.TS).some(v => v && v !== 0);
}

function Header({ step, onStep, onReset, onTweaks, saveStatus }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo-mark">RK</div>
        <div>
          <div className="brand-name">Rasio Keuangan Kampus</div>
          <div className="brand-sub">Simulator LAMEMBA · Composite Financial Index</div>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="step-pill">Langkah {step + 1} / 8</span>
        {saveStatus === 'saving'  && <span className="save-status saving">⟳ Menyimpan…</span>}
        {saveStatus === 'saved'   && <span className="save-status saved">✓ Tersimpan</span>}
        {saveStatus === 'offline' && <span className="save-status offline" title="Server tidak tersedia — data disimpan lokal">⚠ Offline</span>}
        <button className="btn-ghost" onClick={onReset}>Reset Data</button>
      </div>
    </header>
  );
}

function Sidebar({ step, onStep, result, hasData }) {
  return (
    <aside className="sidebar">
      <div className="side-eyebrow">Wizard</div>
      <ol className="side-steps">
        {window.STEPS.map((s, i) => (
          <li key={s.id} className={'side-step ' + (step === i ? 'active' : '') + (i < step ? ' done' : '')}
              onClick={() => { if (i === 0 || hasData) onStep(i); }}>
            <span className="num">{s.n === 0 ? '·' : s.n}</span>
            <div>
              <div className="t">{s.title}</div>
              <div className="d">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
      {hasData && result && (
        <div className="side-summary">
          <div className="ss-label">Status saat ini</div>
          <div className={'ss-pill v-' + result.verdict}>{window.VERDICT_INFO[result.verdict].label}</div>
          <div className="ss-meta">CFI {result.CFI_total.toFixed(1)} · LAMEMBA {result.lamebaTerpenuhi}/10</div>
        </div>
      )}
    </aside>
  );
}

function StepNav({ step, onStep, onCopyTS1 }) {
  return (
    <div className="step-nav">
      <button className="btn-ghost" disabled={step <= 0} onClick={() => onStep(step - 1)}>← Sebelumnya</button>
      <div className="step-nav-mid">
        {step >= 1 && step <= 6 && (
          <button className="btn-link" onClick={onCopyTS1}>↻ Salin TS-1 → TS</button>
        )}
      </div>
      <button className="btn-primary" disabled={step >= 7} onClick={() => onStep(step + 1)}>
        {step === 6 ? 'Hitung & Lihat Hasil' : 'Lanjut'} →
      </button>
    </div>
  );
}

function StepStart({ onPreset, onBlank }) {
  return (
    <div className="step-start">
      <div className="hero">
        <div className="eyebrow">Simulator Rasio Keuangan Perguruan Tinggi</div>
        <h1>Hitung kesehatan keuangan kampus Anda<br/>dalam 8 langkah.</h1>
        <p>Berdasarkan 29 rasio keuangan, 10 indikator wajib LAMEMBA, dan metodologi Composite Financial Index. Simulasikan dampak perubahan kebijakan secara langsung pada predikat akreditasi keuangan.</p>
      </div>
      <div className="preset-grid">
        <div className="preset-eyebrow">Mulai dari preset</div>
        {Object.entries(window.PRESETS).map(([k, p]) => (
          <button key={k} className={'preset-card v-' + k} onClick={() => onPreset(k)}>
            <div className="pc-tag" style={{borderColor: p.color, color: p.color}}>{p.label}</div>
            <div className="pc-desc">{p.desc}</div>
            <div className="pc-stat">
              <span>Mhs aktif</span>
              <b>{p.TS.mhsCount.toLocaleString('id-ID')}</b>
            </div>
            <div className="pc-stat">
              <span>Total Pendapatan</span>
              <b>{window.fmtRp(window.computeYear(p.TS).totalRev)}</b>
            </div>
            <div className="pc-cta">Mulai dengan data ini →</div>
          </button>
        ))}
        <button className="preset-card preset-blank" onClick={onBlank}>
          <div className="pc-tag" style={{borderColor:'#5b6a82', color:'#5b6a82'}}>KOSONG</div>
          <div className="pc-desc">Mulai dari nol. Masukkan data laporan keuangan kampus Anda sendiri.</div>
          <div className="pc-cta">Input dari nol →</div>
        </button>
      </div>
    </div>
  );
}

// =============== RESULT PAGE ===============
function ResultPage({ result, data, tab, setTab, whatIf, setWhatIf, onPickRatio, showRecs }) {
  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'lameba', label: 'LAMEMBA (10)' },
    { id: 'ratios', label: 'Semua Rasio (29)' },
    { id: 'composition', label: 'Komposisi' },
    { id: 'compare', label: 'Benchmark' },
    { id: 'whatif', label: 'What-If' },
    { id: 'recs', label: 'Rekomendasi' },
  ];
  return (
    <div className="result-page">
      <window.VerdictHero verdict={result.verdict} CFI={result.CFI_total} lameba={result.lamebaTerpenuhi} />
      <div className="result-tabs-row">
        <div className="result-tabs">
          {tabs.map(t => (
            <button key={t.id} className={'rt ' + (tab === t.id ? 'active' : '')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn-print no-print" onClick={() => window.print()} title="Cetak / Export PDF">
          🖨 Cetak / PDF
        </button>
      </div>
      <div className="result-body">
        {tab === 'overview' && <OverviewTab result={result} data={data} onPickRatio={onPickRatio} />}
        {tab === 'lameba' && <LamebaTab result={result} onPickRatio={onPickRatio} />}
        {tab === 'ratios' && <RatiosTab result={result} onPickRatio={onPickRatio} />}
        {tab === 'composition' && <CompositionTab data={data} result={result} />}
        {tab === 'compare' && <CompareTab result={result} />}
        {tab === 'whatif' && <WhatIfTab data={data} whatIf={whatIf} setWhatIf={setWhatIf} result={result} />}
        {tab === 'recs' && (showRecs ? <RecsTab result={result} data={data} /> : <div className="empty">Rekomendasi dinonaktifkan dari panel Tweaks.</div>)}
      </div>
    </div>
  );
}

function OverviewTab({ result, data, onPickRatio }) {
  const ikk = result.ratios.find(r => r.id === 'L8_IKK');
  const execSummary = window.buildExecSummary ? window.buildExecSummary(result, data) : null;
  return (
    <div className="overview-grid">
      {execSummary && (
        <div className="exec-summary-card" style={{gridColumn:'1/-1'}}>
          <div className="es-eyebrow">Ringkasan Eksekutif</div>
          <p className="es-text">{execSummary}</p>
        </div>
      )}
      <div className="card">
        <div className="card-h">
          <h3>Indeks Kinerja Keuangan (IKK)</h3>
          <span className="card-eyebrow">Skala 0 – 4</span>
        </div>
        <window.GaugeIKK value={ikk ? ikk.v : 0} components={result.IKK_components} />
        <p className="card-note">Komposit RK + REO + RL + GRR. Standar LAMEMBA: ≥ 2.5</p>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>CFI Scorecard</h3>
          <span className="card-eyebrow">5 dimensi · skor 0–100</span>
        </div>
        <div style={{display:'flex',justifyContent:'center'}}>
          <window.RadarChart scorecard={result.scorecard} />
        </div>
        <div className="cfi-list">
          {result.scorecard.map(s => (
            <div key={s.k} className="cfi-row">
              <span className="cfi-k">{s.k}</span>
              <span className="cfi-bar"><span style={{width: s.score + '%'}}></span></span>
              <span className="cfi-v mono">{s.score.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card span-2">
        <div className="card-h">
          <h3>10 Indikator LAMEMBA</h3>
          <span className="card-eyebrow">{result.lamebaTerpenuhi} / 10 terpenuhi</span>
        </div>
        <window.LamebaList ratios={result.ratios} onPick={onPickRatio} />
      </div>
    </div>
  );
}

function LamebaTab({ result, onPickRatio }) {
  const lams = result.ratios.filter(r => r.lameba).sort((a, b) => parseInt(a.no.slice(1)) - parseInt(b.no.slice(1)));
  return (
    <div>
      <div className="section-eyebrow">10 Indikator Wajib LAMEMBA</div>
      <p className="section-desc">Indikator wajib akreditasi keuangan. Untuk predikat <b>BAIK</b> minimal 6 dari 10, untuk <b>SANGAT BAIK</b> minimal 8 dari 10.</p>
      <div className="ratio-grid">
        {lams.map(r => <window.RatioCard key={r.id} r={r} onClick={onPickRatio} />)}
      </div>
    </div>
  );
}

function RatiosTab({ result, onPickRatio }) {
  const grouped = {};
  result.ratios.forEach(r => { (grouped[r.cat] = grouped[r.cat] || []).push(r); });
  return (
    <div>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{marginBottom: 32}}>
          <div className="section-eyebrow">{cat}</div>
          <div className="ratio-grid">
            {items.map(r => <window.RatioCard key={r.id} r={r} onClick={onPickRatio} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompositionTab({ data, result }) {
  const TS = data.TS;
  const revItems = [
    { label: 'SPP/UKT (Net)', value: (TS.revSppGross || 0) + (TS.revBeasiswa || 0) },
    { label: 'Pemerintah', value: TS.revPemerintah || 0 },
    { label: 'Riset & Hibah', value: TS.revRiset || 0 },
    { label: 'Donasi', value: TS.revDonasi || 0 },
    { label: 'Auxiliary', value: TS.revAux || 0 },
    { label: 'Endowment Ops', value: TS.revEndowOps || 0 },
    { label: 'Lain-lain', value: TS.revLain || 0 },
  ].filter(x => x.value > 0);
  const expItems = [
    { label: 'Operasional Tridharma', value: TS.expOps || 0 },
    { label: 'Administrasi', value: TS.expAdmin || 0 },
    { label: 'Pengembangan SDM', value: TS.expSDM || 0 },
    { label: 'CapEx Sarpras', value: TS.expCapex || 0 },
    { label: 'Pemeliharaan', value: TS.expMaint || 0 },
    { label: 'Tunjangan Dosen', value: TS.expFaculty || 0 },
    { label: 'Depresiasi', value: TS.expDepr || 0 },
    { label: 'Bunga', value: TS.expInterest || 0 },
    { label: 'Lain-lain', value: TS.expLain || 0 },
  ].filter(x => x.value > 0);
  const triItems = [
    { label: 'Pendidikan', value: TS.triPend || 0 },
    { label: 'Penelitian', value: TS.triRiset || 0 },
    { label: 'PkM', value: TS.triPkM || 0 },
  ];
  const totalRev = revItems.reduce((a, b) => a + b.value, 0);
  const totalExp = expItems.reduce((a, b) => a + b.value, 0);
  const totalTri = triItems.reduce((a, b) => a + b.value, 0);
  return (
    <div className="comp-grid">
      <div className="card"><window.StackedBar items={revItems} title="Komposisi Pendapatan" total={totalRev} /></div>
      <div className="card"><window.StackedBar items={expItems} title="Komposisi Pengeluaran" total={totalExp} /></div>
      <div className="card span-2"><window.StackedBar items={triItems} title="Alokasi Tridharma" total={totalTri} /></div>
      <div className="card span-2">
        <div className="card-h"><h3>Tren 3 Tahun</h3><span className="card-eyebrow">TS-2 → TS-1 → TS</span></div>
        <TrendTable derived={result.derived} />
      </div>
    </div>
  );
}

function TrendTable({ derived }) {
  const rows = [
    { k: 'totalRev', label: 'Total Pendapatan' },
    { k: 'totalExp', label: 'Total Pengeluaran' },
    { k: 'ebitda', label: 'EBITDA' },
    { k: 'totalAset', label: 'Total Aset' },
    { k: 'netTuition', label: 'Net Tuition' },
  ];
  return (
    <table className="trend-table">
      <thead>
        <tr><th></th><th>TS-2</th><th>TS-1</th><th>TS</th><th>Δ vs TS-1</th></tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const a = derived['TS-2'] && derived['TS-2'][r.k];
          const b = derived['TS-1'] && derived['TS-1'][r.k];
          const c = derived.TS && derived.TS[r.k];
          const delta = b ? ((c - b) / Math.abs(b)) * 100 : null;
          return (
            <tr key={r.k}>
              <td>{r.label}</td>
              <td className="mono">{window.fmtRp(a)}</td>
              <td className="mono">{window.fmtRp(b)}</td>
              <td className="mono"><b>{window.fmtRp(c)}</b></td>
              <td className="mono" style={{color: delta > 0 ? '#2f6b3d' : delta < 0 ? '#9b2c2c' : '#5b6a82'}}>
                {delta === null ? '—' : (delta > 0 ? '+' : '') + delta.toFixed(1) + '%'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CompareTab({ result }) {
  return (
    <div>
      <div className="section-eyebrow">Benchmark vs 4 Predikat</div>
      <p className="section-desc">Perbandingan nilai Anda terhadap nilai referensi tiap predikat. Klik baris untuk detail.</p>
      <div className="compare-table">
        <div className="ct-head">
          <div>Rasio</div>
          <div>Anda (TS)</div>
          <div className="ct-cell">SANGAT BAIK</div>
          <div className="ct-cell">BAIK</div>
          <div className="ct-cell">PERHATIAN</div>
          <div className="ct-cell">BERISIKO</div>
        </div>
        {result.ratios.filter(r => r.benchmarks).map(r => {
          const bm = r.benchmarks;
          // closest match
          const dists = ['SANGAT_BAIK','BAIK','PERHATIAN','BERISIKO'].map(p => ({ p, d: Math.abs(r.v - bm[p]) }));
          const closest = dists.sort((a,b) => a.d - b.d)[0].p;
          return (
            <div key={r.id} className="ct-row">
              <div className="ct-name">
                {r.lameba && <span className="lam-badge">★</span>}
                <span>{r.name}</span>
              </div>
              <div className="ct-you mono">{window.fmtByType(r.v, r.format)}</div>
              {['SANGAT_BAIK','BAIK','PERHATIAN','BERISIKO'].map(p => (
                <div key={p} className={'ct-cell mono ' + (closest === p ? 'closest c-' + p : '')}>
                  {window.fmtByType(bm[p], r.format)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// What-If parameter definitions — min/max are absolute Rp multipliers of the baseline
// Used to compute slider bounds: sliderMin = base * multMin, sliderMax = base * multMax
const WHAT_IF_PARAMS = [
  { k: 'revSppGross', label: 'SPP/UKT Gross',         cat: 'Pendapatan', multMin: 0.5, multMax: 2.0,  fallback: 50000000000 },
  { k: 'revRiset',    label: 'Pendapatan Riset',       cat: 'Pendapatan', multMin: 0.0, multMax: 3.0,  fallback: 5000000000  },
  { k: 'revDonasi',   label: 'Donasi & Sumbangan',     cat: 'Pendapatan', multMin: 0.0, multMax: 5.0,  fallback: 2000000000  },
  { k: 'revAux',      label: 'Auxiliary',              cat: 'Pendapatan', multMin: 0.0, multMax: 3.0,  fallback: 5000000000  },
  { k: 'expOps',      label: 'Biaya Ops Langsung',     cat: 'Pengeluaran',multMin: 0.5, multMax: 1.5,  fallback: 40000000000 },
  { k: 'expAdmin',    label: 'Biaya Administrasi',     cat: 'Pengeluaran',multMin: 0.3, multMax: 2.0,  fallback: 5000000000  },
  { k: 'expSDM',      label: 'Anggaran SDM',           cat: 'Pengeluaran',multMin: 0.0, multMax: 3.0,  fallback: 8000000000  },
  { k: 'expCapex',    label: 'CapEx Sarpras',          cat: 'Pengeluaran',multMin: 0.0, multMax: 3.0,  fallback: 5000000000  },
  { k: 'expInterest', label: 'Beban Bunga',            cat: 'Pengeluaran',multMin: 0.0, multMax: 3.0,  fallback: 1000000000  },
  { k: 'bsKwjJP',    label: 'Kewajiban Jangka Pendek', cat: 'Neraca',    multMin: 0.0, multMax: 2.0,  fallback: 10000000000 },
  { k: 'bsKwjJPj',   label: 'Kewajiban Jangka Panjang',cat: 'Neraca',   multMin: 0.0, multMax: 2.0,  fallback: 20000000000 },
];

// Adaptive step for range slider based on magnitude
function adaptiveStep(max) {
  if (max <= 0) return 1000000;
  const mag = Math.pow(10, Math.floor(Math.log10(max)) - 1);
  return Math.max(1000000, mag);
}

function WhatIfTab({ data, whatIf, setWhatIf, result }) {
  const TS = data.TS;
  const TS1 = data['TS-1'];
  const baseline = React.useMemo(() => window.computeAll(data), [data]);

  const setOv = (k, v) => setWhatIf(w => ({ enabled: true, overrides: { ...w.overrides, [k]: v } }));
  const resetOne = (k) => setWhatIf(w => {
    const overrides = { ...w.overrides };
    delete overrides[k];
    return { enabled: Object.keys(overrides).length > 0, overrides };
  });
  const reset = () => setWhatIf({ enabled: false, overrides: {} });
  const activeCount = Object.keys(whatIf.overrides).length;

  const verdictRank = { SANGAT_BAIK: 4, BAIK: 3, PERHATIAN: 2, BERISIKO: 1 };
  const cfiDelta = result.CFI_total - baseline.CFI_total;
  const lamDelta = result.lamebaTerpenuhi - baseline.lamebaTerpenuhi;
  const verdictChanged = result.verdict !== baseline.verdict;
  const verdictDir = verdictChanged
    ? (verdictRank[result.verdict] > verdictRank[baseline.verdict] ? 'up' : 'down')
    : 'same';

  // Group by category
  const cats = [...new Set(WHAT_IF_PARAMS.map(p => p.cat))];

  return (
    <div>
      <div className="section-eyebrow">Simulasi What-If</div>
      <p className="section-desc">
        Geser slider atau ketik nilai langsung untuk melihat dampak ke predikat, CFI, dan LAMEMBA.{' '}
        <b>Data asli tidak berubah</b> — ini hanya simulasi.
      </p>

      {/* Live impact summary */}
      <div className="wi-impact">
        <div className="wi-imp-block">
          <div className="wi-imp-label">Predikat</div>
          <div className="wi-imp-row">
            <span className={'wi-pred v-' + baseline.verdict}>{window.VERDICT_INFO[baseline.verdict].label}</span>
            <span className={'wi-arrow ' + verdictDir}>→</span>
            <span className={'wi-pred v-' + result.verdict}>{window.VERDICT_INFO[result.verdict].label}</span>
          </div>
        </div>
        <div className="wi-imp-block">
          <div className="wi-imp-label">CFI Score</div>
          <div className="wi-imp-row">
            <span className="wi-num mono">{baseline.CFI_total.toFixed(1)}</span>
            <span className="wi-arrow">→</span>
            <span className={'wi-num mono big ' + (cfiDelta > 0 ? 'pos' : cfiDelta < 0 ? 'neg' : '')}>
              {result.CFI_total.toFixed(1)}
            </span>
            {cfiDelta !== 0 && (
              <span className={'wi-delta ' + (cfiDelta > 0 ? 'pos' : 'neg')}>
                {cfiDelta > 0 ? '+' : ''}{cfiDelta.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="wi-imp-block">
          <div className="wi-imp-label">LAMEMBA</div>
          <div className="wi-imp-row">
            <span className="wi-num mono">{baseline.lamebaTerpenuhi}/10</span>
            <span className="wi-arrow">→</span>
            <span className={'wi-num mono big ' + (lamDelta > 0 ? 'pos' : lamDelta < 0 ? 'neg' : '')}>
              {result.lamebaTerpenuhi}/10
            </span>
            {lamDelta !== 0 && (
              <span className={'wi-delta ' + (lamDelta > 0 ? 'pos' : 'neg')}>
                {lamDelta > 0 ? '+' : ''}{lamDelta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="whatif-toolbar">
        <div className="wi-status">
          {activeCount > 0
            ? <span><b>{activeCount}</b> parameter diubah · simulasi <b style={{color:'var(--accent)'}}>AKTIF</b></span>
            : <span style={{color:'var(--ink-3)'}}>Geser slider atau ketik nilai untuk mulai simulasi</span>}
        </div>
        {activeCount > 0 && (
          <button className="btn-ghost btn-sm" onClick={reset}>↻ Reset Semua</button>
        )}
      </div>

      {/* Sliders grouped by category */}
      {cats.map(cat => (
        <div key={cat} className="wi-cat-section">
          <div className="wi-cat-title">{cat}</div>
          <div className="whatif-grid">
            {WHAT_IF_PARAMS.filter(p => p.cat === cat).map(p => {
              // Effective baseline: TS value → TS-1 fallback → hardcoded fallback
              const rawBase = TS[p.k];
              const base = (rawBase !== undefined && rawBase !== 0 && rawBase !== '')
                ? rawBase
                : ((TS1 && TS1[p.k]) || p.fallback);
              const hasNoTS = !rawBase || rawBase === 0;

              const curRaw = whatIf.overrides[p.k];
              const cur = curRaw !== undefined ? curRaw : (rawBase || 0);

              const sliderMin = base * p.multMin;
              const sliderMax = base * p.multMax;
              const step = adaptiveStep(sliderMax);
              const sliderVal = Math.min(sliderMax, Math.max(sliderMin, curRaw !== undefined ? curRaw : (rawBase || 0)));

              const mult = base !== 0 ? sliderVal / base : 1;
              const dPct = (mult - 1) * 100;
              const isActive = whatIf.overrides[p.k] !== undefined;

              // Display value for the number input (in millions for readability)
              const dispVal = sliderVal;

              return (
                <div key={p.k} className={'wi-row' + (isActive ? ' active' : '')}>
                  <div className="wi-head">
                    <div className="wi-label-group">
                      <span className="wi-label">{p.label}</span>
                      {hasNoTS && (
                        <span className="wi-fallback-badge" title="Tidak ada data TS — menggunakan nilai default">
                          default
                        </span>
                      )}
                    </div>
                    <div className="wi-head-right">
                      <span className={'wi-mult mono ' + (dPct > 0 ? 'pos' : dPct < 0 ? 'neg' : '')}>
                        ×{mult.toFixed(2)}
                        {dPct !== 0 && <span className="wi-pct-badge">
                          {dPct > 0 ? '+' : ''}{dPct.toFixed(0)}%
                        </span>}
                      </span>
                      {isActive && (
                        <button className="wi-reset-one" onClick={() => resetOne(p.k)} title="Reset slider ini">✕</button>
                      )}
                    </div>
                  </div>

                  <div className="wi-controls">
                    {/* Slider */}
                    <div className="wi-slider-wrap">
                      <span className="wi-tick mono">×{p.multMin.toFixed(1)}</span>
                      <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={step}
                        value={sliderVal}
                        onChange={e => setOv(p.k, parseFloat(e.target.value))}
                        aria-label={p.label}
                        aria-valuemin={sliderMin}
                        aria-valuemax={sliderMax}
                        aria-valuenow={sliderVal}
                      />
                      <span className="wi-tick mono">×{p.multMax.toFixed(1)}</span>
                    </div>
                    {/* Numeric input */}
                    <div className="wi-num-input-wrap">
                      <input
                        type="number"
                        className="wi-num-input mono"
                        value={Math.round(sliderVal / 1000000)}
                        min={Math.round(sliderMin / 1000000)}
                        max={Math.round(sliderMax / 1000000)}
                        step={Math.round(step / 1000000) || 1}
                        onChange={e => {
                          const val = parseFloat(e.target.value) * 1000000;
                          if (!isNaN(val)) setOv(p.k, Math.min(sliderMax, Math.max(sliderMin, val)));
                        }}
                      />
                      <span className="wi-num-unit">juta</span>
                    </div>
                  </div>

                  <div className="wi-vals">
                    <span className="wi-base-val mono">
                      Baseline: {window.fmtRp(rawBase || 0)}
                      {hasNoTS && <span className="wi-fallback-note"> (pakai default)</span>}
                    </span>
                    <span className={'wi-cur-val mono ' + (dPct > 0 ? 'pos' : dPct < 0 ? 'neg' : '')}>
                      Simulasi: {window.fmtRp(sliderVal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {activeCount === 0 && (
        <div className="wi-empty-hint">
          Geser salah satu slider di atas — hasil simulasi langsung terlihat di panel atas.
        </div>
      )}
    </div>
  );
}

function RecsTab({ result, data }) {
  const recs = window.buildAnalysis ? window.buildAnalysis(result, data) : [];
  if (recs.length === 0) {
    return (
      <div className="empty-good">
        <div style={{fontSize:48,marginBottom:8}}>✓</div>
        <h3>Tidak ada rekomendasi kritis</h3>
        <p>Semua indikator LAMEMBA terpenuhi dengan baik. Pertahankan kinerja keuangan saat ini.</p>
      </div>
    );
  }

  const priorityLabel = { high: 'PRIORITAS TINGGI', 'med-high': 'PRIORITAS MENENGAH-TINGGI', med: 'PRIORITAS MENENGAH' };
  const priorityColor = { high: '#9b2c2c', 'med-high': '#b45309', med: '#1e6fb8' };

  return (
    <div>
      <div className="section-eyebrow">Rekomendasi & Analisis ({recs.length} item)</div>
      <p className="section-desc">
        Dihitung berdasarkan kondisi aktual, selisih ke target, dan tren 3 tahun.{' '}
        Prioritas <b style={{color:'#9b2c2c'}}>Tinggi</b> = indikator LAMEMBA wajib yang belum terpenuhi.
      </p>
      <div className="recs-list">
        {recs.map((rec, i) => (
          <div key={i} className={'rec-card pri-' + rec.priority}>
            <div className="rec-head">
              <span className="rec-pri" style={{background: priorityColor[rec.priority] + '18', color: priorityColor[rec.priority], border: '1px solid ' + priorityColor[rec.priority] + '40'}}>
                {priorityLabel[rec.priority] || 'PRIORITAS MENENGAH'}
              </span>
              <span className="rec-ind">
                {rec.ratio.lameba ? <span className="rec-star">★ LAMEMBA</span> : null}
                {rec.ratio.no} · {rec.ratio.name}
              </span>
            </div>

            <h4 className="rec-title">{rec.title}</h4>
            <p className="rec-narrative">{rec.narrative}</p>

            {rec.kuantitatif && rec.kuantitatif.needed !== null && (
              <div className="rec-quant">
                <span className="rq-label">Estimasi kebutuhan:</span>
                <span className="rq-val mono">{window.fmtRp ? window.fmtRp(rec.kuantitatif.needed) : rec.kuantitatif.needed}</span>
                <span className="rq-unit">{rec.kuantitatif.unit}</span>
              </div>
            )}

            {rec.actionItems && rec.actionItems.length > 0 && (
              <div className="rec-actions">
                <div className="ra-title">Langkah Tindakan:</div>
                <ol className="ra-list">
                  {rec.actionItems.map((a, j) => <li key={j}>{a}</li>)}
                </ol>
              </div>
            )}

            <div className="rec-meta">
              <span>Nilai saat ini: <b className="mono">{window.fmtByType(rec.ratio.v, rec.ratio.format)}</b></span>
              <span>Target: <b>{rec.ratio.target}</b></span>
              {rec.ratio.v1 !== undefined && (
                <span>TS-1: <b className="mono">{window.fmtByType(rec.ratio.v1, rec.ratio.format)}</b></span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
