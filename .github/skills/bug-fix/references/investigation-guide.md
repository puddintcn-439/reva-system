# Bug Investigation Guide — REVA

Hướng dẫn điều tra từng loại lỗi phổ biến trong hệ thống REVA.

---

## 1. API trả lỗi HTTP (4xx / 5xx)

### Bước điều tra

```
1. Xác định HTTP method + path bị lỗi
2. Tìm route tương ứng trong backend/src/routes/
3. Đọc controller handler
4. Trace: validate → query DB → transform → respond
```

### Checklist theo status code

| Code | Nguyên nhân phổ biến | Nơi kiểm tra |
|------|---------------------|--------------|
| 400  | Validation fail, body thiếu field | `express-validator` rules trong route file, hoặc guard check trong controller |
| 401  | Token missing/expired, refresh fail | `backend/src/middleware/auth.js` → `authenticate()` |
| 403  | Role không có permission | `requirePermission()` trong route + `role_permissions` table trong DB |
| 404  | Record không tồn tại trong DB | Controller: `result.rows.length === 0` check |
| 409  | Unique constraint vi phạm | DB error code `23505`; kiểm tra constraint trong `database/schema.sql` |
| 422  | Business rule violation | Logic check trong controller (VD: settlement đã `paid` không thể cancel) |
| 500  | Unhandled exception | Stack trace trong server log; tìm `next(err)` call trước điểm crash |

### Tools

```js
// Tìm route handler
grep_search("router.post('/path'", "backend/src/routes/")

// Tìm controller function
grep_search("const funcName", "backend/src/controllers/")

// Tìm DB query liên quan
grep_search("INSERT INTO tableName|UPDATE tableName|SELECT.*FROM tableName", "backend/src/")
```

---

## 2. Lỗi liên quan Database

### Pattern thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|------------|-----|
| `column "x" does not exist` | Migration chưa chạy, hoặc typo tên column | Kiểm tra `database/schema.sql`; chạy migration |
| `null value in column violates not-null` | INSERT thiếu required field | Xem constraint `NOT NULL` trong schema |
| `foreign key violation` | Insert với ID không tồn tại | Verify parent record tồn tại trước khi insert |
| `duplicate key value` | UNIQUE constraint | Dùng `ON CONFLICT DO NOTHING` hoặc kiểm tra trước khi insert |
| `operator does not exist: uuid = integer` | Type mismatch trong WHERE | Đảm bảo param được cast đúng type khi truyền vào `db.query()` |
| Pool exhausted / timeout | Quá nhiều connections chờ | Xem `backend/src/config/database.js` — `max` pool size |

### Kiểm tra schema

```
// Đọc definition của table
read_file("database/schema.sql") -- tìm CREATE TABLE tableName

// Kiểm tra foreign key references
grep_search("REFERENCES tableName", "database/schema.sql")

// Kiểm tra indexes
grep_search("CREATE INDEX.*ON tableName", "database/schema.sql")
```

---

## 3. Lỗi Authentication / Authorization

### Luồng auth

```
Request
  → authenticate() [middleware/auth.js]
    → verify JWT (jwt.verify)
    → query users table (id + is_active check)
    → attach req.user
  → requirePermission('perm:name') [middleware/auth.js]
    → getPermissionsForRole(role) [cache 5 phút]
    → check perms.has(permission)
  → Controller
```

### Điều tra

1. Token expired? → `jwt.verify` throw `JsonWebTokenError` / `TokenExpiredError`
2. User bị deactivate? → `is_active = FALSE` trong `users` table
3. Role thiếu permission? → `SELECT * FROM role_permissions WHERE role='...'`
4. Permission cache stale? → `invalidatePermCache()` trong `auth.js` — cache TTL 5 phút

```js
// Tìm tất cả requirePermission checks trong routes
grep_search("requirePermission(", "backend/src/routes/")

// Kiểm tra permission assignment cho role
// SQL: SELECT * FROM role_permissions WHERE role = 'staff';
```

---

## 4. Lỗi Frontend — Component / State

### Checklist

| Triệu chứng | Điều tra |
|------------|---------|
| Dữ liệu không load | Kiểm tra `useQuery` key, `queryFn`, enabled condition |
| Form submit không phản hồi | Kiểm tra `useMutation` `onSuccess`/`onError`, validation trong handler |
| State cũ sau khi update | Kiểm tra `queryClient.invalidateQueries()` trong `onSuccess` |
| Component không re-render | Kiểm tra dependency array trong `useEffect`/`useCallback`/`useMemo` |
| API call bị 401 loop | Kiểm tra `api.js` interceptor — refresh token flow |
| Data undefined crash | Kiểm tra optional chaining `data?.field`, default value |

### Pattern tìm lỗi frontend

