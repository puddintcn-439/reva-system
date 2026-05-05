/* eslint-disable global-require */
describe('settlementController', () => {
  beforeEach(() => {
    jest.resetModules();
    // mock email to avoid loading pino transport during tests
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
  });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('lookupSettlement requires code', async () => {
    const { lookupSettlement } = require('../settlementController');
    const req = { query: {} };
    const res = makeRes();
    const next = jest.fn();
    await lookupSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('lookupSettlement returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { lookupSettlement } = require('../settlementController');
    const req = { query: { code: 'ABC' } };
    const res = makeRes();
    const next = jest.fn();
    await lookupSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('lookupSettlement returns settlements with items', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/FROM settlements s/.test(sql)) return { rows: [{ id: 2, code: 'ABC' }] };
      if (/FROM settlement_items/.test(sql)) return { rows: [{ id: 10, product_name: 'X' }] };
      return { rows: [] };
    } }));
    const { lookupSettlement } = require('../settlementController');
    const req = { query: { code: 'ABC' } };
    const res = makeRes();
    const next = jest.fn();
    await lookupSettlement(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
    const out = res.json.mock.calls[0][0];
    expect(out.data[0].items).toEqual(expect.arrayContaining([expect.objectContaining({ product_name: 'X' })]));
  });

  test('getSettlements returns pagination', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
      return { rows: [{ id: 1, total_payout: 0 }] };
    } }));
    const { getSettlements } = require('../settlementController');
    const req = { query: {} };
    const res = makeRes();
    const next = jest.fn();
    await getSettlements(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getSettlement returns 404 when missing', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [] }) }));
    const { getSettlement } = require('../settlementController');
    const req = { params: { id: '9' } };
    const res = makeRes();
    const next = jest.fn();
    await getSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getSettlement returns settlement with items', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/FROM settlements s/.test(sql)) return { rows: [{ id: 3, total_payout: 0 }] };
      if (/FROM settlement_items/.test(sql)) return { rows: [{ id: 21 }] };
      return { rows: [] };
    } }));
    const { getSettlement } = require('../settlementController');
    const req = { params: { id: '3' } };
    const res = makeRes();
    const next = jest.fn();
    await getSettlement(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ items: expect.any(Array) }) }));
  });

  test('deleteSettlement returns 404 when missing', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { deleteSettlement } = require('../settlementController');
    const req = { params: { id: '1' } };
    const res = makeRes();
    const next = jest.fn();
    await deleteSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deleteSettlement rejects when total_payout non-zero', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ total_payout: 100 }] }) }));
    const { deleteSettlement } = require('../settlementController');
    const req = { params: { id: '2' } };
    const res = makeRes();
    const next = jest.fn();
    await deleteSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteSettlement succeeds when total_payout zero', async () => {
    let called = 0;
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      called += 1;
      if (called === 1) return { rows: [{ total_payout: 0 }] };
      return { rows: [] };
    } }));
    const { deleteSettlement } = require('../settlementController');
    const req = { params: { id: '4' } };
    const res = makeRes();
    const next = jest.fn();
    await deleteSettlement(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('markPaid handles not found / paid / cancelled / success', async () => {
    // not found
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    let mod = require('../settlementController');
    let req = { params: { id: '10' }, body: {} };
    let res = makeRes();
    let next = jest.fn();
    await mod.markPaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // paid
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'paid' }] }) }));
    mod = require('../settlementController');
    req = { params: { id: '11' }, body: {} };
    res = makeRes();
    next = jest.fn();
    await mod.markPaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // cancelled
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'cancelled' }] }) }));
    mod = require('../settlementController');
    req = { params: { id: '12' }, body: {} };
    res = makeRes();
    next = jest.fn();
    await mod.markPaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // success
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SELECT status/.test(sql)) return { rows: [{ status: 'pending' }] };
      return { rows: [{ id: 13, status: 'paid' }] };
    } }));
    mod = require('../settlementController');
    req = { params: { id: '13' }, body: { payment_notes: 'ok' } };
    res = makeRes();
    next = jest.fn();
    await mod.markPaid(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('cancelSettlement handles not found / already cancelled / invalid / success', async () => {
    // not found
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    let mod = require('../settlementController');
    let req = { params: { id: '20' } };
    let res = makeRes();
    let next = jest.fn();
    await mod.cancelSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // already cancelled
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'cancelled', total_payout: 0 }] }) }));
    mod = require('../settlementController');
    req = { params: { id: '21' } };
    res = makeRes();
    next = jest.fn();
    await mod.cancelSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // invalid (not pending and non-zero)
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ status: 'paid', total_payout: 10 }] }) }));
    mod = require('../settlementController');
    req = { params: { id: '22' } };
    res = makeRes();
    next = jest.fn();
    await mod.cancelSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // success (pending)
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SELECT status, total_payout/.test(sql)) return { rows: [{ status: 'pending', total_payout: 0 }] };
      return { rows: [{ id: 23 }] };
    } }));
    mod = require('../settlementController');
    req = { params: { id: '23' } };
    res = makeRes();
    next = jest.fn();
    await mod.cancelSettlement(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('createSettlement validation, no-products and success flows', async () => {
    // validation error path (getClient still called)
    const mockClient1 = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient1 }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => false, array: () => [{ msg: 'err' }] }) }));
    let mod = require('../settlementController');
    let req = { body: {} };
    let res = makeRes(); let next = jest.fn();
    await mod.createSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // no products -> rollback + 400
    jest.resetModules();
    const mockClient2 = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient2 }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    mod = require('../settlementController');
    req = { body: { consignor_id: 1, period_start: '2020-01-01', period_end: '2020-01-02' } };
    res = makeRes(); next = jest.fn();
    await mod.createSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient2.release).toHaveBeenCalled();

    // success path: commit and fire email lookup
    jest.resetModules();
    const products = [{ id: 1, name: 'P', sale_price: 100, commission_amount: 10, consignor_amount: 90, code: 'C' }];
    const mockClient3 = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: products })
        .mockResolvedValueOnce({ rows: [{ id: 99, code: 'QT-1', total_payout: 90 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient3,
      query: async (sql) => {
        if (/SELECT full_name, email FROM consignors/.test(sql)) return { rows: [{ full_name: 'X', email: 'a@x' }] };
        return { rows: [] };
      },
    }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    const sendMock = jest.fn();
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: sendMock }));
    mod = require('../settlementController');
    req = { body: { consignor_id: 1, period_start: '2020-01-01', period_end: '2020-01-02' } };
    res = makeRes(); next = jest.fn();
    await mod.createSettlement(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockClient3.release).toHaveBeenCalled();
  });

});
