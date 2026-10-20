window.__dsReady.then(function (DS) {
const { Card, KpiCard, DataTable, LineChart, BarChart, FunnelChart, ShareBar, SegmentedControl, Tabs, Badge, Callout, Dialog, Button, IconButton, Select, Input, Switch, GameAvatar, Delta, Icon, EmptyState } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, keyOf, useLoading, PageHeader, Grid, Cols, Section, ChartCard, xday, compareLabel, gameById } = window;
const P = function (v) { return fmt.pct(v); };
const SEVT = { critical: "negative", warning: "warning", info: "info" };

function fmtMetric(m, v) { if (v == null) return "—"; if (m === "d1" || m === "winrate") return fmt.pct(v, 1); if (m === "crash") return fmt.pct(v, 3); if (m === "rev" || m === "ecpm" || m === "cpi") return fmt.money(v, m !== "rev"); if (m === "spd") return fmt.num(v); return fmt.int(v); }

/* ================= ALERTS ================= */
function AlertsPage() {
  const app = useApp();
  const [tab, setTab] = React.useState("center");
  const [sev, setSev] = React.useState("all");
  const [ack, setAck] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.ack") || "[]"); } catch (e) { return []; } });
  const [showAck, setShowAck] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const loading = useLoading(keyOf(app.rules));
  const list = app.alerts;
  const counts = { all: list.length, critical: 0, warning: 0, info: 0 }; list.forEach(function (a) { counts[a.severity]++; });
  const shown = list.filter(function (a) { return (sev === "all" || a.severity === sev) && (showAck || ack.indexOf(a.id) < 0); });
  function doAck(id) { const n = ack.concat([id]); setAck(n); localStorage.setItem("gp.ack", JSON.stringify(n)); app.toast({ tone: "info", title: "Alert acknowledged", description: "Stored in this browser. Team-wide status needs the backend." }); }
  function saveRule(r) { const exists = app.rules.some(function (x) { return x.id === r.id; }); app.setRules(exists ? app.rules.map(function (x) { return x.id === r.id ? r : x; }) : app.rules.concat([r])); setEdit(null); app.toast({ tone: "positive", title: "Rule saved", description: "Alerts were re-evaluated on the latest data." }); }
  const kindTxt = { drop_pct: "drops more than", rise_pct: "rises more than", drop_pp: "drops more than" };
  return (
    <div>
      <PageHeader title="Alerts & Insights" desc={window.ROUTES[8].desc} actions={tab === "settings" ? <><Button iconLeft="rotate-ccw" onClick={function () { app.setRules(GP.DEFAULT_RULES); }}>Restore defaults</Button><Button variant="primary" iconLeft="plus" onClick={function () { setEdit({ id: "r" + Date.now().toString(36), metric: "dau", label: "DAU", kind: "drop_pct", threshold: 10, severity: "warning", minSample: 1000, game: "all", platform: "all", country: "all", compare: "prev7", enabled: true }); }}>New rule</Button></> : null} />
      <Tabs value={tab} onChange={setTab} items={[{ value: "center", label: "Alert center", count: list.length }, { value: "settings", label: "Alert rules", count: app.rules.length }]} style={{ marginBottom: 16 }} />
      {tab === "center" ? <>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <SegmentedControl value={sev} onChange={setSev} options={[{ value: "all", label: "All · " + counts.all }, { value: "critical", label: "Critical · " + counts.critical }, { value: "warning", label: "Warning · " + counts.warning }, { value: "info", label: "Info · " + counts.info }]} />
          <Switch checked={showAck} onChange={setShowAck} label="Show acknowledged" />
          <span style={{ flex: 1 }}></span>
          <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>Evaluated {fmt.ts(D.UPDATED_AT)} on data through {fmt.day(D.N - 1, true)}</span>
        </div>
        <Callout tone="neutral" icon="info" style={{ marginBottom: 12 }}>Alerts compare windows against thresholds. They show what moved and where — not why. Check releases, campaigns and network changes before drawing conclusions.</Callout>
        {loading ? <Card><EmptyState kind="loading" compact /></Card> : shown.length === 0 ? <Card><EmptyState kind="empty" title="No open alerts" description="Nothing crossed a threshold for this filter. Adjust rules in Alert rules." /></Card> :
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map(function (a) {
              const g = gameById(a.gameId), isAck = ack.indexOf(a.id) >= 0;
              return (
                <Card key={a.id} padding={14} style={{ opacity: isAck ? .6 : 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
                    <GameAvatar name={g.name} color={g.color} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Badge tone={SEVT[a.severity]} dot>{a.severity}</Badge>
                        <span style={{ font: "600 14px/1.3 var(--font-sans)" }}>{a.game} · {a.label}</span>
                        <Delta value={a.change} format={a.pp ? "pp" : "percent"} goodDirection={a.metric === "crash" || a.metric === "cpi" ? "down" : "up"} size="md" />
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
                        <span>Current <b style={{ color: "var(--text-primary)", fontWeight: 500 }}>{fmtMetric(a.metric, a.current)}</b></span>
                        <span>Previous <b style={{ color: "var(--text-primary)", fontWeight: 500 }}>{fmtMetric(a.metric, a.previous)}</b></span>
                        <span>{a.compare}</span><span>Segment: {a.segment}</span><span>Detected {fmt.ts(a.detected)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isAck ? <Badge tone="neutral">Acknowledged</Badge> : <Button size="sm" variant="ghost" onClick={function () { doAck(a.id); }}>Acknowledge</Button>}
                      <Button size="sm" iconRight="arrow-right" onClick={function () { app.nav(a.route, { game: a.gameId, range: "14", from: D.N - 14, to: D.N - 1, compare: "wow" }); }}>Open report</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>}
      </> : <Card>
        <DataTable rowKey="id" rows={app.rules} columns={[
          { key: "enabled", header: "On", align: "left", sortable: false, render: function (r) { return <Switch checked={r.enabled} onChange={function (v) { saveRule(Object.assign({}, r, { enabled: v })); }} />; } },
          { key: "label", header: "KPI", align: "left" }, { key: "cond", header: "Condition", align: "left", sortable: false, render: function (r) { return kindTxt[r.kind] + " " + r.threshold + (r.kind === "drop_pp" ? " pp" : "%"); } },
          { key: "game", header: "Game", align: "left", format: function (v) { return v === "all" ? "All games" : gameById(v).name; } }, { key: "platform", header: "Platform", align: "left" }, { key: "country", header: "Country", align: "left" },
          { key: "compare", header: "Comparison", align: "left", format: function (v) { return v === "prev28" ? "vs 28 days earlier" : "7d vs prior 7d"; } }, { key: "minSample", header: "Min. sample", format: fmt.int },
          { key: "severity", header: "Severity", align: "left", render: function (r) { return <Badge size="sm" tone={SEVT[r.severity]} dot>{r.severity}</Badge>; } },
          { key: "x", header: "", sortable: false, render: function (r) { return <span style={{ display: "inline-flex", gap: 2 }}><IconButton size="sm" icon="pencil" label="Edit rule" onClick={function () { setEdit(r); }} /><IconButton size="sm" icon="trash-2" label="Delete rule" onClick={function () { app.setRules(app.rules.filter(function (x) { return x.id !== r.id; })); }} /></span>; } }
        ]} footerNote="Min. sample: the window must contain at least this many user-days / impressions / installs for the rule to fire." />
      </Card>}
      {edit ? <RuleDialog rule={edit} onClose={function () { setEdit(null); }} onSave={saveRule} /> : null}
    </div>
  );
}
const METRICS = [["dau", "DAU", "drop_pct"], ["d1", "D1 retention", "drop_pp"], ["rev", "Revenue", "drop_pct"], ["ecpm", "eCPM", "drop_pct"], ["crash", "Crash rate", "rise_pct"], ["winrate", "Level win rate", "drop_pp"], ["spd", "Sessions / DAU", "drop_pct"], ["cpi", "CPI", "rise_pct"]];
function RuleDialog({ rule, onClose, onSave }) {
  const [r, setR] = React.useState(rule);
  const set = function (p) { setR(Object.assign({}, r, p)); };
  const L = function (t, c) { return <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{t}</span>{c}</label>; };
  return (
    <Dialog open onClose={onClose} title={rule.label ? "Edit alert rule" : "New alert rule"} width={560} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={function () { onSave(r); }}>Save rule</Button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {L("KPI", <Select width="100%" value={r.metric} onChange={function (v) { const m = METRICS.find(function (x) { return x[0] === v; }); set({ metric: v, label: m[1], kind: m[2] }); }} options={METRICS.map(function (m) { return { value: m[0], label: m[1] }; })} />)}
        {L("Game", <Select width="100%" value={r.game} onChange={function (v) { set({ game: v }); }} options={[{ value: "all", label: "All games" }].concat(D.GAMES.map(function (g) { return { value: g.id, label: g.name }; }))} />)}
        {L("Condition", <Select width="100%" value={r.kind} onChange={function (v) { set({ kind: v }); }} options={[{ value: "drop_pct", label: "Drops by % (relative)" }, { value: "rise_pct", label: "Rises by % (relative)" }, { value: "drop_pp", label: "Drops by percentage points" }]} />)}
        {L("Threshold", <Input type="number" value={r.threshold} onChange={function (v) { set({ threshold: parseFloat(v) || 0 }); }} suffix={r.kind === "drop_pp" ? "pp" : "%"} />)}
        {L("Platform", <Select width="100%" value={r.platform} onChange={function (v) { set({ platform: v }); }} options={[{ value: "all", label: "All" }, { value: "android", label: "Android" }, { value: "ios", label: "iOS" }]} />)}
        {L("Country", <Select width="100%" value={r.country} onChange={function (v) { set({ country: v }); }} searchable options={[{ value: "all", label: "All countries" }].concat(D.COUNTRIES.map(function (c) { return { value: c.code, label: c.name }; }))} />)}
        {L("Comparison period", <Select width="100%" value={r.compare} onChange={function (v) { set({ compare: v }); }} options={[{ value: "prev7", label: "Last 7d vs prior 7d" }, { value: "prev28", label: "Last 7d vs same 7d 4 weeks earlier" }]} />)}
        {L("Minimum sample", <Input type="number" value={r.minSample} onChange={function (v) { set({ minSample: parseInt(v, 10) || 0 }); }} />)}
        {L("Severity", <Select width="100%" value={r.severity} onChange={function (v) { set({ severity: v }); }} options={[{ value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }, { value: "info", label: "Informational" }]} />)}
      </div>
      <p style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", margin: "14px 0 0" }}>Notifications (email, Slack) need the backend scheduler — Phase 3. Rules evaluate in the browser for now.</p>
    </Dialog>
  );
}

/* ================= A/B TESTING ================= */
function ABPage() {
  const app = useApp();
  const F = effective(app.F, "ab");
  const list = D.EXPERIMENTS.filter(function (e) { return F.game === "all" || e.gameId === F.game; });
  const [sel, setSel] = React.useState(null);
  const cur = list.find(function (e) { return e.id === sel; }) || list[0];
  const X = cur ? GP.experiment(cur) : null;
  return (
    <div>
      <PageHeader title="A/B Testing" desc={window.ROUTES[9].desc} />
      {!cur ? <Card><EmptyState title="No experiments for this game" description="Experiments created in Firebase A/B Testing or Remote Config will appear here once connected." /></Card> :
      <div style={{ display: "grid", gridTemplateColumns: app.mobile ? "1fr" : "300px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <Card padding={8}>
          {list.map(function (e) { const x = GP.experiment(e); const g = gameById(e.gameId); const on = e.id === cur.id; return (
            <button key={e.id} onClick={function () { setSel(e.id); }} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", padding: 10, borderRadius: 8, border: 0, cursor: "pointer", background: on ? "var(--bg-active)" : "transparent", color: "inherit", font: "inherit" }}>
              <GameAvatar name={g.name} color={g.color} size={24} />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 500 }}>{e.name}</span><span style={{ display: "flex", gap: 6, marginTop: 6 }}><Badge size="sm" tone={e.status === "running" ? "info" : "neutral"}>{e.status}</Badge>{x.srm ? <Badge size="sm" tone="negative">SRM</Badge> : null}</span></span>
            </button>); })}
        </Card>
        <ExperimentDetail X={X} />
      </div>}
    </div>
  );
}
function ExperimentDetail({ X }) {
  const e = X.e, g = gameById(e.gameId);
  const days = (e.start - (e.end == null ? 0 : e.end));
  const planned = e.end == null ? Math.max(days + 7, 21) : days;
  const fv = function (r, v) { if (v == null) return "—"; return r.info.money ? fmt.money(v, true) : r.info.unit === "sec" ? fmt.dur(v) : r.info.prop ? fmt.pct(v, r.key === "crash" ? 2 : 1) : fmt.num(v, 2); };
  const mature = X.rows.filter(function (r) { return r.mature; });
  const span = Math.max.apply(null, mature.map(function (r) { return Math.max(Math.abs(r.relLo), Math.abs(r.relHi)); })) || .1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ font: "600 16px/1.3 var(--font-sans)" }}>{e.name}</span><Badge tone={e.status === "running" ? "info" : "neutral"}>{e.status}</Badge></div>
            <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", textWrap: "pretty" }}><b style={{ fontWeight: 500 }}>Hypothesis:</b> {e.hypothesis}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginTop: 14 }}>
          {[["Game", g.name], ["Start", fmt.day(D.N - 1 - e.start, true)], ["End", e.end == null ? "Running" : fmt.day(D.N - 1 - e.end, true)], ["Variant A", e.a], ["Variant B", e.b], ["Allocation", e.alloc.join(" / ")], ["Eligible users", fmt.full(e.eligible)], ["Assigned users", fmt.full(e.assigned[0] + e.assigned[1])]].map(function (r) {
            return <div key={r[0]} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-sunken)" }}><div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{r[0]}</div><div style={{ font: "500 13px/1.35 var(--font-sans)", marginTop: 4 }}>{r[1]}</div></div>;
          })}
        </div>
      </Card>
      <Callout tone={X.tone} title="Decision status">{X.verdict}</Callout>
      <Grid min={200}>
        <KpiCard label="Sample ratio check" value={X.srm ? "Mismatch" : "OK"} compareLabel={"χ² p = " + (X.srmP < .0001 ? "<0.0001" : X.srmP.toFixed(3))} info="Chi-square test of assigned counts vs planned allocation. p < 0.001 means assignment or logging is broken." note={<Badge size="sm" tone={X.srm ? "negative" : "positive"}>{X.srm ? "Fail" : "Pass"}</Badge>} source="Demo · Firebase AB" />
        <KpiCard label="Retention maturity" value={e.start >= 8 ? "D7 ready" : e.start >= 2 ? "D1 only" : "Too early"} compareLabel={e.start + " days since start"} info="D7 needs every included user to be at least 7 days past assignment." source="Demo · Firebase AB" />
        <KpiCard label="Primary metric" value={X.primary ? X.primary.label : "—"} compareLabel={X.primary && X.primary.mature ? (X.primary.sig ? "significant at 95%" : "not significant") : "not mature"} source="Pre-registered" />
        <KpiCard label="Guardrails" value={X.rows.filter(function (r) { return r.guard; }).map(function (r) { return r.label; }).join(", ")} compareLabel="must not regress significantly" source="Pre-registered" />
      </Grid>
      <Card title="KPI comparison" subtitle="Difference = B − A. 95% CI from normal approximation; continuous metrics use modeled variance in demo data.">
        <DataTable dense rowKey="key" rows={X.rows} columns={[
          { key: "label", header: "Metric", align: "left", render: function (r) { return <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{r.label}{r.primary ? <Badge size="sm" tone="accent">Primary</Badge> : r.guard ? <Badge size="sm" tone="neutral">Guardrail</Badge> : null}</span>; } },
          { key: "a", header: "A", render: function (r) { return fv(r, r.a); } }, { key: "b", header: "B", render: function (r) { return fv(r, r.b); } },
          { key: "rel", header: "Relative Δ", render: function (r) { return r.mature ? <Delta value={r.rel} goodDirection={r.info.good} /> : <Badge size="sm" tone="warning">Not mature</Badge>; } },
          { key: "ci", header: "95% CI (relative)", sortable: false, render: function (r) { return r.mature ? (r.relLo * 100).toFixed(1) + "% … " + (r.relHi * 100).toFixed(1) + "%" : "—"; } },
          { key: "p", header: "p-value", format: function (v) { return v == null ? "—" : v < .001 ? "<0.001" : v.toFixed(3); } },
          { key: "sig", header: "Significant", render: function (r) { return r.mature ? (r.sig ? <Badge size="sm" tone="positive">Yes</Badge> : <Badge size="sm" tone="neutral">No</Badge>) : "—"; } }
        ]} />
      </Card>
      <Cols min={360}>
        <Card title="KPI difference with 95% CI" subtitle="Relative change B vs A. Bars crossing 0 are inconclusive.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mature.map(function (r) {
              const x = function (v) { return 50 + v / span * 46; };
              const good = r.info.good === "up" ? r.rel > 0 : r.rel < 0;
              const col = !r.sig ? "var(--text-tertiary)" : good ? "var(--positive)" : "var(--negative)";
              return <div key={r.key} style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr) 56px", gap: 10, alignItems: "center", font: "400 12px/1 var(--font-sans)" }}>
                <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                <span style={{ position: "relative", height: 18 }}>
                  <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border-strong)" }}></span>
                  <span style={{ position: "absolute", left: x(r.relLo) + "%", width: (x(r.relHi) - x(r.relLo)) + "%", top: 7, height: 4, borderRadius: 2, background: col, opacity: .55 }}></span>
                  <span style={{ position: "absolute", left: "calc(" + x(r.rel) + "% - 5px)", top: 4, width: 10, height: 10, borderRadius: 5, background: col }}></span>
                </span>
                <span style={{ textAlign: "right", color: col, fontVariantNumeric: "tabular-nums" }}>{(r.rel * 100).toFixed(1)}%</span>
              </div>;
            })}
          </div>
        </Card>
        <Card title="Sample size & timeline">
          <ShareBar height={10} format={fmt.full} segments={[{ label: "A · " + e.a, value: e.assigned[0], color: "var(--chart-compare)" }, { label: "B · " + e.b, value: e.assigned[1], color: "var(--accent)" }]} />
          <p style={{ font: "var(--type-caption)", color: X.srm ? "var(--negative)" : "var(--text-tertiary)", margin: "8px 0 18px" }}>Planned {e.alloc.join(" / ")}. {X.srm ? "Observed split deviates beyond chance." : "Observed split is consistent with the plan."}</p>
          <div style={{ position: "relative", height: 28, borderRadius: 6, background: "var(--bg-sunken)", overflow: "hidden" }}>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.min(100, days / planned * 100) + "%", background: "var(--accent-soft)", borderRight: "2px solid var(--accent)" }}></span>
            <span style={{ position: "absolute", left: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", font: "500 11.5px/1 var(--font-sans)" }}>{days} of {planned} days</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 6 }}><span>{fmt.day(D.N - 1 - e.start)}</span><span>{e.end == null ? "planned " + fmt.day(D.N - 1 - e.start + planned) : fmt.day(D.N - 1 - e.end)}</span></div>
        </Card>
      </Cols>
    </div>
  );
}

