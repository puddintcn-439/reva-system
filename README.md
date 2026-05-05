# REVA - Thanh Lý Ký Gửi

Website & hệ thống quản lý chuỗi cửa hàng ký gửi thời trang bền vững tại Hà Nội.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + React Router v6 + @tanstack/react-query v5 |
| Backend | Node.js + Express 4 + JWT (access 1h + refresh 30d rotating) |
| Database | PostgreSQL 16 (Supabase) |
| Storage | Supabase Storage (ảnh sản phẩm) |
| Logging | pino v9 + pino-http (JSON prod / pretty dev) |
| Error Tracking | Sentry (@sentry/node + @sentry/react) |
| Deploy | Vercel (monorepo — frontend + backend cùng domain) |
| Testing | Jest + Supertest (backend, 59 files / 359 tests) + Vitest + Testing Library (frontend) |

---

## Tính năng

### Dành cho khách hàng (Public)
| Trang | Mô tả |
|-------|-------|
| `/` | Trang chủ – giới thiệu dịch vụ, bảng phí |
| `/about` | Về REVA – lịch sử, 3 cơ sở |
| `/consign` | Ký gửi – đăng ký ký gửi trực tiếp/online |
| `/buy` | Thu mua – đăng ký thu mua |
| `/contact` | Tìm cửa hàng – địa chỉ, hotline, giờ mở cửa |
| `/sales` | Tra cứu quyết toán bằng mã khách hàng / SĐT |

### Dành cho quản trị (`/admin`)
| Trang | Chức năng |
|-------|-----------|
| Dashboard | Thống kê KPI + biểu đồ doanh thu + top khách |
| POS | Bán hàng quét mã/tìm kiếm, đa đơn, QR thanh toán, in biên lai |
| Lịch sử bán hàng | Xem + xác nhận + hoàn trả đơn hàng |
| Khách hàng mua | Danh sách + lịch sử giao dịch theo khách mua |
| Sản phẩm | CRUD sản phẩm, bulk import CSV, in nhãn mã vạch |
| Khách ký gửi | Quản lý consignors, thông tin ngân hàng, lịch sử |
| Yêu cầu ký gửi | Xét duyệt + email tự động |
| Thu mua | Quản lý yêu cầu thu mua |
| Quyết toán | Tạo / quyết toán hàng loạt, QR chuyển khoản |
| Cài đặt | Thông báo, chi nhánh, ngân hàng, hoa hồng, SMTP, CORS |
| Quản lý tài khoản | RBAC 8 vai trò, tạo/sửa/xóa user |

---

## Phân quyền (RBAC)

