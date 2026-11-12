/* GamePulse · Quản lý game — nơi lưu chung (Google Apps Script web app).
   Lưu các chỉnh sửa trên dashboard (status, tích Tracking/MO/Source, ghi chú, game tự thêm, tài liệu)
   vào một Google Sheet để cả team thấy giống nhau và nhận thông báo khi có người cập nhật.

   CÀI ĐẶT (làm 1 lần):
   1. Tạo một Google Sheet mới (vd "GamePulse - Quản lý game data"). Không cần tạo tab, script tự tạo.
   2. Trong sheet: Extensions (Tiện ích) → Apps Script. Xoá code mẫu, dán toàn bộ file này, bấm Save.
   3. Project Settings (bánh răng) → Script properties → Add: TOKEN = một chuỗi bí mật bất kỳ (vd 24 ký tự ngẫu nhiên).
   4. Deploy → New deployment → loại "Web app":
        Execute as: Me   ·   Who has access: Anyone
      → Deploy → cấp quyền → copy "Web app URL" (dạng https://script.google.com/macros/s/…/exec).
   5. Trên GitHub repo: Settings → Secrets and variables → Actions → thêm 2 secret:
        GM_SYNC_URL   = Web app URL ở bước 4
        GM_SYNC_TOKEN = chuỗi TOKEN ở bước 3
      rồi chạy lại Action "Deploy GamePulse".
   Sửa code sau này: Deploy → Manage deployments → Edit → Version: New version (URL giữ nguyên).

   Lưu ý: URL và TOKEN được đưa vào trang (sau cổng mật khẩu), nên đây là lớp bảo vệ cơ bản — đừng lưu thông tin nhạy cảm ở đây. */

var COLLS = ["edits", "custom", "docs", "bench"];
var LOG_KEEP = 3000, LOG_RETURN = 1500;

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function authed_(token) { var t = PropertiesService.getScriptProperties().getProperty("TOKEN"); return !t || token === t; }

function readAll_() {
  var res = { ok: true, now: Date.now() };
  COLLS.forEach(function (c) {
    var v = sheet_(c, ["id", "json", "updatedAt", "by"]).getDataRange().getValues();
    var m = {};
    for (var i = 1; i < v.length; i++) if (v[i][0] !== "") { try { m[v[i][0]] = JSON.parse(v[i][1]); } catch (e) {} }
    res[c] = m;
  });
  var lv = sheet_("log", ["t", "user", "coll", "id", "name", "field", "to"]).getDataRange().getValues();
  var log = [];
  for (var j = Math.max(1, lv.length - LOG_RETURN); j < lv.length; j++) { var r = lv[j]; log.push({ t: Number(r[0]), u: r[1], c: r[2], k: r[3], n: r[4], f: r[5], to: r[6] === "" ? "" : JSON.parse(r[6]) }); }
  res.log = log;
  return res;
}

function doGet(e) {
  if (!authed_(e.parameter.token)) return out_({ ok: false, error: "Sai token" });
  return out_(readAll_());
}

/* body (text/plain JSON): { token, user, coll, id, patch?: {...}, remove?: true, logs?: [{ f, to, n }] } */
function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: "JSON không hợp lệ" }); }
  if (!authed_(b.token)) return out_({ ok: false, error: "Sai token" });
  if (COLLS.indexOf(b.coll) < 0 || !b.id) return out_({ ok: false, error: "Thiếu coll/id" });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet_(b.coll, ["id", "json", "updatedAt", "by"]);
    var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    var row = -1;
    for (var i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(b.id)) { row = i + 1; break; }
    var now = Date.now(), user = String(b.user || "?").slice(0, 60);
    if (b.remove) { if (row > 0) sh.deleteRow(row); }
    else {
      var cur = {};
      if (row > 0) { try { cur = JSON.parse(sh.getRange(row, 2).getValue()) || {}; } catch (err) {} }
      var p = b.patch || {};
      for (var k in p) { if (p[k] === null) delete cur[k]; else cur[k] = p[k]; }
      var vals = [[String(b.id), JSON.stringify(cur), now, user]];
      if (row > 0) sh.getRange(row, 1, 1, 4).setValues(vals); else sh.appendRow(vals[0]);
    }
    if (b.logs && b.logs.length) {
      var lg = sheet_("log", ["t", "user", "coll", "id", "name", "field", "to"]);
      var rows = b.logs.slice(0, 50).map(function (l) { return [now, user, b.coll, String(b.id), String(l.n || "").slice(0, 200), String(l.f || ""), JSON.stringify(l.to === undefined ? "" : l.to)]; });
      lg.getRange(lg.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
      var extra = lg.getLastRow() - 1 - LOG_KEEP;
      if (extra > 0) lg.deleteRows(2, extra);
    }
  } finally { lock.releaseLock(); }
  return out_(readAll_());
}
