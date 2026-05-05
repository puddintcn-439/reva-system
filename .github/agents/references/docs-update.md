# Documentation Update Guide

Sau khi code + test xong, cập nhật tài liệu trước khi commit.

---

## Checklist nhanh

```
Tính năng mới có:
  [ ] API endpoint mới?       → Cập nhật README.md
  [ ] Tính năng admin mới?    → Cập nhật HUONG_DAN_SU_DUNG.md
  [ ] Schema DB thay đổi?     → Cập nhật database/schema.sql
  [ ] Env var mới?            → Cập nhật DEPLOYMENT_ENV.md
  [ ] Permission mới?         → Cập nhật README.md (RBAC section)
```

---

## 1. README.md

**File:** `README.md` (root của repo)

### Khi có API endpoint mới

Thêm vào bảng trong section **"API Endpoints"**:

```markdown
| Method | Endpoint | Auth | Permission | Mô tả |
|--------|----------|------|------------|-------|
| GET | `/api/foo` | ✅ | `foo:view` | Lấy danh sách foo |
| POST | `/api/foo` | ✅ | `foo:manage` | Tạo foo mới |
| PUT | `/api/foo/:id` | ✅ | `foo:manage` | Cập nhật foo |
| DELETE | `/api/foo/:id` | ✅ | `foo:manage` | Xóa foo |
```

### Khi có permission mới

Thêm vào bảng trong section **"Phân quyền (RBAC)"** — thêm đúng role có quyền đó.

### Khi có trang admin mới

Thêm vào section **"Tính năng Admin"**:
```markdown
- **Tên tính năng** (`/admin/foo`): Mô tả ngắn gọn chức năng.
```

---

## 2. HUONG_DAN_SU_DUNG.md

**File:** `HUONG_DAN_SU_DUNG.md` (root của repo)

### Khi có tính năng người dùng mới

Thêm section mới theo format:

```markdown
## <Tên tính năng>

### Truy cập
- Menu: **Admin → <Tên menu>** (url: `/admin/foo`)
- Quyền cần có: `foo:view` (xem), `foo:manage` (thêm/sửa/xóa)

### Cách sử dụng

**Xem danh sách:**
1. Vào **Admin → Foo**
2. Dùng ô tìm kiếm để lọc theo tên
3. Click vào hàng để xem chi tiết

**Thêm mới:**
1. Click nút **"+ Thêm"** (góc trên phải)
2. Điền thông tin: Tên (*), Mô tả
3. Click **"Lưu"**

**Chỉnh sửa:**
1. Click nút bút chì ở hàng cần sửa
2. Cập nhật thông tin
3. Click **"Lưu"**

**Xóa:**
1. Click nút thùng rác ở hàng cần xóa
2. Xác nhận trong hộp thoại

### Lưu ý
- Chỉ admin/manager mới có quyền thêm/sửa/xóa
- Không thể xóa foo đang được tham chiếu bởi ...
```

### Khi thay đổi luồng hiện có

Cập nhật section liên quan. Không xóa thông tin cũ trừ khi tính năng bị gỡ bỏ hoàn toàn.

---

## 3. database/schema.sql

**File:** `database/schema.sql`

### Khi thêm bảng mới

Thêm vào cuối file, sau comment phân loại phù hợp:

```sql
-- ─── Foo ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foo_name ON foo (name);
CREATE INDEX IF NOT EXISTS idx_foo_created_at ON foo (created_at DESC);
```

### Khi thêm cột vào bảng hiện có

Thêm cột vào định nghĩa bảng đúng chỗ trong `schema.sql`. Đảm bảo migration script dùng `ADD COLUMN IF NOT EXISTS`.

### Khi thêm permission mới

Thêm vào phần INSERT của `role_permissions` trong `schema.sql`:

```sql
-- foo permissions
INSERT INTO role_permissions (role, permission) VALUES
  ('superadmin', 'foo:view'), ('superadmin', 'foo:manage'),
  ('admin', 'foo:view'), ('admin', 'foo:manage'),
  ('manager', 'foo:view'), ('manager', 'foo:manage'),
  ('staff', 'foo:view')
ON CONFLICT DO NOTHING;
```

---

## 4. DEPLOYMENT_ENV.md

**File:** `DEPLOYMENT_ENV.md` (root của repo)

### Khi có env var mới

Thêm vào bảng đúng service (Backend hoặc Frontend):

```markdown
| Variable | Required | Example | Nơi lấy | Mô tả |
|----------|----------|---------|---------|-------|
| `NEW_SERVICE_KEY` | ✅ | `sk-...` | dashboard.newservice.com | API key cho tính năng X |
```

Thêm vào checklist cuối file:
```markdown
- [ ] `NEW_SERVICE_KEY` — Backend Vercel project
```

---

## 5. Swagger JSDoc (inline trong route files)

**Bắt buộc** cho mọi endpoint mới — không cần file riêng.

Kiểm tra: mở Swagger UI tại `/api/docs` sau khi deploy, endpoint mới có hiển thị không.

Format chuẩn:

```js
/**
 * @swagger
 * /api/foo:
 *   get:
 *     summary: Lấy danh sách foo
 *     tags: [Foo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Số item mỗi trang
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm kiếm theo tên
 *     responses:
 *       200:
 *         description: Danh sách foo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Foo' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
```

---

## Commit & Push

### Commit message format

```
<type>(<scope>): <short description in English>

[optional body — tiếng Việt ok nếu cần giải thích chi tiết]
```

**Types:**
| Type | Dùng khi |
|------|---------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `test` | Thêm/sửa test |
| `docs` | Cập nhật tài liệu |
| `refactor` | Refactor không thêm tính năng, không fix bug |
| `chore` | Config, dependencies, scripts |
| `perf` | Cải thiện hiệu năng |

**Scope:** tên module (`products`, `pos`, `settlements`, `auth`, `frontend`, `readme`, ...)

**Ví dụ tốt:**
```
feat(products): add bulk export to Excel

Thêm nút "Xuất Excel" trên trang Products, export tất cả sản phẩm theo filter hiện tại.
Dùng ExcelJS library.

feat(settlements): add batch settlement creation endpoint
fix(pos): prevent double submission on slow network
test(consignments): add 100% coverage for status transitions
docs(readme): update API endpoints and RBAC table
```

### Push

```bash
git add -A
git commit -m "feat(scope): description"
git push origin main
```

Nếu có conflict:
```bash
git pull --rebase origin main
# resolve conflicts
git push origin main
```

**Không dùng:**
- `git push --force` trừ khi được yêu cầu
- `git commit --amend` sau khi đã push
