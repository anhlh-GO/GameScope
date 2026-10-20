# GamePulse – Mobile Game Analytics (prototype)

Bản prototype chạy hoàn toàn trên trình duyệt với **dữ liệu demo**. Không cần build, không cần Node.

## Triển khai lên GitHub Pages

1. **Upload code**: đưa toàn bộ nội dung thư mục này (kể cả `.github/` và `.nojekyll`) lên nhánh `main`, `index.html` phải nằm ở gốc repo.
2. **Tạo mã hash mật khẩu** bằng một trong ba cách:
   - Terminal macOS / Linux: `printf '%s' 'MatKhauCuaBan' | shasum -a 256 | cut -d' ' -f1`
   - PowerShell: `$s=[Text.Encoding]::UTF8.GetBytes('MatKhauCuaBan'); -join ([Security.Cryptography.SHA256]::Create().ComputeHash($s) | % { $_.ToString('x2') })`
   - Hoặc trong app: **Settings → Security → Change password** (tạo hash trên máy, không gửi đi đâu).
3. **Tạo secret**: Repo → **Settings → Secrets and variables → Actions → New repository secret**. Name: `GP_PASSWORD_SHA256`, Value: chuỗi hash 64 ký tự.
4. **Bật Pages**: Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. **Deploy**: tab **Actions → Deploy GamePulse → Run workflow** (hoặc push một commit bất kỳ). Khi xong (~1 phút), link hiện ở Settings → Pages: `https://<user>.github.io/<repo>/`.

**Đổi mật khẩu** = sửa secret rồi chạy lại workflow. Hash không bao giờ nằm trong lịch sử git.

## Lưu ý quan trọng
- **Bảo mật**: cổng mật khẩu chạy phía client, chỉ ngăn truy cập thông thường. Repo public thì ai cũng xem được mã nguồn và dữ liệu demo. Nếu cần bảo mật thật, dùng repo private + GitHub Pages cho tổ chức (Enterprise) hoặc Cloudflare Access / Vercel / Netlify có password.
- **Ask AI**: không hoạt động trên GitHub Pages (trợ lý AI chỉ có trong môi trường thiết kế). Trang vẫn hiển thị và báo lỗi rõ ràng. Muốn dùng thật cần backend `POST /api/v1/ai/ask` giữ API key — không bao giờ đặt API key trong file frontend.
- Cần Internet: React, Babel, Lucide và font Geist tải từ CDN.
- Mở file trực tiếp bằng `file://` sẽ không chạy. Thử local bằng `python3 -m http.server` trong thư mục này rồi mở `http://localhost:8000`.

## Cấu trúc
```
index.html            app
config.js             hash mật khẩu, thời gian phiên, khoá sau 5 lần sai
styles.css, tokens/   design tokens (dark / light)
components/           component design system (*.jsx.txt, biên dịch trên trình duyệt)
ds-loader.js          nạp components
data/mockData.js      dữ liệu demo 6 game × 180 ngày
data/metrics.js       engine tính KPI
kit/*.babel.js        các màn hình
.github/workflows/    tự động deploy + chèn hash mật khẩu
```
