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

// === Chart colors (single source of truth, mirrors CSS vars) ===
const CHART_COLORS = {
  primary: '#142847',
  primary2: '#1f3b6b',
  ink3: '#5b6a82',
  ink4: '#8a96aa',
  gold: '#b8862c',
  gold2: '#d4a23f',
  ok: '#2f6b3d',
  warn: '#a06310',
  warnAlt: '#c07928',
  bad: '#9b2c2c',
  info: '#1e6fb8',
  series: ['#142847','#1f3b6b','#b8862c','#5b6a82','#2f6b3d','#a06310','#1e6fb8','#9b2c2c'],
};

// === Reduced motion check ===
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// === Motion One wrapper — safe no-op if Motion missing or reduced-motion ===
function motionAnimate(target, keyframes, options) {
  if (!target || !window.Motion || prefersReducedMotion()) return null;
  try {
    return window.Motion.animate(target, keyframes, options);
  } catch (e) {
    return null;
  }
}

function motionInView(target, callback, options) {
  if (!target || !window.Motion) {
    // Fallback: fire callback once on first idle if Motion missing
    if (callback) setTimeout(callback, 0);
    return () => {};
  }
  try {
    return window.Motion.inView(target, callback, options);
  } catch (e) {
    if (callback) setTimeout(callback, 0);
    return () => {};
  }
}

// === useInViewAnimate hook ===
function useInViewAnimate(ref, keyframes, options = {}) {
  React.useEffect(() => {
    if (!ref.current) return;
    if (prefersReducedMotion()) {
      // Set the final state without animating
      const final = {};
      Object.keys(keyframes).forEach(k => {
        const v = keyframes[k];
        final[k] = Array.isArray(v) ? v[v.length - 1] : v;
      });
      Object.assign(ref.current.style, final);
      return;
    }
    const stop = motionInView(ref.current, () => {
      motionAnimate(ref.current, keyframes, { duration: 0.6, easing: [0.16, 1, 0.3, 1], ...options });
    }, { amount: 0.3 });
    return () => { if (typeof stop === 'function') stop(); };
  }, [ref]);
}

// === CountUp component (animated number, uses requestAnimationFrame) ===
function CountUp({ to, duration = 1.5, decimals = 0, suffix = '', prefix = '' }) {
  const ref = React.useRef(null);
  const [val, setVal] = React.useState(prefersReducedMotion() ? to : 0);
  const hasRunRef = React.useRef(false);
  React.useEffect(() => {
    if (!ref.current || prefersReducedMotion()) {
      setVal(to);
      return;
    }
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const runCountUp = () => {
      if (hasRunRef.current) return;
      hasRunRef.current = true;
      const start = performance.now();
      const durMs = duration * 1000;
      let rafId;
      const tick = (now) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durMs);
        setVal(to * ease(t));
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setVal(to);
        }
      };
      rafId = requestAnimationFrame(tick);
    };
    const stopInView = motionInView(ref.current, runCountUp, { amount: 0.4 });
    return () => { if (typeof stopInView === 'function') stopInView(); };
  }, [to, duration]);
  return <span ref={ref}>{prefix}{Number(val).toFixed(decimals)}{suffix}</span>;
}

// === Logo (geometric monogram + ascending bars) ===
function Logo({ size = 40, variant = 'light' }) {
  const navy = '#142847';
  const gold = '#b8862c';
  const grad = 'logoGrad-' + variant;
  // light variant = navy filled bg (works on light surface); dark variant = transparent bg (works on navy surface)
  const bgFill = variant === 'light' ? `url(#${grad})` : 'transparent';
  const stroke = variant === 'light' ? '#0a1729' : 'rgba(255,255,255,0.08)';
  const rPath = gold;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rasio Keuangan Kampus">
      <title>Rasio Keuangan Kampus</title>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a3358" />
          <stop offset="100%" stopColor="#0a1729" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="10" fill={bgFill} stroke={stroke} strokeWidth="1" />
      {/* Stylized R */}
      <path
        d="M12 14 L12 34 M12 14 L20 14 Q25 14 25 19 Q25 24 20 24 L12 24 M20 24 L26 34"
        stroke={rPath}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ascending bars (index/growth motif) */}
      <rect x="31" y="24" width="2.8" height="6"  rx="0.6" fill={gold} opacity="0.5" />
      <rect x="35" y="20" width="2.8" height="10" rx="0.6" fill={gold} opacity="0.75" />
      <rect x="39" y="14" width="2.8" height="16" rx="0.6" fill={gold} />
    </svg>
  );
}

