# REVA Coding Rules

Áp dụng cho toàn bộ code trong `reva-system/`. Mọi tính năng mới phải tuân thủ.

---

## Backend (Node.js / Express)

### Cấu trúc file

```
backend/src/
├── controllers/<name>Controller.js   # Business logic, không có SQL raw ngoài đây
├── routes/<name>.js                  # Express router + swagger JSDoc + validation
├── middleware/                        # Chỉ cross-cutting concerns
└── config/                            # Không thêm config file mới trừ khi thực sự cần
```

**Quy tắc:**
- Mỗi controller export các function thuần (không export class)
- Routes chỉ chứa middleware chain, validation, swagger docs — không có logic
- Không đặt SQL trong routes hay middleware

### Controller pattern

```js
// ✅ Đúng
const getFoo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM foo WHERE id = $1', [id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err); // LUÔN dùng next(err), không bao giờ res.status(500) thủ công
  }
};
module.exports = { getFoo };

// ❌ Sai — không bao giờ làm
const getFoo = async (req, res) => {
  const result = await db.query(...); // không có try/catch
  res.json(result);                   // không có success wrapper
};
```

### Response format chuẩn

```js
// Success
res.json({ success: true, data: <payload> })
res.json({ success: true, data: <payload>, total: <n>, page: <n> }) // paginated

// Created
res.status(201).json({ success: true, data: <newItem> })

// Error — để errorHandler xử lý
const err = new Error('Thông báo lỗi tiếng Việt');
err.statusCode = 400; // hoặc 404, 409, 422...
return next(err);

// Hoặc dùng createError từ errorHandler
const { createError } = require('../middleware/errorHandler');
return next(createError('Không tìm thấy sản phẩm', 404));
```

### Validation (express-validator)

```js
// Route file — validation middleware trước handler
router.post('/foo', [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('price').isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
  body('status').optional().isIn(['active', 'pending']).withMessage('Trạng thái không hợp lệ'),
], authenticate, requirePermission('foo:manage'), createFoo);

// Controller — kiểm tra kết quả validation
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ success: false, errors: errors.array() });
}
```

### Auth & Permission

```js
// Public route (không cần login)
router.get('/foo/public', getFooPublic);

// Cần login
router.get('/foo', authenticate, getFoo);

// Cần login + permission cụ thể
router.post('/foo', authenticate, requirePermission('foo:manage'), createFoo);
router.delete('/foo/:id', authenticate, requirePermission('foo:manage'), audit('DELETE_FOO'), deleteFoo);

// Audit log cho destructive operations (tạo/sửa/xóa data quan trọng)
router.patch('/foo/:id', authenticate, requirePermission('foo:manage'), audit('UPDATE_FOO'), updateFoo);
```

**Danh sách permissions hiện có (bảng `role_permissions`):**
`dashboard:view`, `products:view`, `products:manage`, `consignors:view`, `consignors:manage`,
`consignments:view`, `consignments:manage`, `settlements:view`, `settlements:manage`,
`purchases:view`, `purchases:manage`, `pos:sale`, `pos:history`, `settings:manage`, `users:manage`

Tính năng mới: chọn permission gần nhất hoặc thêm permission mới vào migration.

### Swagger JSDoc

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
 *     responses:
 *       200:
 *         description: Danh sách foo
 *       401:
 *         description: Chưa xác thực
 */
router.get('/foo', authenticate, getFoo);
```

### Database

```js
// Luôn dùng parameterized query — KHÔNG string interpolation
db.query('SELECT * FROM foo WHERE id = $1 AND status = $2', [id, status]); // ✅
db.query(`SELECT * FROM foo WHERE id = '${id}'`);                          // ❌ SQL injection

// Transaction khi cần atomic operations
const client = await db.getClient();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('UPDATE ...', [...]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}

