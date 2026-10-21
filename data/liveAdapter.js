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
    let name = c; if (c === "ZZ") name = "Unknown"; else if (names) { try { name = names.of(c) || c; } catch (e) {} }
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

  const F = {}; L.fields.forEach(function (f, i) { F[f] = 4 + i; });
  const ROWS = GAMES.map(function () { return []; });
  L.rows.forEach(function (r) {
    if (r[1] >= N) return;
    const k = r[0] + "|" + r[1], s = stick[k], share = dauByGD[k] ? r[4] / dauByGD[k] : 0;
    const v = function (f) { return F[f] != null ? r[F[f]] || 0 : 0; };
    const row = { di: r[1], gi: r[0], pi: r[2], ci: r[3],
      dau: v("active_users"), nu: v("newusers"), ses: v("sessions"), pt: v("user_engagement_duration"), eng: v("engaged_sessions"), ev: v("event_count"),
      /* GA4 reports total ad impressions/revenue without a format split: booked under interstitial */
      ii: v("publisher_ad_impressions"), ir: 0, ib: 0, ia: 0, ri: v("total_ad_revenue"), rr: 0, rb: 0, ra: 0,
      req: 0, loaded: 0, rewOffers: 0, rewStarts: 0,
      payers: v("total_purchasers"), iapG: v("purchase_revenue"), iapRef: 0, purch: v("transactions"), firstPurch: v("first_time_purchasers"), subRev: 0,
      orgI: 0, paidI: 0, spend: 0,
      wau: s ? s[2] * share : 0, mau: s ? s[3] * share : 0, crashUsers: s ? s[4] * share : 0, d1r: 0 };
    const c = RET[r[0] + "|" + r[1] + "|" + r[2]], size = c && c[0];
    const rate = function (n) { return size && c[n] ? Math.min(1, c[n] / size) : 0; };
    for (let n = 1; n <= 14; n++) row["r" + n] = row.nu * rate(n);
    row.r30 = row.nu * rate(30);
    row.d1r = rate(1);
    row.noRet = !size; /* no cohort for this day/platform: leave it out instead of counting 0% */
    ROWS[r[0]].push(row);
  });

  Object.assign(D, {
    END: dates[N - 1], N: N, dates: dates, COUNTRIES: COUNTRIES, GAMES: GAMES, ROWS: ROWS,
    CAMPAIGNS: GAMES.map(function () { return []; }), EXPERIMENTS: [], UPDATED_AT: L.updatedAt,
    LIVE: { source: L.source, updatedAt: L.updatedAt, retention: hasRet }
  });
})();
