/* eslint-disable global-require */
describe('productController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── calculateCommission sort comparator lines 12-13 ────────────────────────
  test('calculateCommission with 2 finite-max tiers (both non-null) covers sort line 13', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [
        { max: 100, type: 'percent', amount: 5 },
        { max: 200, type: 'percent', amount: 10 },
      ],
    }));
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { calculateCommission } = require('../productController');
    const { commission } = await calculateCommission(80);
    expect(commission).toBe(Math.round(80 * 5 / 100)); // tier max=100 applies
  });

  test('calculateCommission with finite-max + null-max tiers covers line 12', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [
        { max: null, type: 'percent', amount: 20 },
        { max: 50, type: 'percent', amount: 5 },
      ],
    }));
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { calculateCommission } = require('../productController');
    const { commission } = await calculateCommission(30);
    expect(commission).toBe(Math.round(30 * 5 / 100)); // tier max=50 applies first
  });

  // ─── getProducts with price_min, price_max, search filters (lines 56-58) ────
  test('getProducts with price_min, price_max, search covers filter branches', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 3, name: 'Widget', status: 'active' }] };
      },
    }));
    const { getProducts } = require('../productController');
    const req = {
      query: { price_min: '100', price_max: '500', search: 'Widget' },
      user: { role: 'admin' },
    };
    const res = makeRes(); const next = jest.fn();
    await getProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── getProducts error propagation ───────────────────────────────────────────
  test('getProducts propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getProducts } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await getProducts({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getProduct success and error propagation ─────────────────────────────────
  test('getProduct success path', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 5, name: 'Test' }] }),
    }));
    const { getProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await getProduct({ params: { id: '5' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getProduct propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await getProduct({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createProduct success and missing paths ──────────────────────────────────
  test('createProduct success returns 201', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 10, name: 'New Product', status: 'active' }] }),
    }));
    const { createProduct } = require('../productController');
    const req = {
      body: { name: 'New Product', sale_price: 200, condition_percent: 80 },
    };
    const res = makeRes(); const next = jest.fn();
    await createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createProduct rejects invalid (non-positive) sale_price', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [],
    }));
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { createProduct } = require('../productController');
    const req = { body: { name: 'P', sale_price: 0 } };
    const res = makeRes(); const next = jest.fn();
    await createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createProduct propagates db error', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { createProduct } = require('../productController');
    const req = { body: { name: 'P', sale_price: 100 } };
    const res = makeRes(); const next = jest.fn();
    await createProduct(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── updateProduct additional branches ───────────────────────────────────────
  test('updateProduct rejects status=sold', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '1' }, body: { status: 'sold' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateProduct rejects invalid status', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '1' }, body: { status: 'garbage' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateProduct rejects empty required field', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '1' }, body: { name: '' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateProduct rejects NaN condition_percent', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '1' }, body: { condition_percent: 'abc' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateProduct with valid sale_price recalculates commission and succeeds', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 7, sale_price: 300 }] }),
    }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '7' }, body: { sale_price: '300' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateProduct propagates db error', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '1' }, body: { name: 'ok' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── deleteProduct additional paths ──────────────────────────────────────────
  test('deleteProduct blocks product in active sale', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/settlement_items/.test(sql)) return { rows: [] }; // not in settlement
        if (/sale_items/.test(sql)) return { rows: [{ 1: 1 }] }; // in active sale
        return { rows: [] };
      },
    }));
    const { deleteProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await deleteProduct({ params: { id: '2' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteProduct success path', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/settlement_items/.test(sql)) return { rows: [] };
        if (/sale_items/.test(sql)) return { rows: [] };
        return { rows: [{ id: 3 }] }; // DELETE RETURNING
      },
    }));
    const { deleteProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await deleteProduct({ params: { id: '3' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('deleteProduct propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { deleteProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await deleteProduct({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── returnProduct error propagation ─────────────────────────────────────────
  test('returnProduct propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { returnProduct } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await returnProduct({ params: { id: '1' }, body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── expireBatch error propagation ───────────────────────────────────────────
  test('expireBatch propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { expireBatch } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await expireBatch({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getCategories error propagation ─────────────────────────────────────────
  test('getCategories propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getCategories } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await getCategories({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── bulkCreateProducts error propagation (ROLLBACK + next) ─────────────────
  test('bulkCreateProducts propagates error via ROLLBACK and next()', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // INSERT throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    const { bulkCreateProducts } = require('../productController');
    const req = { body: { products: [{ name: 'P', sale_price: 100 }] } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateProducts(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── getCommissionTiersPublic error propagation ───────────────────────────────
  test('getCommissionTiersPublic propagates error', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => { throw new Error('settings fail'); },
    }));
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { getCommissionTiersPublic } = require('../productController');
    const res = makeRes(); const next = jest.fn();
    await getCommissionTiersPublic({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
