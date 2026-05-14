// Landing page — first impression before user enters the simulator

// ═══════════════════════════════════════════════════════════════
// Decorative SVG library — used as background ornaments per section
// All decorations: position:absolute, pointer-events:none, aria-hidden
// ═══════════════════════════════════════════════════════════════

function BlueprintGrid({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 600 600" aria-hidden="true" style={style}>
      <defs>
        <pattern id="bp-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="bp-fade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="bp-mask">
          <rect width="600" height="600" fill="url(#bp-fade)" />
        </mask>
      </defs>
      <rect width="600" height="600" fill="url(#bp-grid)" mask="url(#bp-mask)" />
    </svg>
  );
}

function AscendingBars({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 320 200" aria-hidden="true" style={style}>
      <g fill="#b8862c">
        <rect x="0"   y="160" width="32" height="40"  rx="4" opacity="0.3" />
        <rect x="48"  y="130" width="32" height="70"  rx="4" opacity="0.45" />
        <rect x="96"  y="100" width="32" height="100" rx="4" opacity="0.55" />
        <rect x="144" y="70"  width="32" height="130" rx="4" opacity="0.7" />
        <rect x="192" y="40"  width="32" height="160" rx="4" opacity="0.85" />
        <rect x="240" y="10"  width="32" height="190" rx="4" opacity="1" />
      </g>
    </svg>
  );
}

function ConcentricRings({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 480 480" aria-hidden="true" style={style}>
      <g fill="none" strokeWidth="1.5">
        <circle cx="240" cy="240" r="60"  stroke="rgba(255,255,255,0.3)" />
        <circle cx="240" cy="240" r="120" stroke="rgba(255,255,255,0.22)" />
        <circle cx="240" cy="240" r="180" stroke="rgba(184,134,44,0.5)" strokeDasharray="4 6" />
        <circle cx="240" cy="240" r="220" stroke="rgba(255,255,255,0.14)" />
      </g>
      <circle cx="240" cy="240" r="6" fill="#b8862c" />
    </svg>
  );
}

function ConnectingDots({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true" style={style}>
      <path d="M 50 50 Q 300 10, 600 50 T 1150 50" fill="none" stroke="rgba(184,134,44,0.6)" strokeWidth="1.5" strokeDasharray="3 8" />
      <g fill="#b8862c">
        <circle cx="50" cy="50" r="4" />
        <circle cx="400" cy="32" r="4" />
        <circle cx="800" cy="48" r="4" />
        <circle cx="1150" cy="50" r="4" />
      </g>
    </svg>
  );
}

function BuildingSilhouette({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 240 320" aria-hidden="true" style={style}>
      <g fill="rgba(255,255,255,0.55)">
        {/* Roof / pediment */}
        <polygon points="20,90 120,30 220,90" />
        <rect x="14" y="88" width="212" height="14" />
        {/* Columns */}
        <rect x="30"  y="108" width="20" height="170" />
        <rect x="68"  y="108" width="20" height="170" />
        <rect x="106" y="108" width="20" height="170" />
        <rect x="144" y="108" width="20" height="170" />
        <rect x="182" y="108" width="20" height="170" />
        {/* Steps */}
        <rect x="10"  y="284" width="220" height="8" />
        <rect x="0"   y="296" width="240" height="10" />
      </g>
    </svg>
  );
}

function HexMesh({ style }) {
  return (
    <svg className="decor-svg" viewBox="0 0 600 600" aria-hidden="true" style={style}>
      <defs>
        <pattern id="hex-p" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          <polygon points="30,2 56,17 56,47 30,62 4,47 4,17" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#hex-p)" />
    </svg>
  );
}

function GoldOrb({ style, size = 600 }) {
  return (
    <div
      className="decor-orb"
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size, height: size,
        background: 'radial-gradient(closest-side, rgba(184,134,44,0.28), rgba(184,134,44,0.08) 40%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(8px)',
        ...style,
      }}
    />
  );
}

function Landing({ onStart, onDemo, onProjects }) {
  return (
    <div className="landing">
      <LandingNav onStart={onStart} onProjects={onProjects} />
      <HeroSection onStart={onStart} onDemo={onDemo} />
      <StatStrip />
      <ValueProps />
      <HowItWorks />
      <FeatureGrid />
      <MethodologyCard />
      <FinalCTA onStart={onStart} />
      <LandingFooter onProjects={onProjects} />
    </div>
  );
}

