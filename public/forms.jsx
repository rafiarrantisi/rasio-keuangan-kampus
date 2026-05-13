// Input forms for each wizard step

// === FormPageHeader — large unified header for all 6 step forms ===
function FormPageHeader({ letter, title, subtitle, completion }) {
  return (
    <div className="form-page-header">
      <div className="fph-row">
        <span className="fph-badge">{letter}</span>
        <div className="fph-text">
          <h2 className="fph-title">{title}</h2>
          {subtitle && <p className="fph-subtitle">{subtitle}</p>}
        </div>
        {completion && (
          <div className="fph-completion" title={completion.filled + ' dari ' + completion.total + ' field terisi'}>
            <div className="fph-comp-bar">
              <div className="fph-comp-bar-fill" style={{width: (completion.filled / completion.total * 100) + '%'}}></div>
            </div>
            <span className="fph-comp-label">{completion.filled}/{completion.total} terisi</span>
          </div>
        )}
      </div>
    </div>
  );
}

// === FormTip — callout style for tip / hint blocks ===
function FormTip({ children, variant = 'gold' }) {
  return (
    <div className={'form-tip form-tip-' + variant}>
      <window.Icon name="info" size={14} />
      <div>{children}</div>
    </div>
  );
}

window.FormPageHeader = FormPageHeader;
window.FormTip = FormTip;

function CurrencyInput({ value, onChange, warn, allowNegative }) {
  const [str, setStr] = React.useState('');
  React.useEffect(() => {
    if (value === '' || value === null || value === undefined) { setStr(''); return; }
    setStr((value < 0 ? '−' : '') + Math.abs(value).toLocaleString('id-ID'));
  }, [value]);
  const handle = (e) => {
    let raw = e.target.value.replace(/[^\d-]/g, '').replace(/−/g, '-');
    const neg = allowNegative && (raw.startsWith('-') || str.startsWith('−'));
    raw = raw.replace(/-/g, '');
    if (raw === '') { setStr(''); onChange(''); return; }
    const n = parseInt(raw, 10) * (neg ? -1 : 1);
    setStr((neg ? '−' : '') + Math.abs(n).toLocaleString('id-ID'));
    onChange(n);
  };
  const flip = () => {
    if (value === '' || value === 0) return;
    onChange(-value);
  };
  return (
    <div style={{position:'relative', flex:1}}>
      <input type="text" value={str} onChange={handle} className={warn ? 'warn' : ''} placeholder="0" />
      {allowNegative && (
        <button type="button" onClick={flip} title="Toggle ±" className="input-flip-btn">
          <window.Icon name="plus-minus" size={12} />
        </button>
      )}
    </div>
  );
}

function FieldRow({ k, label, info, allowNegative, data, onChange, derived, derivedFn, validate }) {
  const warn = validate ? validate(data.TS[k]) : null;
  return (<>
    <div className="row-label">
      {info && (
        <span className="tip-wrap">
          <span className="info"><window.Icon name="info" size={11} /></span>
          <span className="tip">{info}</span>
        </span>
      )}
      <span>{label}</span>
    </div>
    {['TS','TS-1','TS-2'].map(yr => (
      <div className="cell-input" key={yr}>
        {derived ? <div className="cell-derived" style={{flex:1}}>{fmtRpFull(derivedFn(data[yr]))}</div> :
          <CurrencyInput value={data[yr][k]} onChange={(v) => onChange(yr, k, v)} warn={warn && yr === 'TS'} allowNegative={allowNegative} />}
      </div>
    ))}
    {warn && <div className="row-warn"><window.Icon name="alert-triangle" size={13} /> {warn}</div>}
  </>);
}

function FormHeader() {
  return (<>
    <div className="head">Komponen</div>
    <div className="head">TS (Tahun Ini)</div>
    <div className="head">TS-1</div>
    <div className="head">TS-2</div>
  </>);
}

