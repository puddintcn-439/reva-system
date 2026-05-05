# Senior Code Review Checklist

Review toàn bộ các file đã thay đổi/tạo mới. Mỗi mục phải pass trước khi sang Phase 4.

---

## 1. Security (OWASP Top 10)

- [ ] **SQL Injection**: Tất cả query dùng parameterized (`$1`, `$2`), không string interpolation
- [ ] **Input Validation**: Tất cả endpoint nhận body/params có `express-validator` trước handler
- [ ] **Authentication**: Tất cả route admin có `authenticate` middleware
- [ ] **Authorization**: Tất cả route admin có `requirePermission(...)` phù hợp
- [ ] **Sensitive data**: Không log/return `password`, `token_hash`, secret keys
- [ ] **Mass assignment**: Controller không truyền thẳng `req.body` vào DB — destructure explicit
- [ ] **Rate limiting**: Route mới có cần rate limit riêng không? (login, public forms đã có)
- [ ] **File upload** (nếu có): Validate MIME type, giới hạn size, dùng `memoryStorage`

---

## 2. Error Handling

- [ ] Tất cả async function dùng `try/catch` với `next(err)` — không có unhandled rejection
- [ ] Không có `res.status(500).json(...)` thủ công — để errorHandler xử lý
- [ ] 404 case được handle rõ ràng (kiểm tra `result.rows.length`)
- [ ] Lỗi business logic dùng `err.statusCode` đúng (400, 404, 409, 422) — không phải 500

---

## 3. Data Integrity

- [ ] Operations cần atomic sử dụng transaction (`BEGIN/COMMIT/ROLLBACK`)
- [ ] Unique constraint violation được catch và trả về 409, không crash
- [ ] FK constraint: kiểm tra resource tồn tại trước khi insert/update FK column
- [ ] Soft delete vs hard delete: xem xét có nên xóa hẳn hay chỉ đánh dấu

---

## 4. Business Logic

- [ ] Commission calculation: dùng `sysSettings.getCommissionTiers()` — không hardcode
- [ ] Product status transitions: chỉ cho phép transition hợp lệ (vd: `sold` không thể về `active`)
- [ ] Pagination: tất cả list endpoint có `page` + `limit` + `total` trong response
- [ ] Datetime: dùng `TIMESTAMPTZ` trong DB, không `TIMESTAMP` — để Supabase xử lý timezone

---

## 5. Code Quality

- [ ] Không có `console.log / console.error` trong code production — chỉ dùng `logger.*`
- [ ] Không có dead code, commented-out code blocks
- [ ] Function quá dài (>60 lines): tách thành helper functions
- [ ] Duplicate logic: tách thành util/helper
- [ ] Biến đặt tên rõ nghĩa — không `data`, `result`, `temp`, `x`
- [ ] Async/await nhất quán — không mix `.then()` và `await` trong cùng function

---

## 6. Frontend Specific

- [ ] Loading state được handle: `isLoading` → hiển thị skeleton/spinner
- [ ] Error state được handle: `error` → hiển thị thông báo, không crash
- [ ] Empty state được handle: list trống → hiển thị text "Chưa có dữ liệu"
- [ ] Mutation onSuccess: invalidate đúng query keys
- [ ] `can(permission)` check trước mọi destructive button (Xóa, Sửa)
- [ ] Form validation: disable submit button khi `isPending`; prevent double submit
- [ ] Modal: có nút đóng (X), click overlay đóng, ESC đóng (nếu phức tạp)
- [ ] Table: có `overflow-x-auto` wrapper
- [ ] Responsive: test mental model trên mobile (320px), tablet (768px), desktop (1280px)

---

## 7. Performance

- [ ] Query N+1: không có loop gọi DB trong loop — dùng JOIN hoặc batch query
- [ ] Query không có `SELECT *` khi chỉ cần vài cột — chỉ chấp nhận cho admin đơn giản
- [ ] React: không tạo object/array mới trong render gây re-render không cần thiết
- [ ] React Query: `staleTime` phù hợp với tần suất data thay đổi

---

## 8. Migration & Schema

- [ ] Migration idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`
- [ ] `database/schema.sql` đã được cập nhật
- [ ] Index cho FK columns và search columns (`WHERE`, `ORDER BY`)
- [ ] Không thêm `NOT NULL` column vào bảng có data mà không có `DEFAULT`

---

## 9. API Contract

- [ ] Response format nhất quán: `{ success: true, data: ... }` hoặc `{ success: false, message: ... }`
- [ ] HTTP status codes đúng: 200 (GET/PUT/PATCH), 201 (POST tạo mới), 204 (DELETE)
- [ ] Swagger JSDoc đầy đủ: summary, tags, security, request body, responses
- [ ] Field names nhất quán với các endpoint khác (snake_case cho DB, camelCase trên FE nếu cần)

---

## Review Report Template

```
## Review Report — <Tên tính năng>

### Issues Found
| # | Severity | File | Line | Issue | Fixed |
|---|----------|------|------|-------|-------|
| 1 | 🔴 Critical | controllers/fooController.js | 45 | SQL injection risk | ✅ |
| 2 | 🟡 Warning | pages/Admin/Foo.jsx | 23 | Missing loading state | ✅ |
| 3 | 🟢 Minor | routes/foo.js | 12 | Missing swagger docs | ✅ |

### Summary
- Critical: X → fixed
- Warning: X → fixed  
- Minor: X → fixed
- PASS: Ready for Phase 4
```

**Severity:**
- 🔴 Critical: Security issue, data loss risk, crashes → phải fix
- 🟡 Warning: Wrong logic, missing error handling → phải fix  
- 🟢 Minor: Style, missing docs, naming → nên fix
