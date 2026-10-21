window.__dsReady.then(function (DS) {
const { Button, IconButton, Badge, Input, Select, Checkbox, SidebarItem, Toast, Dialog, GameAvatar, Icon, Tooltip } = DS;
const GP = window.GP, D = GP.D, fmt = GP.fmt;

async function sha256(s) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
function readAuth() { try { const a = JSON.parse(sessionStorage.getItem("gp.auth") || localStorage.getItem("gp.auth") || "null"); return a && a.exp > Date.now(); } catch (e) { return false; } }

function Login({ onDone }) {
  const C = window.GP_CONFIG || {};
  const [pw, setPw] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [lock, setLock] = React.useState(function () { return parseInt(localStorage.getItem("gp.lockUntil") || "0", 10); });
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(function () { const t = setInterval(function () { setNow(Date.now()); }, 500); return function () { clearInterval(t); }; }, []);
  const locked = lock > now;
  async function submit(e) {
    e.preventDefault(); if (locked || !pw) return;
    setBusy(true); setErr(null);
    const h = await sha256(pw);
    await new Promise(function (r) { setTimeout(r, 350); });
    setBusy(false);
    if (h === C.passwordSha256) {
      localStorage.removeItem("gp.fails");
      const tok = JSON.stringify({ exp: Date.now() + (C.sessionHours || 12) * 3600e3 });
      (remember ? localStorage : sessionStorage).setItem("gp.auth", tok);
      onDone();
    } else {
      const f = parseInt(localStorage.getItem("gp.fails") || "0", 10) + 1;
      localStorage.setItem("gp.fails", String(f));
      if (f >= (C.maxAttempts || 5)) { const u = Date.now() + (C.lockoutSeconds || 30) * 1000; localStorage.setItem("gp.lockUntil", String(u)); localStorage.setItem("gp.fails", "0"); setLock(u); setErr(null); }
      else setErr("Incorrect password. " + ((C.maxAttempts || 5) - f) + " attempt" + ((C.maxAttempts || 5) - f === 1 ? "" : "s") + " left before a short lockout.");
      setPw("");
    }
  }
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-app)" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ font: "600 17px/1 var(--font-sans)", letterSpacing: "-0.02em" }}>GamePulse</span>
          <span style={{ font: "500 11px/1 var(--font-mono)", color: "var(--text-tertiary)", padding: "3px 6px", border: "1px solid var(--border-default)", borderRadius: 4 }}>ANALYTICS</span>
        </div>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-display)" }}>Sign in</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-tertiary)" }}>This workspace is restricted. Enter the access password your admin configured.</p>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Password</span>
          <Input type="password" size="lg" value={pw} onChange={setPw} autoFocus iconLeft="key-round" invalid={!!err} disabled={locked} placeholder="••••••••" />
        </label>
        {err ? <div role="alert" style={{ color: "var(--negative)", font: "var(--type-caption)", marginTop: -8 }}>{err}</div> : null}
        {locked ? <div role="alert" style={{ color: "var(--warning)", font: "var(--type-caption)", marginTop: -8 }}>Too many attempts. Try again in {Math.ceil((lock - now) / 1000)}s.</div> : null}
        <Checkbox checked={remember} onChange={setRemember} label={"Keep me signed in on this device (" + (C.sessionHours || 12) + "h)"} />
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={locked || !pw}>Continue</Button>
        <p style={{ margin: "8px 0 0", font: "var(--type-caption)", color: "var(--text-tertiary)", textWrap: "pretty" }}>
          The password is checked against a SHA-256 hash in <code style={{ fontFamily: "var(--font-mono)" }}>config.js</code>. It keeps casual visitors out; for real protection, deploy behind server-side auth.
        </p>
      </form>
    </div>
  );
}

