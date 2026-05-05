/* eslint-disable global-require */
describe('consignmentController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── createConsignment ROLLBACK + next(err) (lines 64-65) ─────────────────
  test('createConsignment propagates error via ROLLBACK and next()', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // existingConsignor SELECT throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn() }));
    const { createConsignment } = require('../consignmentController');
    const req = { body: { full_name: 'A', phone: '0901234567', request_type: 'direct' } };
    const res = makeRes(); const next = jest.fn();
    await createConsignment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── getConsignments error propagation (line 108) ─────────────────────────
  test('getConsignments propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn() }));
    const { getConsignments } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignments({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getConsignment error propagation (line 129) ──────────────────────────
  test('getConsignment propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn() }));
    const { getConsignment } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignment({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── updateStatus fire-and-forget email error → logger.error (lines 172-173) ─
  test('updateStatus logs error when approved email lookup throws', async () => {
    let call = 0;
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        call++;
        if (call === 1) return { rows: [{ id: 5, status: 'approved', request_type: 'direct' }] }; // UPDATE consignment_requests
        throw new Error('lookup fail'); // SELECT consignors throws
      },
    }));
    const mockLogger = { error: jest.fn(), info: jest.fn() };
    jest.doMock('../../config/logger', () => mockLogger);
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { updateStatus } = require('../consignmentController');
    const req = { params: { id: '5' }, body: { status: 'approved', admin_notes: '' } };
    const res = makeRes(); const next = jest.fn();
    await updateStatus(req, res, next);
    // Response should have been sent
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // Logger error should have been called for the email failure
    // (may be async fire-and-forget, give it a tick)
    await new Promise((r) => setImmediate(r));
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // ─── updateStatus outer error propagation (line 176) ─────────────────────
  test('updateStatus propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn() }));
    const { updateStatus } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await updateStatus({ params: { id: '1' }, body: { status: 'approved' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
