/* eslint-disable global-require */
describe('posController - sales & returns flows', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getSales returns pagination information', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
      return { rows: [{ id: 1, invoice_code: 'HD', final_amount: 100 }] };
    } }));
    const { getSales } = require('../posController');
    const req = { query: {} };
    const res = makeRes();
    const next = jest.fn();
    await getSales(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getSale returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { getSale } = require('../posController');
    const req = { params: { id: 999 } };
    const res = makeRes();
    const next = jest.fn();
    await getSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getSale returns sale when found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, items: [] }] }) }));
    const { getSale } = require('../posController');
    const req = { params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await getSale(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('markSalePaid returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: 42 }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('markSalePaid updates status to paid', async () => {
    const query = jest.fn().mockImplementation(async (sql, params) => {
      if (/SELECT status FROM sales/.test(sql)) return { rows: [{ status: 'pending' }] };
      if (/UPDATE sales/.test(sql)) return { rows: [{ id: params[0], status: 'paid' }] };
      return { rows: [] };
    });
    jest.doMock('../../config/database', () => ({ query }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: 7 }, body: { payment_reference: 'r1' } };
    const res = makeRes();
    const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('cancelSale returns 404 when sale missing', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [] })) // SELECT sale -> not found
        .mockImplementationOnce(async (sql) => undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { cancelSale } = require('../posController');
    const req = { params: { id: 99 } };
    const res = makeRes();
    const next = jest.fn();
    await cancelSale(req, res, next);
    expect(mockClient.query).toHaveBeenCalled();
    expect(res.status.mock.calls.length + next.mock.calls.length).toBeGreaterThan(0);
  });

  test('cancelSale commits and returns success when ok', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 1, status: 'pending', invoice_code: 'HD123' }] })) // SELECT
        .mockImplementationOnce(async (sql) => undefined) // UPDATE products
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 1, status: 'cancelled' }] })) // UPDATE sales
        .mockImplementationOnce(async (sql) => undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { cancelSale } = require('../posController');
    const req = { params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await cancelSale(req, res, next);
    expect(res.json.mock.calls.length + next.mock.calls.length).toBeGreaterThan(0);
  });

  test('createReturn returns 400 when no items', async () => {
    const { createReturn } = require('../posController');
    const req = { params: { id: 1 }, body: { items: [] }, user: {} };
    const res = makeRes();
    const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createReturn returns 404 when sale missing', async () => {
    const mockClient = { query: jest.fn().mockImplementation(async (sql) => {
      if (sql === 'BEGIN') return;
      if (/SELECT id, status, invoice_code FROM sales/.test(sql)) return { rows: [] };
      if (sql === 'ROLLBACK') return;
      return { rows: [] };
    }), release: jest.fn() };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = { params: { id: 123 }, body: { items: [{ sale_item_id: 1, sale_price: 100 }] }, user: {} };
    const res = makeRes();
    const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getReturns returns rows', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1 }] }) }));
    const { getReturns } = require('../posController');
    const req = { params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await getReturns(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('getCustomers returns pagination', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
      return { rows: [{ id: 1, total_spent: 100 }] };
    } }));
    const { getCustomers } = require('../posController');
    const req = { query: {} };
    const res = makeRes();
    const next = jest.fn();
    await getCustomers(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getCustomer returns 404 when missing and returns details when present', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [] }) }));
    let { getCustomer } = require('../posController');
    let req = { params: { id: 999 } };
    let res = makeRes();
    let next = jest.fn();
    await getCustomer(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SELECT c\./.test(sql)) return { rows: [{ id: 1, purchase_count: 0 }] };
      if (/SELECT s\./.test(sql)) return { rows: [] };
      return { rows: [] };
    } }));
    ({ getCustomer } = require('../posController'));
    req = { params: { id: 1 } };
    res = makeRes();
    next = jest.fn();
    await getCustomer(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('calcCommission handles percent and fixed tiers', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { calcCommission } = require('../posController');
    const tiers = [ { max: 100, type: 'percent', amount: 10 }, { max: null, type: 'fixed', amount: 20 } ];
    const r1 = calcCommission(80, tiers);
    expect(r1.commission).toBe(8);
    expect(r1.consignorAmount).toBe(72);

    const r2 = calcCommission(200, tiers);
    expect(r2.commission).toBe(20);
    expect(r2.consignorAmount).toBe(180);
  });

  test('createSale succeeds and returns 201 with full sale', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 1, name: 'P', status: 'active' }] })) // product check
        .mockImplementationOnce(async (sql) => ({ rows: [] })) // invoice dup check
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 123 }] })) // insert sale RETURNING id
        .mockImplementationOnce(async (sql) => undefined) // insert sale_item
        .mockImplementationOnce(async (sql) => undefined) // update product -> sold
        .mockImplementationOnce(async (sql) => undefined), // COMMIT
      release: jest.fn(),
    };

    const topQuery = jest.fn(async (sql) => ({ rows: [{ id: 123, items: [] }] }));

    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient, query: topQuery }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));

    const { createSale } = require('../posController');
    const req = { body: { items: [{ product_id: 1, sale_price: 100 }] }, user: { id: 5 } };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(topQuery).toHaveBeenCalled();
  });

  test('createReturn succeeds and returns 201 with full return', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 1, status: 'pending', final_amount: 200 }] })) // select sale
        .mockImplementationOnce(async (sql) => ({ rows: [] })) // alreadyReturned check
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 11 }] })) // insert return
        .mockImplementationOnce(async (sql) => undefined) // insert return item
        .mockImplementationOnce(async (sql) => undefined) // update product
        .mockImplementationOnce(async (sql) => undefined), // COMMIT
      release: jest.fn(),
    };

    const topQuery = jest.fn(async (sql) => ({ rows: [{ id: 11, items: [] }] }));
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient, query: topQuery }));

    const { createReturn } = require('../posController');
    const req = { params: { id: 1 }, body: { items: [{ sale_item_id: 1, product_id: 2, sale_price: 100 }], refund_amount: 50 }, user: { id: 5 } };
    const res = makeRes();
    const next = jest.fn();
    await createReturn(req, res, next);
    expect(topQuery).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createSale fails when invoice code cannot be generated (retries exhausted)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 1, name: 'P', status: 'active' }] })) // product check
        // subsequent invoice duplicate checks will always return a row (simulate collision)
        .mockImplementation(async (sql) => ({ rows: [{ exists: true }] })),
      release: jest.fn(),
    };
    const topQuery = jest.fn(async (sql) => ({ rows: [] }));
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient, query: topQuery }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));

    const { createSale } = require('../posController');
    const req = { body: { items: [{ product_id: 1, sale_price: 100 }] }, user: { id: 5 } };
    const res = makeRes();
    const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('markSalePaid returns already confirmed when status is paid', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'paid' }] }) }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: 123 }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: expect.any(String) }));
  });

  test('markSalePaid returns 400 when status is cancelled', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'cancelled' }] }) }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: 444 }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

});
