// Calculation engine — mirrors Excel formulas exactly.
// Input: data object { TS: {...}, "TS-1": {...}, "TS-2": {...} } where keys are FIELDS keys.
// Output: rich result with all 29 ratios, 10 LAMEMBA, IKK, CFI scorecard, predikat.

function safeDiv(a, b) { return (b === 0 || b === null || b === undefined || isNaN(b)) ? 0 : a / b; }

function computeYear(d) {
  if (!d) return null;
  // Derived
  const netTuition = (d.revSppGross || 0) + (d.revBeasiswa || 0); // beasiswa NEGATIF
  const totalRev = (d.revSppGross || 0) + (d.revBeasiswa || 0) + (d.revPemerintah || 0)
    + (d.revRiset || 0) + (d.revDonasi || 0) + (d.revAux || 0)
    + (d.revEndowOps || 0) + (d.revLain || 0);
  const nonGov = totalRev - (d.revPemerintah || 0);
  // Total Pengeluaran: Ops + Admin + SDM + Capex + Maint + Faculty + Depr + Interest + Lain
  // expInstr is INFO ONLY — not summed
  const totalExp = (d.expOps || 0) + (d.expAdmin || 0) + (d.expSDM || 0)
    + (d.expCapex || 0) + (d.expMaint || 0) + (d.expFaculty || 0)
    + (d.expDepr || 0) + (d.expInterest || 0) + (d.expLain || 0);
  const totalAsetLancar = (d.bsKas || 0) + (d.bsInvJP || 0) + (d.bsPiutang || 0) + (d.bsLainLancar || 0);
  const totalAset = totalAsetLancar + (d.bsAsetTetap || 0) + (d.bsEndowment || 0);
  const ebitda = totalRev - totalExp + (d.expDepr || 0) + (d.expInterest || 0);

  return {
    netTuition, totalRev, nonGov, totalExp, totalAsetLancar, totalAset, ebitda,
  };
}

