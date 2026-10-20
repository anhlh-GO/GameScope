window.__dsReady.then(function (DS) {
const { Card, DataTable, Tabs, Badge, Callout, Dialog, Button, IconButton, Select, Input, Switch, Checkbox, SegmentedControl, EmptyState, Icon } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, keyOf, PageHeader, Grid, Cols, Section, csv, gameById } = window;

/* ================= REPORTS ================= */
const RK = [
  ["dau", "Avg DAU", fmt.int], ["newUsers", "New users", fmt.int], ["sessions", "Sessions", fmt.int], ["spd", "Sessions / DAU", function (v) { return fmt.num(v); }], ["avgSess", "Avg. session", fmt.dur], ["engPerDau", "Engagement / DAU", fmt.dur],
  ["rev", "Revenue", function (v) { return fmt.money(v); }], ["iaa", "IAA revenue", function (v) { return fmt.money(v); }], ["iap", "IAP revenue", function (v) { return fmt.money(v); }], ["arpdau", "ARPDAU", function (v) { return fmt.money(v, true); }],
  ["ecpm", "eCPM", function (v) { return fmt.money(v, true); }], ["ipdInter", "Imp/DAU inter", function (v) { return fmt.num(v); }], ["ipdRew", "Imp/DAU rewarded", function (v) { return fmt.num(v); }], ["ipdBanner", "Imp/DAU banner", function (v) { return fmt.num(v, 1); }],
  ["spend", "UA spend", function (v) { return fmt.money(v); }], ["cpi", "CPI", function (v) { return fmt.money(v, true); }], ["payerConv", "Payer conversion", function (v) { return fmt.pct(v, 2); }]
];
const TEMPLATES = { daily: { name: "Daily summary", kpis: ["dau", "newUsers", "rev", "arpdau", "spd"], by: "game", range: "y" }, weekly: { name: "Weekly summary", kpis: ["dau", "newUsers", "rev", "iaa", "iap", "arpdau", "spend", "cpi"], by: "game", range: "7" }, monthly: { name: "Monthly summary", kpis: ["dau", "rev", "iaa", "iap", "arpdau", "ecpm", "spend"], by: "country", range: "30" } };
function ReportsPage() {
  const app = useApp();
  const [tab, setTab] = React.useState("saved");
  const [rep, setRep] = React.useState({ name: "Untitled report", kpis: ["dau", "rev", "arpdau", "ipdInter", "ipdRew", "ipdBanner"], by: "game" });
  const [saved, setSaved] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.reports") || "[]"); } catch (e) { return []; } });
  const [sched, setSched] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.sched") || "[]"); } catch (e) { return []; } });
  const [sOpen, setSOpen] = React.useState(false);
  const [sForm, setSForm] = React.useState({ report: "daily", freq: "daily", time: "08:00", to: "" });
  const F = effective(app.F, "reports"); const key = keyOf(F);
  const S = React.useMemo(function () { return GP.summary(F); }, [key]);
  const rows = React.useMemo(function () {
    let src;
    if (rep.by === "game") src = S.cur.byGame; else if (rep.by === "country") src = S.cur.byCountry; else if (rep.by === "platform") src = S.cur.byPlatform;
    if (rep.by === "day") return S.series.map(function (d) { return Object.assign({ id: d.di, seg: fmt.day(d.di, true) }, d); });
    return Object.keys(src).map(function (k) { const d = GP.derive(src[k], S.R.len); return Object.assign({ id: k, seg: rep.by === "game" ? gameById(k).name : rep.by === "platform" ? (k === "ios" ? "iOS" : "Android") : k }, d); }).concat([Object.assign({ id: "_total", seg: "Total" }, S.k)]);
  }, [key, rep.by]);
  const cols = [{ key: "seg", header: { game: "Game", country: "Country", platform: "Platform", day: "Date" }[rep.by], align: "left" }].concat(rep.kpis.map(function (k) { const d = RK.find(function (x) { return x[0] === k; }); return { key: k, header: d[1], format: d[2] }; }));
  function persist(list) { setSaved(list); localStorage.setItem("gp.reports", JSON.stringify(list)); }
  function persistS(list) { setSched(list); localStorage.setItem("gp.sched", JSON.stringify(list)); }
  function useTemplate(t) { const T = TEMPLATES[t]; setRep({ name: T.name, kpis: T.kpis, by: T.by }); const r = window.rangeOf(T.range, F); app.setF({ range: T.range, from: r[0], to: r[1] }); setTab("builder"); }
  return (
    <div>
      <PageHeader title="Reports" desc={window.ROUTES[11].desc} />
      <Tabs value={tab} onChange={setTab} style={{ marginBottom: 16 }} items={[{ value: "saved", label: "Saved dashboards", count: app.presets.length + saved.length }, { value: "builder", label: "Custom report" }, { value: "schedules", label: "Scheduled reports", count: sched.length }]} />
      {tab === "saved" ? <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Summaries" subtitle="Start from a template — it opens in the report builder with the right date range.">
          <Grid min={220}>{Object.keys(TEMPLATES).map(function (t) { const T = TEMPLATES[t]; return <button key={t} onClick={function () { useTemplate(t); }} style={{ textAlign: "left", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-raised)", color: "inherit", cursor: "pointer", font: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="calendar" size={15} color="var(--accent)" /><b style={{ fontWeight: 600 }}>{T.name}</b></div>
            <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 6 }}>{T.kpis.length} KPIs · by {T.by} · {T.range === "y" ? "yesterday" : "last " + T.range + " days"}</div></button>; })}</Grid>
        </Card>
        <Card title="Saved views" subtitle="Pages saved with “Save view” in the filter bar (this browser).">
          {app.presets.length ? <DataTable dense rowKey="id" rows={app.presets} columns={[{ key: "name", header: "Name", align: "left" }, { key: "route", header: "Page", align: "left", format: function (v) { return (window.ROUTES.find(function (r) { return r.id === v; }) || {}).label; } }, { key: "created", header: "Saved", format: function (v) { return fmt.ts(v); } },
            { key: "x", header: "", sortable: false, render: function (r) { return <span style={{ display: "inline-flex", gap: 4 }}><Button size="sm" onClick={function () { app.setF(window.decode(r.q)); app.nav(r.route); }}>Open</Button><IconButton size="sm" icon="trash-2" label="Delete" onClick={function () { app.savePresets(app.presets.filter(function (p) { return p.id !== r.id; })); }} /></span>; } }]} />
            : <EmptyState compact title="No saved views" description="Open any page, set filters, then use Save view." />}
        </Card>
        <Card title="Saved reports">
          {saved.length ? <DataTable dense rowKey="id" rows={saved} columns={[{ key: "name", header: "Name", align: "left" }, { key: "by", header: "Breakdown", align: "left" }, { key: "kpis", header: "KPIs", align: "left", render: function (r) { return r.kpis.length + " KPIs"; } },
            { key: "x", header: "", sortable: false, render: function (r) { return <span style={{ display: "inline-flex", gap: 4 }}><Button size="sm" onClick={function () { setRep(r); setTab("builder"); }}>Open</Button><IconButton size="sm" icon="trash-2" label="Delete" onClick={function () { persist(saved.filter(function (x) { return x.id !== r.id; })); }} /></span>; } }]} />
            : <EmptyState compact title="No saved reports" description="Build one under Custom report." />}
        </Card>
      </div> : null}
      {tab === "builder" ? <div style={{ display: "grid", gridTemplateColumns: app.mobile ? "1fr" : "280px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <Card title="Configure">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input value={rep.name} onChange={function (v) { setRep(Object.assign({}, rep, { name: v })); }} />
            <div><div style={{ font: "var(--type-label)", color: "var(--text-secondary)", marginBottom: 8 }}>Break down by</div>
              <SegmentedControl value={rep.by} onChange={function (v) { setRep(Object.assign({}, rep, { by: v })); }} options={[{ value: "game", label: "Game" }, { value: "country", label: "Country" }, { value: "platform", label: "Platform" }, { value: "day", label: "Day" }]} /></div>
            <div><div style={{ font: "var(--type-label)", color: "var(--text-secondary)", marginBottom: 8 }}>KPIs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{RK.map(function (k) { const on = rep.kpis.indexOf(k[0]) >= 0; return <Checkbox key={k[0]} checked={on} label={k[1]} onChange={function (v) { setRep(Object.assign({}, rep, { kpis: v ? rep.kpis.concat([k[0]]) : rep.kpis.filter(function (x) { return x !== k[0]; }) })); }} />; })}</div></div>
          </div>
        </Card>
        <Card title={rep.name} subtitle={"Uses the global filters · " + fmt.day(F.from, true) + " – " + fmt.day(F.to, true) + " · " + GP.cfg.currency}
          actions={<><Button size="sm" iconLeft="download" disabled={!rep.kpis.length} onClick={function () { csv(rep.name.replace(/\W+/g, "-").toLowerCase(), cols.map(function (c) { return { header: c.header, key: c.key }; }), rows); app.toast({ tone: "positive", title: "CSV exported" }); }}>CSV</Button>
            <Button size="sm" iconLeft="printer" onClick={function () { window.print(); }}>PDF</Button>
            <Button size="sm" variant="primary" iconLeft="save" onClick={function () { persist(saved.filter(function (x) { return x.name !== rep.name; }).concat([Object.assign({ id: Date.now().toString(36) }, rep)])); app.toast({ tone: "positive", title: "Report saved", description: "Saved for you in this browser. Team sharing needs the backend." }); }}>Save</Button></>}>
          {rep.kpis.length ? <DataTable dense rowKey="id" rows={rows} columns={cols} rowStyle={function (r) { return r.id === "_total" ? { fontWeight: 600, background: "var(--bg-raised)" } : null; }} footerNote="PDF uses the browser's print dialog (Save as PDF). Totals recompute ratios from summed numerators." /> : <EmptyState compact title="Pick at least one KPI" />}
        </Card>
      </div> : null}
      {tab === "schedules" ? <Card title="Scheduled reports" actions={<Button size="sm" variant="primary" iconLeft="plus" disabled={app.role === "viewer"} onClick={function () { setSOpen(true); }}>New schedule</Button>}>
        <Callout tone="warning" title="Delivery requires the backend" style={{ marginBottom: 12 }}>Schedules are saved as drafts. Nothing is emailed until the scheduler and mail service are connected (Phase 3–4).</Callout>
        {sched.length ? <DataTable dense rowKey="id" rows={sched} columns={[{ key: "report", header: "Report", align: "left", format: function (v) { return TEMPLATES[v] ? TEMPLATES[v].name : v; } }, { key: "freq", header: "Frequency", align: "left" }, { key: "time", header: "Time (" + GP.cfg.tz + ")", align: "left" }, { key: "to", header: "Recipients", align: "left" }, { key: "st", header: "Status", align: "left", render: function () { return <Badge size="sm" tone="warning">Draft · not sending</Badge>; } }, { key: "x", header: "", sortable: false, render: function (r) { return <IconButton size="sm" icon="trash-2" label="Delete" onClick={function () { persistS(sched.filter(function (x) { return x.id !== r.id; })); }} />; } }]} />
          : <EmptyState compact title="No schedules" description="Create a daily, weekly or monthly summary." />}
      </Card> : null}
      <Dialog open={sOpen} onClose={function () { setSOpen(false); }} title="New scheduled report" footer={<><Button onClick={function () { setSOpen(false); }}>Cancel</Button><Button variant="primary" disabled={!sForm.to} onClick={function () { persistS(sched.concat([Object.assign({ id: Date.now().toString(36) }, sForm)])); setSOpen(false); app.toast({ tone: "demo", title: "Saved as draft", description: "Demo — no email will be sent." }); }}>Save draft</Button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select width="100%" value={sForm.report} onChange={function (v) { setSForm(Object.assign({}, sForm, { report: v })); }} options={Object.keys(TEMPLATES).map(function (t) { return { value: t, label: TEMPLATES[t].name }; })} />
          <Select width="100%" value={sForm.freq} onChange={function (v) { setSForm(Object.assign({}, sForm, { freq: v })); }} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly (Mon)" }, { value: "monthly", label: "Monthly (1st)" }]} />
          <Input value={sForm.time} onChange={function (v) { setSForm(Object.assign({}, sForm, { time: v })); }} suffix={GP.cfg.tz} />
          <Input value={sForm.to} onChange={function (v) { setSForm(Object.assign({}, sForm, { to: v })); }} placeholder="team@studio.com" />
        </div>
      </Dialog>
    </div>
  );
}

/* ================= DATA SOURCES ================= */
const CONNECTORS = [
  { id: "ga4", name: "Firebase / GA4", icon: "flame", kind: "Analytics", metrics: ["DAU/WAU/MAU", "sessions", "engagement", "events", "retention"] },
  { id: "bq", name: "BigQuery", icon: "database", kind: "Warehouse", metrics: ["raw events export", "cohorts", "custom SQL"] },
  { id: "max", name: "AppLovin MAX", icon: "badge-dollar-sign", kind: "Ad mediation", metrics: ["ad revenue", "impressions", "eCPM", "by network / format"] },
  { id: "admob", name: "Google AdMob", icon: "badge-dollar-sign", kind: "Ad network", metrics: ["ad revenue", "impressions", "match rate"] },
  { id: "af", name: "AppsFlyer", icon: "radar", kind: "Attribution", metrics: ["installs", "media source", "campaign", "cohort revenue"] },
  { id: "adjust", name: "Adjust", icon: "radar", kind: "Attribution", metrics: ["installs", "networks", "cohort KPIs"] },
  { id: "play", name: "Google Play Console", icon: "store", kind: "Store", metrics: ["IAP gross/net", "refunds", "ANR rate", "ratings"] },
  { id: "asc", name: "App Store Connect", icon: "store", kind: "Store", metrics: ["IAP proceeds", "subscriptions", "refunds"] },
  { id: "crash", name: "Firebase Crashlytics", icon: "bug", kind: "Stability", metrics: ["crash-free users", "issues", "ANR", "by version/device"] }
];
const DICT = [
  ["dau", "DAU", "Distinct users with ≥1 engagement event in a UTC day", "COUNT(DISTINCT user_pseudo_id)", "—", "—", "Day", "—", "Firebase", "—", "Sum across disjoint segments; never across days"],
  ["mau", "MAU", "Distinct active users in trailing 30 days", "COUNT(DISTINCT user) over 30d", "—", "—", "Day (rolling)", "—", "Firebase", "—", "Not additive across games or days"],
  ["spd", "Sessions / DAU", "Average sessions per active user-day", "sessions ÷ DAU", "Σ sessions", "Σ DAU", "Day", "—", "Firebase", "—", "Ratio of sums"],
  ["avg_session", "Avg. session duration", "Mean foreground time per session", "engagement_time ÷ sessions", "Σ engagement_time", "Σ sessions", "Day", "—", "Firebase", "—", "Ratio of sums"],
  ["ret_dn", "Classic Dn retention", "Cohort users active exactly on day n after install", "active_on_day_n ÷ cohort_size", "Σ retained (mature cohorts)", "Σ cohort size (mature cohorts)", "Install day", "—", "Firebase", "—", "Cohort-size weighted; immature cohorts excluded (N/A)"],
  ["ret_roll", "Rolling Dn retention", "Cohort users active at least once in days 1…n", "active_in_1..n ÷ cohort_size", "Σ users", "Σ cohort size", "Install day", "—", "Firebase", "—", "Cohort-size weighted"],
  ["ret_unb", "Unbounded Dn retention", "Cohort users active on day n or later", "active_≥n ÷ cohort_size", "Σ users", "Σ cohort size", "Install day", "—", "Firebase", "—", "Keeps rising until data window closes"],
  ["rev", "Total revenue", "IAA revenue + IAP gross revenue", "iaa + iap_gross", "—", "—", "Day", "—", "MAX/AdMob + stores", "Reporting currency", "Sum"],
  ["iap_net", "IAP net revenue", "Gross minus refunds minus store fee", "(gross − refunds) × (1 − fee)", "—", "—", "Day", "—", "Stores", "Reporting currency", "Sum"],
  ["arpdau", "ARPDAU", "Revenue per daily active user", "revenue ÷ DAU", "Σ revenue", "Σ DAU", "Day", "—", "Derived", "Reporting currency", "Ratio of sums — never average per-game ARPDAU"],
  ["ecpm", "eCPM", "Ad revenue per 1,000 impressions", "ad_revenue ÷ impressions × 1000", "Σ ad revenue", "Σ impressions", "Day", "—", "MAX/AdMob", "Reporting currency", "Ratio of sums"],
  ["ipd_fmt", "Impressions / DAU (by format)", "Ad impressions of a format per active user", "impressions_fmt ÷ DAU", "Σ impressions (format)", "Σ DAU", "Day", "—", "MAX + Firebase", "—", "Ratio of sums"],
  ["cpi", "CPI", "Cost per attributed non-organic install", "spend ÷ attributed installs", "Σ spend", "Σ paid installs", "Install day", "MMP click/view window", "AppsFlyer / Adjust", "Reporting currency", "Ratio of sums"],
  ["roas_dn", "Dn ROAS", "Cohort revenue by day n ÷ spend on the same cohort", "rev_cohort(≤n) ÷ spend_cohort", "Σ cohort revenue to day n", "Σ spend (same cohorts)", "Install day", "MMP attribution window", "AppsFlyer / Adjust", "Reporting currency", "Mature cohorts only; incomplete flagged"],
  ["ltv_dn", "Dn LTV", "Cumulative revenue per install by day n", "rev_cohort(≤n) ÷ installs", "Σ cohort revenue", "Σ installs", "Install day", "MMP", "AppsFlyer / Adjust", "Reporting currency", "Mature cohorts only"],
  ["win_rate", "Level win rate", "Wins per level attempt", "level_complete ÷ level_start", "Σ completes", "Σ starts", "Day", "—", "Firebase events", "—", "Attempt-based"],
  ["drop", "Level drop-off", "Players reaching level n who never start n+1", "1 − reach(n+1) ÷ reach(n)", "—", "Σ unique players at n", "Cohort", "—", "Firebase events", "—", "Player-based"],
  ["crash_free", "Crash-free users", "Share of active users without a crash", "1 − crashed_users ÷ active_users", "Σ crashed users", "Σ active users", "Day", "—", "Crashlytics", "—", "Ratio of sums"],
  ["anr", "ANR rate", "Android users with ≥1 ANR", "anr_users ÷ android_active_users", "Σ ANR users", "Σ Android DAU", "Day", "—", "Crashlytics / Play", "—", "Ratio of sums; Android only"]
];
function SourcesPage() {
  const app = useApp();
  const [tab, setTab] = React.useState("connectors");
  const [conn, setConn] = React.useState(null);
  const [q, setQ] = React.useState("");
  const dict = DICT.filter(function (d) { return !q || (d[0] + d[1] + d[2]).toLowerCase().indexOf(q.toLowerCase()) >= 0; }).map(function (d) { return { id: d[0], name: d[1], desc: d[2], formula: d[3], num: d[4], den: d[5], grain: d[6], attr: d[7], src: d[8], cur: d[9], agg: d[10] }; });
  return (
    <div>
      <PageHeader title="Data Sources" desc={window.ROUTES[12].desc} />
      <Tabs value={tab} onChange={setTab} style={{ marginBottom: 16 }} items={[{ value: "connectors", label: "Connectors", count: CONNECTORS.length + 1 }, { value: "dict", label: "Metric dictionary", count: DICT.length }, { value: "model", label: "Data model & API" }]} />
      {tab === "connectors" ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Callout tone="warning" title="No live connectors yet">Every chart currently reads the built-in demo dataset. Connectors authenticate through the backend (OAuth / service accounts); secrets are never stored in the browser. Status below reflects reality — nothing shows Connected until it is.</Callout>
        <Card padding={0}>
          {[{ id: "demo", name: "Demo dataset", icon: "flask-conical", kind: "Synthetic", metrics: ["all modules", "6 games", "180 days"], demo: true }].concat(CONNECTORS).map(function (c, i) {
            return (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: app.mobile ? "1fr" : "minmax(220px,1.2fr) 150px 150px minmax(200px,1.6fr) auto", gap: 14, alignItems: "center", padding: "14px 16px", borderTop: i ? "1px solid var(--border-subtle)" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-sunken)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: c.demo ? "var(--accent)" : "var(--text-secondary)" }}><Icon name={c.icon} size={16} /></span>
                  <div><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{c.kind}</div></div>
                </div>
                <div>{c.demo ? <Badge tone="accent" dot>Active · demo</Badge> : <Badge tone="neutral" dot>Not connected</Badge>}</div>
                <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}><div>Last sync: {c.demo ? fmt.ts(D.UPDATED_AT) : "—"}</div><div>Freshness: {c.demo ? "through " + fmt.day(D.N - 1) : "—"}</div><div>Sync error: none</div></div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{c.metrics.map(function (m) { return <Badge key={m} size="sm" tone="neutral">{m}</Badge>; })}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {c.demo ? <Button size="sm" disabled title="The demo dataset is generated in the browser.">Manual sync</Button> : <>
                    <Button size="sm" disabled title="Connect first">Manual sync</Button>
                    <Button size="sm" variant="primary" iconLeft="plug" disabled={app.role !== "admin"} title={app.role !== "admin" ? "Admins only" : undefined} onClick={function () { setConn(c); }}>Connect</Button></>}
                </div>
              </div>
            );
          })}
        </Card>
      </div> : null}
      {tab === "dict" ? <Card actions={<Input size="sm" iconLeft="search" value={q} onChange={setQ} placeholder="Search metrics" width={220} />} title="Metric dictionary" subtitle="Timezone: UTC daily buckets · Currency: USD base, converted at display (fixed demo FX)">
        <DataTable dense rowKey="id" rows={dict} pageSize={10} columns={[{ key: "id", header: "Metric ID", align: "left", render: function (r) { return <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{r.id}</code>; } }, { key: "name", header: "Name", align: "left" }, { key: "desc", header: "Description", align: "left", wrap: true }, { key: "formula", header: "Formula", align: "left", wrap: true, render: function (r) { return <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{r.formula}</code>; } }, { key: "num", header: "Numerator", align: "left", wrap: true }, { key: "den", header: "Denominator", align: "left", wrap: true }, { key: "grain", header: "Grain", align: "left" }, { key: "attr", header: "Attribution", align: "left" }, { key: "src", header: "Source", align: "left" }, { key: "cur", header: "Currency", align: "left" }, { key: "agg", header: "Aggregation rule", align: "left", wrap: true }]} />
      </Card> : null}
      {tab === "model" ? <Cols min={440}>
        <Card title="Tables" subtitle="PostgreSQL for metadata & config · BigQuery for analytics">
          <DataTable dense rowKey="t" rows={[["games", "PG", "id, name, platforms, timezone, currency"], ["app_versions", "PG", "game_id, version, released_at"], ["data_sources", "PG", "id, type, status, last_sync_at, error"], ["alerts / alert_rules", "PG", "rule, threshold, segment, severity"], ["experiments", "PG", "id, variants, allocation, metrics"], ["campaigns", "PG", "source, campaign_id, geo"], ["events", "BQ", "event_name, user_pseudo_id, ts, params (partitioned by day)"], ["sessions", "BQ", "session_id, user, start, duration"], ["cohorts", "BQ", "install_date, segment, size, retained_dn"], ["ad_impressions / ad_revenue", "BQ", "format, network, country, revenue"], ["iap_transactions", "BQ", "order_id, product, gross, refund, currency"], ["ua_spend", "BQ", "date, source, campaign, spend, installs"], ["daily_game_metrics", "BQ", "pre-aggregated by game × day × platform × country"]].map(function (r) { return { t: r[0], s: r[1], c: r[2] }; })}
            columns={[{ key: "t", header: "Table", align: "left", render: function (r) { return <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.t}</code>; } }, { key: "s", header: "Store", align: "left", render: function (r) { return <Badge size="sm" tone={r.s === "BQ" ? "info" : "neutral"}>{r.s}</Badge>; } }, { key: "c", header: "Key columns", align: "left", wrap: true }]} />
        </Card>
        <Card title="API (planned)" subtitle="Frontend calls these; the backend owns tokens, secrets and aggregation">
          <pre style={{ margin: 0, padding: 12, borderRadius: 10, background: "var(--bg-sunken)", font: "400 11.5px/1.7 var(--font-mono)", color: "var(--text-secondary)", overflow: "auto", whiteSpace: "pre" }}>{"GET  /api/v1/games\nGET  /api/v1/metrics/summary?game=&from=&to=&compare=&platform=&country=\nGET  /api/v1/metrics/timeseries?metric=&grain=day\nGET  /api/v1/retention/cohorts?mode=classic|rolling|unbounded\nGET  /api/v1/levels?game=        GET /api/v1/nonlinear/paths?game=\nGET  /api/v1/monetization/ads    GET /api/v1/monetization/iap\nGET  /api/v1/ua/campaigns        GET /api/v1/tech/issues\nGET  /api/v1/events?name=        POST /api/v1/events/funnel\nGET  /api/v1/alerts              PUT  /api/v1/alert-rules/:id\nGET  /api/v1/experiments/:id     POST /api/v1/reports/schedules\nGET  /api/v1/sources             POST /api/v1/sources/:id/sync"}</pre>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, color: "var(--text-secondary)" }}>
            {[["Deduplication", "events keyed by (user_pseudo_id, event_timestamp, event_name, hash(params))"], ["Late-arriving events", "daily tables re-materialized for D-3; Firebase export can land up to 72h late"], ["Timezone", "metrics bucketed in each game's reporting timezone; UTC by default"], ["Cohort maturity", "Dn served only when install_date + n ≤ last finalized day"], ["Privacy", "pseudonymous IDs only; no PII; country-level geo; honour ATT / consent flags"]].map(function (r) { return <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, font: "400 12px/1.5 var(--font-sans)" }}><b style={{ fontWeight: 500, color: "var(--text-primary)" }}>{r[0]}</b><span>{r[1]}</span></div>; })}
          </div>
        </Card>
      </Cols> : null}
      {conn ? <Dialog open onClose={function () { setConn(null); }} title={"Connect " + conn.name} description={conn.kind + " connector"} footer={<Button onClick={function () { setConn(null); }}>Close</Button>}>
        <EmptyState kind="coming-soon" compact title="Needs the GamePulse backend" description={"Connecting " + conn.name + " requires server-side credential storage and a sync worker (Phase 4). This prototype won't pretend to connect."} />
      </Dialog> : null}
    </div>
  );
}

