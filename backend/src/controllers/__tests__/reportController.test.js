/* eslint-disable global-require */
/**
 * Tests for reportController: exportFinancial + exportInventory
 * Coverage target: 100% lines/branches/functions
 */

// ── Mock exceljs before requiring controller ──────────────────────────────────
const mockWrite = jest.fn().mockResolvedValue(undefined);
const mockAddRow = jest.fn().mockReturnValue({
  eachCell: jest.fn(),
  getCell: jest.fn().mockReturnValue({ value: null, font: null, fill: null, border: null, alignment: null, numFmt: null }),
  height: 0,
});
const mockSheet = {
  columns: [],
  addRow: mockAddRow,
  mergeCells: jest.fn(),
  getRow: jest.fn().mockReturnValue({
    getCell: jest.fn().mockReturnValue({ value: null, font: null, fill: null, border: null, alignment: null }),
    height: 0,
  }),
  views: [],
  autoFilter: null,
  columnCount: 8,
};
const mockWorkbook = {
  creator: '',
  created: null,
  modified: null,
  addWorksheet: jest.fn().mockReturnValue(mockSheet),
  xlsx: { write: mockWrite },
};
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => mockWorkbook),
}));

jest.mock('../../config/database');
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../../config/database');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
  };
  return res;
};

const makeReq = (query = {}, user = { id: 'user-1', role: 'admin' }) => ({
  query,
  user,
});

// ── Financial Export ──────────────────────────────────────────────────────────

