// Compare view — side-by-side analysis of 2-4 projects
// Loaded via index.html after projects.jsx, before app.jsx

function CompareView({ projects, onBack, onClose }) {
  // Memoize results per project
  const results = React.useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      campus_type: p.campus_type,
      data: p.data,
      result: window.computeAll(p.data),
    }));
  }, [projects]);

  const [removeIdx, setRemoveIdx] = React.useState(null);
  const [activeProjects, setActiveProjects] = React.useState(results);

  React.useEffect(() => {
    setActiveProjects(results);
  }, [results]);

  const removeProject = (id) => {
    setActiveProjects(prev => prev.filter(p => p.id !== id));
  };

  if (!activeProjects || activeProjects.length === 0) {
    return (
      <div className="compare-empty">
        <h2>Tidak ada project untuk dibandingkan</h2>
        <p>Kembali ke halaman project untuk memilih.</p>
        <button className="btn-primary" onClick={onBack}>
          <window.Icon name="arrow-left" size={14} /> Ke Halaman Project
        </button>
      </div>
    );
  }

  return (
    <div className="compare-view">
      <CompareHeader projects={activeProjects} onBack={onBack} onClose={onClose} />
      <CompareChips projects={activeProjects} onRemove={removeProject} />
      <CompareOverview projects={activeProjects} />
      <CompareCFIBars projects={activeProjects} />
      <CompareRadarOverlay projects={activeProjects} />
      <CompareRatioTable projects={activeProjects} />
      <CompareLamebaMatrix projects={activeProjects} />
    </div>
  );
}

function CompareHeader({ projects, onBack, onClose }) {
  return (
    <header className="compare-header">
      <div className="compare-header-inner">
        <button className="btn-back" onClick={onBack} title="Kembali ke Project">
          <window.Icon name="arrow-left" size={16} />
        </button>
        <div className="compare-header-text">
          <div className="compare-eyebrow">Analisis Komparatif</div>
          <h1 className="compare-title">Bandingkan {projects.length} Project</h1>
        </div>
        <div className="compare-header-actions">
          <button className="btn-ghost" onClick={() => window.print()}>
            <window.Icon name="printer" size={14} /> Cetak / PDF
          </button>
          <button className="btn-primary" onClick={onClose}>
            <window.Icon name="home" size={14} /> Beranda
          </button>
        </div>
      </div>
    </header>
  );
}

const SERIES_COLORS = ['#142847', '#b8862c', '#2f6b3d', '#1e6fb8', '#a06310', '#9b2c2c'];