function LogoWordmark({ size = 40, variant = 'dark', subtitle = 'Simulator LAMEMBA' }) {
  const inkColor = variant === 'dark' ? '#142847' : '#ffffff';
  const subColor = variant === 'dark' ? '#5b6a82' : 'rgba(255,255,255,0.65)';
  return (
    <div className="logo-wordmark" style={{display:'flex',alignItems:'center',gap:12}}>
      <Logo size={size} variant={variant === 'dark' ? 'light' : 'dark'} />
      <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
        <span style={{fontFamily:'var(--serif)',fontWeight:800,fontSize:16,color:inkColor,letterSpacing:'-0.01em'}}>
          Rasio Keuangan Kampus
        </span>
        {subtitle && (
          <span style={{fontSize:11,color:subColor,letterSpacing:'.04em',marginTop:2,fontWeight:500}}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// === Icon set (inline Lucide SVGs) ===
const ICON_PATHS = {
  'arrow-left': <path d="M19 12H5M12 19l-7-7 7-7"/>,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7"/>,
  'arrow-up-right': <path d="M7 17L17 7M7 7h10v10"/>,
  'check': <path d="M20 6L9 17l-5-5"/>,
  'x': <path d="M18 6L6 18M6 6l12 12"/>,
  'plus': <path d="M12 5v14M5 12h14"/>,
  'minus': <path d="M5 12h14"/>,
  'plus-minus': <g><path d="M5 8h6M8 5v6"/><path d="M13 16h6"/></g>,
  'info': <g><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></g>,
  'alert-triangle': <g><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></g>,
  'star': <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
  'printer': <g><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></g>,
  'save': <g><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></g>,
  'folder-open': <path d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.55 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H18a2 2 0 012 2v2"/>,
  'rotate-ccw': <g><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></g>,
  'refresh-cw': <g><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></g>,
  'sparkles': <g><path d="M12 3L9.5 8.5 4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5L12 3z"/><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"/></g>,
  'play': <polygon points="5 3 19 12 5 21 5 3"/>,
  'chevron-down': <polyline points="6 9 12 15 18 9"/>,
  'chevron-right': <polyline points="9 18 15 12 9 6"/>,
  'menu': <g><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></g>,
  'trash-2': <g><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></g>,
  'edit-2': <path d="M17 3a2.85 2.83 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>,
  'bar-chart-3': <g><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></g>,
  'gauge': <g><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1117.32 0"/></g>,
  'target': <g><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g>,
  'trending-up': <g><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></g>,
  'shield-check': <g><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></g>,
  'file-text': <g><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></g>,
  'list-checks': <g><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></g>,
  'compass': <g><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></g>,
  'home': <g><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></g>,
  'calculator': <g><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></g>,
};
function Icon({ name, size = 16, strokeWidth = 2, className = '', style = {} }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'icon ' + className}
      style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,...style}}
      aria-hidden="true"
    >
      {path}
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
window.CHART_COLORS = CHART_COLORS;
window.prefersReducedMotion = prefersReducedMotion;
window.motionAnimate = motionAnimate;
window.motionInView = motionInView;
window.useInViewAnimate = useInViewAnimate;
window.CountUp = CountUp;
window.Logo = Logo;
window.LogoWordmark = LogoWordmark;
window.Icon = Icon;
