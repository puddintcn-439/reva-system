# Fix Report Template — REVA

Dùng template này để generate report sau mỗi bug fix. Điền vào các `[...]` tương ứng.

---

## Bug Fix Report

```
## 🐛 Bug Fix Report — [BUG-ID]: [Tiêu đề ngắn]

📅 Ngày fix: [YYYY-MM-DD]
👤 Người fix: GitHub Copilot
🔴🟠🟡🟢 Severity: [Critical | High | Medium | Low]
✅ Status: Fixed

---

### 1. Mô tả bug

**Triệu chứng:**
[Mô tả chính xác người dùng thấy gì]

**Bước tái hiện:**
1. [Bước 1]
2. [Bước 2]
3. [Bước 3 — chỗ bị lỗi]

**Error message (nếu có):**
\`\`\`
[Paste error message hoặc stack trace liên quan]
\`\`\`

**Môi trường:** [Dev / Staging / Production]

---

### 2. Root Cause Analysis

**Root cause:**
[Mô tả chính xác, ngắn gọn nguyên nhân gốc rễ]

**Loại lỗi:**
[logic | typo | missing-validation | race-condition | schema | permissions | dependency | config | off-by-one | null-reference | type-mismatch]

**Tại sao lỗi này xảy ra:**
[Giải thích ngắn tại sao logic/code bị sai — không phải mô tả lại triệu chứng]

**File(s) bị ảnh hưởng:**
- `[path/to/file.js]` — dòng [XX–YY]
- `[path/to/other.js]` — dòng [XX–YY]

---

### 3. Các bước đã fix

| # | File | Thay đổi |
|---|------|---------|
| 1 | `[file]` | [Mô tả thay đổi cụ thể] |
| 2 | `[file]` | [Mô tả thay đổi cụ thể] |
| 3 | `[test file]` | [Thêm/sửa test case cho scenario X] |

**Chi tiết thay đổi quan trọng:**
[Nếu cần giải thích logic mới, giải thích ở đây]

---

### 4. Verification

**Test đã chạy:**
- [ ] Lint / type check (`get_errors`) — [PASS / FAIL]
- [ ] Unit tests backend (`cd backend && npm test`) — [PASS / FAIL / SKIP]
- [ ] Unit tests frontend (`cd frontend && npm test`) — [PASS / FAIL / SKIP]
- [ ] **Frontend build** (`cd frontend && npm run build`) — [PASS / FAIL]
- [ ] Coverage không giảm — [trước: X% → sau: Y%]
- [ ] Manual test bước tái hiện — [OK / lỗi khác]

**Kết quả:**
[Mô tả ngắn kết quả sau khi fix — lỗi đã biến mất, test pass, v.v.]

---

### 5. Tài liệu đã cập nhật

| File | Thay đổi |
|------|---------|
| [Không có / `file.md`] | [Mô tả] |

---

### 6. Commit

\`\`\`
fix([scope]): [mô tả ngắn]

[Mô tả dài hơn nếu cần — root cause + fix approach]

Fixes: BUG-[ID]
\`\`\`

---

### 7. Notes / Follow-up

[Có phần nào cần refactor sau không? Có bug liên quan nào khác không? Cần monitor gì sau khi deploy?]
```

---

## Ví dụ Report đã điền

```
## 🐛 Bug Fix Report — BUG-003: Không đóng được hội thoại inbox

📅 Ngày fix: 2026-05-06
👤 Người fix: GitHub Copilot
🟠 Severity: High
✅ Status: Fixed

---

### 1. Mô tả bug

**Triệu chứng:**
Nhấn nút "Đóng" trong Inbox không có phản hồi; API trả 403.

**Bước tái hiện:**
1. Đăng nhập bằng account role `manager`
2. Vào trang Admin → Hộp thư nội bộ
3. Chọn một hội thoại → Nhấn "Đóng"
4. Toast hiện lỗi "Thao tác thất bại"

**Error message:**
```
HTTP 403 — { "success": false, "message": "Không có quyền thực hiện thao tác này", "required": "inbox:manage" }
```

**Môi trường:** Production

---

### 2. Root Cause Analysis

**Root cause:**
Migration `migrate_inbox.js` chưa được chạy trên DB production, nên `role_permissions` chưa có bản ghi `inbox:manage` cho role `manager`.

**Loại lỗi:** config / missing-migration

**Tại sao:** Permissions được lưu trong DB (`role_permissions` table), không hard-code. Migration mới thêm `inbox:manage` nhưng bước "Run migrations on prod" bị bỏ qua.

**File(s) bị ảnh hưởng:**
- `backend/src/scripts/migrate_inbox.js` — bước 5 chưa được chạy trên prod

---

### 3. Các bước đã fix

| # | File | Thay đổi |
|---|------|---------|
| 1 | `DEPLOYMENT_ENV.md` | Thêm bước "Run inbox migration" vào checklist deploy |
| 2 | `backend/src/scripts/migrate-all.js` | Đảm bảo inbox migration được include trong migrate-all |

---

### 4. Verification

- [x] Unit tests — PASS
- [x] Manual test: manager có thể đóng/mở thread — OK

---

### 5. Commit

fix(inbox): document migration step for inbox:manage permission

Manager role lacked inbox:manage because migrate_inbox.js was not
run on production. Added to deployment checklist and migrate-all.

Fixes: BUG-003
```