// === Pendapatan ===
function StepRev({ data, onChange }) {
  const fields = [
    { k: 'revSppGross', label: 'Pendapatan SPP/UKT (Gross)', info: 'Total uang kuliah kotor sebelum potongan beasiswa.' },
    { k: 'revBeasiswa', label: 'Beasiswa & Financial Aid', info: 'Pengurang SPP — diisi NEGATIF.', neg: true,
      validate: v => v > 0 ? 'Beasiswa harus negatif (pengurang)' : null },
    { k: 'revPemerintah', label: 'Pendapatan Pemerintah (BOPTN)', info: 'Bantuan Operasional PTN, hibah pemerintah pusat/daerah.' },
    { k: 'revRiset', label: 'Pendapatan Penelitian & Hibah', info: 'Hibah DIKTI, LPDP, hibah industri & internasional.' },
    { k: 'revDonasi', label: 'Pendapatan Donasi & Sumbangan', info: 'Donasi alumni, CSR, gifts. Indikator kekuatan jaringan alumni.' },
    { k: 'revAux', label: 'Pendapatan Auxiliary', info: 'Kantin, parkir, klinik, lab terbuka, asrama. Target sehat 15–25%.' },
    { k: 'revEndowOps', label: 'Pendapatan Investasi Endowment (operasional)', info: 'Bagian return dana abadi yang dialokasikan ke operasional.' },
    { k: 'revLain', label: 'Pendapatan Lain-lain', info: 'Sertifikasi, kerjasama pelatihan, event, dll.' },
  ];
  const netTuition = (d) => (d.revSppGross || 0) + (d.revBeasiswa || 0);
  const totalRev = (d) => fields.reduce((s, f) => s + (d[f.k] || 0), 0);
  const filled = fields.filter(f => data.TS && data.TS[f.k]).length;
  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="A"
        title="Pendapatan Institusi"
        subtitle="Sumber pendapatan untuk 3 tahun terakhir (TS, TS−1, TS−2). Beasiswa diisi sebagai nilai negatif untuk dipotong dari SPP Gross."
        completion={{ filled, total: fields.length }}
      />
      <div className="field-grid">
        <FormHeader />
        {fields.map(f => (
          <FieldRow key={f.k} k={f.k} label={f.label} info={f.info}
            allowNegative={f.neg} data={data} onChange={onChange} validate={f.validate} />
        ))}
        {/* derived */}
        <FieldRow k="netTuition" label="→ Net Tuition (SPP − Beasiswa)" data={data} onChange={() => {}} derived derivedFn={netTuition} />
        <FieldRow k="totalRev" label="→ TOTAL PENDAPATAN" data={data} onChange={() => {}} derived derivedFn={totalRev} />
      </div>
      <FormTip>
        <strong>Tip:</strong> Klik tombol <b>±</b> di sisi kanan input untuk mengganti tanda. Beasiswa harus negatif agar dipotong dari SPP Gross.
      </FormTip>
    </div>
  );
}

// === Pengeluaran ===
function StepExp({ data, onChange }) {
  const fields = [
    { k: 'expOps', label: 'Biaya Operasional Langsung (Tridharma)', info: 'Pengajaran, lab, penelitian, PkM. REO target ≥ 65%.' },
    { k: 'expAdmin', label: 'Biaya Administrasi & Institutional Support', info: 'Overhead: IT, tata usaha, keamanan. Idealnya < 12%.' },
    { k: 'expSDM', label: 'Anggaran Pengembangan SDM', info: 'Pelatihan, riset hibah dosen. RISDM target ≥ 15%.' },
    { k: 'expCapex', label: 'Belanja Aset Tetap / CapEx', info: 'Investasi sarpras: gedung, lab, IT.' },
    { k: 'expMaint', label: 'Biaya Pemeliharaan Sarpras', info: 'Perawatan rutin gedung, peralatan, IT.' },
    { k: 'expFaculty', label: 'Tunjangan Dosen Tetap', info: 'Tunjangan jabatan akademik dosen tetap.' },
    { k: 'expDepr', label: 'Depresiasi / Penyusutan Aset', info: 'Beban non-kas. Komponen EBITDA.' },
    { k: 'expInterest', label: 'Beban Bunga (Interest Expense)', info: 'Bunga pinjaman tahunan. Untuk Interest Coverage Ratio.' },
    { k: 'expLain', label: 'Biaya Lain-lain Operasional', info: 'Pos non-rutin & lain-lain.' },
    { k: 'expInstr', label: '[INFO] Biaya Instruksi/Pengajaran (subset Ops)', info: 'INFO SAJA — sudah termasuk dalam Biaya Ops Langsung. Tidak dijumlahkan ulang.' },
  ];
  const totalExp = (d) => (d.expOps||0)+(d.expAdmin||0)+(d.expSDM||0)+(d.expCapex||0)+(d.expMaint||0)+(d.expFaculty||0)+(d.expDepr||0)+(d.expInterest||0)+(d.expLain||0);
  const filled = fields.filter(f => data.TS && data.TS[f.k]).length;
  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="B"
        title="Pengeluaran Institusi"
        subtitle="Komponen biaya operasional. Biaya Instruksi adalah info-only — sudah termasuk dalam Biaya Operasional Langsung, tidak dijumlahkan ulang."
        completion={{ filled, total: fields.length }}
      />
      <div className="field-grid">
        <FormHeader />
        {fields.map(f => (
          <FieldRow key={f.k} k={f.k} label={f.label} info={f.info} data={data} onChange={onChange} />
        ))}
        <FieldRow k="totalExp" label="→ TOTAL PENGELUARAN" data={data} onChange={() => {}} derived derivedFn={totalExp} />
      </div>
      <FormTip>
        Target rasio LAMEMBA: <b>REO ≥ 65%</b> (Biaya Ops Langsung / Total Pengeluaran), <b>RISDM ≥ 15%</b> (SDM/Total), <b>RISP ≥ 20%</b> (CapEx + Maintenance / Total).
      </FormTip>
    </div>
  );
}

