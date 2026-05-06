---
name: bug-fix
description: "Điều tra nguyên nhân bug, liệt kê các bước fix có thứ tự ưu tiên, thực hiện fix, và report lại tình trạng sau khi sửa. Dùng khi: 'fix bug', 'lỗi', 'bug', 'sửa lỗi', 'không hoạt động', 'bị lỗi', 'crash', 'báo lỗi', 'tại sao không chạy', 'điều tra lỗi', 'debug', 'investigate', 'root cause'."
argument-hint: "Mô tả ngắn bug: triệu chứng, file/endpoint/component liên quan, và (tùy chọn) error message hoặc bước tái hiện."
---

# Bug Fix Skill — REVA

Skill này hướng dẫn quy trình điều tra bug có hệ thống, fix đúng nguyên nhân gốc rễ (root cause), và duy trì `bug-log.md` theo dõi lịch sử bug của dự án.

---

## Khi nào dùng

- Người dùng báo có lỗi hoặc tính năng không hoạt động đúng
- Cần debug một endpoint / component / service cụ thể
- Muốn điều tra root cause trước khi code
- Sau khi fix xong — để report và update docs liên quan

---

## Workflow (5 bước)

### Bước 1 — Thu thập thông tin (Triage)

Hỏi hoặc suy luận từ mô tả người dùng:

| Field | Mô tả |
|-------|-------|
| **Triệu chứng** | Người dùng thấy gì? (UI bị lỗi, API trả 5xx, data sai...) |
| **Bước tái hiện** | Thao tác nào dẫn đến lỗi |
| **Error message** | Nội dung lỗi chính xác nếu có |
| **Phạm vi** | Backend / Frontend / DB / cả hai |
| **Môi trường** | Dev local / Staging / Production |
| **Tần suất** | Luôn xảy ra / thỉnh thoảng / sau action cụ thể |

Đọc [investigation-guide.md](./references/investigation-guide.md) để biết cách điều tra từng loại lỗi (API error, DB error, frontend state, auth, v.v.).

---

### Bước 2 — Điều tra Root Cause

Thực hiện theo thứ tự:

1. **Đọc error message** — nếu có stack trace, tìm dòng đầu tiên trong code của dự án (không phải node_modules)
2. **Trace luồng dữ liệu** — từ trigger (UI click / API call) → controller → service/DB → response
3. **Đọc code liên quan** — dùng `grep_search`, `read_file`, `semantic_search` để tìm và đọc file liên quan
4. **Kiểm tra DB schema** — nếu bug liên quan data, đọc `database/schema.sql` để confirm column types, constraints, foreign keys
5. **Kiểm tra permissions** — nếu bug là 403/401, đọc `backend/src/middleware/auth.js` và `role_permissions` table
6. **Tìm kiếm bug tương tự** — dùng `grep_search` để tìm pattern tương tự ở các file khác

**Xác định root cause theo format:**
```
Root Cause: [mô tả ngắn gọn, chính xác]
Loại lỗi: [logic | typo | missing-validation | race-condition | schema | permissions | dependency | config]
File(s) bị ảnh hưởng: [list file + dòng]
```

---

### Bước 3 — Lập kế hoạch fix

Liệt kê các bước fix theo thứ tự, mỗi bước rõ ràng:

```
Fix Plan:
1. [File] Line XX — [Mô tả thay đổi cụ thể]
2. [File] Line XX — [Mô tả thay đổi cụ thể]
3. [Tests] Thêm/sửa test case cho [scenario]
4. [Docs] Cập nhật [file doc] nếu behavior thay đổi
```

**Lưu ý khi lập kế hoạch:**
- Ưu tiên fix đúng root cause, không patch symptom
- Nếu có nhiều file cần sửa, dùng `multi_replace_string_in_file` để thực hiện song song
- Nếu bug ảnh hưởng DB schema → cần tạo migration mới, không sửa trực tiếp `schema.sql`
- Nếu fix thay đổi API contract → cần update Swagger docs trong controller/routes
- Nếu fix thay đổi UI behavior → kiểm tra liệu có cần update `guide.md` (public guide)

---

### Bước 4 — Thực hiện Fix

Thực hiện các thay đổi theo kế hoạch. Sau mỗi nhóm thay đổi:
- Chạy test liên quan nếu có (`npm test` trong backend hoặc frontend)
- Verify bằng `get_errors` để không có TypeScript/linting error mới
- Nếu backend thay đổi logic quan trọng → chạy `npm test` và kiểm tra coverage không giảm

---

### Bước 5 — Report và cập nhật tracking

Sau khi fix xong, sinh report theo [fix-report-template.md](./references/fix-report-template.md) và:

1. **Thêm entry vào [bug-log.md](./references/bug-log.md)** với status `Fixed`
2. **Cập nhật docs liên quan** nếu behavior thay đổi:
   - `DEPLOYMENT_ENV.md` — nếu thêm/đổi env var
   - `README.md` — nếu setup hoặc run instructions thay đổi
   - Controller Swagger comments — nếu API contract thay đổi
   - `frontend/public/guide.md` — nếu UX flow thay đổi
3. **Commit** với message format: `fix(<scope>): <mô tả ngắn>`

---

## Quy tắc quan trọng

| Rule | Lý do |
|------|-------|
| Không patch symptom — fix root cause | Patch symptom tạo technical debt |
| Không sửa schema.sql trực tiếp | Cần migration file để track thay đổi DB |
| Commit sau mỗi bug fix độc lập | Dễ rollback nếu cần |
| Cập nhật test nếu behavior thay đổi | Tránh regression sau này |
| Ghi vào bug-log.md | Giúp detect pattern lỗi lặp lại |

---

## Severity levels

| Level | Mô tả | Ví dụ | Hành động |
|-------|-------|-------|-----------|
| 🔴 **Critical** | Hệ thống crash hoặc mất data | 500 trên mọi request, DB corruption | Fix ngay, hot-patch production |
| 🟠 **High** | Tính năng chính bị hỏng | Không đăng nhập được, không tạo SP | Fix trong sprint hiện tại |
| 🟡 **Medium** | Tính năng phụ bị ảnh hưởng | Filter sai, export bị thiếu cột | Fix trong sprint tiếp theo |
| 🟢 **Low** | UI/UX không ảnh hưởng logic | Typo, màu sai, spacing | Fix khi có thời gian |
