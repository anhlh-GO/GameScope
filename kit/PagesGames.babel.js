window.__dsReady.then(function (DS) {
const { Card, Badge, Button, IconButton, Dialog, Input, Select, Tabs, EmptyState, Icon } = DS;
const { useApp, PageHeader } = window;

/* ================= QUẢN LÝ GAME =================
   Danh sách game: data/games.js (scripts/fetch-games.mjs kéo từ Google Sheet).
   Chỉnh sửa (status, tích Tracking/MO/Source, ghi chú, link, ưu tiên, ẩn), game tự thêm và tài liệu:
   - Lưu chung khi có GP_CONFIG.gmSyncUrl (Apps Script web app, scripts/gm-sync.gs) — cả team thấy giống nhau, có thông báo.
   - Nếu chưa cài: lưu trên trình duyệt này (localStorage). */
const C = window.GP_CONFIG || {};
const LS = { store: "gp.games.store", me: "gp.games.me", seen: "gp.games.seen", url: "gp.games.syncUrl", token: "gp.games.syncToken" };
const lsGet = function (k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const EMPTY_STORE = { edits: {}, custom: {}, docs: {}, bench: {}, log: [] };

const UA_OPTS = [["Pre-launch", "neutral"], ["Testing", "warning"], ["Scaling", "positive"], ["Paused", "info"], ["Stopped", "negative"]];
const STORE_OPTS = [["Chưa live", "neutral"], ["Review", "info"], ["Live", "positive"], ["Removed", "negative"]];
const CRE_OPTS = [["Creative đủ", "accent"], ["Creative đang làm", "warning"], ["Thiếu creative", "negative"]];
const CHECKS = [["ckTracking", "Tracking"], ["ckMo", "Monetization"], ["ckSource", "Source"]];
const DOC_CATS = ["Tích hợp SDK", "Tracking (AF / Adjust)", "Mediation / Ads", "Firebase", "Store / Console", "Creative", "Quy trình", "Khác"];
const RUNNING = ["testing", "scaling"];
/* cột B "UA" chứa người chạy UA hoặc một trạng thái (Not run / Pending / Tool) */
const UA_STATES = ["not run", "pending", "tool", "stop", "stopped"];
function uaPerson(v) { return !!v && UA_STATES.indexOf(String(v).trim().toLowerCase()) < 0; }
const TRACK_LABEL = { appsflyer: "AF", af: "AF", adjust: "Adjust", aj: "Adjust" };
function trackLabel(t) { return TRACK_LABEL[String(t).toLowerCase()] || t; }
function isOn(v) { return /^(true|x|yes|có|co|1|ok)$/i.test(String(v || "").trim()); }
const TONE_BG = { neutral: "var(--neutral-soft)", accent: "var(--accent-soft)", positive: "var(--positive-soft)", negative: "var(--negative-soft)", warning: "var(--warning-soft)", info: "var(--info-soft)" };
const TONE_FG = { neutral: "var(--text-secondary)", accent: "var(--accent-text)", positive: "var(--positive)", negative: "var(--negative)", warning: "var(--warning)", info: "var(--info)" };
const toneOf = function (opts, v) { const o = opts.find(function (x) { return x[0].toLowerCase() === String(v || "").toLowerCase(); }); return o ? o[1] : "neutral"; };
const EDIT_FIELDS = ["name", "pkg", "platform", "partner", "ua", "mo", "created", "live", "tracking", "mediation", "firebase", "statusUA", "store", "creative", "note", "drive", "creativeLink", "ga4", "aD1", "aD7", "aD14", "aD28", "aB", "aI", "aR", "aT"];
const LABEL = { name: "Tên game", pkg: "Package / Store ID", platform: "Platform", partner: "Đối tác (thư mục)", ua: "Người chạy UA", mo: "Người MO", created: "Ngày tạo ID", live: "Ngày live store", tracking: "Tracking (MMP)", mediation: "Mediation", firebase: "Firebase", statusUA: "Status UA", store: "Trạng thái store", creative: "Creative", note: "Ghi chú", drive: "Link thư mục Game (Drive)", creativeLink: "Link thư mục Creative",
  ckTracking: "Tracking", ckMo: "Monetization", ckSource: "Source", star: "Ưu tiên", hidden: "Ẩn", title: "Tiêu đề", url: "Link", cat: "Nhóm", game: "Game liên quan",
  bench: "Benchmark", ga4: "Game GA4 tương ứng", aD1: "D1 (%)", aD7: "D7 (%)", aD14: "D14 (%)", aD28: "D28 (%)", aB: "IMP/DAU Banner", aI: "IMP/DAU Inter", aR: "IMP/DAU Rewarded", aT: "IMP/DAU tổng",
  platformB: "Platform", label: "Nguồn / ghi chú ngắn", partners: "Tự áp dụng cho đối tác", d1: "D1", d7: "D7", d14: "D14", d28: "D28", impB: "IMP B", impI: "IMP I", impR: "IMP R", impT: "IMP T" };

function keyOfGame(g) { return ((g.pkg || g.name || "") + "|" + (g.platform || "")).trim().toLowerCase(); }
function platformsOf(p) { p = String(p || "").toLowerCase(); const o = []; if (/android|\band\b|aos|google/.test(p)) o.push("Android"); if (/ios|apple|iphone/.test(p)) o.push("iOS"); return o.length ? o : (p ? [String(p)] : []); }
function parseDate(s) {
  s = String(s || "").trim(); if (!s) return null;
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return Date.UTC(y, +m[2] - 1, +m[1]); }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const t = Date.parse(s); return isNaN(t) ? null : t;
}
function fmtDate(t) { if (t == null) return ""; const d = new Date(t); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0") + "/" + d.getUTCFullYear(); }
function fmtTs(t) { const d = new Date(t); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(function (a, b) { return String(a).localeCompare(String(b), "vi"); }); }
function splitList(s) { return String(s || "").split(/[,;/|+]|>>/).map(function (x) { return x.trim(); }).filter(Boolean); }
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d"); }
function gameLabel(g) { return g.name + (g._plat && g._plat.length ? " · " + g._plat.join(", ") : ""); }
/* one line of history, e.g. "Tracking: đã tích" */
function describe(l) {
  if (l.f === "_create") return l.c === "docs" ? "Thêm tài liệu" : "Thêm game mới";
  if (l.f === "_delete") return l.c === "docs" ? "Xoá tài liệu" : "Xoá game";
  const lab = LABEL[l.f] || l.f;
  if (l.f === "star") return l.to ? "Đánh dấu ưu tiên" : "Bỏ ưu tiên";
  if (l.f === "hidden") return l.to ? "Ẩn game" : "Hiện lại game";
  if (typeof l.to === "boolean") return lab + ": " + (l.to ? "đã tích" : "bỏ tích");
  return lab + ": " + (l.to === "" || l.to == null ? "(xoá)" : String(l.to).length > 80 ? String(l.to).slice(0, 80) + "…" : l.to);
}

/* ---------- benchmark ----------
   Metrics: retention D1/D7/D14/D28 (%) and ad impressions per DAU by format (B banner, I inter, R rewarded, T total).
   A benchmark is either a custom entry (tab Benchmark, typed in) or a GamePulse GA4 game (computed from data/live.js).
   The game's own numbers: typed in the edit dialog (wins per metric) or its matched GA4 game.
   A metric turns green when the game beats the benchmark; otherwise it stays as is. */
const BM = [["d1", "D1", "rr"], ["d7", "D7", "rr"], ["d14", "D14", "rr"], ["d28", "D28", "rr"], ["impB", "B", "imp"], ["impI", "I", "imp"], ["impR", "R", "imp"], ["impT", "T", "imp"]];
const ACT = { d1: "aD1", d7: "aD7", d14: "aD14", d28: "aD28", impB: "aB", impI: "aI", impR: "aR", impT: "aT" };
const num = function (v) { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(",", ".").replace("%", "")); return isNaN(n) ? null : n; };
const fmtM = function (m, v) { return v == null ? "–" : m[2] === "rr" ? v.toFixed(2) + "%" : v.toFixed(2); };
const GA4 = (function () {
  const L = window.GP_LIVE; if (!L || !L.games || !L.games.length || !L.rows) return null;
  const iDau = 4 + L.fields.indexOf("active_users"), iImp = 4 + L.fields.indexOf("publisher_ad_impressions");
  const last = L.rows.reduce(function (m, r) { return r[1] > m ? r[1] : m; }, 0);
  const cache = {};
  /* last 30 mature cohorts per day-n; imp/DAU over the last 30 days. pi: 0 Android, 1 iOS, -1 both */
  function metrics(gi, pi) {
    const k = gi + "|" + pi; if (cache[k]) return cache[k];
    const coh = {};
    (L.ret || []).forEach(function (t) { if (t[0] !== gi || (pi >= 0 && t[2] !== pi)) return; const ck = t[1] + "|" + t[2]; (coh[ck] = coh[ck] || { c: t[1] })[t[3]] = t[4]; });
    const out = { _src: "GA4" };
    [["d1", 1], ["d7", 7], ["d14", 14], ["d28", 28]].forEach(function (x) {
      const n = x[1]; let a = 0, b = 0;
      Object.keys(coh).forEach(function (ck) { const o = coh[ck]; if (!o[0] || o.c > last - n || o.c < last - n - 29) return; a += o[n] || 0; b += o[0]; });
      out[x[0]] = b >= 50 ? a / b * 100 : null;
    });
    let imp = 0, dau = 0;
    L.rows.forEach(function (r) { if (r[0] !== gi || (pi >= 0 && r[2] !== pi) || r[1] <= last - 30) return; imp += r[iImp] || 0; dau += r[iDau] || 0; });
    out.impT = dau >= 50 && imp > 0 ? imp / dau : null;
    return (cache[k] = out);
  }
  const STOP = ["pl", "fun", "tg", "zg", "csc", "tee", "wu", "game", "games", "the", "and", "3d", "ocd", "asmr"];
  const toks = function (s) { return norm(s).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && STOP.indexOf(w) < 0; }); };
  const gt = L.games.map(function (g) { return toks(g.name); });
  /* best GA4 property for a game name: most of the name's words appear in the property name */
  function match(name) {
    const t = toks(name); if (!t.length) return -1;
    let best = -1, bs = 0;
    gt.forEach(function (w, i) { const hit = t.filter(function (x) { return w.indexOf(x) >= 0; }).length; const sc = hit / Math.max(t.length, 1); if (hit >= Math.min(2, t.length) && sc >= .6 && sc > bs) { bs = sc; best = i; } });
    return best;
  }
  return { games: L.games, metrics: metrics, match: match };
})();
const piOf = function (g) { return g._plat.length === 1 ? (g._plat[0] === "Android" ? 0 : g._plat[0] === "iOS" ? 1 : -1) : -1; };
function benchValues(b) { const o = {}; BM.forEach(function (m) { o[m[0]] = num(b[m[0]]); }); return o; }
/* the game's own numbers: typed values first, then its GA4 property */
function actualOf(g) {
  let gi = -1;
  if (GA4) { if (g.ga4 === "none") gi = -1; else if (g.ga4) gi = GA4.games.findIndex(function (x) { return x.id === g.ga4; }); else gi = GA4.match(g.name); }
  const base = gi >= 0 ? GA4.metrics(gi, piOf(g)) : {};
  const o = { _ga4: gi >= 0 ? GA4.games[gi].name : "" }; let any = false;
  BM.forEach(function (m) { const typed = num(g[ACT[m[0]]]); o[m[0]] = typed != null ? typed : (base[m[0]] != null ? base[m[0]] : null); if (o[m[0]] != null) any = true; });
  o._any = any; return o;
}
/* auto benchmark: custom entry for this partner + platform, else this platform, else any default (no partner / platform) */
function autoBench(g, list) {
  const p = (g._partner || "").toLowerCase();
  const okPlat = function (b) { return !b.platform || g._plat.indexOf(b.platform) >= 0; };
  const hasP = function (b) { return splitList(b.partners).map(function (x) { return x.toLowerCase(); }).indexOf(p) >= 0; };
  return list.find(function (b) { return b.partners && p && hasP(b) && okPlat(b) && b.platform; })
    || list.find(function (b) { return b.partners && p && hasP(b) && okPlat(b); })
    || list.find(function (b) { return !b.partners && b.platform && okPlat(b); })
    || list.find(function (b) { return !b.partners && !b.platform; }) || null;
}

