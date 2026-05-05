/* eslint-disable global-require */
describe('auth middleware', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('authenticate rejects missing Authorization header', async () => {
    const { authenticate } = require('../auth');
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate rejects invalid token', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 's' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => { throw new Error('bad') } }));
    const { authenticate } = require('../auth');
    const req = { headers: { authorization: 'Bearer bad' } };
    const res = makeRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate sets req.user for valid token and active user', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 's' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => ({ id: 2 }) }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 2, username: 'u', full_name: 'U', email: 'u@x', role: 'admin', is_active: true }] }) }));
    const { authenticate } = require('../auth');
    const req = { headers: { authorization: 'Bearer token' } };
    const res = makeRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(2);
  });

  test('optionalAuth continues when no token', async () => {
    const { optionalAuth } = require('../auth');
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test('requireAdmin blocks non-admin roles', () => {
    const { requireAdmin } = require('../auth');
    const req = { user: { role: 'cashier' } };
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('requireStaff allows staff and admin', () => {
    const { requireStaff } = require('../auth');
    const res = makeRes();
    const next = jest.fn();
    let req = { user: { role: 'staff' } };
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
    const next2 = jest.fn();
    req = { user: { role: 'admin' } };
    requireStaff(req, res, next2);
    expect(next2).toHaveBeenCalled();
  });

  test('requirePermission denies when permission missing', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ role: 'staff', permission: 'other:perm' }] }) }));
    const { requirePermission } = require('../auth');
    const middleware = requirePermission('need:perm');
    const req = { user: { role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('requirePermission allows when permission present', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ role: 'staff', permission: 'need:perm' }] }) }));
    const { requirePermission } = require('../auth');
    const middleware = requirePermission('need:perm');
    const req = { user: { role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
