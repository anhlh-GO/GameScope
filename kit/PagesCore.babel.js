window.__dsReady.then(function (DS) {
const { Card, KpiCard, DataTable, Sparkline, LineChart, BarChart, ShareBar, Button, Input, SegmentedControl, GameAvatar, Badge, Delta, Icon, Tooltip, IconButton } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, keyOf, useLoading, PageHeader, Grid, Cols, Section, ChartCard, kpi, xday, csv, compareLabel, gameById } = window;

function withPrev(S, keys) {
  return S.series.map(function (d, i) { const o = Object.assign({}, d); if (S.pseries && S.pseries[i]) keys.forEach(function (k) { o[k + "Prev"] = S.pseries[i][k]; }); return o; });
}

/* ================= PORTFOLIO ================= */
function PortfolioPage() {
  const app = useApp();
  const F = effective(app.F, "portfolio"); const key = keyOf(F); const loading = useLoading(key);
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState("all");
  const [pins, setPins] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.pins") || "[]"); } catch (e) { return []; } });
  const S = React.useMemo(function () { return GP.summary(F); }, [key]);
  const UA = React.useMemo(function () { return GP.uaSummary(F); }, [key]);
  const games = React.useMemo(function () {
    return D.GAMES.map(function (g) {
      const Fg = Object.assign({}, F, { game: g.id }); const s = GP.summary(Fg); const r = GP.retention(Fg); const u = GP.uaSummary(Fg);
      return { id: g.id, g: g, name: g.name, platform: F.platform === "all" ? "Android · iOS" : F.platform === "ios" ? "iOS" : "Android", dau: s.k.dau, nu: s.k.newUsers, d1: r.classic[1], d7: r.classic[7], spd: s.k.spd, rev: s.k.rev, iaa: s.k.iaa, iap: s.k.iap, arpdau: s.k.arpdau, spend: u.spend, roas: u.roas[7],
        dDau: s.pk ? GP.delta(s.k.dau, s.pk.dau) : null, dRev: s.pk ? GP.delta(s.k.rev, s.pk.rev) : null, dD1: r.prev ? GP.delta(r.classic[1], r.prev[1], true) : null, spark: s.series.map(function (d) { return d.rev; }), dauSeries: s.series.map(function (d) { return d.dau; }) };
    });
  }, [key]);
  function togglePin(id) { const n = pins.indexOf(id) >= 0 ? pins.filter(function (x) { return x !== id; }) : pins.concat([id]); setPins(n); localStorage.setItem("gp.pins", JSON.stringify(n)); }
  const rows = games.filter(function (r) { return (!q || r.name.toLowerCase().indexOf(q.toLowerCase()) >= 0) && (view === "all" || pins.indexOf(r.id) >= 0); });
  const flag = function (v, th) { return v != null && Math.abs(v) >= th; };
  const cols = [
    { key: "pin", header: "", align: "center", sortable: false, width: 32, render: function (r) { const on = pins.indexOf(r.id) >= 0; return <button aria-label={on ? "Unpin" : "Pin"} onClick={function (e) { e.stopPropagation(); togglePin(r.id); }} style={{ background: "none", border: 0, cursor: "pointer", color: on ? "var(--warning)" : "var(--text-disabled)", display: "inline-flex", padding: 2 }}><Icon name="star" size={14} style={{ fill: on ? "currentColor" : "none" }} /></button>; } },
    { key: "name", header: "Game", align: "left", render: function (r) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><GameAvatar name={r.name} color={r.g.color} size={26} /><span><span style={{ display: "block", fontWeight: 500 }}>{r.name}</span><span style={{ display: "block", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{r.g.genre}</span></span></span>; } },
    { key: "platform", header: "Platform", align: "left" },
    { key: "dau", header: "DAU", render: function (r) { return <Cell v={fmt.int(r.dau)} d={r.dDau} hot={flag(r.dDau, .1)} />; }, sortValue: function (r) { return r.dau; } },
    { key: "nu", header: "New users", format: fmt.int },
    { key: "d1", header: "D1", render: function (r) { return <Cell v={fmt.pct(r.d1)} d={r.dD1} pp hot={flag(r.dD1, .03)} />; }, sortValue: function (r) { return r.d1; } },
    { key: "d7", header: "D7", format: function (v) { return fmt.pct(v); } },
    { key: "spd", header: "Sessions/user", format: function (v) { return fmt.num(v); } },
    { key: "rev", header: "Revenue", render: function (r) { return <Cell v={fmt.money(r.rev)} d={r.dRev} hot={flag(r.dRev, .15)} />; }, sortValue: function (r) { return r.rev; } },
    { key: "arpdau", header: "ARPDAU", format: function (v) { return fmt.money(v); } },
    { key: "spend", header: "Spend", format: function (v) { return fmt.money(v); } },
    { key: "roas", header: "D7 ROAS", format: function (v) { return v == null ? <Badge size="sm" tone="warning">Incomplete</Badge> : fmt.pct(v, 0); } },
    { key: "trend", header: "Revenue trend", sortable: false, render: function (r) { return <span style={{ display: "inline-flex" }}><Sparkline data={r.spark} color={r.g.color} width={90} height={22} /></span>; } }
  ];
  const growth = S.pk ? GP.delta(S.k.rev, S.pk.rev) : null;
  const ranked = games.slice().filter(function (g) { return g.dRev != null; }).sort(function (a, b) { return b.dRev - a.dRev; });
  const dauData = S.series.map(function (d, i) { const o = { di: d.di }; games.forEach(function (g) { o[g.id] = g.dauSeries[i]; }); return o; });
  const C = compareLabel(F);
  return (
    <div>
      <PageHeader title="Portfolio Overview" desc={window.ROUTES[0].desc}
        actions={<Button iconLeft="download" onClick={function () { csv("gamepulse-portfolio", cols.filter(function (c) { return c.key !== "pin" && c.key !== "trend"; }).map(function (c) { return { header: c.header, value: function (r) { return c.key === "name" ? r.name : r[c.key]; } }; }), games); app.toast({ tone: "positive", title: "CSV exported", description: games.length + " games, current filters." }); }}>Export CSV</Button>} />
      <Grid min={200}>
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "dau", "Total DAU (Σ per game)", fmt.int, { color: "var(--metric-users)", info: "Sum of each game's average daily active users. There's no shared player ID across games, so this is not a unique-user count." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "newUsers", "New users", fmt.int, { color: "var(--metric-new)", sparkKey: "newUsers", info: "first_open events in the period, summed across games." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "rev", "Total revenue", fmt.money, { color: "var(--metric-total)", info: "IAA (network-reported) + IAP gross (before store fee and refunds)." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "iaa", "IAA revenue", fmt.money, { color: "var(--metric-iaa)" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "iap", "IAP revenue", fmt.money, { color: "var(--metric-iap)", info: "Gross store revenue." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "sessions", "Total sessions", fmt.int)} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "arpdau", "Avg. ARPDAU", function (v) { return fmt.money(v); }, { color: "var(--metric-total)", info: "Σ revenue ÷ Σ DAU-days across games. Recomputed from totals, never an average of per-game ARPDAU." })} />
        <KpiCard loading={loading} label="Revenue growth" value={growth == null ? "—" : (growth > 0 ? "+" : "") + (growth * 100).toFixed(1) + "%"} delta={null} compareLabel={C} info="Change in portfolio total revenue vs the comparison period." source={D.LIVE ? "GA4 · Windsor" : "Demo data"} />
        <KpiCard loading={loading} label="UA spend" value={fmt.money(UA.spend)} compareLabel="selected period" info="Paid media cost from attribution (AppsFlyer / Adjust)." source={D.LIVE ? "Not connected" : "Demo · attribution"} spark={S.series.map(function (d) { return d.spend; })} color="var(--chart-8)" />
        <KpiCard loading={loading} label="Portfolio D7 ROAS" value={UA.roas[7] == null ? "—" : fmt.pct(UA.roas[7], 0)} compareLabel={UA.maturity[7] < 1 ? Math.round(UA.maturity[7] * 100) + "% of spend mature" : "all cohorts mature"} info="Σ D7 cohort revenue ÷ Σ spend of the same install cohorts. Cohorts younger than 7 days are excluded." source={D.LIVE ? "Not connected" : "Demo · attribution"} note={UA.maturity[7] < 1 ? <Badge size="sm" tone="warning">Partial</Badge> : null} />
      </Grid>
      <Section title="Games">
        <Card padding={16}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <Input iconLeft="search" size="sm" placeholder="Search games" value={q} onChange={setQ} width={240} />
            <SegmentedControl value={view} onChange={setView} options={[{ value: "all", label: "All games" }, { value: "pinned", label: "Pinned (" + pins.length + ")", icon: "star" }]} />
            <span style={{ flex: 1 }}></span>
            <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warning-soft)", boxShadow: "inset 0 0 0 1px var(--warning)" }}></span>Unusual change (DAU ±10%, D1 ±3 pp, revenue ±15%)</span>
          </div>
          <DataTable columns={cols} rows={rows} rowKey="id" initialSort={{ key: "rev", dir: "desc" }} onRowClick={function (r) { app.nav("overview", { game: r.id }); }}
            emptyText={view === "pinned" ? "No pinned games. Use ★ to pin." : "No games match “" + q + "”."} footerNote="Click a row to open the game dashboard." />
        </Card>
      </Section>
      <Section title="Trends">
        <Cols min={460}>
          <ChartCard loading={loading} title="Portfolio revenue" subtitle="Daily, IAA + IAP gross" info="Dashed line is the comparison period, aligned by day offset.">
            <LineChart data={withPrev(S, ["rev"])} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.money(v); }}
              series={[{ key: "rev", label: "Total", color: "var(--metric-total)", area: true }, { key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }].concat(S.pseries ? [{ key: "revPrev", label: "Total · compare", color: "var(--chart-compare)", dashed: true }] : [])} />
          </ChartCard>
          <ChartCard loading={loading} title="DAU by game" subtitle="Daily active users">
            <LineChart data={dauData} xKey="di" xFormat={xday} yFormat={fmt.int} series={D.GAMES.map(function (g) { return { key: g.id, label: g.name, color: g.color }; })} />
          </ChartCard>
          <ChartCard loading={loading} title="Revenue by game" subtitle="Click a bar to open the game">
            <BarChart horizontal stacked data={games.slice().sort(function (a, b) { return b.rev - a.rev; })} xKey="name" yFormat={function (v) { return fmt.money(v); }} onBarClick={function (r) { app.nav("overview", { game: r.id }); }}
              series={[{ key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Revenue breakdown" subtitle="Share of total revenue">
            <ShareBar height={12} format={function (v) { return fmt.money(v); }} segments={[{ label: "IAA", value: S.k.iaa, color: "var(--metric-iaa)" }, { label: "IAP", value: S.k.iap, color: "var(--metric-iap)" }]} />
            <div style={{ height: 20 }}></div>
            <div style={{ font: "var(--type-label)", color: "var(--text-secondary)", marginBottom: 10 }}>IAA by ad format</div>
            <ShareBar height={8} format={function (v) { return fmt.money(v); }} segments={[{ label: "Interstitial", value: S.k.ri, color: "var(--chart-2)" }, { label: "Rewarded", value: S.k.rr, color: "var(--chart-6)" }, { label: "Banner", value: S.k.rb, color: "var(--chart-7)" }, { label: "App open", value: S.k.ra, color: "var(--chart-4)" }]} />
          </ChartCard>
          <MoversCard title="Top growing games" list={ranked.filter(function (g) { return g.dRev > 0; })} empty="No game grew revenue in this period." app={app} loading={loading} />
          <MoversCard title="Top declining games" list={ranked.filter(function (g) { return g.dRev < 0; }).reverse()} empty="No game declined in this period." app={app} loading={loading} />
        </Cols>
      </Section>
    </div>
  );
}
function Cell({ v, d, pp, hot }) {
  return <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 3, padding: hot ? "2px 6px" : 0, margin: hot ? "-2px -6px" : 0, borderRadius: 6, background: hot ? "var(--warning-soft)" : "transparent" }}>
    <span>{v}</span>{d != null ? <Delta value={d} format={pp ? "pp" : "percent"} style={{ fontSize: 11 }} /> : null}</span>;
}
function MoversCard({ title, list, empty, app, loading }) {
  return (
    <ChartCard title={title} subtitle="Revenue change vs comparison period" loading={loading} height={160}>
      {list.length ? <div style={{ display: "flex", flexDirection: "column" }}>
        {list.slice(0, 5).map(function (g) {
          return <button key={g.id} onClick={function () { app.nav("overview", { game: g.id }); }} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "9px 0", border: 0, borderBottom: "1px solid var(--border-subtle)", background: "none", color: "inherit", cursor: "pointer", textAlign: "left", font: "inherit" }}>
            <GameAvatar name={g.name} color={g.g.color} size={22} /><span>{g.name}</span>
            <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>DAU <Delta value={g.dDau} /></span><Delta value={g.dRev} size="md" />
          </button>;
        })}
      </div> : <div style={{ color: "var(--text-tertiary)", padding: "20px 0" }}>{empty}</div>}
    </ChartCard>
  );
}

