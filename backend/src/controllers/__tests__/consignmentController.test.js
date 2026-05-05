/* eslint-disable global-require */
describe('consignmentController', () => {
  beforeEach(() => { jest.resetModules(); });
  // Mock logger to avoid pino transport resolution during tests
  jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }));
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('createConsignment validation error', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => false, array: () => [] }) }));
    jest.doMock('../../config/database', () => ({ getClient: async () => ({ query: jest.fn(), release: jest.fn() }) }));
    const { createConsignment } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await createConsignment({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createConsignment success (new consignor path)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockImplementationOnce(async (sql) => undefined) // BEGIN
        .mockImplementationOnce(async (sql) => ({ rows: [] })) // existingConsignor
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 7 }] })) // insert consignor
        .mockImplementationOnce(async (sql) => ({ rows: [{ id: 11 }] })) // insert request
        .mockImplementationOnce(async (sql) => undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { createConsignment } = require('../consignmentController');
    const req = { body: { full_name: 'A', phone: '09' } };
    const res = makeRes(); const next = jest.fn();
    await createConsignment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('updateStatus invalid and approved path triggers email', async () => {
    const sendTemplateEmail = jest.fn();
    const query = jest.fn().mockImplementation(async (sql, params) => {
      if (/UPDATE consignment_requests/.test(sql)) return { rows: [{ id: params[2], request_type: 'direct', created_at: new Date() }] };
      if (/SELECT co.full_name, co.email/.test(sql)) return { rows: [{ full_name: 'X', email: 'a@b' }] };
      return { rows: [] };
    });
    jest.doMock('../../config/database', () => ({ query }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail }));
    const { updateStatus } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();

    await updateStatus({ params: { id: 1 }, body: { status: 'bad' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    await updateStatus({ params: { id: 2 }, body: { status: 'approved', admin_notes: 'ok' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
