# Testing Guide

Hướng dẫn viết test cho REVA. Target: **100% coverage** trên tất cả code mới.

---

## Backend Testing (Jest + Supertest)

### Setup

```bash
cd backend
npm run test:ci          # jest --coverage --runInBand (CI mode)
npm test                 # jest --watch (dev mode)
npm run test:coverage    # jest --coverage
```

Config: `backend/jest.config.js` (hoặc `package.json` > `jest`)

### File locations

```
backend/src/
├── controllers/__tests__/fooController.test.js          # happy path
├── controllers/__tests__/fooController.extra.test.js    # edge cases, error paths
├── routes/__tests__/foo.test.js                         # integration với supertest
├── middleware/__tests__/auth.test.js                    # middleware unit test
└── config/__tests__/systemSettings.test.js             # config unit test
```

**Naming convention:**
- `<module>.test.js` — happy path + main scenarios
- `<module>.extra.test.js` — error propagation, edge cases, boundary conditions
- `<module>.more.test.js` — additional coverage cho complex modules

### Mocking Database

```js
// Pattern 1: jest.mock (dùng khi không cần thay đổi giữa các test)
jest.mock('../../config/database');
const db = require('../../config/database');

describe('FooController', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getFoos returns list', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Foo' }], rowCount: 1 });
    
    const req = { query: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    const next = jest.fn();
    
    await getFoos(req, res, next);
    
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
    expect(next).not.toHaveBeenCalled();
  });

  test('getFoos propagates db error', async () => {
    db.query.mockRejectedValueOnce(new Error('db fail'));
    
    const next = jest.fn();
    await getFoos({ query: {} }, { json: jest.fn(), status: jest.fn().mockReturnThis() }, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// Pattern 2: jest.doMock với jest.resetModules (dùng khi cần mock khác nhau per test)
describe('FooController - edge cases', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getFoo returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { getFoo } = require('../fooController');
    
    const next = jest.fn();
    await getFoo({ params: { id: '999' } }, makeRes(), next);
    
    // Expect either 404 response or next called with error
    expect(next).toHaveBeenCalled(); // or check res.status(404)
  });
});
```

### Mocking systemSettings

```js
jest.mock('../../config/systemSettings', () => ({
  getCommissionTiers: jest.fn().mockResolvedValue([
    { min_price: 0, max_price: 500000, rate: 0.30 },
    { min_price: 500001, max_price: null, rate: 0.25 },
  ]),
  getSetting: jest.fn().mockResolvedValue('value'),
}));
```

### Mocking UUID

```js
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));
```

### Mocking Auth Middleware (cho route integration tests)

```js
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', username: 'admin', role: 'admin' };
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
  audit: () => (_req, _res, next) => next(),
}));
```

### Route Integration Test (Supertest)

```js
const request = require('supertest');
const app = require('../../app');

jest.mock('../../config/database');
const db = require('../../config/database');
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => { req.user = { id: '1', role: 'admin' }; next(); },
  requirePermission: () => (_req, _res, next) => next(),
  audit: () => (_req, _res, next) => next(),
}));

describe('GET /api/foo', () => {
  test('returns list with 200', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
    
    const res = await request(app).get('/api/foo');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 401 without token', async () => {
    // Unmock authenticate for this test
    // ... hoặc test route thực sự cần auth
  });
});
```

### Controller Test Coverage Checklist

Mỗi controller function cần test:
- [ ] Happy path (dữ liệu hợp lệ, tìm thấy)
- [ ] Not found (404 case)
- [ ] Validation error (400 case nếu có express-validator)
- [ ] DB error propagation → `next(error)` được gọi
- [ ] Edge case: empty list, null values, boundary conditions
- [ ] Pagination: tính toán offset đúng không?
- [ ] Transaction rollback khi lỗi giữa chừng (nếu dùng transaction)

---

## Frontend Testing (Vitest + Testing Library)

### Setup

```bash
cd frontend
npm run test             # vitest --watch
npm run test:coverage    # vitest --coverage
npm run test:run         # vitest run (CI mode)
```

Config: `frontend/vite.config.js` (test section với jsdom environment)

### File locations

```
frontend/src/
├── __tests__/
│   ├── ComponentName.test.jsx     # Component tests
│   └── utilName.test.js           # Utility function tests
└── pages/Admin/__tests__/         # Nếu page tests phức tạp
```

### Basic Component Test

