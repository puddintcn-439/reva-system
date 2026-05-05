/* eslint-disable global-require */
describe('productController', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getProduct returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { getProduct } = require('../productController');
    const req = { params: { id: '1' } };
    const res = makeRes();
    const next = jest.fn();
    await getProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getProduct returns data when found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, name: 'X' }] }) }));
    const { getProduct } = require('../productController');
    const req = { params: { id: '1' } };
    const res = makeRes();
    const next = jest.fn();
    await getProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('createProduct rejects invalid sale_price', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { createProduct } = require('../productController');
    const req = { body: { sale_price: 0 } };
    const res = makeRes();
    const next = jest.fn();
    await createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createProduct succeeds and returns 201', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 11, name: 'P' }] }) }));
    const { createProduct } = require('../productController');
    const req = { body: { sale_price: 100, name: 'P' } };
    const res = makeRes();
    const next = jest.fn();
    await createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('deleteProduct blocked when in settlement', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/settlement_items/.test(sql)) return { rows: [{ foo: 1 }] };
      return { rows: [] };
    } }));
    const { deleteProduct } = require('../productController');
    const req = { params: { id: '5' } };
    const res = makeRes();
    const next = jest.fn();
    await deleteProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteProduct succeeds when not referenced', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/settlement_items/.test(sql)) return { rows: [] };
      if (/sale_items/.test(sql)) return { rows: [] };
      return { rows: [{ id: 5 }] };
    } }));
    const { deleteProduct } = require('../productController');
    const req = { params: { id: '5' } };
    const res = makeRes();
    const next = jest.fn();
    await deleteProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getCommissionTiersPublic returns tiers from sysSettings', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 5 }] }));
    const { getCommissionTiersPublic } = require('../productController');
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    await getCommissionTiersPublic(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('calculateCommission - percent and fixed tiers', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [ { max: 1000, type: 'percent', amount: 10 }, { max: null, type: 'percent', amount: 5 } ] }));
    let { calculateCommission } = require('../productController');
    let out = await calculateCommission(500);
    expect(out).toEqual({ commission: 50, consignorAmount: 450 });

    // fixed tier
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [ { max: 1000, type: 'fixed', amount: 100 }, { max: null, type: 'percent', amount: 5 } ] }));
    ({ calculateCommission } = require('../productController'));
    out = await calculateCommission(800);
    expect(out).toEqual({ commission: 100, consignorAmount: 700 });
  });

  test('bulkCreateProducts - validation and success', async () => {
    // empty products
    jest.doMock('../../config/database', () => ({ getClient: jest.fn() }));
    let { bulkCreateProducts } = require('../productController');
    let req = { body: { products: [] } };
    let res = makeRes(); let next = jest.fn();
    await bulkCreateProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // success path: commit
    const created1 = { id: 1, name: 'A' };
    const created2 = { id: 2, name: 'B' };
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [ created1 ] })
        .mockResolvedValueOnce({ rows: [ created2 ] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [ { max: null, type: 'percent', amount: 10 } ] }));
    ({ bulkCreateProducts } = require('../productController'));
    req = { body: { products: [ { name: 'a', sale_price: 100 }, { name: 'b', sale_price: 200 } ] } };
    res = makeRes(); next = jest.fn();
    await bulkCreateProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('returnProduct and updateProduct edge cases', async () => {
    // returnProduct not found
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [] }) }));
    let { returnProduct } = require('../productController');
    let req = { params: { id: 9 }, body: {} };
    let res = makeRes(); let next = jest.fn();
    await returnProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // returnProduct sold
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [{ status: 'sold' }] }) }));
    ({ returnProduct } = require('../productController'));
    req = { params: { id: 10 }, body: { reason: 'a' } };
    res = makeRes(); next = jest.fn();
    await returnProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // updateProduct cannot set status sold manually
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { updateProduct } = require('../productController');
    const updReq = { params: { id: 1 }, body: { status: 'sold' } };
    const updRes = makeRes(); const updNext = jest.fn();
    await updateProduct(updReq, updRes, updNext);
    expect(updRes.status).toHaveBeenCalledWith(400);
  });

});
