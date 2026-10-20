window.__dsReady.then(function (DS) {
const { Card, KpiCard, DataTable, LineChart, BarChart, FunnelChart, SankeyChart, ShareBar, SegmentedControl, Tabs, Badge, Callout, Dialog, Button, MiniBar, Select } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, keyOf, useLoading, PageHeader, Grid, Cols, Section, ChartCard, NeedGame, kpi, xday, compareLabel, gameById, csv } = window;
const P = function (v) { return fmt.pct(v); }, M = function (v) { return fmt.money(v); };

function levelTotals(L) {
  if (!L) return null;
  const t = { starts: 0, wins: 0, fails: 0, exits: 0, reach: 0, boosters: 0, wtime: 0 };
  L.levels.forEach(function (l) { t.starts += l.starts; t.wins += l.wins; t.fails += l.fails; t.exits += l.exits; t.reach += l.reach; t.boosters += l.boosters; t.wtime += l.avgTime * l.wins; });
  const last = L.levels[L.levels.length - 1], l10 = L.levels[9];
  return { starts: t.starts, wins: t.wins, fails: t.fails, winRate: t.wins / t.starts, reach10: l10 ? l10.reachRate : null, reachLast: last.reachRate, drop: 1 - Math.pow(last.reach / L.levels[0].reach, 1 / L.levels.length), retry: (t.starts - t.reach) / t.starts, attempts: t.starts / t.reach, time: t.wtime / t.wins, booster: t.boosters / t.starts, exit: t.exits / t.starts };
}

/* ================= LEVEL ANALYTICS ================= */
function LevelsPage() {
  const app = useApp();
  const F = effective(app.F, "levels"); const key = keyOf(F); const loading = useLoading(key);
  const g = F.game !== "all" ? gameById(F.game) : null;
  const [detail, setDetail] = React.useState(null);
  const [metric, setMetric] = React.useState("winRate");
  const R = GP.ranges(F);
  const L = React.useMemo(function () { return g && !g.nonlinear ? GP.levels(F) : null; }, [key]);
  const Lp = React.useMemo(function () { return g && !g.nonlinear && R.cFrom != null && R.cFrom >= 0 ? GP.levels(Object.assign({}, F, { from: R.cFrom, to: R.cTo })) : null; }, [key]);
  if (!g) return <div><PageHeader title="Level Analytics" desc={window.ROUTES[4].desc} /><NeedGame reason="Level structures differ per game, so levels are analysed one game at a time." /></div>;
  if (g.nonlinear) return <NonLinear key={g.id} F={F} g={g} loading={loading} k={key} />;
  const T = levelTotals(L), Tp = levelTotals(Lp);
  const C = compareLabel(F);
  const card = function (k, label, f, o) { o = o || {}; return <KpiCard loading={loading} label={label} value={f(T[k])} delta={Tp ? GP.delta(T[k], Tp[k], o.pp) : null} deltaFormat={o.pp ? "pp" : "percent"} goodDirection={o.good || "up"} compareLabel={C} info={o.info} source="Demo · events" />; };
  const hardest = L.levels.slice().sort(function (a, b) { return a.winRate - b.winRate; })[0];
  const hp = Lp ? Lp.levels[hardest.level - 1] : null;
  const ms = [1, 5, 10, 15, 20, 25, 30, 35, 40].filter(function (n) { return n <= L.levels.length; }).map(function (n) { return { label: "Level " + n, value: L.levels[n - 1].reach }; });
  const metricDef = { winRate: ["Win rate (per attempt)", P, "var(--accent)"], avgAttempts: ["Avg. attempts per player", function (v) { return fmt.num(v, 1); }, "var(--chart-2)"], drop: ["Drop-off (players who never start the next level)", P, "var(--negative)"], boosterRate: ["Booster usage (per attempt)", P, "var(--chart-3)"] }[metric];
  const cols = [
    { key: "level", header: "Level", align: "left" }, { key: "reach", header: "Players reached", format: fmt.int }, { key: "starts", header: "Starts", format: fmt.int }, { key: "wins", header: "Wins", format: fmt.int }, { key: "fails", header: "Fails", format: fmt.int },
    { key: "winRate", header: "Win rate", render: function (r) { return <MiniBar value={r.winRate} label={P(r.winRate)} color={r.winRate < .3 ? "var(--negative)" : r.winRate > .9 ? "var(--info)" : "var(--accent)"} width={48} />; }, sortValue: function (r) { return r.winRate; } },
    { key: "avgAttempts", header: "Avg attempts", format: function (v) { return fmt.num(v, 1); } }, { key: "avgTime", header: "Avg time", format: fmt.dur },
    { key: "drop", header: "Drop-off", format: P, cellStyle: function (r) { return r.drop > .1 ? { color: "var(--negative)" } : null; } }, { key: "boosterRate", header: "Booster usage", format: P }
  ];
  return (
    <div>
      <PageHeader title={"Level Analytics · " + g.name} desc={window.ROUTES[4].desc}
        actions={<Button iconLeft="download" onClick={function () { csv("levels-" + g.id, cols.map(function (c) { return { header: c.header, key: c.key }; }), L.levels); app.toast({ tone: "positive", title: "CSV exported" }); }}>Export CSV</Button>} />
      <Callout tone={hardest.winRate < .3 ? "warning" : "info"} title={"Level " + hardest.level + " has the lowest win rate: " + P(hardest.winRate)} style={{ marginBottom: 16 }}
        action={<Button size="sm" onClick={function () { setDetail(hardest); }}>Open level</Button>}>
        Drop-off {P(hardest.drop)} · {fmt.num(hardest.avgAttempts, 1)} attempts per player{hp ? " · win rate " + (hardest.winRate < hp.winRate ? "down " : "up ") + Math.abs((hardest.winRate - hp.winRate) * 100).toFixed(1) + " pp vs comparison" : ""}. Check recent level-config or version changes before concluding a cause.
      </Callout>
      <Grid min={180}>
        {card("starts", "Level starts", fmt.int)}{card("wins", "Level completes", fmt.int)}{card("fails", "Level fails", fmt.int, { good: "down" })}
        {card("winRate", "Win rate", P, { pp: true, info: "Σ wins ÷ Σ attempts (attempt-based)." })}{card("reach10", "Reach rate · L10", P, { pp: true, info: "Players reaching level 10 ÷ players starting level 1 (player-based)." })}
        {card("drop", "Avg. drop-off / level", P, { pp: true, good: "down", info: "Geometric mean of per-level drop-off across all levels." })}{card("retry", "Retry rate", P, { pp: true, good: "neutral", info: "Repeat attempts ÷ all attempts." })}
        {card("attempts", "Avg. attempts", function (v) { return fmt.num(v, 2); }, { good: "neutral", info: "Σ attempts ÷ Σ unique players reaching each level." })}{card("time", "Avg. completion time", fmt.dur, { good: "neutral" })}
        {card("booster", "Booster usage", P, { pp: true, good: "neutral", info: "Attempts with ≥1 booster ÷ attempts." })}{card("exit", "Level exit rate", P, { pp: true, good: "down", info: "Attempts abandoned mid-level ÷ attempts." })}
      </Grid>
      <Section title="Progression">
        <Cols min={440}>
          <ChartCard loading={loading} title="Level completion funnel" subtitle="Unique players reaching each milestone"><FunnelChart steps={ms} /></ChartCard>
          <ChartCard loading={loading} title={metricDef[0]} subtitle="Click a bar for level detail"
            actions={<SegmentedControl value={metric} onChange={setMetric} options={[{ value: "winRate", label: "Win rate" }, { value: "avgAttempts", label: "Attempts" }, { value: "drop", label: "Drop-off" }, { value: "boosterRate", label: "Boosters" }]} />}>
            <BarChart data={L.levels} xKey="level" xFormat={function (v, t) { return t ? "Level " + v : v; }} yFormat={metricDef[1]} highlightKey={detail ? detail.level : undefined} onBarClick={setDetail} series={[{ key: metric, label: metricDef[0], color: metricDef[2] }]} />
          </ChartCard>
          <ChartCard loading={loading} title="Reach rate by level" subtitle="Share of starting players reaching each level">
            <LineChart data={L.levels} xKey="level" xFormat={function (v, t) { return t ? "Level " + v : v; }} yFormat={function (v) { return fmt.pct(v, 0); }} yMin={0} zoomable series={[{ key: "reachRate", label: "Reach rate", color: "var(--accent)", area: true }]} />
          </ChartCard>
          <ChartCard loading={loading} title={"Completion time · Level " + (detail || hardest).level} subtitle="Distribution of winning attempts">
            <BarChart data={GP.levelTimeDist(detail || hardest)} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "Wins", color: "var(--chart-7)" }]} />
          </ChartCard>
        </Cols>
      </Section>
      <Section title="Level performance">
        <Card><DataTable dense rowKey="level" rows={L.levels} columns={cols} pageSize={15} onRowClick={setDetail} footerNote="Rates in this table: win rate & booster usage per attempt; drop-off per unique player." /></Card>
      </Section>
      <LevelDialog lv={detail} g={g} onClose={function () { setDetail(null); }} />
    </div>
  );
}
function LevelDialog({ lv, g, onClose }) {
  if (!lv) return null;
  const items = [["Total attempts", fmt.full(lv.starts)], ["Unique players", fmt.full(lv.reach)], ["Wins", fmt.full(lv.wins)], ["Fails", fmt.full(lv.fails)], ["Retries", fmt.full(lv.starts - lv.reach)], ["Avg. playtime / attempt", fmt.dur(lv.avgTime)], ["Booster uses", fmt.full(lv.boosters)], ["Ad impressions", fmt.full(lv.adImps)], ["Revenue (ads + boosters)", fmt.money(lv.rev, true)], ["Exit rate", P(lv.exitRate)]];
  return (
    <Dialog open onClose={onClose} width={620} title={g.name + " · Level " + lv.level} description="Attempt-based and player-based rates are shown separately.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {items.map(function (it) { return <div key={it[0]} style={{ padding: 12, borderRadius: 10, background: "var(--bg-sunken)" }}><div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{it[0]}</div><div style={{ font: "600 18px/1.3 var(--font-sans)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{it[1]}</div></div>; })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border-subtle)" }}><div style={{ font: "var(--type-label)", marginBottom: 8 }}>Per attempt</div><Row k="Win rate" v={P(lv.winRate)} /><Row k="Fail rate" v={P(lv.fails / lv.starts)} /><Row k="Booster usage" v={P(lv.boosterRate)} /><Row k="Exit rate" v={P(lv.exitRate)} /></div>
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border-subtle)" }}><div style={{ font: "var(--type-label)", marginBottom: 8 }}>Per unique player</div><Row k="Completion rate" v={P(lv.completionRate)} /><Row k="Avg. attempts" v={fmt.num(lv.avgAttempts, 2)} /><Row k="Drop-off" v={P(lv.drop)} /><Row k="Reach rate" v={P(lv.reachRate)} /></div>
      </div>
    </Dialog>
  );
}
function Row({ k, v }) { return <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "var(--text-secondary)" }}><span>{k}</span><b style={{ color: "var(--text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{v}</b></div>; }

function NonLinear({ F, g, loading, k }) {
  const NL = React.useMemo(function () { return GP.nonlinear(F); }, [k]);
  const [obj, setObj] = React.useState(null);
  const objects = []; NL.rooms.forEach(function (r) { r.objects.forEach(function (o) { objects.push(Object.assign({ id: r.id + ":" + o.name, room: r.name }, o)); }); });
  const sel = obj ? objects.find(function (o) { return o.id === obj; }) : objects.slice().sort(function (a, b) { return a.compRate - b.compRate; })[0];
  const tot = objects.reduce(function (a, o) { a.st += o.starts; a.cp += o.completes; a.t += o.time * o.starts; o.steps.forEach(function (s) { a.se += s.entered; a.sc += s.completed; }); return a; }, { st: 0, cp: 0, t: 0, se: 0, sc: 0 });
  const reachSum = NL.rooms.reduce(function (a, r) { return a + r.reach; }, 0);
  const names = {}; D.ROOMS.forEach(function (r) { names[r.id] = r.name; });
  const C = "Demo · events";
  return (
    <div>
      <PageHeader title={"Level Analytics · " + g.name} desc="Non-linear structure: Room → Object → Step. Players choose their own order, so progress is shown as reach, completion and paths — not a single linear funnel." meta={[<Badge key="n" tone="info" icon="git-fork">Non-linear gameplay</Badge>]} />
      <Grid min={180}>
        <KpiCard loading={loading} label="Players" value={fmt.int(NL.players)} source={C} info="New players in range who opened the game." />
        <KpiCard loading={loading} label="Avg. room reach rate" value={P(reachSum / NL.rooms.length / (NL.players || 1))} source={C} info="Mean over rooms of players entering the room ÷ players." />
        <KpiCard loading={loading} label="Object start rate" value={P(tot.st / reachSum / 3)} source={C} info="Object starts ÷ (room visitors × objects per room)." />
        <KpiCard loading={loading} label="Object completion rate" value={P(tot.cp / tot.st)} source={C} info="Objects completed ÷ objects started." />
        <KpiCard loading={loading} label="Step completion rate" value={P(tot.sc / tot.se)} source={C} />
        <KpiCard loading={loading} label="Step abandonment" value={P(1 - tot.sc / tot.se)} goodDirection="down" source={C} />
        <KpiCard loading={loading} label="Time per object" value={fmt.dur(tot.t / tot.st)} source={C} />
      </Grid>
      <Section title="Paths">
        <ChartCard loading={loading} height={320} title="Player path (first three rooms)" subtitle="Where players go after first open — hover a flow for volume">
          <SankeyChart nodes={NL.sankey.nodes} links={NL.sankey.links} height={320} format={fmt.int} />
        </ChartCard>
        <div style={{ height: 12 }}></div>
        <Cols min={440}>
          <ChartCard loading={loading} title="Transition matrix" subtitle="Row = current room, column = next room (share of exits from the row)">
            <div style={{ overflow: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 2, font: "400 11.5px/1 var(--font-sans)", fontVariantNumeric: "tabular-nums", width: "100%" }}>
                <thead><tr><th></th>{NL.ids.map(function (id) { return <th key={id} style={{ padding: "0 4px 6px", color: "var(--text-tertiary)", fontWeight: 500 }}>{names[id]}</th>; })}<th style={{ padding: "0 4px 6px", color: "var(--text-tertiary)", fontWeight: 500 }}>Exit</th></tr></thead>
                <tbody>{NL.matrix.map(function (row) { return <tr key={row.from}><td style={{ paddingRight: 8, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{names[row.from]}</td>
                  {row.to.map(function (v, j) { return <td key={j} style={{ textAlign: "center", height: 28, borderRadius: 4, background: v ? "rgba(var(--heat-base)," + (.06 + v * 1.6).toFixed(2) + ")" : "transparent", color: v > .3 ? "var(--text-on-accent)" : "var(--text-primary)" }}>{v ? P(v) : "—"}</td>; })}
                  <td style={{ textAlign: "center", borderRadius: 4, background: "var(--negative-soft)", color: "var(--negative)" }}>{P(row.exit)}</td></tr>; })}</tbody>
              </table>
            </div>
          </ChartCard>
          <ChartCard loading={loading} title="Room reach rate"><BarChart horizontal data={NL.rooms} xKey="name" yFormat={P} series={[{ key: "reachRate", label: "Reach rate", color: "var(--chart-3)" }]} /></ChartCard>
        </Cols>
      </Section>
      <Section title="Objects & steps">
        <Cols min={440}>
          <Card title="Objects" subtitle="Click an object to see its steps">
            <DataTable dense rowKey="id" rows={objects} pageSize={9} initialSort={{ key: "compRate", dir: "asc" }} onRowClick={function (r) { setObj(r.id); }}
              rowStyle={function (r) { return sel && r.id === sel.id ? { background: "var(--accent-soft)" } : null; }}
              columns={[{ key: "room", header: "Room", align: "left" }, { key: "name", header: "Object", align: "left" }, { key: "starts", header: "Starts", format: fmt.int }, { key: "startRate", header: "Start rate", format: P }, { key: "compRate", header: "Completion", render: function (r) { return <MiniBar value={r.compRate} label={P(r.compRate)} width={44} color={r.compRate < .4 ? "var(--negative)" : "var(--accent)"} />; }, sortValue: function (r) { return r.compRate; } }, { key: "time", header: "Time", format: fmt.dur }]} />
          </Card>
          <ChartCard loading={loading} title={"Steps · " + sel.room + " / " + sel.name} subtitle="Steps inside one object are sequential, so a funnel applies here">
            <FunnelChart steps={sel.steps.map(function (s) { return { label: "Step " + s.step, value: s.completed }; })} color="var(--chart-3)" />
          </ChartCard>
        </Cols>
      </Section>
    </div>
  );
}

/* ================= MONETIZATION ================= */
const PRODUCTS = [{ id: "gems_small", name: "Gems · small", type: "Consumable", price: .99, share: .31 }, { id: "remove_ads", name: "Remove ads", type: "Non-consumable", price: 2.99, share: .29 }, { id: "starter_pack", name: "Starter pack", type: "Consumable", price: 4.99, share: .18 }, { id: "gems_large", name: "Gems · large", type: "Consumable", price: 9.99, share: .12 }, { id: "vip_weekly", name: "VIP weekly", type: "Subscription", price: 3.99, share: .1 }];
const NETWORKS = [["AppLovin", .41], ["AdMob", .27], ["Unity Ads", .12], ["Mintegral", .09], ["Meta Audience Network", .07], ["Other", .04]];
function MonetizationPage() {
  const app = useApp();
  const F = effective(app.F, "monetization"); const key = keyOf(F); const loading = useLoading(key);
  const [tab, setTab] = React.useState("overview");
  const [net, setNet] = React.useState("gross");
  const [ecpmF, setEcpmF] = React.useState("all");
  const S = React.useMemo(function () { return GP.summary(F); }, [key]);
  const g = F.game !== "all" ? gameById(F.game) : null;
  const L = React.useMemo(function () { return g && !g.nonlinear ? GP.levels(F) : null; }, [key]);
  const C = compareLabel(F), k = S.k;
  const byC = Object.keys(S.cur.byCountry).map(function (c) { const d = GP.derive(S.cur.byCountry[c], S.R.len); return { c: (D.COUNTRIES.find(function (x) { return x.code === c; }) || {}).name, iaa: d.iaa, iap: d.iap, arpdau: d.arpdau, ecpm: d.ecpm }; }).sort(function (a, b) { return b.iaa + b.iap - a.iaa - a.iap; });
  const byP = Object.keys(S.cur.byPlatform).map(function (p) { const d = GP.derive(S.cur.byPlatform[p], S.R.len); return { label: p === "ios" ? "iOS" : "Android", value: d.rev, color: p === "ios" ? "var(--chart-6)" : "var(--chart-5)" }; });
  const fmts = [["inter", "Interstitial", "ii", "ri", "var(--chart-2)"], ["rew", "Rewarded", "ir", "rr", "var(--chart-6)"], ["banner", "Banner", "ib", "rb", "var(--chart-7)"], ["appopen", "App open", "ia", "ra", "var(--chart-4)"]].filter(function (f) { return k[f[2]] > 0; });
  const fmtRows = fmts.map(function (f) { return { id: f[0], name: f[1], imps: k[f[2]], ipd: k[f[2]] / k.dauSum, ecpm: k[f[3]] / k[f[2]] * 1000, rev: k[f[3]], share: k[f[3]] / k.iaa, color: f[4], prevIpd: S.pk ? S.pk[f[2]] / S.pk.dauSum : null, prevEcpm: S.pk ? S.pk[f[3]] / S.pk[f[2]] * 1000 : null }; });
  const series = S.series.map(function (d) { return Object.assign({}, d); });
  const iapRev = net === "gross" ? k.iap : k.iapNet;
  const ppf = function (v) { return net === "gross" ? v : v * (1 - .024) * .7; };
  const tabs = [{ value: "overview", label: "Overview" }, { value: "ads", label: "Ad monetization" }, { value: "iap", label: "In-app purchases" }];
  return (
    <div>
      <PageHeader title={"Monetization" + (g ? " · " + g.name : "")} desc={window.ROUTES[5].desc} />
      <Tabs items={tabs} value={tab} onChange={setTab} style={{ marginBottom: 16 }} />
      {tab === "overview" ? <>
        <Grid min={190}>
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "rev", "Total revenue", M, { color: "var(--metric-total)", info: "IAA + IAP gross, USD at fixed demo FX." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "iaa", "IAA revenue", M, { color: "var(--metric-iaa)", source: "Demo · ad networks" })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "iap", "IAP revenue (gross)", M, { color: "var(--metric-iap)", source: "Demo · stores" })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "arpdau", "ARPDAU", M, { color: "var(--metric-total)", info: "Σ revenue ÷ Σ DAU." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "arpu", "ARPU", M, { noSpark: true, info: "Revenue ÷ unique active users in range (WAU/MAU, modeled)." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "revPerSession", "Revenue / session", function (v) { return fmt.money(v, true); })} />
          <KpiCard loading={loading} label="Revenue / new user" value={fmt.money(k.rev / k.newUsers)} delta={S.pk ? GP.delta(k.rev / k.newUsers, S.pk.rev / S.pk.newUsers) : null} compareLabel={C} info="Period revenue ÷ new users in the period. Not an LTV — see User Acquisition for cohort LTV." source="Demo data" />
        </Grid>
        <Section title="Revenue">
          <Cols min={440}>
            <ChartCard loading={loading} title="Revenue trend" subtitle="Daily IAA + IAP"><BarChart stacked data={series} xKey="di" xFormat={xday} yFormat={M} series={[{ key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }]} /></ChartCard>
            <ChartCard loading={loading} title="Revenue by country"><BarChart horizontal stacked data={byC} xKey="c" yFormat={M} series={[{ key: "iaa", label: "IAA", color: "var(--metric-iaa)" }, { key: "iap", label: "IAP", color: "var(--metric-iap)" }]} /></ChartCard>
            <ChartCard loading={loading} title="Revenue by platform" height={120}><ShareBar height={12} format={M} segments={byP} /><div style={{ height: 18 }}></div><ShareBar height={8} format={M} segments={[{ label: "IAA", value: k.iaa, color: "var(--metric-iaa)" }, { label: "IAP", value: k.iap, color: "var(--metric-iap)" }]} /></ChartCard>
            <ChartCard loading={loading} title="ARPDAU by country"><BarChart horizontal data={byC.slice().sort(function (a, b) { return b.arpdau - a.arpdau; })} xKey="c" yFormat={function (v) { return fmt.money(v, true); }} series={[{ key: "arpdau", label: "ARPDAU", color: "var(--metric-total)" }]} /></ChartCard>
          </Cols>
        </Section>
      </> : null}
      {tab === "ads" ? <>
        <Grid min={180}>
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "iaa", "Ad revenue", M, { color: "var(--metric-iaa)", source: "Demo · MAX / AdMob" })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "imps", "Ad impressions", fmt.int, { color: "var(--chart-2)" })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "ecpm", "eCPM", function (v) { return fmt.money(v, true); }, { color: "var(--chart-2)", info: "Ad revenue ÷ impressions × 1000 (all formats)." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "ipd", "Impressions / DAU", function (v) { return fmt.num(v, 1); }, { info: "All formats. Per-format values in the table below." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "adArpdau", "Ad ARPDAU", function (v) { return fmt.money(v, true); }, { color: "var(--metric-iaa)" })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "rewOptIn", "Rewarded opt-in rate", P, { pp: true, info: "Rewarded starts ÷ rewarded offers shown." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "rewComp", "Rewarded completion", P, { pp: true, info: "Rewarded completes ÷ starts." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "loadRate", "Ad load success", P, { pp: true, info: "Ads loaded ÷ ad requests." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "showRate", "Ad show rate", P, { pp: true, info: "Impressions ÷ ads loaded." })} />
        </Grid>
        <Section title="By format">
          <Card>
            <DataTable rowKey="id" rows={fmtRows} columns={[{ key: "name", header: "Format", align: "left", render: function (r) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }}></span>{r.name}</span>; } },
              { key: "imps", header: "Impressions", format: fmt.int }, { key: "ipd", header: "Imp / DAU", render: function (r) { return <span>{fmt.num(r.ipd, 2)} {r.prevIpd != null ? <DS.Delta value={GP.delta(r.ipd, r.prevIpd)} goodDirection="neutral" /> : null}</span>; }, sortValue: function (r) { return r.ipd; } },
              { key: "ecpm", header: "eCPM", render: function (r) { return <span>{fmt.money(r.ecpm, true)} {r.prevEcpm != null ? <DS.Delta value={GP.delta(r.ecpm, r.prevEcpm)} /> : null}</span>; }, sortValue: function (r) { return r.ecpm; } },
              { key: "rev", header: "Revenue", format: M }, { key: "share", header: "Share", render: function (r) { return <MiniBar value={r.share} label={P(r.share)} color={r.color} width={56} />; }, sortValue: function (r) { return r.share; } }]} />
          </Card>
        </Section>
        <Section title="Trends">
          <Cols min={440}>
            <ChartCard loading={loading} title="Ad revenue by format"><BarChart stacked data={series} xKey="di" xFormat={xday} yFormat={M} series={fmts.map(function (f) { return { key: f[3], label: f[1], color: f[4] }; })} /></ChartCard>
            <ChartCard loading={loading} title="eCPM trend" actions={<SegmentedControl value={ecpmF} onChange={setEcpmF} options={[{ value: "all", label: "Blended" }, { value: "split", label: "By format" }]} />}>
              <LineChart data={series} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.money(v, true); }} series={ecpmF === "all" ? [{ key: "ecpm", label: "Blended eCPM", color: "var(--chart-2)", area: true }] : [["ecpmInter", "Interstitial", "var(--chart-2)"], ["ecpmRew", "Rewarded", "var(--chart-6)"], ["ecpmBanner", "Banner", "var(--chart-7)"], ["ecpmAppOpen", "App open", "var(--chart-4)"]].filter(function (s) { return series.some(function (d) { return d[s[0]] != null; }); }).map(function (s) { return { key: s[0], label: s[1], color: s[2] }; })} />
            </ChartCard>
            <ChartCard loading={loading} title="Impressions / DAU by format" subtitle="Interstitial · rewarded · banner · app open">
              <LineChart data={series} xKey="di" xFormat={xday} yFormat={function (v) { return fmt.num(v, 1); }} series={[["ipdInter", "Interstitial", "var(--chart-2)"], ["ipdRew", "Rewarded", "var(--chart-6)"], ["ipdAppOpen", "App open", "var(--chart-4)"]].filter(function (s) { return k[s[0]] > 0; }).map(function (s) { return { key: s[0], label: s[1], color: s[2] }; }).concat(k.ipdBanner > 0 ? [{ key: "ipdBanner", label: "Banner (right axis)", color: "var(--chart-7)", axis: "right" }] : [])} yFormatRight={function (v) { return fmt.num(v, 0); }} />
            </ChartCard>
            <ChartCard loading={loading} title="Ad revenue by country"><BarChart horizontal data={byC} xKey="c" yFormat={M} series={[{ key: "iaa", label: "Ad revenue", color: "var(--metric-iaa)" }]} /></ChartCard>
            <ChartCard loading={loading} title="Revenue by ad network" info="Network split is modeled in demo data; real values come from the mediation report (AppLovin MAX / AdMob).">
              <BarChart horizontal data={NETWORKS.map(function (n) { return { x: n[0], v: k.iaa * n[1] }; })} xKey="x" labelWidth={150} yFormat={M} series={[{ key: "v", label: "Revenue", color: "var(--chart-2)" }]} />
            </ChartCard>
            <ChartCard loading={loading} title="Ad revenue by level">
              {L ? <BarChart data={L.levels} xKey="level" xFormat={function (v, t) { return t ? "Level " + v : v; }} yFormat={M} series={[{ key: "rev", label: "Ad revenue", color: "var(--metric-iaa)" }]} /> :
                <div style={{ color: "var(--text-tertiary)", padding: "24px 0" }}>{g ? "This game has non-linear progression; see Level Analytics for room/object revenue." : "Select a single game to see revenue by level."}</div>}
            </ChartCard>
          </Cols>
        </Section>
      </> : null}
      {tab === "iap" ? <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <SegmentedControl size="md" value={net} onChange={setNet} options={[{ value: "gross", label: "Gross" }, { value: "net", label: "Net" }]} />
          <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{net === "gross" ? "Gross = price paid by players, before refunds and store fees." : "Net = gross − refunds − 30% store fee. Demo uses a flat 30%; real stores vary (15% for small-business / renewed subscriptions)."} Currency: {GP.cfg.currency} at fixed demo FX.</span>
        </div>
        <Grid min={180}>
          <KpiCard loading={loading} label={"IAP revenue (" + net + ")"} value={M(iapRev)} delta={S.pk ? GP.delta(iapRev, net === "gross" ? S.pk.iap : S.pk.iapNet) : null} compareLabel={C} spark={series.map(function (d) { return ppf(d.iap); })} color="var(--metric-iap)" source="Demo · stores" />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "payers", "Paying user-days", fmt.int, { color: "var(--metric-iap)", info: "Σ daily payers. Unique payers over the range need user-level data (backend)." })} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "payerConv", "Daily payer conversion", function (v) { return fmt.pct(v, 2); }, { pp: true, info: "Σ payers ÷ Σ DAU." })} />
          <KpiCard loading={loading} label="ARPPU" value={fmt.money(ppf(k.arppu), true)} delta={S.pk ? GP.delta(k.arppu, S.pk.arppu) : null} compareLabel={C} info="IAP revenue ÷ paying user-days." source="Demo · stores" />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "purchases", "Purchases", fmt.int)} />
          <KpiCard loading={loading} compareLabel={C} {...kpi(S, "firstPurchConv", "First-purchase conversion", function (v) { return fmt.pct(v, 2); }, { pp: true, info: "First-time purchasers ÷ new users in the period." })} />
          <KpiCard loading={loading} label="Subscription revenue" value={M(ppf(k.subRev))} delta={S.pk ? GP.delta(k.subRev, S.pk.subRev) : null} compareLabel={C} source="Demo · stores" />
          <KpiCard loading={loading} label="Subscription renewal" value={k.subRev > 0 ? "68.4%" : "—"} delta={null} compareLabel={k.subRev > 0 ? "churn 31.6% · modeled" : "no subscriptions"} source="Demo · stores" info="Renewals ÷ subscriptions due. Fixed modeled value in demo; needs store server notifications." />
          <KpiCard loading={loading} label="Refunds" value={M(k.refunds)} delta={S.pk ? GP.delta(k.refunds, S.pk.refunds) : null} goodDirection="down" compareLabel={C} source="Demo · stores" />
        </Grid>
        <Section title="Purchases">
          <Cols min={440}>
            <ChartCard loading={loading} title="IAP revenue trend"><LineChart data={series.map(function (d) { return { di: d.di, v: ppf(d.iap) }; })} xKey="di" xFormat={xday} yFormat={M} series={[{ key: "v", label: "IAP " + net, color: "var(--metric-iap)", area: true }]} /></ChartCard>
            <ChartCard loading={loading} title="Top-selling products" info="Product split is modeled in demo data."><BarChart horizontal data={PRODUCTS.map(function (p) { return { x: p.name, v: ppf(k.iap) * p.share }; })} xKey="x" yFormat={M} series={[{ key: "v", label: "Revenue", color: "var(--metric-iap)" }]} /></ChartCard>
            <ChartCard loading={loading} title="Level at first purchase" subtitle="Share of first-time purchasers">
              <BarChart data={[["1–5", .18], ["6–10", .27], ["11–20", .29], ["21–30", .16], ["31+", .1]].map(function (b) { return { x: "L" + b[0], v: k.firstPurch * b[1] }; })} xKey="x" yFormat={fmt.int} series={[{ key: "v", label: "First purchases", color: "var(--chart-3)" }]} />
            </ChartCard>
            <ChartCard loading={loading} title="Purchase funnel" subtitle="Unique user-days per step">
              <FunnelChart color="var(--metric-iap)" steps={[{ label: "Store opened", value: k.dauSum * .11 }, { label: "Product viewed", value: k.dauSum * .066 }, { label: "Purchase started", value: k.purchases * 1.65 }, { label: "Purchase completed", value: k.purchases }]} />
            </ChartCard>
            <ChartCard loading={loading} title="Revenue by product type" height={100}>
              <ShareBar height={12} format={M} segments={["Consumable", "Non-consumable", "Subscription"].map(function (t, i) { return { label: t, value: ppf(k.iap) * PRODUCTS.filter(function (p) { return p.type === t; }).reduce(function (a, p) { return a + p.share; }, 0), color: ["var(--chart-3)", "var(--chart-8)", "var(--chart-6)"][i] }; })} />
            </ChartCard>
          </Cols>
        </Section>
      </> : null}
    </div>
  );
}

window.Pages = Object.assign(window.Pages || {}, { levels: LevelsPage, monetization: MonetizationPage });
});
