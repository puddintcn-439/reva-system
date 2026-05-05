/* eslint-disable global-require */
describe('recalcCommissions – extra coverage', () => {
  beforeEach(() => { jest.resetModules(); });

  test('returns 0 when no rows for scope=all', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { recalculateCommissionAmounts } = require('../recalcCommissions');
    const res = await recalculateCommissionAmounts({ scope: 'all' });
    expect(res).toBe(0);
  });
});
