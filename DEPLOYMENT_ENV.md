# Deployment Environment Variables

Dự án dùng kiến trúc **Vercel monorepo** — một project, một domain, hai services:

```
/ → frontend (Vite, build từ thư mục frontend/)
/api → backend (Express, serverless từ thư mục backend/)
```

Cấu hình trong `vercel.json` (root) sử dụng `experimentalServices`.  
Toàn bộ env vars đặt trong **một Vercel project duy nhất** (Production & Preview).

---

## Env vars bắt buộc

| Var | Mô tả | Nơi lấy |
|-----|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase → Project Settings → Database → **Transaction Pooler** (port **6543**) → Connection string |
| `JWT_SECRET` | Ký JWT; tối thiểu 32 ký tự | Tự sinh: `openssl rand -hex 32` |
| `NODE_ENV` | `production` | Set cố định |
| `CLIENT_URL` | Frontend URL (CORS allowed origin) | URL của Vercel project, VD: `https://reva-system-seven.vercel.app` |
| `SUPABASE_URL` | Supabase project URL | Supabase → Project Settings → API → **Project URL** |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypass RLS) | Supabase → Project Settings → API → **service_role** secret key |
| `SUPABASE_BUCKET` | Tên bucket Storage chứa ảnh | Tự đặt khi tạo bucket, thường `products` (phải set **Public**) |

## Env vars khuyến nghị

| Var | Mô tả | Nơi lấy |
|-----|--------|---------|
| `SENTRY_DSN` | Error tracking backend | sentry.io → project **node** → Settings → **Client Keys (DSN)** |
| `VITE_SENTRY_DSN` | Error tracking frontend (React + Session Replay) | sentry.io → project **javascript** → Settings → **Client Keys (DSN)** |
| `GEMINI_API_KEY` | Google Gemini AI — gợi ý giá SP, phân tích Dashboard | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier: 15 RPM) |

## Env vars tùy chọn

| Var | Mặc định | Mô tả |
|-----|----------|-------|
| `JWT_ACCESS_EXPIRES_IN` | `1h` | Thời hạn access token |
| `SMTP_HOST` | — | SMTP server. Nếu không set, cấu hình được trong Admin UI → Settings |
| `SMTP_PORT` | `587` | SMTP port (465 cho SSL, 587 cho TLS) |
| `SMTP_SECURE` | `false` | `true` nếu dùng port 465 |
| `SMTP_USER` | — | SMTP username / email |
| `SMTP_PASS` | — | SMTP password (Gmail: dùng **App Password**, không phải mật khẩu thường) |
| `SMTP_FROM` | `REVA <noreply@reva.vn>` | From address |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Pino log level |

> **SMTP note:** Nếu không set env vars SMTP, email vẫn có thể cấu hình qua Admin UI → Cài đặt → Hệ thống (lưu trong bảng `system_settings`). Env vars chỉ là fallback khi DB chưa sẵn sàng.

---

## Checklist nhanh khi tạo Vercel project mới

- [ ] `DATABASE_URL` — Transaction pooler Supabase, port 6543
- [ ] `JWT_SECRET` — min 32 chars (`openssl rand -hex 32`)
- [ ] `NODE_ENV` = `production`
- [ ] `CLIENT_URL` — URL frontend (domain Vercel)
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` + `SUPABASE_BUCKET`
- [ ] `SENTRY_DSN` — project `node`
- [ ] `VITE_SENTRY_DSN` — project `javascript`
- [ ] `GEMINI_API_KEY` — lấy tại aistudio.google.com/apikey (tùy chọn, bật tính năng AI)
- [ ] SMTP_* (nếu muốn email hoạt động ngay, không set trong Admin UI)

---

## Lưu ý bảo mật

- **Không commit** bất kỳ giá trị secret nào vào repo. Dùng Vercel / Docker secrets.
- `JWT_SECRET` bắt buộc trong production — server **fail-fast** nếu thiếu hoặc ngắn hơn 32 ký tự.
- `SUPABASE_SERVICE_KEY` có quyền bypass RLS — giữ bí mật, chỉ dùng ở backend.
- DSN Sentry là public (an toàn để đặt trong source code frontend), nhưng vẫn nên đặt qua env var để dễ quản lý.

---

## Sinh JWT_SECRET

```bash
openssl rand -hex 32
# hoặc
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

