# Production Readiness Checklist — REVA

Mỗi item có: mô tả, cách verify, weight (điểm), và priority.

---

## 🔒 Security (Max: 15 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| S1 | JWT auth trên mọi admin route | `grep -r "authenticate" src/routes/` — tất cả file route phải có | 2 | Critical |
| S2 | Input validation với express-validator trên mọi endpoint nhận body | `grep -r "validationResult" src/controllers/` — mọi controller POST/PUT phải dùng | 2 | Critical |
| S3 | Parameterized SQL (không string concat) | Không có `db.query(\`SELECT ... ${variable}\`)` trong controllers | 2 | Critical |
| S4 | CORS config chỉ allow domain cụ thể (không `*`) | Đọc `src/app.js` — origin phải là whitelist, không phải `*` trong prod | 2 | Critical |
| S5 | Helmet.js hoặc security headers | `grep -r "helmet" src/` — phải được dùng | 1 | Important |
| S6 | Rate limiting trên authentication endpoints | Đọc `src/routes/auth.js` — phải có rate limiter | 1 | Important |
| S7 | Env vars không hardcode trong code | `grep -r "password\|secret\|api_key" src/` (case insensitive) — không có giá trị thật | 2 | Critical |
| S8 | `.env` trong `.gitignore`, `.env.example` tồn tại | `cat .gitignore \| grep .env` và `ls .env.example` | 1 | Critical |
| S9 | Audit log cho sensitive operations | Xem `src/middleware/audit.js` — ghi log create/update/delete | 1 | Important |
| S10 | XSS: sanitize HTML output nếu có rich text | Kiểm tra nếu có trường lưu HTML; nếu không → auto pass | 1 | Nice-to-have |

---

## 🧪 Testing (Max: 10 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| T1 | Backend unit tests tồn tại | `ls backend/src/**/__tests__/` — phải có file test | 1 | Critical |
| T2 | Backend coverage ≥ 70% lines | `cat backend/coverage/clover.xml` — xem `lines-valid` vs `lines-covered` | 3 | Critical |
| T3 | Controllers chính có test (auth, settlement, product) | Đọc `src/controllers/__tests__/` — phải có test cho 3 controller này | 2 | Critical |
| T4 | Frontend component tests tồn tại | `ls frontend/src/__tests__/` hoặc `**/__tests__/` — phải có | 1 | Important |
| T5 | Happy path + error path được test (không chỉ happy path) | Đọc test files — phải có test cho case 400/401/403/500 | 2 | Important |
| T6 | E2E tests (Playwright hoặc Cypress) | `ls frontend/e2e/` hoặc `ls frontend/cypress/` | 1 | Nice-to-have |

---

## 🏗️ Infrastructure (Max: 12 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| I1 | Docker + docker-compose hoạt động | `docker-compose.yml` tồn tại và có service backend + frontend + db | 2 | Critical |
| I2 | Backend Dockerfile dùng non-root user | `cat backend/Dockerfile` — phải có `USER node` hoặc tương đương | 1 | Important |
| I3 | Frontend Dockerfile dùng nginx + build multi-stage | `cat frontend/Dockerfile` — phải có `FROM node AS build` + `FROM nginx` | 1 | Important |
| I4 | Tất cả env vars được document | `cat backend/.env.example` — phải có đủ keys | 2 | Critical |
| I5 | DB schema migration có versioning | `ls database/migrations/` hoặc schema.sql có comments version | 1 | Important |
| I6 | Health check endpoint | `grep -r "health\|healthz\|ping" src/routes/` | 1 | Important |
| I7 | Graceful shutdown xử lý SIGTERM | `grep -r "SIGTERM\|graceful" server.js` | 1 | Important |
| I8 | NODE_ENV=production trong prod Docker | `grep -r "NODE_ENV" docker-compose.yml` | 1 | Critical |
| I9 | Không expose debug endpoints trong prod | Không có `/debug`, `/test`, `/dev` routes trong prod | 1 | Critical |
| I10 | Reverse proxy (nginx) cấu hình đúng | `cat frontend/nginx.conf` — có proxy_pass đến backend + gzip + caching header | 1 | Important |

