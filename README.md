# H.U.N - Thanh Lý Ký Gửi

Clone của website [hunthanhlykygui.com](https://hunthanhlykygui.com/) — Chuỗi cửa hàng ký gửi thời trang bền vững tại Hà Nội.

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + React Router v6 |
| Backend  | Node.js + Express.js + JWT Auth |
| Database | PostgreSQL 16 |
| Deploy   | Docker + Docker Compose |

---

## Tính năng

### Dành cho khách hàng (Public)
| Trang | Mô tả |
|-------|-------|
| `/` | Trang chủ – giới thiệu dịch vụ, bảng phí |
| `/about` | Về H.U.N – lịch sử, 3 cơ sở |
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

| Giá bán | H.U.N nhận |
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
GET  /api/settlements/lookup?code=HUN-001  Tra cứu quyết toán
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

© 2026 H.U.N Thanh Lý Ký Gửi · Hà Nội
