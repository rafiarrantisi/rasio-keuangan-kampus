// Result page components: Dashboard, LAMEMBA list, ratios grid, charts, comparison, what-if, recommendations

function GaugeIKK({ value, components }) {
  const max = 4;
  const safeVal = Math.min(max, Math.max(0, value || 0));
  const W = 360, H = 230;
  const cx = W / 2, cy = 180, r = 120;
  const polar = (radius, t) => {
    const angle = Math.PI * (1 - t);
    return [
      cx + radius * Math.cos(angle),
      cy - radius * Math.sin(angle)
    ];
  };
  const arcPath = (from, to, radius) => {
    const [x1, y1] = polar(radius, from);
    const [x2, y2] = polar(radius, to);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  const segments = [
    { from: 0,       to: 1.5/4,  color: window.CHART_COLORS.bad,     label: 'Berisiko',    range: '0 – 1.5' },
    { from: 1.5/4,   to: 2.5/4,  color: window.CHART_COLORS.warnAlt, label: 'Perhatian',   range: '1.5 – 2.5' },
    { from: 2.5/4,   to: 3.5/4,  color: window.CHART_COLORS.ok,      label: 'Baik',        range: '2.5 – 3.5' },
    { from: 3.5/4,   to: 1.0,    color: window.CHART_COLORS.info,    label: 'Sangat Baik', range: '3.5 – 4.0' },
  ];
  const status =
    safeVal >= 3.5 ? { label: 'SANGAT BAIK', color: window.CHART_COLORS.info } :
    safeVal >= 2.5 ? { label: 'BAIK',        color: window.CHART_COLORS.ok } :
    safeVal >= 1.5 ? { label: 'PERHATIAN',   color: window.CHART_COLORS.warnAlt } :
                     { label: 'BERISIKO',    color: window.CHART_COLORS.bad };

  // Animated needle sweep on mount
  const [animPct, setAnimPct] = React.useState(window.prefersReducedMotion() ? safeVal / max : 0);
  React.useEffect(() => {
    if (window.prefersReducedMotion()) { setAnimPct(safeVal / max); return; }
    const target = safeVal / max;
    const start = performance.now();
    const dur = 900;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      setAnimPct(target * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [safeVal]);
  const [nx, ny] = polar(r - 12, animPct);

  return (
    <div className="gauge-wrap gauge-horizontal">
      <div className="gauge-left">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="chart" style={{maxWidth: W}}>
        <path d={arcPath(0, 1, r)} fill="none" stroke="#ece7db" strokeWidth="18" strokeLinecap="butt" />
        {segments.map((s, i) => (
          <path key={i} d={arcPath(s.from, s.to, r)} fill="none" stroke={s.color} strokeWidth="18" strokeLinecap="butt" />
        ))}
        {[0, 1, 2, 3, 4].map(t => {
          const [tx, ty] = polar(r + 26, t / 4);
          return (
            <text key={t} x={tx} y={ty} textAnchor="middle" dy="0.35em"
              style={{fontSize:12, fill:'#5b6a82', fontWeight:700, fontFamily:'JetBrains Mono'}}>
              {t}
            </text>
          );
        })}
        {/* Min L8 marker at 2.5 */}
        {(() => {
          const t = 2.5 / 4;
          const [mx1, my1] = polar(r - 20, t);
          const [mx2, my2] = polar(r + 8, t);
          const [lx, ly] = polar(r + 42, t);
          return (
            <g>
              <line x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="#142847" strokeWidth="2.5" strokeDasharray="4 3" />
              <text x={lx} y={ly} textAnchor="middle" dy="0.35em"
                style={{fontSize:10, fill:'#142847', fontWeight:700, letterSpacing:'.03em'}}>Min L8</text>
            </g>
          );
        })()}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke="#142847" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="8" fill="#142847" />
        <circle cx={cx} cy={cy} r="3.5" fill="#fff" />
        {/* Center value */}
        <text x={cx} y={cy - 48} textAnchor="middle"
          style={{fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, fill:'#142847', letterSpacing:'-0.02em'}}>
          {safeVal.toFixed(2)}
        </text>
        <text x={cx} y={cy - 26} textAnchor="middle"
          style={{fontSize:11, fill:'#8a96aa', letterSpacing:'.1em', fontWeight:600}}>
          dari 4.00
        </text>
        {/* Status badge */}
        <rect x={W - 100} y={8} width={90} height={24} rx="5" fill={status.color} opacity="0.12" />
        <text x={W - 55} y={24} textAnchor="middle"
          style={{fontSize:10, fill: status.color, fontWeight:800, letterSpacing:'.06em'}}>
          {status.label}
        </text>
      </svg>

      {/* Thresholds legend */}
      <div className="gauge-thresholds">
        {segments.map(s => (
          <span key={s.label}>
            <i style={{background: s.color}}></i>
            {s.range} {s.label}
          </span>
        ))}
      </div>
      </div>{/* end gauge-left */}

      {/* Component breakdown */}
      {components && components.length > 0 && (
        <div className="gauge-components">
          <div className="gc-title">Komponen IKK</div>
          {components.map(c => {
            const contrib = (c.norm * c.weight * 4);
            const pctBar = Math.min(100, (c.norm || 0) * 100);
            return (
              <div key={c.k} className="gc-row">
                <div className="gc-label" title={c.k}>{c.k.split('(')[0].trim()}</div>
                <div className="gc-bar-wrap">
                  <div className="gc-bar" style={{width: pctBar + '%'}}></div>
                </div>
                <div className="gc-val mono">{contrib.toFixed(2)}</div>
                <div className="gc-raw mono" title="Nilai aktual">
                  {c.v !== undefined ? (c.v < 1 ? (c.v * 100).toFixed(1) + '%' : c.v.toFixed(2)) : '—'}
                </div>
              </div>
            );
          })}
          <div className="gc-note">Kontribusi ke IKK (maks per komponen = bobot × 4). Total: {safeVal.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}

function RadarChart({ scorecard }) {
  const R = 100, padL = 110, padR = 90, padTB = 80;
  const w = padL + R + R + padR, h = padTB + R + R + padTB;
  const cx = padL + R, cy = h / 2;
  const N = scorecard.length;
  const angle = (i) => -Math.PI/2 + (i / N) * Math.PI * 2;
  const grids = [0.25, 0.5, 0.75, 1].map(p => {
    const pts = scorecard.map((_, i) => [cx + R * p * Math.cos(angle(i)), cy + R * p * Math.sin(angle(i))]);
    return pts.map((q, i) => (i === 0 ? 'M' : 'L') + q[0] + ',' + q[1]).join(' ') + ' Z';
  });
  // Animated scale-in
  const [animT, setAnimT] = React.useState(window.prefersReducedMotion() ? 1 : 0);
  React.useEffect(() => {
    if (window.prefersReducedMotion()) { setAnimT(1); return; }
    const start = performance.now();
    const dur = 800;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      setAnimT(ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [scorecard]);
  const pts = scorecard.map((s, i) => {
    const v = Math.min(1, s.score / 100) * animT;
    return [cx + R * v * Math.cos(angle(i)), cy + R * v * Math.sin(angle(i))];
  });
  const path = pts.map((q, i) => (i === 0 ? 'M' : 'L') + q[0] + ',' + q[1]).join(' ') + ' Z';
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="chart" style={{maxWidth: 380}}>
      {grids.map((g, i) => <path key={i} d={g} fill="none" stroke="#e3ddd1" strokeWidth="1" />)}
      {scorecard.map((_, i) => {
        const [x, y] = [cx + R * Math.cos(angle(i)), cy + R * Math.sin(angle(i))];
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ece7db" strokeWidth="1" />;
      })}
      <path d={path} fill="rgba(184,134,44,.18)" stroke="#b8862c" strokeWidth="2" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#b8862c" />)}
      {scorecard.map((s, i) => {
        const lr = R + 24;
        const x = cx + lr * Math.cos(angle(i));
        const y = cy + lr * Math.sin(angle(i));
        const anc = Math.abs(Math.cos(angle(i))) < 0.3 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end';
        return (
          <g key={i}>
            <text x={x} y={y} textAnchor={anc} dy="-0.2em" style={{fontSize:10,fill:'#2a3a52',fontWeight:600}}>{s.k}</text>
            <text x={x} y={y} textAnchor={anc} dy="1.1em" style={{fontSize:10,fill:'#b8862c',fontWeight:700,fontFamily:'JetBrains Mono'}}>{Math.round(s.score)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBar({ items, title, total }) {
  const colors = ['#142847','#1f3b6b','#b8862c','#5b6a82','#2f6b3d','#a06310','#1e6fb8','#9b2c2c'];
  let acc = 0;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,color:'#5b6a82'}}>
        <span style={{fontWeight:600,color:'#142847'}}>{title}</span>
        <span className="mono">{fmtRp(total)}</span>
      </div>
      <div style={{display:'flex',height:28,borderRadius:4,overflow:'hidden',background:'#ece7db',marginBottom:10}}>
        {items.map((it, i) => {
          const w = (it.value / total) * 100;
          if (w < 0.5) return null;
          return <div key={i} style={{width: w + '%', background: colors[i % colors.length]}} title={it.label + ': ' + fmtRp(it.value)} />;
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,fontSize:11}}>
        {items.map((it, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,background:colors[i % colors.length],borderRadius:2,flexShrink:0}}></span>
            <span style={{flex:1,color:'#2a3a52'}}>{it.label}</span>
            <span className="mono" style={{color:'#5b6a82'}}>{((it.value/total)*100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerdictHero({ verdict, CFI, lameba }) {
  const info = VERDICT_INFO[verdict];
  return (
    <div className={'verdict-hero verdict-' + verdict}>
      <div className="eyebrow">Predikat Kesehatan Keuangan</div>
      <div className="verdict-label">{info.label}</div>
      <div className="verdict-sub">{info.sub}</div>
      <div className="scoring">
        <div className="score-block">
          <div className="label">CFI Total Score</div>
          <div className="val">{CFI.toFixed(1)}<span style={{fontSize:14,opacity:.7,fontWeight:400}}> / 100</span></div>
          <div className="sub-val">Composite Financial Index</div>
        </div>
        <div className="score-block">
          <div className="label">LAMEMBA Terpenuhi</div>
          <div className="val">{lameba}<span style={{fontSize:14,opacity:.7,fontWeight:400}}> / 10</span></div>
          <div className="sub-val">10 indikator wajib akreditasi</div>
        </div>
        <div className="score-block">
          <div className="label">Ambang Predikat</div>
          <div className="threshold-grid">
            {[
              { label: 'SANGAT BAIK', cfi: '≥ 85', lam: '≥ 8/10', color: '#7ec8e3' },
              { label: 'BAIK', cfi: '≥ 70', lam: '≥ 6/10', color: '#b8d8b6' },
              { label: 'PERHATIAN', cfi: '≥ 50', lam: '—', color: '#f0c987' },
              { label: 'BERISIKO', cfi: '< 50', lam: '—', color: '#f0a3a3' },
            ].map(t => (
              <div key={t.label} className="thr-row">
                <span className="thr-dot" style={{background: t.color}}></span>
                <span className="thr-label">{t.label}</span>
                <span className="thr-val mono">{t.cfi}</span>
                <span className="thr-val mono">{t.lam}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LamebaList({ ratios, onPick }) {
  const lams = ratios.filter(r => r.lameba).sort((a, b) => parseInt(a.no.slice(1)) - parseInt(b.no.slice(1)));
  return (
    <div className="lameba-grid">
      {lams.map(r => {
        const cls = r.status === 'ok' ? 'ok' : r.status === 'info' ? 'info' : 'bad';
        return (
          <div key={r.id} className={'lam-item ' + cls} onClick={() => onPick(r)} style={{cursor:'pointer'}}>
            <div className="badge">{r.no}</div>
            <div>
              <div className="name">{r.name}</div>
              <div className="meta">
                <span className="actual">{fmtByType(r.v, r.format)}</span>
                <span className="target">target: {r.target}</span>
              </div>
            </div>
            <StatusPill s={r.status} />
          </div>
        );
      })}
    </div>
  );
}

function RatioCard({ r, onClick }) {
  const data = [r.v2, r.v1, r.v].filter(x => x !== undefined);
  return (
    <div className="ratio-card" onClick={() => onClick(r)}>
      <div className="rh">
        <div>
          <div className="num">#{r.no}</div>
          <div className="name">{r.name}</div>
        </div>
        <StatusPill s={r.status} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:8}}>
        <div className="value">{fmtByType(r.v, r.format)}</div>
        <Sparkline data={data} color={r.status === 'ok' ? '#2f6b3d' : r.status === 'warn' ? '#a06310' : r.status === 'bad' ? '#9b2c2c' : '#1f3b6b'} />
      </div>
      <div className="target-line">Target: <b style={{color:'#2a3a52'}}>{r.target}</b></div>
    </div>
  );
}

function RatioDrawer({ ratio, onClose }) {
  if (!ratio) return null;
  const data = [
    { y: 'TS-2', v: ratio.v2 }, { y: 'TS-1', v: ratio.v1 }, { y: 'TS', v: ratio.v }
  ].filter(d => d.v !== undefined);
  return (
    <div className={'drawer-bg ' + (ratio ? 'open' : '')} onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'#b8862c',fontWeight:600}}>
              {ratio.lameba ? <><window.Icon name="star" size={11} /> LAMEMBA · </> : ''}#{ratio.no} · {ratio.cat}
            </div>
            <h3>{ratio.name}</h3>
            <div style={{marginTop:4}}><StatusPill s={ratio.status} /></div>
          </div>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
            <div className="kpi">
              <div className="label">Nilai TS</div>
              <div className="val">{fmtByType(ratio.v, ratio.format)}</div>
              <div className="sub">Target: {ratio.target}</div>
            </div>
            <div className="kpi">
              <div className="label">Skor</div>
              <div className="val">{typeof ratio.score === 'number' ? Math.round(ratio.score) : '—'}<span style={{fontSize:14,fontWeight:400,color:'#8a96aa'}}> / 100</span></div>
              <div className="sub">Berkontribusi ke CFI</div>
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.08em',color:'#5b6a82',fontWeight:600,marginBottom:6}}>Formula</div>
            <div className="mono" style={{padding:'10px 12px',background:'#faf8f3',borderRadius:6,border:'1px solid #ece7db',fontSize:12}}>{ratio.formula}</div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.08em',color:'#5b6a82',fontWeight:600,marginBottom:6}}>Penjelasan</div>
            <p style={{fontSize:13,color:'#2a3a52',margin:0}}>{ratio.desc}</p>
          </div>

          {data.length > 1 && (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.08em',color:'#5b6a82',fontWeight:600,marginBottom:10}}>Tren 3 Tahun</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(' + data.length + ',1fr)',gap:10}}>
                {data.map(d => (
                  <div key={d.y} style={{padding:'10px 12px',background:'#faf8f3',borderRadius:6,border:'1px solid #ece7db'}}>
                    <div style={{fontSize:11,color:'#8a96aa'}}>{d.y}</div>
                    <div className="mono" style={{fontWeight:600,color:'#142847',fontSize:14,marginTop:2}}>{fmtByType(d.v, ratio.format)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ratio.benchmarks && (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.08em',color:'#5b6a82',fontWeight:600,marginBottom:10}}>Benchmark per Predikat</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {['SANGAT_BAIK','BAIK','PERHATIAN','BERISIKO'].map(p => {
                  const bv = ratio.benchmarks[p];
                  const colors = { SANGAT_BAIK:'#1e6fb8', BAIK:'#2f6b3d', PERHATIAN:'#a06310', BERISIKO:'#9b2c2c' };
                  return (
                    <div key={p} style={{display:'grid',gridTemplateColumns:'120px 1fr 100px',alignItems:'center',gap:10,fontSize:12}}>
                      <span style={{color:colors[p],fontWeight:600}}>{VERDICT_INFO[p].label}</span>
                      <div style={{height:6,background:'#ece7db',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width: Math.min(100, Math.max(2, (bv / Math.max(...Object.values(ratio.benchmarks).map(Math.abs))) * 100)) + '%', background: colors[p]}}></div>
                      </div>
                      <span className="mono" style={{textAlign:'right',color:'#2a3a52'}}>{fmtByType(bv, ratio.format)}</span>
                    </div>
                  );
                })}
                <div style={{borderTop:'1px dashed #e3ddd1',marginTop:8,paddingTop:8}}>
                  <div style={{display:'grid',gridTemplateColumns:'120px 1fr 100px',alignItems:'center',gap:10,fontSize:12}}>
                    <span style={{color:'#142847',fontWeight:700}}>Anda (TS)</span>
                    <div style={{height:6,background:'#ece7db',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width: Math.min(100, Math.max(2, (ratio.v / Math.max(...Object.values(ratio.benchmarks).map(Math.abs))) * 100)) + '%', background:'#142847'}}></div>
                    </div>
                    <span className="mono" style={{textAlign:'right',color:'#142847',fontWeight:700}}>{fmtByType(ratio.v, ratio.format)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRecs(result) {
  const recs = [];
  result.ratios.forEach(r => {
    if (!r.lameba || r.status === 'ok' || r.status === 'info') return;
    const map = {
      L1_RK: { t: 'Tingkatkan Kemandirian Keuangan', d: 'Kurangi ketergantungan pada subsidi pemerintah dengan meningkatkan pendapatan auxiliary, donasi, atau hibah riset kompetitif.' },
      L2_REO: { t: 'Naikkan Rasio Efisiensi Operasional ke ≥ 65%', d: 'Realokasi anggaran agar Biaya Operasional Langsung Tridharma menjadi proporsi terbesar dari total pengeluaran. Tinjau ulang biaya non-akademik yang membengkak.' },
      L3_VA: { t: 'Perketat Disiplin Anggaran', d: 'Terapkan early-warning system untuk monitoring varians per pos. Lakukan review anggaran kuartalan dengan PIC budget director.' },
      L4_RISDM: { t: 'Tambah Alokasi Pengembangan SDM', d: 'Naikkan anggaran pelatihan, sertifikasi, dan riset hibah dosen ke ≥ 15% dari total pengeluaran.' },
      L5_RISP: { t: 'Tingkatkan Investasi Sarpras', d: 'Anggarkan CapEx + pemeliharaan ke ≥ 20% dari total pengeluaran. Susun roadmap investasi sarpras 5 tahun.' },
      L6_GRR: { t: 'Akselerasi Pertumbuhan Pendapatan', d: 'Diversifikasi sumber pendapatan: kembangkan unit auxiliary, fundraising alumni, dan kemitraan industri untuk capai growth ≥ 5%.' },
      L8_IKK: { t: 'Tingkatkan IKK ke ≥ 2.5', d: 'IKK adalah komposit RK + REO + RL + GRR. Identifikasi komponen terlemah lalu prioritaskan perbaikan di sana.' },
      L9_RL: { t: 'Perkuat Likuiditas Jangka Pendek', d: 'Aset Lancar harus ≥ Kewajiban Jangka Pendek (≥ 1.0×). Lakukan restrukturisasi piutang & negosiasi ulang utang lancar.' },
      L10_ATT: { t: 'Rebalancing Alokasi Tridharma', d: 'Sesuaikan proporsi Pendidikan / Penelitian / PkM mendekati 50% / 30% / 20%. Deviasi maksimum 10%.' },
    };
    const m = map[r.id];
    if (m) recs.push({ ...m, ratio: r, priority: r.status === 'bad' ? 'high' : 'med' });
  });
  // Add non-LAMEMBA but critical
  result.ratios.forEach(r => {
    if (r.lameba) return;
    if (r.status !== 'bad') return;
    const map = {
      revConc: { t: 'Diversifikasi Sumber Pendapatan', d: 'Konsentrasi pendapatan di atas 70% berisiko. Kembangkan auxiliary, hibah, dan donasi.' },
      dscr: { t: 'Perkuat Debt Service Coverage', d: 'EBITDA / cicilan utang harus ≥ 2×. Naikkan margin operasi atau restrukturisasi pinjaman.' },
      icr: { t: 'Naikkan Interest Coverage', d: 'EBITDA / beban bunga harus ≥ 3×. Refinancing dengan tenor lebih panjang atau bunga lebih rendah.' },
      debtAssets: { t: 'Turunkan Leverage', d: 'Debt/Assets > 35% berisiko. Lunasi sebagian utang atau tambah aset bersih.' },
      tuitDep: { t: 'Kurangi Ketergantungan SPP', d: 'Tuition dependency > 70% sangat rentan. Diversifikasi pendapatan non-SPP.' },
    };
    const m = map[r.id];
    if (m) recs.push({ ...m, ratio: r, priority: 'high' });
  });
  return recs;
}

window.GaugeIKK = GaugeIKK;
window.RadarChart = RadarChart;
window.StackedBar = StackedBar;
window.VerdictHero = VerdictHero;
window.LamebaList = LamebaList;
window.RatioCard = RatioCard;
window.RatioDrawer = RatioDrawer;
window.buildRecs = buildRecs;