/* ================= EVENT EXPLORER ================= */
function EventsPage() {
  const app = useApp();
  const F = effective(app.F, "events"); const key = keyOf(F); const loading = useLoading(key);
  const E = React.useMemo(function () { return GP.events(F); }, [key]);
  const [sel, setSel] = React.useState("level_start");
  const [measure, setMeasure] = React.useState("count");
  const [q, setQ] = React.useState("");
  const ev = E.find(function (e) { return e.name === sel; }) || E[0];
  const [param, setParam] = React.useState(null);
  const p = ev.params.indexOf(param) >= 0 ? param : ev.params[0];
  const names = E.map(function (e) { return e.name; });
  const g = F.game !== "all" ? gameById(F.game) : null;
  const [steps, setSteps] = React.useState(null);
  const st = (steps || (g && g.nonlinear ? ["first_open", "room_start", "object_start", "step_complete", "purchase"] : ["first_open", "level_start", "level_complete", "rewarded_offer", "rewarded_complete"])).filter(function (s) { return names.indexOf(s) >= 0; });
  const funnel = React.useMemo(function () { return GP.funnel(F, st); }, [key, st.join()]);
  const rows = E.filter(function (e) { return !q || e.name.indexOf(q) >= 0; }).map(function (e) { return Object.assign({ id: e.name, change: e.prevCount ? GP.delta(e.count, e.prevCount) : null }, e); });
  return (
    <div>
      <PageHeader title={"Event Explorer" + (g ? " · " + g.name : "")} desc={window.ROUTES[10].desc} />
      <Callout tone="info" style={{ marginBottom: 16 }} title="Count ≠ unique users ≠ sequence">Event count is every time the event fired. Unique users counts each player once per day. Funnels below require events in order within the cohort — they aren't ratios of totals.</Callout>
      <Cols min={480}>
        <Card title="Events" actions={<Input size="sm" iconLeft="search" placeholder="Filter events" value={q} onChange={setQ} width={180} />}>
          <DataTable dense rowKey="id" rows={rows} initialSort={{ key: "count", dir: "desc" }} onRowClick={function (r) { setSel(r.name); }} rowStyle={function (r) { return r.name === ev.name ? { background: "var(--accent-soft)" } : null; }}
            columns={[{ key: "name", header: "Event", align: "left", render: function (r) { return <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.name}</span>; } }, { key: "count", header: "Count", format: fmt.int }, { key: "uu", header: "Unique users / day", format: fmt.int }, { key: "perUser", header: "Events / user", format: function (v) { return fmt.num(v, 2); } }, { key: "change", header: "Δ count", render: function (r) { return <Delta value={r.change} goodDirection="neutral" />; }, sortValue: function (r) { return r.change; } }]} />
        </Card>
        <ChartCard loading={loading} title={ev.name} subtitle="Daily trend" actions={<SegmentedControl value={measure} onChange={setMeasure} options={[{ value: "count", label: "Count" }, { value: "uu", label: "Unique users" }]} />}>
          <LineChart data={ev.trend} xKey="di" xFormat={xday} yFormat={fmt.int} series={[{ key: measure, label: measure === "count" ? "Event count" : "Unique users", color: "var(--chart-2)", area: true }]} />
        </ChartCard>
        <ChartCard loading={loading} title="Parameter explorer" subtitle={ev.name + " broken down by a parameter"} actions={<Select size="sm" value={p} onChange={setParam} options={ev.params.map(function (x) { return { value: x, label: x }; })} />}>
          <BarChart horizontal labelWidth={150} data={GP.paramBreakdown(ev, p, F).map(function (r) { return { x: r.value, v: r.count }; })} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "Count", color: "var(--chart-6)" }]} />
        </ChartCard>
        <ChartCard loading={loading} title="Funnel builder" subtitle="New-user cohort in range · ordered sequence · modeled in demo data"
          actions={<Button size="sm" iconLeft="plus" disabled={st.length >= 7} onClick={function () { setSteps(st.concat([names.find(function (n) { return st.indexOf(n) < 0; })])); }}>Add step</Button>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {st.map(function (s, i) { return <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Select size="sm" value={s} onChange={function (v) { const n = st.slice(); n[i] = v; setSteps(n); }} options={names.map(function (n) { return { value: n, label: (i + 1) + ". " + n }; })} />
              {st.length > 2 ? <IconButton size="sm" icon="x" label="Remove step" onClick={function () { setSteps(st.filter(function (_, j) { return j !== i; })); }} /> : null}
              {i < st.length - 1 ? <Icon name="chevron-right" size={14} color="var(--text-tertiary)" /> : null}
            </span>; })}
          </div>
          <FunnelChart steps={funnel} format={fmt.int} />
        </ChartCard>
      </Cols>
    </div>
  );
}

window.Pages = Object.assign(window.Pages || {}, { alerts: AlertsPage, ab: ABPage, events: EventsPage });
});
