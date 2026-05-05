/* eslint-disable global-require */
describe('posController', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('searchProducts returns empty array when q blank', async () => {
    const { searchProducts } = require('../posController');
    const req = { query: { q: '   ' } };
    const res = makeRes();
    const next = jest.fn();
    await searchProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test('searchProducts returns results from db', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, name: 'A' }] }) }));
    const { searchProducts } = require('../posController');
    const req = { query: { q: 'A', limit: 5 } };
    const res = makeRes();
    const next = jest.fn();
    await searchProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('lookupProduct returns 400 when code missing', async () => {
    const { lookupProduct } = require('../posController');
    const req = { query: {} };
    const res = makeRes();
    const next = jest.fn();
    await lookupProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('lookupProduct returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { lookupProduct } = require('../posController');
    const req = { query: { code: 'X' } };
    const res = makeRes();
    const next = jest.fn();
    await lookupProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('lookupProduct returns 409 when sold', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ name: 'P', status: 'sold' }] }) }));
    const { lookupProduct } = require('../posController');
    const req = { query: { code: 'SP-1' } };
    const res = makeRes();
    const next = jest.fn();
    await lookupProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('createSale returns 400 for empty cart', async () => {
    const { createSale } = require('../posController');
    const req = { body: { items: [] }, user: {} };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createSale returns 400 for >100 items', async () => {
    const { createSale } = require('../posController');
    const req = { body: { items: new Array(101).fill({ product_id: 1, sale_price: 100 }) } };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createSale rejects invalid payment method', async () => {
    const { createSale } = require('../posController');
    const req = { body: { items: [{ product_id: 1, sale_price: 100 }], payment_method: 'xyz' }, user: {} };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createSale rolls back when product not active', async () => {
    const mockClient = {
      query: jest.fn(async (sql) => {
        if (sql === 'BEGIN') return;
        if (/SELECT id, name, status FROM products/.test(sql)) return { rows: [{ id: 1, name: 'X', status: 'sold' }] };
        if (/ROLLBACK/.test(sql)) return;
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient, query: async () => ({ rows: [] }) }));
    const { createSale } = require('../posController');
    const req = { body: { items: [{ product_id: 1, sale_price: 100 }] }, user: {} };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

});