/* ---------- store: shared (Apps Script) or this browser ---------- */
function useGMStore(toast) {
  const url = C.gmSyncUrl || lsGet(LS.url, "");
  const token = C.gmSyncToken || lsGet(LS.token, "");
  const shared = !!url;
  const [data, setData] = React.useState(function () { return shared ? EMPTY_STORE : Object.assign({}, EMPTY_STORE, lsGet(LS.store, {})); });
  const [status, setStatus] = React.useState(shared ? "loading" : "local"); /* loading | ok | error | local */
  const [syncedAt, setSyncedAt] = React.useState(null);
  const dataRef = React.useRef(data); dataRef.current = data;
  const clean = function (j) { return { edits: j.edits || {}, custom: j.custom || {}, docs: j.docs || {}, bench: j.bench || {}, log: j.log || [] }; };
  const refresh = React.useCallback(function () {
    if (!shared) return Promise.resolve();
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "token=" + encodeURIComponent(token), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || "lỗi máy chủ");
      setData(clean(j)); setStatus("ok"); setSyncedAt(Date.now());
    }).catch(function (e) { setStatus("error"); throw e; });
  }, [url, token]);
  React.useEffect(function () {
    if (!shared) return;
    refresh().catch(function (e) { toast({ tone: "negative", title: "Không tải được dữ liệu chung", description: String(e.message || e) }); });
    const iv = setInterval(function () { if (!document.hidden) refresh().catch(function () {}); }, 60000);
    const onFocus = function () { refresh().catch(function () {}); };
    window.addEventListener("focus", onFocus);
    return function () { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [refresh]);
  /* write: merge `patch` into coll[id] (null value = clear field) or remove it; logs: [{ f, to, n }] */
  function write(coll, id, patch, opts) {
    opts = opts || {};
    const me = lsGet(LS.me, "") || "Tôi";
    const cur = dataRef.current, next = Object.assign({}, cur, { [coll]: Object.assign({}, cur[coll]) });
    if (opts.remove) delete next[coll][id];
    else { const rec = Object.assign({}, next[coll][id] || {}); Object.keys(patch || {}).forEach(function (k) { if (patch[k] === null) delete rec[k]; else rec[k] = patch[k]; }); next[coll][id] = rec; }
    const now = Date.now();
    next.log = cur.log.concat((opts.logs || []).map(function (l) { return { t: now, u: me, c: coll, k: id, n: l.n, f: l.f, to: l.to }; })).slice(-1500);
    setData(next);
    if (!shared) { lsSet(LS.store, next); return Promise.resolve(); }
    setStatus("loading");
    return fetch(url, { method: "POST", body: JSON.stringify({ token: token, user: me, coll: coll, id: id, patch: patch, remove: !!opts.remove, logs: opts.logs || [] }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || "lỗi máy chủ"); setData(clean(j)); setStatus("ok"); setSyncedAt(Date.now()); })
      .catch(function (e) { setStatus("error"); toast({ tone: "negative", title: "Chưa lưu được lên dữ liệu chung", description: "Thay đổi sẽ mất khi tải lại trang. Lỗi: " + String(e.message || e) }); refresh().catch(function () {}); });
  }
  function replaceLocal(j) { const n = Object.assign({}, EMPTY_STORE, j); setData(n); lsSet(LS.store, n); }
  return { data: data, write: write, refresh: refresh, shared: shared, status: status, syncedAt: syncedAt, replaceLocal: replaceLocal };
}

/* ---------- small controls ---------- */
/* native select styled as a tone pill — used inside table rows (menus never get clipped by the scroll container) */
function Pill({ value, onChange, opts, placeholder, width }) {
  const t = value ? toneOf(opts, value) : "neutral";
  const has = opts.some(function (o) { return o[0] === value; });
  return <select value={value || ""} onChange={function (e) { onChange(e.target.value); }} title={placeholder}
    style={{ width: width || "100%", height: 26, padding: "0 6px", borderRadius: 6, border: "1px solid " + (value ? "transparent" : "var(--border-default)"), background: value ? TONE_BG[t] : "var(--bg-raised)", color: value ? TONE_FG[t] : "var(--text-tertiary)", font: "500 12px/1 var(--font-sans)", cursor: "pointer" }}>
    <option value="">{placeholder}</option>
    {!has && value ? <option value={value}>{value}</option> : null}
    {opts.map(function (o) { return <option key={o[0]} value={o[0]}>{o[0]}</option>; })}
  </select>;
}
function FSel({ value, onChange, options, placeholder }) {
  return <select value={value} onChange={function (e) { onChange(e.target.value); }}
    style={{ width: "100%", height: 28, padding: "0 6px", borderRadius: 6, border: "1px solid " + (value ? "var(--accent)" : "var(--border-default)"), background: "var(--bg-raised)", color: value ? "var(--text-primary)" : "var(--text-tertiary)", font: "500 12px/1 var(--font-sans)" }}>
    <option value="">{placeholder}</option>
    {options.map(function (o) { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return <option key={v} value={v}>{l}</option>; })}
  </select>;
}
function FText({ value, onChange, placeholder }) {
  return <input value={value} onChange={function (e) { onChange(e.target.value); }} placeholder={placeholder}
    style={{ width: "100%", height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid " + (value ? "var(--accent)" : "var(--border-default)"), background: "var(--bg-raised)", color: "var(--text-primary)", font: "400 12px/1 var(--font-sans)", boxSizing: "border-box" }} />;
}
function Tag({ children, tone }) {
  return <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, font: "500 11px/1.3 var(--font-mono)", background: TONE_BG[tone || "neutral"], color: TONE_FG[tone || "neutral"], border: tone ? "0" : "1px solid var(--border-subtle)" }}>{children}</span>;
}
function Tick({ on, label, onChange }) {
  return <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", userSelect: "none" }} title={label + (on ? ": xong" : ": chưa xong")}>
    <span style={{ width: 18, height: 18, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", border: on ? "0" : "1.5px solid var(--border-strong)", background: on ? "var(--positive)" : "var(--bg-raised)", color: "#fff" }}>{on ? <Icon name="check" size={13} strokeWidth={3} /> : null}</span>
    <input type="checkbox" checked={!!on} onChange={function (e) { onChange(e.target.checked); }} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
    <span style={{ font: (on ? "600 " : "400 ") + "10.5px/1 var(--font-sans)", color: on ? "var(--positive)" : "var(--text-tertiary)" }}>{on ? "Xong" : label}</span>
  </label>;
}
function Kpi({ label, value, active, onClick, tone }) {
  return <button onClick={onClick} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer", font: "inherit", color: "inherit",
    border: "1px solid " + (active ? "var(--accent)" : "var(--border-subtle)"), background: active ? "var(--accent-soft)" : "var(--bg-surface)", boxShadow: active ? "0 0 0 1px var(--accent)" : "none" }}>
    <div style={{ font: "600 10.5px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: tone ? TONE_FG[tone] : "var(--text-tertiary)" }}>{label}</div>
    <div style={{ font: "600 22px/1.2 var(--font-sans)", marginTop: 6, color: tone && value ? TONE_FG[tone] : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </button>;
}
function LogList({ log, showGame }) {
  if (!log.length) return <EmptyState compact title="Chưa có thay đổi" description="Đổi trạng thái, tích ô hoặc sửa thông tin để ghi lại lịch sử." />;
  return <div style={{ display: "flex", flexDirection: "column", maxHeight: "60vh", overflowY: "auto" }}>
    {log.map(function (l, i) { return <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", font: "400 13px/1.45 var(--font-sans)" }}>
      <div><b style={{ fontWeight: 600 }}>{l.u}</b> <span style={{ color: "var(--text-tertiary)", font: "400 12px/1 var(--font-mono)" }}>· {fmtTs(l.t)}</span></div>
      {showGame && l.n ? <div>{l.n}</div> : null}
      <div style={{ color: "var(--text-secondary)" }}>{describe(l)}</div>
    </div>; })}
  </div>;
}

const EMPTY_COL = { bench: "", name: "", platform: "", ua: "", mo: "", tracking: "", mediation: "", ckTracking: "", ckMo: "", ckSource: "", statusUA: "notStopped", store: "", folder: "", note: "" };

function GamesPage() {
  const app = useApp();
  const SRC = window.GP_GAMES || null;
  const S = useGMStore(app.toast);
  const D = S.data;
  const [tab, setTab] = React.useState(function () { return lsGet("gp.games.tab", "games"); });
  const [me, setMeS] = React.useState(function () { return lsGet(LS.me, ""); });
  const [askName, setAskName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [seen, setSeenS] = React.useState(function () { return lsGet(LS.seen, 0); });
  const [notifOpen, setNotifOpen] = React.useState(true);
  const [fullLog, setFullLog] = React.useState(false);
  const [syncOpen, setSyncOpen] = React.useState(false);
  const [syncDraft, setSyncDraft] = React.useState({ url: "", token: "" });
  const [partners, setPartners] = React.useState([]);
  const [kpi, setKpi] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [age, setAge] = React.useState("");
  const [col, setCol] = React.useState(EMPTY_COL);
  const [sort, setSort] = React.useState({ k: "created", dir: -1 });
  const [editing, setEditing] = React.useState(null); /* { key, src, draft, isNew } */
  const [hist, setHist] = React.useState(null);
  const pendingRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const setC = function (p) { setCol(Object.assign({}, col, p)); };
  React.useEffect(function () { lsSet("gp.games.tab", tab); }, [tab]);

  /* first visit: nothing is "new" yet */
  React.useEffect(function () { if (!seen) { const n = Date.now(); lsSet(LS.seen, n); setSeenS(n); } }, []);
  /* toast when the 60s poll brings changes from someone else */
  const lastCount = React.useRef(null);
  const unread = D.log.filter(function (l) { return l.t > seen && l.u !== me; }).slice().reverse();
  React.useEffect(function () {
    if (lastCount.current != null && unread.length > lastCount.current) { setNotifOpen(true); app.toast({ tone: "info", title: (unread.length - lastCount.current) + " cập nhật mới", description: unread[0].u + " · " + (unread[0].n || "") + " · " + describe(unread[0]) }); }
    lastCount.current = unread.length;
  }, [unread.length]);
  function markSeen() { const t = D.log.reduce(function (m, l) { return Math.max(m, l.t); }, Date.now()); lsSet(LS.seen, t); setSeenS(t); setNotifOpen(false); }

  /* every write needs a name in shared mode, so the team knows who changed what */
  function needName(fn) { if (S.shared && !me) { pendingRef.current = fn; setNameDraft(""); setAskName(true); return; } fn(); }
  function saveName() { const n = nameDraft.trim(); if (!n) return; lsSet(LS.me, n); setMeS(n); setAskName(false); const f = pendingRef.current; pendingRef.current = null; if (f) setTimeout(f, 0); }

  /* merge sheet rows + hand-added games + edits */
  const all = React.useMemo(function () {
    const base = ((SRC && SRC.games) || []).map(function (g) { return Object.assign({ _src: "sheet" }, g); })
      .concat(Object.keys(D.custom).map(function (k) { return Object.assign({ _src: "custom", _key: k }, D.custom[k]); }));
    const seenK = {}, canon = {};
    /* "Robust" và "robust" là một đối tác: giữ cách viết phổ biến nhất */
    const freq = {}; base.forEach(function (g) { const p = (g.partner || "").trim(); if (p) freq[p] = (freq[p] || 0) + 1; });
    Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).forEach(function (p) { const k = p.toLowerCase(); if (!canon[k]) canon[k] = p; });
    return base.map(function (g) {
      const key = g._src === "custom" ? g._key : keyOfGame(g);
      const m = Object.assign({}, g, g._src === "custom" ? {} : (D.edits[key] || {}), { _key: key, _src: g._src });
      m._plat = platformsOf(m.platform);
      m._created = parseDate(m.created); m._live = parseDate(m.live);
      m._partner = canon[(m.partner || "").trim().toLowerCase()] || "";
      m._dup = seenK[key] = (seenK[key] || 0) + 1;
      return m;
    }).filter(function (g) { return g._dup === 1; });
  }, [SRC, D.custom, D.edits]);
  const benchList = Object.keys(D.bench).map(function (id) { return Object.assign({ id: id }, D.bench[id]); }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), "vi"); });
  const benchName = function (b) { return b.name + (b.platform ? " · " + b.platform : "") + (b.label ? " · " + b.label : ""); };
  function resolveBench(g) {
    const sel = g.bench || "";
    if (sel === "none") return { kind: "none" };
    if (sel.indexOf("b:") === 0) { const b = D.bench[sel.slice(2)]; return b ? { kind: "pick", title: benchName(b), short: b.name, v: benchValues(b) } : { kind: "missing" }; }
    if (sel.indexOf("g:") === 0 && GA4) { const parts = sel.slice(2).split("|"); const gi = GA4.games.findIndex(function (x) { return x.id === parts[0]; }); if (gi < 0) return { kind: "missing" };
      const pi = +parts[1]; return { kind: "pick", title: GA4.games[gi].name + " · " + (pi === 0 ? "Android" : pi === 1 ? "iOS" : "Tất cả") + " · GA4 30 ngày", short: GA4.games[gi].name, v: GA4.metrics(gi, pi) }; }
    const a = autoBench(g, benchList);
    return a ? { kind: "auto", title: benchName(a), short: a.name, v: benchValues(a) } : { kind: "auto-none" };
  }
  const benchOpts = benchList.map(function (b) { return ["b:" + b.id, benchName(b)]; });
  const ga4Opts = GA4 ? [].concat.apply([], GA4.games.map(function (x) { return [["g:" + x.id + "|0", x.name + " · Android"], ["g:" + x.id + "|1", x.name + " · iOS"]]; })) : [];
  const logCount = React.useMemo(function () { const m = {}; D.log.forEach(function (l) { if (l.c !== "docs") m[l.k] = (m[l.k] || 0) + 1; }); return m; }, [D.log]);

  const visible = all.filter(function (g) { return !g.hidden; });
  /* status đặt trên dashboard được ưu tiên; nếu chưa đặt thì dựa vào cột UA của sheet (tên người = đang chạy, "Not run" = chưa chạy) */
  const isRunning = function (g) { const s = String(g.statusUA || "").toLowerCase(); return s ? RUNNING.indexOf(s) >= 0 : uaPerson(g.ua); };
  const notRun = function (g) { const s = String(g.statusUA || "").toLowerCase(); return s ? s === "pre-launch" : String(g.ua || "").trim().toLowerCase() === "not run" || !g.ua; };
  const isLive = function (g) { return g.store ? String(g.store).toLowerCase() === "live" : g._live != null; };
  const counts = {
    all: visible.length, android: visible.filter(function (g) { return g._plat.indexOf("Android") >= 0; }).length, ios: visible.filter(function (g) { return g._plat.indexOf("iOS") >= 0; }).length,
    live: visible.filter(isLive).length, running: visible.filter(isRunning).length, notrun: visible.filter(notRun).length,
    nofolder: visible.filter(function (g) { return !g.drive; }).length, star: visible.filter(function (g) { return g.star; }).length, hidden: all.filter(function (g) { return g.hidden; }).length
  };
  const KPIS = [["all", "Tổng game"], ["android", "Android"], ["ios", "iOS"], ["live", "Live trên store"], ["running", "Đang chạy UA"], ["notrun", "UA not run"], ["nofolder", "Thiếu thư mục", "negative"], ["star", "Ưu tiên"], ["hidden", "Đã ẩn"]];
  const kpiFn = { all: function () { return true; }, android: function (g) { return g._plat.indexOf("Android") >= 0; }, ios: function (g) { return g._plat.indexOf("iOS") >= 0; },
    live: isLive, running: isRunning, notrun: notRun, nofolder: function (g) { return !g.drive; }, star: function (g) { return g.star; }, hidden: function () { return true; } };

  const pool = kpi === "hidden" ? all.filter(function (g) { return g.hidden; }) : visible;
  const partnerList = uniq(pool.map(function (g) { return g._partner || "(Chưa rõ đối tác)"; }));
  const pc = function (p) { return pool.filter(function (g) { return (g._partner || "(Chưa rõ đối tác)") === p; }).length; };
  const topPartners = partnerList.slice().sort(function (a, b) { return pc(b) - pc(a); }).slice(0, 16);
  const people = function (f) { return uniq(visible.map(function (g) { return g[f]; })); };
  const listOf = function (f) { return uniq([].concat.apply([], visible.map(function (g) { return splitList(g[f]); }))); };

  const terms = q.trim().split(/\s+/).filter(Boolean).map(function (t) { return t[0] === "-" && t.length > 1 ? { neg: true, t: norm(t.slice(1)) } : { neg: false, t: norm(t) }; });
  const ageMs = { "7": 7, "30": 30, "90": 90, "180": 180 }[age];
  const rows = pool.filter(function (g) {
    if (!kpiFn[kpi](g)) return false;
    if (partners.length && partners.indexOf(g._partner || "(Chưa rõ đối tác)") < 0) return false;
    if (terms.length) { const hay = norm([g.name, g.pkg, g.partner, g.ua, g.mo, g.note, g.statusUA, g.store, g.creative].join(" ")); if (!terms.every(function (x) { return x.neg ? hay.indexOf(x.t) < 0 : hay.indexOf(x.t) >= 0; })) return false; }
    if (age === "year" && (g._created == null || new Date(g._created).getUTCFullYear() !== new Date().getUTCFullYear())) return false;
    if (ageMs && (g._created == null || g._created < Date.now() - ageMs * 864e5)) return false;
    if (col.name && norm(g.name + " " + g.pkg).indexOf(norm(col.name)) < 0) return false;
    if (col.platform && g._plat.indexOf(col.platform) < 0) return false;
    if (col.ua && g.ua !== col.ua) return false;
    if (col.mo && g.mo !== col.mo) return false;
    if (col.tracking && splitList(g.tracking).map(trackLabel).indexOf(col.tracking) < 0 && !(col.tracking === "Firebase" && isOn(g.firebase))) return false;
    if (col.mediation && splitList(g.mediation).indexOf(col.mediation) < 0) return false;
    for (let i = 0; i < CHECKS.length; i++) { const f = CHECKS[i][0]; if (col[f] === "done" && !g[f]) return false; if (col[f] === "todo" && g[f]) return false; }
    if (col.statusUA === "notStopped" && String(g.statusUA || "").toLowerCase() === "stopped") return false;
    if (col.statusUA === "(trống)" && g.statusUA) return false;
    if (col.statusUA && col.statusUA !== "notStopped" && col.statusUA !== "(trống)" && g.statusUA !== col.statusUA) return false;
    if (col.store && g.store !== col.store) return false;
    if (col.bench) {
      const r = resolveBench(g), a = actualOf(g), v = r.v || {};
      const cmp = BM.filter(function (m) { return v[m[0]] != null && a[m[0]] != null; }), beat = cmp.filter(function (m) { return a[m[0]] > v[m[0]]; });
      if (col.bench === "has" && !r.v) return false;
      if (col.bench === "nobench" && r.v) return false;
      if (col.bench === "nodata" && a._any) return false;
      if (col.bench === "beat" && !beat.length) return false;
      if (col.bench === "all" && !(cmp.length && beat.length === cmp.length)) return false;
    }
    if (col.folder === "has" && !g.drive) return false;
    if (col.folder === "missing" && g.drive) return false;
    if (col.note && norm(g.note).indexOf(norm(col.note)) < 0) return false;
    return true;
  }).sort(function (a, b) {
    if (!!b.star !== !!a.star) return b.star ? 1 : -1;
    const k = sort.k;
    const va = k === "created" ? a._created : String(a[k] || "").toLowerCase(), vb = k === "created" ? b._created : String(b[k] || "").toLowerCase();
    if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });

  const anyFilter = partners.length || kpi !== "all" || q || age || Object.keys(EMPTY_COL).some(function (k) { return col[k] !== EMPTY_COL[k]; });
  function clearAll() { setPartners([]); setKpi("all"); setQ(""); setAge(""); setCol(Object.assign({}, EMPTY_COL, { statusUA: "" })); }
  function togglePartner(p) { setPartners(partners.indexOf(p) >= 0 ? partners.filter(function (x) { return x !== p; }) : partners.concat([p])); }
  function copy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { app.toast({ tone: "positive", title: "Đã copy", description: t }); }).catch(function () {}); }

  /* change fields of one game (sheet games → "edits", hand-added → "custom") and log each change */
  function setGame(g, p, shown) {
    needName(function () {
      const logs = Object.keys(p).map(function (f) { return { f: f, to: shown && shown[f] != null ? shown[f] : p[f] === null ? "" : p[f], n: gameLabel(g) }; });
      S.write(g._src === "custom" ? "custom" : "edits", g._key, p, { logs: logs });
    });
  }
  function openEdit(g) { const d = {}; EDIT_FIELDS.forEach(function (f) { d[f] = g[f] || ""; }); setEditing({ key: g._key, src: g._src, draft: d }); }
  function openNew() { const d = {}; EDIT_FIELDS.forEach(function (f) { d[f] = ""; }); d.created = fmtDate(Date.now()); setEditing({ key: null, src: "custom", draft: d, isNew: true }); }
  function saveEdit() {
    const d = editing.draft;
    if (!d.name.trim()) { app.toast({ tone: "warning", title: "Cần nhập tên game" }); return; }
    const ed = editing;
    needName(function () {
      if (ed.isNew) {
        const key = "custom:" + Date.now().toString(36);
        const rec = {}; EDIT_FIELDS.forEach(function (f) { if (d[f]) rec[f] = d[f]; });
        S.write("custom", key, rec, { logs: [{ f: "_create", to: "", n: d.name + (d.platform ? " · " + platformsOf(d.platform).join(", ") : "") }] });
        app.toast({ tone: "positive", title: "Đã thêm " + d.name });
      } else {
        const base = all.find(function (g) { return g._key === ed.key; }) || {};
        const p = {}; EDIT_FIELDS.forEach(function (f) { if ((d[f] || "") !== (base[f] || "")) p[f] = d[f] || null; });
        if (Object.keys(p).length) { setGame(base, p); app.toast({ tone: "positive", title: "Đã lưu " + d.name }); }
      }
      setEditing(null);
    });
  }
  function hideOrDelete(g) {
    if (g._src === "custom") {
      if (!confirm("Xoá game tự thêm “" + g.name + "”? Không thể hoàn tác.")) return;
      needName(function () { S.write("custom", g._key, null, { remove: true, logs: [{ f: "_delete", to: "", n: gameLabel(g) }] }); });
      return;
    }
    setGame(g, { hidden: !g.hidden });
    app.toast({ tone: "info", title: g.hidden ? "Đã hiện lại " + g.name : "Đã ẩn " + g.name, description: g.hidden ? undefined : "Xem lại ở ô “Đã ẩn”." });
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(Object.assign({ v: 2, exportedAt: new Date().toISOString() }, D), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quan-ly-game-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
  }
  function importJson(file) {
    const r = new FileReader();
    r.onload = function () {
      try { const j = JSON.parse(r.result); if (!j || typeof j.edits !== "object") throw 0;
        S.replaceLocal({ edits: Object.assign({}, D.edits, j.edits), custom: Object.assign({}, D.custom, j.custom || {}), docs: Object.assign({}, D.docs, j.docs || {}), log: D.log.concat(j.log || []).sort(function (a, b) { return a.t - b.t; }).slice(-1500) });
        app.toast({ tone: "positive", title: "Đã nhập dữ liệu", description: Object.keys(j.edits).length + " game đã sửa · " + Object.keys(j.custom || {}).length + " game tự thêm · " + Object.keys(j.docs || {}).length + " tài liệu" });
      } catch (e) { app.toast({ tone: "negative", title: "File không hợp lệ", description: "Chọn file .json được tạo bằng nút Xuất." }); }
    };
    r.readAsText(file);
  }
  function saveSync() {
    lsSet(LS.url, syncDraft.url.trim()); lsSet(LS.token, syncDraft.token.trim());
    app.toast({ tone: "positive", title: syncDraft.url.trim() ? "Đã lưu cài đặt đồng bộ" : "Đã tắt đồng bộ trên máy này", description: "Trang sẽ tải lại." });
    setTimeout(function () { location.reload(); }, 600);
  }

  const sortBtn = function (k, label) { return <span onClick={function () { setSort({ k: k, dir: sort.k === k ? -sort.dir : (k === "created" ? -1 : 1) }); }} style={{ cursor: "pointer" }}>{label}{sort.k === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</span>; };
  const syncBadge = S.shared
    ? (S.status === "error" ? <Badge key="y" tone="negative" dot>Lỗi đồng bộ</Badge> : S.status === "loading" ? <Badge key="y" tone="info" dot>Đang đồng bộ…</Badge> : <Badge key="y" tone="positive" dot>Lưu chung{S.syncedAt ? " · " + fmtTs(S.syncedAt).slice(11) : ""}</Badge>)
    : <Badge key="y" tone="warning" dot>Chỉ lưu trên máy này</Badge>;

  return (
    <div>
      <PageHeader title="Quản lý game" desc="Danh sách game kéo tự động từ sheet “Tạo ID Game_Publisher_new”. Đổi Status và tích Tracking / Monetization / Source ngay trên bảng, bấm bút chì để sửa thông tin khác."
        meta={[SRC ? <Badge key="s" tone="positive" dot>Sheet · cập nhật {fmtTs(SRC.updatedAt)}</Badge> : <Badge key="s" tone="warning" dot>Chưa có dữ liệu sheet</Badge>, syncBadge, <Badge key="n">{all.length} game · {Object.keys(D.docs).length} tài liệu</Badge>, me ? <Badge key="m" icon="user">{me}</Badge> : null].filter(Boolean)}
        actions={[
          <span key="b" style={{ position: "relative" }}><Button size="sm" iconLeft="bell" onClick={function () { setNotifOpen(true); if (!unread.length) setFullLog(true); }}>Thông báo</Button>
            {unread.length ? <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: "var(--negative)", color: "#fff", font: "600 11px/18px var(--font-sans)", textAlign: "center", pointerEvents: "none" }}>{unread.length > 99 ? "99+" : unread.length}</span> : null}</span>,
          tab === "games" ? <Button key="a" size="sm" variant="primary" iconLeft="plus" onClick={openNew}>Thêm game</Button> : null,
          <Button key="e" size="sm" iconLeft="download" onClick={exportJson}>Xuất</Button>,
          !S.shared ? <Button key="i" size="sm" iconLeft="upload" onClick={function () { fileRef.current && fileRef.current.click(); }}>Nhập</Button> : null,
          <IconButton key="c" size="sm" icon="settings" label="Cài đặt đồng bộ và tên" onClick={function () { setSyncDraft({ url: lsGet(LS.url, ""), token: lsGet(LS.token, "") }); setNameDraft(me); setSyncOpen(true); }} />
        ].filter(Boolean)} />
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={function (e) { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ""; }} />

      <Tabs value={tab} onChange={setTab} style={{ marginBottom: 16 }} items={[{ value: "games", label: "Game", count: all.length }, { value: "bench", label: "Benchmark", count: benchList.length }, { value: "docs", label: "Document", count: Object.keys(D.docs).length }]} />

      {notifOpen && unread.length ? <div style={{ position: "fixed", top: 64, right: 20, zIndex: 40, width: "min(380px, calc(100vw - 32px))", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, boxShadow: "var(--shadow-lg, 0 12px 32px rgba(0,0,0,.25))" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
          <b style={{ flex: 1, font: "600 14px/1.35 var(--font-sans)" }}>{unread.length} cập nhật mới từ lần trước bạn vào ({fmtTs(seen)})</b>
          <IconButton size="sm" icon="x" label="Đóng" onClick={function () { setNotifOpen(false); }} />
        </div>
        <div style={{ padding: "0 14px", maxHeight: 320, overflowY: "auto" }}><LogList log={unread.slice(0, 50)} showGame /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border-subtle)" }}>
          <Button size="sm" onClick={function () { setFullLog(true); }}>Xem lịch sử đầy đủ</Button>
          <Button size="sm" variant="primary" onClick={markSeen}>Đã xem</Button>
        </div>
      </div> : null}

      {tab === "docs" ? <DocsTab D={D} S={S} app={app} games={all} needName={needName} /> : tab === "bench" ? <BenchTab D={D} S={S} app={app} list={benchList} partners={uniq(all.map(function (g) { return g._partner; }))} needName={needName} /> : <>
      {!SRC ? <Card style={{ marginBottom: 16 }}><EmptyState compact title="Chưa kéo được sheet" description="Chưa có data/games.js. Kiểm tra sheet đã share (Viewer) cho service account và Google Sheets API đã bật, rồi chạy lại Action “Deploy GamePulse”. Trong lúc chờ vẫn có thể thêm game bằng tay." /></Card> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ font: "600 10.5px/1 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)", marginRight: 6 }}>Thư mục</span>
        <button onClick={function () { setPartners([]); }} style={chip(!partners.length)}>Tất cả <b style={{ marginLeft: 4 }}>{pool.length}</b></button>
        {topPartners.concat(partners.filter(function (p) { return topPartners.indexOf(p) < 0; })).map(function (p) { const on = partners.indexOf(p) >= 0; return <button key={p} onClick={function () { togglePartner(p); }} style={chip(on)}><Icon name="folder" size={13} color={on ? "currentColor" : "var(--warning)"} /> {p} <span style={{ marginLeft: 4, opacity: .7 }}>{pc(p)}</span></button>; })}
        {partnerList.length > 16 ? <Select size="sm" multiple searchable menuWidth={280} placeholder={"+" + (partnerList.length - 16) + " thư mục khác"} value={partners} onChange={setPartners}
          options={partnerList.map(function (p) { return { value: p, label: p + " (" + pc(p) + ")" }; })} /> : null}
      </div>
      <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginBottom: 14 }}>Bấm nhiều thư mục để chọn cùng lúc</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 14 }}>
        {KPIS.map(function (k) { return <Kpi key={k[0]} label={k[1]} value={counts[k[0]]} tone={k[2]} active={kpi === k[0]} onClick={function () { setKpi(kpi === k[0] && k[0] !== "all" ? "all" : k[0]); }} />; })}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 320px" }}><Input value={q} onChange={setQ} iconLeft="search" placeholder="Tìm nhanh: tên game, package, đối tác, người phụ trách, ghi chú… (gõ -từ để loại trừ)" /></div>
        <div style={{ width: 170 }}><FSel value={age} onChange={setAge} placeholder="Thời gian tạo ID" options={[["7", "7 ngày qua"], ["30", "30 ngày qua"], ["90", "90 ngày qua"], ["180", "180 ngày qua"], ["year", "Năm nay"]]} /></div>
        {anyFilter ? <Button size="sm" variant="ghost" iconLeft="x" onClick={clearAll}>Xoá mọi bộ lọc</Button> : null}
        <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginLeft: "auto" }}>{rows.length} / {pool.length} game</span>
      </div>

      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "auto", maxHeight: "calc(100vh - 210px)", background: "var(--bg-surface)" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1510, font: "400 13px/1.35 var(--font-sans)" }}>
          <colgroup><col style={{ width: 34 }} /><col style={{ width: 210 }} /><col style={{ width: 84 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 82 }} /><col style={{ width: 92 }} /><col style={{ width: 82 }} /><col style={{ width: 150 }} /><col style={{ width: 230 }} /><col style={{ width: 120 }} /><col /><col style={{ width: 100 }} /></colgroup>
          <thead>
            <tr><th style={th}>★</th><th style={th}>{sortBtn("name", "Game")} · package · {sortBtn("created", "ngày tạo ID")}</th><th style={th}>Platform</th><th style={th}>{sortBtn("ua", "UA")} / MO</th><th style={th}>MMP · Mediation</th>
              {CHECKS.map(function (c) { return <th key={c[0]} style={Object.assign({}, th, { textAlign: "center", background: "var(--positive-soft)" })}>{c[1]}</th>; })}
              <th style={th}>Status UA · Trạng thái</th><th style={Object.assign({}, th, { background: "var(--accent-soft)" })}>Benchmark · RR · IMP/DAU</th><th style={th}>Thư mục</th><th style={th}>Ghi chú</th><th style={th}></th></tr>
            <tr>
              <th style={thf}></th>
              <th style={thf}><FText value={col.name} onChange={function (v) { setC({ name: v }); }} placeholder="Tên hoặc package" /></th>
              <th style={thf}><FSel value={col.platform} onChange={function (v) { setC({ platform: v }); }} placeholder="Platform" options={["Android", "iOS"]} /></th>
              <th style={thf}><div style={{ display: "grid", gap: 4 }}><FSel value={col.ua} onChange={function (v) { setC({ ua: v }); }} placeholder="UA" options={people("ua")} /><FSel value={col.mo} onChange={function (v) { setC({ mo: v }); }} placeholder="MO" options={people("mo")} /></div></th>
              <th style={thf}><div style={{ display: "grid", gap: 4 }}><FSel value={col.tracking} onChange={function (v) { setC({ tracking: v }); }} placeholder="MMP" options={uniq(listOf("tracking").map(trackLabel).concat(["Firebase"]))} /><FSel value={col.mediation} onChange={function (v) { setC({ mediation: v }); }} placeholder="Mediation" options={listOf("mediation")} /></div></th>
              {CHECKS.map(function (c) { return <th key={c[0]} style={thf}><FSel value={col[c[0]]} onChange={function (v) { setC({ [c[0]]: v }); }} placeholder={c[1]} options={[["done", "Xong"], ["todo", "Chưa xong"]]} /></th>; })}
              <th style={thf}><div style={{ display: "grid", gap: 4 }}><FSel value={col.statusUA} onChange={function (v) { setC({ statusUA: v }); }} placeholder="Status UA" options={[["notStopped", "Status UA: trừ Stopped"], ["(trống)", "(trống)"]].concat(uniq(UA_OPTS.map(function (o) { return o[0]; }).concat(people("statusUA"))))} /><FSel value={col.store} onChange={function (v) { setC({ store: v }); }} placeholder="Trạng thái" options={uniq(STORE_OPTS.map(function (o) { return o[0]; }).concat(people("store")))} /></div></th>
              <th style={thf}><FSel value={col.bench} onChange={function (v) { setC({ bench: v }); }} placeholder="Benchmark" options={[["beat", "Có chỉ số vượt"], ["all", "Vượt tất cả chỉ số so được"], ["has", "Đã có benchmark"], ["nobench", "Chưa có benchmark"], ["nodata", "Chưa có số liệu game"]]} /></th>
              <th style={thf}><FSel value={col.folder} onChange={function (v) { setC({ folder: v }); }} placeholder="Có / thiếu link" options={[["has", "Có link Game"], ["missing", "Thiếu link Game"]]} /></th>
              <th style={thf}><FText value={col.note} onChange={function (v) { setC({ note: v }); }} placeholder="Tìm trong ghi chú" /></th>
              <th style={thf}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(function (g) {
              const rowBg = g.star ? "var(--warning-soft)" : g.hidden ? "var(--neutral-soft)" : "transparent";
              const nLog = logCount[g._key] || 0;
              return <tr key={g._key} style={{ background: rowBg, opacity: g.hidden ? .7 : 1 }}>
                <td style={Object.assign({}, td, { boxShadow: g.star ? "inset 3px 0 0 var(--warning)" : "none", textAlign: "center" })}>
                  <button onClick={function () { setGame(g, { star: !g.star }); }} title={g.star ? "Bỏ ưu tiên" : "Ưu tiên"} style={{ border: 0, background: "none", cursor: "pointer", color: g.star ? "var(--warning)" : "var(--text-tertiary)", fontSize: 15, padding: 0 }}>{g.star ? "★" : "☆"}</button></td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{g.name}{g._src === "custom" ? <span style={{ marginLeft: 6 }}><Tag tone="info">tự thêm</Tag></span> : null}</div>
                  {g.pkg ? <div style={{ display: "flex", gap: 4, alignItems: "flex-start", marginTop: 2 }}><span style={{ font: "400 11.5px/1.35 var(--font-mono)", color: "var(--accent-text)", wordBreak: "break-all" }}>{g.pkg}</span>
                    <button onClick={function () { copy(g.pkg); }} title="Copy package" style={{ border: 0, background: "none", cursor: "pointer", padding: 0, color: "var(--text-tertiary)" }}><Icon name="copy" size={12} /></button></div> : null}
                  <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 2 }}>{g._created != null ? "ID " + fmtDate(g._created) : g.created ? "ID " + g.created : ""}{g._live != null ? " · Live " + fmtDate(g._live) : ""}</div>
                </td>
                <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{g._plat.map(function (p) { return <Badge key={p} size="sm" tone={p === "iOS" ? "info" : p === "Android" ? "positive" : "neutral"}>{p}</Badge>; })}</div></td>
                <td style={td}>{uaPerson(g.ua) ? <div>{g.ua} <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>UA</span></div> : g.ua ? <div style={{ marginBottom: 2 }}><Tag tone={/not run/i.test(g.ua) ? "neutral" : "warning"}>UA: {g.ua}</Tag></div> : null}{g.mo ? <div>{g.mo} <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>MO</span></div> : null}</td>
                <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{splitList(g.tracking).map(function (t) { return <Tag key={t}>{trackLabel(t)}</Tag>; })}{g.mediation ? <Tag>{g.mediation}</Tag> : null}</div>
                  {isOn(g.firebase) ? <div style={{ marginTop: 4 }}><Tag tone="negative">Firebase</Tag></div> : null}</td>
                {CHECKS.map(function (c) { return <td key={c[0]} style={Object.assign({}, td, { textAlign: "center", position: "relative" })}><Tick on={!!g[c[0]]} label={c[1]} onChange={function (v) { setGame(g, { [c[0]]: v }); }} /></td>; })}
                <td style={td}><div style={{ display: "grid", gap: 4 }}>
                  <Pill value={g.statusUA} opts={UA_OPTS} placeholder="Status UA?" onChange={function (v) { setGame(g, { statusUA: v || null }); }} />
                  <Pill value={g.store} opts={STORE_OPTS} placeholder="Trạng thái store?" onChange={function (v) { setGame(g, { store: v || null }); }} />
                  <Pill value={g.creative} opts={CRE_OPTS} placeholder="Creative?" onChange={function (v) { setGame(g, { creative: v || null }); }} />
                </div></td>
                <td style={td}><BenchCell g={g} r={resolveBench(g)} act={actualOf(g)} benchOpts={benchOpts} ga4Opts={ga4Opts}
                  onChange={function (v, label) { setGame(g, { bench: v || null }, { bench: label }); }} /></td>
                <td style={td}><div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                  {g.drive ? <a href={g.drive} target="_blank" rel="noopener noreferrer" style={folderLink}><Icon name="folder" size={13} color="var(--warning)" /> Game</a> : <span style={{ font: "var(--type-caption)", color: "var(--negative)" }}>Thiếu link</span>}
                  {g.creativeLink ? <a href={g.creativeLink} target="_blank" rel="noopener noreferrer" style={folderLink}><Icon name="folder" size={13} color="var(--accent)" /> Creative</a> : null}
                  {g._partner ? <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{g._partner}</span> : null}
                </div></td>
                <td style={td}><div onClick={function () { openEdit(g); }} title="Bấm để sửa" style={{ cursor: "text", whiteSpace: "pre-wrap", color: g.note ? "var(--text-primary)" : "var(--text-tertiary)", fontStyle: g.note ? "normal" : "italic" }}>{g.note || "Chưa có ghi chú"}</div></td>
                <td style={td}><div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  <IconButton size="sm" icon="pencil" label="Sửa" onClick={function () { openEdit(g); }} />
                  <span style={{ position: "relative" }}><IconButton size="sm" icon="history" label="Lịch sử" onClick={function () { setHist(g); }} />{nLog ? <span style={{ position: "absolute", top: -4, right: -4, minWidth: 15, height: 15, borderRadius: 8, background: "var(--accent)", color: "var(--text-on-accent)", font: "600 9.5px/15px var(--font-sans)", textAlign: "center", pointerEvents: "none" }}>{nLog}</span> : null}</span>
                  <IconButton size="sm" icon={g._src === "custom" ? "trash-2" : g.hidden ? "eye" : "eye-off"} label={g._src === "custom" ? "Xoá" : g.hidden ? "Hiện lại" : "Ẩn"} onClick={function () { hideOrDelete(g); }} />
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!rows.length ? <div style={{ padding: 24 }}><EmptyState compact title="Không có game nào khớp bộ lọc" description="Thử bỏ bớt bộ lọc." action={anyFilter ? <Button size="sm" onClick={clearAll}>Xoá mọi bộ lọc</Button> : null} /></div> : null}
      </div>
      </>}

      <Dialog open={!!editing} onClose={function () { setEditing(null); }} width={640} title={editing && editing.isNew ? "Thêm game" : "Sửa game"}
        description={editing && editing.src === "sheet" ? "Thay đổi lưu trên dashboard và ghi đè giá trị lấy từ sheet; sheet gốc không bị sửa." : "Game tự thêm, không có trong sheet."}
        footer={<><Button variant="ghost" onClick={function () { setEditing(null); }}>Huỷ</Button><Button variant="primary" onClick={saveEdit}>Lưu</Button></>}>
        {editing ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 12, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
          {EDIT_FIELDS.map(function (f) {
            const set = function (v) { setEditing(Object.assign({}, editing, { draft: Object.assign({}, editing.draft, { [f]: v }) })); };
            if (f === "ga4") return <React.Fragment key={f}>
              <div style={{ gridColumn: "1 / -1", marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}><b style={{ fontWeight: 600 }}>Số liệu game để so với benchmark</b>
                <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 2 }}>Ô nào nhập tay sẽ được dùng thay cho số GA4. Để trống = lấy từ game GA4 tương ứng (nếu có).</div></div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{LABEL[f]}</span>
                <FSel value={editing.draft[f]} onChange={set} placeholder={(function () { const i = GA4 ? GA4.match(editing.draft.name) : -1; return i >= 0 ? "Tự động: " + GA4.games[i].name : "Tự động (chưa khớp game nào)"; })()}
                  options={[["none", "Không dùng GA4"]].concat(GA4 ? GA4.games.map(function (x) { return [x.id, x.name]; }) : [])} /></label>
            </React.Fragment>;
            const opts = f === "statusUA" ? UA_OPTS : f === "store" ? STORE_OPTS : f === "creative" ? CRE_OPTS : null;
            return <label key={f} style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: f === "note" ? "1 / -1" : undefined }}>
              <span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{LABEL[f]}</span>
              {f === "note" ? <textarea value={editing.draft[f]} onChange={function (e) { set(e.target.value); }} rows={3} style={{ padding: 8, borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", font: "inherit", resize: "vertical" }} />
                : opts ? <Pill value={editing.draft[f]} opts={opts} placeholder="—" onChange={set} />
                : <Input value={editing.draft[f]} onChange={set} placeholder={f === "drive" || f === "creativeLink" ? "https://drive.google.com/…" : f === "created" || f === "live" ? "dd/mm/yyyy" : /^a[DBIRT]/.test(f) ? (f.indexOf("aD") === 0 ? "vd 35.2" : "vd 4.5") : ""} />}
            </label>;
          })}
        </div> : null}
      </Dialog>

      <Dialog open={!!hist} onClose={function () { setHist(null); }} width={520} title={hist ? "Lịch sử · " + hist.name : ""} description={S.shared ? "Mọi thay đổi của cả team trên game này." : "Các thay đổi trên trình duyệt này."}
        footer={<Button onClick={function () { setHist(null); }}>Đóng</Button>}>
        {hist ? <LogList log={D.log.filter(function (l) { return l.k === hist._key && l.c !== "docs"; }).slice().reverse()} /> : null}
      </Dialog>

      <Dialog open={fullLog} onClose={function () { setFullLog(false); }} width={560} title="Lịch sử đầy đủ" description={D.log.length + " thay đổi gần nhất" + (S.shared ? " của cả team" : " trên trình duyệt này") + "."}
        footer={<>{unread.length ? <Button onClick={function () { markSeen(); setFullLog(false); }}>Đánh dấu đã xem hết</Button> : null}<Button variant="primary" onClick={function () { setFullLog(false); }}>Đóng</Button></>}>
        <LogList log={D.log.slice().reverse().slice(0, 500)} showGame />
      </Dialog>

      <Dialog open={askName} onClose={function () { setAskName(false); pendingRef.current = null; }} width={400} title="Bạn là ai?" description="Tên này hiện trong lịch sử và thông báo cho cả team. Chỉ cần nhập một lần trên máy này."
        footer={<><Button variant="ghost" onClick={function () { setAskName(false); pendingRef.current = null; }}>Huỷ</Button><Button variant="primary" disabled={!nameDraft.trim()} onClick={saveName}>Lưu</Button></>}>
        <Input autoFocus value={nameDraft} onChange={setNameDraft} placeholder="Vd: GiangBT" onKeyDown={function (e) { if (e.key === "Enter") saveName(); }} />
      </Dialog>

      <Dialog open={syncOpen} onClose={function () { setSyncOpen(false); }} width={520} title="Cài đặt" description="Tên hiển thị và nơi lưu chung (Apps Script web app, xem scripts/gm-sync.gs)."
        footer={<><Button variant="ghost" onClick={function () { setSyncOpen(false); }}>Huỷ</Button><Button onClick={function () { const n = nameDraft.trim(); lsSet(LS.me, n); setMeS(n); app.toast({ tone: "positive", title: "Đã lưu tên" }); setSyncOpen(false); }}>Chỉ lưu tên</Button>{C.gmSyncUrl ? null : <Button variant="primary" onClick={function () { const n = nameDraft.trim(); lsSet(LS.me, n); saveSync(); }}>Lưu và tải lại</Button>}</>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Tên của bạn</span><Input value={nameDraft} onChange={setNameDraft} placeholder="Vd: GiangBT" /></label>
          {C.gmSyncUrl ? <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>Đồng bộ đã được cài sẵn cho cả team (secret GM_SYNC_URL trên GitHub).</div> : <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Web app URL (để trống = chỉ lưu trên máy này)</span><Input value={syncDraft.url} onChange={function (v) { setSyncDraft(Object.assign({}, syncDraft, { url: v })); }} placeholder="https://script.google.com/macros/s/…/exec" /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>TOKEN</span><Input type="password" value={syncDraft.token} onChange={function (v) { setSyncDraft(Object.assign({}, syncDraft, { token: v })); }} /></label>
          </>}
        </div>
      </Dialog>
    </div>
  );
}

