/**
 * Integration tests for /api/ai routes (supertest)
 */
const request = require('supertest');

// Mock auth middleware first
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', username: 'admin', role: 'admin' };
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

// Mock @google/generative-ai
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  })),
}));

let app;
beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  app = require('../../app');
});

beforeEach(() => {
  mockGenerateContent.mockReset();
});

// ── POST /api/ai/suggest-product ──────────────────────────────────────────────

describe('POST /api/ai/suggest-product', () => {
  test('returns 200 with suggestion on valid input', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ suggested_price: 250000, description: 'Mô tả đẹp.' }) },
    });

    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: 'Áo đầm lụa hoa', condition_percent: 85, category_name: 'Thời trang' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.suggested_price).toBe(250000);
    expect(res.body.data.description).toBeTruthy();
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when name exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: 'a'.repeat(201) });

    expect(res.status).toBe(400);
  });

  test('returns 400 when condition_percent is out of range', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: 'Áo', condition_percent: 150 });

    expect(res.status).toBe(400);
  });

  test('returns 502 when AI returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Sorry I cannot help' },
    });

    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: 'Bàn' });

    expect(res.status).toBe(502);
  });

  test('returns 500 when AI call throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('AI network error'));

    const res = await request(app)
      .post('/api/ai/suggest-product')
      .send({ name: 'Tủ lạnh' });

    expect(res.status).toBe(500);
  });
});

// ── POST /api/ai/analyze-dashboard ───────────────────────────────────────────

describe('POST /api/ai/analyze-dashboard', () => {
  const sampleBody = {
    total_revenue: 15000000,
    total_commission: 4500000,
    items_sold: 30,
    items_active: 120,
    items_pending: 5,
    period_months: 1,
  };

  test('returns 200 with summary on valid input', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Cửa hàng hoạt động tốt trong tháng qua.' },
    });

    const res = await request(app)
      .post('/api/ai/analyze-dashboard')
      .send(sampleBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeTruthy();
  });

  test('returns 200 with empty body (all optional fields)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Chưa có dữ liệu đáng kể.' },
    });

    const res = await request(app)
      .post('/api/ai/analyze-dashboard')
      .send({});

    expect(res.status).toBe(200);
  });

  test('returns 400 when period_months is out of range', async () => {
    const res = await request(app)
      .post('/api/ai/analyze-dashboard')
      .send({ ...sampleBody, period_months: 25 });

    expect(res.status).toBe(400);
  });

  test('returns 400 when total_revenue is negative', async () => {
    const res = await request(app)
      .post('/api/ai/analyze-dashboard')
      .send({ total_revenue: -1 });

    expect(res.status).toBe(400);
  });

  test('returns 500 when AI call throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Timeout'));

    const res = await request(app)
      .post('/api/ai/analyze-dashboard')
      .send(sampleBody);

    expect(res.status).toBe(500);
  });
});
