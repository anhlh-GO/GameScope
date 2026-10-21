/* Pulls GA4 data for every connected property from Windsor.ai and writes data/live.js
   (window.GP_LIVE), which data/liveAdapter.js turns into GP_DATA.
   Usage:  WINDSOR_API_KEY=... node scripts/fetch-windsor.mjs
           node scripts/fetch-windsor.mjs --from-dir <folder with core.json, revenue.json, stickiness.json>
   Runs in GitHub Actions (Node 20+, no dependencies). Never logs data values or the key. */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAYS = 180;
const BASE = "https://connectors.windsor.ai/googleanalytics4";
const Q = {
  core: "date,account_id,account_name,platform,country_id,active_users,newusers,sessions,engaged_sessions,user_engagement_duration,event_count",
  revenue: "date,account_id,platform,country_id,purchase_revenue,total_ad_revenue,transactions,total_purchasers,first_time_purchasers,publisher_ad_impressions",
  stickiness: "date,account_id,active7_day_users,active28_day_users,crash_affected_users",
  /* classic retention: users first seen on first_session_date and active again on date */
  cohort: "date,first_session_date,account_id,platform,active_users"
};
/* server-side filters per query (Windsor 'filter' param) */
const QF = {};
const RET_DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 30];
const CORE = ["active_users", "newusers", "sessions", "engaged_sessions", "user_engagement_duration", "event_count"];
const REV = ["purchase_revenue", "total_ad_revenue", "transactions", "total_purchasers", "first_time_purchasers", "publisher_ad_impressions"];

const iso = (t) => new Date(t).toISOString().slice(0, 10);
const DAY = 86400000;
const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
const from = today - (DAYS - 1) * DAY;

