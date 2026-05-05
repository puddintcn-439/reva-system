/* eslint-disable global-require */
describe('authController – extra branches', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getUsers returns list of users', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, username: 'a', role: 'admin' }] }),
    }));
    const { getUsers } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await getUsers({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, users: expect.any(Array) }));
  });

  test('updateUser success path with all fields', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async () => 'hashed' }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 3, username: 'u', role: 'staff', is_active: true }] }),
    }));
    const { updateUser } = require('../authController');
    const req = {
      params: { id: '3' },
      body: { full_name: 'F', email: 'f@x.com', role: 'staff', is_active: true, location_id: null, password: 'newpass' },
    };
    const res = makeRes(); const next = jest.fn();
    await updateUser(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('updateUser 404 when user not found', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async () => 'h' }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { updateUser } = require('../authController');
    const req = { params: { id: '99' }, body: { full_name: 'X' } };
    const res = makeRes(); const next = jest.fn();
    await updateUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateUser with location_id in body (null value)', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 4, username: 'u' }] }),
    }));
    const { updateUser } = require('../authController');
    // location_id explicitly in body as undefined (truthy "in req.body" check)
    const req = { params: { id: '4' }, body: { location_id: null, full_name: 'U' } };
    const res = makeRes(); const next = jest.fn();
    await updateUser(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
