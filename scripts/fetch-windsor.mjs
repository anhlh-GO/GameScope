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
  stickiness: "date,account_id,active7_day_users,active28_day_users,crash_affected_users"
};
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
  const url = `${BASE}?api_key=${encodeURIComponent(key)}&date_from=${iso(from)}&date_to=${iso(today)}&fields=${Q[name]}`;
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

const round = (v) => Math.round(v * 10000) / 10000;
const out = {
  v: 1, source: "GA4 via Windsor.ai", updatedAt: Date.now(), from: iso(from), days: DAYS,
  games, countries, fields: CORE.concat(REV),
  rows: [...rows.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((r) => r.map(round)),
  stick: stickRows
};
if (!games.length) throw new Error("Windsor returned no GA4 properties — check the connector in Windsor.ai");
await writeFile(join(ROOT, "data", "live.js"), "/* Generated by scripts/fetch-windsor.mjs — do not edit. */\nwindow.GP_LIVE = " + JSON.stringify(out) + ";\n");
console.log(`live.js written: ${games.length} game(s), ${out.rows.length} rows, ${countries.length} countries, ${iso(from)} → ${iso(today)}`);
