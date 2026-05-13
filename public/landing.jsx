// Landing page — first impression before user enters the simulator
function Landing({ onStart, onDemo }) {
  return (
    <div className="landing">
      <LandingNav onStart={onStart} />
      <HeroSection onStart={onStart} onDemo={onDemo} />
      <StatStrip />
      <ValueProps />
      <HowItWorks />
      <FeatureGrid />
      <MethodologyCard />
      <FinalCTA onStart={onStart} />
      <LandingFooter />
    </div>
  );
}

function LandingNav({ onStart }) {
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
      <div className="landing-container">
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
      <div className="landing-container">
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
    <section className="landing-section">
      <div className="landing-container">
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
      <div className="landing-container">
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
