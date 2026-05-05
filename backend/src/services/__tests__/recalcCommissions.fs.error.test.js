/* eslint-disable global-require */
describe('recalcCommissions.js – getClient error branch', () => {
  beforeEach(() => { jest.resetModules(); });

  test('throws if db.getClient fails', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, sale_price: 100 }] }),
      getClient: async () => { throw new Error('getClient fail'); }
    }));
    const { recalculateCommissionAmounts } = require('../recalcCommissions');
    await expect(recalculateCommissionAmounts({ scope: 'all' })).rejects.toThrow('getClient fail');
  });
});
