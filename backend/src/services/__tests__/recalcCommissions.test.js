/* eslint-disable global-require */
describe('recalcCommissions service', () => {
  beforeEach(() => { jest.resetModules(); });

  test('returns 0 when no rows', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { recalculateCommissionAmounts } = require('../../services/recalcCommissions');
    const res = await recalculateCommissionAmounts({ scope: 'active' });
    expect(res).toBe(0);
  });

  test('updates rows and returns count', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    const mockClient = { query: jest.fn().mockImplementation(async (sql) => undefined), release: jest.fn() };
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, sale_price: 100 }] }), getClient: async () => mockClient }));
    const { recalculateCommissionAmounts } = require('../../services/recalcCommissions');
    const res = await recalculateCommissionAmounts({ scope: 'active' });
    expect(res).toBe(1);
    expect(mockClient.query).toHaveBeenCalled();
  });

  test('skips invalid price rows and releases client', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    const mockClient = { query: jest.fn().mockResolvedValue(undefined), release: jest.fn() };
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, sale_price: null }, { id: 2, sale_price: 'abc' }] }), getClient: async () => mockClient }));
    const { recalculateCommissionAmounts } = require('../../services/recalcCommissions');
    const res = await recalculateCommissionAmounts({ scope: 'active' });
    expect(res).toBe(0);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('rolls back and throws when update fails', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    const mockClient = {
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql === 'BEGIN') return;
        if (/UPDATE products SET commission_amount/.test(sql)) throw new Error('db update failed');
        if (sql === 'ROLLBACK') return;
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, sale_price: 100 }] }), getClient: async () => mockClient }));
    const { recalculateCommissionAmounts } = require('../../services/recalcCommissions');
    await expect(recalculateCommissionAmounts({ scope: 'active' })).rejects.toThrow('db update failed');
    expect(mockClient.query).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

});