// === Neraca ===
function StepBS({ data, onChange }) {
  const lancar = [
    { k: 'bsKas', label: 'Kas & Setara Kas', info: 'Giro, deposito < 3 bulan. Untuk Days Cash on Hand.' },
    { k: 'bsInvJP', label: 'Investasi Jangka Pendek', info: 'Deposito, reksadana pasar uang.' },
    { k: 'bsPiutang', label: 'Piutang Bersih', info: 'Piutang mahasiswa + lain (setelah penyisihan).' },
    { k: 'bsLainLancar', label: 'Aset Lancar Lainnya', info: 'Aset lancar lain non-kas non-piutang.' },
  ];
  const tetap = [
    { k: 'bsAsetTetap', label: 'Total Aset Tetap (Neto)', info: 'Tanah, bangunan, lab, peralatan setelah depresiasi.' },
    { k: 'bsEndowment', label: 'Endowment / Dana Abadi', info: 'Nilai pasar dana abadi institusi.' },
  ];
  const kwj = [
    { k: 'bsKwjJP', label: 'Kewajiban Jangka Pendek', info: 'Utang lancar < 12 bulan. Untuk Rasio Likuiditas (LAMEMBA L9).' },
    { k: 'bsKwjJPj', label: 'Kewajiban Jangka Panjang / Total Utang', info: 'Pinjaman bank jangka panjang, obligasi.' },
  ];
  const eq = [
    { k: 'bsExpNA', label: 'Expendable Net Assets', info: 'Aset bersih yang dapat digunakan. Inti Primary Reserve & Viability.' },
    { k: 'bsChangeNA', label: 'Change in Net Assets (Surplus/Defisit)', info: 'Perubahan aset bersih periode berjalan.' },
    { k: 'bsBeginNA', label: 'Beginning Net Assets', info: 'Aset bersih awal periode (untuk Return on NA).' },
  ];
  const liq = [
    { k: 'bsDebtSrv', label: 'Annual Debt Service (Pokok+Bunga)', info: 'Cicilan pokok + bunga tahunan. Untuk DSCR.' },
    { k: 'bsLiqSrc', label: 'Sources of Liquidity', info: 'Kas, investasi likuid, lini kredit tersedia.' },
    { k: 'bsLiqUse', label: 'Uses of Liquidity', info: 'Kebutuhan likuiditas operasional 12 bulan.' },
  ];
  const lancarSum = (d) => lancar.reduce((s, f) => s + (d[f.k] || 0), 0);
  const totalAset = (d) => lancarSum(d) + (d.bsAsetTetap || 0) + (d.bsEndowment || 0);
  const renderGroup = (title, items) => (<>
    <div className="field-grid-group-divider">{title}</div>
    {items.map(f => <FieldRow key={f.k} k={f.k} label={f.label} info={f.info} data={data} onChange={onChange} />)}
  </>);
  const allFields = [...lancar, ...tetap, ...kwj, ...eq, ...liq];
  const filled = allFields.filter(f => data.TS && data.TS[f.k]).length;
  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="C"
        title="Neraca Keuangan"
        subtitle="Posisi aset, kewajiban, dan ekuitas untuk 3 tahun. Komponen liquidity & debt service dipakai untuk perhitungan DSCR (LAMEMBA L7)."
        completion={{ filled, total: allFields.length }}
      />
      <div className="field-grid">
        <FormHeader />
        {renderGroup('Aset Lancar', lancar)}
        <FieldRow k="lancarSum" label="→ Total Aset Lancar" data={data} onChange={() => {}} derived derivedFn={lancarSum} />
        {renderGroup('Aset Tetap & Endowment', tetap)}
        <FieldRow k="totalAset" label="→ TOTAL ASET" data={data} onChange={() => {}} derived derivedFn={totalAset} />
        {renderGroup('Kewajiban', kwj)}
        {renderGroup('Aset Bersih', eq)}
        {renderGroup('Likuiditas & Debt Service', liq)}
      </div>
    </div>
  );
}