async function load(name) {
  const dirArg = process.argv.indexOf("--from-dir");
  if (dirArg > 0) return JSON.parse((await readFile(join(process.argv[dirArg + 1], name + ".json"), "utf8")).replace(/^﻿/, "")).data || [];
  const key = process.env.WINDSOR_API_KEY;
  if (!key) throw new Error("WINDSOR_API_KEY is not set");
  const url = `${BASE}?api_key=${encodeURIComponent(key)}&date_from=${iso(from)}&date_to=${iso(today)}&fields=${Q[name]}` + (QF[name] ? `&filter=${encodeURIComponent(JSON.stringify(QF[name]))}` : "");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(300000) });
    const text = await res.text();
    if (res.ok) {
      const json = JSON.parse(text);
      if (!Array.isArray(json.data)) throw new Error(`Windsor '${name}': unexpected response (no data array)`);
      return json.data;
    }
    if (attempt >= 3) throw new Error(`Windsor '${name}' failed: HTTP ${res.status} ${text.slice(0, 300).split(key).join("***")}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
}

const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const platformIdx = (p) => (/^android$/i.test(p) ? 0 : /^ios$/i.test(p) ? 1 : -1);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "game";
const pretty = (s) => String(s).split(/[-_]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const [core, revenue, stick] = await Promise.all([load("core"), load("revenue"), load("stickiness")]);
/* retention is optional: a failure here must not stop the deploy of the other metrics */
let cohort = [];
try { cohort = await load("cohort"); } catch (e) { console.log("::warning::Retention not updated: " + e.message); }

/* optional overrides: data/games.json  { "<account_id>": { "name": "...", "genre": "...", "hidden": false } } */
const overridesPath = join(ROOT, "data", "games.json");
const overrides = existsSync(overridesPath) ? JSON.parse(await readFile(overridesPath, "utf8")) : {};

const games = [], gIndex = new Map();
for (const r of core) {
  const id = String(r.account_id);
  if (gIndex.has(id) || (overrides[id] && overrides[id].hidden)) continue;
  const o = overrides[id] || {};
  gIndex.set(id, games.length);
  games.push({ accountId: id, id: slug(o.slug || r.account_name || id), name: o.name || pretty(r.account_name || id), genre: o.genre || "Mobile game" });
}
const seen = new Set(); games.forEach((g) => { let s = g.id, n = 2; while (seen.has(s)) s = g.id + "-" + n++; g.id = s; seen.add(s); });

const countries = [], cIndex = new Map();
const ci = (c) => { const k = !c || c === "(not set)" ? "ZZ" : String(c).toUpperCase(); if (!cIndex.has(k)) { cIndex.set(k, countries.length); countries.push(k); } return cIndex.get(k); };
const di = (d) => Math.round((Date.parse(d + "T00:00:00Z") - from) / DAY);

const rows = new Map();
function row(r) {
  const gi = gIndex.get(String(r.account_id)), d = di(r.date), pi = platformIdx(r.platform);
  if (gi == null || pi < 0 || d < 0 || d >= DAYS) return null;
  const c = ci(r.country_id), k = gi + "|" + d + "|" + pi + "|" + c;
  let o = rows.get(k);
  if (!o) { o = [gi, d, pi, c].concat(new Array(CORE.length + REV.length).fill(0)); rows.set(k, o); }
  return o;
}
for (const r of core) { const o = row(r); if (o) CORE.forEach((f, i) => { o[4 + i] += num(r[f]); }); }
for (const r of revenue) { const o = row(r); if (o) REV.forEach((f, i) => { o[4 + CORE.length + i] += num(r[f]); }); }

const stickRows = [];
for (const r of stick) {
  const gi = gIndex.get(String(r.account_id)), d = di(r.date);
  if (gi == null || d < 0 || d >= DAYS) continue;
  stickRows.push([gi, d, num(r.active7_day_users), num(r.active28_day_users), num(r.crash_affected_users)]);
}

const round4 = (v) => Math.round(v * 10000) / 10000;
const fsd = (s) => { const t = String(s || ""); return /^\d{8}$/.test(t) ? t.slice(0, 4) + "-" + t.slice(4, 6) + "-" + t.slice(6) : t.slice(0, 10); };
const retMap = new Map();
for (const r of cohort) {
  const gi = gIndex.get(String(r.account_id)), pi = platformIdx(r.platform), c = di(fsd(r.first_session_date)), d = di(r.date);
  if (gi == null || pi < 0 || !(c >= 0) || d >= DAYS) continue;
  const n = d - c;
  if (RET_DAYS.indexOf(n) < 0) continue;
  const k = gi + "|" + c + "|" + pi + "|" + n;
  retMap.set(k, (retMap.get(k) || 0) + num(r.active_users));
}
if (cohort.length && !retMap.size) {
  const r0 = cohort[0];
  console.log(`::warning::Retention rows could not be mapped (${cohort.length} rows). Fields: ${Object.keys(r0).join(",")}; first_session_date sample: ${JSON.stringify(r0.first_session_date)}; date sample: ${JSON.stringify(r0.date)}; platform sample: ${JSON.stringify(r0.platform)}`);
} else console.log(`cohort rows: ${cohort.length}`);
const ret = [...retMap.entries()].map(([k, v]) => k.split("|").map(Number).concat(v));

/* ---- filter slices: the same metrics split by one extra GA4 dimension (no country split, so GA4 does not
   fold rows into "(other)"). Each slice = 2 metric queries (GA4 allows 10 metrics per request) + optional cohorts. */
const SLICES = [
  { name: "version", dims: ["app_version"], cohort: true },
  { name: "source", dims: ["first_user_primary_channel_group", "first_user_campaign_name"], cohort: true },
  { name: "user", dims: ["new_vs_returning"], cohort: false }
];
const slices = {};
for (const s of SLICES) {
  const base = "date,account_id,platform," + s.dims.join(",") + ",";
  Q[s.name + "_core"] = base + CORE.join(",");
  Q[s.name + "_rev"] = base + REV.join(",");
  if (s.cohort) Q[s.name + "_cohort"] = "date,first_session_date,account_id,platform," + s.dims.join(",") + ",active_users";
  try {
    const sc = await load(s.name + "_core"), sr = await load(s.name + "_rev");
    let scoh = [];
    if (s.cohort) { try { scoh = await load(s.name + "_cohort"); } catch (e) { console.log(`::warning::Retention by ${s.name} not updated: ${e.message}`); } }
    const vals = s.dims.map(() => []), vIdx = s.dims.map(() => new Map());
    const key = (r) => s.dims.map((d, j) => { const v = r[d] == null || r[d] === "" ? "(not set)" : String(r[d]); if (!vIdx[j].has(v)) { vIdx[j].set(v, vals[j].length); vals[j].push(v); } return vIdx[j].get(v); });
    const m = new Map();
    const srow = (r) => {
      const gi = gIndex.get(String(r.account_id)), d = di(r.date), pi = platformIdx(r.platform);
      if (gi == null || pi < 0 || d < 0 || d >= DAYS) return null;
      const kk = key(r), k = [gi, d, pi].concat(kk).join("|");
      let o = m.get(k);
      if (!o) { o = [gi, d, pi].concat(kk, new Array(CORE.length + REV.length).fill(0)); m.set(k, o); }
      return o;
    };
    const off = 3 + s.dims.length;
    for (const r of sc) { const o = srow(r); if (o) CORE.forEach((f, i) => { o[off + i] += num(r[f]); }); }
    for (const r of sr) { const o = srow(r); if (o) REV.forEach((f, i) => { o[off + CORE.length + i] += num(r[f]); }); }
    const rm = new Map();
    for (const r of scoh) {
      const gi = gIndex.get(String(r.account_id)), pi = platformIdx(r.platform), c = di(fsd(r.first_session_date)), n = di(r.date) - c;
      if (gi == null || pi < 0 || !(c >= 0) || RET_DAYS.indexOf(n) < 0) continue;
      const k = [gi, c, pi].concat(key(r), n).join("|");
      rm.set(k, (rm.get(k) || 0) + num(r.active_users));
    }
    slices[s.name] = { dims: s.dims, vals, rows: [...m.values()].map((r) => r.map(round4)), ret: [...rm.entries()].map(([k, v]) => k.split("|").map(Number).concat(v)) };
    console.log(`slice ${s.name}: ${m.size} rows, ${rm.size} retention cells`);
  } catch (e) { console.log(`::warning::Filter "${s.name}" not updated: ${e.message}`); }
}

const round = round4;
/* ---- levels: per-level events. Default naming (Falcon template): game_main_start_<n>, game_main_victory_<n>,
   optional game_main_lose_<n> / _fail_ / _quit_ / _revive_. Override the prefix per game in data/games.json ("levelPrefix"). */
const LEVEL_TYPES = ["start", "victory", "lose", "fail", "quit", "revive"];
let levelRows = [];
try {
  const prefixes = [...new Set(["game_main_"].concat(Object.values(overrides).map((o) => o.levelPrefix).filter(Boolean)))];
  Q.levels = "date,account_id,platform,event_name,event_count,users";
  const lm = new Map();
  for (const pre of prefixes) {
    QF.levels = [["event_name", "contains", pre]];
    if (!/^[A-Za-z0-9_]+$/.test(pre)) { console.log("::warning::Ignoring invalid levelPrefix " + JSON.stringify(pre)); continue; }
    const re = new RegExp("^" + pre + "(" + LEVEL_TYPES.join("|") + ")_(\\d+)$");
    for (const r of await load("levels")) {
      const gi = gIndex.get(String(r.account_id)), d = di(r.date), pi = platformIdx(r.platform);
      const o = overrides[String(r.account_id)] || {};
      if (gi == null || pi < 0 || d < 0 || d >= DAYS || (o.levelPrefix || "game_main_") !== pre) continue;
      const m = re.exec(String(r.event_name)); if (!m) continue;
      const k = [gi, d, pi, +m[2], LEVEL_TYPES.indexOf(m[1])].join("|");
      const v = lm.get(k) || [0, 0]; v[0] += num(r.event_count); v[1] += num(r.users); lm.set(k, v);
    }
  }
  levelRows = [...lm.entries()].map(([k, v]) => k.split("|").map(Number).concat(v));
  console.log(`levels: ${levelRows.length} rows`);
} catch (e) { console.log("::warning::Levels not updated: " + e.message); }

const out = {
  v: 1, source: "GA4 via Windsor.ai", updatedAt: Date.now(), from: iso(from), days: DAYS,
  games, countries, fields: CORE.concat(REV),
  rows: [...rows.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((r) => r.map(round)),
  stick: stickRows,
  ret: ret, /* [gameIdx, cohortDayIdx, platformIdx, nthDay, users] */
  levels: { types: LEVEL_TYPES, rows: levelRows }, /* rows: [gi, di, pi, level, typeIdx, eventCount, users] */
  slices /* { name: { dims, vals[dim][], rows: [gi, di, pi, ...dimIdx, ...fields], ret: [gi, c, pi, ...dimIdx, n, users] } } */
};
if (!games.length) throw new Error("Windsor returned no GA4 properties — check the connector in Windsor.ai");
await writeFile(join(ROOT, "data", "live.js"), "/* Generated by scripts/fetch-windsor.mjs — do not edit. */\nwindow.GP_LIVE = " + JSON.stringify(out) + ";\n");
console.log(`live.js written: ${games.length} game(s), ${out.rows.length} rows, ${countries.length} countries, ${ret.length} retention cells, ${iso(from)} → ${iso(today)}`);
