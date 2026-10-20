/* GamePulse — DEMO DATA generator. Deterministic (seeded), 180 days × 6 games × 2 platforms × 7 countries.
   Every number in the UI is derived from these rows through metrics.js — nothing is hardcoded in screens.
   All data here is synthetic and must be labelled "Demo data". */
(function () {
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const DAY = 86400000;
  const END = Date.UTC(2026, 9, 19); // last finalized UTC day
  const N = 180;
  const dates = []; for (let i = N - 1; i >= 0; i--) dates.push(END - i * DAY);
  const iso = function (t) { return new Date(t).toISOString().slice(0, 10); };

  const COUNTRIES = [
    { code: "US", name: "United States", arpu: 2.2, cpi: 2.4, ecpm: 2.3, ios: .52 },
    { code: "GB", name: "United Kingdom", arpu: 1.6, cpi: 1.9, ecpm: 1.7, ios: .5 },
    { code: "DE", name: "Germany", arpu: 1.5, cpi: 1.7, ecpm: 1.6, ios: .38 },
    { code: "JP", name: "Japan", arpu: 2.1, cpi: 2.6, ecpm: 1.9, ios: .62 },
    { code: "BR", name: "Brazil", arpu: .45, cpi: .45, ecpm: .45, ios: .14 },
    { code: "IN", name: "India", arpu: .18, cpi: .16, ecpm: .2, ios: .07 },
    { code: "VN", name: "Vietnam", arpu: .32, cpi: .25, ecpm: .32, ios: .2 }
  ];
  const PLATFORMS = [{ id: "android", name: "Android", arpu: 1, ecpm: 1, cpi: 1 }, { id: "ios", name: "iOS", arpu: 1.8, ecpm: 1.45, cpi: 1.55 }];

  const GAMES = [
    { id: "tile-voyage", name: "Tile Voyage", short: "TV", genre: "Tile puzzle", color: "var(--chart-1)", dau: 142000, growth: .0042, newShare: .11, spu: 3.4, sessSec: 410, d1: .44, d7: .19,
      ipd: { inter: 3.6, rew: 1.4, banner: 22, appopen: .5 }, ecpm: { inter: 9.5, rew: 14, banner: .32, appopen: 6 }, payer: .021, arppu: 4.1, paid: .58, cpi: .82,
      mix: { US: .2, GB: .06, DE: .06, JP: .08, BR: .18, IN: .26, VN: .16 }, scenario: "growth", levels: 40,
      versions: [{ v: "4.7.0", age: 120 }, { v: "4.8.0", age: 64 }, { v: "4.9.0", age: 26 }, { v: "4.9.1", age: 9 }] },
    { id: "merge-kingdom", name: "Merge Kingdom", short: "MK", genre: "Merge-2", color: "var(--chart-6)", dau: 88000, growth: .0004, newShare: .09, spu: 4.1, sessSec: 330, d1: .41, d7: .18,
      ipd: { inter: 2.2, rew: 2.6, banner: 0, appopen: 0 }, ecpm: { inter: 11, rew: 16, banner: .3, appopen: 0 }, payer: .038, arppu: 6.8, paid: .62, cpi: 1.6,
      mix: { US: .3, GB: .08, DE: .1, JP: .12, BR: .14, IN: .12, VN: .14 }, scenario: "retention-drop", levels: 40,
      versions: [{ v: "1.12.0", age: 110 }, { v: "1.13.0", age: 58 }, { v: "1.14.0", age: 31 }] },
    { id: "sky-dash", name: "Sky Dash", short: "SD", genre: "Hyper-casual runner", color: "var(--chart-7)", dau: 365000, growth: .0006, newShare: .2, spu: 2.6, sessSec: 240, d1: .33, d7: .09,
      ipd: { inter: 6.2, rew: .9, banner: 34, appopen: 0 }, ecpm: { inter: 7.2, rew: 10.5, banner: .22, appopen: 0 }, payer: .002, arppu: 2.2, paid: .76, cpi: .32,
      mix: { US: .14, GB: .04, DE: .04, JP: .03, BR: .25, IN: .32, VN: .18 }, scenario: "ecpm-drop", levels: 40,
      versions: [{ v: "2.3.0", age: 140 }, { v: "2.4.0", age: 70 }, { v: "2.5.0", age: 35 }] },
    { id: "word-bloom", name: "Word Bloom", short: "WB", genre: "Word puzzle", color: "var(--chart-5)", dau: 64000, growth: .0018, newShare: .1, spu: 3.0, sessSec: 520, d1: .46, d7: .22,
      ipd: { inter: 2.8, rew: 1.9, banner: 18, appopen: .4 }, ecpm: { inter: 12, rew: 17, banner: .35, appopen: 7 }, payer: .026, arppu: 3.6, paid: .5, cpi: 1.35,
      mix: { US: .36, GB: .12, DE: .1, JP: .04, BR: .14, IN: .14, VN: .1 }, scenario: "hard-level", levels: 40,
      versions: [{ v: "3.0.2", age: 130 }, { v: "3.1.0", age: 60 }, { v: "3.2.0", age: 10 }] },
    { id: "manor-escape", name: "Manor Escape", short: "ME", genre: "Escape room · non-linear", color: "var(--chart-3)", dau: 38000, growth: .0012, newShare: .12, spu: 2.4, sessSec: 690, d1: .38, d7: .15,
      ipd: { inter: 1.8, rew: 2.2, banner: 0, appopen: 0 }, ecpm: { inter: 13, rew: 18, banner: .3, appopen: 0 }, payer: .031, arppu: 5.2, paid: .55, cpi: 1.45,
      mix: { US: .32, GB: .1, DE: .12, JP: .1, BR: .12, IN: .12, VN: .12 }, scenario: "stable", nonlinear: true, levels: 0,
      versions: [{ v: "1.4.0", age: 100 }, { v: "1.5.0", age: 44 }] },
    { id: "brick-smash", name: "Brick Smash", short: "BS", genre: "Arcade breaker", color: "var(--chart-8)", dau: 121000, growth: .0008, newShare: .13, spu: 3.1, sessSec: 300, d1: .39, d7: .15,
      ipd: { inter: 4.4, rew: 1.3, banner: 26, appopen: .8 }, ecpm: { inter: 8.8, rew: 13, banner: .28, appopen: 5.5 }, payer: .012, arppu: 3.2, paid: .64, cpi: .78,
      mix: { US: .22, GB: .06, DE: .07, JP: .06, BR: .2, IN: .22, VN: .17 }, scenario: "crash", levels: 40,
      versions: [{ v: "2.2.0", age: 115 }, { v: "2.3.1", age: 52 }, { v: "2.4.0", age: 9 }] }
  ];
  GAMES.forEach(function (g) { g.kk = Math.log(g.d1 / g.d7) / Math.log(7); g.S = [0]; for (let n = 1; n <= 30; n++) g.S[n] = g.S[n - 1] + Math.pow(n, -g.kk); });

  function scen(g, age) {
    const m = { dau: 1, d1: 1, ecpm: 1, spu: 1, sess: 1 };
    if (g.scenario === "retention-drop" && age < 14) { const f = (14 - age) / 14; m.d1 = 1 - .32 * f; m.dau = 1 - .1 * f; m.spu = 1 - .06 * f; }
    if (g.scenario === "ecpm-drop" && age < 10) { const f = (10 - age) / 10; m.ecpm = 1 - .36 * f; }
    if (g.scenario === "hard-level" && age < 10) { m.d1 = .97; m.spu = .93; m.dau = 1 - .05 * (10 - age) / 10; }
    if (g.scenario === "crash" && age < 9) { m.d1 = .95; m.dau = 1 - .06 * (9 - age) / 9; m.sess = .96; }
    return m;
  }

  const ROWS = []; // per game array
  GAMES.forEach(function (g, gi) {
    const r = rng(hash(g.id));
    const rows = [];
    for (let di = 0; di < N; di++) {
      const age = N - 1 - di;
      const dow = new Date(dates[di]).getUTCDay();
      const wk = dow === 0 || dow === 6 ? 1.08 : dow === 5 ? 1.03 : 1;
      const m = scen(g, age);
      const trend = Math.pow(1 + g.growth, -age) * m.dau * wk;
      COUNTRIES.forEach(function (c, ci) {
        PLATFORMS.forEach(function (p, pi) {
          const share = (g.mix[c.code] || 0) * (pi === 1 ? c.ios : 1 - c.ios);
          const nz = function (a) { return 1 + (r() - .5) * 2 * (a || .04); };
          const dau = Math.round(g.dau * share * trend * nz());
          const nu = Math.round(dau * g.newShare * nz(.07) * (g.scenario === "growth" ? 1.05 : 1));
          const spu = g.spu * m.spu * (pi === 1 ? 1.06 : 1) * nz(.03);
          const ses = Math.round(dau * spu);
          const pt = Math.round(ses * g.sessSec * m.sess * (c.code === "JP" ? 1.12 : c.code === "IN" ? .9 : 1) * nz(.04));
          const em = c.ecpm * p.ecpm * m.ecpm;
          const ii = Math.round(dau * g.ipd.inter * nz(.05)), ir = Math.round(dau * g.ipd.rew * nz(.06)), ib = Math.round(dau * g.ipd.banner * nz(.05)), ia = Math.round(dau * g.ipd.appopen * nz(.06));
          const ri = ii * g.ecpm.inter * em * nz(.06) / 1000, rr = ir * g.ecpm.rew * em * nz(.06) / 1000, rb = ib * g.ecpm.banner * em * nz(.06) / 1000, ra = ia * g.ecpm.appopen * em * nz(.06) / 1000;
          const imps = ii + ir + ib + ia;
          const loadOk = .935 - (g.scenario === "ecpm-drop" && age < 10 ? .05 * (10 - age) / 10 : 0) + (r() - .5) * .01;
          const req = Math.round(imps / (loadOk * .9));
          const loaded = Math.round(req * loadOk);
          const rewOptIn = .36 + (r() - .5) * .03, rewComp = .91 + (r() - .5) * .02;
          const rewOffers = Math.round(ir / (rewOptIn * rewComp));
          const rewStarts = Math.round(rewOffers * rewOptIn);
          const payers = Math.max(0, Math.round(dau * g.payer * p.arpu * Math.min(1.6, c.arpu) * .7 * nz(.15)));
          const iapG = payers * g.arppu * (0.6 + c.arpu * .4) * nz(.12);
          const purch = Math.round(payers * 1.32);
          const firstPurch = Math.round(payers * .11 * nz(.2));
          const subRev = g.payer > .02 ? iapG * .14 : 0;
          const inst = Math.round(nu * .97);
          const paidI = Math.round(inst * g.paid * (c.code === "US" || c.code === "JP" ? 1.1 : .95) * nz(.06));
          const orgI = Math.max(0, inst - paidI);
          const spend = paidI * g.cpi * c.cpi * p.cpi * nz(.07) * (g.scenario === "growth" ? 1 : 1) * (g.scenario === "hard-level" && age < 10 ? 1.22 : 1);
          const d1 = Math.min(.7, g.d1 * m.d1 * (pi === 1 ? 1.06 : 1) * (c.code === "JP" ? 1.05 : c.code === "IN" ? .88 : 1) * nz(.05));
          const row = { di: di, gi: gi, pi: pi, ci: ci, dau: dau, nu: nu, ses: ses, pt: pt, eng: Math.round(ses * (.76 + r() * .04)), ev: Math.round(ses * 34 * nz(.05)),
            ii: ii, ir: ir, ib: ib, ia: ia, ri: ri, rr: rr, rb: rb, ra: ra, req: req, loaded: loaded, rewOffers: rewOffers, rewStarts: rewStarts,
            payers: payers, iapG: iapG, iapRef: iapG * .024, purch: purch, firstPurch: firstPurch, subRev: subRev,
            orgI: orgI, paidI: paidI, spend: spend, wau: Math.round(dau * 2.35 * nz(.02)), mau: Math.round(dau * 4.7 * nz(.02)), d1r: d1 };
          for (let n = 1; n <= 14; n++) row["r" + n] = Math.round(nu * d1 * Math.pow(n, -g.kk) * nz(.04));
          row.r30 = Math.round(nu * d1 * Math.pow(30, -g.kk) * nz(.05));
          rows.push(row);
        });
      });
    }
    ROWS.push(rows);
  });

  /* --- Campaigns --- */
  const CAMP_T = [
    { src: "Google Ads", n: "UAC_tCPI_US_iOS", cs: ["US"], p: 1, w: 1 }, { src: "Meta Ads", n: "AEO_US_iOS", cs: ["US"], p: 1, w: .7 },
    { src: "AppLovin", n: "ROAS_T1_Android", cs: ["US", "GB", "DE"], p: 0, w: 1 }, { src: "Unity Ads", n: "CPI_JP_Android", cs: ["JP"], p: 0, w: 1 },
    { src: "Google Ads", n: "UAC_tROAS_T1_iOS", cs: ["JP", "GB", "DE"], p: 1, w: 1 }, { src: "Mintegral", n: "CPI_LATAM_Android", cs: ["BR"], p: 0, w: 1 },
    { src: "TikTok Ads", n: "VO_SEA_Android", cs: ["VN", "IN"], p: 0, w: 1 }, { src: "Meta Ads", n: "MAI_EM_Android", cs: ["IN", "BR", "VN"], p: 0, w: .8 },
    { src: "AppLovin", n: "CPI_ROW_iOS", cs: ["BR", "IN", "VN"], p: 1, w: 1 }, { src: "Google Ads", n: "UAC_T1_Android", cs: ["US", "GB", "DE", "JP"], p: 0, w: .8 }
  ];
  const CAMPAIGNS = GAMES.map(function (g) {
    const r = rng(hash(g.id + "camp"));
    return CAMP_T.map(function (t, k) { return { id: g.short + "-" + k, gameId: g.id, source: t.src, name: g.short + "_" + t.n, countries: t.cs, pi: t.p, w: t.w, cpiMult: .8 + r() * .5, quality: .78 + r() * .42 }; });
  });

  /* --- Tech: versions, issues, devices --- */
  const DEVICES = ["Samsung Galaxy A14", "Redmi Note 12", "Samsung Galaxy S23", "Pixel 7", "OPPO A57", "iPhone 13", "iPhone 15", "iPhone 11", "iPad (9th gen)"];
  const ISSUE_T = [
    { type: "Fatal", t: "SIGABRT · libil2cpp.so", sev: "high" }, { type: "Fatal", t: "OutOfMemoryError · Texture2D.LoadImage", sev: "medium" },
    { type: "ANR", t: "Input dispatching timed out · AdManager.ShowInterstitial", sev: "medium" }, { type: "Non-fatal", t: "NullReferenceException · UI.ShopPanel.Refresh", sev: "low" },
    { type: "Fatal", t: "EXC_BAD_ACCESS · UnityFramework", sev: "medium" }, { type: "Non-fatal", t: "TimeoutException · RemoteConfig.Fetch", sev: "low" }
  ];

  /* --- Experiments --- */
  const EXPERIMENTS = [
    { id: "exp-101", gameId: "tile-voyage", name: "Internet Required Popup", hypothesis: "Hiding the 'internet required' popup for offline sessions keeps players who would otherwise quit, raising D1 without hurting ad revenue.", start: 46, end: 18, a: "Popup ON (control)", b: "Popup OFF", alloc: [50, 50], eligible: 214000, assigned: [53210, 53390], status: "completed",
      kpi: { d1: [.441, .462], d7: [.192, .199], spu: [3.38, 3.52], playtime: [1392, 1450], adRevUser: [.098, .091], arpdau: [.121, .117], levelComp: [.71, .72], crash: [.0021, .0022] } },
    { id: "exp-102", gameId: "sky-dash", name: "Interstitial Frequency 45s → 30s", hypothesis: "Shorter interstitial cooldown increases ad revenue per user without a material D1 loss.", start: 20, end: null, a: "Cooldown 45s (control)", b: "Cooldown 30s", alloc: [50, 50], eligible: 980000, assigned: [121400, 118020], status: "running",
      kpi: { d1: [.331, .318], d7: [.091, .086], spu: [2.61, 2.49], playtime: [626, 598], adRevUser: [.041, .049], arpdau: [.044, .051], levelComp: [.64, .63], crash: [.0018, .0018] } },
    { id: "exp-103", gameId: "word-bloom", name: "Difficulty Tuning L20–30", hypothesis: "Softening levels 20–30 reduces mid-game churn.", start: 8, end: null, a: "v3.2 curve (control)", b: "Softened curve", alloc: [50, 50], eligible: 41000, assigned: [9820, 9905], status: "running",
      kpi: { d1: [.452, .458], d7: [null, null], spu: [2.81, 2.93], playtime: [1470, 1525], adRevUser: [.084, .087], arpdau: [.112, .116], levelComp: [.58, .67], crash: [.002, .002] } },
    { id: "exp-104", gameId: "merge-kingdom", name: "Booster Pricing 120 → 90 gems", hypothesis: "Lower booster price increases payer conversion enough to offset ARPPU.", start: 30, end: 2, a: "120 gems (control)", b: "90 gems", alloc: [50, 50], eligible: 66000, assigned: [16100, 16020], status: "completed",
      kpi: { d1: [.402, .405], d7: [.171, .174], spu: [4.05, 4.11], playtime: [1340, 1362], adRevUser: [.061, .06], arpdau: [.221, .229], levelComp: [.69, .7], crash: [.0019, .0019] } },
    { id: "exp-105", gameId: "manor-escape", name: "Onboarding: Guided first room", hypothesis: "A guided first room raises object completion and D1.", start: 3, end: null, a: "Free explore (control)", b: "Guided", alloc: [50, 50], eligible: 9100, assigned: [1520, 1534], status: "running",
      kpi: { d1: [.379, .392], d7: [null, null], spu: [2.38, 2.41], playtime: [1640, 1702], adRevUser: [.072, .07], arpdau: [.152, .149], levelComp: [.48, .55], crash: [.002, .002] } }
  ];

  /* --- Non-linear map (Manor Escape) --- */
  const ROOMS = [
    { id: "foyer", name: "Foyer", objects: ["Grandfather clock", "Coat rack", "Locked chest"], steps: 3 },
    { id: "library", name: "Library", objects: ["Bookshelf cipher", "Globe", "Desk drawer"], steps: 4 },
    { id: "kitchen", name: "Kitchen", objects: ["Spice rack", "Oven dial", "Pantry lock"], steps: 3 },
    { id: "cellar", name: "Cellar", objects: ["Wine rack", "Fuse box", "Old trunk"], steps: 5 },
    { id: "attic", name: "Attic", objects: ["Music box", "Portrait", "Telescope"], steps: 4 },
    { id: "garden", name: "Garden", objects: ["Fountain", "Hedge maze", "Gate"], steps: 3 }
  ];

  window.GP_DATA = { DAY: DAY, END: END, N: N, dates: dates, iso: iso, COUNTRIES: COUNTRIES, PLATFORMS: PLATFORMS, GAMES: GAMES, ROWS: ROWS, CAMPAIGNS: CAMPAIGNS,
    DEVICES: DEVICES, ISSUE_T: ISSUE_T, EXPERIMENTS: EXPERIMENTS, ROOMS: ROOMS, rng: rng, hash: hash, scen: scen,
    UPDATED_AT: Date.UTC(2026, 9, 20, 6, 12) };
})();
