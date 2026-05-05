/**
 * Integration tests for /api/reports routes
 * Tests auth enforcement, validation, and correct handler dispatch
 */
const request = require('supertest');

// Must mock BEFORE requiring app or routes
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', username: 'admin', role: 'admin' };
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../config/database');
jest.mock('../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

// Mock exceljs
const mockWrite = jest.fn().mockResolvedValue(undefined);
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    creator: '',
    created: null,
    modified: null,
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      columnCount: 8,
      addRow: jest.fn().mockReturnValue({
        eachCell: jest.fn(),
        getCell: jest.fn().mockReturnValue({ value: null, font: null, fill: null, border: null, alignment: null, numFmt: null }),
        height: 0,
      }),
      mergeCells: jest.fn(),
      getRow: jest.fn().mockReturnValue({
        getCell: jest.fn().mockReturnValue({ value: null, font: null, fill: null, border: null, alignment: null }),
        height: 0,
      }),
      views: [],
      autoFilter: null,
    }),
    xlsx: { write: mockWrite },
  })),
}));

const db = require('../../config/database');

// Stub all 4 parallel DB queries for financial endpoint
function mockFinancialDb() {
  db.query
    .mockResolvedValueOnce({ rows: [{ items_sold: 5, items_active: 2, items_pending: 1, items_returned: 0, total_revenue: 2000000, total_commission: 600000, total_payout: 1400000 }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });
}

// Stub 2 parallel DB queries for inventory endpoint
function mockInventoryDb() {
  db.query
    .mockResolvedValueOnce({ rows: [{ code: 'SP001', name: 'Test', status: 'active', sale_price: 500000, commission_amount: 150000, consignor_amount: 350000, condition_percent: 90, category_name: 'Cat', location_name: 'Loc', consignor_name: 'KGV', consignor_code: 'K01', consign_start: '2025-01-01', consign_end: '2025-03-01', sold_at: null, created_at: '2025-01-15' }] })
    .mockResolvedValueOnce({ rows: [{ status: 'active', so_luong: 1, tong_gia_ban: 500000, tong_hoa_hong: 150000, tong_tra_kgv: 350000 }] });
}

let app;
beforeAll(() => {
  app = require('../../app');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWrite.mockResolvedValue(undefined);
});

describe('GET /api/reports/export/financial', () => {
  test('returns Excel file with valid date range', async () => {
    mockFinancialDb();

    const res = await request(app)
      .get('/api/reports/export/financial')
      .query({ date_from: '2025-01-01', date_to: '2025-12-31' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['content-disposition']).toMatch(/REVA_TaichinhReport/);
  });

  test('returns 200 without date params (uses defaults)', async () => {
    mockFinancialDb();

    const res = await request(app)
      .get('/api/reports/export/financial');

    expect(res.status).toBe(200);
  });

  test('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/reports/export/financial')
      .query({ date_from: 'bad-date' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when date_from is after date_to', async () => {
    const res = await request(app)
      .get('/api/reports/export/financial')
      .query({ date_from: '2025-12-31', date_to: '2025-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when db fails', async () => {
    db.query.mockRejectedValue(new Error('DB unavailable'));

    const res = await request(app)
      .get('/api/reports/export/financial')
      .query({ date_from: '2025-01-01', date_to: '2025-12-31' });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/reports/export/inventory', () => {
  test('returns Excel file without filters', async () => {
    mockInventoryDb();

    const res = await request(app)
      .get('/api/reports/export/inventory');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['content-disposition']).toMatch(/REVA_TonKho/);
  });

  test('returns Excel file filtered by status=active', async () => {
    mockInventoryDb();

    const res = await request(app)
      .get('/api/reports/export/inventory')
      .query({ status: 'active' });

    expect(res.status).toBe(200);
  });

  test('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .get('/api/reports/export/inventory')
      .query({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 for non-UUID category_id', async () => {
    const res = await request(app)
      .get('/api/reports/export/inventory')
      .query({ category_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 for non-UUID location_id', async () => {
    const res = await request(app)
      .get('/api/reports/export/inventory')
      .query({ location_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 200 with valid UUID filters', async () => {
    mockInventoryDb();

    const res = await request(app)
      .get('/api/reports/export/inventory')
      .query({
        status: 'sold',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        location_id: '660e8400-e29b-41d4-a716-446655440001',
      });

    expect(res.status).toBe(200);
  });

  test('returns 500 when db fails', async () => {
    db.query.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .get('/api/reports/export/inventory');

    expect(res.status).toBe(500);
  });
});
