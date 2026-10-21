/* GamePulse — metric engine. Pure functions over GP_DATA rows. UI never computes KPIs itself.
   Rule: ratio metrics are always recomputed from summed numerators / denominators (never averaged). */
(function () {
  const D = window.GP_DATA;
  const SF = ["dau", "nu", "ses", "pt", "eng", "ev", "ii", "ir", "ib", "ia", "ri", "rr", "rb", "ra", "req", "loaded", "rewOffers", "rewStarts", "payers", "iapG", "iapRef", "purch", "firstPurch", "subRev", "orgI", "paidI", "spend", "wau", "mau"];
  const RN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 30];
  function zero() { const o = {}; SF.forEach(function (k) { o[k] = 0; }); return o; }
  function add(a, r, f) { for (let i = 0; i < SF.length; i++) { const k = SF[i]; a[k] += r[k] * (f == null ? 1 : f); } }
  function sd(a, b) { return b ? a / b : null; }
  function gameIdx(F) { return F.game && F.game !== "all" ? [D.GAMES.findIndex(function (g) { return g.id === F.game; })] : D.GAMES.map(function (_, i) { return i; }); }
  function matchRow(r, F) {
    if (F.platform && F.platform !== "all" && D.PLATFORMS[r.pi].id !== F.platform) return false;
    if (F.countries && F.countries.length && F.countries.indexOf(D.COUNTRIES[r.ci].code) < 0) return false;
    return true;
  }
  /* user-type split: new users monetize & engage less than returning (modeled) */
  function utFactor(r, ut) {
    if (!ut || ut === "all") return null;
    const f = r.dau ? r.nu / r.dau : 0;
    return ut === "new" ? { dau: f, act: f * .82, mon: f * .55 } : { dau: 1 - f, act: 1 - f * .82, mon: 1 - f * .55 };
  }
  function scan(F, from, to, cb) {
    gameIdx(F).forEach(function (gi) {
      const rows = D.ROWS[gi];
      for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (r.di < from || r.di > to) continue; if (!matchRow(r, F)) continue; cb(r); }
    });
  }
  function addUT(a, r, ut) {
    const u = utFactor(r, ut);
    if (!u) { add(a, r); return; }
    for (let i = 0; i < SF.length; i++) {
      const k = SF[i];
      const f = k === "dau" || k === "wau" || k === "mau" ? u.dau : k === "nu" ? (ut === "new" ? 1 : 0) : k === "ses" || k === "pt" || k === "eng" || k === "ev" ? u.act : u.mon;
      a[k] += r[k] * f;
    }
  }
  function agg(F, from, to, opts) {
    opts = opts || {};
    const len = to - from + 1;
    const total = zero(), byDay = [], byGame = {}, byCountry = {}, byPlatform = {};
    for (let i = 0; i < len; i++) byDay.push(zero());
    scan(F, from, to, function (r) {
      const ut = opts.userType;
      addUT(total, r, ut); addUT(byDay[r.di - from], r, ut);
      const g = D.GAMES[r.gi].id, c = D.COUNTRIES[r.ci].code, p = D.PLATFORMS[r.pi].id;
      (byGame[g] = byGame[g] || zero()); addUT(byGame[g], r, ut);
      (byCountry[c] = byCountry[c] || zero()); addUT(byCountry[c], r, ut);
      (byPlatform[p] = byPlatform[p] || zero()); addUT(byPlatform[p], r, ut);
    });
    return { total: total, byDay: byDay, byGame: byGame, byCountry: byCountry, byPlatform: byPlatform, from: from, to: to, days: len };
  }
  function derive(s, days, last) {
    const iaa = s.ri + s.rr + s.rb + s.ra, iap = s.iapG, rev = iaa + iap, imps = s.ii + s.ir + s.ib + s.ia;
    const uniq = last ? (days <= 1 ? s.dau : days <= 7 ? last.wau : last.mau) : null;
    return {
      days: days, dau: s.dau / days, dauSum: s.dau, newUsers: s.nu, returning: (s.dau - s.nu) / days, sessions: s.ses, spd: sd(s.ses, s.dau), avgSess: sd(s.pt, s.ses),
      engTime: s.pt, engPerDau: sd(s.pt, s.dau), engaged: s.eng, engRate: sd(s.eng, s.ses), evPerUser: sd(s.ev, s.dau), activeDays: uniq ? Math.min(days, s.dau / uniq) : null,
      wau: last ? last.wau : null, mau: last ? last.mau : null, stickiness: last ? sd(last.dau, last.mau) : null,
      iaa: iaa, iap: iap, rev: rev, iapNet: (s.iapG - s.iapRef) * .7, refunds: s.iapRef, subRev: s.subRev, arpdau: sd(rev, s.dau), adArpdau: sd(iaa, s.dau), iapArpdau: sd(iap, s.dau),
      arpu: uniq ? rev / uniq : null, revPerSession: sd(rev, s.ses),
      imps: imps, ii: s.ii, ir: s.ir, ib: s.ib, ia: s.ia, ri: s.ri, rr: s.rr, rb: s.rb, ra: s.ra,
      ecpm: sd(iaa * 1000, imps), ecpmInter: sd(s.ri * 1000, s.ii), ecpmRew: sd(s.rr * 1000, s.ir), ecpmBanner: sd(s.rb * 1000, s.ib), ecpmAppOpen: sd(s.ra * 1000, s.ia),
      ipd: sd(imps, s.dau), ipdInter: sd(s.ii, s.dau), ipdRew: sd(s.ir, s.dau), ipdBanner: sd(s.ib, s.dau), ipdAppOpen: sd(s.ia, s.dau),
      loadRate: sd(s.loaded, s.req), showRate: sd(imps, s.loaded), rewOptIn: sd(s.rewStarts, s.rewOffers), rewComp: sd(s.ir, s.rewStarts),
      payers: s.payers, payerConv: sd(s.payers, s.dau), arppu: sd(s.iapG, s.payers), purchases: s.purch, firstPurch: s.firstPurch, firstPurchConv: sd(s.firstPurch, s.nu),
      installs: s.orgI + s.paidI, orgI: s.orgI, paidI: s.paidI, spend: s.spend, cpi: sd(s.spend, s.paidI), roasDay: sd(rev, s.spend)
    };
  }
  function ranges(F) {
    const from = F.from, to = F.to, len = to - from + 1;
    let cf = null;
    if (F.compare === "prev") cf = from - len; else if (F.compare === "wow") cf = from - 7; else if (F.compare === "custom" && F.compareFrom != null) cf = F.compareFrom;
    return { from: from, to: to, len: len, cFrom: cf, cTo: cf == null ? null : cf + len - 1 };
  }
  /* main entry: current + compare aggregates with derived KPIs and per-day derived series */
  function summary(F, opts) {
    const R = ranges(F);
    const cur = agg(F, R.from, R.to, opts);
    const curK = derive(cur.total, cur.days, cur.byDay[cur.byDay.length - 1]);
    let prev = null, prevK = null;
    if (R.cFrom != null && R.cFrom >= 0) { prev = agg(F, R.cFrom, R.cTo, opts); prevK = derive(prev.total, prev.days, prev.byDay[prev.byDay.length - 1]); }
    const series = cur.byDay.map(function (s, i) { const k = derive(s, 1, s); k.di = R.from + i; return k; });
    const pseries = prev ? prev.byDay.map(function (s, i) { const k = derive(s, 1, s); k.di = R.cFrom + i; return k; }) : null;
    return { R: R, cur: cur, prev: prev, k: curK, pk: prevK, series: series, pseries: pseries };
  }
  function delta(a, b, pp) { if (a == null || b == null || !isFinite(a) || !isFinite(b)) return null; if (pp) return a - b; return b ? (a - b) / Math.abs(b) : null; }

  /* ---------- retention (cohort-weighted, maturity-aware) ---------- */
  function cohortRows(F, from, to, keyFn) {
    const out = {};
    scan(F, from, to, function (r) {
      if (r.noRet) return; /* live rows without cohort data: show "—" rather than 0% */
      const k = keyFn ? keyFn(r) : r.di;
      const o = out[k] || (out[k] = { key: k, size: 0, n: {}, base: {}, di: r.di });
      o.size += r.nu;
      RN.forEach(function (n) { if (r.di + n <= D.N - 1) { o.n[n] = (o.n[n] || 0) + r["r" + n]; o.base[n] = (o.base[n] || 0) + r.nu; } });
    });
    return out;
  }
  function weighted(groups) {
    const res = {}, cov = {};
    RN.forEach(function (n) { let num = 0, den = 0, tot = 0; groups.forEach(function (g) { tot += g.size; if (g.base[n]) { num += g.n[n]; den += g.base[n]; } }); res[n] = den ? num / den : null; cov[n] = tot ? den / tot : 0; });
    res[0] = 1; return { r: res, coverage: cov };
  }
  /* rolling / unbounded are modeled from classic counts; real data has no such series, so report N/A */
  function rolling(classic) { if (D.LIVE) return nulls(); const out = { 0: 1 }; const d1 = classic[1]; RN.forEach(function (n) { const c = classic[n]; if (c == null) { out[n] = null; return; } out[n] = Math.min(.97, d1 + (1 - d1) * .3 * (1 - Math.exp(-(n - 1) / 4))); }); return out; }
  function nulls() { const out = { 0: 1 }; RN.forEach(function (n) { out[n] = null; }); return out; }
  function unbounded(classic) { if (D.LIVE) return nulls(); const out = { 0: 1 }; RN.forEach(function (n) { const c = classic[n]; out[n] = c == null ? null : Math.min(.95, c * (1.48 + .018 * Math.min(n, 14))); }); return out; }
  function retention(F) {
    const R = ranges(F);
    const byDay = cohortRows(F, R.from, R.to);
    const cohorts = Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.di - b.di; });
    const w = weighted(cohorts);
    let prevW = null;
    if (R.cFrom != null && R.cFrom >= 0) prevW = weighted(Object.values(cohortRows(F, R.cFrom, R.cTo)));
    return { cohorts: cohorts, classic: w.r, coverage: w.coverage, rolling: rolling(w.r), unbounded: unbounded(w.r), prev: prevW ? prevW.r : null, R: R };
  }
  function retentionBy(F, dim) {
    const R = ranges(F);
    let key;
    if (dim === "country") key = function (r) { return D.COUNTRIES[r.ci].code; };
    else if (dim === "platform") key = function (r) { return D.PLATFORMS[r.pi].name; };
    else if (dim === "game") key = function (r) { return D.GAMES[r.gi].name; };
    else if (dim === "version") key = function (r) { const g = D.GAMES[r.gi]; const age = D.N - 1 - r.di; let v = g.versions[0].v; g.versions.forEach(function (x) { if (x.age >= age + 3) v = x.v; }); return v; };
    const groups = cohortRows(F, R.from, R.to, key);
    return Object.keys(groups).map(function (k) { const w = weighted([groups[k]]); return { key: k, size: groups[k].size, r: w.r }; }).sort(function (a, b) { return b.size - a.size; });
  }
  function retentionByFirstLevel(F) {
    const base = retention(F).classic;
    const buckets = [{ key: "Level 1–3", share: .24, m: .55 }, { key: "Level 4–6", share: .29, m: .92 }, { key: "Level 7–10", share: .27, m: 1.18 }, { key: "Level 11+", share: .2, m: 1.42 }];
    return buckets.map(function (b) { const r = {}; Object.keys(base).forEach(function (n) { r[n] = base[n] == null ? null : n == 0 ? 1 : Math.min(.9, base[n] * b.m); }); return { key: b.key, share: b.share, r: r }; });
  }

  /* ---------- levels (linear) ---------- */
  function levels(F) {
    const g = D.GAMES.find(function (x) { return x.id === F.game; });
    if (!g || g.nonlinear || !g.levels) return null;
    const R = ranges(F);
    let players = 0, recent = 0;
    scan(F, R.from, R.to, function (r) { players += r.nu; if (g.scenario === "hard-level" && D.N - 1 - r.di < 10) recent += r.nu; });
    players *= .93;
    const hardShare = players ? recent * .93 / players : 0;
    const rr = D.rng(D.hash(g.id + "lv"));
    const out = [];
    let reach = players;
    for (let l = 1; l <= g.levels; l++) {
      let wr = Math.max(.28, Math.min(.95, .93 - .42 * (l / g.levels) + Math.sin(l * 1.7) * .06 + (rr() - .5) * .05));
      if (l % 10 === 0) wr *= .82;
      if (g.id === "word-bloom" && l === 24) wr = .48 * (1 - hardShare) + .19 * hardShare;
      if (g.id === "brick-smash" && l === 31) wr *= .85;
      let drop = .012 + .2 * Math.pow(1 - wr, 2.2) + (rr() - .5) * .006;
      if (g.id === "word-bloom" && l === 24) drop = .06 * (1 - hardShare) + .23 * hardShare;
      drop = Math.max(.004, drop);
      const completes = reach * (1 - drop * .65);
      const starts = completes / wr;
      const exits = starts * (.035 + (1 - wr) * .05);
      const fails = Math.max(0, starts - completes - exits);
      const boosters = starts * (.04 + (1 - wr) * .38);
      const avgTime = 38 + l * 2.2 + (1 - wr) * 70 + rr() * 8;
      const adImps = starts * (.32 + rr() * .06) + reach * (.4 * (1 - wr));
      const rev = adImps * g.ecpm.inter / 1000 * .9 + boosters * .004;
      out.push({ id: l, level: l, reach: reach, reachRate: players ? reach / players : 0, starts: starts, wins: completes, fails: fails, exits: exits, winRate: wr, completionRate: reach ? completes / reach : 0,
        avgAttempts: reach ? starts / reach : 0, retryRate: starts ? (starts - reach) / starts : 0, avgTime: avgTime, drop: drop, boosters: boosters, boosterRate: starts ? boosters / starts : 0,
        adImps: adImps, rev: rev, exitRate: starts ? exits / starts : 0 });
      reach = reach * (1 - drop);
    }
    return { game: g, players: players, levels: out, hardShare: hardShare };
  }
  function levelTimeDist(lv) {
    const m = lv.avgTime, bins = [];
    const edges = [0, .4, .6, .8, 1, 1.25, 1.6, 2.2, 3.5];
    let tot = 0; const raw = [];
    for (let i = 0; i < edges.length - 1; i++) { const mid = (edges[i] + edges[i + 1]) / 2; const v = Math.exp(-Math.pow(Math.log(mid) / .45, 2) / 2) * (edges[i + 1] - edges[i]); raw.push(v); tot += v; }
    for (let i = 0; i < raw.length; i++) bins.push({ x: Math.round(edges[i] * m) + "–" + Math.round(edges[i + 1] * m) + "s", v: raw[i] / tot * lv.wins });
    return bins;
  }

  /* ---------- non-linear (Room → Object → Step) ---------- */
  function nonlinear(F) {
    const g = D.GAMES.find(function (x) { return x.id === F.game; });
    if (!g || !g.nonlinear) return null;
    const R = ranges(F);
    let players = 0; scan(F, R.from, R.to, function (r) { players += r.nu; });
    const rr = D.rng(D.hash("manor"));
    const reachRates = [1, .74, .66, .41, .33, .22];
    const rooms = D.ROOMS.map(function (room, i) {
      const reach = players * reachRates[i] * (.97 + rr() * .06);
      const objects = room.objects.map(function (o, j) {
        const startRate = .55 + rr() * .4, compRate = (room.id === "cellar" && j === 1) ? .31 : .58 + rr() * .35;
        const st = reach * startRate, cp = st * compRate;
        const steps = []; let s = cp > 0 ? st : 0;
        for (let k = 1; k <= room.steps; k++) { const c = (room.id === "cellar" && j === 1 && k === 3) ? .42 : .82 + rr() * .15; const done = s * c; steps.push({ step: k, entered: s, completed: done, rate: c, abandon: 1 - c }); s = done; }
        return { name: o, starts: st, completes: cp, startRate: startRate, compRate: compRate, time: 70 + rr() * 160 + (compRate < .4 ? 140 : 0), steps: steps };
      });
      return { id: room.id, name: room.name, reach: reach, reachRate: players ? reach / players : 0, objects: objects };
    });
    const ids = D.ROOMS.map(function (r) { return r.id; });
    const matrix = ids.map(function (a, i) { const row = ids.map(function (b, j) { return i === j ? 0 : Math.max(.01, rr() * (j === i + 1 ? 2.4 : 1) * (j < i ? .4 : 1)); }); const exit = .15 + i * .05; const s = row.reduce(function (x, y) { return x + y; }, 0); return { from: a, to: row.map(function (v) { return v / s * (1 - exit); }), exit: exit }; });
    const nodes = [{ id: "start", label: "First open", column: 0, color: "var(--chart-1)" }];
    const links = [];
    const firsts = [["foyer", .62], ["library", .23], ["kitchen", .15]];
    firsts.forEach(function (f) { nodes.push({ id: "1-" + f[0], label: D.ROOMS.find(function (r) { return r.id === f[0]; }).name, column: 1, color: "var(--chart-2)" }); links.push({ source: "start", target: "1-" + f[0], value: players * f[1] }); });
    const seconds = ["library", "kitchen", "cellar", "attic"];
    seconds.forEach(function (s) { nodes.push({ id: "2-" + s, label: D.ROOMS.find(function (r) { return r.id === s; }).name, column: 2, color: "var(--chart-6)" }); });
    nodes.push({ id: "2-exit", label: "Left session", column: 2, color: "var(--chart-compare)" });
    firsts.forEach(function (f) {
      const v = players * f[1]; const parts = { library: f[0] === "library" ? 0 : .3, kitchen: f[0] === "kitchen" ? 0 : .24, cellar: .14, attic: .08 };
      let used = 0; seconds.forEach(function (s) { const pv = v * parts[s]; if (pv > 0) { links.push({ source: "1-" + f[0], target: "2-" + s, value: pv }); used += pv; } });
      links.push({ source: "1-" + f[0], target: "2-exit", value: v - used });
    });
    nodes.push({ id: "3-deeper", label: "Explored 3+ rooms", column: 3, color: "var(--chart-5)" }); nodes.push({ id: "3-exit", label: "Stopped", column: 3, color: "var(--chart-compare)" });
    seconds.forEach(function (s) { const inV = links.filter(function (l) { return l.target === "2-" + s; }).reduce(function (a, l) { return a + l.value; }, 0); links.push({ source: "2-" + s, target: "3-deeper", value: inV * .58 }); links.push({ source: "2-" + s, target: "3-exit", value: inV * .42 }); });
    return { players: players, rooms: rooms, matrix: matrix, ids: ids, sankey: { nodes: nodes, links: links } };
  }

  /* ---------- user acquisition ---------- */
  function ltvFactor(g, d1r, n) { return 1 + d1r * g.S[Math.min(30, n)]; }
  function campaigns(F) {
    const R = ranges(F);
    const gis = gameIdx(F);
    const map = {};
    gis.forEach(function (gi) { D.CAMPAIGNS[gi].forEach(function (c) { map[c.id] = { c: c, spend: 0, installs: 0, d1n: 0, d7n: 0, d1b: 0, d7b: 0, rev: { 0: 0, 1: 0, 3: 0, 7: 0, 30: 0 }, sp: { 0: 0, 1: 0, 3: 0, 7: 0, 30: 0 }, countries: {} }; }); });
    scan(F, R.from, R.to, function (r) {
      const g = D.GAMES[r.gi], cc = D.COUNTRIES[r.ci].code;
      const cs = D.CAMPAIGNS[r.gi].filter(function (c) { return c.pi === r.pi && c.countries.indexOf(cc) >= 0; });
      const wi = cs.reduce(function (a, c) { return a + c.w; }, 0), ws = cs.reduce(function (a, c) { return a + c.w * c.cpiMult; }, 0);
      const arpu = r.dau ? (r.ri + r.rr + r.rb + r.ra + r.iapG) / r.dau : 0;
      cs.forEach(function (c) {
        const m = map[c.id]; if (!m) return;
        const inst = r.paidI * c.w / wi, sp = r.spend * c.w * c.cpiMult / ws;
        m.installs += inst; m.spend += sp; m.countries[cc] = (m.countries[cc] || 0) + inst;
        const d1 = Math.min(.75, r.d1r * c.quality);
        if (r.di + 1 <= D.N - 1) { m.d1n += inst * d1; m.d1b += inst; }
        if (r.di + 7 <= D.N - 1) { m.d7n += inst * d1 * Math.pow(7, -g.kk); m.d7b += inst; }
        [0, 1, 3, 7, 30].forEach(function (n) { if (r.di + n <= D.N - 1) { m.rev[n] += inst * arpu * c.quality * ltvFactor(g, d1, n) * .92; m.sp[n] += sp; } });
      });
    });
    return Object.keys(map).map(function (k) {
      const m = map[k];
      const topC = Object.keys(m.countries).sort(function (a, b) { return m.countries[b] - m.countries[a]; });
      return { id: m.c.id, gameId: m.c.gameId, source: m.c.source, name: m.c.name, country: topC.length > 1 ? topC[0] + " +" + (topC.length - 1) : topC[0] || "—", platform: D.PLATFORMS[m.c.pi].name,
        spend: m.spend, installs: m.installs, cpi: sd(m.spend, m.installs), d1: sd(m.d1n, m.d1b), d7: sd(m.d7n, m.d7b),
        d7Rev: m.rev[7], roas: { 0: sd(m.rev[0], m.sp[0]), 1: sd(m.rev[1], m.sp[1]), 3: sd(m.rev[3], m.sp[3]), 7: sd(m.rev[7], m.sp[7]), 30: sd(m.rev[30], m.sp[30]) },
        maturity: { 7: m.spend ? m.sp[7] / m.spend : 0, 30: m.spend ? m.sp[30] / m.spend : 0 }, _rev: m.rev, _sp: m.sp };
    }).filter(function (c) { return c.installs > 0; });
  }
  function filterCampaigns(list, F) {
    return list.filter(function (c) {
      if (F.source && F.source !== "all" && F.source !== "paid" && F.source !== "organic" && c.source !== F.source) return false;
      if (F.campaign && F.campaign !== "all" && c.id !== F.campaign) return false;
      return true;
    });
  }
  function uaSummary(F) {
    const list = filterCampaigns(campaigns(F), F);
    const tot = { spend: 0, installs: 0, rev: { 0: 0, 1: 0, 3: 0, 7: 0, 30: 0 }, sp: { 0: 0, 1: 0, 3: 0, 7: 0, 30: 0 } };
    list.forEach(function (c) { tot.spend += c.spend; tot.installs += c.installs; [0, 1, 3, 7, 30].forEach(function (n) { tot.rev[n] += c._rev[n]; tot.sp[n] += c._sp[n]; }); });
    const roas = {}; [0, 1, 3, 7, 30].forEach(function (n) { roas[n] = sd(tot.rev[n], tot.sp[n]); });
    const ltv7 = sd(tot.rev[7], tot.installs * (tot.sp[7] / (tot.spend || 1))), ltv30 = sd(tot.rev[30], tot.installs * (tot.sp[30] / (tot.spend || 1)));
    let payback = null;
    if (roas[7] && roas[30] && roas[30] > roas[7]) { const b = (roas[30] - roas[7]) / Math.log(30 / 7); const a = roas[30] - b * Math.log(30); payback = roas[30] >= 1 ? null : Math.exp((1 - a) / b); if (roas[30] >= 1) payback = 7 + (30 - 7) * (1 - roas[7]) / (roas[30] - roas[7]); }
    const curve = []; for (let n = 0; n <= 30; n++) { const a = roas[7] && roas[30] ? (n <= 7 ? (roas[0] || 0) + ((roas[7] - (roas[0] || 0)) * Math.log(1 + n) / Math.log(8)) : roas[7] + (roas[30] - roas[7]) * Math.log(n / 7) / Math.log(30 / 7)) : null; curve.push({ x: n, roas: a, ltv: a != null && tot.installs ? a * tot.spend / tot.installs : null }); }
    return { list: list, spend: tot.spend, installs: tot.installs, cpi: sd(tot.spend, tot.installs), roas: roas, ltv7: ltv7, ltv30: ltv30, payback: payback, curve: curve, maturity: { 7: tot.spend ? tot.sp[7] / tot.spend : 0, 30: tot.spend ? tot.sp[30] / tot.spend : 0 } };
  }

  /* ---------- technical health ---------- */
  function versionShares(g, age) {
    const out = g.versions.map(function () { return 0; }); let rem = 1;
    for (let i = g.versions.length - 1; i >= 0; i--) { const d = g.versions[i].age - age; if (d < 0) continue; const s = i === 0 ? rem : rem * .93 * (1 - Math.exp(-(d + 1) / 4)); out[i] = s; rem -= s; }
    return out;
  }
  function crashRate(g, v) { const bad = g.id === "brick-smash" && v === "2.4.0"; return { crash: bad ? .0105 : .0014 + (D.hash(g.id + v) % 9) / 10000, anr: bad ? .0052 : .0021 + (D.hash(v + g.id) % 6) / 10000, load: bad ? 2.62 : 1.9 + (D.hash(g.id) % 5) / 10, lvlFail: bad ? .0092 : .0038 }; }
  function tech(F) {
    const R = ranges(F);
    const days = [];
    for (let i = 0; i < R.len; i++) days.push({ di: R.from + i, dau: 0, ses: 0, crashes: 0, crashUsers: 0, anr: 0, androidDau: 0, loadW: 0, lvlFail: 0, req: 0, loaded: 0 });
    const byVer = {};
    const Fn = Object.assign({}, F, { countries: [] });
    scan(Fn, R.from, R.to, function (r) {
      const g = D.GAMES[r.gi], age = D.N - 1 - r.di, sh = versionShares(g, age), d = days[r.di - R.from];
      g.versions.forEach(function (v, vi) {
        if (!sh[vi]) return;
        if (F.version && F.version !== "all" && v.v !== F.version) return;
        const cr = crashRate(g, v.v), dau = r.dau * sh[vi], ses = r.ses * sh[vi];
        const cra = ses * cr.crash, cu = cra * .72, an = r.pi === 0 ? dau * cr.anr : 0;
        d.dau += dau; d.ses += ses; d.crashes += cra; d.crashUsers += cu; d.anr += an; if (r.pi === 0) d.androidDau += dau; d.loadW += ses * cr.load; d.lvlFail += ses * 1.9 * cr.lvlFail;
        d.req += r.req * sh[vi]; d.loaded += r.loaded * sh[vi];
        const k = g.id + "@" + v.v; const o = byVer[k] || (byVer[k] = { key: k, game: g.name, v: v.v, dau: 0, ses: 0, crashes: 0, crashUsers: 0, anr: 0, androidDau: 0, lastShare: 0 });
        o.dau += dau; o.ses += ses; o.crashes += cra; o.crashUsers += cu; o.anr += an; if (r.pi === 0) o.androidDau += dau;
      });
    });
    const T = days.reduce(function (a, d) { Object.keys(d).forEach(function (k) { if (k !== "di") a[k] = (a[k] || 0) + d[k]; }); return a; }, {});
    const lastAge = D.N - 1 - R.to;
    gameIdx(F).forEach(function (gi) { const g = D.GAMES[gi]; const sh = versionShares(g, lastAge); g.versions.forEach(function (v, vi) { const o = byVer[g.id + "@" + v.v]; if (o) o.lastShare = sh[vi]; }); });
    const netErr = .0108 + (F.game === "brick-smash" ? .002 : 0);
    const series = days.map(function (d) { return { di: d.di, crashFreeUsers: d.dau ? 1 - d.crashUsers / d.dau : null, crashFreeSessions: d.ses ? 1 - d.crashes / d.ses : null, crashes: d.crashes, anrRate: d.androidDau ? d.anr / d.androidDau : null, anr: d.anr, load: d.ses ? d.loadW / d.ses : null, adFail: d.req ? 1 - d.loaded / d.req : null }; });
    const issues = [];
    const gis = gameIdx(F);
    gis.forEach(function (gi) {
      const g = D.GAMES[gi];
      if (g.id === "brick-smash") issues.push({ id: "BS-1", game: g.name, type: "Fatal", title: "NullReferenceException · PowerUpManager.Apply", sev: "critical", users: 0, share: .58, versions: ["2.4.0"], device: "Samsung Galaxy A14", os: "Android 13", first: D.N - 1 - 9, last: D.N - 1 });
      D.ISSUE_T.forEach(function (t, i) { const h = D.hash(g.id + t.t); issues.push({ id: g.short + "-" + (i + 2), game: g.name, type: t.type, title: t.t, sev: t.sev, share: (g.id === "brick-smash" ? .42 : 1) * [.31, .22, .18, .12, .1, .07][i], versions: g.versions.slice(-2).map(function (v) { return v.v; }), device: D.DEVICES[h % D.DEVICES.length], os: D.DEVICES[h % D.DEVICES.length].indexOf("iP") === 0 ? "iOS 17." + (h % 6) : "Android " + (11 + h % 4), first: Math.max(0, D.N - 1 - (h % 140)), last: D.N - 1 - (h % 3) }); });
    });
    const usersByGame = {}; Object.values(byVer).forEach(function (o) { const g = D.GAMES.find(function (x) { return x.name === o.game; }); usersByGame[o.game] = (usersByGame[o.game] || 0) + o.crashUsers * (g && g.id === "brick-smash" && o.v !== "2.4.0" ? 1 : 1); });
    issues.forEach(function (is) { is.users = (usersByGame[is.game] || 0) * is.share / Math.max(1, R.len) * Math.min(R.len, 7); });
    const devices = D.DEVICES.map(function (d, i) { const h = D.hash(d + (F.game || "")); return { device: d, crashes: T.crashes * ([.21, .17, .08, .05, .14, .07, .04, .06, .03][i]) * (.85 + (h % 30) / 100) }; }).filter(function (d) { return F.platform === "all" || !F.platform || (F.platform === "ios" ? d.device.indexOf("iP") === 0 : d.device.indexOf("iP") !== 0); }).sort(function (a, b) { return b.crashes - a.crashes; });
    const errors = [{ x: "Network timeout", v: T.ses * netErr * .46 }, { x: "DNS / offline", v: T.ses * netErr * .28 }, { x: "Asset bundle load", v: T.lvlFail * .7 }, { x: "Ad load (no fill)", v: (T.req - T.loaded) * .02 }, { x: "IAP validation", v: T.ses * .0007 }, { x: "Remote config", v: T.ses * .0011 }];
    return { series: series, total: { crashFreeUsers: T.dau ? 1 - T.crashUsers / T.dau : null, crashFreeSessions: T.ses ? 1 - T.crashes / T.ses : null, crashes: T.crashes, anr: T.anr, anrRate: T.androidDau ? T.anr / T.androidDau : null, load: T.ses ? T.loadW / T.ses : null, lvlFail: T.ses ? T.lvlFail / (T.ses * 1.9) : null, netErr: netErr, adFail: T.req ? 1 - T.loaded / T.req : null },
      versions: Object.values(byVer).map(function (o) { return Object.assign(o, { crashFree: o.dau ? 1 - o.crashUsers / o.dau : null, crashRate: o.ses ? o.crashes / o.ses : null, anrRate: o.androidDau ? o.anr / o.androidDau : null }); }).sort(function (a, b) { return b.lastShare - a.lastShare; }),
      issues: issues.sort(function (a, b) { return b.users - a.users; }), devices: devices, errors: errors };
  }

  /* ---------- events ---------- */
  const EVENT_DEF = [
    { name: "first_open", count: function (s) { return s.nu; }, uu: function (s) { return s.nu; }, params: ["source", "country"] },
    { name: "session_start", count: function (s) { return s.ses; }, uu: function (s) { return s.dau; }, params: ["platform"] },
    { name: "level_start", count: function (s) { return s.ses * 1.9; }, uu: function (s) { return s.dau * .93; }, linear: true, params: ["level_id"] },
    { name: "level_complete", count: function (s) { return s.ses * 1.9 * .67; }, uu: function (s) { return s.dau * .88; }, linear: true, params: ["level_id", "boosters_used"] },
    { name: "level_fail", count: function (s) { return s.ses * 1.9 * .28; }, uu: function (s) { return s.dau * .54; }, linear: true, params: ["level_id", "fail_reason"] },
    { name: "room_start", count: function (s) { return s.dau * 2.1; }, uu: function (s) { return s.dau * .9; }, nl: true, params: ["room_id"] },
    { name: "object_start", count: function (s) { return s.dau * 5.3; }, uu: function (s) { return s.dau * .84; }, nl: true, params: ["room_id", "object_id"] },
    { name: "step_complete", count: function (s) { return s.dau * 9.8; }, uu: function (s) { return s.dau * .79; }, nl: true, params: ["object_id", "step"] },
    { name: "ad_impression", count: function (s) { return s.ii + s.ir + s.ib + s.ia; }, uu: function (s) { return s.dau * .91; }, params: ["ad_format", "ad_network"] },
    { name: "rewarded_offer", count: function (s) { return s.rewOffers; }, uu: function (s) { return s.dau * .58; }, params: ["placement"] },
    { name: "rewarded_complete", count: function (s) { return s.ir; }, uu: function (s) { return s.dau * .31; }, params: ["placement"] },
    { name: "purchase", count: function (s) { return s.purch; }, uu: function (s) { return s.payers; }, params: ["product_id"] },
    { name: "internet_popup_show", count: function (s) { return s.dau * .21; }, uu: function (s) { return s.dau * .12; }, params: ["action"] }
  ];
  const PARAM_VALUES = {
    source: [["Organic", .42], ["Google Ads", .2], ["AppLovin", .14], ["Meta Ads", .12], ["Other", .12]], country: null, platform: null,
    level_id: [["1", .14], ["2", .12], ["3", .1], ["4", .09], ["5", .08], ["6–10", .27], ["11+", .2]], boosters_used: [["0", .71], ["1", .21], ["2+", .08]], fail_reason: [["out_of_moves", .64], ["time_up", .24], ["quit", .12]],
    room_id: [["foyer", .31], ["library", .21], ["kitchen", .19], ["cellar", .13], ["attic", .1], ["garden", .06]], object_id: [["grandfather_clock", .14], ["bookshelf_cipher", .12], ["fuse_box", .1], ["spice_rack", .09], ["other", .55]], step: [["1", .34], ["2", .27], ["3", .2], ["4", .11], ["5", .08]],
    ad_format: "computed", ad_network: [["AppLovin", .41], ["AdMob", .27], ["Unity Ads", .12], ["Mintegral", .09], ["Meta AN", .07], ["Other", .04]],
    placement: [["continue_after_fail", .44], ["double_reward", .31], ["free_booster", .25]], product_id: [["remove_ads", .29], ["gems_small", .31], ["gems_large", .12], ["starter_pack", .18], ["vip_weekly", .1]],
    action: [["retry", .58], ["dismiss", .3], ["quit_app", .12]]
  };
  function events(F) {
    const S = summary(F);
    const g = F.game && F.game !== "all" ? D.GAMES.find(function (x) { return x.id === F.game; }) : null;
    const list = EVENT_DEF.filter(function (e) { if (!g) return true; if (e.nl) return !!g.nonlinear; if (e.linear) return !g.nonlinear; return true; });
    return list.map(function (e) {
      const t = S.cur.total, p = S.prev ? S.prev.total : null;
      const pop = e.name === "internet_popup_show" && g && g.id !== "tile-voyage" ? .3 : 1;
      const count = e.count(t) * pop, uu = e.uu(t) * pop;
      return { name: e.name, count: count, uu: uu / S.R.len, uuSum: uu, perUser: uu ? count / uu : null, prevCount: p ? e.count(p) * pop : null, trend: S.cur.byDay.map(function (d, i) { return { di: S.R.from + i, count: e.count(d) * pop, uu: e.uu(d) * pop }; }), params: e.params };
    });
  }
  function paramBreakdown(ev, param, F) {
    if (param === "ad_format") { const S = summary(F).cur.total; return [["interstitial", S.ii], ["rewarded", S.ir], ["banner", S.ib], ["app_open", S.ia]].filter(function (x) { return x[1] > 0; }).map(function (x) { return { value: x[0], count: x[1] }; }); }
    if (param === "country") { const S = summary(F).cur.byCountry; const tot = Object.values(S).reduce(function (a, s) { return a + s.nu; }, 0); return Object.keys(S).map(function (k) { return { value: k, count: ev.count * S[k].nu / (tot || 1) }; }).sort(function (a, b) { return b.count - a.count; }); }
    if (param === "platform") { const S = summary(F).cur.byPlatform; const tot = Object.values(S).reduce(function (a, s) { return a + s.ses; }, 0); return Object.keys(S).map(function (k) { return { value: k, count: ev.count * S[k].ses / (tot || 1) }; }); }
    const vals = PARAM_VALUES[param] || [];
    return vals.map(function (v) { return { value: v[0], count: ev.count * v[1] }; });
  }
  function funnel(F, steps) {
    const ev = events(F); const by = {}; ev.forEach(function (e) { by[e.name] = e; });
    const S = summary(F);
    let users = S.k.newUsers; const out = [];
    steps.forEach(function (name, i) {
      const e = by[name]; if (!e) { out.push({ label: name, value: 0 }); return; }
      if (i === 0) users = name === "first_open" ? S.k.newUsers : Math.min(S.k.newUsers, e.uu * Math.min(S.R.len, 7));
      else { const prev = by[steps[i - 1]]; const rate = prev ? Math.min(.97, (e.uuSum / (prev.uuSum || 1)) * .94) : .5; users = users * rate; }
      out.push({ label: name, value: users });
    });
    return out;
  }

  /* ---------- alerts ---------- */
  const DEFAULT_RULES = [
    { id: "r1", metric: "dau", label: "DAU", kind: "drop_pct", threshold: 15, severity: "critical", minSample: 5000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r2", metric: "d1", label: "D1 retention", kind: "drop_pp", threshold: 5, severity: "critical", minSample: 1000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r3", metric: "rev", label: "Revenue", kind: "drop_pct", threshold: 20, severity: "critical", minSample: 0, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r4", metric: "ecpm", label: "eCPM", kind: "drop_pct", threshold: 15, severity: "warning", minSample: 100000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r5", metric: "crash", label: "Crash rate", kind: "rise_pct", threshold: 50, severity: "critical", minSample: 10000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r6", metric: "winrate", label: "Level win rate", kind: "drop_pp", threshold: 10, severity: "warning", minSample: 500, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r7", metric: "spd", label: "Sessions / DAU", kind: "drop_pct", threshold: 5, severity: "info", minSample: 5000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true },
    { id: "r8", metric: "cpi", label: "CPI", kind: "rise_pct", threshold: 12, severity: "warning", minSample: 500, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true }
  ];
  function metricWindow(F, metric, from, to) {
    const Fw = Object.assign({}, F, { from: from, to: to, compare: "none" });
    if (metric === "d1") { const r = retention(Object.assign({}, Fw, { from: from - 1, to: to - 1 })); return { v: r.classic[1], n: r.cohorts.reduce(function (a, c) { return a + c.size; }, 0) }; }
    if (metric === "crash") { const t = tech(Fw); return { v: t.total.crashFreeSessions != null ? 1 - t.total.crashFreeSessions : null, n: summary(Fw).k.sessions }; }
    const k = summary(Fw).k;
    const n = metric === "ecpm" ? k.imps : metric === "cpi" ? k.paidI : k.dauSum;
    return { v: k[metric], n: n };
  }
  function runAlerts(rules) {
    const out = []; const E = D.N - 1;
    (rules || DEFAULT_RULES).forEach(function (rule) {
      if (!rule.enabled) return;
      D.GAMES.forEach(function (g) {
        if (rule.game !== "all" && rule.game !== g.id) return;
        const F = { game: g.id, platform: rule.platform, countries: rule.country === "all" ? [] : [rule.country] };
        const shift = rule.compare === "prev28" ? 28 : 7;
        if (rule.metric === "winrate") {
          if (g.nonlinear || !g.levels) return;
          const a = levels(Object.assign({}, F, { from: E - 6, to: E })), b = levels(Object.assign({}, F, { from: E - 6 - shift, to: E - shift }));
          a.levels.forEach(function (lv, i) { const p = b.levels[i]; const ch = lv.winRate - p.winRate; if (lv.reach >= rule.minSample && -ch * 100 >= rule.threshold) out.push(mk(rule, g, "Level " + lv.level + " win rate", lv.winRate, p.winRate, ch, true, "levels", "Level " + lv.level)); });
          return;
        }
        const cur = metricWindow(F, rule.metric, E - 6, E), prev = metricWindow(F, rule.metric, E - 6 - shift, E - shift);
        if (cur.v == null || prev.v == null || cur.n < rule.minSample) return;
        const pp = rule.kind === "drop_pp";
        const ch = pp ? cur.v - prev.v : (cur.v - prev.v) / prev.v;
        const hit = rule.kind === "drop_pct" ? -ch * 100 >= rule.threshold : rule.kind === "rise_pct" ? ch * 100 >= rule.threshold : -ch * 100 >= rule.threshold;
        if (hit) {
          const route = { dau: "overview", d1: "retention", rev: "monetization", ecpm: "monetization", crash: "tech", spd: "engagement", cpi: "ua" }[rule.metric];
          let seg = (rule.platform === "all" ? "All platforms" : rule.platform) + " · " + (rule.country === "all" ? "All countries" : rule.country);
          if (rule.country === "all") {
            let worst = null;
            D.COUNTRIES.forEach(function (c) { const Fc = Object.assign({}, F, { countries: [c.code] }); const a = metricWindow(Fc, rule.metric, E - 6, E), b = metricWindow(Fc, rule.metric, E - 6 - shift, E - shift); if (a.v == null || b.v == null) return; const x = pp ? a.v - b.v : (a.v - b.v) / b.v; const bad = rule.kind === "rise_pct" ? x : -x; if (!worst || bad > worst.bad) worst = { c: c.code, x: x, bad: bad }; });
            if (worst) seg += " · largest move " + worst.c + " (" + (pp ? (worst.x * 100).toFixed(1) + " pp" : (worst.x * 100).toFixed(1) + "%") + ")";
          }
          out.push(mk(rule, g, rule.label, cur.v, prev.v, ch, pp, route, seg));
        }
      });
    });
    const ord = { critical: 0, warning: 1, info: 2 };
    return out.sort(function (a, b) { return ord[a.severity] - ord[b.severity] || Math.abs(b.change) - Math.abs(a.change); });
  }
  function mk(rule, g, label, cur, prev, ch, pp, route, seg) { return { id: rule.id + "-" + g.id + "-" + label, rule: rule.id, severity: rule.severity, gameId: g.id, game: g.name, metric: rule.metric, label: label, current: cur, previous: prev, change: ch, pp: pp, detected: D.UPDATED_AT, segment: seg, route: route, compare: rule.compare === "prev28" ? "vs 28 days earlier" : "last 7d vs prior 7d" }; }

  /* ---------- A/B statistics ---------- */
  const EXP_META = { "exp-101": { primary: "d1", guard: ["adRevUser", "crash"] }, "exp-102": { primary: "adRevUser", guard: ["d1", "spu", "crash"] }, "exp-103": { primary: "levelComp", guard: ["d1", "crash"] }, "exp-104": { primary: "arpdau", guard: ["d1", "crash"] }, "exp-105": { primary: "levelComp", guard: ["d1", "crash"] } };
  const KPI_INFO = { d1: { label: "D1 retention", prop: true, good: "up" }, d7: { label: "D7 retention", prop: true, good: "up" }, spu: { label: "Sessions / user", cv: .9, good: "up" }, playtime: { label: "Avg playtime / user", cv: 1.2, good: "up", unit: "sec" }, adRevUser: { label: "Ad revenue / user", cv: 2.4, good: "up", money: true }, arpdau: { label: "ARPDAU", cv: 3.2, good: "up", money: true }, levelComp: { label: "Level completion", prop: true, good: "up" }, crash: { label: "Crash rate", prop: true, good: "down" } };
  function phi(x) { const t = 1 / (1 + .2316419 * Math.abs(x)); const d = .3989423 * Math.exp(-x * x / 2); const p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
  function experiment(e) {
    const nA = e.assigned[0], nB = e.assigned[1], tot = nA + nB;
    const expA = tot * e.alloc[0] / 100, expB = tot * e.alloc[1] / 100;
    const chi = Math.pow(nA - expA, 2) / expA + Math.pow(nB - expB, 2) / expB;
    const srmP = 2 * (1 - phi(Math.sqrt(chi)));
    const meta = EXP_META[e.id];
    const rows = Object.keys(e.kpi).map(function (k) {
      const info = KPI_INFO[k], a = e.kpi[k][0], b = e.kpi[k][1];
      if (a == null || b == null) return { key: k, label: info.label, a: null, b: null, mature: false, info: info };
      let se;
      const ma = k === "d7" ? Math.max(0, Math.min(1, (e.start - 7) / e.start)) : 1;
      if (info.prop) se = Math.sqrt(a * (1 - a) / (nA * ma) + b * (1 - b) / (nB * ma)); else se = Math.sqrt(Math.pow(info.cv * a, 2) / nA + Math.pow(info.cv * b, 2) / nB);
      const diff = b - a, z = se ? diff / se : 0, p = 2 * (1 - phi(Math.abs(z)));
      return { key: k, label: info.label, a: a, b: b, diff: diff, rel: a ? diff / a : null, lo: diff - 1.96 * se, hi: diff + 1.96 * se, relLo: a ? (diff - 1.96 * se) / a : null, relHi: a ? (diff + 1.96 * se) / a : null, p: p, sig: p < .05, mature: true, info: info, primary: k === meta.primary, guard: meta.guard.indexOf(k) >= 0 };
    });
    const prim = rows.find(function (r) { return r.primary; });
    const guardBad = rows.filter(function (r) { return r.guard && r.mature && r.sig && ((r.info.good === "up" && r.diff < 0) || (r.info.good === "down" && r.diff > 0)); });
    let verdict, tone;
    if (srmP < .001) { verdict = "Sample ratio mismatch (p < 0.001). Assignment is broken — results should not be interpreted until the cause is found."; tone = "negative"; }
    else if (!prim || !prim.mature) { verdict = "Primary metric not mature yet. Keep collecting before reading results."; tone = "info"; }
    else if (!prim.sig) { verdict = "No statistically significant difference on " + prim.label + " yet (95% CI crosses 0)." + (e.status === "running" ? " Don't stop early." : ""); tone = "neutral"; }
    else if (guardBad.length) { verdict = prim.label + " moved significantly, but guardrail " + guardBad.map(function (g) { return g.label; }).join(", ") + " regressed. Needs a product decision, not an automatic rollout."; tone = "warning"; }
    else if (e.status === "running") { verdict = "Primary metric is significant at interim, but the test is still running — wait for the planned end date before deciding."; tone = "info"; }
    else { verdict = "Meets pre-registered criteria: " + prim.label + " significant at 95%, no guardrail regressions, sample ratio OK."; tone = "positive"; }
    return { e: e, rows: rows, srmP: srmP, srm: srmP < .001, verdict: verdict, tone: tone, primary: prim };
  }

  /* ---------- formatting & currency ---------- */
  const FX = { USD: { r: 1, s: "$", d: 2 }, EUR: { r: .92, s: "€", d: 2 }, VND: { r: 25400, s: "₫", d: 0, after: true }, JPY: { r: 151, s: "¥", d: 0 } };
  const cfg = { currency: "USD", tz: "UTC" };
  function compact(v, d) { const a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(d == null ? 2 : d) + "B"; if (a >= 1e6) return (v / 1e6).toFixed(d == null ? 2 : d) + "M"; if (a >= 1e4) return (v / 1e3).toFixed(d == null ? 1 : d) + "K"; return null; }
  const fmt = {
    int: function (v) { if (v == null || !isFinite(v)) return "—"; return compact(v) || Math.round(v).toLocaleString("en-US"); },
    full: function (v) { if (v == null || !isFinite(v)) return "—"; return Math.round(v).toLocaleString("en-US"); },
    num: function (v, d) { if (v == null || !isFinite(v)) return "—"; return v.toFixed(d == null ? 2 : d); },
    pct: function (v, d) { if (v == null || !isFinite(v)) return "—"; return (v * 100).toFixed(d == null ? 1 : d) + "%"; },
    money: function (v, precise) {
      if (v == null || !isFinite(v)) return "—"; const c = FX[cfg.currency]; const x = v * c.r;
      let s; const cp = compact(x);
      if (cp && !precise) s = cp; else if (Math.abs(x) < 1 && c.d > 0) s = x.toFixed(3); else if (Math.abs(x) < 10 && c.d > 0) s = x.toFixed(2); else s = Math.round(x).toLocaleString("en-US");
      return c.after ? s + " " + c.s : (x < 0 ? "-" + c.s + s.replace("-", "") : c.s + s);
    },
    dur: function (sec) { if (sec == null || !isFinite(sec)) return "—"; sec = Math.round(sec); if (sec < 60) return sec + "s"; const m = Math.floor(sec / 60), s = sec % 60; if (m < 60) return m + "m " + (s < 10 ? "0" : "") + s + "s"; return Math.floor(m / 60) + "h " + (m % 60) + "m"; },
    day: function (di, long) { const t = D.dates[di]; if (t == null) return ""; const d = new Date(t); const m = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }); return m + " " + d.getUTCDate() + (long ? ", " + d.getUTCFullYear() : ""); },
    ts: function (t) { return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: cfg.tz }) + " " + (cfg.tz === "UTC" ? "UTC" : cfg.tz.split("/").pop().replace("_", " ")); }
  };

  window.GP = { D: D, SF: SF, RN: RN, agg: agg, derive: derive, summary: summary, delta: delta, ranges: ranges, retention: retention, retentionBy: retentionBy, retentionByFirstLevel: retentionByFirstLevel,
    levels: levels, levelTimeDist: levelTimeDist, nonlinear: nonlinear, campaigns: campaigns, uaSummary: uaSummary, tech: tech, events: events, paramBreakdown: paramBreakdown, funnel: funnel,
    DEFAULT_RULES: DEFAULT_RULES, runAlerts: runAlerts, experiment: experiment, KPI_INFO: KPI_INFO, FX: FX, cfg: cfg, fmt: fmt, gameIdx: gameIdx, versionShares: versionShares };
})();