```jsx
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock API service
vi.mock('../services/api', () => ({
  getFoos: vi.fn(),
  createFoo: vi.fn(),
  deleteFoo: vi.fn(),
}))

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'admin', role: 'admin' },
    can: vi.fn(() => true),
  })),
}))

import { getFoos } from '../services/api'

// Test wrapper với providers
function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FooPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading state', () => {
    getFoos.mockReturnValue(new Promise(() => {})) // never resolves
    render(<FooPage />, { wrapper })
    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  test('renders list when data loads', async () => {
    getFoos.mockResolvedValue({ data: [{ id: 1, name: 'Test Foo' }], total: 1 })
    render(<FooPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('Test Foo')).toBeInTheDocument())
  })

  test('renders empty state', async () => {
    getFoos.mockResolvedValue({ data: [], total: 0 })
    render(<FooPage />, { wrapper })
    await waitFor(() => expect(screen.getByText(/chưa có dữ liệu/i)).toBeInTheDocument())
  })

  test('create button visible with permission', async () => {
    getFoos.mockResolvedValue({ data: [], total: 0 })
    render(<FooPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('+ Thêm')).toBeInTheDocument())
  })

  test('handles API error gracefully', async () => {
    getFoos.mockRejectedValue(new Error('Network error'))
    render(<FooPage />, { wrapper })
    await waitFor(() => expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument())
  })
})
```

### User Interaction Test

```jsx
test('can open and close modal', async () => {
  const user = userEvent.setup()
  getFoos.mockResolvedValue({ data: [], total: 0 })
  render(<FooPage />, { wrapper })
  
  await waitFor(() => screen.getByText('+ Thêm'))
  await user.click(screen.getByText('+ Thêm'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  
  await user.click(screen.getByLabelText('Đóng'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('submit form creates item', async () => {
  const user = userEvent.setup()
  const { createFoo } = await import('../services/api')
  createFoo.mockResolvedValue({ success: true, data: { id: 2, name: 'New Foo' } })
  getFoos.mockResolvedValue({ data: [], total: 0 })
  
  render(<FooPage />, { wrapper })
  await waitFor(() => screen.getByText('+ Thêm'))
  await user.click(screen.getByText('+ Thêm'))
  
  await user.type(screen.getByLabelText('Tên'), 'New Foo')
  await user.click(screen.getByRole('button', { name: 'Lưu' }))
  
  await waitFor(() => expect(createFoo).toHaveBeenCalledWith({ name: 'New Foo' }))
})
```

### Utility Function Test

```js
import { describe, test, expect } from 'vitest'
import { fmtMoney, fmtDate, calcCommission } from '../utils/format'

describe('fmtMoney', () => {
  test('formats number as VND', () => {
    expect(fmtMoney(100000)).toBe('100.000 ₫')
  })
  test('handles zero', () => {
    expect(fmtMoney(0)).toBe('0 ₫')
  })
  test('handles null/undefined', () => {
    expect(fmtMoney(null)).toBe('0 ₫')
    expect(fmtMoney(undefined)).toBe('0 ₫')
  })
})
```

### Frontend Coverage Checklist

Mỗi component/page mới cần test:
- [ ] Renders không crash
- [ ] Loading state
- [ ] Renders data khi API trả về thành công
- [ ] Empty state khi không có data
- [ ] Error state khi API fail
- [ ] User interactions (click, type, submit)
- [ ] Permission-gated elements (show/hide đúng)
- [ ] Navigation sau action thành công (nếu có)

---

## Coverage Report

Sau khi chạy test, kiểm tra coverage:

```bash
# Backend
npm run test:ci
# Xem: coverage/lcov-report/index.html

# Frontend  
npm run test:coverage
# Xem: coverage/index.html
```

### Mục tiêu coverage cho code mới

| Metric | Target |
|--------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

**Nếu không đạt 100%:** Tìm uncovered lines trong HTML report, thêm test case cho branch/statement đó.

Các trường hợp thường bị miss:
- `catch` block khi không có test DB error
- `if (!result.rows.length)` khi chỉ test happy path
- `|| defaultValue` fallback khi query param thiếu
- Error boundary và fallback UI

---

## Running Existing Tests (Validation)

Trước khi commit, đảm bảo tất cả test hiện có vẫn pass:

```bash
# Backend — toàn bộ 59 test files
cd backend && npm run test:ci

# Frontend
cd frontend && npm run test:run
```

Nếu test cũ fail sau khi thêm tính năng mới → fix trước khi commit.
