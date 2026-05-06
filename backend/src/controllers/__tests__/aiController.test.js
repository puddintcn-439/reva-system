/* eslint-disable global-require */
/**
 * Tests for aiController: suggestProduct + analyzeDashboard
 * Coverage target: 100% lines/branches/functions
 */

// ── Mock @google/generative-ai before any require ─────────────────────────────
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({ generateContent: mockGenerateContent });
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json:   jest.fn(),
});
const makeNext = () => jest.fn();

const mockAIText = (text) => {
  mockGenerateContent.mockResolvedValueOnce({
    response: { text: () => text },
  });
};

// ── suggestProduct ────────────────────────────────────────────────────────────

describe('aiController.suggestProduct', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGenerateContent.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

  const makeReq = (body = {}) => ({
    body,
    user: { id: 'user-1' },
  });

  test('returns 400 when name is empty', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    // Simulate express-validator finding error by mocking validationResult
    jest.doMock('express-validator', () => ({
      validationResult: () => ({
        isEmpty: () => false,
        array: () => [{ msg: 'Tên sản phẩm là bắt buộc', path: 'name' }],
      }),
    }));
    const { suggestProduct: sp } = require('../aiController');
    const res = makeRes(); const next = makeNext();
    await sp(makeReq({ name: '' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 503 when GEMINI_API_KEY is not set', async () => {
    const { suggestProduct } = require('../aiController');
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Áo đầm' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  test('returns 200 with suggested_price and description on valid response', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText(JSON.stringify({ suggested_price: 250000, description: 'Áo đầm đẹp, tình trạng 85%.' }));
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Áo đầm lụa', condition_percent: 85, category_name: 'Thời trang nữ' }), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ suggested_price: 250000, description: expect.any(String) }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('strips markdown code fences from AI response', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText('```json\n{"suggested_price": 150000, "description": "Mô tả hay."}\n```');
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Túi xách' }), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('returns 502 when AI returns non-JSON', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText('Tôi không hiểu yêu cầu');
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Bàn gỗ' }), res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('returns 502 when AI JSON missing required fields', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText(JSON.stringify({ suggested_price: 0, description: '' }));
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Ghế nhựa' }), res, next);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  test('sanitizes prompt-injection characters in name', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText(JSON.stringify({ suggested_price: 100000, description: 'Test mô tả sản phẩm tốt.' }));
    const res = makeRes(); const next = makeNext();
    // Name with injection-attempt characters
    await suggestProduct(makeReq({ name: 'Áo `rm -rf /` "evil"\\hack' }), res, next);
    // Should not crash and should call generateContent with sanitized text
    expect(mockGenerateContent).toHaveBeenCalled();
    const calledPrompt = mockGenerateContent.mock.calls[0][0];
    expect(calledPrompt).not.toContain('`');
    expect(calledPrompt).not.toContain('"evil"');
  });

  test('propagates unexpected error to next()', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValueOnce(new Error('Network timeout'));
    const { suggestProduct } = require('../aiController');
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Máy tính' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('works without optional fields (no condition_percent, no category_name)', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { suggestProduct } = require('../aiController');
    mockAIText(JSON.stringify({ suggested_price: 300000, description: 'Sản phẩm chất lượng cao.' }));
    const res = makeRes(); const next = makeNext();
    await suggestProduct(makeReq({ name: 'Tủ gỗ sồi' }), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ── analyzeDashboard ──────────────────────────────────────────────────────────

describe('aiController.analyzeDashboard', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGenerateContent.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

  const makeReq = (body = {}) => ({
    body,
    user: { id: 'user-1' },
  });

  const sampleStats = {
    total_revenue: 15000000,
    total_commission: 4500000,
    items_sold: 30,
    items_active: 120,
    items_pending: 5,
    period_months: 1,
  };

  test('returns 503 when GEMINI_API_KEY not set', async () => {
    const { analyzeDashboard } = require('../aiController');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq(sampleStats), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  test('returns 200 with summary string on success', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { analyzeDashboard } = require('../aiController');
    mockAIText('Cửa hàng hoạt động tốt tháng này với 30 sản phẩm đã bán...');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq(sampleStats), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ summary: expect.any(String) }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('works with all zero stats (empty store)', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { analyzeDashboard } = require('../aiController');
    mockAIText('Cửa hàng chưa có giao dịch trong kỳ này.');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq({ total_revenue: 0, total_commission: 0, items_sold: 0, items_active: 0, items_pending: 0 }), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('uses default period_months=1 when not provided', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { analyzeDashboard } = require('../aiController');
    mockAIText('Nhận xét kinh doanh...');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq({ total_revenue: 5000000, items_sold: 10 }), res, next);
    const calledPrompt = mockGenerateContent.mock.calls[0][0];
    expect(calledPrompt).toContain('1 tháng');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('uses custom period_months when provided', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { analyzeDashboard } = require('../aiController');
    mockAIText('Nhận xét 3 tháng...');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq({ ...sampleStats, period_months: 3 }), res, next);
    const calledPrompt = mockGenerateContent.mock.calls[0][0];
    expect(calledPrompt).toContain('3 tháng');
  });

  test('propagates unexpected error to next()', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'));
    const { analyzeDashboard } = require('../aiController');
    const res = makeRes(); const next = makeNext();
    await analyzeDashboard(makeReq(sampleStats), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── getUsage ──────────────────────────────────────────────────────────────────

describe('aiController.getUsage', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('returns usage rows for given date query param', async () => {
    jest.doMock('../../lib/aiUsage', () => ({
      checkAndIncrementUsage: jest.fn().mockResolvedValue({ allowed: true }),
      getUsageByDate: jest.fn().mockResolvedValue([
        { user_id: 'u1', username: 'admin', endpoint: 'suggest-product', calls: 5 },
      ]),
    }));
    const { getUsage } = require('../aiController');
    const req = { query: { date: '2026-05-06' } };
    const res = makeRes(); const next = makeNext();
    await getUsage(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([expect.objectContaining({ endpoint: 'suggest-product' })]),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('defaults to today when no date query param provided', async () => {
    const mockGetUsageByDate = jest.fn().mockResolvedValue([]);
    jest.doMock('../../lib/aiUsage', () => ({
      checkAndIncrementUsage: jest.fn().mockResolvedValue({ allowed: true }),
      getUsageByDate: mockGetUsageByDate,
    }));
    const { getUsage } = require('../aiController');
    const req = { query: {} };
    const res = makeRes(); const next = makeNext();
    await getUsage(req, res, next);
    const today = new Date().toISOString().slice(0, 10);
    expect(mockGetUsageByDate).toHaveBeenCalledWith(today);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('propagates error to next()', async () => {
    jest.doMock('../../lib/aiUsage', () => ({
      checkAndIncrementUsage: jest.fn().mockResolvedValue({ allowed: true }),
      getUsageByDate: jest.fn().mockRejectedValue(new Error('DB error')),
    }));
    const { getUsage } = require('../aiController');
    const req = { query: { date: '2026-05-06' } };
    const res = makeRes(); const next = makeNext();
    await getUsage(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