/* ================= BENCHMARK ================= */
function BenchCell({ g, r, act, benchOpts, ga4Opts, onChange }) {
  const v = r.v || {};
  const head = r.kind === "none" ? "Không so sánh" : r.kind === "missing" ? "Benchmark đã bị xoá" : null;
  const line = function (kind, label) {
    const ms = BM.filter(function (m) { return m[2] === kind && v[m[0]] != null; });
    if (!ms.length) return null;
    return <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}><b style={{ font: "600 10px/1.5 var(--font-sans)", color: "var(--text-tertiary)", width: 24, flex: "none" }}>{label}</b>
      <span style={{ font: "500 11.5px/1.5 var(--font-mono)" }}>{ms.map(function (m, i) {
        const a = act[m[0]], beat = a != null && a > v[m[0]];
        return <span key={m[0]} title={(a != null ? "Game: " + fmtM(m, a) + " · " : "Game: chưa có số · ") + "Benchmark: " + fmtM(m, v[m[0]]) + (beat ? " → vượt" : a != null ? " → chưa đạt" : "")}
          style={beat ? { color: "var(--positive)", fontWeight: 700, background: "var(--positive-soft)", borderRadius: 3, padding: "0 2px" } : null}>{i ? " · " : ""}{m[1]} {fmtM(m, v[m[0]])}</span>; })}</span></div>;
  };
  const cmp = BM.filter(function (m) { return v[m[0]] != null && act[m[0]] != null; }), nBeat = cmp.filter(function (m) { return act[m[0]] > v[m[0]]; }).length;
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <select value={g.bench || ""} onChange={function (e) { const o = e.target.options[e.target.selectedIndex]; onChange(e.target.value, e.target.value ? o.text : "Tự động"); }}
      style={{ width: "100%", height: 26, padding: "0 6px", borderRadius: 6, border: "1px solid var(--border-default)", background: r.v ? "var(--bg-raised)" : "var(--bg-surface)", color: r.v ? "var(--text-primary)" : "var(--text-tertiary)", font: "500 12px/1 var(--font-sans)" }}>
      <option value="">{r.kind === "auto" ? "Tự động: " + r.short : "Chọn game benchmark…"}</option>
      {benchOpts.length ? <optgroup label="Benchmark tự nhập">{benchOpts.map(function (o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}</optgroup> : null}
      {ga4Opts.length ? <optgroup label="Game trong GamePulse (GA4, 30 ngày)">{ga4Opts.map(function (o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}</optgroup> : null}
      <option value="none">Không so sánh</option>
    </select>
    {r.v ? <>{line("rr", "RR")}{line("imp", "IMP")}
      <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{r.title}{cmp.length ? " · vượt " + nBeat + "/" + cmp.length : act._any ? " · không có chỉ số trùng để so" : " · chưa có số liệu game"}
        {act._ga4 ? <div title="Số liệu của game lấy từ GA4 property này">So với: {act._ga4}</div> : null}</div></>
      : head ? <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{head}</div> : null}
  </div>;
}

const EMPTY_BENCH = { name: "", platform: "", label: "", partners: "", d1: "", d7: "", d14: "", d28: "", impB: "", impI: "", impR: "", impT: "", note: "" };
function BenchTab({ D, S, app, list, partners, needName }) {
  const [edit, setEdit] = React.useState(null);
  function prefill(v) {
    if (!v || !GA4) return; const parts = v.split("|"); const gi = GA4.games.findIndex(function (x) { return x.id === parts[0]; }); if (gi < 0) return;
    const pi = +parts[1], m = GA4.metrics(gi, pi);
    const d = Object.assign({}, edit.draft, { name: edit.draft.name || GA4.games[gi].name, platform: pi === 0 ? "Android" : pi === 1 ? "iOS" : edit.draft.platform, label: edit.draft.label || "GA4 30 ngày" });
    BM.forEach(function (x) { if (m[x[0]] != null) d[x[0]] = String(Math.round(m[x[0]] * 100) / 100); });
    setEdit(Object.assign({}, edit, { draft: d }));
  }
  function save() {
    const d = edit.draft;
    if (!d.name.trim()) { app.toast({ tone: "warning", title: "Cần nhập tên benchmark" }); return; }
    const bad = BM.filter(function (m) { return String(d[m[0]] || "").trim() !== "" && num(d[m[0]]) == null; });
    if (bad.length) { app.toast({ tone: "warning", title: "Giá trị không hợp lệ", description: bad.map(function (m) { return LABEL[m[0]]; }).join(", ") + " phải là số (vd 35.2)." }); return; }
    const e = edit;
    needName(function () {
      if (e.isNew) {
        const id = Date.now().toString(36); const rec = {};
        Object.keys(EMPTY_BENCH).forEach(function (k) { const nv = String(d[k] || "").trim(); if (nv) rec[k] = nv; });
        S.write("bench", id, rec, { logs: [{ f: "_create", to: "", n: "Benchmark · " + d.name }] });
        app.toast({ tone: "positive", title: "Đã thêm benchmark", description: d.name });
      } else {
        const cur = D.bench[e.id] || {}, p = {};
        Object.keys(EMPTY_BENCH).forEach(function (k) { const nv = String(d[k] || "").trim(); if (nv !== String(cur[k] || "")) p[k] = nv || null; });
        if (Object.keys(p).length) { S.write("bench", e.id, p, { logs: Object.keys(p).map(function (k) { return { f: k, to: p[k] === null ? "" : p[k], n: "Benchmark · " + d.name }; }) }); app.toast({ tone: "positive", title: "Đã lưu benchmark", description: d.name }); }
      }
      setEdit(null);
    });
  }
  function remove(b) {
    if (!confirm("Xoá benchmark “" + b.name + "”? Các game đang chọn nó sẽ hiện “Benchmark đã bị xoá”. Không thể hoàn tác.")) return;
    needName(function () { S.write("bench", b.id, null, { remove: true, logs: [{ f: "_delete", to: "", n: "Benchmark · " + b.name }] }); app.toast({ tone: "info", title: "Đã xoá benchmark", description: b.name }); });
  }
  const set = function (k, v) { setEdit(Object.assign({}, edit, { draft: Object.assign({}, edit.draft, { [k]: v }) })); };
  const lab = function (t) { return <span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{t}</span>; };
  const fld = { display: "flex", flexDirection: "column", gap: 4 };
  const tdS = { padding: "10px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" };
  const thS = { textAlign: "left", padding: "8px 10px", font: "600 10.5px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)", background: "var(--bg-raised)", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap" };
  return <div>
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", font: "400 13px/1.55 var(--font-sans)", color: "var(--text-secondary)" }}>
          <b style={{ color: "var(--text-primary)" }}>Cách hoạt động.</b> Mỗi benchmark là một bộ chỉ số mục tiêu: RR D1 / D7 / D14 / D28 (%) và IMP/DAU Banner / Inter / Rewarded / tổng. Ở tab Game, mỗi game chọn một benchmark (hoặc một game GA4 trong GamePulse) để so.
          Chỉ số nào của game <b style={{ color: "var(--positive)" }}>vượt</b> benchmark được tô xanh, chưa đạt thì giữ nguyên. Số liệu của game lấy từ GA4 (nếu game có trong GamePulse) hoặc nhập tay qua nút bút chì.
          <br />Điền <b>Tự áp dụng cho đối tác</b> và/hoặc <b>Platform</b> để benchmark tự gán cho những game chưa chọn (“Tự động: …”). Benchmark không ghi đối tác và platform là mặc định cho mọi game.
        </div>
        <Button variant="primary" iconLeft="plus" onClick={function () { setEdit({ isNew: true, draft: Object.assign({}, EMPTY_BENCH) }); }}>Thêm benchmark</Button>
      </div>
    </Card>
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "auto", background: "var(--bg-surface)" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980, font: "400 13px/1.4 var(--font-sans)" }}>
        <thead><tr><th style={thS}>Benchmark</th><th style={thS}>Tự áp dụng</th>{BM.map(function (m) { return <th key={m[0]} style={Object.assign({}, thS, { textAlign: "right" })}>{m[2] === "rr" ? "RR " + m[1] : "IMP " + m[1]}</th>; })}<th style={thS}></th></tr></thead>
        <tbody>{list.map(function (b) { const v = benchValues(b); return <tr key={b.id}>
          <td style={tdS}><b style={{ fontWeight: 600 }}>{b.name}</b><div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{[b.platform, b.label].filter(Boolean).join(" · ")}</div>{b.note ? <div style={{ font: "var(--type-caption)", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{b.note}</div> : null}</td>
          <td style={Object.assign({}, tdS, { font: "var(--type-caption)", color: "var(--text-secondary)" })}>{b.partners || b.platform ? [b.partners ? "Đối tác: " + b.partners : "", b.platform ? "Platform: " + b.platform : ""].filter(Boolean).join(" · ") : "Mặc định (mọi game)"}</td>
          {BM.map(function (m) { return <td key={m[0]} style={Object.assign({}, tdS, { textAlign: "right", font: "500 12px/1.4 var(--font-mono)", color: v[m[0]] == null ? "var(--text-tertiary)" : "var(--text-primary)" })}>{fmtM(m, v[m[0]])}</td>; })}
          <td style={Object.assign({}, tdS, { whiteSpace: "nowrap", textAlign: "right" })}>
            <IconButton size="sm" icon="pencil" label="Sửa" onClick={function () { const d = {}; Object.keys(EMPTY_BENCH).forEach(function (k) { d[k] = b[k] || ""; }); setEdit({ id: b.id, draft: d }); }} />
            <IconButton size="sm" icon="trash-2" label="Xoá" onClick={function () { remove(b); }} /></td></tr>; })}</tbody>
      </table>
      {!list.length ? <div style={{ padding: 24 }}><EmptyState compact title="Chưa có benchmark" description="Thêm bộ chỉ số mục tiêu (vd game top cùng thể loại) để so với từng game ở tab Game. Có thể lấy nhanh số từ một game GA4 trong GamePulse." /></div> : null}
    </div>
    <Dialog open={!!edit} onClose={function () { setEdit(null); }} width={640} title={edit && edit.isNew ? "Thêm benchmark" : "Sửa benchmark"}
      footer={<><Button variant="ghost" onClick={function () { setEdit(null); }}>Huỷ</Button><Button variant="primary" onClick={save}>Lưu</Button></>}>
      {edit ? <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "65vh", overflowY: "auto", paddingRight: 4 }}>
        {GA4 ? <label style={fld}>{lab("Lấy nhanh số từ game GA4 (30 ngày gần nhất)")}
          <FSel value="" onChange={prefill} placeholder="Chọn game để điền sẵn…" options={[].concat.apply([], GA4.games.map(function (x) { return [[x.id + "|0", x.name + " · Android"], [x.id + "|1", x.name + " · iOS"]]; }))} /></label> : null}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <label style={fld}>{lab("Tên (game đối chiếu)")}<Input value={edit.draft.name} onChange={function (v) { set("name", v); }} placeholder="Vd: Foodhunt" /></label>
          <label style={fld}>{lab("Platform")}<FSel value={edit.draft.platform} onChange={function (v) { set("platform", v); }} placeholder="Cả hai" options={["Android", "iOS"]} /></label>
          <label style={fld}>{lab("Nguồn")}<Input value={edit.draft.label} onChange={function (v) { set("label", v); }} placeholder="Vd: Ads28" /></label>
        </div>
        <label style={fld}>{lab("Tự áp dụng cho đối tác (cách nhau bằng dấu phẩy; để trống = không theo đối tác)")}
          <input list="gm-bench-partners" value={edit.draft.partners} onChange={function (e) { set("partners", e.target.value); }} placeholder="Vd: Funlab, TeeG"
            style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", font: "400 13px/1 var(--font-sans)" }} />
          <datalist id="gm-bench-partners">{partners.map(function (p) { return <option key={p} value={p} />; })}</datalist></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {BM.map(function (m) { return <label key={m[0]} style={fld}>{lab(m[2] === "rr" ? "RR " + m[1] + " (%)" : "IMP/DAU " + m[1])}<Input value={edit.draft[m[0]]} onChange={function (v) { set(m[0], v); }} placeholder={m[2] === "rr" ? "vd 35.2" : "vd 4.5"} /></label>; })}
        </div>
        <label style={fld}>{lab("Ghi chú")}
          <textarea rows={2} value={edit.draft.note} onChange={function (e) { set("note", e.target.value); }} style={{ padding: 8, borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", font: "inherit", resize: "vertical" }} /></label>
      </div> : null}
    </Dialog>
  </div>;
}

/* ================= TAB DOCUMENT ================= */
const EMPTY_DOC = { title: "", url: "", cat: "Tích hợp SDK", game: "", note: "" };
function DocsTab({ D, S, app, games, needName }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [edit, setEdit] = React.useState(null); /* { id, draft, isNew } */
  const docs = Object.keys(D.docs).map(function (id) { return Object.assign({ id: id }, D.docs[id]); }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  const cats = uniq(DOC_CATS.concat(docs.map(function (d) { return d.cat; })));
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const rows = docs.filter(function (d) { if (cat && d.cat !== cat) return false; const hay = norm([d.title, d.url, d.cat, d.game, d.note, d.by].join(" ")); return terms.every(function (t) { return hay.indexOf(t) >= 0; }); });
  const gameNames = uniq(games.map(function (g) { return g.name; }));
  function save() {
    const d = edit.draft;
    if (!d.title.trim() || !/^https?:\/\//i.test(d.url.trim())) { app.toast({ tone: "warning", title: "Cần nhập tiêu đề và link (bắt đầu bằng http:// hoặc https://)" }); return; }
    const e = edit;
    needName(function () {
      const me = lsGet(LS.me, "") || "Tôi";
      if (e.isNew) {
        const id = "doc:" + Date.now().toString(36);
        S.write("docs", id, Object.assign({}, d, { title: d.title.trim(), url: d.url.trim(), by: me, at: Date.now() }), { logs: [{ f: "_create", to: "", n: "Tài liệu · " + d.title.trim() }] });
        app.toast({ tone: "positive", title: "Đã thêm tài liệu", description: d.title });
      } else {
        const cur = D.docs[e.id] || {}; const p = {};
        Object.keys(EMPTY_DOC).forEach(function (k) { if ((d[k] || "") !== (cur[k] || "")) p[k] = d[k] || null; });
        if (Object.keys(p).length) { S.write("docs", e.id, p, { logs: Object.keys(p).map(function (k) { return { f: k, to: p[k] === null ? "" : p[k], n: "Tài liệu · " + d.title }; }) }); app.toast({ tone: "positive", title: "Đã lưu tài liệu" }); }
      }
      setEdit(null);
    });
  }
  function remove(d) {
    if (!confirm("Xoá tài liệu “" + d.title + "”? Không thể hoàn tác.")) return;
    needName(function () { S.write("docs", d.id, null, { remove: true, logs: [{ f: "_delete", to: "", n: "Tài liệu · " + d.title }] }); app.toast({ tone: "info", title: "Đã xoá tài liệu", description: d.title }); });
  }
  const td = { padding: "10px 10px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" };
  const th = { textAlign: "left", padding: "8px 10px", font: "600 10.5px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)", background: "var(--bg-raised)", borderBottom: "1px solid var(--border-default)" };
  return <div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <div style={{ flex: "1 1 300px" }}><Input value={q} onChange={setQ} iconLeft="search" placeholder="Tìm tài liệu: tiêu đề, link, game, ghi chú…" /></div>
      <div style={{ width: 200 }}><FSel value={cat} onChange={setCat} placeholder="Tất cả nhóm" options={cats} /></div>
      <Button size="sm" variant="primary" iconLeft="plus" onClick={function () { setEdit({ isNew: true, draft: Object.assign({}, EMPTY_DOC, { cat: cat || EMPTY_DOC.cat }) }); }}>Thêm tài liệu</Button>
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      <button onClick={function () { setCat(""); }} style={chip(!cat)}>Tất cả <b style={{ marginLeft: 4 }}>{docs.length}</b></button>
      {cats.filter(function (c) { return docs.some(function (d) { return d.cat === c; }); }).map(function (c) { return <button key={c} onClick={function () { setCat(cat === c ? "" : c); }} style={chip(cat === c)}><Icon name="book-open" size={13} /> {c} <span style={{ marginLeft: 4, opacity: .7 }}>{docs.filter(function (d) { return d.cat === c; }).length}</span></button>; })}
    </div>
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "auto", background: "var(--bg-surface)" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 820, font: "400 13px/1.4 var(--font-sans)" }}>
        <thead><tr><th style={th}>Tài liệu</th><th style={th}>Nhóm</th><th style={th}>Game</th><th style={th}>Ghi chú</th><th style={th}>Người thêm</th><th style={th}></th></tr></thead>
        <tbody>{rows.map(function (d) { return <tr key={d.id}>
          <td style={td}><a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--accent-text)", fontWeight: 600, textDecoration: "none" }}><Icon name="file-text" size={14} />{d.title}<Icon name="external-link" size={12} /></a>
            <div style={{ font: "400 11.5px/1.35 var(--font-mono)", color: "var(--text-tertiary)", wordBreak: "break-all", marginTop: 2 }}>{d.url.length > 70 ? d.url.slice(0, 70) + "…" : d.url}</div></td>
          <td style={td}><Tag>{d.cat || "Khác"}</Tag></td>
          <td style={td}>{d.game || <span style={{ color: "var(--text-tertiary)" }}>Chung</span>}</td>
          <td style={Object.assign({}, td, { whiteSpace: "pre-wrap", maxWidth: 320 })}>{d.note || ""}</td>
          <td style={Object.assign({}, td, { color: "var(--text-secondary)", whiteSpace: "nowrap" })}>{d.by || ""}{d.at ? <div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{fmtTs(d.at)}</div> : null}</td>
          <td style={Object.assign({}, td, { whiteSpace: "nowrap", textAlign: "right" })}>
            <IconButton size="sm" icon="copy" label="Copy link" onClick={function () { (navigator.clipboard ? navigator.clipboard.writeText(d.url) : Promise.reject()).then(function () { app.toast({ tone: "positive", title: "Đã copy link" }); }).catch(function () {}); }} />
            <IconButton size="sm" icon="pencil" label="Sửa" onClick={function () { const dr = {}; Object.keys(EMPTY_DOC).forEach(function (k) { dr[k] = d[k] || ""; }); setEdit({ id: d.id, draft: dr }); }} />
            <IconButton size="sm" icon="trash-2" label="Xoá" onClick={function () { remove(d); }} />
          </td></tr>; })}</tbody>
      </table>
      {!rows.length ? <div style={{ padding: 24 }}><EmptyState compact title={docs.length ? "Không có tài liệu nào khớp" : "Chưa có tài liệu"} description={docs.length ? "Thử bỏ bớt bộ lọc." : "Thêm link tài liệu tích hợp SDK, AppsFlyer, MAX, Firebase… để cả team dùng chung."} /></div> : null}
    </div>
    <Dialog open={!!edit} onClose={function () { setEdit(null); }} width={560} title={edit && edit.isNew ? "Thêm tài liệu" : "Sửa tài liệu"}
      footer={<><Button variant="ghost" onClick={function () { setEdit(null); }}>Huỷ</Button><Button variant="primary" onClick={save}>Lưu</Button></>}>
      {edit ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[["title", "Tiêu đề", "Vd: Hướng dẫn tích hợp AppsFlyer SDK Unity"], ["url", "Link", "https://…"]].map(function (f) { return <label key={f[0]} style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>{f[1]}</span><Input value={edit.draft[f[0]]} placeholder={f[2]} onChange={function (v) { setEdit(Object.assign({}, edit, { draft: Object.assign({}, edit.draft, { [f[0]]: v }) })); }} /></label>; })}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Nhóm</span><FSel value={edit.draft.cat} onChange={function (v) { setEdit(Object.assign({}, edit, { draft: Object.assign({}, edit.draft, { cat: v }) })); }} placeholder="Khác" options={cats} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Game liên quan (để trống = chung)</span>
            <input list="gm-doc-games" value={edit.draft.game} onChange={function (e) { setEdit(Object.assign({}, edit, { draft: Object.assign({}, edit.draft, { game: e.target.value }) })); }} placeholder="Gõ để tìm game"
              style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", font: "400 12px/1 var(--font-sans)" }} />
            <datalist id="gm-doc-games">{gameNames.map(function (n) { return <option key={n} value={n} />; })}</datalist></label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Ghi chú</span>
          <textarea rows={3} value={edit.draft.note} onChange={function (e) { setEdit(Object.assign({}, edit, { draft: Object.assign({}, edit.draft, { note: e.target.value }) })); }} style={{ padding: 8, borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", font: "inherit", resize: "vertical" }} /></label>
      </div> : null}
    </Dialog>
  </div>;
}

const th = { position: "sticky", top: 0, zIndex: 2, background: "var(--bg-raised)", textAlign: "left", padding: "8px 8px 4px", font: "600 10.5px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-tertiary)", borderBottom: "0", whiteSpace: "nowrap" };
const thf = { position: "sticky", top: 27, zIndex: 2, background: "var(--bg-raised)", padding: "2px 8px 8px", borderBottom: "1px solid var(--border-default)", verticalAlign: "top" };
const td = { padding: "10px 8px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" };
function chip(on) {
  return { display: "inline-flex", alignItems: "center", gap: 4, height: 28, padding: "0 10px", borderRadius: 7, cursor: "pointer", font: "500 12.5px/1 var(--font-sans)",
    border: "1px solid " + (on ? "var(--accent)" : "var(--border-default)"), background: on ? "var(--accent)" : "var(--bg-surface)", color: on ? "var(--text-on-accent)" : "var(--text-primary)" };
}
const folderLink = { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-raised)", color: "var(--text-primary)", textDecoration: "none", font: "500 12px/1.2 var(--font-sans)" };

window.Pages = Object.assign(window.Pages || {}, { games: GamesPage });
});