/* ================= GAME OVERVIEW ================= */
const UNITS = { users: fmt.int, count: fmt.int, ratio: function (v) { return fmt.num(v); }, time: fmt.dur, pct: function (v) { return fmt.pct(v); }, money: function (v) { return fmt.money(v); } };
const OV = [
  { key: "dau", label: "DAU", unit: "users", color: "var(--metric-users)", info: "Distinct active users per day (average over the period)." },
  { key: "wau", label: "WAU", unit: "users", color: "var(--chart-2)", noDelta: false, info: "Distinct users active in the 7 days ending on the last day of the range. Modeled in demo data." },
  { key: "mau", label: "MAU", unit: "users", color: "var(--chart-6)", info: "Distinct users active in the 30 days ending on the last day of the range. Modeled in demo data." },
  { key: "newUsers", label: "New users", unit: "users", color: "var(--metric-new)", info: "Users whose first_open falls in the period." },
  { key: "returning", label: "Returning users", unit: "users", color: "var(--chart-7)", info: "DAU − new users (daily average)." },
  { key: "sessions", label: "Sessions", unit: "count", color: "var(--chart-2)" },
  { key: "spd", label: "Sessions / DAU", unit: "ratio", color: "var(--chart-2)", info: "Σ sessions ÷ Σ DAU." },
  { key: "avgSess", label: "Avg. session length", unit: "time", color: "var(--chart-5)", info: "Σ engagement time ÷ Σ sessions." },
  { key: "engPerDau", label: "Engagement time / DAU", unit: "time", color: "var(--chart-5)", info: "Σ engagement time ÷ Σ DAU." },
  { key: "d1", label: "D1 retention", unit: "pct", color: "var(--accent)", pp: true, ret: 1, info: "Classic D1, cohort-weighted over install dates in range with a mature D1." },
  { key: "d7", label: "D7 retention", unit: "pct", color: "var(--accent)", pp: true, ret: 7, info: "Classic D7, mature cohorts only (installed ≥7 days before the data end)." },
  { key: "rev", label: "Total revenue", unit: "money", color: "var(--metric-total)", info: "IAA + IAP gross." },
  { key: "iaa", label: "IAA revenue", unit: "money", color: "var(--metric-iaa)" },
  { key: "iap", label: "IAP revenue", unit: "money", color: "var(--metric-iap)", info: "Gross, before store fee & refunds." },
  { key: "arpdau", label: "ARPDAU", unit: "money", color: "var(--metric-total)", info: "Σ revenue ÷ Σ DAU." }
];
function retentionSeries(Rt) { const m = {}; Rt.cohorts.forEach(function (c) { m[c.di] = { d1: c.base[1] ? c.n[1] / c.base[1] : null, d7: c.base[7] ? c.n[7] / c.base[7] : null }; }); return m; }