describe('reportController.exportFinancial', () => {
  beforeEach(() => jest.resetModules());

  const mockDbAll = () => {
    // 4 parallel queries: overview, monthly, topConsignors, settlements
    db.query
      .mockResolvedValueOnce({ rows: [{ // overview
        items_sold: 10, items_active: 5, items_pending: 2, items_returned: 1,
        total_revenue: 5000000, total_commission: 1500000, total_payout: 3500000,
      }] })
      .mockResolvedValueOnce({ rows: [{ // monthly
        thang: '01/2025', so_san_pham: 5, doanh_thu: 2500000, hoa_hong: 750000, tra_ky_gui: 1750000,
      }] })
      .mockResolvedValueOnce({ rows: [{ // topConsignors
        code: 'KGV001', full_name: 'Nguyễn Văn A', phone: '0901234567',
        so_sp_ban: 3, doanh_thu: 1500000, hoa_hong: 450000, tien_tra: 1050000,
      }] })
      .mockResolvedValueOnce({ rows: [{ // settlements
        code: 'QT-001', full_name: 'Nguyễn Văn A', phone: '0901234567',
        period_start: '2025-01-01', period_end: '2025-01-31',
        total_sale: 1500000, total_commission: 450000, total_payout: 1050000,
        status: 'paid', paid_at: '2025-02-01', created_at: '2025-02-01',
      }] });
  };

  test('returns 400 when date_from is invalid', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: 'not-a-date', date_to: '2025-12-31' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    // validationResult will catch 'not-a-date' since express-validator ran before
    // In unit test without express-validator middleware, validationResult returns empty
    // so the controller falls through to manual date check
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('returns 400 when date_from > date_to', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: '2025-12-31', date_to: '2025-01-01' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('trước') })
    );
  });

  test('generates Excel and streams response on valid request', async () => {
    jest.doMock('../../config/database', () => db);
    mockDbAll();
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: '2025-01-01', date_to: '2025-12-31' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('REVA_TaichinhReport')
    );
    expect(mockWrite).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('uses default date range when no params provided', async () => {
    jest.doMock('../../config/database', () => db);
    mockDbAll();
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportFinancial } = require('../reportController');

    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(db.query).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  test('propagates db error to next()', async () => {
    jest.doMock('../../config/database', () => ({
      query: jest.fn().mockRejectedValue(new Error('db fail')),
    }));
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: '2025-01-01', date_to: '2025-12-31' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('handles empty data (no sold products, no settlements)', async () => {
    jest.doMock('../../config/database', () => db);
    db.query
      .mockResolvedValueOnce({ rows: [{ items_sold: 0, items_active: 0, items_pending: 0, items_returned: 0, total_revenue: 0, total_commission: 0, total_payout: 0 }] })
      .mockResolvedValueOnce({ rows: [] })  // monthly — empty
      .mockResolvedValueOnce({ rows: [] })  // top consignors — empty
      .mockResolvedValueOnce({ rows: [] }); // settlements — empty
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: '2025-01-01', date_to: '2025-01-02' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('settlement with pending status renders correctly', async () => {
    jest.doMock('../../config/database', () => db);
    db.query
      .mockResolvedValueOnce({ rows: [{ items_sold: 0, items_active: 0, items_pending: 0, items_returned: 0, total_revenue: 0, total_commission: 0, total_payout: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{
        code: 'QT-002', full_name: 'Test', phone: '0900000001',
        period_start: '2025-01-01', period_end: '2025-01-31',
        total_sale: 0, total_commission: 0, total_payout: 0,
        status: 'pending', paid_at: null, created_at: '2025-01-01',
      }] });
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportFinancial } = require('../reportController');

    const req = makeReq({ date_from: '2025-01-01', date_to: '2025-12-31' });
    const res = makeRes();
    const next = jest.fn();

    await exportFinancial(req, res, next);

    expect(res.end).toHaveBeenCalled();
  });
});

// ── Inventory Export ──────────────────────────────────────────────────────────

describe('reportController.exportInventory', () => {
  beforeEach(() => jest.resetModules());

  const mockInventoryDb = (rows = []) => {
    db.query
      .mockResolvedValueOnce({ rows }) // inventory list
      .mockResolvedValueOnce({ rows: [ // summary by status
        { status: 'active',   so_luong: 5, tong_gia_ban: 2500000, tong_hoa_hong: 750000,  tong_tra_kgv: 1750000 },
        { status: 'sold',     so_luong: 3, tong_gia_ban: 1500000, tong_hoa_hong: 450000,  tong_tra_kgv: 1050000 },
        { status: 'pending',  so_luong: 2, tong_gia_ban: 800000,  tong_hoa_hong: 240000,  tong_tra_kgv: 560000  },
        { status: 'returned', so_luong: 1, tong_gia_ban: 200000,  tong_hoa_hong: 60000,   tong_tra_kgv: 140000  },
        { status: 'expired',  so_luong: 1, tong_gia_ban: 100000,  tong_hoa_hong: 30000,   tong_tra_kgv: 70000   },
      ] });
  };

  const sampleProduct = {
    code: 'SP001', name: 'Áo Đầm', status: 'active',
    sale_price: 500000, commission_amount: 150000, consignor_amount: 350000,
    condition_percent: 90, category_name: 'Thời trang', location_name: 'Kho A',
    consignor_name: 'Nguyễn Văn A', consignor_code: 'KGV001',
    consign_start: '2025-01-01', consign_end: '2025-03-01', sold_at: null, created_at: '2025-01-15',
  };

  test('exports full inventory without filters', async () => {
    jest.doMock('../../config/database', () => db);
    mockInventoryDb([sampleProduct]);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('REVA_TonKho')
    );
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('filters by status when provided', async () => {
    jest.doMock('../../config/database', () => db);
    mockInventoryDb([{ ...sampleProduct, status: 'sold', sold_at: '2025-02-01' }]);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const req = makeReq({ status: 'sold' });
    const res = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    // Verify query was called with 'sold' as parameter
    expect(db.query.mock.calls[0][1]).toContain('sold');
    expect(res.end).toHaveBeenCalled();
  });

  test('filters by category_id and location_id when provided', async () => {
    jest.doMock('../../config/database', () => db);
    mockInventoryDb([sampleProduct]);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const catId  = '550e8400-e29b-41d4-a716-446655440000';
    const locId  = '660e8400-e29b-41d4-a716-446655440001';
    const req    = makeReq({ category_id: catId, location_id: locId });
    const res    = makeRes();
    const next   = jest.fn();

    await exportInventory(req, res, next);

    expect(db.query.mock.calls[0][1]).toContain(catId);
    expect(db.query.mock.calls[0][1]).toContain(locId);
  });

  test('handles empty inventory gracefully', async () => {
    jest.doMock('../../config/database', () => db);
    mockInventoryDb([]);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    expect(res.end).toHaveBeenCalled();
  });

  test('handles all product statuses (color coding paths)', async () => {
    jest.doMock('../../config/database', () => db);
    const allStatuses = ['active', 'sold', 'pending', 'returned', 'expired', 'unknown_status'];
    const rows = allStatuses.map((status, i) => ({
      ...sampleProduct, code: `SP00${i}`, status,
      sold_at: status === 'sold' ? '2025-02-01' : null,
    }));
    mockInventoryDb(rows);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('handles null consignor and missing optional fields', async () => {
    jest.doMock('../../config/database', () => db);
    mockInventoryDb([{
      ...sampleProduct,
      consignor_name: null, consignor_code: null,
      condition_percent: null, sold_at: null,
    }]);
    mockWrite.mockResolvedValueOnce(undefined);
    const { exportInventory } = require('../reportController');

    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    expect(res.end).toHaveBeenCalled();
  });

  test('propagates db error to next()', async () => {
    jest.doMock('../../config/database', () => ({
      query: jest.fn().mockRejectedValue(new Error('db connection lost')),
    }));
    const { exportInventory } = require('../reportController');

    const req  = makeReq({});
    const res  = makeRes();
    const next = jest.fn();

    await exportInventory(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.end).not.toHaveBeenCalled();
  });
});