function CompareChips({ projects, onRemove }) {
  return (
    <div className="compare-chips">
      {projects.map((p, i) => (
        <div key={p.id} className="cc-chip">
          <span className="cc-color" style={{background: SERIES_COLORS[i]}}></span>
          <div>
            <div className="cc-name">{p.name}</div>
            {p.campus_type && <div className="cc-type">{p.campus_type}</div>}
          </div>
          {projects.length > 1 && (
            <button className="cc-remove" onClick={() => onRemove(p.id)} title="Hapus dari bandingkan">
              <window.Icon name="x" size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function CompareOverview({ projects }) {
  return (
    <section className="compare-section">
      <div className="compare-section-head">
        <h2 className="compare-section-title">Ringkasan</h2>
        <p className="compare-section-sub">KPI utama dari setiap project</p>
      </div>
      <div className="compare-kpi-grid">
        <KpiRow label="Predikat" projects={projects} render={(p) => {
          const info = window.VERDICT_INFO[p.result.verdict];
          return <span className={'compare-verdict v-' + p.result.verdict}>{info?.label || p.result.verdict}</span>;
        }} />
        <KpiRow label="CFI Total" projects={projects} render={(p) => (
          <span className="compare-num mono">{p.result.CFI_total.toFixed(1)} <span className="compare-num-of">/100</span></span>
        )} />
        <KpiRow label="LAMEMBA Terpenuhi" projects={projects} render={(p) => (
          <span className="compare-num mono">{p.result.lamebaTerpenuhi} <span className="compare-num-of">/10</span></span>
        )} />
        <KpiRow label="IKK" projects={projects} render={(p) => {
          const ikk = p.result.ratios.find(r => r.id === 'L8_IKK');
          return <span className="compare-num mono">{ikk ? ikk.v.toFixed(2) : '—'}</span>;
        }} />
        <KpiRow label="Mahasiswa" projects={projects} render={(p) => (
          <span className="compare-num mono">{(p.data.TS?.mhsCount || 0).toLocaleString('id-ID')}</span>
        )} />
        <KpiRow label="Dosen" projects={projects} render={(p) => (
          <span className="compare-num mono">{(p.data.TS?.dosenCount || 0).toLocaleString('id-ID')}</span>
        )} />
        <KpiRow label="Total Pendapatan" projects={projects} render={(p) => (
          <span className="compare-num mono">{window.fmtRp(p.result.totalRev || 0)}</span>
        )} />
        <KpiRow label="Total Pengeluaran" projects={projects} render={(p) => (
          <span className="compare-num mono">{window.fmtRp(p.result.totalExp || 0)}</span>
        )} />
      </div>
    </section>
  );
}

function KpiRow({ label, projects, render }) {
  return (
    <>
      <div className="compare-kpi-label">{label}</div>
      {projects.map((p, i) => (
        <div key={p.id} className="compare-kpi-cell" style={{borderTopColor: SERIES_COLORS[i]}}>
          {render(p)}
        </div>
      ))}
    </>
  );
}

function CompareCFIBars({ projects }) {
  // Get dimension labels from the first project
  const dims = projects[0].result.scorecard.map(s => s.k);
  const groupW = 100 / dims.length;
  const barW = (groupW * 0.7) / projects.length;
  const gap = (groupW * 0.3) / (projects.length + 1);
  return (
    <section className="compare-section">
      <div className="compare-section-head">
        <h2 className="compare-section-title">CFI Scorecard per Dimensi</h2>
        <p className="compare-section-sub">5 dimensi × {projects.length} project</p>
      </div>
      <div className="compare-chart-wrap">
        <svg viewBox="0 0 1000 400" className="compare-chart">
          {/* Y axis grid */}
          {[0, 25, 50, 75, 100].map(t => {
            const y = 360 - (t / 100) * 320;
            return (
              <g key={t}>
                <line x1="50" y1={y} x2="990" y2={y} stroke="#e3ddd1" strokeWidth="1" strokeDasharray="2 4" />
                <text x="42" y={y + 4} textAnchor="end" style={{fontSize:11, fill:'#5b6a82', fontFamily:'JetBrains Mono'}}>{t}</text>
              </g>
            );
          })}
          {/* Bar groups */}
          {dims.map((dim, di) => {
            const groupX = 50 + (di * (940 / dims.length));
            const groupCenter = groupX + (940 / dims.length) / 2;
            return (
              <g key={dim}>
                {projects.map((p, pi) => {
                  const score = p.result.scorecard[di]?.score || 0;
                  const h = (score / 100) * 320;
                  const w = (940 / dims.length) * 0.13;
                  const x = groupCenter - (projects.length * w) / 2 + pi * w + pi * 2;
                  return (
                    <g key={p.id}>
                      <rect x={x} y={360 - h} width={w} height={h} fill={SERIES_COLORS[pi]} rx="2" />
                      <text x={x + w/2} y={360 - h - 6} textAnchor="middle"
                            style={{fontSize:10, fill:'#5b6a82', fontWeight:600, fontFamily:'JetBrains Mono'}}>
                        {Math.round(score)}
                      </text>
                    </g>
                  );
                })}
                <text x={groupCenter} y={386} textAnchor="middle"
                      style={{fontSize:11, fill:'#2a3a52', fontWeight:600}}>
                  {dim.split('(')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function CompareRadarOverlay({ projects }) {
  const N = projects[0].result.scorecard.length;
  const R = 130;
  const w = 480, h = 460;
  const cx = w / 2, cy = h / 2 - 10;
  const angle = (i) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const grids = [0.25, 0.5, 0.75, 1].map(p => {
    const pts = projects[0].result.scorecard.map((_, i) => [
      cx + R * p * Math.cos(angle(i)),
      cy + R * p * Math.sin(angle(i)),
    ]);
    return pts.map((q, i) => (i === 0 ? 'M' : 'L') + q[0] + ',' + q[1]).join(' ') + ' Z';
  });

  return (
    <section className="compare-section">
      <div className="compare-section-head">
        <h2 className="compare-section-title">Radar Overlay</h2>
        <p className="compare-section-sub">CFI 5 dimensi, semua project di-overlay</p>
      </div>
      <div className="compare-chart-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="compare-chart" style={{maxWidth: w, margin: '0 auto', display:'block'}}>
          {grids.map((g, i) => <path key={i} d={g} fill="none" stroke="#e3ddd1" strokeWidth="1" />)}
          {projects[0].result.scorecard.map((_, i) => {
            const [x, y] = [cx + R * Math.cos(angle(i)), cy + R * Math.sin(angle(i))];
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ece7db" strokeWidth="1" />;
          })}
          {/* Polygon per project */}
          {projects.map((p, pi) => {
            const pts = p.result.scorecard.map((s, i) => {
              const v = Math.min(1, s.score / 100);
              return [cx + R * v * Math.cos(angle(i)), cy + R * v * Math.sin(angle(i))];
            });
            const path = pts.map((q, i) => (i === 0 ? 'M' : 'L') + q[0] + ',' + q[1]).join(' ') + ' Z';
            const c = SERIES_COLORS[pi];
            return (
              <g key={p.id}>
                <path d={path} fill={c} fillOpacity="0.13" stroke={c} strokeWidth="2" />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={c} />)}
              </g>
            );
          })}
          {/* Labels */}
          {projects[0].result.scorecard.map((s, i) => {
            const lr = R + 28;
            const x = cx + lr * Math.cos(angle(i));
            const y = cy + lr * Math.sin(angle(i));
            const anc = Math.abs(Math.cos(angle(i))) < 0.3 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end';
            return (
              <text key={i} x={x} y={y} textAnchor={anc} dy="0.35em"
                    style={{fontSize:11, fill:'#2a3a52', fontWeight:600}}>
                {s.k.split('(')[0].trim()}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="compare-legend">
        {projects.map((p, i) => (
          <div key={p.id} className="compare-legend-item">
            <span className="cl-color" style={{background: SERIES_COLORS[i]}}></span>
            <span className="cl-name">{p.name}</span>
            <span className="cl-cfi mono">CFI {p.result.CFI_total.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareRatioTable({ projects }) {
  const allRatios = projects[0].result.ratios;
  // Group by category
  const cats = [...new Set(allRatios.map(r => r.cat))];

  const getValue = (proj, ratioId) => {
    const r = proj.result.ratios.find(x => x.id === ratioId);
    return r;
  };

  return (
    <section className="compare-section">
      <div className="compare-section-head">
        <h2 className="compare-section-title">Tabel Rasio Lengkap</h2>
        <p className="compare-section-sub">29 rasio · highlight nilai terbaik (hijau) dan terburuk (merah) per baris</p>
      </div>
      {cats.map(cat => {
        const ratios = allRatios.filter(r => r.cat === cat);
        return (
          <div key={cat} className="compare-cat-block">
            <div className="compare-cat-title">{cat}</div>
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{textAlign:'left'}}>Rasio</th>
                  {projects.map((p, i) => (
                    <th key={p.id} style={{borderTopColor: SERIES_COLORS[i]}}>{p.name}</th>
                  ))}
                  <th style={{textAlign:'left'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ratios.map(r => {
                  const vals = projects.map(p => {
                    const x = getValue(p, r.id);
                    return x ? x.v : null;
                  });
                  const nonNull = vals.filter(v => v != null && !isNaN(v));
                  const max = nonNull.length ? Math.max(...nonNull) : null;
                  const min = nonNull.length ? Math.min(...nonNull) : null;
                  return (
                    <tr key={r.id}>
                      <td style={{textAlign:'left'}}>
                        <div className="ct-ratio-name">
                          {r.lameba && <window.Icon name="star" size={9} style={{color:'var(--gold)'}} />}
                          <span>{r.name}</span>
                        </div>
                        <span className="ct-ratio-no">#{r.no}</span>
                      </td>
                      {projects.map((p, i) => {
                        const x = getValue(p, r.id);
                        const v = x ? x.v : null;
                        const isBest = v != null && v === max && nonNull.length > 1 && max !== min;
                        const isWorst = v != null && v === min && nonNull.length > 1 && max !== min;
                        return (
                          <td key={p.id} className={'mono ' + (isBest ? 'compare-best' : isWorst ? 'compare-worst' : '')}>
                            {x ? window.fmtByType(v, r.type) : '—'}
                          </td>
                        );
                      })}
                      <td>
                        <div className="ct-status-row">
                          {projects.map((p, i) => {
                            const x = getValue(p, r.id);
                            return x ? <window.StatusPill key={p.id} s={x.status} /> : <span key={p.id}>—</span>;
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

function CompareLamebaMatrix({ projects }) {
  const lamebaIds = projects[0].result.ratios.filter(r => r.lameba).map(r => r.id);
  return (
    <section className="compare-section">
      <div className="compare-section-head">
        <h2 className="compare-section-title">Matriks LAMEMBA</h2>
        <p className="compare-section-sub">10 indikator wajib akreditasi × {projects.length} project</p>
      </div>
      <table className="compare-table compare-lameba-table">
        <thead>
          <tr>
            <th style={{textAlign:'left'}}>Indikator</th>
            {projects.map((p, i) => (
              <th key={p.id} style={{borderTopColor: SERIES_COLORS[i]}}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lamebaIds.map(id => {
            const sample = projects[0].result.ratios.find(r => r.id === id);
            return (
              <tr key={id}>
                <td style={{textAlign:'left'}}>
                  <div className="ct-ratio-name">
                    <span className="ct-ratio-no" style={{display:'inline-block', marginRight: 6}}>{sample.no}</span>
                    {sample.name}
                  </div>
                </td>
                {projects.map(p => {
                  const r = p.result.ratios.find(x => x.id === id);
                  return (
                    <td key={p.id}>
                      <div className="lameba-cell">
                        <span className={'lameba-dot v-' + r.status}></span>
                        <span className="mono">{window.fmtByType(r.v, r.type)}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="compare-lameba-summary">
        {projects.map((p, i) => {
          const total = p.result.lamebaTerpenuhi;
          return (
            <div key={p.id} className="lameba-summary-card" style={{borderColor: SERIES_COLORS[i]}}>
              <div className="lsc-name">{p.name}</div>
              <div className="lsc-score mono">{total}/10</div>
              <div className="lsc-label">terpenuhi</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

window.CompareView = CompareView;