// Paginated queries — pattern chuẩn
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 20;
const offset = (page - 1) * limit;
// ... build query ...
params.push(limit, offset);
const result = await db.query(`... LIMIT $${idx} OFFSET $${idx + 1}`, params);
```

### DB Migration

Khi cần thêm bảng/cột:
1. Thêm vào `backend/src/scripts/migrate-all.js` (idempotent với `IF NOT EXISTS` / `IF NOT EXISTS`)
2. Thêm vào `database/schema.sql` (source of truth)

```js
// migrate-all.js pattern
await db.query(`
  CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);
// Thêm cột idempotent:
await db.query(`
  ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_col VARCHAR(100)
`);
```

### Logging

```js
const logger = require('../config/logger');

logger.info({ userId: req.user?.id }, 'Mô tả sự kiện');
logger.warn({ field: value }, 'Cảnh báo');
logger.error({ err: { message: err.message, stack: err.stack } }, 'Lỗi');

// KHÔNG dùng console.log / console.error trong production code
```

---

## Frontend (React / Vite)

### Cấu trúc file

```
frontend/src/
├── pages/Admin/<FeatureName>.jsx     # Admin feature page
├── pages/<PublicPage>.jsx            # Public page
├── components/<ComponentName>.jsx    # Shared component
├── services/api.js                   # Thêm API call vào đây (không tạo file mới)
└── utils/                            # Pure functions, không có side effects
```

### API Service pattern

```js
// services/api.js — thêm function mới vào đây
export const getFoos = (params) => api.get('/foo', { params }).then(r => r.data);
export const createFoo = (data) => api.post('/foo', data).then(r => r.data);
export const updateFoo = (id, data) => api.put(`/foo/${id}`, data).then(r => r.data);
export const deleteFoo = (id) => api.delete(`/foo/${id}`).then(r => r.data);
```

### Data fetching (React Query)

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFoos, createFoo } from '../../services/api'
import toast from 'react-hot-toast'

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['foos', filters],
  queryFn: () => getFoos(filters),
})

// Mutation
const queryClient = useQueryClient()
const createMut = useMutation({
  mutationFn: createFoo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['foos'] })
    toast.success('Tạo thành công')
    setShowModal(false)
  },
  onError: (err) => toast.error(err.response?.data?.message || 'Lỗi tạo mới'),
})
```

### Permission check trong UI

```jsx
import { useAuth } from '../../context/AuthContext'

const { can } = useAuth()

// Ẩn element nếu không có quyền
{can('foo:manage') && <button onClick={handleCreate}>+ Thêm mới</button>}

// Guard cả page
if (!can('foo:view')) return <Navigate to="/admin/dashboard" replace />
```

### Component pattern

```jsx
// Standard admin page shell
export default function FooPage() {
  const { can } = useAuth()

  // Guards
  if (!can('foo:view')) return <Navigate to="/admin/dashboard" replace />

  // State
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Data
  const { data, isLoading } = useQuery({ queryKey: ['foos'], queryFn: getFoos })

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Đang tải...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-hun-black">Tiêu đề trang</h1>
        {can('foo:manage') && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Thêm</button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* ... */}
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && <FooModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
```

### Styling conventions

- Dùng **Tailwind CSS** — không viết inline style trừ dynamic values
- Color tokens: `hun-black`, `hun-brown`, `hun-cream`, `hun-beige`
- Button primary: `className="btn-primary"` (đã định nghĩa trong index.css)
- Tất cả table phải có wrapper `<div className="overflow-x-auto">`
- Text người dùng thấy: **tiếng Việt**

### Route registration

```jsx
// App.jsx — thêm vào đúng section
const FooPage = lazy(() => import('./pages/Admin/FooPage'))

// Trong Routes
<Route path="/admin/foo" element={<PrivateRoute><FooPage /></PrivateRoute>} />
```

### NavLink (nếu cần hiển thị trong sidebar)

```js
// AdminLayout.jsx — thêm vào mảng NAV
{ to: '/admin/foo', icon: SomeIcon, label: 'Tên hiển thị', permission: 'foo:view' },
```

---

## Ngôn ngữ & Nội dung

| Ngữ cảnh | Ngôn ngữ |
|----------|----------|
| Error/success messages trả về client | **Tiếng Việt** |
| Log messages (pino) | Tiếng Anh |
| Code comments | Tiếng Anh |
| UI labels, placeholder, toast | **Tiếng Việt** |
| Commit messages | Tiếng Anh |
| API docs (Swagger) | Tiếng Việt (summary) |
