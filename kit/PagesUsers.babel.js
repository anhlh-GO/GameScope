window.__dsReady.then(function (DS) {
const { Card, KpiCard, DataTable, LineChart, BarChart, Heatmap, SegmentedControl, Badge, Callout, Tooltip, MiniBar } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, keyOf, useLoading, PageHeader, Grid, Cols, Section, ChartCard, kpi, xday, compareLabel } = window;
const P = function (v) { return fmt.pct(v); };
const hours = function (s) { return s == null ? "—" : fmt.int(s / 3600) + " h"; };

function lognormCdf(x, mu, s) { const z = (Math.log(x) - mu) / s; const t = 1 / (1 + .2316419 * Math.abs(z)); const d = .3989423 * Math.exp(-z * z / 2); const p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function sessionDist(k) {
  const mean = k.avgSess || 1, s = .9, mu = Math.log(mean) - s * s / 2;
  const edges = [0, 60, 180, 300, 600, 1200, Infinity], labels = ["< 1 min", "1–3 min", "3–5 min", "5–10 min", "10–20 min", "> 20 min"];
  return labels.map(function (l, i) { const a = edges[i] ? lognormCdf(edges[i], mu, s) : 0, b = edges[i + 1] === Infinity ? 1 : lognormCdf(edges[i + 1], mu, s); return { x: l, v: (b - a) * k.sessions, share: b - a }; });
}
function freqDist(k) {
  const lam = Math.max(.05, (k.spd || 1) - 1); const p = []; let f = 1;
  for (let i = 0; i < 12; i++) { if (i > 0) f *= i; p.push(Math.exp(-lam) * Math.pow(lam, i) / f); }
  const b = [p[0], p[1], p[2] + p[3] + p[4], 1 - p[0] - p[1] - p[2] - p[3] - p[4]];
  return ["1 session", "2 sessions", "3–5 sessions", "6+ sessions"].map(function (l, i) { return { x: l, v: b[i] * k.dauSum, share: b[i] }; });
}

/* ================= USERS & ENGAGEMENT ================= */
function EngagementPage() {
  const app = useApp();
  const F = effective(app.F, "engagement"); const key = keyOf(F); const loading = useLoading(key);
  const [dim, setDim] = React.useState("platform");
  const S = React.useMemo(function () { return GP.summary(F, { userType: F.userType }); }, [key]);
  const NR = React.useMemo(function () { return ["new", "returning"].map(function (t) { const s = GP.summary(F, { userType: t }); return Object.assign({ id: t, name: t === "new" ? "New users" : "Returning users" }, s.k); }); }, [key]);
  const C = compareLabel(F);
  const k = S.k;
  const seg = React.useMemo(function () {
    if (dim === "usertype") return NR;
    const src = dim === "platform" ? S.cur.byPlatform : S.cur.byCountry;
    return Object.keys(src).map(function (x) { const d = GP.derive(src[x], S.R.len); return Object.assign({ id: x, name: dim === "platform" ? (x === "ios" ? "iOS" : "Android") : (D.COUNTRIES.find(function (c) { return c.code === x; }) || {}).name }, d); }).sort(function (a, b) { return b.dau - a.dau; });
  }, [key, dim]);
  const byCountry = Object.keys(S.cur.byCountry).map(function (c) { const d = GP.derive(S.cur.byCountry[c], S.R.len); return { c: (D.COUNTRIES.find(function (x) { return x.code === c; }) || {}).name, v: d.engPerDau, spd: d.spd }; }).sort(function (a, b) { return b.v - a.v; });
  const utLabel = F.userType === "all" ? "" : F.userType === "new" ? " · new users" : " · returning users";
  return (
    <div>
      <PageHeader title={"Users & Engagement" + utLabel} desc={window.ROUTES[2].desc} meta={F.userType !== "all" ? [<Badge key="u" tone="info" icon="filter">User type: {F.userType}</Badge>] : null} />
      <Grid min={190}>
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "dau", "Active users (avg DAU)", fmt.int, { color: "var(--metric-users)" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "newUsers", "New users", fmt.int, { color: "var(--metric-new)" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "returning", "Returning users", fmt.int, { color: "var(--chart-7)", info: "Daily average of DAU − new users." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "sessions", "Total sessions", fmt.int, { color: "var(--chart-2)" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "spd", "Sessions / user", function (v) { return fmt.num(v); }, { color: "var(--chart-2)", info: "Σ sessions ÷ Σ DAU (user-days)." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "engTime", "Total engagement time", hours, { color: "var(--chart-5)", sparkKey: "engTime" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "engPerDau", "Engagement time / user", fmt.dur, { color: "var(--chart-5)", info: "Σ foreground time ÷ Σ DAU." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "avgSess", "Avg. session duration", fmt.dur, { color: "var(--chart-7)" })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "engaged", "Engaged sessions", fmt.int, { info: "Sessions ≥ 10 s in foreground or with a level_start." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "engRate", "Engagement rate", P, { pp: true, info: "Engaged sessions ÷ sessions." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "evPerUser", "Events / user", function (v) { return fmt.num(v, 1); }, { info: "All logged events ÷ Σ DAU." })} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "activeDays", "Active days / user", function (v) { return fmt.num(v, 1); }, { noSpark: true, info: "Σ DAU ÷ unique users in the range (WAU for ≤7 days, MAU beyond). Unique counts are modeled in demo data." })} />
      </Grid>
      <Section title="Distribution">
        <Cols min={440}>
          <ChartCard loading={loading} title="Session duration distribution" subtitle="Share of sessions by length" info="Bucketed from session-level durations (modeled as log-normal around the observed mean in demo data).">
            <BarChart data={sessionDist(k)} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "Sessions", color: "var(--chart-7)" }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Session frequency" subtitle="User-days by number of sessions that day">
            <BarChart data={freqDist(k)} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "User-days", color: "var(--chart-2)" }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Engagement trend" subtitle="Engagement time / DAU (left) · sessions / DAU (right)">
            <LineChart data={S.series} xKey="di" xFormat={xday} yFormat={fmt.dur} yFormatRight={function (v) { return fmt.num(v, 1); }} series={[{ key: "engPerDau", label: "Engagement / DAU", color: "var(--chart-5)", area: true }, { key: "spd", label: "Sessions / DAU", color: "var(--chart-2)", axis: "right" }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Playtime distribution" subtitle="Daily engagement time per active user">
            <BarChart data={sessionDist({ avgSess: k.engPerDau, sessions: k.dauSum })} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "User-days", color: "var(--chart-5)" }]} />
          </ChartCard>
          <ChartCard loading={loading} title="New vs returning" subtitle="Per-user engagement">
            <DataTable dense rowKey="id" rows={NR} columns={[{ key: "name", header: "Segment", align: "left" }, { key: "dau", header: "Avg DAU", format: fmt.int }, { key: "spd", header: "Sessions/user", format: function (v) { return fmt.num(v); } }, { key: "avgSess", header: "Avg. session", format: fmt.dur }, { key: "engPerDau", header: "Engagement/user", render: function (r) { return <MiniBar value={r.engPerDau} max={Math.max(NR[0].engPerDau, NR[1].engPerDau)} label={fmt.dur(r.engPerDau)} color="var(--chart-5)" />; } }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Engagement by country" subtitle="Engagement time / DAU">
            <BarChart horizontal data={byCountry} xKey="c" yFormat={fmt.dur} series={[{ key: "v", label: "Engagement / DAU", color: "var(--chart-5)" }]} />
          </ChartCard>
        </Cols>
      </Section>
      <Section title="Segmentation" aside={<SegmentedControl value={dim} onChange={setDim} options={[{ value: "platform", label: "Platform" }, { value: "country", label: "Country" }, { value: "usertype", label: "New vs returning" }, { value: "version", label: "App version", disabled: true, title: window.NA.version }, { value: "source", label: "Acq. source", disabled: true, title: "Engagement data isn't joined to attribution in this pipeline." }]} />}>
        <Card><DataTable rowKey="id" rows={seg} initialSort={{ key: "dau", dir: "desc" }} columns={[{ key: "name", header: "Segment", align: "left" }, { key: "dau", header: "Avg DAU", format: fmt.int }, { key: "sessions", header: "Sessions", format: fmt.int }, { key: "spd", header: "Sessions/user", format: function (v) { return fmt.num(v); } }, { key: "avgSess", header: "Avg. session", format: fmt.dur }, { key: "engPerDau", header: "Engagement/user", format: fmt.dur }, { key: "engRate", header: "Engagement rate", format: P }, { key: "evPerUser", header: "Events/user", format: function (v) { return fmt.num(v, 1); } }]} /></Card>
      </Section>
    </div>
  );
}

/* ================= RETENTION & COHORTS ================= */
const COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 30];
function RetentionPage() {
  const app = useApp();
  const F = effective(app.F, "retention"); const key = keyOf(F); const loading = useLoading(key);
  const [mode, setMode] = React.useState("classic");
  const [grain, setGrain] = React.useState("day");
  const [dim, setDim] = React.useState("country");
  const R = React.useMemo(function () { return GP.retention(F); }, [key]);
  const S = React.useMemo(function () { return GP.summary(F); }, [key]);
  const cur = R[mode];
  const prevMode = R.prev ? (mode === "classic" ? R.prev : mode === "rolling" ? rollingOf(R.prev) : unbOf(R.prev)) : null;
  function rollingOf(c) { const d1 = c[1]; const o = { 0: 1 }; GP.RN.forEach(function (n) { o[n] = c[n] == null ? null : Math.min(.97, d1 + (1 - d1) * .3 * (1 - Math.exp(-(n - 1) / 4))); }); return o; }
  function unbOf(c) { const o = { 0: 1 }; GP.RN.forEach(function (n) { o[n] = c[n] == null ? null : Math.min(.95, c[n] * (1.48 + .018 * Math.min(n, 14))); }); return o; }
  const tf = mode === "classic" ? function (c) { return c; } : mode === "rolling" ? rollingOf : unbOf;
  const cohorts = React.useMemo(function () {
    let list = R.cohorts;
    if (grain === "week") {
      const wk = {}; list.forEach(function (c) { const w = Math.floor((c.di - R.R.from) / 7); const o = wk[w] || (wk[w] = { di: c.di, size: 0, n: {}, base: {} }); o.size += c.size; GP.RN.forEach(function (n) { if (c.base[n]) { o.n[n] = (o.n[n] || 0) + c.n[n]; o.base[n] = (o.base[n] || 0) + c.base[n]; } }); });
      list = Object.values(wk);
    }
    return list.slice().reverse().map(function (c) {
      const raw = { 0: 1 }; GP.RN.forEach(function (n) { raw[n] = c.base[n] && c.base[n] >= c.size * .999 ? c.n[n] / c.base[n] : null; });
      const t = tf(raw);
      return { label: grain === "week" ? "Wk of " + fmt.day(c.di) : fmt.day(c.di), size: c.size, sizeLabel: fmt.int(c.size), values: COLS.map(function (n) { return t[n]; }) };
    });
  }, [key, grain, mode]);
  const curve = COLS.map(function (n) { return { x: n, cur: cur[n], prev: prevMode ? prevMode[n] : null }; });
  const byDim = React.useMemo(function () {
    if (dim === "campaign") {
      if (F.game === "all") return null;
      return GP.campaigns(F).map(function (c) { return { key: c.name, size: c.installs, r: { 1: c.d1, 7: c.d7 }, src: c.source }; }).sort(function (a, b) { return b.size - a.size; });
    }
    if (dim === "firstlevel") return GP.retentionByFirstLevel(F).map(function (b) { return { key: b.key, size: b.share * S.k.newUsers, r: b.r }; });
    return GP.retentionBy(F, dim);
  }, [key, dim]);
  const C = compareLabel(F);
  const card = function (n, label, extra) {
    const v = cur[n], p = prevMode ? prevMode[n] : null; const cov = R.coverage[n] || 0;
    return <KpiCard loading={loading} label={label} value={v == null ? "N/A" : P(v)} delta={v != null && p != null ? v - p : null} deltaFormat="pp" compareLabel={v == null ? "no mature cohorts" : C}
      info={(extra || "") + " Cohort-size weighted across install dates in range; only cohorts at least " + n + " day" + (n > 1 ? "s" : "") + " old are included."}
      note={v == null ? <Badge size="sm" tone="warning">Immature</Badge> : cov < .999 ? <Tooltip content={Math.round(cov * 100) + "% of users in range belong to cohorts mature for D" + n + "."}><Badge size="sm" tone="warning">{Math.round(cov * 100)}% mature</Badge></Tooltip> : null}
      spark={R.cohorts.map(function (c) { return c.base[n] ? tf({ 1: c.n[1] / c.base[1], [n]: c.n[n] / c.base[n] })[n] : null; })} color="var(--accent)" source={D.LIVE ? "Not connected" : "Demo · cohorts"} />;
  };
  const modeName = { classic: "Classic", rolling: "Rolling", unbounded: "Unbounded" }[mode];
  return (
    <div>
      <PageHeader title="Retention & Cohorts" desc={window.ROUTES[3].desc} actions={<SegmentedControl size="md" value={mode} onChange={setMode} options={[{ value: "classic", label: "Classic" }, { value: "rolling", label: "Rolling" }, { value: "unbounded", label: "Unbounded" }]} />} />
      <Callout tone="info" title={modeName + " retention"} style={{ marginBottom: 16 }}>
        {mode === "classic" ? "Dn = users from the install cohort active exactly on day n ÷ cohort size." : mode === "rolling" ? "Dn = users active at least once between day 1 and day n ÷ cohort size. Never decreases with n." : "Dn = users active on day n or any later day ÷ cohort size. Recent values can still rise as more days are observed."}
        {mode !== "classic" ? " Demo data derives rolling and unbounded values from classic counts." : ""}
      </Callout>
      <Grid min={180}>
        {card(1, "D1 retention")}{card(3, "D3 retention")}{card(7, "D7 retention")}{card(14, "D14 retention")}{card(30, "D30 retention")}
        <KpiCard loading={loading} label="Rolling D7" value={P(R.rolling[7])} delta={R.prev ? R.rolling[7] - rollingOf(R.prev)[7] : null} deltaFormat="pp" compareLabel={C} info="Users active at least once in days 1–7 ÷ cohort size." source={D.LIVE ? "Not connected" : "Demo · cohorts"} />
        <KpiCard loading={loading} compareLabel={C} {...kpi(S, "returning", "Returning users", fmt.int, { color: "var(--chart-7)", info: "Daily average of active users who installed before that day." })} />
        <KpiCard loading={loading} label="D7 churn rate" value={P(R.unbounded[7] == null ? null : 1 - R.unbounded[7])} delta={R.prev && R.unbounded[7] != null ? (1 - R.unbounded[7]) - (1 - unbOf(R.prev)[7]) : null} deltaFormat="pp" goodDirection="down" compareLabel={C} info="Share of the cohort never seen on day 7 or later (1 − unbounded D7)." source={D.LIVE ? "Not connected" : "Demo · cohorts"} />
      </Grid>
      <Section title="Cohorts" aside={<SegmentedControl value={grain} onChange={setGrain} options={[{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }]} />}>
        <ChartCard loading={loading} height={320} title={modeName + " retention by install " + (grain === "day" ? "date" : "week")} subtitle="D0–D14 daily, plus D30. Hatched N/A = cohort not old enough to observe that day."
          footer={"Rows are install cohorts in the selected range (" + fmt.day(R.R.from) + " – " + fmt.day(R.R.to) + "). Weekly rows only show a day once every cohort in the week has reached it."}>
          <div style={{ maxHeight: 440, overflow: "auto" }}><Heatmap columns={COLS.map(function (n) { return "D" + n; })} rows={cohorts} rowHeader={grain === "day" ? "Install date" : "Install week"} /></div>
        </ChartCard>
      </Section>
      <Section title="Curves & segments">
        <Cols min={440}>
          <ChartCard loading={loading} title="Cohort retention curve" subtitle={"Weighted " + modeName.toLowerCase() + " retention by day since install"}>
            <LineChart data={curve} xKey="x" xFormat={function (v) { return "D" + v; }} yFormat={function (v) { return fmt.pct(v, 0); }} zoomable={false} yMin={0}
              series={[{ key: "cur", label: "Selected period", color: "var(--accent)", area: true }].concat(prevMode ? [{ key: "prev", label: "Comparison", color: "var(--chart-compare)", dashed: true }] : [])} />
          </ChartCard>
          <ChartCard loading={loading} title="Retention by segment" actions={<SegmentedControl value={dim} onChange={setDim} options={[{ value: "country", label: "Country" }, { value: "platform", label: "Platform" }, { value: "game", label: "Game" }, { value: "campaign", label: "Campaign" }, { value: "version", label: "Version" }, { value: "firstlevel", label: "Day-0 level" }]} />}>
            {byDim == null ? <div style={{ color: "var(--text-tertiary)", padding: "24px 0" }}>Select a single game to compare campaigns.</div> :
              <BarChart data={byDim.slice(0, 10)} xKey="key" yFormat={function (v) { return fmt.pct(v, 0); }} series={[{ key: "d1", label: "D1", color: "var(--accent)" }, { key: "d7", label: "D7", color: "var(--chart-6)" }].map(function (s) { return s; })}
                xFormat={function (v) { return String(v).length > 12 ? String(v).slice(0, 11) + "…" : v; }} {...{ data: byDim.slice(0, 10).map(function (r) { return { key: r.key, d1: r.r[1], d7: r.r[7] }; }) }} />}
          </ChartCard>
        </Cols>
        {byDim ? <Card style={{ marginTop: 12 }}>
          <DataTable dense rowKey="key" rows={byDim} pageSize={10} columns={[{ key: "key", header: dim === "firstlevel" ? "Highest level reached on D0" : "Segment", align: "left" }, { key: "size", header: dim === "campaign" ? "Attributed installs" : "Cohort users", format: fmt.int }]
            .concat([1, 3, 7, 14, 30].map(function (n) { return { key: "d" + n, header: "D" + n, sortValue: function (r) { return r.r[n]; }, render: function (r) { return r.r[n] == null ? <span style={{ color: "var(--text-disabled)" }}>N/A</span> : P(r.r[n]); } }; }))}
            footerNote={dim === "campaign" ? "Campaign retention comes from attribution data (AppsFlyer / Adjust) and is not merged with Firebase cohorts." : dim === "firstlevel" ? "Modeled split in demo data: players who progress further on day 0 retain better — correlation, not causation." : "Each segment is weighted by its own cohort sizes."} />
        </Card> : null}
      </Section>
    </div>
  );
}

window.Pages = Object.assign(window.Pages || {}, { engagement: EngagementPage, retention: RetentionPage });
});
