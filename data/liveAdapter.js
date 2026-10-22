/* GamePulse — live data adapter. If data/live.js (window.GP_LIVE, written by scripts/fetch-windsor.mjs)
   is present, replaces the demo games/rows in GP_DATA with real GA4 rows, keeping the same row shape so
   metrics.js and every screen work unchanged. GA4 has no ad-format split, UA spend or cohort retention,
   so those fields stay 0 until another connector fills them. Without live.js the demo data is kept. */
(function () {
  const L = window.GP_LIVE, D = window.GP_DATA;
  if (!L || !D || !L.games || !L.games.length) return;
  /* end the range on the last day that has data (GA4 can lag several hours behind "today") */
  const lastDi = L.rows.reduce(function (m, r) { return r[1] > m ? r[1] : m; }, -1);
  if (lastDi < 0) return;
  const DAY = D.DAY, N = lastDi + 1, start = Date.parse(L.from + "T00:00:00Z");
  const dates = []; for (let i = 0; i < N; i++) dates.push(start + i * DAY);

  let names = null; try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
  const COUNTRIES = L.countries.map(function (c) {
    let name = c; if (c === "ZZ") name = "Unknown / other"; else if (names) { try { name = names.of(c) || c; } catch (e) {} }
    return { code: c, name: name };
  });

  const colors = ["var(--chart-1)", "var(--chart-6)", "var(--chart-7)", "var(--chart-5)", "var(--chart-3)", "var(--chart-8)", "var(--chart-2)", "var(--chart-4)"];
  const GAMES = L.games.map(function (g, i) {
    const short = g.name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase() || "G";
    const o = { id: g.id, name: g.name, short: short, genre: g.genre, color: colors[i % colors.length], accountId: g.accountId, live: true,
      scenario: "live", nonlinear: false, levels: 0, versions: [{ v: "All versions", age: N }],
      d1: 0, d7: 0, kk: .5, ipd: { inter: 0, rew: 0, banner: 0, appopen: 0 }, ecpm: { inter: 0, rew: 0, banner: 0, appopen: 0 } };
    o.S = [0]; for (let n = 1; n <= 30; n++) o.S[n] = o.S[n - 1] + Math.pow(n, -o.kk);
    return o;
  });

  /* WAU / MAU / crash users are per game-day in GA4: spread over that day's rows by DAU share */
  const stick = {}; (L.stick || []).forEach(function (s) { stick[s[0] + "|" + s[1]] = s; });
  const dauByGD = {};
  L.rows.forEach(function (r) { const k = r[0] + "|" + r[1]; dauByGD[k] = (dauByGD[k] || 0) + r[4]; });

  /* retention: per game × cohort day × platform → { n: users active on day n }. GA4 cohorts come without a
     country split, so each country row gets its platform's rate (country filters show the platform average). */
  const RET = {};
  (L.ret || []).forEach(function (t) { const k = t[0] + "|" + t[1] + "|" + t[2]; (RET[k] = RET[k] || {})[t[3]] = t[4]; });
  const hasRet = Object.keys(RET).length > 0;

  const F = {}; L.fields.forEach(function (f, i) { F[f] = i; });
  /* one GA4 row → the metric-engine row shape. m = metric values (L.fields order); ret = { n: users } or undefined */
  function makeRow(gi, d, pi, ci, m, stickShare, ret) {
    const s = stick[gi + "|" + d];
    const v = function (f) { return F[f] != null ? m[F[f]] || 0 : 0; };
    const row = { di: d, gi: gi, pi: pi, ci: ci,
      dau: v("active_users"), nu: v("newusers"), ses: v("sessions"), pt: v("user_engagement_duration"), eng: v("engaged_sessions"), ev: v("event_count"),
      /* GA4 reports total ad impressions/revenue without a format split: booked under interstitial */
      ii: v("publisher_ad_impressions"), ir: 0, ib: 0, ia: 0, ri: v("total_ad_revenue"), rr: 0, rb: 0, ra: 0,
      req: 0, loaded: 0, rewOffers: 0, rewStarts: 0,
      payers: v("total_purchasers"), iapG: v("purchase_revenue"), iapRef: 0, purch: v("transactions"), firstPurch: v("first_time_purchasers"), subRev: 0,
      orgI: 0, paidI: 0, spend: 0,
      wau: s ? s[2] * stickShare : 0, mau: s ? s[3] * stickShare : 0, crashUsers: s ? s[4] * stickShare : 0, d1r: 0 };
    const size = ret && ret[0];
    const rate = function (n) { return size && ret[n] ? Math.min(1, ret[n] / size) : 0; };
    for (let n = 1; n <= 14; n++) row["r" + n] = row.nu * rate(n);
    row.r30 = row.nu * rate(30);
    row.d1r = rate(1);
    row.noRet = !size; /* no cohort for this day/platform: leave it out instead of counting 0% */
    return row;
  }
  const ROWS = GAMES.map(function () { return []; });
  L.rows.forEach(function (r) {
    if (r[1] >= N) return;
    const k = r[0] + "|" + r[1];
    ROWS[r[0]].push(makeRow(r[0], r[1], r[2], r[3], r.slice(4), dauByGD[k] ? r[4] / dauByGD[k] : 0, RET[r[0] + "|" + r[1] + "|" + r[2]]));
  });

  /* filter slices (version / source+campaign / new-vs-returning): same rows split by one GA4 dimension, no country.
     r.k holds the dimension value indexes. WAU/MAU are spread by DAU share, like the country rows. */
  const SLICES = {};
  Object.keys(L.slices || {}).forEach(function (name) {
    const S = L.slices[name], nd = S.dims.length, off = 3 + nd;
    const sret = {};
    (S.ret || []).forEach(function (t) { const k = t.slice(0, off).join("|"); (sret[k] = sret[k] || {})[t[off]] = t[off + 1]; });
    const rows = GAMES.map(function () { return []; });
    const usage = S.vals.map(function (v) { return v.map(function () { return 0; }); });
    S.rows.forEach(function (r) {
      if (r[1] >= N) return;
      const m = r.slice(off), gd = r[0] + "|" + r[1];
      const row = makeRow(r[0], r[1], r[2], -1, m, dauByGD[gd] ? m[F.active_users] / dauByGD[gd] : 0, sret[r.slice(0, off).join("|")]);
      row.k = r.slice(3, off);
      row.k.forEach(function (x, j) { usage[j][x] += row.dau; });
      rows[r[0]].push(row);
    });
    SLICES[name] = { dims: S.dims, vals: S.vals, usage: usage, ROWS: rows, retention: (S.ret || []).length > 0 };
  });

  /* levels: per game → rows { di, pi, n (level), t (type), c (event count), u (users that day) } */
  const LEVELS = GAMES.map(function () { return []; });
  const LT = (L.levels && L.levels.types) || [];
  ((L.levels && L.levels.rows) || []).forEach(function (r) {
    if (r[1] >= N || !LEVELS[r[0]]) return;
    LEVELS[r[0]].push({ di: r[1], pi: r[2], n: r[3], t: LT[r[4]], c: r[5], u: r[6] });
  });
  LEVELS.forEach(function (rows, gi) { let mx = 0; rows.forEach(function (x) { if (x.t === "start" && x.n > mx) mx = x.n; }); GAMES[gi].levels = mx; });

  Object.assign(D, {
    LEVELS: LEVELS,
    END: dates[N - 1], N: N, dates: dates, COUNTRIES: COUNTRIES, GAMES: GAMES, ROWS: ROWS,
    CAMPAIGNS: GAMES.map(function () { return []; }), EXPERIMENTS: [], UPDATED_AT: L.updatedAt,
    SLICES: SLICES, LIVE: { source: L.source, updatedAt: L.updatedAt, retention: hasRet }
  });
})();
