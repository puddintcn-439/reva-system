/* eslint-disable global-require */
describe('purchaseController', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('createPurchaseRequest returns 400 on validation errors', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => false, array: () => [] }) }));
    const { createPurchaseRequest } = require('../purchaseController');
    const req = { body: {} };
    const res = makeRes();
    const next = jest.fn();
    await createPurchaseRequest(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createPurchaseRequest returns 201 with data', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, full_name: 'A' }] }) }));
    const { createPurchaseRequest } = require('../purchaseController');
    const req = { body: { full_name: 'A' } };
    const res = makeRes();
    const next = jest.fn();
    await createPurchaseRequest(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getPurchaseRequests returns pagination', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
      return { rows: [{ id: 1 }, { id: 2 }] };
    } }));
    const { getPurchaseRequests } = require('../purchaseController');
    const req = { query: {}, user: { role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();
    await getPurchaseRequests(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('updateStatus rejects invalid status', async () => {
    const { updateStatus } = require('../purchaseController');
    const req = { body: { status: 'bad' }, params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await updateStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateStatus returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { updateStatus } = require('../purchaseController');
    const req = { body: { status: 'pending' }, params: { id: 99 } };
    const res = makeRes();
    const next = jest.fn();
    await updateStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateStatus succeeds and returns data', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 7, status: 'pending' }] }) }));
    const { updateStatus } = require('../purchaseController');
    const req = { body: { status: 'pending' }, params: { id: 7 } };
    const res = makeRes();
    const next = jest.fn();
    await updateStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

});
