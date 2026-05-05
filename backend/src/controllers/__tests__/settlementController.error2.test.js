/* eslint-disable global-require */
describe('settlementController.js – error branches', () => {
  beforeEach(() => { jest.resetModules(); });

  test('createSettlement handles db error', async () => {
    jest.doMock('../../config/database', () => ({ getClient: async () => { throw new Error('db fail'); } }));
    const { createSettlement } = require('../settlementController');
    const req = { body: { consignor_id: 1, period_start: '2023-01-01', period_end: '2023-01-31' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await createSettlement(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('createSettlement handles email error', async () => {
    jest.doMock('../../config/database', () => ({
      getClient: async () => ({
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
        release: jest.fn()
      }),
      query: async () => ({ rows: [{ id: 1, sale_price: 100, commission_amount: 10, consignor_amount: 90 }] })
    }));
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: () => { throw new Error('email fail'); } }));
    const { createSettlement } = require('../settlementController');
    const req = { body: { consignor_id: 1, period_start: '2023-01-01', period_end: '2023-01-31' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await createSettlement(req, res, next);
    // Should not throw, just log error
    expect(res.status).not.toHaveBeenCalledWith(500);
  });
});
