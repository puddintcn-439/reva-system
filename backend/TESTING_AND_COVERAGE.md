# Hướng dẫn: Chạy test & xem báo cáo coverage (backend)

Tài liệu ngắn gọn này mô tả các bước từ khi hoàn tất code -> viết test -> chạy coverage -> xem báo cáo trực quan, cùng các lệnh và mẹo trên máy Windows (cũng áp dụng tương tự cho macOS/Linux với thay đổi lệnh mở file).

## Yêu cầu (Prerequisites)

- Node.js (đã kiểm tra với Node >= 18). Kiểm tra bằng `node -v`.
- npm (đi kèm Node) hoặc `corepack` để dùng `pnpm`/`yarn` nếu bạn dùng.
- Git (tùy chọn cho workflow).
- Trình duyệt (Chrome/Edge/Firefox) để xem báo cáo HTML; Chrome để xuất PDF bằng chế độ headless.

## Cài dependencies (một lần hoặc khi thay đổi `package.json`)

Mở terminal ở thư mục repo, vào thư mục backend:

```powershell
cd backend
npm ci           # hoặc `npm install` nếu chưa dùng CI
```

## 1) Viết test

- Đặt test vào `backend/src/.../__tests__/` hoặc `backend/src/__tests__/`.
- Sử dụng `jest` cho unit test và `supertest` cho test endpoint (request-level).
- Mẹo mock/import side-effect modules (logger, DB):

```js
// trong file test (trước khi require module cần test)
jest.resetModules();
jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({}) }));
jest.doMock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
const controller = require('../yourController');
```

Ghi chú: luôn mock/đặt lại modules trước khi `require()` nếu module đó khởi tạo network/DB/logger khi import.

## 2) Chạy test nhanh (không có coverage)

```powershell
cd backend
npm run test
```

`npm run test` chạy `jest` thường — dùng để kiểm tra chức năng nhanh.

## 3) Chạy test với coverage (tạo báo cáo HTML)

```powershell
cd backend
npm run test:ci
```

Ở repo này `test:ci` được cấu hình là `jest --coverage --runInBand`. Sau khi chạy xong sẽ tạo folder `backend/coverage/` chứa các báo cáo:

- `backend/coverage/lcov-report/`  — HTML interactive report (mở `index.html` để xem).
- `backend/coverage/coverage-final.json` — dữ liệu coverage JSON.
- `backend/coverage/lcov.info` — lcov data.

## 4) Xem báo cáo trực quan

Option A — mở file trực tiếp (Windows):

```powershell
start backend\coverage\lcov-report\index.html
```

Option B — phục vụ bằng static HTTP server (an toàn khi report có assets):

```powershell
cd backend
npx --yes http-server coverage/lcov-report -p 8082
# Mở http://127.0.0.1:8082 trong trình duyệt
```

Ghi chú: nếu báo cáo trả về 404, kiểm tra đường dẫn và đảm bảo `index.html` tồn tại trong `coverage/lcov-report`. Nếu port bị chiếm, đổi số port (ví dụ 8083) và thử lại.

Ví dụ kiểm tra server:

```powershell
# kiểm tra header
curl.exe -I http://127.0.0.1:8082/index.html
# kiểm tra port đang dùng
netstat -aon | findstr :8082
# kill tiến trình (nếu cần)
taskkill /PID <PID> /F
```

## 5) Lưu báo cáo thành 1 file (PDF) để dễ lưu/truyền

Option 1 — Mở báo cáo trong trình duyệt rồi `Print -> Save as PDF` (dễ nhất).

Option 2 — Dùng Chrome headless (Windows example):

```powershell
#$INDEX là đường dẫn file index.html tuyệt đối, ví dụ C:\Users\you\...\backend\coverage\lcov-report\index.html
#Replace the path below with đường dẫn thực tế
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --print-to-pdf="%CD%\backend\coverage\coverage-report.pdf" "file:///%CD%/backend/coverage/lcov-report/index.html"
```

Option 3 — Dùng Puppeteer (nếu muốn tự động hoá và có nhiều tuỳ chọn):

```powershell
cd backend
npm i -D puppeteer
node -e "(async()=>{const p=require('puppeteer');const b=await p.launch();const page=await b.newPage();await page.goto('file:///'+process.cwd().replace(/\\/g,'/')+'/coverage/lcov-report/index.html',{waitUntil:'networkidle0'});await page.pdf({path:'coverage-report.pdf',format:'A4'});await b.close();})()"
```

Lưu ý: cài `puppeteer` sẽ tải Chromium, chiếm thêm dung lượng. Nếu đã có Chrome cài sẵn, Option 2 thường đủ.

## 6) Vị trí hữu ích

- Báo cáo HTML: `backend/coverage/lcov-report/index.html`  
- Dữ liệu coverage JSON: `backend/coverage/coverage-final.json`
- Lệnh test: `npm run test` và `npm run test:ci` (coverage)

## 7) Các vấn đề phổ biến & cách xử lý nhanh

- 404 khi mở `index.html` qua http-server: chắc chắn bạn serve đúng thư mục `lcov-report` (không phải `coverage` root) hoặc dùng đường dẫn tuyệt đối cho http-server.
- Port bị chiếm: dùng `netstat -aon | findstr :<port>` và `taskkill /PID <PID> /F`.
- Tests fail do logger/db side-effects: mock `src/config/logger` và `src/config/database` trước khi require module (xem ví dụ ở phần Viết test).

## 8) Tổng kết các lệnh thường dùng (copy/paste)

```powershell
# 1. Cài deps
cd backend
npm ci

# 2. Chạy test nhanh
npm run test

# 3. Chạy test + coverage
npm run test:ci

# 4. Serve báo cáo HTML
npx --yes http-server coverage/lcov-report -p 8082
# mở http://127.0.0.1:8082

# 5. Tạo PDF nhanh bằng Chrome (Windows):
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --print-to-pdf="%CD%\backend\coverage\coverage-report.pdf" "file:///%CD%/backend/coverage/lcov-report/index.html"
```

---

File này lưu ở: `backend/TESTING_AND_COVERAGE.md` — mình đã tạo file trong repo để bạn tham khảo sau này.

Nếu bạn muốn, mình có thể:
- Tạo script tự động `backend/scripts/generate_coverage_pdf.js` để xuất PDF (dùng puppeteer), hoặc
- Chụp ảnh (screenshot) của trang coverage và đính kèm ở đây.

Bạn muốn mình làm tiếp mục nào? (tạo script PDF / lấy screenshot / bắt đầu viết thêm tests cho controllers?)
