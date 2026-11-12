/* Pulls the game list from the "Tạo ID Game_Publisher_new" Google Sheet and writes data/games.js
   (window.GP_GAMES), read by the Game Manager page (kit/PagesGames.babel.js).
   Auth: the same service account as GA4 (GA4_SERVICE_ACCOUNT_JSON, or GA4_KEY_FILE=<path to key.json>).
   The sheet must be shared (Viewer) with that service account's email, and the Google Sheets API enabled on its project.
   Columns are matched by header name using data/games-map.json; the Drive folder link comes from column AV.
   Only the fields listed in games-map.json are kept — ID columns (GA4/AF/AdMob/etc.) are never copied.
   Usage:  GA4_KEY_FILE=key.json node scripts/fetch-games.mjs [--dump-headers]
   Node 20+, no dependencies. Never logs cell values. */
import { readFile, writeFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP = JSON.parse(await readFile(join(ROOT, "data", "games-map.json"), "utf8"));
const SHEET_ID = process.env.GAMES_SHEET_ID || MAP.sheetId;
const GID = Number(process.env.GAMES_SHEET_GID || MAP.gid);

const raw = process.env.GA4_SERVICE_ACCOUNT_JSON || (process.env.GA4_KEY_FILE && await readFile(process.env.GA4_KEY_FILE, "utf8"));
if (!raw) throw new Error("Missing GA4_SERVICE_ACCOUNT_JSON (or GA4_KEY_FILE)");
const key = JSON.parse(raw);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: key.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
const jwt = unsigned + "." + createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
const tok = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) })).json();
if (!tok.access_token) throw new Error("Service account sign-in failed: " + (tok.error || "no token"));

async function api(path) {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID + path, { headers: { authorization: "Bearer " + tok.access_token } });
  const j = await res.json();
  if (!res.ok) {
    const m = (j.error && j.error.message) || res.status;
    if (res.status === 403 && /has not been used|disabled/.test(m)) throw new Error("Google Sheets API is not enabled on the service account's project. " + m);
    if (res.status === 403 || res.status === 404) throw new Error("Share the sheet (Viewer) with " + key.client_email + " — " + m);
    throw new Error("Sheets API: " + m);
  }
  return j;
}

const meta = await api("?fields=properties.title,sheets.properties(sheetId,title)");
const tab = meta.sheets.map((s) => s.properties).find((p) => p.sheetId === GID);
if (!tab) throw new Error("No tab with gid " + GID + " in the spreadsheet");
const T = "'" + tab.title.replace(/'/g, "''") + "'";

/* grid data: formatted value + hyperlink (cells may hold a link chip or rich text instead of a plain URL) */
const grid = await api("?ranges=" + encodeURIComponent(T) + "&fields=" + encodeURIComponent("sheets.data.rowData.values(formattedValue,hyperlink,textFormatRuns.format.link.uri,chipRuns.chip.richLinkProperties.uri)"));
const rowData = (grid.sheets[0].data[0].rowData || []).map((r) => (r.values || []).map((c) => ({
  v: c.formattedValue == null ? "" : String(c.formattedValue).trim(),
  link: c.hyperlink || ((c.chipRuns || []).map((x) => x.chip && x.chip.richLinkProperties && x.chip.richLinkProperties.uri).find(Boolean)) || ((c.textFormatRuns || []).map((x) => x.format && x.format.link && x.format.link.uri).find(Boolean)) || ""
})));

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
const colIndex = (letters) => letters.toUpperCase().split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const letter = (i) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/* header row: fixed in games-map.json (headerRow, 1-based), else the top-15 row matching the most aliases */
const aliasSet = Object.values(MAP.fields).flatMap((f) => (f.headers || []).map(norm));
let hi = MAP.headerRow ? MAP.headerRow - 1 : 0, best = -1;
if (!MAP.headerRow) rowData.slice(0, 15).forEach((r, i) => { const n = r.filter((c) => aliasSet.includes(norm(c.v))).length; if (n > best) { best = n; hi = i; } });
const headers = (rowData[hi] || []).map((c) => c.v);
const first = MAP.firstDataRow ? MAP.firstDataRow - 1 : hi + 1;

if (process.argv.includes("--dump-headers")) {
  console.log("tab: " + tab.title + " · header row " + (hi + 1) + " · " + (rowData.length - first) + " data rows");
  headers.forEach((h, i) => console.log(letter(i).padEnd(3) + " " + h));
  process.exit(0);
}

/* resolve each field to its columns: explicit letter(s) win (first non-empty is used), then header aliases */
const cols = {};
for (const [field, f] of Object.entries(MAP.fields)) {
  if (f.column) { cols[field] = [].concat(f.column).map(colIndex); continue; }
  const want = (f.headers || []).map(norm);
  const i = headers.findIndex((h) => want.includes(norm(h)));
  if (i >= 0) cols[field] = [i]; else console.log("::warning::No column found for field '" + field + "'");
}
if (cols.name == null) throw new Error("Could not find the game-name column — check data/games-map.json");

const URLRE = /https?:\/\/\S+/;
const games = [];
const BLANK = { v: "", link: "" };
const EMPTYISH = /^(0|-|—|n\/a)$/i;
for (const r of rowData.slice(first)) {
  const cell = (f) => { for (const i of cols[f] || []) { const c = r[i]; if (c && ((c.v && !EMPTYISH.test(c.v)) || c.link)) return c; } return BLANK; };
  const name = cell("name").v;
  if (!name) continue;
  const g = {};
  for (const [field, f] of Object.entries(MAP.fields)) {
    const c = cell(field);
    if (f.type === "link") { const u = c.link || (c.v.match(URLRE) || [])[0] || ""; if (u) g[field] = u; }
    else if (c.v) g[field] = c.v;
  }
  games.push(g);
}

const out = { v: 1, source: "Google Sheets · " + tab.title, updatedAt: Date.now(), games };
await writeFile(join(ROOT, "data", "games.js"), "/* Generated by scripts/fetch-games.mjs — do not edit. */\nwindow.GP_GAMES = " + JSON.stringify(out) + ";\n");
console.log("games.js written: " + games.length + " game(s) from '" + tab.title + "', " + Object.keys(cols).length + " mapped columns");
