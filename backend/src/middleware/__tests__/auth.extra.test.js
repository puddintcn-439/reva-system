/* eslint-disable global-require */
describe('auth middleware – extra coverage', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // Line 89: requireAdmin allows admin roles
  test('requireAdmin allows admin role and calls next', () => {
    const { requireAdmin } = require('../auth');
    const req = { user: { role: 'admin' } };
    const res = makeRes(); const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireAdmin allows superadmin role and calls next', () => {
    const { requireAdmin } = require('../auth');
    const req = { user: { role: 'superadmin' } };
    const res = makeRes(); const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // Line 98: requireStaff blocks non-staff roles
  test('requireStaff blocks cashier role with 403', () => {
    const { requireStaff } = require('../auth');
    const req = { user: { role: 'cashier' } };
    const res = makeRes(); const next = jest.fn();
    requireStaff(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // Line 122: requirePermission propagates db error via next(err)
  test('requirePermission propagates db error via next(err)', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db error'); },
    }));
    const { requirePermission } = require('../auth');
    const middleware = requirePermission('some:perm');
    const req = { user: { role: 'staff' } };
    const res = makeRes(); const next = jest.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
