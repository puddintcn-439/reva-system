/* eslint-disable global-require */
describe('productController additional branches', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getProducts non-admin and admin status filter', async () => {
    // non-admin path (no req.user)
    const mockDb = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) };
    jest.doMock('../../config/database', () => mockDb);
    let mod = require('../productController');
    let req = { query: {} };
    let res = makeRes(); let next = jest.fn();
    await mod.getProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));

    // admin path with status filter
    jest.resetModules();
    const mockDb2 = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) };
    jest.doMock('../../config/database', () => mockDb2);
    mod = require('../productController');
    req = { query: { status: 'pending' }, user: { role: 'admin' } };
    res = makeRes(); next = jest.fn();
    await mod.getProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateProduct no-updates and sale_price invalid and not found', async () => {
    // no update fields
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    let mod = require('../productController');
    let req = { params: { id: '1' }, body: { foo: 'bar' } };
    let res = makeRes(); let next = jest.fn();
    await mod.updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // invalid sale_price conversion in body
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    mod = require('../productController');
    req = { params: { id: '2' }, body: { sale_price: 'abc' } };
    res = makeRes(); next = jest.fn();
    await mod.updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // db update returns empty -> 404
    jest.resetModules();
    const dbMock = { query: async () => ({ rows: [] }) };
    jest.doMock('../../config/database', () => dbMock);
    mod = require('../productController');
    req = { params: { id: '3' }, body: { name: 'ok' } };
    res = makeRes(); next = jest.fn();
    await mod.updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returnProduct returned-already and success update', async () => {
    // already returned
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'returned' }] }) }));
    let mod = require('../productController');
    let req = { params: { id: '10' }, body: { reason: 'a' } };
    let res = makeRes(); let next = jest.fn();
    await mod.returnProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // success path: update returns row
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SELECT status/.test(sql)) return { rows: [{ status: 'pending' }] };
      return { rows: [{ id: 11, status: 'returned' }] };
    } }));
    mod = require('../productController');
    req = { params: { id: '11' }, body: { reason: 'defect' } };
    res = makeRes(); next = jest.fn();
    await mod.returnProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('expireBatch and getCategories', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/UPDATE products SET status = 'expired'/.test(sql)) return { rowCount: 2, rows: [{ id: 1 }, { id: 2 }] };
      if (/FROM categories/.test(sql)) return { rows: [{ id: 1, name: 'A' }] };
      return { rows: [] };
    } }));
    const mod = require('../productController');
    let req = {}; let res = makeRes(); let next = jest.fn();
    await mod.expireBatch(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));

    req = {}; res = makeRes(); next = jest.fn();
    await mod.getCategories(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('bulkCreateProducts rejects >100 items', async () => {
    const big = new Array(101).fill({ name: 'x', sale_price: 10 });
    jest.doMock('../../config/database', () => ({ getClient: jest.fn() }));
    const mod = require('../productController');
    const req = { body: { products: big } };
    const res = makeRes(); const next = jest.fn();
    await mod.bulkCreateProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createProduct rejects invalid condition_percent', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { createProduct } = require('../productController');
    const req = { body: { sale_price: 100, name: 'P', condition_percent: 101 } };
    const res = makeRes(); const next = jest.fn();
    await createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

});