8 vai trò: `superadmin`, `admin`, `manager`, `staff`, `cashier`, `accountant`, `inventory`, `viewer`.  
Quyền lưu trong bảng `role_permissions` — có thể điều chỉnh trong DB. Chi tiết xem [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md#4-phân-quyền-người-dùng).

---

## Cấu trúc phí ký gửi (mặc định — có thể cấu hình trong Admin)

| Giá bán | REVA nhận |
|---------|-----------|
| Dưới 60k | 20.000đ / sản phẩm |
| 60k – 130k | 30.000đ / sản phẩm |
| Trên 130k | 25% |
| Không bán được | Không mất phí |

---

## Hướng dẫn chạy dự án

### Yêu cầu
- Node.js >= 18
- PostgreSQL >= 14 (local) **hoặc** Supabase account (production)

---

### Cách 1: Chạy với Docker Compose (Local dev)

```bash
git clone https://github.com/puddintcn-439/reva-system.git
cd reva-system
docker-compose up -d
```

Truy cập:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Admin**: http://localhost:5173/admin/login

---

### Cách 2: Chạy thủ công (Development)

#### 1. Tạo database

```sql
CREATE DATABASE hun_consignment;
```

#### 2. Chạy schema và seed

```bash
psql -U postgres -d hun_consignment -f database/schema.sql
psql -U postgres -d hun_consignment -f database/seed.sql
```

#### 3. Cấu hình Backend

```bash
cd backend
cp .env.example .env
# Sửa: DATABASE_URL hoặc DB_*, JWT_SECRET (min 32 chars)
npm install
npm run dev
```

#### 4. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Cách 3: Deploy lên Vercel (Production)

Dự án dùng **monorepo** — một Vercel project phục vụ cả frontend và backend:

```
/ → frontend (Vite)
/api → backend (Express)
```

1. Import repo lên Vercel
2. Cấu hình Environment Variables (xem [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md))
3. Vercel tự build và deploy khi push lên `main`

---

## API Endpoints

### Public
```
GET  /api/announcements                      Thông báo ticker
GET  /api/locations                          Danh sách cơ sở
GET  /api/products                           Danh sách sản phẩm
GET  /api/products/categories                Danh mục
GET  /api/settlements/lookup?code=HUN-XXXXX  Tra cứu quyết toán
POST /api/consignments                       Gửi yêu cầu ký gửi
POST /api/purchases                          Gửi yêu cầu thu mua
```

### Auth
```
POST /api/auth/login      Đăng nhập → access token (1h) + refresh token (30d)
POST /api/auth/refresh    Làm mới access token bằng refresh token (rotating)
POST /api/auth/logout     Thu hồi refresh token
GET  /api/auth/me         Thông tin tài khoản hiện tại
```

### Admin (Bearer JWT Required)
```
# Products
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
POST   /api/upload/image   Upload ảnh sản phẩm lên Supabase Storage

# Consignors
GET  /api/consignors
GET  /api/consignors/:id

# Consignments
GET   /api/consignments
PATCH /api/consignments/:id/status

# Settlements
GET   /api/settlements
POST  /api/settlements
PATCH /api/settlements/:id/pay

# Purchases
GET   /api/purchases
PATCH /api/purchases/:id/status

# POS
POST /api/pos/sales          Tạo đơn hàng
GET  /api/pos/sales          Lịch sử bán hàng
POST /api/pos/refunds        Tạo hoàn trả

# Banks
GET  /api/banks
POST /api/banks

# System Settings
GET  /api/system-settings
PUT  /api/system-settings

# Dashboard
GET /api/consignors/stats    KPI tổng quan
```

Xem API docs đầy đủ tại `/api/docs` (Swagger UI).

---

## Testing

```bash
# Backend (Jest + Supertest)
cd backend
npm test              # chạy tất cả tests
npm run test:ci       # với coverage report

# Frontend (Vitest + Testing Library)
cd frontend
npm test              # chạy một lần
npm run test:watch    # watch mode
npm run test:coverage # với coverage report
```

---

## Cấu trúc thư mục

```
reva-system/
├── backend/
│   ├── instrument.js              Sentry init (loaded first in server.js)
│   ├── server.js                  Entry point
│   ├── src/
│   │   ├── app.js                 Express app — middleware, routes
│   │   ├── config/
│   │   │   ├── database.js        PostgreSQL pool (Supabase / local)
│   │   │   ├── email.js           Nodemailer + template engine
│   │   │   ├── logger.js          Pino logger
│   │   │   ├── swagger.js         Swagger spec
│   │   │   └── systemSettings.js  DB-backed config cache
│   │   ├── controllers/           Business logic
│   │   ├── middleware/
│   │   │   ├── auth.js            JWT verify + RBAC
│   │   │   ├── audit.js           Audit log middleware
│   │   │   └── errorHandler.js    Central error handler
│   │   ├── routes/                Express routers
│   │   └── scripts/               DB migrations (migrate-all.js, seed.js)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── instrument.js          Sentry init (first import in main.jsx)
│   │   ├── main.jsx               React entry point
│   │   ├── App.jsx                Routes
│   │   ├── components/Layout/     Navbar, Footer, Ticker, AdminLayout
│   │   ├── context/AuthContext    JWT + refresh token auth state
│   │   ├── pages/                 Public pages (Home, About, Consign, Buy, Contact, Sales)
│   │   ├── pages/Admin/           Dashboard, POS, Products, Consignments, etc.
│   │   ├── services/api.js        Axios client + token refresh interceptor
│   │   ├── utils/                 format.js, receipt.js, escpos.js
│   │   └── __tests__/             Vitest test files
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── database/
│   ├── schema.sql                 Tất cả bảng, index, trigger, RLS
│   └── seed.sql                   Dữ liệu mẫu
├── vercel.json                    Monorepo config (experimentalServices)
├── DEPLOYMENT_ENV.md              Hướng dẫn env vars
├── HUONG_DAN_SU_DUNG.md          Hướng dẫn vận hành
└── docker-compose.yml
```

---

© 2026 REVA Thanh Lý Ký Gửi · Hà Nội


---

## Tính năng

### Dành cho khách hàng (Public)
| Trang | Mô tả |
|-------|-------|
| `/` | Trang chủ – giới thiệu dịch vụ, bảng phí |
| `/about` | Về REVA – lịch sử, 3 cơ sở |
| `/consign` | Ký gửi – đăng ký ký gửi trực tiếp/online |
| `/buy` | Thu mua – đăng ký thu mua |
| `/contact` | Tìm cửa hàng – địa chỉ, hotline, giờ mở cửa |
| `/sales` | Tra cứu quyết toán bằng mã khách hàng |

### Dành cho quản trị (`/admin`)
| Trang | Chức năng |
|-------|-----------|
| Dashboard | Thống kê tổng quan |
| Sản phẩm | Thêm/sửa/xóa sản phẩm, tính phí tự động |
| Yêu cầu ký gửi | Xem và xử lý yêu cầu từ khách |
| Khách hàng | Quản lý danh sách, xem lịch sử |
| Quyết toán | Tạo và xuất quyết toán, đánh dấu đã trả |
| Thu mua | Quản lý yêu cầu thu mua |
| Cài đặt | Thông báo ticker, cơ sở, đổi mật khẩu |

---

## Cấu trúc phí ký gửi

| Giá bán | REVA nhận |
|---------|-----------|
| Dưới 60k | 20.000đ / sản phẩm |
| 60k – 130k | 30.000đ / sản phẩm |
| Trên 130k | 25% |
| Không bán được | Không mất phí |

---

## Hướng dẫn chạy dự án

### Yêu cầu
- Node.js >= 18
- PostgreSQL >= 14 (hoặc Docker)

---

### Cách 1: Chạy với Docker Compose (Khuyên dùng)

```bash
# Clone project
cd C:\Projects\clothing-consignment

# Khởi động toàn bộ hệ thống
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

Truy cập:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Admin**: http://localhost:5173/admin/login

---

### Cách 2: Chạy thủ công (Development)

#### 1. Cài đặt PostgreSQL và tạo database

```sql
CREATE DATABASE hun_consignment;
```

#### 2. Chạy schema và seed

```bash
psql -U postgres -d hun_consignment -f database/schema.sql
psql -U postgres -d hun_consignment -f database/seed.sql
```

#### 3. Cấu hình Backend

```bash
cd backend
cp .env.example .env
# Sửa file .env: DB_PASSWORD, JWT_SECRET
npm install
npm run dev
```

Backend chạy tại `http://localhost:5000`

#### 4. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`

---

## Tài khoản mặc định

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Staff | `staff1` | `Admin@123` |

> ⚠️ **Đổi mật khẩu ngay sau khi đăng nhập lần đầu!**

---

## API Endpoints

### Public
```
GET  /api/announcements          Thông báo ticker
GET  /api/locations              Danh sách cơ sở
GET  /api/products               Danh sách sản phẩm
GET  /api/products/categories    Danh mục
GET  /api/settlements/lookup?code=REVA-001  Tra cứu quyết toán
POST /api/consignments           Gửi yêu cầu ký gửi
POST /api/purchases              Gửi yêu cầu thu mua
```

### Admin (JWT Required)
```
POST /api/auth/login             Đăng nhập
GET  /api/auth/me                Thông tin tài khoản

GET  /api/products               Quản lý sản phẩm
POST /api/products
PUT  /api/products/:id
DEL  /api/products/:id

GET  /api/consignors             Quản lý khách hàng
GET  /api/consignors/:id

GET  /api/consignments           Quản lý yêu cầu ký gửi
PATCH /api/consignments/:id/status

GET  /api/settlements            Quản lý quyết toán
POST /api/settlements
PATCH /api/settlements/:id/pay

GET  /api/purchases              Quản lý thu mua
PATCH /api/purchases/:id/status

GET  /api/consignors/stats       Thống kê dashboard

GET  /api/reports/export/financial?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD  Xuất báo cáo tài chính (.xlsx)
GET  /api/reports/export/inventory?status=active&category_id=UUID            Xuất tồn kho (.xlsx)

POST /api/ai/suggest-product     AI gợi ý giá bán + mô tả sản phẩm (yêu cầu GEMINI_API_KEY)
POST /api/ai/analyze-dashboard   AI nhận xét số liệu kinh doanh Dashboard

GET    /api/inbox/threads                   Danh sách hội thoại nội bộ
POST   /api/inbox/threads                   Tạo hội thoại mới
GET    /api/inbox/threads/:id/messages      Lấy tin nhắn trong hội thoại
POST   /api/inbox/threads/:id/messages      Gửi tin nhắn
PATCH  /api/inbox/threads/:id/close         Đóng hội thoại (inbox:manage)
PATCH  /api/inbox/threads/:id/reopen        Mở lại hội thoại (inbox:manage)
DELETE /api/inbox/threads/:id               Xóa hội thoại (inbox:manage)
DELETE /api/inbox/messages/:id              Xóa tin nhắn (chủ tin hoặc inbox:manage)
```

---

## Cấu trúc thư mục

```
clothing-consignment/
├── backend/
│   ├── src/
│   │   ├── app.js                 Express app setup
│   │   ├── config/database.js     PostgreSQL pool
│   │   ├── controllers/           Business logic
│   │   ├── middleware/            Auth + Error handling
│   │   ├── routes/                API routes
│   │   └── scripts/               migrate.js, seed.js
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                Routes
│   │   ├── components/Layout/     Navbar, Footer, Ticker, AdminLayout
│   │   ├── context/AuthContext    JWT auth state
│   │   ├── pages/                 Home, About, Consign, Buy, Contact, Sales
│   │   ├── pages/Admin/           Dashboard, Products, Consignments, etc.
│   │   └── services/api.js        Axios API client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── database/
│   ├── schema.sql                 Tất cả bảng, index, trigger
│   └── seed.sql                   Dữ liệu mẫu
├── docker-compose.yml
└── README.md
```

---

© 2026 REVA Thanh Lý Ký Gửi · Hà Nội
