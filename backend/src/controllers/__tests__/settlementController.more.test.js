/* eslint-disable global-require */
describe('settlementController – bulkCreateSettlements', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
  });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('returns 400 when period dates missing', async () => {
    jest.doMock('../../config/database', () => ({ getClient: jest.fn() }));
    const { bulkCreateSettlements } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when no unsettled consignors found', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // no consignors
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('success path – one consignor created, one skipped (payout=0)', async () => {
    // consignors: [id=1, id=2]
    // id=1: payout > 0 -> created
    // id=2: payout = 0 -> skipped
    const mockQueryResponses = [
      undefined, // BEGIN
      { rows: [{ consignor_id: 1 }, { consignor_id: 2 }] }, // distinct consignors
      // for consignor 1:
      { rows: [{ id: 10, name: 'P', sale_price: 100, commission_amount: 10, consignor_amount: 90, code: 'C1' }] },
      { rows: [{ id: 101, code: 'QT-001', total_payout: 90 }] }, // INSERT settlement
      undefined, // INSERT settlement_item
      // for consignor 2:
      { rows: [{ id: 11, name: 'Q', sale_price: 50, commission_amount: 50, consignor_amount: 0, code: 'C2' }] },
      undefined, // COMMIT
    ];
    let qi = 0;
    const mockClient = {
      query: jest.fn().mockImplementation(async () => {
        const r = mockQueryResponses[qi] || { rows: [] };
        qi += 1;
        return r;
      }),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [] }), // email lookup
    }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    const out = res.json.mock.calls[0][0];
    expect(out.count).toBe(1);
    expect(out.skipped).toBe(1);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