```js
// Tìm component liên quan
grep_search("ComponentName", "frontend/src/pages/")
semantic_search("feature name or symptom description")

// Tìm API call
grep_search("apiFunction", "frontend/src/services/api.js")
grep_search("useQuery.*queryKey.*'feature'", "frontend/src/pages/")

// Kiểm tra AuthContext permission check
grep_search("can('permission:name')", "frontend/src/")
```

---

## 5. Lỗi liên quan Permissions / RBAC

### Điều tra

```
1. Xác định permission cần: grep "requirePermission" trong route file
2. Kiểm tra role_permissions trong migrate_inbox.js / schema.sql
3. Kiểm tra frontend: can('perm') trong component
4. Kiểm tra getPermissions() trong authController.js
```

### Các permission đã có trong hệ thống

| Permission | Ai có |
|-----------|-------|
| `inbox:view` | Tất cả roles (superadmin → viewer) |
| `inbox:manage` | superadmin, admin, manager |
| Các permission khác | Xem `database/schema.sql` → `role_permissions` seed |

---

## 6. Lỗi Email / SMTP

```
1. Kiểm tra cấu hình SMTP trong Admin → Settings
2. Hoặc env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
3. Đọc backend/src/config/email.js — hàm khởi tạo transporter
4. Log lỗi nodemailer thường ở dạng ECONNREFUSED hoặc EAUTH
```

---

## 7. Lỗi File Upload / Image

```
1. Endpoint: POST /api/upload/image — đọc backend/src/routes/upload.js
2. Kiểm tra SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET trong env
3. Bucket phải được set Public trong Supabase Storage
4. File size limit: mặc định multer hoặc Supabase limit
```

---

## 8. Lỗi Production / Deployment (Vercel + Supabase)

| Triệu chứng | Kiểm tra |
|------------|---------|
| API trả 500 trên Vercel | Vercel function logs (Dashboard → Deployment → Functions) |
| DB connection refused | DATABASE_URL dùng **Transaction Pooler** port **6543**, không phải 5432 |
| CORS error | CLIENT_URL trong Vercel env phải match domain frontend chính xác |
| JWT invalid sau deploy | JWT_SECRET phải giống nhau giữa các deployments |
| Images không load | SUPABASE_BUCKET phải set Public; URL trả về phải là public URL |

---

## Công cụ điều tra nhanh (tóm tắt)

```bash
# Backend: chạy tests
cd backend && npm test

# Backend: coverage report  
cd backend && npm run test:coverage

# Frontend: chạy tests
cd frontend && npm test

# Tìm error trong code
grep -r "console.error\|throw new\|next(err)" backend/src/controllers/

# Kiểm tra DB schema cho table cụ thể
grep -A 30 "CREATE TABLE IF NOT EXISTS tableName" database/schema.sql
```

---

## 9. Build Verification Checklist

Sau mỗi bug fix, chạy theo thứ tự trước khi commit:

| Bước | Lệnh | Điều kiện PASS |
|------|------|----------------|
| Lint / errors | `get_errors` (IDE) | Không có error mới |
| Backend tests | `cd backend && npm test` | All tests PASS |
| Frontend tests | `cd frontend && npm test` | All tests PASS |
| **Frontend build** | `cd frontend && npm run build` | **Build hoàn thành, không có error** |
| Backend sanity | `cd backend && node -e "require('./src/app')"` | Process exit code 0 |
| Coverage | `cd backend && npm run test:coverage` | Không giảm dưới threshold |

### Tại sao cần build frontend?

Vite dev server (`npm run dev`) bỏ qua nhiều lỗi mà build production sẽ catch:
- Import path sai / file không tồn tại
- Component export thiếu / sai tên
- Circular dependency
- Unused import gây tree-shaking fail
- Syntax error trong JSX chỉ xuất hiện ở production mode

### Lỗi build phổ biến và cách fix

| Lỗi build | Nguyên nhân | Fix |
|-----------|------------|-----|
| `Cannot find module './Component'` | File bị rename hoặc path sai | Kiểm tra đường dẫn import |
| `'X' is not exported from 'Y'` | Named export bị xóa/đổi tên | Sửa export hoặc import |
| `Chunk size warning > 500kb` | Bundle quá lớn | Thêm lazy import nếu cần (không bắt buộc fix) |
| `[vite]: Rollup failed to resolve import` | Import dùng alias chưa config | Kiểm tra `vite.config.js` alias |
| `window is not defined` | Code dùng browser API trong SSR context | Guard bằng `typeof window !== 'undefined'` |

### Lệnh build đầy đủ (chạy từ root project)

```bash
# Build frontend
cd frontend && npm run build

# Nếu build OK, kiểm tra output size
ls dist/assets/ | sort -k5 -rh | head -10

# Preview build (optional — kiểm tra runtime)
npm run preview
```
