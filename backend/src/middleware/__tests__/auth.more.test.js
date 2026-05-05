/* eslint-disable global-require */
describe('auth middleware – extra branches', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('authenticate returns 401 when user not found in DB', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 'secret' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => ({ id: 77 }) }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { authenticate } = require('../auth');
    const req = { headers: { authorization: 'Bearer validtoken' } };
    const res = makeRes(); const next = jest.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticate returns 401 when user is inactive', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 'secret' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => ({ id: 2 }) }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 2, is_active: false, username: 'u', role: 'staff' }] }),
    }));
    const { authenticate } = require('../auth');
    const req = { headers: { authorization: 'Bearer tok' } };
    const res = makeRes(); const next = jest.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('optionalAuth sets req.user when token valid and user active', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 'secret' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => ({ id: 5 }) }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 5, is_active: true, username: 'x', role: 'staff' }] }),
    }));
    const { optionalAuth } = require('../auth');
    const req = { headers: { authorization: 'Bearer validtok' } };
    const res = makeRes(); const next = jest.fn();
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(5);
  });

  test('optionalAuth continues but does not set req.user when token invalid', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 'secret' }));
    jest.doMock('jsonwebtoken', () => ({ verify: () => { throw new Error('bad'); } }));
    const { optionalAuth } = require('../auth');
    const req = { headers: { authorization: 'Bearer badtok' } };
    const res = makeRes(); const next = jest.fn();
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test('invalidatePermCache resets the cache', () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { invalidatePermCache } = require('../auth');
    // Just call it – should not throw
    expect(() => invalidatePermCache()).not.toThrow();
  });

  test('requirePermission returns 401 when no req.user', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { requirePermission } = require('../auth');
    const middleware = requirePermission('some:perm');
    const req = {}; // no user
    const res = makeRes(); const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
