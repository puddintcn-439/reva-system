/* eslint-disable global-require */
describe('purchaseController – error propagation + status filter', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const throwDb = () => ({ query: async () => { throw new Error('db fail'); } });

  test('createPurchaseRequest propagates db error', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', throwDb);
    const { createPurchaseRequest } = require('../purchaseController');
    const next = jest.fn();
    await createPurchaseRequest({ body: {} }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getPurchaseRequests with status filter', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 3 }] };
      },
    }));
    const { getPurchaseRequests } = require('../purchaseController');
    const res = makeRes(); const next = jest.fn();
    await getPurchaseRequests({ query: { status: 'pending' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getPurchaseRequests propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { getPurchaseRequests } = require('../purchaseController');
    const next = jest.fn();
    await getPurchaseRequests({ query: {} }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateStatus propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { updateStatus } = require('../purchaseController');
    const next = jest.fn();
    await updateStatus({ body: { status: 'pending' }, params: { id: '1' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
