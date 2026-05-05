/* eslint-disable global-require */
describe('posController – createReturn & getReturns', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getReturns returns list for a sale', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, refund_amount: 50, items: [] }] }),
    }));
    const { getReturns } = require('../posController');
    const req = { params: { id: '1' } };
    const res = makeRes(); const next = jest.fn();
    await getReturns(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('createReturn returns 400 when items empty', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = { params: { id: '1' }, body: { items: [] }, user: {} };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createReturn returns 404 when sale not found', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT sale
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = { params: { id: '9' }, body: { items: [{ product_name: 'P', sale_price: 10 }] }, user: {} };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('createReturn returns 400 when sale already cancelled', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 2, status: 'cancelled', final_amount: 100 }] }) // SELECT sale
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = { params: { id: '2' }, body: { items: [{ product_name: 'P', sale_price: 10 }] }, user: {} };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('createReturn returns 400 when refund amount invalid (negative)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 3, status: 'paid', final_amount: 100 }] }) // SELECT sale
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '3' },
      body: { items: [{ product_name: 'P', sale_price: 10 }], refund_amount: -1 },
      user: {},
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createReturn returns 400 when refund amount exceeds final_amount', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ id: 4, status: 'paid', final_amount: 100 }] })
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '4' },
      body: { items: [{ product_name: 'P', sale_price: 10 }], refund_amount: 200 },
      user: {},
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createReturn returns 409 when product already returned', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 5, status: 'paid', final_amount: 100 }] }) // SELECT sale
        .mockResolvedValueOnce({ rows: [{ product_id: 10 }] }) // already returned check
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '5' },
      body: { items: [{ product_id: 10, product_name: 'P', sale_price: 50 }], refund_amount: 50 },
      user: {},
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('createReturn success with product_id update', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 6, status: 'paid', final_amount: 100 }] }) // SELECT sale
        .mockResolvedValueOnce({ rows: [] }) // already returned check (no prev returns)
        .mockResolvedValueOnce({ rows: [{ id: 50, sale_id: 6, refund_amount: 50 }] }) // INSERT return
        .mockResolvedValueOnce(undefined) // INSERT return_item
        .mockResolvedValueOnce(undefined) // UPDATE products (product_id present)
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [{ id: 50, items: [{ id: 1 }] }] }), // full return select
    }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '6' },
      body: { items: [{ product_id: 20, product_name: 'P', product_code: 'C1', sale_price: 50 }], refund_amount: 50, reason: 'broken' },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