---

## 📊 Monitoring & Observability (Max: 8 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| M1 | Structured logging (Winston/Pino) | `cat src/config/logger.js` — phải có JSON format cho prod | 1 | Important |
| M2 | Error tracking (Sentry) setup backend | `cat backend/instrument.js` — phải có Sentry init | 2 | Important |
| M3 | Error tracking (Sentry) setup frontend | `cat frontend/src/instrument.js` — phải có Sentry init | 1 | Important |
| M4 | Unhandled promise rejection caught | `grep -r "unhandledRejection" server.js` | 1 | Important |
| M5 | Request logging (HTTP access log) | `grep -r "morgan\|httpLogger" src/app.js` | 1 | Nice-to-have |
| M6 | Uptime monitoring configured (UptimeRobot, BetterUptime...) | External config, hỏi user | 1 | Nice-to-have |
| M7 | Alert khi error rate tăng đột biến | Sentry alert rules, hỏi user | 1 | Nice-to-have |

---

## ⚡ Performance (Max: 8 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| P1 | DB indexes trên FK và cột filter thường dùng | `cat database/schema.sql` — phải có `CREATE INDEX` trên consignor_id, status, etc. | 2 | Important |
| P2 | N+1 query không tồn tại trong controllers | Review các controller có vòng lặp gọi DB | 2 | Important |
| P3 | AI response caching | `cat src/lib/aiCache.js` — phải tồn tại và dùng trong aiController | 1 | Important |
| P4 | Frontend: lazy loading routes | `grep -r "lazy\|React.lazy\|Suspense" frontend/src/` | 1 | Nice-to-have |
| P5 | Frontend: build production được optimize (no source maps) | `cat frontend/vite.config.js` — build config | 1 | Important |
| P6 | Large list pagination (không load all records) | Các endpoint trả list phải có LIMIT/OFFSET hoặc cursor | 1 | Important |

---

## 🎨 Frontend UX (Max: 7 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| F1 | Loading states trên tất cả async operations | Random sampling 3 page files — phải có loading indicator | 1 | Important |
| F2 | Error states (boundary hoặc inline error display) | `grep -r "ErrorBoundary\|error &&\|isError" frontend/src/` | 1 | Important |
| F3 | 404 page tồn tại | `grep -r "404\|NotFound" frontend/src/App.jsx` | 1 | Important |
| F4 | Mobile responsive (Tailwind breakpoints dùng đúng) | Sampling CSS classes — có `sm:`, `md:`, `lg:` | 1 | Important |
| F5 | Form validation feedback rõ ràng (không chỉ alert) | Sampling form components — phải show inline error | 1 | Nice-to-have |
| F6 | Empty states cho list/table (không blank trắng) | Sampling table components — phải có "Không có dữ liệu" | 1 | Nice-to-have |
| F7 | Console.log không còn trong production code | `grep -r "console.log" frontend/src/` — phải sạch | 1 | Important |

---

## 📄 Documentation (Max: 5 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| D1 | README có hướng dẫn setup local | `cat README.md` — phải có install + run steps | 1 | Important |
| D2 | Swagger/OpenAPI docs cho tất cả endpoints | `cat src/config/swagger.js` — phải cover hết routes | 2 | Important |
| D3 | `.env.example` đầy đủ | `cat backend/.env.example` — đủ keys | 1 | Critical |
| D4 | Deployment guide (DEPLOYMENT_ENV.md) | File tồn tại và có nội dung | 1 | Important |

---

## 🗄️ Data & Database (Max: 5 điểm)

| # | Item | Verify | Weight | Priority |
|---|------|--------|--------|----------|
| DB1 | DB backup procedure documented/automated | Hỏi user hoặc `ls scripts/backup*` | 2 | Critical |
| DB2 | Seed data chỉ chạy trong dev/staging (không prod) | `cat database/seed.sql` — phải có guard hoặc documented | 1 | Important |
| DB3 | DB connection pool configured | `cat src/config/database.js` — phải có pool config | 1 | Important |
| DB4 | Sensitive data (PII) không log ra | `grep -r "console.log\|logger" src/` — không log password/phone đầy đủ | 1 | Important |
