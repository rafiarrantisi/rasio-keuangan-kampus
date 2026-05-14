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
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    const h = window.location.hash;
    if (h === '#app') return 'simulator';
    if (h === '#projects') return 'projects';
    if (h === '#compare') return 'compare';
    return 'landing';
  });
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
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activeProfile, setActiveProfile] = useState(null); // { id, name }
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const saveTimer  = useRef(null);
  const backendRef = useRef(null);

  // Hash-based routing for landing ↔ simulator ↔ projects ↔ compare
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#app') setView('simulator');
      else if (h === '#projects') setView('projects');
      else if (h === '#compare') setView('compare');
      else setView('landing');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goSimulator = () => { window.location.hash = '#app'; setView('simulator'); };
  const goLanding = () => { window.location.hash = '#landing'; setView('landing'); };
  const goProjects = () => { window.location.hash = '#projects'; setView('projects'); };
  const goCompare = () => { window.location.hash = '#compare'; setView('compare'); };
  const goDemo = () => {
    // Load BAIK preset and jump to results
    setData(JSON.parse(JSON.stringify(window.PRESETS.BAIK)));
    setStep(7);
    setResultTab('overview');
    goSimulator();
  };

  // Multi-project state
  const [compareProjects, setCompareProjects] = useState([]);

  // Open project from projects view
  const handleOpenProject = (proj) => {
    setData(proj.data);
    setActiveProfile({ id: proj.id, name: proj.name });
    setStep(7); // Jump to results
    setResultTab('overview');
    goSimulator();
  };

  // Create new project from projects view modal
  const handleNewProject = ({ name, description, campus_type, seedFrom }) => {
    const id = 'proj_' + Date.now();
    let projData;
    if (seedFrom && window.PRESETS[seedFrom]) {
      projData = JSON.parse(JSON.stringify(window.PRESETS[seedFrom]));
    } else {
      projData = JSON.parse(JSON.stringify(EMPTY_DATA));
    }
    setData(projData);
    setActiveProfile({ id, name });
    setStep(seedFrom ? 7 : 1);
    setResultTab('overview');
    // Save immediately so it appears in projects list
    if (typeof window.apiSaveProject === 'function') {
      const result = window.computeAll(projData);
      window.apiSaveProject(id, name, projData, {
        description,
        campus_type,
        tags: [],
        result_summary: {
          verdict: result.verdict,
          CFI_total: result.CFI_total,
          lameba_fulfilled: result.lamebaTerpenuhi,
          mhs_count: projData.TS?.mhsCount || 0,
        },
      }).catch(() => {});
    }
    goSimulator();
  };

  // Start comparison
  const handleStartCompare = async (ids) => {
    try {
      const projects = await Promise.all(ids.map(id => window.apiGetProject(id)));
      setCompareProjects(projects);
      goCompare();
    } catch (e) {}
  };

  // On mount: probe /api/health first, then restore state if backend is up
  useEffect(() => {
    if (typeof window.apiHealth !== 'function') return;
    window.apiHealth()
      .then(() => {
        backendRef.current = true;
        return window.apiGetState();
      })
      .then(res => {
        if (res && res.data) { setData(res.data); setSaveStatus('saved'); }
      })
      .catch(err => {
        if (backendRef.current === null) {
          // health check failed → no backend (static deploy / offline)
          backendRef.current = false;
        } else if (err && err.status !== 404) {
          // backend is up but returned an unexpected error
          setSaveStatus('offline');
        }
      });
  }, []);

  // Auto-save: always write localStorage; only call API when backend is confirmed up
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    if (typeof window.apiSaveState !== 'function') return;
    if (backendRef.current === false) return; // static deploy — skip API silently
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (backendRef.current === true) setSaveStatus('saving');
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
  const reset = () => {
    setData(JSON.parse(JSON.stringify(EMPTY_DATA)));
    window.showToast?.('Data direset ke kosong', { variant: 'info' });
  };
  const copyToTS = (fromYr) => {
    setData(d => ({ ...d, TS: { ...d.TS, ...d[fromYr] } }));
  };

  const handleSaveProfile = (name) => {
    const id = activeProfile?.id || 'proj_' + Date.now();
    const profileName = name || activeProfile?.name || 'Project Baru';
    let result_summary = null;
    try {
      const r = window.computeAll(data);
      result_summary = {
        verdict: r.verdict,
        CFI_total: r.CFI_total,
        lameba_fulfilled: r.lamebaTerpenuhi,
        mhs_count: data.TS?.mhsCount || 0,
      };
    } catch (e) {}
    window.apiSaveProfile(id, profileName, data, { result_summary })
      .then(() => {
        setActiveProfile({ id, name: profileName });
        setShowSaveDialog(false);
        setSaveStatus('saved');
        window.showToast?.('Project "' + profileName + '" tersimpan', { variant: 'success' });
      })
      .catch((e) => {
        setSaveStatus('offline');
        window.showToast?.('Gagal menyimpan — server tidak tersedia', { variant: 'error' });
      });
  };

  const handleLoadProfile = (profile) => {
    window.apiGetProfile(profile.id)
      .then(p => {
        setData(p.data);
        setActiveProfile({ id: p.id, name: p.name });
        setShowProfileModal(false);
        setStep(1);
        window.showToast?.('Project "' + p.name + '" dimuat', { variant: 'success' });
      })
      .catch(() => {
        window.showToast?.('Gagal memuat project', { variant: 'error' });
      });
  };

  const handleDeleteProfile = (id) => {
    const name = activeProfile?.id === id ? activeProfile.name : 'Project';
    window.apiDeleteProfile(id)
      .then(() => {
        window.showToast?.('Project dihapus', { variant: 'info' });
      })
      .catch(() => {
        window.showToast?.('Gagal menghapus project', { variant: 'error' });
      });
    if (activeProfile?.id === id) setActiveProfile(null);
  };

  // Apply what-if overrides on top of data
  const effectiveData = useMemo(() => {
    if (!whatIf.enabled) return data;
    return { ...data, TS: { ...data.TS, ...whatIf.overrides } };
  }, [data, whatIf]);

  const result = useMemo(() => window.computeAll(effectiveData), [effectiveData]);

  if (view === 'landing') {
    return (
      <div className="app view-landing" style={{'--accent': tweak.accentColor}}>
        <window.Landing onStart={goSimulator} onDemo={goDemo} onProjects={goProjects} />
      </div>
    );
  }

  if (view === 'projects') {
    return (
      <div className="app view-projects" style={{'--accent': tweak.accentColor}}>
        <window.ProjectsView
          activeProject={activeProfile}
          onOpenProject={handleOpenProject}
          onBackToLanding={goLanding}
          onNewProject={handleNewProject}
          onStartCompare={handleStartCompare}
        />
      </div>
    );
  }

  if (view === 'compare') {
    return (
      <div className="app view-compare" style={{'--accent': tweak.accentColor}}>
        {window.CompareView ? (
          <window.CompareView
            projects={compareProjects}
            onBack={goProjects}
            onClose={goLanding}
          />
        ) : (
          <div style={{padding:40,textAlign:'center',color:'#fff',background:'#142847',minHeight:'100vh'}}>
            <h2>Memuat Compare View…</h2>
            <p>Jika tidak muncul, kembali ke <button className="btn-link" onClick={goProjects}>Project</button></p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={'app view-app density-' + tweak.density} style={{'--accent': tweak.accentColor}}>
      <Header step={step} onStep={setStep} onReset={reset} onTweaks={() => setTweaksOpen(true)} saveStatus={saveStatus}
              activeProfile={activeProfile} onSave={() => activeProfile ? handleSaveProfile() : setShowSaveDialog(true)}
              onSaveAs={() => setShowSaveDialog(true)} onProjects={goProjects} onBrandClick={goLanding}
              onGlossary={() => setGlossaryOpen(true)} />
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
                                   showRecs={tweak.showRecommendations} activeProfile={activeProfile} />}
        {step !== 0 && <StepNav step={step} onStep={setStep} onCopyTS1={() => copyToTS('TS-1')} />}
      </main>
      <window.RatioDrawer ratio={drawerRatio} onClose={() => setDrawerRatio(null)} />
      <window.GlossaryDrawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      {showSaveDialog && <SaveDialog onSave={handleSaveProfile} onClose={() => setShowSaveDialog(false)} defaultName={activeProfile?.name || ''} />}
      {showProfileModal && <ProfileModal onLoad={handleLoadProfile} onDelete={handleDeleteProfile} onClose={() => setShowProfileModal(false)} />}
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

function Header({ step, onStep, onReset, onTweaks, saveStatus, activeProfile, onSave, onSaveAs, onProjects, onBrandClick, onGlossary }) {
  return (
    <header className="topbar">
      <button className="brand brand-btn" onClick={onBrandClick} title="Kembali ke beranda" type="button">
        <window.Logo size={40} variant="light" />
        <div className="brand-text">
          <div className="brand-name">Rasio Keuangan Kampus</div>
          <div className="brand-sub">
            {activeProfile ? activeProfile.name : 'Simulator LAMEMBA · Composite Financial Index'}
          </div>
        </div>
      </button>
      <div className="topbar-actions">
        <span className="step-pill">Langkah {step + 1} / 8</span>
        {saveStatus === 'saving'  && <span className="save-status saving">Menyimpan…</span>}
        {saveStatus === 'saved'   && <span className="save-status saved">Tersimpan</span>}
        {saveStatus === 'offline' && <span className="save-status offline" title="Server tidak tersedia — data disimpan lokal">Offline</span>}
        <button className="btn-ghost" onClick={onGlossary} title="Istilah Keuangan"><window.Icon name="info" size={14} /> Istilah</button>
        <button className="btn-ghost" onClick={onProjects}><window.Icon name="folder-open" size={14} /> Project Saya</button>
        <button className="btn-ghost" onClick={onSave}><window.Icon name="save" size={14} /> Simpan</button>
        <button className="btn-ghost" onClick={onSaveAs}><window.Icon name="edit-2" size={14} /> Simpan Sebagai…</button>
        <button className="btn-ghost" onClick={onReset}><window.Icon name="rotate-ccw" size={14} /> Reset</button>
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
      <button className="btn-ghost" disabled={step <= 0} onClick={() => onStep(step - 1)}>
        <window.Icon name="arrow-left" size={14} /> Sebelumnya
      </button>
      <div className="step-nav-mid">
        {step >= 1 && step <= 6 && (
          <button className="btn-link" onClick={onCopyTS1}>
            <window.Icon name="refresh-cw" size={13} /> Salin TS-1 → TS
          </button>
        )}
      </div>
      <button className="btn-primary" disabled={step >= 7} onClick={() => onStep(step + 1)}>
        {step === 6 ? 'Hitung & Lihat Hasil' : 'Lanjut'} <window.Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

function StepStart({ onPreset, onBlank }) {
  return (
    <div className="step-start">
      <div className="hero">
        <div className="eyebrow"><window.Icon name="sparkles" size={12} /> Simulator Rasio Keuangan Perguruan Tinggi</div>
        <h1>Hitung kesehatan keuangan kampus Anda<br/>dalam 8 langkah.</h1>
        <p>Berdasarkan <b>29 rasio keuangan</b>, <b>10 indikator wajib LAMEMBA</b>, dan metodologi <b>Composite Financial Index</b>. Simulasikan dampak perubahan kebijakan secara langsung pada predikat akreditasi keuangan.</p>
      </div>
      <div className="preset-grid">
        <div className="preset-eyebrow"><window.Icon name="folder-open" size={11} /> Mulai dari preset · pilih skenario kampus terdekat</div>
        {Object.entries(window.PRESETS).map(([k, p]) => {
          const yearResult = window.computeYear(p.TS);
          return (
            <button key={k} className={'preset-card v-' + k} onClick={() => onPreset(k)}>
              <div className="pc-tag" style={{borderColor: p.color, color: p.color}}>{p.label}</div>
              <div className="pc-desc">{p.desc}</div>
              <div className="pc-stat">
                <span>Mhs aktif</span>
                <b>{p.TS.mhsCount.toLocaleString('id-ID')}</b>
              </div>
              <div className="pc-stat">
                <span>Total Pendapatan</span>
                <b>{window.fmtRp(yearResult.totalRev)}</b>
              </div>
              <div className="pc-cta">Mulai dengan data ini <window.Icon name="arrow-right" size={12} /></div>
            </button>
          );
        })}
        <button className="preset-card preset-blank" onClick={onBlank}>
          <div className="pc-tag pc-tag-blank">KOSONG</div>
          <div className="pc-desc">Mulai dari nol. Masukkan data laporan keuangan kampus Anda sendiri.</div>
          <div className="pc-cta">Input dari nol <window.Icon name="arrow-right" size={12} /></div>
        </button>
      </div>
      <p className="step-start-footnote">
        <window.Icon name="info" size={12} />
        Setiap preset adalah 60 angka × 3 tahun yang konsisten — gunakan sebagai sandbox untuk eksplorasi sebelum input data riil.
      </p>
    </div>
  );
}

// =============== RESULT PAGE ===============
function ResultPage({ result, data, tab, setTab, whatIf, setWhatIf, onPickRatio, showRecs, activeProfile }) {
  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'lameba', label: 'LAMEMBA (10)' },
    { id: 'ratios', label: 'Semua Rasio (29)' },
    { id: 'composition', label: 'Komposisi' },
    { id: 'compare', label: 'Benchmark' },
    { id: 'historical', label: 'Historis' },
    { id: 'whatif', label: 'What-If' },
    { id: 'recs', label: 'Rekomendasi' },
  ];
  return (
    <div className="result-page">
      {/* Screen-only view (tabs) */}
      <div className="screen-only">
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
            <window.Icon name="printer" size={14} /> Cetak / PDF
          </button>
        </div>
        <div className="result-body">
          {tab === 'overview' && <OverviewTab result={result} data={data} onPickRatio={onPickRatio} />}
          {tab === 'lameba' && <LamebaTab result={result} onPickRatio={onPickRatio} />}
          {tab === 'ratios' && <RatiosTab result={result} onPickRatio={onPickRatio} />}
          {tab === 'composition' && <CompositionTab data={data} result={result} />}
          {tab === 'compare' && <CompareTab result={result} />}
          {tab === 'historical' && <HistoricalTab result={result} onPickRatio={onPickRatio} />}
          {tab === 'whatif' && <WhatIfTab data={data} whatIf={whatIf} setWhatIf={setWhatIf} result={result} />}
          {tab === 'recs' && (showRecs ? <RecsTab result={result} data={data} /> : <div className="empty">Rekomendasi dinonaktifkan dari panel Tweaks.</div>)}
        </div>
      </div>

      {/* Print-only comprehensive report */}
      <PrintReport result={result} data={data} activeProfile={activeProfile} showRecs={showRecs} />
    </div>
  );
}

function PrintReport({ result, data, activeProfile, showRecs }) {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const projectName = activeProfile?.name || 'Project Tanpa Nama';
  const verdictInfo = window.VERDICT_INFO[result.verdict] || {};

  // Build narrative
  const narrative = window.buildNarrative ? window.buildNarrative(result, data) : null;

  return (
    <div className="print-only print-report">
      {/* === COVER PAGE === */}
      <section className="print-cover">
        <div className="print-cover-top">
          <window.Logo size={56} variant="light" />
          <div className="print-cover-brand">
            <div className="print-cover-brand-name">Rasio Keuangan Kampus</div>
            <div className="print-cover-brand-sub">Simulator Akreditasi LAMEMBA · Composite Financial Index</div>
          </div>
        </div>
        <div className="print-cover-body">
          <div className="print-cover-eyebrow">Laporan Analisis Keuangan</div>
          <h1 className="print-cover-title">{projectName}</h1>
          <div className="print-cover-meta">
            <span>Dicetak {today}</span>
            <span>·</span>
            <span>Tahun Pelaporan: TS</span>
          </div>
          <div className="print-cover-verdict">
            <div className="pcv-label">Predikat Akreditasi Keuangan</div>
            <div className={'pcv-pill v-' + result.verdict}>{verdictInfo.label || result.verdict}</div>
            <p className="pcv-desc">{verdictInfo.sub}</p>
          </div>
          <div className="print-cover-kpis">
            <div className="pck-item">
              <div className="pck-label">CFI Total</div>
              <div className="pck-val">{result.CFI_total.toFixed(1)} <span>/100</span></div>
            </div>
            <div className="pck-item">
              <div className="pck-label">LAMEMBA</div>
              <div className="pck-val">{result.lamebaTerpenuhi}<span>/10</span></div>
            </div>
            <div className="pck-item">
              <div className="pck-label">IKK</div>
              <div className="pck-val">{(result.ratios.find(r => r.id === 'L8_IKK')?.v || 0).toFixed(2)} <span>/4</span></div>
            </div>
            <div className="pck-item">
              <div className="pck-label">Mahasiswa Aktif</div>
              <div className="pck-val">{(data.TS?.mhsCount || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>
        <div className="print-cover-foot">
          <span>Standar metodologi: LAMEMBA 2024 · CFI (Tuck) · NACUBO</span>
          <span>Disclaimer: Alat bantu analisis — bukan substitusi audit resmi</span>
        </div>
      </section>

      {/* === EXECUTIVE SUMMARY === */}
      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">Halaman 2 · Ringkasan Eksekutif</div>
          <h2 className="print-section-title">Ringkasan Eksekutif</h2>
        </div>
        {narrative && (
          <div className="print-narrative">
            {narrative.headline && <p className="pn-headline">{narrative.headline}</p>}
            {narrative.paragraphs && narrative.paragraphs.map((p, i) => (
              <p key={i} className="pn-paragraph">{p}</p>
            ))}
            {narrative.callouts && narrative.callouts.length > 0 && (
              <div className="pn-callouts">
                {narrative.callouts.map((c, i) => (
                  <div key={i} className={'pn-callout pn-callout-' + c.type}>
                    <strong>{c.title}:</strong> {c.body}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!narrative && window.buildExecSummary && (
          <p className="print-summary">{window.buildExecSummary(result, data)}</p>
        )}
      </section>

      {/* === DETAIL: All tabs sequentially === */}
      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">Halaman 3 · Overview</div>
          <h2 className="print-section-title">Ringkasan Visual</h2>
        </div>
        <OverviewTab result={result} data={data} onPickRatio={() => {}} />
      </section>

      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">10 Indikator LAMEMBA</div>
          <h2 className="print-section-title">Daftar Indikator Wajib Akreditasi</h2>
        </div>
        <LamebaTab result={result} onPickRatio={() => {}} />
      </section>

      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">29 Rasio Keuangan</div>
          <h2 className="print-section-title">Daftar Rasio Lengkap</h2>
        </div>
        <RatiosTab result={result} onPickRatio={() => {}} />
      </section>

      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">Komposisi</div>
          <h2 className="print-section-title">Komposisi Pendapatan & Pengeluaran</h2>
        </div>
        <CompositionTab data={data} result={result} />
      </section>

      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">Benchmark</div>
          <h2 className="print-section-title">Perbandingan vs Predikat</h2>
        </div>
        <CompareTab result={result} />
      </section>

      <section className="print-section print-page-break">
        <div className="print-section-head">
          <div className="print-section-eyebrow">Historis 3 Tahun</div>
          <h2 className="print-section-title">Tren TS-2 → TS-1 → TS</h2>
        </div>
        <HistoricalTab result={result} onPickRatio={() => {}} />
      </section>

      {showRecs && (
        <section className="print-section print-page-break">
          <div className="print-section-head">
            <div className="print-section-eyebrow">Rekomendasi</div>
            <h2 className="print-section-title">Rekomendasi & Tindak Lanjut</h2>
          </div>
          <RecsTab result={result} data={data} />
        </section>
      )}

      {/* === Print footer signature page === */}
      <section className="print-signature print-page-break">
        <div className="print-sig-block">
          <h3>Lembar Pengesahan</h3>
          <p>Laporan ini disusun oleh:</p>
          <div className="print-sig-grid">
            <div className="print-sig-box">
              <div className="psg-line"></div>
              <div className="psg-label">Penyusun</div>
              <div className="psg-sub">(Nama & Jabatan)</div>
            </div>
            <div className="print-sig-box">
              <div className="psg-line"></div>
              <div className="psg-label">Disetujui Oleh</div>
              <div className="psg-sub">(Nama & Jabatan)</div>
            </div>
          </div>
          <div className="print-sig-foot">
            <div>Tanggal: {today}</div>
            <div>Project: {projectName}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewTab({ result, data, onPickRatio }) {
  const ikk = result.ratios.find(r => r.id === 'L8_IKK');
  const narrative = window.buildNarrative ? window.buildNarrative(result, data) : null;
  const execSummary = !narrative && window.buildExecSummary ? window.buildExecSummary(result, data) : null;
  return (
    <div className="overview-grid">
      {narrative && (
        <div className="exec-summary-card span-2 narrative-card">
          <div className="es-eyebrow"><window.Icon name="sparkles" size={11} /> Ringkasan Eksekutif</div>
          {narrative.headline && <p className="narrative-headline">{narrative.headline}</p>}
          {narrative.paragraphs && narrative.paragraphs.slice(0, 2).map((p, i) => (
            <p key={i} className="es-text narrative-paragraph">{p}</p>
          ))}
          {narrative.callouts && narrative.callouts.length > 0 && (
            <div className="narrative-callouts">
              {narrative.callouts.slice(0, 2).map((c, i) => (
                <div key={i} className={'narrative-callout nc-' + c.type}>
                  <div className="nc-title">
                    <window.Icon name={c.type === 'risk' ? 'alert-triangle' : c.type === 'warning' ? 'alert-triangle' : c.type === 'positive' ? 'check' : 'info'} size={12} />
                    {c.title}
                  </div>
                  <div className="nc-body">{c.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {execSummary && !narrative && (
        <div className="exec-summary-card span-2">
          <div className="es-eyebrow">Ringkasan Eksekutif</div>
          <p className="es-text">{execSummary}</p>
        </div>
      )}
      <div className="card span-2">
        <div className="card-h">
          <h3>Indeks Kinerja Keuangan (IKK)</h3>
          <span className="card-eyebrow">Skala 0 – 4 · Standar LAMEMBA: ≥ 2.5</span>
        </div>
        <window.GaugeIKK value={ikk ? ikk.v : 0} components={result.IKK_components} />
      </div>
      <div className="card span-2">
        <div className="card-h">
          <h3>CFI Scorecard</h3>
          <span className="card-eyebrow">5 dimensi · skor 0–100 · Total: <b style={{color:'var(--accent)'}}>{result.CFI_total.toFixed(1)}</b></span>
        </div>
        <div className="cfi-layout">
          <div className="cfi-radar-wrap">
            <window.RadarChart scorecard={result.scorecard} />
          </div>
          <div className="cfi-bars-wrap">
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
              <td className={'mono delta-' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero')}>
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
                {r.lameba && <span className="lam-badge"><window.Icon name="star" size={10} /></span>}
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

  // Quick experiment presets — onboarding
  const fallback = WHAT_IF_PARAMS.reduce((acc, p) => { acc[p.k] = p.fallback; return acc; }, {});
  const quickExperiments = [
    {
      icon: 'trending-up',
      title: 'Naikkan SPP 15%',
      desc: 'Lihat dampak kenaikan SPP terhadap pendapatan dan predikat',
      action: () => setOv('revSppGross', (TS.revSppGross || fallback.revSppGross) * 1.15),
    },
    {
      icon: 'sparkles',
      title: 'Investasi Sarpras 2×',
      desc: 'Dobel CapEx untuk modernisasi fasilitas',
      action: () => setOv('expCapex', (TS.expCapex || fallback.expCapex) * 2),
    },
    {
      icon: 'compass',
      title: 'Geser Riset → Donasi',
      desc: 'Diversifikasi: kurangi riset 50%, naikkan donasi 2×',
      action: () => {
        setOv('revRiset', (TS.revRiset || fallback.revRiset) * 0.5);
        setOv('revDonasi', (TS.revDonasi || fallback.revDonasi) * 2);
      },
    },
  ];

  return (
    <div>
      <div className="section-eyebrow"><window.Icon name="sparkles" size={11} /> What-If · Uji Dampak Kebijakan</div>
      <h2 className="wi-h2">Sebelum keputusan dibawa ke rapat senat — uji dulu di sini.</h2>
      <p className="section-desc">
        Geser slider atau ketik nilai untuk lihat bagaimana naik-turun parameter mengubah predikat, CFI, dan checklist LAMEMBA Anda.{' '}
        <b>Data asli aman</b> — tidak tersentuh.
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

      {/* Onboarding panel — only when nothing changed yet */}
      {activeCount === 0 && (
        <div className="wi-onboard">
          <div className="wi-onboard-head">
            <window.Icon name="play" size={14} />
            <span>Mulai dari skenario populer · klik salah satu untuk demo cepat</span>
          </div>
          <div className="wi-onboard-grid">
            {quickExperiments.map((qe, i) => (
              <button key={i} className="wi-quick-btn" onClick={qe.action}>
                <window.Icon name={qe.icon} size={16} />
                <div>
                  <div className="wq-title">{qe.title}</div>
                  <div className="wq-desc">{qe.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="whatif-toolbar">
        <div className="wi-status">
          {activeCount > 0
            ? <span><b>{activeCount}</b> parameter diubah · simulasi <b style={{color:'var(--accent)'}}>AKTIF</b></span>
            : <span style={{color:'var(--ink-3)'}}>Geser slider di bawah atau pilih skenario di atas</span>}
        </div>
        {activeCount > 0 && (
          <button className="btn-ghost btn-sm" onClick={reset}><window.Icon name="rotate-ccw" size={12} /> Reset Semua</button>
        )}
      </div>

      {/* Sliders grouped by category */}
      {cats.map(cat => (
        <div key={cat} className={'wi-cat-section cat-' + cat}>
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
                      Saat ini: {window.fmtRp(rawBase || 0)}
                      {hasNoTS && <span className="wi-fallback-note"> (pakai default)</span>}
                    </span>
                    <span className={'wi-cur-val mono ' + (dPct > 0 ? 'pos' : dPct < 0 ? 'neg' : '')}>
                      Setelah simulasi: {window.fmtRp(sliderVal)}
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

  return (
    <div>
      <div className="section-eyebrow">Rekomendasi & Analisis ({recs.length} item)</div>
      <p className="section-desc">
        Dihitung berdasarkan kondisi aktual, selisih ke target, dan tren 3 tahun.{' '}
        Prioritas <b className="text-bad">Tinggi</b> = indikator LAMEMBA wajib yang belum terpenuhi.
      </p>
      <div className="recs-list">
        {recs.map((rec, i) => (
          <div key={i} className={'rec-card pri-' + rec.priority}>
            <div className="rec-head">
              <span className={'rec-pri pri-pill-' + rec.priority}>
                {priorityLabel[rec.priority] || 'PRIORITAS MENENGAH'}
              </span>
              <span className="rec-ind">
                {rec.ratio.lameba ? <span className="rec-star"><window.Icon name="star" size={11} /> LAMEMBA</span> : null}
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

// =============== SAVE DIALOG ===============
function SaveDialog({ onSave, onClose, defaultName }) {
  const [name, setName] = useState(defaultName || '');
  const handleSubmit = (e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Simpan Profil</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="modal-label">Nama Profil</label>
          <input className="modal-input" type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder="cth: Universitas ABC 2024" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============== PROFILE MODAL ===============
function ProfileModal({ onLoad, onDelete, onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.apiGetProfiles()
      .then(p => { setProfiles(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    onDelete(id);
    setProfiles(ps => ps.filter(p => p.id !== id));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Muat Profil Tersimpan</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {loading ? <div className="modal-loading">Memuat…</div> : profiles.length === 0 ? (
          <div className="modal-empty">Belum ada profil tersimpan. Gunakan "Simpan Sebagai…" untuk menyimpan data Anda.</div>
        ) : (
          <div className="profile-list">
            {profiles.map(p => (
              <div key={p.id} className="profile-item">
                <div className="profile-info" onClick={() => onLoad(p)}>
                  <div className="profile-name">{p.name}</div>
                  <div className="profile-date">{new Date(p.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button className="btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Hapus</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============== HISTORICAL TAB ===============
function HistoricalTab({ result, onPickRatio }) {
  const CAT_LABELS = { CFI: 'Kekuatan Finansial', LIQ: 'Likuiditas', EFF: 'Efisiensi', DEBT: 'Utang', ENDOW: 'Endowment', REV: 'Pendapatan', ACAD: 'Akademik', BUDGET: 'Anggaran', INVEST: 'Investasi', IKK: 'IKK', ATT: 'Tridharma' };
  const grouped = {};
  result.ratios.forEach(r => {
    if (r.v1 === undefined && r.v2 === undefined) return;
    (grouped[r.cat] = grouped[r.cat] || []).push(r);
  });

  function trendArrow(v, v1, good) {
    if (v === undefined || v1 === undefined || v === null || v1 === null) return '';
    const diff = v - v1;
    if (Math.abs(diff) < 0.0001) return '→';
    const up = diff > 0;
    const positive = good === 'high' ? up : good === 'low' ? !up : null;
    if (positive === true) return '↑';
    if (positive === false) return '↓';
    return up ? '↑' : '↓';
  }

  function trendColor(v, v1, good) {
    if (v === undefined || v1 === undefined) return '#5b6a82';
    const diff = v - v1;
    if (Math.abs(diff) < 0.0001) return '#5b6a82';
    const up = diff > 0;
    const positive = good === 'high' ? up : good === 'low' ? !up : null;
    if (positive === true) return '#2f6b3d';
    if (positive === false) return '#9b2c2c';
    return '#5b6a82';
  }

  return (
    <div>
      <div className="section-eyebrow">Data Historis 3 Tahun</div>
      <p className="section-desc">Perbandingan semua rasio dari TS-2 hingga TS. Warna hijau = membaik, merah = memburuk.</p>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{marginBottom: 24}}>
          <div className="hist-cat-title">{CAT_LABELS[cat] || cat}</div>
          <table className="hist-table">
            <thead>
              <tr><th>Rasio</th><th>TS-2</th><th>TS-1</th><th>TS</th><th>Trend</th><th>Status</th></tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="hist-row" onClick={() => onPickRatio && onPickRatio(r)} style={{cursor:'pointer'}}>
                  <td>
                    {r.lameba && <span className="lam-badge"><window.Icon name="star" size={10} /></span>}
                    {r.name}
                  </td>
                  <td className="mono">{r.v2 !== undefined ? window.fmtByType(r.v2, r.format) : '—'}</td>
                  <td className="mono">{r.v1 !== undefined ? window.fmtByType(r.v1, r.format) : '—'}</td>
                  <td className="mono"><b>{window.fmtByType(r.v, r.format)}</b></td>
                  <td style={{textAlign:'center'}}>
                    <span style={{color: trendColor(r.v, r.v1, r.good), fontWeight: 600, fontSize: 16}}>
                      {trendArrow(r.v, r.v1, r.good)}
                    </span>
                    {r.v1 !== undefined && r.v2 !== undefined && (
                      <span style={{marginLeft: 6}}><window.Sparkline data={[r.v2, r.v1, r.v]} w={60} h={20} color={trendColor(r.v, r.v1, r.good)} /></span>
                    )}
                  </td>
                  <td><window.StatusPill s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
window.HistoricalTab = HistoricalTab;

ReactDOM.createRoot(document.getElementById('root')).render(
  <window.ErrorBoundary>
    <App />
    <window.ToastHost />
  </window.ErrorBoundary>
);