function OverviewPage() {
  const app = useApp();
  const F = effective(app.F, "overview"); const key = keyOf(F); const loading = useLoading(key);
  const [sel, setSel] = React.useState(["dau"]);
  const [note, setNote] = React.useState(null);
  const S = React.useMemo(function () { return GP.summary(F); }, [key]);
  const Rt = React.useMemo(function () { return GP.retention(F); }, [key]);
  const g = F.game !== "all" ? gameById(F.game) : null;
  const rs = retentionSeries(Rt);
  const prs = React.useMemo(function () { if (!S.pseries) return null; return retentionSeries(GP.retention(Object.assign({}, F, { from: S.R.cFrom, to: S.R.cTo, compare: "none" }))); }, [key]);
  const data = S.series.map(function (d, i) { const o = Object.assign({}, d, rs[d.di] || { d1: null, d7: null }); if (S.pseries) { const p = Object.assign({}, S.pseries[i], prs ? prs[S.pseries[i].di] : {}); OV.forEach(function (m) { o[m.key + "Prev"] = p[m.key]; }); } return o; });
  function val(m) { return m.ret ? Rt.classic[m.ret] : S.k[m.key]; }
  function pval(m) { return m.ret ? (Rt.prev ? Rt.prev[m.ret] : null) : (S.pk ? S.pk[m.key] : null); }
  function toggle(m) {
    const unit = OV.find(function (x) { return x.key === sel[0]; }).unit;
    if (m.unit !== unit) { setSel([m.key]); setNote("Switched to " + m.label + " — metrics with different units aren't plotted on the same axis."); return; }
    setNote(null);
    if (sel.indexOf(m.key) >= 0) { if (sel.length > 1) setSel(sel.filter(function (k) { return k !== m.key; })); }
    else setSel(sel.concat([m.key]).slice(-4));
  }
  const selM = sel.map(function (k) { return OV.find(function (m) { return m.key === k; }); });
  const unitF = UNITS[selM[0].unit];
  const series = selM.map(function (m) { return { key: m.key, label: m.label, color: m.color, area: selM.length === 1 }; }).concat(selM.length === 1 && S.pseries ? [{ key: selM[0].key + "Prev", label: selM[0].label + " · compare", color: "var(--chart-compare)", dashed: true }] : []);
  const byC = Object.keys(S.cur.byCountry).map(function (c) { const s = S.cur.byCountry[c]; return { c: (D.COUNTRIES.find(function (x) { return x.code === c; }) || {}).name || c, iaa: s.ri + s.rr + s.rb + s.ra, iap: s.iapG }; }).sort(function (a, b) { return b.iaa + b.iap - a.iaa - a.iap; });
  const plat = Object.keys(S.cur.byPlatform).map(function (p) { const k = GP.derive(S.cur.byPlatform[p], S.R.len); const r = GP.retention(Object.assign({}, F, { platform: p })); return { id: p, name: p === "ios" ? "iOS" : "Android", dau: k.dau, share: k.dauSum / S.k.dauSum, rev: k.rev, arpdau: k.arpdau, spd: k.spd, d1: r.classic[1], avgSess: k.avgSess }; });
  const C = compareLabel(F);
  return (
    <div>
      <PageHeader title={g ? g.name : "All games"} desc={g ? g.genre + " · " + window.ROUTES[1].desc : "Aggregated across all games. Select a game in the top bar for its own dashboard."}
        meta={g ? [<Badge key="v" tone="neutral" icon="tag">Latest {g.versions[g.versions.length - 1].v}</Badge>, <Badge key="p" tone="neutral" icon="smartphone">Android · iOS</Badge>] : null} />
      <Grid min={190}>
        {OV.map(function (m) {
          const v = val(m), p = pval(m);
          const mature = m.ret ? Rt.coverage[m.ret] : 1;
          return <KpiCard key={m.key} loading={loading} label={m.label} value={UNITS[m.unit](v)} delta={p == null ? null : GP.delta(v, p, m.pp)} deltaFormat={m.pp ? "pp" : "percent"} compareLabel={C}
            spark={data.map(function (d) { return d[m.key]; })} color={m.color} info={m.info} source={m.ret ? (D.LIVE ? "Not connected" : "Demo · cohorts") : (D.LIVE ? "GA4 · Windsor" : "Demo data")} updated={fmt.day(F.to)}
            active={sel.indexOf(m.key) >= 0} onClick={function () { toggle(m); }} note={m.ret && mature < 1 && mature > 0 ? <Tooltip content={Math.round(mature * 100) + "% of cohort users in range are old enough for D" + m.ret + "."}><Badge size="sm" tone="warning">{Math.round(mature * 100)}%</Badge></Tooltip> : null} />;
        })}
      </Grid>
      <div style={{ height: 12 }}></div>
      <ChartCard loading={loading} title={"Trend: " + selM.map(function (m) { return m.label; }).join(", ")} subtitle={note || "Click KPI cards to add metrics with the same unit (max 4). Drag across the chart to zoom."}>
        <LineChart data={data} xKey="di" xFormat={xday} yFormat={unitF} series={series} height={260} />
      </ChartCard>
      <Section title="Breakdown">
        <Cols min={440}>
          <ChartCard loading={loading} title="DAU & new users"><LineChart data={data} xKey="di" xFormat={xday} yFormat={fmt.int} series={[{ key: "dau", label: "DAU", color: "var(--metric-users)", area: true }, { key: "newUsers", label: "New users", color: "var(--metric-new)" }]} /></ChartCard>
          <ChartCard loading={loading} title="Sessions per user" info="Σ sessions ÷ Σ DAU per day."><LineChart data={data} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.num(v); }} yMin={0} series={[{ key: "spd", label: "Sessions / DAU", color: "var(--chart-2)" }].concat(S.pseries ? [{ key: "spdPrev", label: "Compare", color: "var(--chart-compare)", dashed: true }] : [])} /></ChartCard>
          <ChartCard loading={loading} title="Average playtime"><LineChart data={data} xKey="di" xFormat={xday} yFormat={fmt.dur} series={[{ key: "engPerDau", label: "Engagement / DAU", color: "var(--chart-5)", area: true }, { key: "avgSess", label: "Avg. session", color: "var(--chart-7)" }]} /></ChartCard>
          <ChartCard loading={loading} title="Retention by install date" info="Classic D1/D7 per daily cohort. Gaps = cohorts not old enough yet (never shown as 0%)."><LineChart data={data} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.pct(v, 0); }} series={[{ key: "d1", label: "D1", color: "var(--accent)" }, { key: "d7", label: "D7", color: "var(--chart-6)" }]} /></ChartCard>
          <ChartCard loading={loading} title="Revenue" subtitle="Daily IAA + IAP"><BarChart stacked data={data} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.money(v); }} series={[{ key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }]} /></ChartCard>
          <ChartCard loading={loading} title="ARPDAU"><LineChart data={data} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.money(v); }} series={[{ key: "arpdau", label: "ARPDAU", color: "var(--metric-total)" }].concat(S.pseries ? [{ key: "arpdauPrev", label: "Compare", color: "var(--chart-compare)", dashed: true }] : [])} /></ChartCard>
          <ChartCard loading={loading} title="Revenue by country"><BarChart horizontal stacked data={byC} xKey="c" yFormat={function (v) { return fmt.money(v); }} series={[{ key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }]} /></ChartCard>
          <ChartCard loading={loading} title="Platform comparison" height={140}>
            <DataTable dense rowKey="id" rows={plat} columns={[{ key: "name", header: "Platform", align: "left" }, { key: "dau", header: "DAU", format: fmt.int }, { key: "share", header: "Share", format: function (v) { return fmt.pct(v); } }, { key: "spd", header: "Sess/DAU", format: function (v) { return fmt.num(v); } }, { key: "avgSess", header: "Avg. session", format: fmt.dur }, { key: "d1", header: "D1", format: function (v) { return fmt.pct(v); } }, { key: "rev", header: "Revenue", format: function (v) { return fmt.money(v); } }, { key: "arpdau", header: "ARPDAU", format: function (v) { return fmt.money(v); } }]} />
          </ChartCard>
        </Cols>
      </Section>
    </div>
  );
}

window.Pages = Object.assign(window.Pages || {}, { portfolio: PortfolioPage, overview: OverviewPage });
window.withPrev = withPrev;
});