function computeAll(data) {
  const TS = data.TS, TS1 = data['TS-1'], TS2 = data['TS-2'];
  const dTS = computeYear(TS), dTS1 = computeYear(TS1), dTS2 = computeYear(TS2);

  // === 29 Rasio ===
  const ratios = [];
  function addRatio(o) { ratios.push(o); }

  // T1: Composite Financial
  // 1 Primary Reserve = ExpNA / TotalExp
  {
    const v = safeDiv(TS.bsExpNA, dTS.totalExp);
    const v1 = safeDiv(TS1.bsExpNA, dTS1.totalExp);
    const v2 = safeDiv(TS2.bsExpNA, dTS2.totalExp);
    const status = v > 0.4 ? 'ok' : v >= 0.17 ? 'warn' : 'bad';
    addRatio({ id: 'primaryReserve', no: '1', cat: 'CFI', name: 'Primary Reserve Ratio',
      formula: 'Expendable Net Assets ÷ Total Op. Expenses',
      v, v1, v2, target: '> 0.40', status,
      desc: 'Berapa lama institusi bisa beroperasi dari aset bersih jika pendapatan berhenti. Semakin tinggi semakin tahan banting.',
      score: v >= 0.4 ? 100 : v <= 0.17 ? 0 : (v - 0.17) / (0.4 - 0.17) * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.63, BAIK: 0.51, PERHATIAN: 0.34, BERISIKO: 0.17 },
    });
  }
  // 2 Viability = ExpNA / Debt
  {
    const v = safeDiv(TS.bsExpNA, TS.bsKwjJPj);
    const v1 = safeDiv(TS1.bsExpNA, TS1.bsKwjJPj);
    const v2 = safeDiv(TS2.bsExpNA, TS2.bsKwjJPj);
    const status = v > 0.35 ? 'ok' : v >= 0.20 ? 'warn' : 'bad';
    addRatio({ id: 'viability', no: '2', cat: 'CFI', name: 'Viability Ratio',
      formula: 'Expendable Net Assets ÷ Total Debt',
      v, v1, v2, target: '> 0.35', status,
      desc: 'Kemampuan melunasi seluruh utang dari aset bersih yang tersedia. Indikator solvabilitas jangka panjang.',
      score: v >= 0.35 ? 100 : v <= 0.20 ? 0 : (v - 0.20) / (0.35 - 0.20) * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 2.17, BAIK: 1.50, PERHATIAN: 0.54, BERISIKO: 0.19 },
    });
  }
  // 3 Return on Net Assets = ChangeNA / BeginNA
  {
    const v = safeDiv(TS.bsChangeNA, TS.bsBeginNA);
    const v1 = safeDiv(TS1.bsChangeNA, TS1.bsBeginNA);
    const v2 = safeDiv(TS2.bsChangeNA, TS2.bsBeginNA);
    const status = v > 0.02 ? 'ok' : v >= 0 ? 'warn' : 'bad';
    addRatio({ id: 'returnNA', no: '3', cat: 'CFI', name: 'Return on Net Assets',
      formula: 'Change in Net Assets ÷ Beginning Net Assets',
      v, v1, v2, target: '> 2%', status,
      desc: 'Pertumbuhan aset bersih institusi tahun berjalan, semacam ROE versi non-profit.',
      score: v >= 0.02 ? 100 : v <= 0 ? 0 : (v / 0.02) * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.10, BAIK: 0.0795, PERHATIAN: 0.021, BERISIKO: -0.168 },
    });
  }
  // 4 Net Operating Revenue Ratio = (Rev-Exp)/Rev
  {
    const v = safeDiv(dTS.totalRev - dTS.totalExp, dTS.totalRev);
    const v1 = safeDiv(dTS1.totalRev - dTS1.totalExp, dTS1.totalRev);
    const v2 = safeDiv(dTS2.totalRev - dTS2.totalExp, dTS2.totalRev);
    const status = v > 0.02 ? 'ok' : v >= 0 ? 'warn' : 'bad';
    addRatio({ id: 'netOpRev', no: '4', cat: 'CFI', name: 'Net Operating Revenue Ratio',
      formula: '(Op. Revenue − Op. Expenses) ÷ Op. Revenue',
      v, v1, v2, target: '> 2%', status,
      desc: 'Apakah operasional menghasilkan surplus? Indikator kesehatan margin operasi.',
      score: v >= 0.02 ? 100 : v <= 0 ? 0 : (v / 0.02) * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.052, BAIK: 0.026, PERHATIAN: 0.146, BERISIKO: -0.10 },
    });
  }

  // T2: Likuiditas
  // 5 Liquidity Ratio = Sources / Uses
  {
    const v = safeDiv(TS.bsLiqSrc, TS.bsLiqUse);
    const v1 = safeDiv(TS1.bsLiqSrc, TS1.bsLiqUse);
    const v2 = safeDiv(TS2.bsLiqSrc, TS2.bsLiqUse);
    const status = v >= 1.25 ? 'ok' : v >= 1 ? 'warn' : 'bad';
    addRatio({ id: 'liquidity', no: '5', cat: 'LIQ', name: 'Liquidity Ratio',
      formula: 'Sources of Liquidity ÷ Uses of Liquidity',
      v, v1, v2, target: '≥ 1.25', status,
      desc: 'Sumber likuiditas tersedia vs kebutuhan likuiditas. Margin pengaman cashflow.',
      score: v >= 1.25 ? 100 : v <= 1 ? 0 : (v - 1) / 0.25 * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 3.10, BAIK: 2.64, PERHATIAN: 1.24, BERISIKO: 0.61 },
    });
  }
  // 6 Days Cash on Hand
  {
    const v = safeDiv((TS.bsKas + TS.bsInvJP), dTS.totalExp / 365);
    const v1 = safeDiv((TS1.bsKas + TS1.bsInvJP), dTS1.totalExp / 365);
    const v2 = safeDiv((TS2.bsKas + TS2.bsInvJP), dTS2.totalExp / 365);
    const status = v >= 120 ? 'ok' : v >= 60 ? 'warn' : 'bad';
    addRatio({ id: 'daysCash', no: '6', cat: 'LIQ', name: 'Days Cash on Hand',
      formula: '(Kas + Inv. JP) ÷ (Total Pengeluaran / 365)',
      v, v1, v2, target: '≥ 120 hari', status,
      desc: 'Berapa hari operasional bisa berjalan dari kas + investasi jangka pendek.',
      score: v >= 120 ? 100 : v <= 60 ? 0 : (v - 60) / 60 * 100,
      format: 'days', good: 'high',
      benchmarks: { SANGAT_BAIK: 154, BAIK: 140, PERHATIAN: 80, BERISIKO: 36 },
    });
  }
  // 7 Cash to Debt
  {
    const v = safeDiv(TS.bsKas, TS.bsKwjJPj);
    const v1 = safeDiv(TS1.bsKas, TS1.bsKwjJPj);
    const v2 = safeDiv(TS2.bsKas, TS2.bsKwjJPj);
    const status = v >= 0.25 ? 'ok' : v >= 0.15 ? 'warn' : 'bad';
    addRatio({ id: 'cashDebt', no: '7', cat: 'LIQ', name: 'Cash to Debt Ratio',
      formula: 'Kas & Setara Kas ÷ Total Debt',
      v, v1, v2, target: '≥ 0.25', status,
      desc: 'Kemampuan langsung melunasi utang dari kas. Indikator likuiditas paling konservatif.',
      score: v >= 0.25 ? 100 : v <= 0.15 ? 0 : (v - 0.15) / 0.10 * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.79, BAIK: 0.67, PERHATIAN: 0.22, BERISIKO: 0.05 },
    });
  }
  // L9 Rasio Likuiditas LAMEMBA = Aset Lancar / Kwj JP
  {
    const v = safeDiv(dTS.totalAsetLancar, TS.bsKwjJP);
    const v1 = safeDiv(dTS1.totalAsetLancar, TS1.bsKwjJP);
    const v2 = safeDiv(dTS2.totalAsetLancar, TS2.bsKwjJP);
    const status = v >= 1 ? 'ok' : 'bad';
    addRatio({ id: 'L9_RL', no: 'L9', cat: 'LIQ', lameba: true, name: 'Rasio Likuiditas (RL)',
      formula: 'Aset Lancar ÷ Kewajiban Jangka Pendek',
      v, v1, v2, target: '≥ 1.00 (100%)', status,
      desc: 'LAMEMBA No.9 — current ratio. Wajib ≥ 1.0× agar terpenuhi.',
      score: v >= 1 ? 100 : v * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 2.60, BAIK: 2.39, PERHATIAN: 1.07, BERISIKO: 0.66 },
    });
  }

  // T3: Efisiensi
  // 8 Operating Margin (sama formula 4, target beda)
  {
    const v = safeDiv(dTS.totalRev - dTS.totalExp, dTS.totalRev);
    const v1 = safeDiv(dTS1.totalRev - dTS1.totalExp, dTS1.totalRev);
    const v2 = safeDiv(dTS2.totalRev - dTS2.totalExp, dTS2.totalRev);
    const status = v >= 0.04 ? 'ok' : v >= 0 ? 'warn' : 'bad';
    addRatio({ id: 'opMargin', no: '8', cat: 'EFF', name: 'Operating Margin',
      formula: '(Op. Revenue − Op. Expenses) ÷ Op. Revenue',
      v, v1, v2, target: '≥ 4%', status,
      desc: 'Margin operasi institusi. Surplus untuk reinvestasi & cadangan.',
      score: v >= 0.04 ? 100 : v <= 0 ? 0 : (v / 0.04) * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.052, BAIK: 0.026, PERHATIAN: 0.146, BERISIKO: -0.10 },
    });
  }
  // 9 Admin Expense Ratio
  {
    const v = safeDiv(TS.expAdmin, dTS.totalExp);
    const v1 = safeDiv(TS1.expAdmin, dTS1.totalExp);
    const v2 = safeDiv(TS2.expAdmin, dTS2.totalExp);
    const status = v <= 0.12 ? 'ok' : v <= 0.15 ? 'warn' : 'bad';
    addRatio({ id: 'adminExp', no: '9', cat: 'EFF', name: 'Administrative Expense Ratio',
      formula: 'Biaya Administrasi ÷ Total Op. Expenses',
      v, v1, v2, target: '< 12%', status,
      desc: 'Beban overhead administrasi. Semakin kecil semakin efisien.',
      score: v <= 0.12 ? 100 : v >= 0.15 ? 0 : (0.15 - v) / 0.03 * 100,
      format: 'pct', good: 'low',
      benchmarks: { SANGAT_BAIK: 0.067, BAIK: 0.071, PERHATIAN: 0.159, BERISIKO: 0.215 },
    });
  }
  // 10 Tuition Dependency
  {
    const v = safeDiv(dTS.netTuition, dTS.totalRev);
    const v1 = safeDiv(dTS1.netTuition, dTS1.totalRev);
    const v2 = safeDiv(dTS2.netTuition, dTS2.totalRev);
    const status = v < 0.5 ? 'ok' : v < 0.7 ? 'warn' : 'bad';
    addRatio({ id: 'tuitDep', no: '10', cat: 'EFF', name: 'Tuition Dependency Ratio',
      formula: 'Net Tuition Revenue ÷ Total Op. Revenue',
      v, v1, v2, target: '< 50%', status,
      desc: 'Ketergantungan pada uang kuliah. Semakin tinggi semakin rentan terhadap fluktuasi mahasiswa.',
      score: v <= 0.5 ? 100 : v >= 0.7 ? 0 : (0.7 - v) / 0.2 * 100,
      format: 'pct', good: 'low',
      benchmarks: { SANGAT_BAIK: 0.514, BAIK: 0.568, PERHATIAN: 0.66, BERISIKO: 0.71 },
    });
  }
  // 11 Cost per Student
  {
    const v = safeDiv(dTS.totalExp, TS.mhsCount);
    const v1 = safeDiv(dTS1.totalExp, TS1.mhsCount);
    const v2 = safeDiv(dTS2.totalExp, TS2.mhsCount);
    addRatio({ id: 'costStudent', no: '11', cat: 'EFF', name: 'Cost per Student',
      formula: 'Total Op. Expenses ÷ Total FTE Students',
      v, v1, v2, target: 'Sesuai SPMI', status: 'info',
      desc: 'Biaya per mahasiswa per tahun. Validasi dengan benchmark SPMI institusi.',
      format: 'rp', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 27500000, BAIK: 21048000, PERHATIAN: 14643000, BERISIKO: 11667000 },
    });
  }
  // L2 REO LAMEMBA
  {
    const v = safeDiv(TS.expOps, dTS.totalExp);
    const v1 = safeDiv(TS1.expOps, dTS1.totalExp);
    const v2 = safeDiv(TS2.expOps, dTS2.totalExp);
    const status = v >= 0.65 ? 'ok' : 'bad';
    addRatio({ id: 'L2_REO', no: 'L2', cat: 'EFF', lameba: true, name: 'Rasio Efisiensi Operasional (REO)',
      formula: 'Biaya Operasional Langsung ÷ Total Pengeluaran',
      v, v1, v2, target: '≥ 65%', status,
      desc: 'LAMEMBA No.2 — proporsi biaya yang langsung mendukung Tridharma. ≥ 65% wajib.',
      score: v >= 0.65 ? 100 : v <= 0.5 ? 0 : (v - 0.5) / 0.15 * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.667, BAIK: 0.577, PERHATIAN: 0.585, BERISIKO: 0.40 },
    });
  }
  // L7 RBM LAMEMBA (sama dengan #11)
  {
    const v = safeDiv(dTS.totalExp, TS.mhsCount);
    const v1 = safeDiv(dTS1.totalExp, TS1.mhsCount);
    const v2 = safeDiv(dTS2.totalExp, TS2.mhsCount);
    addRatio({ id: 'L7_RBM', no: 'L7', cat: 'EFF', lameba: true, name: 'Rasio Biaya per Mahasiswa (RBM)',
      formula: 'Total Op. Expenses ÷ Mahasiswa FTE',
      v, v1, v2, target: 'Sesuai SPMI', status: 'info',
      desc: 'LAMEMBA No.7 — validasi dengan standar SPMI institusi.',
      format: 'rp', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 27500000, BAIK: 21048000, PERHATIAN: 14643000, BERISIKO: 11667000 },
    });
  }

  // T4: Utang
  // 12 DSCR
  {
    const v = safeDiv(dTS.ebitda, TS.bsDebtSrv);
    const v1 = safeDiv(dTS1.ebitda, TS1.bsDebtSrv);
    const v2 = safeDiv(dTS2.ebitda, TS2.bsDebtSrv);
    const status = v >= 2 ? 'ok' : v >= 1.25 ? 'warn' : 'bad';
    addRatio({ id: 'dscr', no: '12', cat: 'DEBT', name: 'Debt Service Coverage Ratio',
      formula: 'EBITDA ÷ Annual Debt Service',
      v, v1, v2, target: '≥ 2.00×', status,
      desc: 'Kemampuan EBITDA menutupi cicilan utang tahunan. Standar covenant bank.',
      score: v >= 2 ? 100 : v <= 1.25 ? 0 : (v - 1.25) / 0.75 * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 3.40, BAIK: 2.11, PERHATIAN: 1.04, BERISIKO: 0.30 },
    });
  }
  // 13 Debt to Assets
  {
    const v = safeDiv(TS.bsKwjJPj, dTS.totalAset);
    const v1 = safeDiv(TS1.bsKwjJPj, dTS1.totalAset);
    const v2 = safeDiv(TS2.bsKwjJPj, dTS2.totalAset);
    const status = v < 0.25 ? 'ok' : v < 0.35 ? 'warn' : 'bad';
    addRatio({ id: 'debtAssets', no: '13', cat: 'DEBT', name: 'Debt-to-Assets Ratio',
      formula: 'Total Debt ÷ Total Assets',
      v, v1, v2, target: '< 25%', status,
      desc: 'Leverage agregat. Semakin rendah semakin aman.',
      score: v <= 0.25 ? 100 : v >= 0.35 ? 0 : (0.35 - v) / 0.10 * 100,
      format: 'pct', good: 'low',
      benchmarks: { SANGAT_BAIK: 0.116, BAIK: 0.160, PERHATIAN: 0.297, BERISIKO: 0.44 },
    });
  }
  // 14 Interest Coverage
  {
    const v = safeDiv(dTS.ebitda, TS.expInterest);
    const v1 = safeDiv(dTS1.ebitda, TS1.expInterest);
    const v2 = safeDiv(dTS2.ebitda, TS2.expInterest);
    const status = v >= 3 ? 'ok' : v >= 2 ? 'warn' : 'bad';
    addRatio({ id: 'icr', no: '14', cat: 'DEBT', name: 'Interest Coverage Ratio',
      formula: 'EBITDA ÷ Interest Expense',
      v, v1, v2, target: '≥ 3.00×', status,
      desc: 'Kemampuan menutup beban bunga dari EBITDA.',
      score: v >= 3 ? 100 : v <= 2 ? 0 : (v - 2) / 1 * 100,
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 6.30, BAIK: 3.93, PERHATIAN: 1.97, BERISIKO: 0.59 },
    });
  }
  // 15 Debt per Student
  {
    const v = safeDiv(TS.bsKwjJPj, TS.mhsCount);
    const v1 = safeDiv(TS1.bsKwjJPj, TS1.mhsCount);
    const v2 = safeDiv(TS2.bsKwjJPj, TS2.mhsCount);
    addRatio({ id: 'debtStudent', no: '15', cat: 'DEBT', name: 'Debt per Student',
      formula: 'Total Debt ÷ Total FTE Students',
      v, v1, v2, target: 'Benchmark', status: 'info',
      desc: 'Beban utang per mahasiswa. Indikator generational fairness.',
      format: 'rp', good: 'low',
      benchmarks: { SANGAT_BAIK: 8000000, BAIK: 7143000, PERHATIAN: 9286000, BERISIKO: 14667000 },
    });
  }

  // T5: Endowment
  const avgEndow = ((TS.bsEndowment || 0) + (TS1.bsEndowment || 0) + (TS2.bsEndowment || 0)) / 3;
  // 16 Endowment per Student
  {
    const v = safeDiv(TS.bsEndowment, TS.mhsCount);
    const v1 = safeDiv(TS1.bsEndowment, TS1.mhsCount);
    const v2 = safeDiv(TS2.bsEndowment, TS2.mhsCount);
    addRatio({ id: 'endowStudent', no: '16', cat: 'ENDOW', name: 'Endowment per Student',
      formula: 'Total Endowment ÷ Total Students',
      v, v1, v2, target: 'Bervariasi', status: 'info',
      desc: 'Dana abadi per mahasiswa. Semakin besar semakin tahan terhadap shock.',
      format: 'rp', good: 'high',
      benchmarks: { SANGAT_BAIK: 18667000, BAIK: 10000000, PERHATIAN: 3214000, BERISIKO: 1000000 },
    });
  }
  // 17 Endowment Spending Rate (TS only)
  {
    const v = safeDiv(TS.endowDist, avgEndow);
    const status = (v >= 0.04 && v <= 0.08) ? 'ok' : (v >= 0.03 && v <= 0.09) ? 'warn' : 'bad';
    addRatio({ id: 'endowSpend', no: '17', cat: 'ENDOW', name: 'Endowment Spending Rate',
      formula: 'Annual Distribution ÷ Avg Endow (3yr)',
      v, target: '4–6%', status,
      desc: 'Tingkat pengambilan dana abadi. Range sehat 4–6% (sustainable spending).',
      format: 'pct', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 0.054, BAIK: 0.058, PERHATIAN: 0.054, BERISIKO: 0.057 },
    });
  }
  // 18 Investment Return
  {
    const v = safeDiv(TS.endowReturn, avgEndow);
    const status = v > 0.08 ? 'ok' : v > 0.05 ? 'warn' : 'bad';
    addRatio({ id: 'invReturn', no: '18', cat: 'ENDOW', name: 'Investment Return',
      formula: 'Annual Return ÷ Avg Endow (3yr)',
      v, target: '> 8% (di atas inflasi+spending)', status,
      desc: 'Hasil investasi endowment tahunan. Harus melampaui spending rate + inflasi untuk menjaga nilai riil.',
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.105, BAIK: 0.116, PERHATIAN: 0.081, BERISIKO: 0.05 },
    });
  }
  // 19 Endowment to Debt
  {
    const v = safeDiv(TS.bsEndowment, TS.bsKwjJPj);
    const v1 = safeDiv(TS1.bsEndowment, TS1.bsKwjJPj);
    const v2 = safeDiv(TS2.bsEndowment, TS2.bsKwjJPj);
    const status = v > 2 ? 'ok' : v >= 1 ? 'warn' : 'bad';
    addRatio({ id: 'endowDebt', no: '19', cat: 'ENDOW', name: 'Endowment to Debt',
      formula: 'Total Endowment ÷ Total Debt',
      v, v1, v2, target: '> 2.0×', status,
      desc: 'Apakah endowment cukup untuk melunasi seluruh utang? Indikator long-term safety.',
      format: 'x', good: 'high',
      benchmarks: { SANGAT_BAIK: 2.33, BAIK: 1.40, PERHATIAN: 0.35, BERISIKO: 0.07 },
    });
  }

  // T6: Diversifikasi
  // L1 RK
  {
    const v = safeDiv(dTS.nonGov, dTS.totalRev);
    const v1 = safeDiv(dTS1.nonGov, dTS1.totalRev);
    const v2 = safeDiv(dTS2.nonGov, dTS2.totalRev);
    const status = v >= 0.3 ? 'ok' : 'bad';
    addRatio({ id: 'L1_RK', no: 'L1', cat: 'REV', lameba: true, name: 'Rasio Kemandirian (RK)',
      formula: 'Pendapatan Non-Pemerintah ÷ Total Pendapatan',
      v, v1, v2, target: '≥ 30%', status,
      desc: 'LAMEMBA No.1 — kemandirian dari subsidi. ≥ 30% wajib.',
      score: v >= 0.3 ? 100 : v / 0.3 * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.93, BAIK: 0.91, PERHATIAN: 0.93, BERISIKO: 0.94 },
    });
  }
  // L6 GRR
  {
    const v = safeDiv(dTS.totalRev - dTS1.totalRev, dTS1.totalRev);
    const v1 = safeDiv(dTS1.totalRev - dTS2.totalRev, dTS2.totalRev);
    const status = v >= 0.05 ? 'ok' : 'bad';
    addRatio({ id: 'L6_GRR', no: 'L6', cat: 'REV', lameba: true, name: 'Pertumbuhan Pendapatan (GRR)',
      formula: '(Pendapatan TS − TS-1) ÷ TS-1',
      v, v1, target: '≥ 5%', status,
      desc: 'LAMEMBA No.6 — growth rate revenue. ≥ 5% wajib.',
      score: v >= 0.05 ? 100 : Math.max(0, v / 0.05 * 100),
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.092, BAIK: 0.121, PERHATIAN: 0.043, BERISIKO: -0.06 },
    });
  }
  // 20 Revenue Concentration
  {
    function rc(d) {
      const arr = [d.revSppGross, Math.abs(d.revBeasiswa || 0), d.revPemerintah, d.revRiset, d.revDonasi, d.revAux, d.revEndowOps, d.revLain].map(x => x || 0);
      return Math.max(...arr);
    }
    const v = safeDiv(rc(TS), dTS.totalRev);
    const v1 = safeDiv(rc(TS1), dTS1.totalRev);
    const v2 = safeDiv(rc(TS2), dTS2.totalRev);
    const status = v < 0.6 ? 'ok' : v < 0.7 ? 'warn' : 'bad';
    addRatio({ id: 'revConc', no: '20', cat: 'REV', name: 'Revenue Concentration',
      formula: 'Sumber Terbesar ÷ Total Revenue',
      v, v1, v2, target: '< 60%', status,
      desc: 'Konsentrasi pendapatan pada satu sumber. Tinggi = berisiko.',
      score: v <= 0.6 ? 100 : v >= 0.7 ? 0 : (0.7 - v) / 0.1 * 100,
      format: 'pct', good: 'low',
      benchmarks: { SANGAT_BAIK: 0.617, BAIK: 0.757, PERHATIAN: 0.755, BERISIKO: 0.83 },
    });
  }
  // 21 Gift Revenue Ratio
  {
    const v = safeDiv(TS.revDonasi, dTS.totalRev);
    const v1 = safeDiv(TS1.revDonasi, dTS1.totalRev);
    const v2 = safeDiv(TS2.revDonasi, dTS2.totalRev);
    const status = v > 0.1 ? 'ok' : v > 0.05 ? 'warn' : 'bad';
    addRatio({ id: 'giftRev', no: '21', cat: 'REV', name: 'Gift Revenue Ratio',
      formula: 'Donasi ÷ Total Revenue',
      v, v1, v2, target: '> 10%', status,
      desc: 'Kontribusi donasi & alumni giving. Indikator kekuatan jaringan alumni.',
      score: v >= 0.1 ? 100 : v <= 0.01 ? 0 : (v - 0.01) / 0.09 * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.103, BAIK: 0.065, PERHATIAN: 0.023, BERISIKO: 0.014 },
    });
  }
  // 22 Research Revenue
  {
    const v = safeDiv(TS.revRiset, dTS.totalRev);
    const v1 = safeDiv(TS1.revRiset, dTS1.totalRev);
    const v2 = safeDiv(TS2.revRiset, dTS2.totalRev);
    const status = v > 0.1 ? 'ok' : v > 0.05 ? 'warn' : 'bad';
    addRatio({ id: 'researchRev', no: '22', cat: 'REV', name: 'Research Revenue Ratio',
      formula: 'Pdpt Penelitian ÷ Total Revenue',
      v, v1, v2, target: '> 10%', status,
      desc: 'Kapasitas penelitian dari hibah kompetitif. Tinggi = research-intensive.',
      score: v >= 0.1 ? 100 : v <= 0.05 ? 0 : (v - 0.05) / 0.05 * 100,
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.183, BAIK: 0.113, PERHATIAN: 0.058, BERISIKO: 0.028 },
    });
  }
  // 23 Auxiliary Revenue
  {
    const v = safeDiv(TS.revAux, dTS.totalRev);
    const v1 = safeDiv(TS1.revAux, dTS1.totalRev);
    const v2 = safeDiv(TS2.revAux, dTS2.totalRev);
    const status = (v >= 0.15 && v <= 0.25) ? 'ok' : (v > 0.10) ? 'warn' : 'bad';
    addRatio({ id: 'auxRev', no: '23', cat: 'REV', name: 'Auxiliary Revenue Ratio',
      formula: 'Auxiliary ÷ Total Revenue',
      v, v1, v2, target: '15–25%', status,
      desc: 'Pendapatan unit usaha penunjang (kantin, parkir, klinik, dll).',
      format: 'pct', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 0.126, BAIK: 0.101, PERHATIAN: 0.05, BERISIKO: 0.038 },
    });
  }

  // T7: Akademik-Finansial
  // 24 SFR
  {
    const v = safeDiv(TS.mhsCount, TS.dosenCount);
    const v1 = safeDiv(TS1.mhsCount, TS1.dosenCount);
    const v2 = safeDiv(TS2.mhsCount, TS2.dosenCount);
    const status = (v <= 20 && v >= 12) ? 'ok' : v <= 30 ? 'warn' : 'bad';
    addRatio({ id: 'sfr', no: '24', cat: 'ACAD', name: 'Student-to-Faculty Ratio',
      formula: 'Mahasiswa FTE ÷ Dosen FTE',
      v, v1, v2, target: '12:1 – 20:1', status,
      desc: 'Beban dosen. Ideal 12–20:1.',
      format: 'ratio', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 16.7, BAIK: 18.3, PERHATIAN: 26.7, BERISIKO: 23.1 },
    });
  }
  // 25 Discount Rate
  {
    const v = safeDiv(Math.abs(TS.revBeasiswa || 0), TS.revSppGross);
    const v1 = safeDiv(Math.abs(TS1.revBeasiswa || 0), TS1.revSppGross);
    const v2 = safeDiv(Math.abs(TS2.revBeasiswa || 0), TS2.revSppGross);
    const status = (v >= 0.3 && v <= 0.5) ? 'ok' : v <= 0.6 ? 'warn' : 'bad';
    addRatio({ id: 'discount', no: '25', cat: 'ACAD', name: 'Discount Rate',
      formula: 'Total Financial Aid ÷ Gross Tuition Revenue',
      v, v1, v2, target: '30–50%', status,
      desc: 'Diskon tarif kuliah agregat. Range sehat 30–50% (aksesibilitas).',
      format: 'pct', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 0.30, BAIK: 0.25, PERHATIAN: 0.151, BERISIKO: 0.109 },
    });
  }
  // 26 Net Tuition per Student
  {
    const v = safeDiv(dTS.netTuition, TS.mhsCount);
    const v1 = safeDiv(dTS1.netTuition, TS1.mhsCount);
    const v2 = safeDiv(dTS2.netTuition, TS2.mhsCount);
    const status = v > v1 ? 'ok' : v === v1 ? 'warn' : 'bad';
    addRatio({ id: 'netTuitStud', no: '26', cat: 'ACAD', name: 'Net Tuition per Student',
      formula: 'Net Tuition ÷ Mahasiswa FTE',
      v, v1, v2, target: 'Tren naik', status,
      desc: 'SPP bersih per mahasiswa. Trennya harus naik (pricing power).',
      format: 'rp', good: 'high',
      benchmarks: { SANGAT_BAIK: 14000000, BAIK: 12000000, PERHATIAN: 11036000, BERISIKO: 9800000 },
    });
  }
  // 27 Faculty Cost — formula konsisten across years: (Gaji Dosen + Instruksi) / Total Pengeluaran
  {
    const v = safeDiv((TS.expFaculty || 0) + (TS.expInstr || 0), dTS.totalExp);
    const v1 = safeDiv((TS1.expFaculty || 0) + (TS1.expInstr || 0), dTS1.totalExp);
    const v2 = safeDiv((TS2.expFaculty || 0) + (TS2.expInstr || 0), dTS2.totalExp);
    const status = (v >= 0.45 && v <= 0.55) ? 'ok' : (v >= 0.40 && v <= 0.60) ? 'warn' : 'bad';
    addRatio({ id: 'facultyCost', no: '27', cat: 'ACAD', name: 'Faculty Cost Ratio',
      formula: '(Gaji Dosen + Instruksi) ÷ Total Op. Expenses',
      v, v1, v2, target: '45–55%', status,
      desc: 'Proporsi belanja akademik. Ideal 45–55%.',
      format: 'pct', good: 'neutral',
      benchmarks: { SANGAT_BAIK: 0.50, BAIK: 0.475, PERHATIAN: 0.456, BERISIKO: 0.471 },
    });
  }

  // === LAMEMBA L3 VA ===
  let varianceAvg = 0;
  let varianceItems = [];
  if (TS.budgetTotalRev !== undefined) {
    const items = [
      { k: 'Total Pendapatan', plan: TS.budgetTotalRev, real: dTS.totalRev },
      { k: 'Biaya Operasional Langsung', plan: TS.budgetOps, real: TS.expOps },
      { k: 'Pengembangan SDM', plan: TS.budgetSDM, real: TS.expSDM },
      { k: 'Investasi Sarpras', plan: TS.budgetSarpras, real: (TS.expCapex || 0) + (TS.expMaint || 0) },
      { k: 'Biaya Administrasi', plan: TS.budgetAdmin, real: TS.expAdmin },
      { k: 'Total Pengeluaran', plan: TS.budgetTotalExp, real: dTS.totalExp },
    ].map(it => {
      const variance = it.real - it.plan;
      const variancePct = safeDiv(variance, it.plan);
      const abs = Math.abs(variancePct);
      // 3-tier banding: ≤5% ok, 5-10% warn, >10% bad
      const status = it.plan === 0 ? 'neutral' : abs <= 0.05 ? 'ok' : abs <= 0.10 ? 'warn' : 'bad';
      return { ...it, variance, variancePct, status };
    });
    varianceItems = items;
    varianceAvg = items.reduce((s, it) => s + Math.abs(it.variancePct), 0) / items.length;
  }
  // L3
  ratios.push({
    id: 'L3_VA', no: 'L3', cat: 'BUDGET', lameba: true, name: 'Varians Anggaran (VA)',
    formula: 'Rata-rata |Varians%| pos anggaran',
    v: varianceAvg, target: '≤ ±10%',
    status: varianceAvg <= 0.1 ? 'ok' : 'bad',
    desc: 'LAMEMBA No.3 — disiplin anggaran. Rata-rata deviasi RKAT.',
    format: 'pct', good: 'low',
    benchmarks: { SANGAT_BAIK: 0.038, BAIK: 0.042, PERHATIAN: 0.073, BERISIKO: 0.135 },
  });

  // L4 RISDM
  {
    const v = safeDiv(TS.expSDM, dTS.totalExp);
    const v1 = safeDiv(TS1.expSDM, dTS1.totalExp);
    const v2 = safeDiv(TS2.expSDM, dTS2.totalExp);
    ratios.push({ id: 'L4_RISDM', no: 'L4', cat: 'INVEST', lameba: true,
      name: 'Rasio Investasi SDM (RISDM)',
      formula: 'Anggaran SDM ÷ Total Pengeluaran',
      v, v1, v2, target: '≥ 15%',
      status: v >= 0.15 ? 'ok' : 'bad',
      score: v >= 0.15 ? 100 : v / 0.15 * 100,
      desc: 'LAMEMBA No.4 — investasi pengembangan SDM. ≥ 15% wajib.',
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.170, BAIK: 0.147, PERHATIAN: 0.102, BERISIKO: 0.057 },
    });
  }
  // L5 RISP
  {
    const v = safeDiv((TS.expCapex || 0) + (TS.expMaint || 0), dTS.totalExp);
    const v1 = safeDiv((TS1.expCapex || 0) + (TS1.expMaint || 0), dTS1.totalExp);
    const v2 = safeDiv((TS2.expCapex || 0) + (TS2.expMaint || 0), dTS2.totalExp);
    ratios.push({ id: 'L5_RISP', no: 'L5', cat: 'INVEST', lameba: true,
      name: 'Rasio Investasi Sarpras (RISP)',
      formula: '(CapEx + Pemeliharaan) ÷ Total Pengeluaran',
      v, v1, v2, target: '≥ 20%',
      status: v >= 0.2 ? 'ok' : 'bad',
      score: v >= 0.2 ? 100 : v / 0.2 * 100,
      desc: 'LAMEMBA No.5 — investasi sarpras. ≥ 20% wajib.',
      format: 'pct', good: 'high',
      benchmarks: { SANGAT_BAIK: 0.182, BAIK: 0.147, PERHATIAN: 0.112, BERISIKO: 0.054 },
    });
  }

  // L8 IKK
  const RK_v = ratios.find(r => r.id === 'L1_RK').v;
  const REO_v = ratios.find(r => r.id === 'L2_REO').v;
  const RL_v = ratios.find(r => r.id === 'L9_RL').v;
  const GRR_v = ratios.find(r => r.id === 'L6_GRR').v;
  const IKK_components = [
    { k: 'Rasio Kemandirian (RK)', v: RK_v, max: 0.5, weight: 0.3 },
    { k: 'Rasio Efisiensi Operasional (REO)', v: REO_v, max: 0.9, weight: 0.25 },
    { k: 'Rasio Likuiditas (RL)', v: RL_v, max: 2.0, weight: 0.25 },
    { k: 'Pertumbuhan Pendapatan (GRR)', v: GRR_v, max: 0.2, weight: 0.2 },
  ];
  const IKK = IKK_components.reduce((s, c) => {
    c.norm = Math.min(1, Math.max(0, c.v / c.max));
    c.contrib = c.norm * c.weight;
    return s + c.contrib;
  }, 0) * 4;
  ratios.push({ id: 'L8_IKK', no: 'L8', cat: 'IKK', lameba: true,
    name: 'Indeks Keberlanjutan Keuangan (IKK)',
    formula: 'Gabungan RK+REO+RL+GRR (skala 0–4)',
    v: IKK, target: '≥ 2.5',
    status: IKK >= 2.5 ? 'ok' : 'bad',
    score: IKK >= 2.5 ? 100 : IKK / 2.5 * 100,
    desc: 'LAMEMBA No.8 — composite sustainability index.',
    format: 'index', good: 'high',
    components: IKK_components,
    benchmarks: { SANGAT_BAIK: 3.65, BAIK: 3.33, PERHATIAN: 1.95, BERISIKO: 0.85 },
  });

  // L10 ATT
  const totalTri = (TS.triPend || 0) + (TS.triRiset || 0) + (TS.triPkM || 0);
  const triItems = [
    { k: 'Pendidikan', v: TS.triPend || 0, prop: safeDiv(TS.triPend || 0, totalTri), bobot: 0.5 },
    { k: 'Penelitian', v: TS.triRiset || 0, prop: safeDiv(TS.triRiset || 0, totalTri), bobot: 0.3 },
    { k: 'PkM', v: TS.triPkM || 0, prop: safeDiv(TS.triPkM || 0, totalTri), bobot: 0.2 },
  ].map(it => ({ ...it, ok: Math.abs(it.prop - it.bobot) <= 0.1 }));
  const ATT_idx = triItems.filter(t => t.ok).length / 3;
  ratios.push({ id: 'L10_ATT', no: 'L10', cat: 'ATT', lameba: true,
    name: 'Alokasi Tridharma Terimbang (ATT)',
    formula: 'Proporsi Pend/Rist/PkM vs bobot LAMEMBA',
    v: ATT_idx, target: 'Proporsional (≈1.0)',
    status: ATT_idx === 1 ? 'ok' : ATT_idx >= 0.66 ? 'warn' : 'bad',
    score: ATT_idx * 100,
    desc: 'LAMEMBA No.10 — alokasi proporsional. Bobot 50/30/20.',
    format: 'index', good: 'high',
    triItems,
    benchmarks: { SANGAT_BAIK: 1, BAIK: 1, PERHATIAN: 0.66, BERISIKO: 0.33 },
  });

  // === CFI Scorecard ===
  function avgScore(ids) {
    const items = ids.map(id => ratios.find(r => r.id === id)).filter(r => r && typeof r.score === 'number');
    if (!items.length) return 0;
    return items.reduce((s, r) => s + r.score, 0) / items.length;
  }
  const scorecard = [
    { k: 'Kekuatan Finansial', weight: 0.35, ratios: ['primaryReserve', 'viability', 'returnNA', 'netOpRev'], pic: 'CFO' },
    { k: 'Likuiditas', weight: 0.25, ratios: ['liquidity', 'daysCash', 'cashDebt'], pic: 'Treasurer' },
    { k: 'Efisiensi Operasi', weight: 0.20, ratios: ['opMargin', 'adminExp', 'tuitDep'], pic: 'Budget Dir.' },
    { k: 'Manajemen Utang', weight: 0.15, ratios: ['dscr', 'debtAssets', 'icr'], pic: 'CFO' },
    { k: 'Diversifikasi Pendapatan', weight: 0.05, ratios: ['L1_RK', 'revConc', 'giftRev'], pic: 'Dev. Office' },
  ].map(c => ({ ...c, score: avgScore(c.ratios) }));
  const CFI_total = scorecard.reduce((s, c) => s + c.weight * c.score, 0);

  // === Predikat (verdict) ===
  // L7 RBM has status 'info' (validated against institution's SPMI, not auto-checkable).
  // Count 'info' as fulfilled too — otherwise LAMEMBA max is 9/10 which conflicts
  // with the official "10 indikator" framing and makes SANGAT_BAIK unreachable.
  const lamebaTerpenuhi = ratios.filter(r => r.lameba && (r.status === 'ok' || r.status === 'info')).length;
  let verdict;
  if (CFI_total >= 85 && lamebaTerpenuhi >= 8) verdict = 'SANGAT_BAIK';
  else if (CFI_total >= 70 && lamebaTerpenuhi >= 6) verdict = 'BAIK';
  else if (CFI_total >= 50) verdict = 'PERHATIAN';
  else verdict = 'BERISIKO';

  return {
    ratios, scorecard, CFI_total, verdict, lamebaTerpenuhi,
    derived: { TS: dTS, 'TS-1': dTS1, 'TS-2': dTS2 },
    variance: { items: varianceItems, avg: varianceAvg },
    triItems,
    IKK, IKK_components,
  };
}

window.computeAll = computeAll;
window.computeYear = computeYear;
