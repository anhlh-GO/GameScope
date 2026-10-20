window.__dsReady.then(function (DS) {
const { Card, Skeleton, EmptyState, Button, GameAvatar } = DS;
const GP = window.GP, fmt = GP.fmt, D = GP.D;

const ROUTES = [
  { id: "portfolio", label: "Portfolio Overview", icon: "briefcase", group: "Portfolio", desc: "Health of every game in one view. Totals are summed per game; ratio KPIs are recomputed from portfolio numerators and denominators." },
  { id: "overview", label: "Overview", icon: "layout-dashboard", group: "Game", desc: "Core KPIs for the selected game. Click a KPI card to plot it against the comparison period." },
  { id: "engagement", label: "Users & Engagement", icon: "users", group: "Game", desc: "Activity, session depth and playtime, segmented by user type, platform and country." },
  { id: "retention", label: "Retention & Cohorts", icon: "repeat", group: "Game", desc: "Install-cohort retention, D0–D14 daily plus D30. Aggregates are cohort-size weighted and use mature cohorts only." },
  { id: "levels", label: "Level Analytics", icon: "gamepad-2", group: "Game", desc: "Find levels that are too hard, too easy, or where players leave." },
  { id: "monetization", label: "Monetization", icon: "circle-dollar-sign", group: "Game", desc: "Ad (IAA) and in-app purchase (IAP) revenue. Total revenue = IAA + IAP gross." },
  { id: "ua", label: "User Acquisition", icon: "megaphone", group: "Game", desc: "Spend, installs and cohort ROAS. ROAS uses the same install cohort and revenue window; immature cohorts are flagged." },
  { id: "tech", label: "Technical Health", icon: "activity", group: "Game", desc: "Stability and performance by version and device." },
  { id: "ai", label: "Ask AI", icon: "sparkles", group: "Intelligence", desc: "Ask questions about your games in plain language. Answers are computed from the same metric engine as every chart." },
  { id: "alerts", label: "Alerts & Insights", icon: "bell", group: "Intelligence", desc: "Threshold-based anomaly detection on the latest finalized data. Alerts flag movement — they do not establish a cause." },
  { id: "ab", label: "A/B Testing", icon: "flask-conical", group: "Intelligence", desc: "Experiment results with confidence intervals, sample-ratio checks and guardrails." },
  { id: "events", label: "Event Explorer", icon: "mouse-pointer-click", group: "Intelligence", desc: "Custom events: counts, unique users, parameters and ad-hoc funnels." },
  { id: "reports", label: "Reports", icon: "file-text", group: "Workspace", desc: "Saved views, custom reports, exports and schedules." },
  { id: "sources", label: "Data Sources", icon: "database", group: "Workspace", desc: "Connector status, the metric dictionary, and the data model behind every chart." },
  { id: "settings", label: "Settings", icon: "settings", group: "Workspace", desc: "Appearance, locale, security and workspace preferences." }
];

const NA = {
  game: "Portfolio Overview always includes every game.",
  version: "App version isn't a dimension of the daily aggregate tables (only Crashlytics data is split by version).",
  source: "Acquisition source and campaign come from attribution data (AppsFlyer / Adjust) and only apply to User Acquisition.",
  userType: "New / returning split is available on engagement data only.",
  retUser: "Retention is defined on install cohorts — every user is new on D0.",
  techCountry: "Crashlytics exports in this pipeline have no country dimension.",
  own: "This page defines its own scope.",
  ab: "Experiments carry their own population; only the game filter applies."
};
const ALL = { game: 1, platform: 1, countries: 1, version: 0, source: 0, campaign: 0, userType: 0, compare: 1 };
const APPLY = {
  portfolio: Object.assign({}, ALL, { game: 0 }), overview: ALL, engagement: Object.assign({}, ALL, { userType: 1 }), retention: ALL, levels: ALL, monetization: ALL,
  ua: Object.assign({}, ALL, { source: 1, campaign: 1 }), tech: Object.assign({}, ALL, { countries: 0, version: 1 }), ai: ALL, alerts: { compare: 0 }, ab: { game: 1 }, events: ALL, reports: ALL, sources: {}, settings: {}
};
function reasonFor(route, key) {
  if (route === "alerts" || route === "sources" || route === "settings") return NA.own;
  if (route === "ab") return NA.ab;
  if (key === "game") return NA.game;
  if (key === "version") return NA.version;
  if (key === "source" || key === "campaign") return NA.source;
  if (key === "userType") return route === "retention" ? NA.retUser : NA.userType;
  if (key === "countries" && route === "tech") return NA.techCountry;
  return "Not available for this page.";
}
const DEFAULT_F = { game: "all", range: "30", from: D.N - 30, to: D.N - 1, compare: "prev", compareFrom: null, platform: "all", countries: [], version: "all", source: "all", campaign: "all", userType: "all" };
function rangeOf(preset, F) {
  const E = D.N - 1;
  if (preset === "y") return [E, E];
  if (preset === "custom") return [F.from, F.to];
  const n = parseInt(preset, 10) || 30; return [E - n + 1, E];
}
function effective(F, route) {
  const a = APPLY[route] || {};
  const out = Object.assign({}, F);
  Object.keys(DEFAULT_F).forEach(function (k) { if (k in ALL && !a[k]) out[k] = DEFAULT_F[k]; });
  if (route === "portfolio") out.game = "all";
  if (!a.compare) out.compare = "none";
  return out;
}
function encode(F) {
  const p = new URLSearchParams();
  Object.keys(DEFAULT_F).forEach(function (k) {
    let v = F[k];
    if (k === "from" || k === "to") { if (F.range !== "custom") return; v = D.iso(D.dates[v]); }
    if (k === "compareFrom") { if (F.compare !== "custom" || v == null) return; v = D.iso(D.dates[v]); }
    if (k === "countries") { if (!v.length) return; v = v.join(","); }
    if (v === DEFAULT_F[k]) return;
    p.set(k, v);
  });
  return p.toString();
}
function dayIndex(isoStr) { const t = Date.parse(isoStr + "T00:00:00Z"); const i = D.dates.indexOf(t); return i; }
function decode(q) {
  const p = new URLSearchParams(q || ""); const F = Object.assign({}, DEFAULT_F);
  p.forEach(function (v, k) {
    if (!(k in DEFAULT_F)) return;
    if (k === "countries") F.countries = v ? v.split(",") : [];
    else if (k === "from" || k === "to" || k === "compareFrom") { const i = dayIndex(v); if (i >= 0) F[k] = i; }
    else F[k] = v;
  });
  const r = rangeOf(F.range, F); F.from = Math.max(D.N - 90, r[0]); F.to = Math.min(D.N - 1, r[1]);
  if (F.game !== "all" && !D.GAMES.some(function (g) { return g.id === F.game; })) F.game = "all";
  return F;
}

const AppCtx = React.createContext(null);
function useApp() { return React.useContext(AppCtx); }
function useLoading(key, ms) {
  const [l, setL] = React.useState(true);
  React.useEffect(function () { setL(true); const t = setTimeout(function () { setL(false); }, ms || 260); return function () { clearTimeout(t); }; }, [key]);
  return l;
}
function keyOf(F) { return JSON.stringify(F); }

function PageHeader({ title, desc, actions, meta }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ flex: "1 1 360px", minWidth: 0 }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", letterSpacing: "var(--tracking-tight)" }}>{title}</h1>
        {desc ? <p style={{ margin: "6px 0 0", color: "var(--text-tertiary)", maxWidth: 760, textWrap: "pretty" }}>{desc}</p> : null}
        {meta ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{meta}</div> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}
function Grid({ min, gap, children, style }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, " + (min || 210) + "px), 1fr))", gap: gap || 12, ...style }}>{children}</div>;
}
function Cols({ min, children, style }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, " + (min || 440) + "px), 1fr))", gap: 12, ...style }}>{children}</div>;
}
function Section({ title, children, aside }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, font: "600 12px/1 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>{title}</h2>
        <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}></span>
        {aside}
      </div>
      {children}
    </section>
  );
}
function ChartCard({ title, subtitle, info, actions, loading, height, children, footer, style }) {
  return (
    <Card title={title} subtitle={subtitle} info={info} actions={actions} footer={footer} style={style}>
      {loading ? <div style={{ display: "flex", flexDirection: "column", gap: 10, height: height || 240, justifyContent: "flex-end" }}>
        <Skeleton height={(height || 240) - 40} radius={8} /><Skeleton width="40%" height={10} />
      </div> : children}
    </Card>
  );
}
function NeedGame({ reason, filter }) {
  const app = useApp();
  const list = D.GAMES.filter(filter || function () { return true; });
  return (
    <Card>
      <EmptyState kind="empty" title="Select a game" description={reason || "This analysis is defined per game. Pick one to continue."}
        action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{list.map(function (g) { return <Button key={g.id} size="sm" onClick={function () { app.setF({ game: g.id }); }}><GameAvatar name={g.name} color={g.color} size={16} />{g.name}</Button>; })}</div>} />
    </Card>
  );
}
function SimGate({ route, children }) {
  const app = useApp();
  const s = route === "settings" ? "none" : app.sim;
  if (s === "loading") return <Card><EmptyState kind="loading" description="Simulated: waiting on the analytics API." /></Card>;
  if (s === "error") return <Card><EmptyState kind="error" description="Simulated: BigQuery job failed (timeout after 30s). No partial data is shown." action={<Button iconLeft="refresh-cw" onClick={function () { app.setSim("none"); }}>Retry</Button>} /></Card>;
  if (s === "empty") return <Card><EmptyState kind="empty" description="Simulated: no rows match the current filters. Try widening the date range or clearing country filters." action={<Button iconLeft="rotate-ccw" onClick={function () { app.setSim("none"); }}>Reset</Button>} /></Card>;
  if (s === "no-permission" || (app.role === "viewer" && (route === "sources"))) return <Card><EmptyState kind="no-permission" description={"Your role (" + app.role + ") can't view this page. Ask a workspace admin for Analyst access."} /></Card>;
  return children;
}
function xday(di, tip) { return fmt.day(di, tip); }
function csv(name, columns, rows) {
  const esc = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const text = [columns.map(function (c) { return esc(c.header); }).join(",")].concat(rows.map(function (r) { return columns.map(function (c) { return esc(c.value ? c.value(r) : r[c.key]); }).join(","); })).join("\n");
  const blob = new Blob([text], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + ".csv"; document.body.appendChild(a); a.click(); a.remove();
}
function compareLabel(F) { return F.compare === "prev" ? "vs prev. period" : F.compare === "wow" ? "vs 7 days earlier" : F.compare === "custom" ? "vs custom period" : ""; }
/* build KpiCard props from a summary */
function kpi(S, key, label, f, o) {
  o = o || {};
  const v = S.k[key], p = S.pk ? S.pk[key] : null;
  return { label: label, value: f(v), delta: S.pk ? GP.delta(v, p, o.pp) : null, deltaFormat: o.pp ? "pp" : "percent", goodDirection: o.good || "up",
    spark: o.noSpark ? null : S.series.map(function (d) { return d[o.sparkKey || key]; }), color: o.color || "var(--accent)", info: o.info, source: o.source || "Demo data", updated: o.updated };
}
function gameById(id) { return D.GAMES.find(function (g) { return g.id === id; }); }

Object.assign(window, { ROUTES: ROUTES, APPLY: APPLY, NA: NA, reasonFor: reasonFor, DEFAULT_F: DEFAULT_F, rangeOf: rangeOf, effective: effective, encode: encode, decode: decode, AppCtx: AppCtx, useApp: useApp,
  useLoading: useLoading, keyOf: keyOf, PageHeader: PageHeader, Grid: Grid, Cols: Cols, Section: Section, ChartCard: ChartCard, NeedGame: NeedGame, SimGate: SimGate, xday: xday, csv: csv, compareLabel: compareLabel, kpi: kpi, gameById: gameById });
});
