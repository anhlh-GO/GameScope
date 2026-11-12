# Hướng dẫn: Quản lý game dùng chung cho cả team

Trang **Quản lý game** trong GamePulse đọc danh sách game từ sheet "Tạo ID Game_Publisher_new" (tự cập nhật mỗi 3 giờ).
Mọi thứ bạn chỉnh trên dashboard được lưu riêng, **không sửa sheet gốc**. Đó là: Status UA, trạng thái store, Creative, tích Tracking / Monetization / Source, ghi chú, ưu tiên, ẩn, game tự thêm, Benchmark, Document.

Mặc định các chỉnh sửa này **chỉ lưu trên trình duyệt đang dùng**; trang hiện nhãn vàng "Chỉ lưu trên máy này".
Để cả team cùng thấy và nhận thông báo khi người khác cập nhật, cài **nơi lưu chung** một lần theo hướng dẫn dưới (khoảng 10 phút).

---

## Phần A — Người quản trị cài nơi lưu chung (làm 1 lần)

Nơi lưu chung là một Google Sheet + một Google Apps Script chạy dưới tài khoản của bạn. Không tốn phí.

### Bước 1. Tạo Google Sheet chứa dữ liệu
1. Vào https://sheets.new (đăng nhập bằng tài khoản công ty).
2. Đặt tên, ví dụ **GamePulse – Quản lý game data**.
3. Không cần tạo tab hay tiêu đề, script sẽ tự tạo các tab `edits`, `custom`, `docs`, `bench`, `log`.
4. Chỉ share sheet này cho người cần xem dữ liệu thô. Team **không cần** quyền vào sheet này để dùng dashboard.

### Bước 2. Dán code Apps Script
1. Trong sheet vừa tạo: menu **Tiện ích mở rộng (Extensions) → Apps Script**.
2. Xoá đoạn code mẫu `function myFunction() {}`.
3. Mở file `scripts/gm-sync.gs` trong repo GitHub, copy **toàn bộ** nội dung, dán vào.
4. Bấm biểu tượng **Lưu** (đĩa mềm) và đặt tên project, ví dụ `gm-sync`.

### Bước 3. Đặt TOKEN (mật khẩu cho dữ liệu chung)
1. Bên trái chọn **Project Settings** (bánh răng).
2. Kéo xuống **Script Properties → Add script property**.
3. Property: `TOKEN`. Value: một chuỗi ngẫu nhiên dài, ví dụ `k3P9xQ2mZr7Lw1Vt8Yb4Hn6s`. Không dùng lại mật khẩu thật nào.
4. Bấm **Save script properties**. Ghi chuỗi này lại để dùng ở Bước 5.

### Bước 4. Deploy thành Web app
1. Góc trên bên phải: **Deploy → New deployment**.
2. Bấm bánh răng cạnh "Select type" → chọn **Web app**.
3. Điền:
   - Description: `gm-sync v1`
   - Execute as: **Me (email của bạn)**
   - Who has access: **Anyone**. Bắt buộc chọn mục này, vì dashboard gọi từ GitHub Pages mà không đăng nhập Google. Dữ liệu vẫn được chặn bằng TOKEN.
4. Bấm **Deploy** → **Authorize access** → chọn tài khoản → nếu hiện "Google hasn't verified this app" thì bấm **Advanced → Go to gm-sync (unsafe)** → **Allow**. Cảnh báo này xuất hiện vì đây là script của chính bạn.
5. Copy **Web app URL**, dạng `https://script.google.com/macros/s/AKfy…/exec`.
6. Kiểm tra nhanh: dán URL vào trình duyệt, thêm `?token=<TOKEN>` vào cuối. Nếu thấy `{"ok":true,...}` là xong. Nếu thấy `"Sai token"` thì kiểm tra lại Bước 3.

### Bước 5. Gắn vào GamePulse cho cả team
1. Trên GitHub, mở repo GamePulse: **Settings → Secrets and variables → Actions → New repository secret**.
2. Tạo 2 secret:
   - `GM_SYNC_URL` = Web app URL ở Bước 4
   - `GM_SYNC_TOKEN` = chuỗi TOKEN ở Bước 3
3. Vào tab **Actions → Deploy GamePulse → Run workflow**. Đợi khoảng 2–3 phút cho xong.
4. Mở dashboard, vào **Quản lý game**. Nhãn đổi thành **"Lưu chung · hh:mm"** màu xanh là thành công.

> Muốn thử trước khi thêm secret: bấm biểu tượng ⚙ trên trang Quản lý game, dán URL và TOKEN, rồi bấm **Lưu và tải lại**. Cách này chỉ áp dụng cho máy đó.

### Sửa code Apps Script về sau (ví dụ khi repo có bản `gm-sync.gs` mới)
Dán code mới → Lưu → **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**.
**Không** tạo "New deployment" mới, vì như vậy URL sẽ đổi và phải sửa lại secret.

### Đổi TOKEN (khi có người rời team)
Đổi giá trị `TOKEN` trong Script Properties, cập nhật secret `GM_SYNC_TOKEN` trên GitHub, rồi chạy lại Action.

---

## Phần B — Thành viên trong team dùng hằng ngày

### Lần đầu
- Mở dashboard bằng mật khẩu GamePulse như bình thường → menu **Quản lý game**.
- Lần đầu bạn sửa gì, trang hỏi **"Bạn là ai?"**. Nhập tên viết tắt (vd `GiangBT`). Tên này hiện trong lịch sử và thông báo cho cả team.
- Đổi tên: bấm ⚙ → "Tên của bạn" → **Chỉ lưu tên**.

