/* eslint-disable global-require */
describe('settlementController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── lookupSettlement error propagation (line 70) ─────────────────────────
  test('lookupSettlement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { lookupSettlement } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await lookupSettlement({ query: { code: 'QT-001' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getSettlements error propagation (line 111) ─────────────────────────
  test('getSettlements propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { getSettlements } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await getSettlements({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createSettlement fire-and-forget email error (lines 183-185) ─────────
  test('createSettlement logs error when email lookup throws after commit', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, sale_price: 100, commission_amount: 10, consignor_amount: 90, name: 'P', code: 'SP-1' }] }) // SELECT products
        .mockResolvedValueOnce({ rows: [{ id: 99, code: 'QT-001', total_payout: 90, total_sale: 100, total_commission: 10 }] }) // INSERT settlement
        .mockResolvedValueOnce(undefined) // INSERT settlement_item
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => { throw new Error('email lookup fail'); }, // email lookup throws
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { createSettlement } = require('../settlementController');
    const req = { body: { consignor_id: 1, period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await createSettlement(req, res, next);
    // Response was sent
    expect(res.status).toHaveBeenCalledWith(201);
    // Fire-and-forget email lookup error logged (with small tick to let async complete)
    await new Promise((r) => setImmediate(r));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── createSettlement outer ROLLBACK + next (lines 187-188) ──────────────
  test('createSettlement propagates error via ROLLBACK and next()', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // SELECT products throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: jest.fn(),
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { createSettlement } = require('../settlementController');
    const req = { body: { consignor_id: 1, period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await createSettlement(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── bulkCreateSettlements email loop with email address (line 284) ────────
  test('bulkCreateSettlements calls _sendSettlementEmail when consignor email found', async () => {
    const mockQueryResponses = [
      undefined, // BEGIN
      { rows: [{ consignor_id: 1 }] }, // distinct consignors
      { rows: [{ id: 10, name: 'P', sale_price: 100, commission_amount: 10, consignor_amount: 90, code: 'C1' }] }, // products for consignor 1
      { rows: [{ id: 101, code: 'QT-001', total_payout: 90, total_sale: 100, total_commission: 10, period_start: '2024-01-01', period_end: '2024-01-31' }] }, // INSERT settlement
      undefined, // INSERT settlement_item
      undefined, // COMMIT
    ];
    let qi = 0;
    const mockClient = {
      query: jest.fn().mockImplementation(async () => {
        const r = mockQueryResponses[qi] || { rows: [] };
        qi++;
        return r;
      }),
      release: jest.fn(),
    };
    const mockSendTemplate = jest.fn();
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [{ full_name: 'Alice', email: 'alice@test.com' }] }), // email lookup returns email
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: mockSendTemplate }));
    jest.doMock('../../config/systemSettings', () => ({
      getSmtpConfig: async () => ({ host: 'smtp.test.com' }),
    }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    // Let the fire-and-forget _sendSettlementEmail settle
    await new Promise((r) => setImmediate(r));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── _sendSettlementEmail catch (line 29) – getSmtpConfig throws ──────────
  test('_sendSettlementEmail logs error when getSmtpConfig throws', async () => {
    const mockQueryResponses = [
      undefined, // BEGIN
      { rows: [{ consignor_id: 2 }] }, // distinct consignors
      { rows: [{ id: 20, name: 'Q', sale_price: 200, commission_amount: 20, consignor_amount: 180, code: 'C2' }] }, // products
      { rows: [{ id: 200, code: 'QT-002', total_payout: 180, total_sale: 200, total_commission: 20, period_start: '2024-01-01', period_end: '2024-01-31' }] }, // INSERT
      undefined, // settlement_item
      undefined, // COMMIT
    ];
    let qi = 0;
    const mockClient = {
      query: jest.fn().mockImplementation(async () => {
        const r = mockQueryResponses[qi] || { rows: [] };
        qi++;
        return r;
      }),
      release: jest.fn(),
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [{ full_name: 'Bob', email: 'bob@test.com' }] }),
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({
      getSmtpConfig: async () => { throw new Error('smtp config fail'); }, // throws inside _sendSettlementEmail
    }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    // Let fire-and-forget settle
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL] settlement_created trigger error'), expect.any(String));
    consoleSpy.mockRestore();
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── bulkCreateSettlements email loop error → console.error (line 287) ────
  test('bulkCreateSettlements logs error when email lookup throws', async () => {
    const mockQueryResponses = [
      undefined, // BEGIN
      { rows: [{ consignor_id: 3 }] }, // distinct consignors
      { rows: [{ id: 30, name: 'R', sale_price: 300, commission_amount: 30, consignor_amount: 270, code: 'C3' }] }, // products
      { rows: [{ id: 300, code: 'QT-003', total_payout: 270, total_sale: 300, total_commission: 30 }] }, // INSERT settlement
      undefined, // settlement_item
      undefined, // COMMIT
    ];
    let qi = 0;
    const mockClient = {
      query: jest.fn().mockImplementation(async () => {
        const r = mockQueryResponses[qi] || { rows: [] };
        qi++;
        return r;
      }),
      release: jest.fn(),
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => { throw new Error('email lookup fail'); }, // email lookup throws
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    await new Promise((r) => setImmediate(r));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── bulkCreateSettlements outer ROLLBACK + next (lines 291-292) ──────────
  test('bulkCreateSettlements propagates error via ROLLBACK and next()', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // SELECT consignors throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: jest.fn(),
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { bulkCreateSettlements } = require('../settlementController');
    const req = { body: { period_start: '2024-01-01', period_end: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await bulkCreateSettlements(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── markPaid error propagation (line 318) ────────────────────────────────
  test('markPaid propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { markPaid } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await markPaid({ params: { id: '1' }, body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── deleteSettlement error propagation (line 336) ────────────────────────
  test('deleteSettlement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { deleteSettlement } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await deleteSettlement({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getSettlement error propagation (line 360) ───────────────────────────
  test('getSettlement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { getSettlement } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await getSettlement({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── cancelSettlement error propagation (line 386) ────────────────────────
  test('cancelSettlement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: jest.fn() }));
    const { cancelSettlement } = require('../settlementController');
    const res = makeRes(); const next = jest.fn();
    await cancelSettlement({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
