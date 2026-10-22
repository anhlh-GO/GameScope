window.__dsReady.then(function (DS) {
const { Card, Button, IconButton, Badge, Callout, LineChart, BarChart, Icon, GameAvatar, Tooltip } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;
const { useApp, effective, PageHeader, gameById, xday } = window;

const METRICS = {
  dau: ["DAU", "users"], newUsers: ["New users", "users"], sessions: ["Sessions", "users"], spd: ["Sessions / DAU", "ratio"], avgSess: ["Avg. session length", "time"], engPerDau: ["Engagement time / DAU", "time"],
  rev: ["Total revenue", "money"], iaa: ["IAA revenue", "money"], iap: ["IAP revenue", "money"], arpdau: ["ARPDAU", "money"], ecpm: ["eCPM", "money"], ipd: ["Impressions / DAU (all)", "ratio"],
  ipdInter: ["Impressions / DAU · interstitial", "ratio"], ipdRew: ["Impressions / DAU · rewarded", "ratio"], ipdBanner: ["Impressions / DAU · banner", "ratio"], spend: ["UA spend", "money"], cpi: ["CPI", "money"], payerConv: ["Payer conversion", "pct"]
};
const UF = { users: fmt.int, ratio: function (v) { return fmt.num(v); }, time: fmt.dur, money: function (v) { return fmt.money(v, Math.abs(v) < 10); }, pct: function (v) { return fmt.pct(v, 2); } };
const r4 = function (v) { return v == null || !isFinite(v) ? null : Math.round(v * 10000) / 10000; };

function scopeOf(F, a) {
  a = a || {};
  const days = a.days ? Math.max(1, Math.min(90, a.days | 0)) : null;
  const from = days ? D.N - days : F.from, to = days ? D.N - 1 : F.to;
  const game = a.game && a.game !== "all" ? (gameById(a.game) ? a.game : (D.GAMES.find(function (g) { return g.name.toLowerCase() === String(a.game).toLowerCase(); }) || {}).id || "all") : a.game === "all" ? "all" : F.game;
  return Object.assign({}, F, { game: game, from: from, to: to, compare: a.compare === "none" ? "none" : "prev" });
}
function pick(k) {
  const o = {}; Object.keys(METRICS).forEach(function (m) { o[m] = r4(k[m]); });
  o.wau = r4(k.wau); o.mau = r4(k.mau); o.payers = r4(k.payers); o.installs = r4(k.installs); o.organicInstalls = r4(k.orgI); o.paidInstalls = r4(k.paidI); o.rewardedOptIn = r4(k.rewOptIn); o.adLoadSuccess = r4(k.loadRate);
  return o;
}
function period(S) { return { from: D.iso(D.dates[S.R.from]), to: D.iso(D.dates[S.R.to]), days: S.R.len, compareFrom: S.R.cFrom != null ? D.iso(D.dates[S.R.cFrom]) : null, compareTo: S.R.cTo != null ? D.iso(D.dates[S.R.cTo]) : null }; }

function buildTools(getF, onChart, onLog) {
  function T(name, description, props, required, run) {
    return { name: name, description: description, input_schema: { type: "object", properties: props, required: required || [] }, run: async function (input) { const t0 = Date.now(); try { const out = run(input || {}); onLog({ name: name, input: input, ok: true, ms: Date.now() - t0 }); return JSON.stringify(out); } catch (e) { onLog({ name: name, input: input, ok: false }); throw e; } } };
  }
  const G = { type: "string", description: "Game id (tile-voyage, merge-kingdom, sky-dash, word-bloom, manor-escape, brick-smash) or 'all'. Omit to use the dashboard's current game filter." };
  const DY = { type: "integer", description: "Look-back window in days ending on the last finalized day (1–90). Omit to use the dashboard's current date range." };
  return [
    T("list_games", "List games in the portfolio with id, genre and latest version.", {}, [], function () { return D.GAMES.map(function (g) { return { id: g.id, name: g.name, genre: g.genre, latestVersion: g.versions[g.versions.length - 1].v, nonLinear: !!g.nonlinear }; }); }),
    T("get_kpis", "Core KPIs for a scope, with the comparison period (previous period of equal length). Rates are fractions (0.38 = 38%); money in USD; time in seconds. DAU is the period average; for 'all' games it is a sum of per-game DAU (not unique).", { game: G, days: DY }, [], function (a) {
      const F = scopeOf(getF(), a); const S = GP.summary(F); const R = GP.retention(F);
      return { scope: { game: F.game, platform: F.platform, countries: F.countries.length ? F.countries : "all" }, period: period(S), current: Object.assign(pick(S.k), { d1Retention: r4(R.classic[1]), d7Retention: r4(R.classic[7]) }), previous: S.pk ? Object.assign(pick(S.pk), { d1Retention: r4(R.prev && R.prev[1]), d7Retention: r4(R.prev && R.prev[7]) }) : null, note: D.LIVE ? "Live GA4 data (retention, UA spend and ad-format split not connected)" : "Demo data" };
    }),
    T("get_breakdown", "Break a metric down by country, platform or game for a scope.", { metric: { type: "string", enum: Object.keys(METRICS) }, dimension: { type: "string", enum: ["country", "platform", "game"] }, game: G, days: DY }, ["metric", "dimension"], function (a) {
      const F = scopeOf(getF(), a); const S = GP.summary(F); const src = a.dimension === "country" ? S.cur.byCountry : a.dimension === "platform" ? S.cur.byPlatform : S.cur.byGame;
      return { metric: a.metric, period: period(S), rows: Object.keys(src).map(function (k) { return { key: a.dimension === "game" ? gameById(k).name : k, value: r4(GP.derive(src[k], S.R.len)[a.metric]) }; }).sort(function (x, y) { return (y.value || 0) - (x.value || 0); }) };
    }),
    T("get_timeseries", "Daily values of a metric (max 90 points).", { metric: { type: "string", enum: Object.keys(METRICS) }, game: G, days: DY }, ["metric"], function (a) {
      const F = scopeOf(getF(), a); const S = GP.summary(F);
      return { metric: a.metric, points: S.series.map(function (d) { return [D.iso(D.dates[d.di]), r4(d[a.metric])]; }) };
    }),
    T("get_retention", "Classic cohort retention D1–D14 and D30, cohort-size weighted, mature cohorts only (null = no mature cohort). Also by-platform and by-country D1/D7.", { game: G, days: DY }, [], function (a) {
      const F = scopeOf(getF(), a); const R = GP.retention(F); const out = {}; GP.RN.forEach(function (n) { out["d" + n] = r4(R.classic[n]); });
      const prev = {}; if (R.prev) GP.RN.forEach(function (n) { prev["d" + n] = r4(R.prev[n]); });
      return { classic: out, previous: R.prev ? prev : null, coverage: { d7: r4(R.coverage[7]), d14: r4(R.coverage[14]), d30: r4(R.coverage[30]) }, byPlatform: GP.retentionBy(F, "platform").map(function (x) { return { key: x.key, d1: r4(x.r[1]), d7: r4(x.r[7]) }; }), byCountry: GP.retentionBy(F, "country").map(function (x) { return { key: x.key, cohortUsers: Math.round(x.size), d1: r4(x.r[1]), d7: r4(x.r[7]) }; }) };
    }),
    T("get_alerts", "Currently open anomaly alerts across the portfolio (last 7 days vs prior 7).", {}, [], function () { return window.GP.runAlerts().map(function (x) { return { severity: x.severity, game: x.game, metric: x.label, current: r4(x.current), previous: r4(x.previous), change: r4(x.change), changeUnit: x.pp ? "percentage points (fraction)" : "relative", segment: x.segment }; }); }),
    T("get_levels", "Level funnel stats for a linear-progression game: the 6 hardest levels by win rate plus totals. Not available for non-linear games.", { game: G, days: DY }, [], function (a) {
      const F = scopeOf(getF(), a); const L = GP.levels(F); if (!L) return { error: "Pick a single linear game (not 'all', not manor-escape)." };
      return { game: L.game.name, players: Math.round(L.players), hardest: L.levels.slice().sort(function (x, y) { return x.winRate - y.winRate; }).slice(0, 6).map(function (l) { return { level: l.level, winRate: r4(l.winRate), dropOff: r4(l.drop), avgAttempts: r4(l.avgAttempts), boosterRate: r4(l.boosterRate) }; }) };
    }),
    T("get_campaigns", "UA campaigns for a single game: spend, installs, CPI, D1/D7 retention, D7/D30 ROAS (null = cohorts too young).", { game: G, days: DY }, [], function (a) {
      const F = scopeOf(getF(), a); const U = GP.uaSummary(F);
      return { totals: { spend: r4(U.spend), installs: Math.round(U.installs), cpi: r4(U.cpi), roasD7: r4(U.roas[7]), roasD30: r4(U.roas[30]), d7Maturity: r4(U.maturity[7]) }, campaigns: U.list.sort(function (x, y) { return y.spend - x.spend; }).slice(0, 10).map(function (c) { return { source: c.source, campaign: c.name, spend: r4(c.spend), installs: Math.round(c.installs), cpi: r4(c.cpi), d1: r4(c.d1), d7: r4(c.d7), roasD7: r4(c.roas[7]), roasD30: r4(c.roas[30]) }; }) };
    }),
    T("get_tech_health", "Crash-free users/sessions, ANR rate, crash rate by app version and top crash issues.", { game: G, days: DY }, [], function (a) {
      const F = scopeOf(getF(), a); const t = GP.tech(F);
      return { total: { crashFreeUsers: r4(t.total.crashFreeUsers), crashFreeSessions: r4(t.total.crashFreeSessions), anrRate: r4(t.total.anrRate), avgLoadSec: r4(t.total.load) }, versions: t.versions.map(function (v) { return { game: v.game, version: v.v, adoption: r4(v.lastShare), crashFreeUsers: r4(v.crashFree) }; }), topIssues: t.issues.slice(0, 5).map(function (i) { return { game: i.game, title: i.title, severity: i.sev, users7d: Math.round(i.users), versions: i.versions }; }) };
    }),
    T("render_chart", "Show a chart in the chat. The app computes the data itself from the dashboard, so numbers always match. Use 'timeseries' for trends (one metric, one or more games) and 'breakdown' for a ranked bar chart.", {
      kind: { type: "string", enum: ["timeseries", "breakdown"] }, metric: { type: "string", enum: Object.keys(METRICS) }, games: { type: "array", items: { type: "string" }, description: "timeseries only: game ids to plot as separate lines; omit for the current scope" }, dimension: { type: "string", enum: ["country", "platform", "game"], description: "breakdown only" }, days: DY, title: { type: "string" }
    }, ["kind", "metric"], function (a) {
      const base = getF(); const m = METRICS[a.metric]; if (!m) throw new Error("unknown metric");
      let spec;
      if (a.kind === "breakdown") {
        const F = scopeOf(base, a); const S = GP.summary(F); const dim = a.dimension || "country"; const src = dim === "country" ? S.cur.byCountry : dim === "platform" ? S.cur.byPlatform : S.cur.byGame;
        spec = { kind: "breakdown", unit: m[1], title: a.title || m[0] + " by " + dim, sub: fmt.day(S.R.from) + " – " + fmt.day(S.R.to), rows: Object.keys(src).map(function (k) { return { x: dim === "game" ? gameById(k).name : dim === "country" ? ((D.COUNTRIES.find(function (c) { return c.code === k; }) || {}).name || k) : (k === "ios" ? "iOS" : "Android"), v: GP.derive(src[k], S.R.len)[a.metric] }; }).sort(function (x, y) { return y.v - x.v; }), label: m[0] };
      } else {
        const ids = a.games && a.games.length ? a.games.filter(function (g) { return g === "all" || gameById(g); }) : [scopeOf(base, a).game];
        const rows = {}; const series = [];
        ids.slice(0, 6).forEach(function (gid, i) {
          const F = scopeOf(base, Object.assign({}, a, { game: gid })); const S = GP.summary(F); const g = gameById(gid);
          series.push({ key: "s" + i, label: g ? g.name : "All games", color: g ? g.color : "var(--accent)", area: ids.length === 1 });
          S.series.forEach(function (d) { (rows[d.di] = rows[d.di] || { di: d.di })["s" + i] = d[a.metric]; });
          spec = { sub: fmt.day(S.R.from) + " – " + fmt.day(S.R.to) };
        });
        spec = Object.assign(spec, { kind: "timeseries", unit: m[1], title: a.title || m[0], rows: Object.values(rows).sort(function (x, y) { return x.di - y.di; }), series: series });
      }
      onChart(spec);
      return { shown: true, points: spec.rows.length };
    })
  ];
}

const SYSTEM = "You are GamePulse AI, an analyst inside a mobile-game analytics dashboard. Answer in the same language the user writes in (Vietnamese or English).\n" +
  "Rules:\n- Get every number from tools. Never invent or estimate figures. If a tool can't answer, say what's missing.\n- All data is DEMO data; mention it once if the user seems to treat it as real.\n" +
  "- Don't claim causes. Describe what moved, where, and list hypotheses to check (release, campaign, ad network, level config), labelled as hypotheses.\n- Ratios are fractions in tool output: show as % with 1 decimal. Retention changes are percentage points (pp). Money is USD unless told otherwise.\n" +
  "- Portfolio DAU is a sum of per-game DAU, not unique users. ROAS/retention from immature cohorts are null — say 'not mature yet', never 0.\n- When a trend or comparison would help, call render_chart (the app draws it). Prefer one or two charts, not more.\n" +
  "- Be concise: a 1–2 sentence answer first, then short bullets. Use **bold** for key numbers. No tables, no headings, no emoji.\n- End with one useful follow-up question only if it adds value.";

const SUGGEST_LIVE = [
  { icon: "activity", q: "Tóm tắt sức khỏe game trong khoảng thời gian này và nêu 3 điểm đáng chú ý nhất" },
  { icon: "repeat", q: "D1/D7 retention đang thế nào? Kênh, campaign hay version nào tốt/kém nhất?" },
  { icon: "circle-dollar-sign", q: "Phân tích doanh thu quảng cáo và IAP: ARPDAU, quốc gia đóng góp nhiều nhất, xu hướng theo ngày" },
  { icon: "megaphone", q: "So sánh chất lượng người dùng từ các nguồn và campaign (DAU, doanh thu, retention)" },
  { icon: "trending-up", q: "So với kỳ trước, chỉ số nào thay đổi mạnh nhất và giả thuyết cần kiểm tra là gì?" },
  { icon: "tag", q: "So sánh các version của app: version mới có tốt hơn bản trước không?" }
];
const SUGGEST = D.LIVE ? SUGGEST_LIVE : [
  { icon: "activity", q: "Tóm tắt sức khỏe portfolio 7 ngày qua" },
  { icon: "repeat", q: "Vì sao D1 retention của Merge Kingdom giảm? Chia theo quốc gia." },
  { icon: "circle-dollar-sign", q: "So sánh eCPM và imp/DAU interstitial của Sky Dash so với kỳ trước" },
  { icon: "gamepad-2", q: "Level nào của Word Bloom đang quá khó?" },
  { icon: "megaphone", q: "Campaign nào của Tile Voyage có D7 ROAS tốt nhất?" },
  { icon: "bug", q: "Brick Smash crash tăng sau bản nào?" }
];

function md(text) {
  const lines = String(text || "").split("\n");
  const out = []; let list = null;
  function inline(s, k) {
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map(function (p, i) {
      if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={k + "-" + i} style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.slice(2, -2)}</b>;
      if (/^`[^`]+`$/.test(p)) return <code key={k + "-" + i} style={{ font: "400 12px/1 var(--font-mono)", padding: "2px 5px", borderRadius: 4, background: "var(--bg-sunken)" }}>{p.slice(1, -1)}</code>;
      return p.replace(/^#+\s*/, "");
    });
  }
  lines.forEach(function (l, i) {
    const m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (m) { if (!list) { list = []; out.push({ list: list }); } list.push(inline(m[1], i)); return; }
    list = null;
    if (l.trim()) out.push({ p: inline(l, i) });
  });
  return out.map(function (b, i) {
    if (b.list) return <ul key={i} style={{ margin: "6px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>{b.list.map(function (li, j) { return <li key={j}>{li}</li>; })}</ul>;
    return <p key={i} style={{ margin: "0 0 8px" }}>{b.p}</p>;
  });
}

function ChatChart({ spec }) {
  const f = UF[spec.unit];
  return (
    <div style={{ marginTop: 10, padding: 14, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}><span style={{ font: "var(--type-section)" }}>{spec.title}</span><span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{spec.sub} · Demo data</span></div>
      {spec.kind === "timeseries" ? <LineChart data={spec.rows} xKey="di" xFormat={xday} yFormat={f} series={spec.series} height={200} showLegend={spec.series.length > 1} />
        : <BarChart horizontal data={spec.rows} xKey="x" yFormat={f} series={[{ key: "v", label: spec.label, color: "var(--accent)" }]} />}
    </div>
  );
}

function Message({ m, onAsk }) {
  const [open, setOpen] = React.useState(false);
  if (m.handoff) return <HandoffCard m={m} />;
  if (m.role === "user") return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: "12px 12px 4px 12px", background: "var(--bg-active)", color: "var(--text-primary)", whiteSpace: "pre-wrap", textWrap: "pretty" }}>{m.text}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent-text)" }}><Icon name="sparkles" size={14} /></span>
      <div style={{ flex: 1, minWidth: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {m.error ? <Callout tone="negative" title="AI request failed">{m.error}</Callout> : md(m.text)}
        {(m.charts || []).map(function (c, i) { return <ChatChart key={i} spec={c} />; })}
        {m.tools && m.tools.length ? (
          <div style={{ marginTop: 8 }}>
            <button onClick={function () { setOpen(!open); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--text-tertiary)", font: "var(--type-caption)" }}>
              <Icon name="database" size={12} />Used {m.tools.length} data quer{m.tools.length === 1 ? "y" : "ies"}<Icon name={open ? "chevron-up" : "chevron-down"} size={12} />
            </button>
            {open ? <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>{m.tools.map(function (t, i) { return <code key={i} style={{ font: "400 11px/1.4 var(--font-mono)", color: t.ok ? "var(--text-tertiary)" : "var(--negative)" }}>{t.name}({Object.keys(t.input || {}).map(function (k) { return k + "=" + JSON.stringify(t.input[k]); }).join(", ")})</code>; })}</div> : null}
          </div>
        ) : null}
        {m.followups && m.followups.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{m.followups.map(function (q) { return <Button key={q} size="sm" variant="secondary" onClick={function () { onAsk(q); }}>{q}</Button>; })}</div> : null}
      </div>
    </div>
  );
}

function Thinking({ step }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--text-tertiary)" }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent-text)" }}><Icon name="loader" size={14} style={{ animation: "gp-spin 1.2s linear infinite" }} /></span>
      <span style={{ font: "var(--type-body)" }}>{step || "Thinking…"}</span>
    </div>
  );
}

const TOOL_STEP = { list_games: "Listing games…", get_kpis: "Reading KPIs…", get_breakdown: "Breaking down by segment…", get_timeseries: "Reading the trend…", get_retention: "Reading retention cohorts…", get_alerts: "Checking open alerts…", get_levels: "Reading level stats…", get_campaigns: "Reading campaigns…", get_tech_health: "Reading stability data…", render_chart: "Drawing chart…" };

function scopeText(F) {
  const g = F.game !== "all" ? gameById(F.game) : null;
  return (g ? g.name : "All games") + " · " + fmt.day(F.from) + " – " + fmt.day(F.to) + (F.platform !== "all" ? " · " + (F.platform === "ios" ? "iOS" : "Android") : "") + (F.countries.length ? " · " + F.countries.join(", ") : "");
}

/* ---------- handoff: no built-in model on GitHub Pages → package the dashboard numbers into a prompt the user pastes
   into their own Claude / ChatGPT subscription. Every number comes from the same metric engine as the charts. ---------- */
const AI_SITES = [
  { id: "claude", label: "Mở Claude", name: "Claude", url: "https://claude.ai/new", icon: "sparkles" },
  { id: "chatgpt", label: "Mở ChatGPT", name: "ChatGPT", url: "https://chatgpt.com/", icon: "message-circle" }
];
function topRows(src, len, n) {
  return Object.keys(src).map(function (k) { const x = GP.derive(src[k], len); return { key: k, dau: r4(x.dau), newUsers: r4(x.newUsers), revenue: r4(x.rev), iaa: r4(x.iaa), iap: r4(x.iap), arpdau: r4(x.arpdau), sessionsPerDau: r4(x.spd), engPerDauSec: r4(x.engPerDau) }; })
    .sort(function (a, b) { return (b.dau || 0) - (a.dau || 0); }).slice(0, n);
}
/* per-value KPIs + retention for a GA4 slice (source / campaign / version), most-used values first */
function sliceSummary(F, name, field, n) {
  const sl = D.SLICES && D.SLICES[name]; if (!sl) return null;
  const gi = F.game === "all" ? null : D.GAMES.findIndex(function (g) { return g.id === F.game; });
  const use = {};
  (gi == null ? sl.ROWS : [sl.ROWS[gi] || []]).forEach(function (rows) { rows.forEach(function (r) { if (r.di >= F.from && r.di <= F.to) { const v = sl.vals[field][r.k[field]]; use[v] = (use[v] || 0) + r.dau; } }); });
  const ret = {}; GP.retentionBy(F, name === "version" ? "version" : field === 1 ? "campaign" : "source").forEach(function (x) { ret[x.key] = x; });
  const base = Object.assign({}, F, { version: "all", source: "all", campaign: "all", userType: "all", countries: [], compare: "none" });
  return Object.keys(use).sort(function (a, b) { return use[b] - use[a]; }).slice(0, n).map(function (k) {
    const patch = name === "version" ? { version: k } : field === 1 ? { campaign: k } : { source: k };
    const x = GP.summary(Object.assign({}, base, patch)).k, rr = ret[k];
    return { key: k, dau: r4(x.dau), newUsers: r4(x.newUsers), revenue: r4(x.rev), arpdau: r4(x.arpdau), d1: rr ? r4(rr.r[1]) : null, d7: rr ? r4(rr.r[7]) : null, cohortUsers: rr ? Math.round(rr.size) : null };
  });
}
function buildContext(F, q) {
  const S = GP.summary(Object.assign({}, F, { compare: F.compare === "none" ? "prev" : F.compare }));
  const R = GP.retention(F);
  const g = F.game !== "all" ? gameById(F.game) : null;
  const ret = {}; GP.RN.forEach(function (n) { ret["d" + n] = r4(R.classic[n]); });
  const data = {
    nguon: D.LIVE ? D.LIVE.source + " (cập nhật " + new Date(D.UPDATED_AT).toISOString().slice(0, 16).replace("T", " ") + " UTC)" : "Demo data (số giả lập)",
    pham_vi: { game: g ? g.name : "Tất cả game (" + D.GAMES.map(function (x) { return x.name; }).join(", ") + ")", tu: D.iso(D.dates[F.from]), den: D.iso(D.dates[F.to]), so_ngay: S.R.len,
      ky_so_sanh: S.R.cFrom != null && S.R.cFrom >= 0 ? D.iso(D.dates[S.R.cFrom]) + " → " + D.iso(D.dates[S.R.cTo]) : null,
      nen_tang: F.platform, quoc_gia: F.countries.length ? F.countries : "tất cả", version: F.version, source: F.source, campaign: F.campaign, nguoi_dung: F.userType },
    kpi_ky_nay: pick(S.k), kpi_ky_truoc: S.pk ? pick(S.pk) : null,
    retention_classic: ret, retention_ky_truoc: R.prev ? { d1: r4(R.prev[1]), d7: r4(R.prev[7]) } : null,
    theo_ngay: { cot: ["ngay", "dau", "new_users", "revenue_usd", "arpdau"], dong: S.series.map(function (d) { return [D.iso(D.dates[d.di]), r4(d.dau), r4(d.newUsers), r4(d.rev), r4(d.arpdau)]; }) },
    theo_nen_tang: topRows(S.cur.byPlatform, S.R.len, 5),
    theo_quoc_gia_top15: window.sliceActive(F) ? "không có (bộ lọc version/source/users không chia theo quốc gia)" : topRows(S.cur.byCountry, S.R.len, 15),
    retention_theo_nen_tang: GP.retentionBy(F, "platform").map(function (x) { return { key: x.key, d1: r4(x.r[1]), d7: r4(x.r[7]) }; }),
    theo_source: sliceSummary(F, "source", 0, 8), theo_campaign_top12: sliceSummary(F, "source", 1, 12), theo_version_top8: sliceSummary(F, "version", 0, 8),
    canh_bao: GP.runAlerts().slice(0, 10).map(function (x) { return { muc_do: x.severity, game: x.game, chi_so: x.label, hien_tai: r4(x.current), truoc: r4(x.previous), thay_doi: r4(x.change), don_vi: x.pp ? "pp" : "ti_le" }; })
  };
  if (!g && D.GAMES.length > 1) data.theo_game = topRows(S.cur.byGame, S.R.len, 20);
  /* level funnel (single game only): players starting / winning each level and the share who never start the next one */
  const LV = g ? GP.levels(F) : null;
  data.funnel_level = !g ? "chọn 1 game để có funnel level" : !LV ? "game này chưa có event level" : {
    cot: ["level", "nguoi_bat_dau", "luot_bat_dau", "nguoi_thang", "win_rate_moi_luot", "ti_le_hoan_thanh", "drop_sang_level_sau", "it_mau"],
    ghi_chu: "Người chơi = tổng user theo ngày. drop_sang_level_sau = người thắng level này nhưng không bắt đầu level kế tiếp (null nếu không tính được; âm/0 khi level sau có nhiều người hơn, có thể do thứ tự chơi khác số level).",
    dong: LV.levels.map(function (l) { return [l.level, Math.round(l.reach), Math.round(l.starts), Math.round(l.winUsers != null ? l.winUsers : l.wins), r4(l.winRate), r4(l.completionRate), r4(l.drop), l.small ? 1 : 0]; })
  };
  const notes = [
    "Tỉ lệ (retention, arpdau…) là số thập phân: 0.269 = 26.9%. Tiền là USD. Thời gian là giây. null = chưa đủ dữ liệu (cohort chưa đủ tuổi), KHÔNG phải 0.",
    "DAU là trung bình ngày; với tất cả game là tổng DAU từng game. Doanh thu quảng cáo GA4 không tách theo định dạng (interstitial/rewarded/banner).",
    D.LIVE ? "Chưa có dữ liệu: chi phí UA/CPI, crash, A/B test" + (D.LEVELS ? "" : ", level") + ". Không suy đoán các số này. Ngày cuối trong dữ liệu là ngày đầy đủ gần nhất (hôm nay chưa được tính)." : null
  ].filter(Boolean);
  return "Bạn là chuyên gia phân tích dữ liệu game mobile. Dưới đây là số liệu xuất từ dashboard GamePulse (" + (D.LIVE ? "dữ liệu thật" : "dữ liệu demo") + ").\n" +
    "Quy tắc: chỉ dùng số trong dữ liệu này, không tự bịa số; không khẳng định nguyên nhân, chỉ nêu điều gì thay đổi, ở đâu và các giả thuyết cần kiểm tra (ghi rõ là giả thuyết); trả lời bằng tiếng Việt, ngắn gọn: 1–2 câu kết luận trước rồi gạch đầu dòng, in đậm số quan trọng.\n" +
    notes.map(function (n) { return "- " + n; }).join("\n") + "\n\n" +
    "CÂU HỎI: " + (q || "Phân tích tổng quan tình hình game trong phạm vi này, nêu điểm tốt, điểm đáng lo và việc nên làm tiếp.") + "\n\n" +
    "DỮ LIỆU (JSON):\n" + JSON.stringify(data) + "\n";
}
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise(function (ok, fail) {
    try { const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); const r = document.execCommand("copy"); document.body.removeChild(t); if (r) ok(); else fail(new Error("copy failed")); } catch (e) { fail(e); }
  });
}
function HandoffCard({ m }) {
  const [state, setState] = React.useState(null);
  const go = function (site) {
    /* open the tab first, still inside the click, so popup blockers allow it; then copy */
    const w = site ? window.open(site.url, "_blank") : null;
    copyText(m.handoff.prompt).then(function () { setState(site ? { opened: site.name } : { copied: true }); }, function () { setState({ error: true }); if (w) w.close(); });
  };
  const kb = Math.max(1, Math.round(m.handoff.prompt.length / 1024));
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent-text)" }}><Icon name="clipboard-list" size={14} /></span>
      <div style={{ flex: 1, minWidth: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>Đã chuẩn bị dữ liệu cho câu hỏi này</div>
        <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 2 }}>{m.handoff.scope} · KPI, xu hướng, retention, funnel level, quốc gia, nguồn, campaign, version · khoảng {kb} KB</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {AI_SITES.map(function (s) { return <Button key={s.id} size="sm" variant={s.id === "claude" ? "primary" : "secondary"} iconLeft={s.icon} onClick={function () { go(s); }}>{s.label}</Button>; })}
          <Button size="sm" variant="ghost" iconLeft="copy" onClick={function () { go(null); }}>Chỉ copy</Button>
        </div>
        {state && state.error ? <Callout tone="negative" title="Không copy được" style={{ marginTop: 10 }}>Trình duyệt đang chặn clipboard. Bấm lại "Chỉ copy", hoặc cho phép quyền clipboard cho trang này.</Callout>
          : state ? <Callout tone="positive" title={state.copied ? "Đã copy vào clipboard" : "Đã copy và mở " + state.opened} style={{ marginTop: 10 }}>Trong khung chat, nhấn <b>Ctrl + V</b> rồi Enter. AI sẽ phân tích bằng tài khoản Claude / ChatGPT của bạn.</Callout> : null}
      </div>
    </div>
  );
}

function AIChat({ compact }) {
  const app = useApp();
  const F = effective(app.F, window.APPLY[app.route] && window.APPLY[app.route].game ? "ai" : app.route === "portfolio" ? "portfolio" : "ai");
  const FRef = React.useRef(F); FRef.current = F;
  const [msgs, setMsgs] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.ai.thread") || "[]"); } catch (e) { return []; } });
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState(null);
  const scroller = React.useRef(null);
  const available = !!(window.claude && window.claude.complete);
  React.useEffect(function () { try { localStorage.setItem("gp.ai.thread", JSON.stringify(msgs.filter(function (m) { return !m.handoff; }).slice(-40))); } catch (e) {} const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);
  async function ask(q) {
    q = (q || input).trim(); if (!q || busy) return;
    setInput(""); setBusy(true); setStep(null);
    const history = msgs.filter(function (m) { return !m.error && m.text; }).slice(-8).map(function (m) { return { role: m.role, content: m.text }; });
    const userMsg = { role: "user", text: q, scope: scopeText(FRef.current) };
    setMsgs(function (x) { return x.concat([userMsg]); });
    const charts = [], tools = [];
    const kit = buildTools(function () { return FRef.current; }, function (c) { charts.push(c); }, function (t) { tools.push(t); setStep(TOOL_STEP[t.name] || "Working…"); });
    const ctx = "Dashboard context: page=" + app.route + "; current game filter=" + FRef.current.game + "; date range " + D.iso(D.dates[FRef.current.from]) + " to " + D.iso(D.dates[FRef.current.to]) + "; platform=" + FRef.current.platform + "; countries=" + (FRef.current.countries.join(",") || "all") + "; last finalized day " + D.iso(D.dates[D.N - 1]) + ".";
    if (!available) {
      setMsgs(function (x) { return x.concat([{ role: "assistant", handoff: { prompt: buildContext(FRef.current, q), scope: scopeText(FRef.current) } }]); });
      setBusy(false); return;
    }
    try {
      if (!available) throw new Error("The AI helper isn't available in this environment. In production this calls the GamePulse backend (/api/v1/ai/ask).");
      const text = await window.claude.complete({ system: SYSTEM + "\n" + ctx, max_tokens: 1400, messages: history.concat([{ role: "user", content: q }]), tools: kit });
      let body = String(text || "").trim(); let follow = [];
      const fm = body.match(/\n?\s*(?:Follow-?up|Gợi ý)[^:\n]*:\s*(.+)$/i);
      if (fm && fm[1].length < 140) { follow = [fm[1].replace(/^["“]|["”]$/g, "").trim()]; body = body.slice(0, fm.index).trim(); }
      setMsgs(function (x) { return x.concat([{ role: "assistant", text: body || "(No answer)", charts: charts, tools: tools, followups: follow }]); });
    } catch (e) {
      const msg = /rate|429/i.test(String(e && e.message)) ? "Rate limit reached (15 calls/min, tool steps included). Wait a minute and retry." : String((e && e.message) || e);
      setMsgs(function (x) { return x.concat([{ role: "assistant", error: msg, tools: tools }]); });
    }
    setBusy(false); setStep(null);
  }
  const empty = msgs.length === 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: compact ? "16px" : "20px 4px", display: "flex", flexDirection: "column", gap: 18 }}>
        {empty ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: compact ? "0" : "auto 0" }}>
            <div>
              <div style={{ font: compact ? "600 15px/1.3 var(--font-sans)" : "600 22px/1.25 var(--font-sans)", letterSpacing: "var(--tracking-tight)", color: "var(--text-primary)" }}>Hỏi bất cứ điều gì về dữ liệu game</div>
              <div style={{ color: "var(--text-tertiary)", marginTop: 6, textWrap: "pretty" }}>{available ? "AI đọc trực tiếp các chỉ số của dashboard (cùng công thức với các biểu đồ), vẽ chart khi cần và không tự đoán số liệu." : "Gõ câu hỏi hoặc chọn gợi ý: web gom số liệu theo bộ lọc hiện tại thành một prompt, rồi mở Claude hoặc ChatGPT để bạn dán vào và hỏi bằng tài khoản của mình."}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {SUGGEST.map(function (s) { return (
                <button key={s.q} onClick={function () { ask(s.q); }} disabled={busy}
                  onMouseEnter={function (e) { e.currentTarget.style.borderColor = "var(--border-strong)"; }} onMouseLeave={function (e) { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", padding: "11px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", font: "400 13px/1.4 var(--font-sans)" }}>
                  <span style={{ color: "var(--accent-text)", display: "inline-flex", paddingTop: 1 }}><Icon name={s.icon} size={15} /></span>{s.q}
                </button>); })}
            </div>
          </div>
        ) : msgs.map(function (m, i) { return <Message key={i} m={m} onAsk={ask} />; })}
        {busy ? <Thinking step={step} /> : null}
      </div>
      <div style={{ padding: compact ? "12px 16px 16px" : "12px 0 0", borderTop: compact ? "1px solid var(--border-subtle)" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
          <Icon name="crosshair" size={12} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Phạm vi: {scopeText(F)}</span>
          <span style={{ flex: 1 }}></span>
          {msgs.length ? <button onClick={function () { setMsgs([]); }} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-tertiary)", font: "var(--type-caption)", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flex: "none" }}><Icon name="rotate-ccw" size={12} />Cuộc trò chuyện mới</button> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 8, borderRadius: "var(--radius-xl)", background: "var(--bg-sunken)", border: "1px solid var(--border-default)" }}>
          <textarea value={input} onChange={function (e) { setInput(e.target.value); }} rows={compact ? 2 : 2} placeholder={D.LIVE ? "Ví dụ: Retention D1 theo từng campaign tuần này thế nào?" : "Ví dụ: Doanh thu IAA tuần này so với tuần trước của Sky Dash?"}
            onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            style={{ flex: 1, resize: "none", border: 0, outline: "none", background: "transparent", color: "var(--text-primary)", font: "400 13px/1.5 var(--font-sans)", padding: "4px 6px", maxHeight: 160 }} />
          <Button variant="primary" iconLeft="arrow-up" loading={busy} disabled={!input.trim()} onClick={function () { ask(); }}>{available ? "Gửi" : "Tạo prompt"}</Button>
        </div>
        <div style={{ font: "400 10.5px/1.4 var(--font-sans)", color: "var(--text-tertiary)", marginTop: 6 }}>AI có thể sai — luôn kiểm tra lại trên biểu đồ gốc. Prompt chỉ chứa số liệu tổng hợp, không có dữ liệu từng người chơi.</div>
      </div>
    </div>
  );
}

function AIPage() {
  const app = useApp();
  const wide = window.innerWidth >= 1240;
  const tools = ["get_kpis", "get_breakdown", "get_timeseries", "get_retention", "get_alerts", "get_levels", "get_campaigns", "get_tech_health", "render_chart"];
  const handoff = !(window.claude && window.claude.complete);
  const packs = ["KPI kỳ này và kỳ trước", "Funnel level (khi chọn 1 game)", "Xu hướng theo ngày (DAU, user mới, doanh thu, ARPDAU)", "Retention D1–D14, D30", "Top 15 quốc gia", "Nền tảng", "Source, campaign, version (kèm D1/D7)", "Cảnh báo bất thường"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1fr) 300px" : "1fr", gap: 20, height: app.mobile ? "auto" : "calc(100vh - 170px)", minHeight: 520 }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, maxWidth: 860, width: "100%" }}>
        <PageHeader title="Ask AI" desc="Hỏi bằng tiếng Việt hoặc tiếng Anh. Câu trả lời dùng đúng bộ lọc hiện tại trên thanh trên cùng." meta={[<Badge key="b" tone="accent" icon="sparkles">Beta</Badge>, D.LIVE ? <Badge key="d" tone="positive" icon="radio">Live · GA4</Badge> : <Badge key="d" tone="neutral" icon="flask-conical">Demo data</Badge>]} />
        <div style={{ flex: 1, minHeight: 0 }}><AIChat /></div>
      </div>
      {!wide ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {handoff ? <Card title="Cách dùng" subtitle="Dùng tài khoản Claude / ChatGPT bạn đang có — không cần API key.">
            <ol style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6, font: "400 12.5px/1.5 var(--font-sans)" }}>
              <li>Chọn game, thời gian, bộ lọc trên thanh trên cùng.</li>
              <li>Gõ câu hỏi (hoặc chọn gợi ý) rồi bấm <b>Tạo prompt</b>.</li>
              <li>Bấm <b>Mở Claude</b> hoặc <b>Mở ChatGPT</b>: số liệu được copy sẵn.</li>
              <li>Trong khung chat nhấn <b>Ctrl + V</b> rồi Enter.</li>
            </ol>
          </Card> : <Card title="AI có thể đọc gì" subtitle="Mỗi câu hỏi được trả lời bằng các truy vấn này — mở “Used N data queries” dưới câu trả lời để xem.">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{tools.map(function (t) { return <code key={t} style={{ font: "400 11.5px/1.4 var(--font-mono)", color: "var(--text-secondary)" }}>{t}</code>; })}</div>
          </Card>}
          {handoff ? <Card title="Prompt gồm những gì" subtitle="Tính từ cùng engine với các biểu đồ, theo đúng bộ lọc hiện tại.">
            <ul style={{ margin: 0, paddingLeft: 16, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4, font: "400 12.5px/1.5 var(--font-sans)" }}>{packs.map(function (t) { return <li key={t}>{t}</li>; })}</ul>
          </Card> : null}
          <Card title="Nguyên tắc">
            <ul style={{ margin: 0, paddingLeft: 16, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6, font: "400 12.5px/1.5 var(--font-sans)" }}>
              <li>Số liệu luôn lấy từ engine KPI, giống hệt biểu đồ.</li>
              <li>Không khẳng định nguyên nhân — chỉ đưa giả thuyết cần kiểm tra.</li>
              <li>Cohort chưa đủ tuổi hiển thị “chưa đủ dữ liệu”, không phải 0%.</li>
              {handoff ? <li>Prompt dặn AI chỉ dùng số trong dữ liệu, không bịa số.</li> : <li>Chart do app vẽ, AI chỉ chọn metric và phạm vi.</li>}
            </ul>
          </Card>
          {handoff ? null : <Card title="Production" footer="Phase 4 · cần backend">
            <div style={{ color: "var(--text-secondary)", font: "400 12.5px/1.5 var(--font-sans)" }}>Prototype gọi model trực tiếp. Bản thật: <code style={{ fontFamily: "var(--font-mono)" }}>POST /api/v1/ai/ask</code> — backend giữ API key, chạy cùng các tool trên BigQuery, ghi log câu hỏi và áp quyền theo role.</div>
          </Card>}
        </div>
      )}
    </div>
  );
}

function AIPanel({ onClose }) {
  const app = useApp();
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 55, background: app.mobile ? "var(--bg-overlay)" : "transparent" }}></div>
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: app.mobile ? "100%" : 440, zIndex: 56, display: "flex", flexDirection: "column", background: "var(--bg-raised)", borderLeft: "1px solid var(--border-default)", boxShadow: "var(--shadow-lg)", animation: "gp-fade-up var(--dur-base) var(--ease-out)" }}>
        <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ color: "var(--accent-text)", display: "inline-flex" }}><Icon name="sparkles" size={16} /></span>
          <span style={{ font: "600 14px/1 var(--font-sans)" }}>Ask AI</span><Badge size="sm" tone="accent">Beta</Badge>
          <span style={{ flex: 1 }}></span>
          <IconButton icon="maximize-2" label="Open full page" size="sm" onClick={function () { onClose(); app.nav("ai"); }} />
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}><AIChat compact /></div>
      </aside>
    </>
  );
}

window.Pages = Object.assign(window.Pages || {}, { ai: AIPage });
window.AIPanel = AIPanel;
});