// === Anggaran ===
function StepBudget({ data, onChange }) {
  const TS = data.TS;
  const [realMode, setRealMode] = React.useState('auto'); // 'auto' | 'manual'

  const items = [
    { k: 'budgetTotalRev',  label: 'Total Pendapatan',            realK: '_totalRev',  infoAuto: 'Dijumlah otomatis dari semua komponen pendapatan (Langkah 1).' },
    { k: 'budgetOps',       label: 'Biaya Operasional Langsung',  realK: 'expOps',     infoAuto: 'Diambil otomatis dari Langkah 2 → Biaya Operasional Langsung.' },
    { k: 'budgetSDM',       label: 'Pengembangan SDM',            realK: 'expSDM',     infoAuto: 'Diambil otomatis dari Langkah 2 → Anggaran Pengembangan SDM.' },
    { k: 'budgetSarpras',   label: 'Investasi Sarpras',           realK: '_sarpras',   infoAuto: 'Dijumlah otomatis: CapEx Aset Tetap + Biaya Pemeliharaan (Langkah 2).' },
    { k: 'budgetAdmin',     label: 'Biaya Administrasi',          realK: 'expAdmin',   infoAuto: 'Diambil otomatis dari Langkah 2 → Biaya Administrasi & Institutional Support.' },
    { k: 'budgetTotalExp',  label: 'Total Pengeluaran',           realK: '_totalExp',  infoAuto: 'Dijumlah otomatis dari semua komponen pengeluaran (Langkah 2).' },
  ];

  const autoReal = (k) => {
    const rev = ['revSppGross','revBeasiswa','revPemerintah','revRiset','revDonasi','revAux','revEndowOps','revLain'];
    const exp = ['expOps','expAdmin','expSDM','expCapex','expMaint','expFaculty','expDepr','expInterest','expLain'];
    if (k === '_totalRev') return rev.reduce((s, x) => s + (TS[x] || 0), 0);
    if (k === '_totalExp') return exp.reduce((s, x) => s + (TS[x] || 0), 0);
    if (k === '_sarpras')  return (TS.expCapex || 0) + (TS.expMaint || 0);
    return TS[k] || 0;
  };

  const getReal = (it) => {
    if (realMode === 'manual') {
      const manualVal = TS['budgetActual_' + it.realK];
      if (manualVal !== undefined && manualVal !== '') return manualVal;
    }
    return autoReal(it.realK);
  };

  // compute stats
  const rows = items.map(it => {
    const plan = TS[it.k] || 0;
    const real = getReal(it);
    const variance = real - plan;
    const variancePct = plan === 0 ? 0 : variance / plan;
    const abs = Math.abs(variancePct);
    const status = plan === 0 ? 'neutral' : abs <= 0.05 ? 'ok' : abs <= 0.10 ? 'warn' : 'bad';
    return { ...it, plan, real, variance, variancePct, abs, status };
  });

  const nonNeutral  = rows.filter(r => r.status !== 'neutral');
  const countOk     = nonNeutral.filter(r => r.status === 'ok').length;
  const countWarn   = nonNeutral.filter(r => r.status === 'warn').length;
  const countBad    = nonNeutral.filter(r => r.status === 'bad').length;
  const avgVar      = nonNeutral.length
    ? nonNeutral.reduce((s, r) => s + r.abs, 0) / nonNeutral.length : 0;
  const varOk       = avgVar <= 0.1;

  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="D"
        title="Anggaran (RKAT) vs Realisasi"
        subtitle="Bandingkan rencana RKAT terhadap realisasi aktual tahun TS. Varians dihitung otomatis. Target LAMEMBA L3: rata-rata |varians| ≤ 10%."
      />
      <div className="budget-page-header">
        <div></div>
        {/* Mode toggle */}
        <div className="real-mode-toggle">
          <span className="rmt-label">Mode Realisasi:</span>
          <button
            className={'rmt-btn' + (realMode === 'auto' ? ' active' : '')}
            onClick={() => setRealMode('auto')}>
            Otomatis
          </button>
          <button
            className={'rmt-btn' + (realMode === 'manual' ? ' active' : '')}
            onClick={() => setRealMode('manual')}>
            Manual
          </button>
          {realMode === 'manual' && (
            <span className="rmt-hint">Isi nilai aktual yang berbeda dari Langkah 1&2</span>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="budget-summary">
        <div className="bs-item">
          <div className="bs-label">Rata-rata |Varians|</div>
          <div className={'bs-val mono ' + (varOk ? 'ok' : 'bad')}>{(avgVar * 100).toFixed(2)}%</div>
        </div>
        <div className="bs-item">
          <div className="bs-label">Status L3 (≤ 10%)</div>
          <div className="bs-val"><StatusPill s={varOk ? 'ok' : 'bad'} /></div>
        </div>
        <div className="bs-item bs-counts">
          <div className="bs-count ok">{countOk} OK</div>
          <div className="bs-count warn">{countWarn} Perhatian</div>
          <div className="bs-count bad">{countBad} Belum</div>
        </div>
        <div className="bs-item bs-formula">
          <div className="bs-label">Formula L3</div>
          <div className="bs-val mono" style={{fontSize:11}}>Σ|Var%| / 6 ≤ 10%</div>
        </div>
      </div>

      {/* Table */}
      <div className="budget-table">
        <div className="bt-head">
          <div>Pos Anggaran</div>
          <div>Rencana RKAT (Rp)</div>
          <div>
            Realisasi (Rp)
            {realMode === 'auto'
              ? <span className="bt-head-sub">otomatis dari Langkah 1&2</span>
              : <span className="bt-head-sub bt-manual-badge">mode manual</span>}
          </div>
          <div>Varians (Rp)</div>
          <div>Varians (%)</div>
          <div>Status</div>
          <div>Catatan</div>
        </div>

        {rows.map((row, idx) => {
          const { it, plan, real, variance, variancePct, status } = { it: row, ...row };
          const absPct = row.abs;
          const overUnder = variance === 0 || plan === 0 ? null
            : variance > 0 ? { label: '↑ Lebih', cls: 'pos' }
            : { label: '↓ Kurang', cls: 'neg' };

          return (
            <div key={row.k} className={'bt-row' + (idx % 2 === 0 ? ' even' : '')}>
              {/* Pos name */}
              <div className="bt-name">
                <span className="bt-name-text">{row.label}</span>
                {row.infoAuto && (
                  <span className="tip-wrap">
                    <span className="info">i</span>
                    <span className="tip">{row.infoAuto}</span>
                  </span>
                )}
              </div>

              {/* Rencana RKAT — always editable */}
              <div className="bt-cell">
                <CurrencyInput value={TS[row.k]} onChange={(v) => onChange('TS', row.k, v)} />
              </div>

              {/* Realisasi — read-only in auto, editable in manual */}
              <div className="bt-cell">
                {realMode === 'auto'
                  ? <div className="bt-derived mono">{fmtRpFull(real)}</div>
                  : <CurrencyInput
                      value={TS['budgetActual_' + row.realK] !== undefined
                        ? TS['budgetActual_' + row.realK]
                        : autoReal(row.realK)}
                      onChange={(v) => onChange('TS', 'budgetActual_' + row.realK, v)}
                    />
                }
              </div>

              {/* Varians Rp */}
              <div className={'bt-variance-rp mono ' + (variance > 0 ? 'pos' : variance < 0 ? 'neg' : '')}>
                {plan === 0 ? <span className="na">—</span>
                  : <>{(variance >= 0 ? '+' : '−')}{fmtRpFull(Math.abs(variance))}</>}
              </div>

              {/* Varians % + chip */}
              <div className={'bt-pct-cell ' + (status === 'ok' ? 'pos' : status === 'bad' ? 'neg' : status === 'warn' ? 'warn' : '')}>
                {plan === 0
                  ? <span className="na">—</span>
                  : <>
                      <span className="bt-pct-val mono">
                        {(variancePct >= 0 ? '+' : '')}{(variancePct * 100).toFixed(2)}%
                      </span>
                      {overUnder && (
                        <span className={'bt-chip ' + overUnder.cls}>{overUnder.label}</span>
                      )}
                    </>
                }
              </div>

              {/* Status pill */}
              <div className="bt-status-cell">
                <StatusPill s={status} />
                {status === 'bad' && plan !== 0 && (
                  <span className="bt-status-hint">≥ 10% — wajib penjelasan</span>
                )}
                {status === 'warn' && (
                  <span className="bt-status-hint">5–10% — perhatian</span>
                )}
              </div>

              {/* Catatan */}
              <div className="bt-note-cell">
                <input
                  type="text"
                  className="bt-note-input"
                  placeholder="Catatan penyebab varians…"
                  value={TS['budgetNote_' + row.k] || ''}
                  onChange={(e) => onChange('TS', 'budgetNote_' + row.k, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="note">
        <strong>Panduan:</strong>{' '}
        <span className="note-ok">Hijau ≤ 5%</span> = OK ·{' '}
        <span className="note-warn">Kuning 5–10%</span> = Perhatian ·{' '}
        <span className="note-bad">Merah &gt;10%</span> = Belum terpenuhi LAMEMBA L3.
        Mode <b>Manual</b> memungkinkan entry nilai realisasi aktual yang berbeda dari input Langkah 1&2.
        Kolom <b>Catatan</b> untuk mendokumentasikan penyebab varians.
      </div>
    </div>
  );
}

// === Tridharma ===
function StepTri({ data, onChange }) {
  const TS = data.TS;
  const [showSuggestion, setShowSuggestion] = React.useState(false);
  const total = (TS.triPend || 0) + (TS.triRiset || 0) + (TS.triPkM || 0);
  const items = [
    { k: 'triPend',  label: 'Pendidikan',                  bobot: 0.5, color: '#142847' },
    { k: 'triRiset', label: 'Penelitian',                  bobot: 0.3, color: '#1f3b6b' },
    { k: 'triPkM',   label: 'Pengabdian Masyarakat (PkM)', bobot: 0.2, color: '#b8862c' },
  ];
  const expOps = TS.expOps || 0;

  // consistency check
  const diff = total > 0 && expOps > 0 ? total - expOps : null;
  const sumOk = diff !== null ? Math.abs(diff) / expOps <= 0.05 : null;

  // per-item stats
  const rows = items.map(it => {
    const v = TS[it.k] || 0;
    const prop = total === 0 ? 0 : v / total;
    const dev = prop - it.bobot;
    const ok = Math.abs(dev) <= 0.10;
    const targetRp = it.bobot * total;
    const selisihRp = v - targetRp;
    return { ...it, v, prop, dev, ok, targetRp, selisihRp };
  });
  const allOk = rows.every(r => r.ok);
  const failRows = rows.filter(r => !r.ok);

  // suggestion: move amounts to hit exactly the target proportion
  const suggestions = items.map(it => {
    const targetRp = it.bobot * total;
    const current = TS[it.k] || 0;
    const delta = targetRp - current;
    return { ...it, targetRp, delta };
  });

  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="E"
        title="Alokasi Tridharma"
        subtitle="Pembagian Biaya Operasional Langsung ke tiga fungsi Tridharma. Target LAMEMBA L10: proporsi mendekati 50% / 30% / 20% dengan deviasi maksimum ±10 pp per fungsi."
      />

      {/* Summary bar */}
      <div className="budget-summary">
        <div className="bs-item">
          <div className="bs-label">Total Alokasi</div>
          <div className="bs-val mono">{fmtRpFull(total)}</div>
        </div>
        <div className="bs-item">
          <div className="bs-label">Biaya Ops Langsung (Step 2)</div>
          <div className="bs-val mono">{fmtRpFull(expOps)}</div>
        </div>
        <div className="bs-item">
          <div className="bs-label">Konsistensi Total</div>
          <div className="bs-val">
            {sumOk === null
              ? <StatusPill s="neutral" />
              : <StatusPill s={sumOk ? 'ok' : 'warn'} />}
          </div>
        </div>
        <div className="bs-item">
          <div className="bs-label">Status L10</div>
          <div className="bs-val">
            <StatusPill s={total === 0 ? 'neutral' : allOk ? 'ok' : failRows.length === 1 ? 'warn' : 'bad'} />
          </div>
        </div>
      </div>

      {/* Stacked bar visualization */}
      <div className="tri-vis-card">
        <div className="tri-vis-title">Distribusi Alokasi vs Target</div>
        {total > 0 ? (
          <div className="tri-stack">
            {/* Actual bar — all segments always shown */}
            <div className="ts-bar-wrap">
              <span className="ts-bar-label">Aktual</span>
              <div className="ts-bar">
                {items.map(it => {
                  const v = TS[it.k] || 0;
                  const prop = v / total;
                  const pct = prop * 100;
                  return (
                    <div key={it.k} className="ts-seg" style={{
                      width: Math.max(pct, 0.5) + '%',
                      background: it.color,
                      minWidth: pct > 0 ? 2 : 0
                    }}>
                      {pct >= 5 && <span>{pct.toFixed(1)}%</span>}
                    </div>
                  );
                })}
              </div>
              {/* Cumulative target markers at 50% and 80% */}
              <div className="ts-markers">
                <div className="ts-marker" style={{left:'50%'}}>
                  <div className="ts-marker-line"></div>
                  <div className="ts-marker-label">50%</div>
                </div>
                <div className="ts-marker" style={{left:'80%'}}>
                  <div className="ts-marker-line"></div>
                  <div className="ts-marker-label">80%</div>
                </div>
              </div>
            </div>
            {/* Target reference bar */}
            <div className="ts-bar-wrap">
              <span className="ts-bar-label ts-bar-label-target">Target</span>
              <div className="ts-bar ts-target-bar">
                {items.map(it => (
                  <div key={it.k} className="ts-seg ts-target-seg"
                    style={{width: (it.bobot*100)+'%', background: it.color + '55'}}>
                    <span style={{color: it.color, fontWeight:700}}>{(it.bobot*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="ts-legend">
              {items.map(it => (
                <div key={it.k} className="ts-legend-item">
                  <span className="ts-legend-dot" style={{background: it.color}}></span>
                  <span>{it.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tri-empty-bar">Isi alokasi di bawah untuk melihat visualisasi.</div>
        )}
      </div>

      {/* Rebalancing suggestion banner */}
      {total > 0 && !allOk && (
        <div className="tri-rebalance-row">
          <button className="btn-rebalance" onClick={() => setShowSuggestion(s => !s)}>
            {showSuggestion ? '▲ Sembunyikan Saran' : '⚖ Sarankan Rebalancing'}
          </button>
        </div>
      )}
      {showSuggestion && total > 0 && (
        <div className="tri-suggestion-banner">
          <div className="tsb-title">Saran Rebalancing — berdasarkan total alokasi saat ini ({fmtRpFull(total)})</div>
          <div className="tsb-rows">
            {suggestions.map(s => {
              const cur = TS[s.k] || 0;
              return (
                <div key={s.k} className="tsb-row">
                  <span className="tsb-name">
                    <span className="tt-dot" style={{background: s.color}}></span>
                    {s.label}
                  </span>
                  <span className="tsb-cur mono">{fmtRpFull(cur)}</span>
                  <span className="tsb-arrow">→</span>
                  <span className="tsb-target mono">{fmtRpFull(Math.round(s.targetRp))}</span>
                  <span className={'tsb-delta mono ' + (s.delta >= 0 ? 'pos' : 'neg')}>
                    {s.delta >= 0 ? '+' : '−'}{fmtRpFull(Math.abs(Math.round(s.delta)))}
                  </span>
                  <span className="tsb-pct mono">({(s.bobot*100).toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
          <div className="tsb-note">Ini hanya saran — tidak mengubah data secara otomatis. Sesuaikan nilai di tabel di bawah.</div>
        </div>
      )}

      {/* Detail table */}
      <div className="tri-table">
        <div className="tt-head">
          <div>Fungsi Tridharma</div>
          <div>Alokasi (Rp)</div>
          <div>Target (Rp)</div>
          <div>Selisih (Rp)</div>
          <div>Bobot Target</div>
          <div>Proporsi Aktual</div>
          <div>Deviasi</div>
          <div>Status</div>
        </div>
        {rows.map((row, idx) => (
          <div key={row.k} className={'tt-row' + (idx % 2 === 0 ? ' even' : '')}>
            <div className="tt-name">
              <span className="tt-dot" style={{background: row.color}}></span>
              {row.label}
            </div>
            <div className="tt-cell">
              <CurrencyInput value={TS[row.k]} onChange={(val) => onChange('TS', row.k, val)} />
            </div>
            <div className="tt-derived mono">{total > 0 ? fmtRpFull(Math.round(row.targetRp)) : '—'}</div>
            <div className={'tt-derived mono ' + (row.selisihRp >= 0 ? 'pos' : 'neg')}>
              {total === 0 ? '—' : (row.selisihRp >= 0 ? '+' : '−') + fmtRpFull(Math.abs(Math.round(row.selisihRp)))}
            </div>
            <div className="tt-target mono">{(row.bobot * 100).toFixed(0)}%</div>
            <div className="tt-actual">
              <div className="tt-actual-val mono">{(row.prop * 100).toFixed(1)}%</div>
              <div className="tt-actual-bar">
                <div className="tt-actual-fill" style={{width: Math.min(100, row.prop*100)+'%', background: row.color}}></div>
                <div className="tt-actual-mark" style={{left: (row.bobot*100)+'%'}}></div>
              </div>
            </div>
            <div className={'tt-dev mono ' + (row.ok ? 'pos' : 'neg')}>
              {total === 0 ? '—' : (row.dev >= 0 ? '+' : '') + (row.dev * 100).toFixed(1) + ' pp'}
            </div>
            <div className="tt-status">
              <StatusPill s={total === 0 ? 'neutral' : row.ok ? 'ok' : 'warn'} />
            </div>
          </div>
        ))}
      </div>

      {/* Consistency info panel */}
      {diff !== null && !sumOk && (
        <div className={'tri-consistency-panel ' + (diff > 0 ? 'over' : 'under')}>
          <span className="tcp-icon">{diff > 0 ? '↑' : '↓'}</span>
          <span>
            Total alokasi Tridharma{' '}
            <b>{diff > 0 ? 'melebihi' : 'kurang dari'}</b>{' '}
            Biaya Ops Langsung (Step 2) sebesar{' '}
            <b className="mono">{fmtRpFull(Math.abs(diff))}</b>.{' '}
            {diff > 0
              ? 'Kurangi alokasi atau naikkan Biaya Ops Langsung.'
              : 'Tambah alokasi atau sesuaikan Biaya Ops Langsung.'}
          </span>
        </div>
      )}

      <div className="note">
        <strong>Panduan:</strong> Deviasi ≤ ±10 pp per fungsi = TERPENUHI LAMEMBA L10.
        Kolom <b>Target (Rp)</b> adalah {'{'}bobot × total{'}'}. <b>Selisih (Rp)</b> = aktual − target.{' '}
        <b>pp</b> = poin persentase.
      </div>
    </div>
  );
}

// === People & Endowment ===
function StepPeople({ data, onChange }) {
  const fields = [
    { k: 'mhsCount', label: 'Jumlah Mahasiswa Aktif (FTE)', info: 'Validasi PDDikti/EMIS. SFR sehat 12–20:1.', simple: true },
    { k: 'dosenCount', label: 'Jumlah Dosen Tetap (FTE)', info: 'Untuk perhitungan Student-Faculty Ratio.', simple: true },
    { k: 'endowDist', label: 'Annual Endowment Distribution (Payout)', info: 'Spending rate sehat 4–6% dari rata-rata endowment 3 tahun.' },
    { k: 'endowReturn', label: 'Annual Investment Return (Endowment)', info: 'Hasil investasi tahunan endowment. Sehat > 8%.' },
  ];
  const filled = fields.filter(f => data.TS && data.TS[f.k]).length;
  return (
    <div className="form-page-card">
      <FormPageHeader
        letter="F"
        title="Mahasiswa, Dosen & Endowment"
        subtitle="Data demografis institusi & arus dana abadi. Diperlukan untuk Student-Faculty Ratio, Cost per Student, dan Endowment Spending Rate."
        completion={{ filled, total: fields.length }}
      />
      <div className="field-grid">
        <FormHeader />
        {fields.map(f => <FieldRow key={f.k} k={f.k} label={f.label} info={f.info} data={data} onChange={onChange} />)}
      </div>
      <FormTip>
        <strong>SFR (Student-Faculty Ratio)</strong> sehat: 12–20:1. <strong>Endowment Spending Rate</strong> ideal: 4–6%. <strong>Return Endowment</strong>: &gt; 8% (di atas inflasi + spending).
      </FormTip>
    </div>
  );
}

window.StepRev = StepRev;
window.StepExp = StepExp;
window.StepBS = StepBS;
window.StepBudget = StepBudget;
window.StepTri = StepTri;
window.StepPeople = StepPeople;
window.CurrencyInput = CurrencyInput;