function Sidebar({ route, collapsed, setCollapsed, mobile, open, onClose, alertCount, onSignOut, role }) {
  const app = window.useApp();
  const groups = [];
  window.ROUTES.forEach(function (r) { let g = groups.find(function (x) { return x.name === r.group; }); if (!g) groups.push(g = { name: r.group, items: [] }); g.items.push(r); });
  const w = collapsed && !mobile ? 60 : 232;
  if (mobile && !open) return null;
  return (
    <>
      {mobile ? <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 29 }}></div> : null}
      <aside style={{ position: mobile ? "fixed" : "sticky", top: 0, left: 0, height: "100vh", alignSelf: "flex-start", width: w, flex: "none", zIndex: 30, display: "flex", flexDirection: "column",
        background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)", transition: "width var(--dur-base) var(--ease-out)" }}>
        <div style={{ height: 56, display: "flex", alignItems: "center", gap: 8, padding: collapsed && !mobile ? "0 14px" : "0 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          {collapsed && !mobile ? <span style={{ font: "700 15px/1 var(--font-sans)", letterSpacing: "-0.03em", width: 32, textAlign: "center" }}>GP</span> :
            <><span style={{ font: "600 15px/1 var(--font-sans)", letterSpacing: "-0.02em" }}>GamePulse</span><span style={{ font: "500 10px/1 var(--font-mono)", color: "var(--text-tertiary)", padding: "3px 5px", border: "1px solid var(--border-default)", borderRadius: 4 }}>ANALYTICS</span></>}
          {mobile ? <IconButton icon="x" label="Close menu" size="sm" onClick={onClose} style={{ marginLeft: "auto" }} /> : null}
        </div>
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map(function (g) {
            return (
              <div key={g.name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {collapsed && !mobile ? <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 8px 6px" }}></div> : <div style={{ font: "500 10.5px/1 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)", padding: "0 10px 6px" }}>{g.name}</div>}
                {g.items.map(function (r) { return <SidebarItem key={r.id} icon={r.icon} label={r.label} active={route === r.id} collapsed={collapsed && !mobile} badge={r.id === "alerts" && alertCount ? alertCount : undefined} onClick={function () { app.nav(r.id); if (mobile) onClose(); }} />; })}
              </div>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: 10, display: "flex", flexDirection: collapsed && !mobile ? "column" : "row", alignItems: "center", gap: 6 }}>
          {collapsed && !mobile ? null : <div style={{ flex: 1, minWidth: 0, padding: "0 6px" }}><div style={{ font: "500 12px/1.3 var(--font-sans)" }}>Signed in</div><div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", textTransform: "capitalize" }}>{role} · demo workspace</div></div>}
          <IconButton icon="log-out" label="Sign out" size="sm" onClick={onSignOut} />
          {mobile ? null : <IconButton icon={collapsed ? "panel-left-open" : "panel-left-close"} label={collapsed ? "Expand sidebar" : "Collapse sidebar"} size="sm" onClick={function () { setCollapsed(!collapsed); }} />}
        </div>
      </aside>
    </>
  );
}

function DateInputs({ F, setF }) {
  const min = D.iso(D.dates[D.N - 90]), max = D.iso(D.dates[D.N - 1]);
  function set(k, v) { const i = D.dates.indexOf(Date.parse(v + "T00:00:00Z")); if (i < 0) return; const n = Object.assign({}, F); n[k] = i; if (n.from > n.to) { if (k === "from") n.to = n.from; else n.from = n.to; } setF({ from: n.from, to: n.to }); }
  const st = { height: 32, padding: "0 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-sunken)", color: "var(--text-primary)", font: "400 12px/1 var(--font-sans)", colorScheme: "inherit" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input type="date" aria-label="Start date" min={min} max={max} value={D.iso(D.dates[F.from])} onChange={function (e) { set("from", e.target.value); }} style={st} />
      <span style={{ color: "var(--text-tertiary)" }}>→</span>
      <input type="date" aria-label="End date" min={min} max={max} value={D.iso(D.dates[F.to])} onChange={function (e) { set("to", e.target.value); }} style={st} />
    </span>
  );
}

function TopBar({ F, setF, route, mobile, onMenu, theme, setTheme, onAI }) {
  const A = window.APPLY[route] || {};
  const gameOpts = [{ value: "all", label: "All games", prefix: <span style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--neutral-soft)", color: "var(--text-secondary)" }}><Icon name="layers" size={12} /></span> }].concat(D.GAMES.map(function (g) { return { value: g.id, label: g.name, description: g.genre, prefix: <GameAvatar name={g.name} color={g.color} size={18} /> }; }));
  const rangeOpts = [{ value: "today", label: "Today", disabled: true, disabledReason: "Today's data is partial; daily tables finalize at 06:00 UTC." }, { value: "y", label: "Yesterday" }, { value: "7", label: "Last 7 days" }, { value: "14", label: "Last 14 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "custom", label: "Custom range…" }];
  const cmpOpts = [{ value: "prev", label: "Previous period" }, { value: "wow", label: "Same period last week" }, { value: "custom", label: "Custom start…" }, { value: "none", label: "No comparison" }];
  function setRange(v) { const r = window.rangeOf(v, F); setF({ range: v, from: r[0], to: r[1] }); }
  return (
    <div style={{ height: 56, display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden", padding: mobile ? "0 12px" : "0 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-app)", position: "sticky", top: 0, zIndex: 20 }}>
      {mobile ? <IconButton icon="menu" label="Open menu" onClick={onMenu} /> : null}
      <Select options={gameOpts} value={route === "portfolio" ? "all" : F.game} onChange={function (v) { setF({ game: v }); }} disabled={!A.game} disabledReason={window.reasonFor(route, "game")} menuWidth={260} width={mobile ? 150 : undefined} searchable />
      <Select options={rangeOpts} value={F.range} onChange={setRange} width={mobile ? 124 : undefined} />
      {F.range === "custom" && !mobile ? <DateInputs F={F} setF={setF} /> : null}
      {mobile ? null : <Select label="vs" options={cmpOpts} value={A.compare ? F.compare : "none"} onChange={function (v) { setF({ compare: v, compareFrom: v === "custom" ? Math.max(0, F.from - (F.to - F.from + 1)) : null }); }} disabled={!A.compare} disabledReason={window.reasonFor(route, "compare")} />}
      {F.compare === "custom" && A.compare && !mobile ? (
        <input type="date" aria-label="Comparison start" min={D.iso(D.dates[0])} max={D.iso(D.dates[F.from - 1] || D.dates[0])} value={D.iso(D.dates[F.compareFrom || 0])}
          onChange={function (e) { const i = D.dates.indexOf(Date.parse(e.target.value + "T00:00:00Z")); if (i >= 0) setF({ compareFrom: i }); }}
          style={{ height: 32, padding: "0 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-sunken)", color: "var(--text-primary)", font: "400 12px/1 var(--font-sans)" }} />
      ) : null}
      <div style={{ flex: 1 }}></div>
      {mobile || window.innerWidth < 1240 ? null : <Tooltip content={"Data through " + fmt.day(D.N - 1, true) + ". Daily tables are finalized in UTC. Pipeline last ran " + fmt.ts(D.UPDATED_AT) + (D.LIVE ? ". Source: " + D.LIVE.source + ". Ads by format, UA spend, retention cohorts and tech health are still modeled." : ". All values are synthetic demo data.")} placement="bottom">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-caption)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--positive)" }}></span>{window.innerWidth >= 1360 ? "Data through " + fmt.day(D.N - 1, true) + " · updated " + fmt.ts(D.UPDATED_AT) : "Updated " + fmt.ts(D.UPDATED_AT)}
        </span>
      </Tooltip>}
      {route !== "ai" ? (mobile ? <IconButton icon="sparkles" label="Ask AI" onClick={onAI} /> : <Button size="sm" iconLeft="sparkles" onClick={onAI}>Ask AI</Button>) : null}
      {D.LIVE ? <Tooltip content={"Live · " + D.LIVE.source + " · updated " + fmt.ts(D.UPDATED_AT)} placement="bottom"><Badge tone="positive" icon="radio">Live · GA4</Badge></Tooltip> : window.innerWidth < 1100 && !mobile ? <Tooltip content={"Demo data · updated " + fmt.ts(D.UPDATED_AT)} placement="bottom"><Badge tone="accent" icon="flask-conical">Demo</Badge></Tooltip> : <Badge tone="accent" icon="flask-conical">Demo data</Badge>}
      <IconButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={function () { setTheme(theme === "dark" ? "light" : "dark"); }} />
    </div>
  );
}

function FilterBar({ F, setF, route, mobile, onReset, onSave, presets, onPreset, onCopy }) {
  const A = window.APPLY[route] || {};
  const r = function (k) { return window.reasonFor(route, k); };
  const g = F.game !== "all" ? window.gameById(F.game) : null;
  const versions = []; (g ? [g] : D.GAMES).forEach(function (x) { x.versions.forEach(function (v) { if (versions.indexOf(v.v) < 0) versions.push(v.v); }); });
  const sources = ["Google Ads", "Meta Ads", "AppLovin", "Unity Ads", "TikTok Ads", "Mintegral"];
  const camps = (g ? D.CAMPAIGNS[D.GAMES.indexOf(g)] : []).filter(function (c) { return F.source === "all" || F.source === "paid" || c.source === F.source; });
  const show = !(route === "sources" || route === "settings");
  if (!show) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: mobile ? "nowrap" : "wrap", overflowX: mobile ? "auto" : "visible", padding: mobile ? "8px 12px" : "8px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-app)" }}>
      {mobile ? <Select size="sm" label="vs" options={[{ value: "prev", label: "Prev. period" }, { value: "wow", label: "Last week" }, { value: "none", label: "None" }]} value={A.compare ? F.compare : "none"} onChange={function (v) { setF({ compare: v }); }} disabled={!A.compare} disabledReason={r("compare")} /> : null}
      <Select size="sm" label="Platform" value={F.platform} onChange={function (v) { setF({ platform: v }); }} disabled={!A.platform} disabledReason={r("platform")}
        options={[{ value: "all", label: "All" }, { value: "android", label: "Android" }, { value: "ios", label: "iOS" }]} />
      <Select size="sm" label="Country" multiple searchable placeholder="All" value={F.countries} onChange={function (v) { setF({ countries: v }); }} disabled={!A.countries} disabledReason={r("countries")} menuWidth={220}
        options={D.COUNTRIES.map(function (c) { return { value: c.code, label: c.name, prefix: <span style={{ font: "500 10.5px/1 var(--font-mono)", color: "var(--text-tertiary)", width: 18 }}>{c.code}</span> }; })} />
      <Select size="sm" label="Version" value={F.version} onChange={function (v) { setF({ version: v }); }} disabled={!A.version} disabledReason={r("version")}
        options={[{ value: "all", label: "All" }].concat(versions.map(function (v) { return { value: v, label: v }; }))} />
      <Select size="sm" label="Source" value={F.source} onChange={function (v) { setF({ source: v, campaign: "all" }); }} disabled={!A.source} disabledReason={r("source")} menuWidth={200}
        options={[{ value: "all", label: "All" }, { value: "organic", label: "Organic" }, { value: "paid", label: "Non-organic (all paid)" }, { value: "d", divider: true }].concat(sources.map(function (s) { return { value: s, label: s }; }))} />
      <Select size="sm" label="Campaign" value={F.campaign} onChange={function (v) { setF({ campaign: v }); }} disabled={!A.campaign || !g || F.source === "organic"} disabledReason={!A.campaign ? r("campaign") : !g ? "Select a single game to filter by campaign." : "Organic installs have no campaign."} menuWidth={260} searchable
        options={[{ value: "all", label: "All" }].concat(camps.map(function (c) { return { value: c.id, label: c.name, description: c.source }; }))} />
      <Select size="sm" label="Users" value={F.userType} onChange={function (v) { setF({ userType: v }); }} disabled={!A.userType} disabledReason={r("userType")}
        options={[{ value: "all", label: "All" }, { value: "new", label: "New" }, { value: "returning", label: "Returning" }]} />
      <div style={{ flex: 1, minWidth: 8 }}></div>
      <Button size="sm" variant="ghost" iconLeft="rotate-ccw" onClick={onReset}>Reset</Button>
      <Select size="sm" placeholder="Saved views" value={null} align="right" menuWidth={220} onChange={onPreset}
        options={presets.length ? presets.map(function (p) { return { value: p.id, label: p.name, description: (window.ROUTES.find(function (x) { return x.id === p.route; }) || {}).label }; }) : [{ value: "none", label: "No saved views yet", disabled: true, disabledReason: "Use Save view to store the current filters." }]} />
      <Button size="sm" iconLeft="bookmark" onClick={onSave}>Save view</Button>
      <Button size="sm" iconLeft="link" onClick={onCopy}>Copy link</Button>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = React.useState(readAuth());
  const parse = function () { const h = location.hash.replace(/^#\/?/, ""); const i = h.indexOf("?"); return { route: (i >= 0 ? h.slice(0, i) : h) || "portfolio", q: i >= 0 ? h.slice(i + 1) : "" }; };
  const init = parse();
  const [route, setRoute] = React.useState(window.ROUTES.some(function (r) { return r.id === init.route; }) ? init.route : "portfolio");
  const [F, setFState] = React.useState(function () { return window.decode(init.q || localStorage.getItem("gp.filters") || ""); });
  const [theme, setThemeS] = React.useState(localStorage.getItem("gp.theme") || "dark");
  const [cfg, setCfgS] = React.useState(function () { try { return Object.assign({ currency: "USD", tz: "UTC" }, JSON.parse(localStorage.getItem("gp.cfg") || "{}")); } catch (e) { return { currency: "USD", tz: "UTC" }; } });
  const [role, setRole] = React.useState(localStorage.getItem("gp.role") || "admin");
  const [sim, setSim] = React.useState("none");
  const [collapsed, setCollapsed] = React.useState(localStorage.getItem("gp.collapsed") === "1");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [vw, setVw] = React.useState(window.innerWidth);
  const [toasts, setToasts] = React.useState([]);
  const [presets, setPresets] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.presets") || "[]"); } catch (e) { return []; } });
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [rules, setRules] = React.useState(function () { try { return JSON.parse(localStorage.getItem("gp.rules") || "null") || GP.DEFAULT_RULES; } catch (e) { return GP.DEFAULT_RULES; } });
  GP.cfg.currency = cfg.currency; GP.cfg.tz = cfg.tz;
  React.useEffect(function () { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("gp.theme", theme); }, [theme]);
  React.useEffect(function () { const f = function () { setVw(window.innerWidth); }; window.addEventListener("resize", f); return function () { window.removeEventListener("resize", f); }; }, []);
  React.useEffect(function () {
    const f = function () { const p = parse(); if (window.ROUTES.some(function (r) { return r.id === p.route; })) setRoute(p.route); if (p.q) setFState(window.decode(p.q)); };
    window.addEventListener("hashchange", f); return function () { window.removeEventListener("hashchange", f); };
  }, []);
  React.useEffect(function () { const q = window.encode(F); history.replaceState(null, "", "#/" + route + (q ? "?" + q : "")); localStorage.setItem("gp.filters", q); }, [F, route]);
  React.useEffect(function () { localStorage.setItem("gp.rules", JSON.stringify(rules)); }, [rules]);
  const alerts = React.useMemo(function () { return GP.runAlerts(rules); }, [rules]);
  function setF(patch) { setFState(function (p) { return Object.assign({}, p, patch); }); }
  function toast(t) { const id = Math.random().toString(36).slice(2); setToasts(function (x) { return x.concat([Object.assign({ id: id }, t)]); }); setTimeout(function () { setToasts(function (x) { return x.filter(function (y) { return y.id !== id; }); }); }, t.ms || 4200); }
  function nav(r, patch) { if (patch) setF(patch); setRoute(r); const m = document.getElementById("gp-main"); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }
  function setCfg(p) { const n = Object.assign({}, cfg, p); setCfgS(n); localStorage.setItem("gp.cfg", JSON.stringify(n)); }
  function savePresets(list) { setPresets(list); localStorage.setItem("gp.presets", JSON.stringify(list)); }
  function copyLink() {
    const url = location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast({ tone: "positive", title: "Link copied", description: "Page, game, dates and filters are encoded in the URL." }); })
      .catch(function () { toast({ tone: "info", title: "Copy this link", description: url, ms: 8000 }); });
  }
  if (!authed) return <Login onDone={function () { setAuthed(true); }} />;
  const mobile = vw < 900;
  const Page = (window.Pages || {})[route];
  const R = window.ROUTES.find(function (r) { return r.id === route; });
  const ctx = { F: F, setF: setF, route: route, nav: nav, toast: toast, cfg: cfg, setCfg: setCfg, theme: theme, setTheme: setThemeS, role: role, setRole: function (r) { setRole(r); localStorage.setItem("gp.role", r); }, sim: sim, setSim: setSim,
    presets: presets, savePresets: savePresets, rules: rules, setRules: setRules, alerts: alerts, mobile: mobile, signOut: signOut };
  function signOut() { sessionStorage.removeItem("gp.auth"); localStorage.removeItem("gp.auth"); setAuthed(false); }
  return (
    <window.AppCtx.Provider value={ctx}>
      <div style={{ display: "flex", minHeight: "100vh" }} key={cfg.currency + cfg.tz}>
        <Sidebar route={route} collapsed={collapsed} setCollapsed={function (c) { setCollapsed(c); localStorage.setItem("gp.collapsed", c ? "1" : "0"); }} mobile={mobile} open={mobileOpen} onClose={function () { setMobileOpen(false); }}
          alertCount={alerts.filter(function (a) { return a.severity === "critical"; }).length} onSignOut={signOut} role={role} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar F={F} setF={setF} route={route} mobile={mobile} onMenu={function () { setMobileOpen(true); }} theme={theme} setTheme={setThemeS} onAI={function () { setAiOpen(true); }} />
          <FilterBar F={F} setF={setF} route={route} mobile={mobile} presets={presets} onCopy={copyLink}
            onReset={function () { setFState(Object.assign({}, window.DEFAULT_F, { game: F.game })); toast({ tone: "info", title: "Filters reset", description: "Game selection kept." }); }}
            onSave={function () { setSaveName(R.label + (F.game !== "all" ? " · " + window.gameById(F.game).name : "")); setSaveOpen(true); }}
            onPreset={function (id) { const p = presets.find(function (x) { return x.id === id; }); if (p) { setFState(window.decode(p.q)); setRoute(p.route); toast({ tone: "info", title: "Loaded “" + p.name + "”" }); } }} />
          <main id="gp-main" style={{ flex: 1, padding: mobile ? 16 : 24, maxWidth: 1600, width: "100%", margin: "0 auto" }}>
            <window.PageHeaderSlot R={R} />
            <window.SimGate route={route}>{Page ? <Page /> : null}</window.SimGate>
          </main>
        </div>
      </div>
      <div style={{ position: "fixed", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 70 }}>
        {toasts.map(function (t) { return <Toast key={t.id} tone={t.tone} title={t.title} description={t.description} onClose={function () { setToasts(function (x) { return x.filter(function (y) { return y.id !== t.id; }); }); }} />; })}
      </div>
      {aiOpen && route !== "ai" && window.AIPanel ? <window.AIPanel onClose={function () { setAiOpen(false); }} /> : null}
      <Dialog open={saveOpen} onClose={function () { setSaveOpen(false); }} title="Save view" description="Stores this page with its game, date range and filters in this browser."
        footer={<><Button onClick={function () { setSaveOpen(false); }}>Cancel</Button><Button variant="primary" disabled={!saveName.trim()} onClick={function () {
          savePresets(presets.concat([{ id: Date.now().toString(36), name: saveName.trim(), route: route, q: window.encode(F), created: Date.now() }])); setSaveOpen(false); toast({ tone: "positive", title: "View saved", description: "Find it under Saved views or in Reports." }); }}>Save</Button></>}>
        <Input value={saveName} onChange={setSaveName} autoFocus placeholder="View name" />
        <p style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", margin: "10px 0 0" }}>Team-shared views need the backend (Phase 4). Until then, share with Copy link.</p>
      </Dialog>
    </window.AppCtx.Provider>
  );
}
function PageHeaderSlot({ R }) { return null; }
window.PageHeaderSlot = PageHeaderSlot;
window.GPApp = App;
});