/* ================= SETTINGS ================= */
function SettingsPage() {
  const app = useApp();
  const [pw, setPw] = React.useState("");
  const [hash, setHash] = React.useState("");
  React.useEffect(function () { if (!pw) { setHash(""); return; } crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw)).then(function (h) { setHash(Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("")); }); }, [pw]);
  const Row = function (p) { return <div style={{ display: "grid", gridTemplateColumns: app.mobile ? "1fr" : "220px minmax(0,1fr)", gap: 12, alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }}><div><div style={{ fontWeight: 500 }}>{p.t}</div>{p.d ? <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 2 }}>{p.d}</div> : null}</div><div>{p.children}</div></div>; };
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="Settings" desc={window.ROUTES[13].desc} />
      <Card title="Appearance & locale">
        <Row t="Theme"><SegmentedControl size="md" value={app.theme} onChange={app.setTheme} options={[{ value: "dark", label: "Dark", icon: "moon" }, { value: "light", label: "Light", icon: "sun" }]} /></Row>
        <Row t="Reporting currency" d="Fixed demo FX rates. Live rates come from the backend."><Select value={app.cfg.currency} onChange={function (v) { app.setCfg({ currency: v }); }} options={Object.keys(GP.FX).map(function (c) { return { value: c, label: c, description: c === "USD" ? "base" : "1 USD = " + GP.FX[c].r + " " + c }; })} /></Row>
        <Row t="Display timezone" d="Daily buckets stay in UTC in demo data; timestamps follow this setting."><Select value={app.cfg.tz} onChange={function (v) { app.setCfg({ tz: v }); }} options={["UTC", "Asia/Ho_Chi_Minh", "Asia/Tokyo", "Europe/Berlin", "America/Los_Angeles"].map(function (z) { return { value: z, label: z }; })} /></Row>
      </Card>
      <div style={{ height: 12 }}></div>
      <Card title="Security">
        <Row t="Session" d="Password gate with SHA-256 hash from config.js."><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Badge tone="positive" dot>Signed in</Badge><Button size="sm" iconLeft="log-out" onClick={app.signOut}>Sign out</Button></div></Row>
        <Row t="Change password" d="Generates the hash to paste into config.js or your GitHub secret.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Input type="password" value={pw} onChange={setPw} placeholder="New password (min 12 chars recommended)" />
            {hash ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}><code style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", font: "400 11.5px/1.4 var(--font-mono)", padding: "8px 10px", borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>{hash}</code>
              <Button size="sm" iconLeft="copy" onClick={function () { (navigator.clipboard ? navigator.clipboard.writeText(hash) : Promise.reject()).then(function () { app.toast({ tone: "positive", title: "Hash copied" }); }).catch(function () { app.toast({ tone: "info", title: "Select and copy the hash manually" }); }); }}>Copy</Button></div> : null}
            <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>On GitHub: Settings → Secrets → Actions → <code style={{ fontFamily: "var(--font-mono)" }}>GP_PASSWORD_SHA256</code>. The deploy workflow writes it into config.js. Client-side gates aren't real security — see README.</div>
          </div>
        </Row>
      </Card>
      <div style={{ height: 12 }}></div>
      <Card title="Workspace (demo)">
        <Row t="Your role" d="Simulates permissions. Real roles need the auth backend."><SegmentedControl size="md" value={app.role} onChange={app.setRole} options={[{ value: "admin", label: "Admin" }, { value: "analyst", label: "Analyst" }, { value: "viewer", label: "Viewer" }]} /></Row>
        <Row t="Simulate page state" d="Preview loading / error / empty / no-permission states on every page."><Select value={app.sim} onChange={app.setSim} options={[{ value: "none", label: "Off — real demo data" }, { value: "loading", label: "Loading" }, { value: "error", label: "Error" }, { value: "empty", label: "Empty" }, { value: "no-permission", label: "No permission" }]} /></Row>
      </Card>
    </div>
  );
}

window.Pages = Object.assign(window.Pages || {}, { reports: ReportsPage, sources: SourcesPage, settings: SettingsPage });
});