function LandingNav({ onStart, onProjects }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={'landing-nav ' + (scrolled ? 'is-scrolled' : '')} aria-label="Navigasi utama">
      <div className="landing-nav-inner">
        <window.LogoWordmark size={36} variant="dark" />
        <div className="landing-nav-links">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#metodologi">Metodologi</a>
          {onProjects && (
            <button className="landing-nav-link-btn" onClick={onProjects}>
              <window.Icon name="folder-open" size={13} /> Project Saya
            </button>
          )}
        </div>
        <button className="btn-primary landing-cta-sm" onClick={onStart}>
          Mulai Menghitung <window.Icon name="arrow-right" size={14} />
        </button>
      </div>
    </nav>
  );
}

function HeroSection({ onStart, onDemo }) {
  const heroRef = React.useRef(null);
  React.useEffect(() => {
    if (!heroRef.current || window.prefersReducedMotion()) return;
    const els = heroRef.current.querySelectorAll('[data-reveal]');
    els.forEach((el, i) => {
      window.motionAnimate(
        el,
        { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
        { duration: 0.7, delay: 0.05 * i, easing: [0.16, 1, 0.3, 1] }
      );
    });
  }, []);

  // Sample IKK components for preview gauge
  const previewIKK = 3.18;
  const previewComponents = [
    { k: 'Rasio Kemandirian (40%)', v: 0.42, norm: 0.84, weight: 0.3 },
    { k: 'Surplus Operasional (25%)', v: 0.08, norm: 0.40, weight: 0.25 },
    { k: 'Rasio Likuiditas (25%)', v: 1.65, norm: 0.83, weight: 0.25 },
    { k: 'Beban Bunga (20%)', v: 0.06, norm: 0.70, weight: 0.2 },
  ];

  return (
    <header className="landing-hero" ref={heroRef}>
      <div className="landing-hero-bg" aria-hidden="true"></div>
      <div className="landing-hero-glow" aria-hidden="true"></div>
      <BuildingSilhouette style={{ position: 'absolute', left: '-40px', bottom: '-40px', width: '260px', opacity: 0.04, zIndex: 0 }} />
      <div className="landing-hero-inner">
        <div className="landing-hero-text">
          <div className="landing-eyebrow" data-reveal>
            <window.Icon name="sparkles" size={12} /> Simulator Akreditasi Keuangan LAMEMBA
          </div>
          <h1 className="landing-h1" data-reveal>
            Kesehatan keuangan kampus Anda,<br/>
            <span className="lh-accent">terukur dan transparan.</span>
          </h1>
          <p className="landing-sub" data-reveal>
            Simulator interaktif yang menghitung <b>29 rasio keuangan</b>, mengevaluasi
            <b> 10 indikator wajib LAMEMBA</b>, dan memprediksi predikat akreditasi keuangan
            Anda — semua berbasis data laporan keuangan yang sudah Anda miliki.
          </p>
          <div className="landing-hero-cta" data-reveal>
            <button className="btn-primary btn-lg" onClick={onStart}>
              Mulai Menghitung <window.Icon name="arrow-right" size={16} />
            </button>
            <button className="btn-ghost-dark btn-lg" onClick={onDemo}>
              <window.Icon name="play" size={14} /> Coba dengan Data Contoh
            </button>
          </div>
          <div className="landing-trust-row" data-reveal>
            <div className="trust-chip"><window.Icon name="shield-check" size={13} /> Standar LAMEMBA 2024</div>
            <div className="trust-chip"><window.Icon name="bar-chart-3" size={13} /> 29 Rasio Keuangan</div>
            <div className="trust-chip"><window.Icon name="gauge" size={13} /> CFI Methodology</div>
          </div>
        </div>
        <div className="landing-hero-visual" data-reveal>
          <div className="hero-card">
            <div className="hero-card-head">
              <div>
                <div className="hcc-eyebrow">Pratinjau</div>
                <div className="hcc-title">Indeks Kinerja Keuangan</div>
              </div>
              <span className="hcc-pill v-BAIK">BAIK</span>
            </div>
            <div className="hero-card-body">
              <window.GaugeIKK value={previewIKK} components={previewComponents} />
            </div>
            <div className="hero-card-foot">
              <div className="hcf-kpi">
                <span className="hcf-l">CFI Total</span>
                <span className="hcf-v mono">74.9</span>
              </div>
              <div className="hcf-kpi">
                <span className="hcf-l">LAMEMBA</span>
                <span className="hcf-v mono">7 / 10</span>
              </div>
              <div className="hcf-kpi">
                <span className="hcf-l">Predikat</span>
                <span className="hcf-v">BAIK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatStrip() {
  return (
    <section className="landing-stats" aria-label="Cakupan analisis">
      <BlueprintGrid style={{ position: 'absolute', bottom: '-60px', left: '-80px', width: '520px', opacity: 0.05, zIndex: 0 }} />
      <AscendingBars style={{ position: 'absolute', right: '-20px', top: '-20px', width: '240px', opacity: 0.06, zIndex: 0 }} />
      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="stat-grid">
          <StatItem to={29} suffix="" label="Rasio Keuangan" sub="dari NACUBO + best practice PT" icon="bar-chart-3" />
          <StatItem to={10} suffix="" label="Indikator LAMEMBA" sub="wajib untuk akreditasi" icon="list-checks" />
          <StatItem to={4} suffix="" label="Predikat Akreditasi" sub="Sangat Baik · Baik · Perhatian · Berisiko" icon="target" />
          <StatItem to={3} suffix=" thn" label="Analisis Historis" sub="TS, TS-1, TS-2 + trend" icon="trending-up" />
        </div>
      </div>
    </section>
  );
}
function StatItem({ to, suffix, label, sub, icon }) {
  return (
    <div className="stat-item">
      <div className="stat-icon"><window.Icon name={icon} size={20} /></div>
      <div className="stat-num"><window.CountUp to={to} duration={1.6} decimals={0} suffix={suffix} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function ValueProps() {
  const items = [
    {
      icon: 'gauge',
      title: 'Hasil Instan, Berbasis Standar',
      body: 'Predikat dari Sangat Baik sampai Berisiko, dihitung dengan metodologi yang dipakai LAMEMBA dan Composite Financial Index (CFI).',
    },
    {
      icon: 'sparkles',
      title: 'Simulasi Sebelum Eksekusi',
      body: 'Geser slider untuk uji dampak kebijakan (kenaikan UKT, tambahan beasiswa, CapEx) terhadap predikat — tanpa mengubah data asli.',
    },
    {
      icon: 'file-text',
      title: 'Siap untuk Rapat Senat & Auditor',
      body: 'Ekspor laporan PDF satu klik dengan ringkasan eksekutif dan 8 tab analisis lengkap (rasio, benchmark, historis, rekomendasi).',
    },
  ];
  return (
    <section className="landing-section" id="fitur">
      <div className="landing-container">
        <div className="section-head">
          <div className="section-eyebrow">Mengapa Aplikasi Ini</div>
          <h2 className="section-h2">Tiga alasan kampus serius memilih simulator ini.</h2>
        </div>
        <div className="vprops-grid">
          {items.map((it, i) => (
            <RevealCard key={i} delay={i * 0.06}>
              <div className="vprop-icon"><window.Icon name={it.icon} size={24} /></div>
              <h3 className="vprop-title">{it.title}</h3>
              <p className="vprop-body">{it.body}</p>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: 'Pilih Preset / Mulai Kosong', desc: 'Cepat-mulai dari salah satu skenario contoh, atau input data sendiri.' },
    { n: 2, title: 'Isi 6 Bagian Data', desc: 'Pendapatan, Pengeluaran, Neraca, Anggaran, Tridharma, Mahasiswa & Dosen.' },
    { n: 3, title: 'Lihat Predikat & Rasio', desc: 'Dashboard interaktif: gauge IKK, scorecard CFI, 10 LAMEMBA, 29 rasio.' },
    { n: 4, title: 'Simulasi & Ekspor', desc: 'Geser what-if slider untuk uji kebijakan, lalu ekspor PDF untuk rapat senat.' },
  ];
  return (
    <section className="landing-section landing-howitworks" id="cara-kerja">
      <ConnectingDots style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: '80px', opacity: 0.18, zIndex: 0 }} />
      <GoldOrb style={{ left: '-200px', top: '20%' }} size={500} />
      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-head">
          <div className="section-eyebrow">Cara Kerja</div>
          <h2 className="section-h2">Dari laporan keuangan ke predikat akreditasi, dalam 4 langkah.</h2>
        </div>
        <ol className="hiw-timeline">
          {steps.map((s, i) => (
            <RevealCard key={s.n} as="li" className="hiw-node" delay={i * 0.08}>
              <div className="hiw-num">{s.n}</div>
              <div className="hiw-text">
                <div className="hiw-title">{s.title}</div>
                <div className="hiw-desc">{s.desc}</div>
              </div>
            </RevealCard>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    { icon: 'gauge', title: 'Composite Financial Index', body: 'Skor agregat 5 dimensi (likuiditas, fleksibilitas, kapital, debt, diversifikasi). Total 0–100 menentukan predikat.' },
    { icon: 'target', title: 'Benchmark 4 Predikat', body: 'Bandingkan semua rasio terhadap threshold Sangat Baik / Baik / Perhatian / Berisiko secara visual.' },
    { icon: 'trending-up', title: 'Tren Historis 3 Tahun', body: 'Sparkline + tabel perbandingan TS vs TS-1 vs TS-2 dengan indikator arah perubahan.' },
    { icon: 'sparkles', title: 'Simulator What-If', body: '11 parameter slider untuk uji dampak kebijakan. Real-time recompute, tidak mengubah data asli.' },
    { icon: 'list-checks', title: 'Rekomendasi Otomatis', body: 'Analisa gap per indikator yang gagal, plus saran konkret untuk perbaikan struktural.' },
    { icon: 'folder-open', title: 'Profil Multi-Kampus', body: 'Simpan beberapa profil untuk satu kampus (atau multi-kampus), load kapan saja.' },
  ];
  return (
    <section className="landing-section landing-features">
      <HexMesh style={{ position: 'absolute', inset: 0, opacity: 0.05, zIndex: 0 }} />
      <GoldOrb style={{ right: '-220px', bottom: '-160px' }} size={620} />
      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-head">
          <div className="section-eyebrow">Fitur Lengkap</div>
          <h2 className="section-h2">Toolkit analisis keuangan yang sebenarnya dipakai.</h2>
        </div>
        <div className="feat-grid">
          {features.map((f, i) => (
            <RevealCard key={i} className="feat-card" delay={(i % 3) * 0.06}>
              <div className="feat-icon"><window.Icon name={f.icon} size={20} /></div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-body">{f.body}</p>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function MethodologyCard() {
  return (
    <section className="landing-section landing-method" id="metodologi">
      <ConcentricRings style={{ position: 'absolute', right: '-180px', top: '50%', transform: 'translateY(-50%)', width: '560px', opacity: 0.08, zIndex: 0 }} />
      <BuildingSilhouette style={{ position: 'absolute', left: '-80px', bottom: '-30px', width: '220px', opacity: 0.05, zIndex: 0 }} />
      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <RevealCard className="method-card">
          <div className="method-grid">
            <div className="method-left">
              <div className="section-eyebrow">Metodologi</div>
              <h2 className="section-h2 method-h2">Berbasis standar yang diakui — bukan opini.</h2>
              <p className="method-lead">
                Simulator ini menggabungkan tiga kerangka kerja yang sudah mapan untuk analisis keuangan perguruan tinggi:
              </p>
              <ul className="method-list">
                <li><b>LAMEMBA 2024</b> — 10 indikator wajib untuk akreditasi keuangan PT, dengan threshold yang sama persis seperti pedoman resmi.</li>
                <li><b>Composite Financial Index</b> — metodologi agregasi skor keuangan dari Tuck School of Business (Dartmouth) yang dipakai universitas di AS.</li>
                <li><b>29 rasio keuangan</b> — terkurasi dari NACUBO dan best practice manajemen keuangan PT.</li>
              </ul>
              <div className="method-disclaimer">
                <window.Icon name="info" size={13} />
                <span><b>Disclaimer:</b> Alat bantu analisis — bukan substitusi audit resmi atau penilaian akreditasi formal.</span>
              </div>
            </div>
            <div className="method-right">
              <MethodBadge title="LAMEMBA" sub="10 indikator wajib" pct={100} icon="shield-check" />
              <MethodBadge title="CFI Score" sub="5 dimensi · 0–100" pct={100} icon="gauge" />
              <MethodBadge title="29 Rasio" sub="Likuiditas, profitabilitas, dll" pct={100} icon="bar-chart-3" />
              <MethodBadge title="3 Tahun" sub="Analisis tren historis" pct={100} icon="trending-up" />
            </div>
          </div>
        </RevealCard>
      </div>
    </section>
  );
}
function MethodBadge({ title, sub, pct, icon }) {
  return (
    <div className="method-badge">
      <div className="mb-icon"><window.Icon name={icon} size={18} /></div>
      <div className="mb-text">
        <div className="mb-title">{title}</div>
        <div className="mb-sub">{sub}</div>
      </div>
    </div>
  );
}

// === Template Download Helper ===
function downloadTemplate(format) {
  if (!window.FIELDS) return;
  const fields = Object.entries(window.FIELDS).filter(([k, f]) => !f.informational);
  const lines = [];
  // Header
  lines.push(['Komponen', 'Kunci', 'Grup', 'TS (Tahun Ini)', 'TS-1', 'TS-2', 'Catatan Pengisian']);
  // Field rows
  fields.forEach(([k, f]) => {
    lines.push([f.label, k, f.group, '', '', '', f.info || '']);
  });
  // Build CSV
  const csv = lines.map(row =>
    row.map(cell => {
      const s = String(cell || '');
      // Quote if contains comma, quote, or newline
      if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(';') // Use semicolon for Indonesian Excel compat
  ).join('\r\n');
  // Add BOM for UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-rasio-keuangan-kampus.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) {
    window.showToast('Template CSV diunduh — buka di Excel/Sheets', { variant: 'success' });
  }
}

function FinalCTA({ onStart }) {
  return (
    <section className="landing-section landing-final-cta">
      <div className="landing-container">
        <RevealCard className="final-cta-box">
          <div className="fcb-left">
            <div className="section-eyebrow on-dark">Mulai Sekarang</div>
            <h2 className="fcb-h2">Mulai analisis kampus Anda<br/>dalam 5 menit.</h2>
            <p className="fcb-p">
              Tanpa instalasi, tanpa akun. Data tersimpan lokal di perangkat Anda.
              Pilih preset untuk demo, atau langsung input data laporan keuangan kampus.
            </p>
            <p className="fcb-template">
              Belum siap input langsung? <button className="fcb-template-link" onClick={() => downloadTemplate('csv')}>
                <window.Icon name="save" size={13} /> Unduh template Excel
              </button>
            </p>
          </div>
          <div className="fcb-right">
            <button className="btn-primary btn-lg btn-gold" onClick={onStart}>
              Mulai Menghitung <window.Icon name="arrow-right" size={16} />
            </button>
          </div>
        </RevealCard>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <window.LogoWordmark size={32} variant="dark" subtitle="Simulator LAMEMBA · Composite Financial Index" />
        <div className="lf-meta">
          <span>© {new Date().getFullYear()} Rasio Keuangan Kampus</span>
          <span className="lf-sep">·</span>
          <span>v0.2.0</span>
          <span className="lf-sep">·</span>
          <span>Untuk keperluan analisis internal kampus</span>
        </div>
      </div>
    </footer>
  );
}

function RevealCard({ children, className = '', delay = 0, as = 'div' }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    if (window.prefersReducedMotion()) {
      ref.current.style.opacity = 1;
      return;
    }
    ref.current.style.opacity = 0;
    ref.current.style.transform = 'translateY(20px)';
    const stop = window.motionInView(ref.current, () => {
      window.motionAnimate(
        ref.current,
        { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0)'] },
        { duration: 0.7, delay, easing: [0.16, 1, 0.3, 1] }
      );
    }, { amount: 0.2 });
    return () => { if (typeof stop === 'function') stop(); };
  }, [delay]);
  const Tag = as;
  return <Tag ref={ref} className={className}>{children}</Tag>;
}

window.Landing = Landing;