### Tab Game
| Việc | Cách làm |
|---|---|
| Lọc theo đối tác | Bấm các chip **Thư mục** (chọn được nhiều cái); đối tác ít game nằm trong "+N thư mục khác" |
| Lọc nhanh theo số liệu | Bấm các ô Tổng game / Android / iOS / Live trên store / Đang chạy UA / UA not run / Thiếu thư mục / Ưu tiên / Đã ẩn |
| Tìm | Gõ tên, package, đối tác, người phụ trách, ghi chú; gõ `-từ` để loại trừ |
| Đổi Status UA / store / Creative | Chọn trực tiếp trên dòng; lưu ngay |
| Tích Tracking / Monetization / Source | Bấm ô vuông; hiện **Xong** màu xanh |
| Gắn ưu tiên | Bấm ☆; game ưu tiên luôn nằm trên cùng |
| Sửa thông tin khác, link Creative, ghi chú | Bấm ✏ |
| Xem ai đã sửa gì | Bấm 🕘 trên dòng (số nhỏ = số lần thay đổi) |
| Ẩn game không còn theo dõi | Bấm 👁 gạch chéo; xem lại ở ô **Đã ẩn** |

Thông tin lấy từ sheet (tên, package, UA, MO, đối tác, link Drive…) nếu sửa trên dashboard thì chỉ **ghi đè trên dashboard**. Muốn sửa gốc thì sửa trong sheet; dashboard tự nhận sau tối đa 3 giờ.

### Thông báo
- Khi vào trang, nếu có người khác cập nhật kể từ lần trước bạn vào, góc phải hiện **"N cập nhật mới…"**, ghi ai sửa, lúc nào, game nào, sửa gì.
- **Đã xem** đóng thông báo và đánh dấu đã đọc. **Xem lịch sử đầy đủ** mở toàn bộ lịch sử của team.
- Đang mở trang, cứ mỗi phút trang tự tải lại dữ liệu chung; có cập nhật mới sẽ hiện thông báo nhỏ ở góc.
- Nút **Thông báo** (có số đỏ) mở lại khung thông báo bất cứ lúc nào.

### Tab Benchmark
- **Thêm benchmark**: nhập bộ chỉ số mục tiêu của một game đối chiếu, gồm RR D1 / D7 / D14 / D28 (%) và IMP/DAU B (banner) / I (inter) / R (rewarded) / T (tổng). Ô nào không có số thì để trống.
- **Lấy nhanh số từ game GA4**: chọn một game có trong GamePulse để điền sẵn số 30 ngày gần nhất.
- **Tự áp dụng cho đối tác / Platform**: game chưa chọn benchmark sẽ tự dùng benchmark khớp đối tác và platform của nó; dòng đó hiện "Tự động: …". Benchmark không ghi đối tác và platform là mặc định cho mọi game.
- Ở tab Game, cột **Benchmark** có ô chọn cho từng game: Tự động, một benchmark tự nhập, một game GA4 (30 ngày), hoặc Không so sánh.
- **Chỉ số nào của game vượt benchmark được tô xanh**, chưa đạt thì giữ nguyên. Rê chuột lên một chỉ số để xem số của game và số benchmark.
- **Số của game lấy từ đâu:** từ GA4 nếu game có trong GamePulse; trang tự khớp theo tên, dòng "So với: …" cho biết khớp với game GA4 nào. Muốn đổi game GA4 hoặc nhập số tay thì bấm ✏ → mục "Số liệu game để so với benchmark".
- Lưu ý: GA4 không tách impression theo định dạng, nên số GA4 chỉ có **IMP T (tổng)**. B / I / R của game phải nhập tay nếu muốn so.

### Tab Document
- **Thêm tài liệu**: tiêu đề, link, nhóm (Tích hợp SDK, Tracking, Mediation…), game liên quan (để trống = chung), ghi chú.
- Tìm kiếm và lọc theo nhóm; có nút copy link, sửa, xoá.
- Không dán mật khẩu, API key hay file chứa key vào tài liệu hoặc ghi chú.

### Xuất / Nhập
- **Xuất**: tải toàn bộ chỉnh sửa về một file `.json` để sao lưu.
- **Nhập**: chỉ hiện khi chưa bật lưu chung; dùng để chuyển dữ liệu giữa các máy.

---

## Xử lý sự cố
| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| Nhãn vàng "Chỉ lưu trên máy này" | Chưa có secret `GM_SYNC_URL` hoặc Action chưa chạy lại sau khi thêm secret |
| "Không tải được dữ liệu chung: Sai token" | TOKEN trong Script Properties khác secret `GM_SYNC_TOKEN` |
| "Chưa lưu được lên dữ liệu chung" | Mạng lỗi, hoặc Web app chưa để "Anyone". Thử lại; kiểm tra Bước 4 |
| Sửa code Apps Script xong không có tác dụng | Chưa tạo **New version** trong Manage deployments |
| "Chưa kéo được sheet" | Service account mất quyền xem sheet "Tạo ID Game_Publisher_new", hoặc Google Sheets API bị tắt |
| Benchmark không có ô xanh nào | Game chưa có số liệu (không có trong GA4 và chưa nhập tay), hoặc chưa vượt chỉ số nào |

**Bảo mật:** URL Web app và TOKEN nằm trong trang (sau cổng mật khẩu GamePulse), nên đây là mức bảo vệ cơ bản. Đừng lưu thông tin nhạy cảm vào nơi lưu chung.
