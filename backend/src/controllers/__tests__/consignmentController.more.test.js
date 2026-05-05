/* eslint-disable global-require */
describe('consignmentController – extra branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../config/logger', () => ({
      info: jest.fn(), error: jest.fn(),
      child: () => ({ info: jest.fn(), error: jest.fn() }),
    }));
  });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getConsignments without status filter', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
        return { rows: [{ id: 1 }, { id: 2 }] };
      },
    }));
    const { getConsignments } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignments({ query: {} }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getConsignments with status filter', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 3 }] };
      },
    }));
    const { getConsignments } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignments({ query: { status: 'pending', page: '2', limit: '5' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getConsignment returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { getConsignment } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignment({ params: { id: '99' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getConsignment returns data when found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 5, full_name: 'A' }] }),
    }));
    const { getConsignment } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await getConsignment({ params: { id: '5' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('createConsignment success – existing consignor path', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // existing consignor found
        .mockResolvedValueOnce(undefined) // UPDATE consignors
        .mockResolvedValueOnce({ rows: [{ id: 20, consignor_id: 10 }] }) // INSERT request
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    const { createConsignment } = require('../consignmentController');
    const req = { body: { full_name: 'B', phone: '0912', email: 'b@x.com', address: 'addr', request_type: 'online', location_id: '', scheduled_date: '' } };
    const res = makeRes(); const next = jest.fn();
    await createConsignment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('updateStatus no email when consignor has no email', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql, params) => {
        if (/UPDATE consignment_requests/.test(sql)) return { rows: [{ id: params[2], request_type: 'direct', created_at: new Date() }] };
        // consignor has no email
        if (/SELECT co.full_name/.test(sql)) return { rows: [{ full_name: 'X', email: null }] };
        return { rows: [] };
      },
    }));
    jest.doMock('../../config/email', () => ({ sendTemplateEmail: jest.fn() }));
    const { updateStatus } = require('../consignmentController');
    const res = makeRes(); const next = jest.fn();
    await updateStatus({ params: { id: 3 }, body: { status: 'approved', admin_notes: '' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
