/* eslint-disable global-require */
describe('authController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── getPermissions catch → return [] (line 17) ───────────────────────────
  test('login succeeds even when getPermissions db.query throws (returns [])', async () => {
    let call = 0;
    jest.doMock('../../config/database', () => ({
      query: async () => {
        call++;
        if (call === 1) return { rows: [{ id: 1, username: 'admin', password: '$2a$10$someHashedPassword', role: 'admin' }] };
        throw new Error('role_permissions table missing'); // getPermissions throws
      },
    }));
    jest.doMock('bcryptjs', () => ({ compare: async () => true, hash: async (p) => p }));
    jest.doMock('../../config/systemSettings', () => ({
      getJwtSecret: async () => 'secret',
    }));
    jest.doMock('jsonwebtoken', () => ({ sign: () => 'tok', verify: () => ({ id: 1, role: 'admin' }) }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { login } = require('../authController');
    const req = { body: { username: 'admin', password: 'pass' } };
    const res = makeRes(); const next = jest.fn();
    await login(req, res, next);
    // Should still succeed (getPermissions returns [] on error)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── login error propagation ──────────────────────────────────────────────
  test('login propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 'secret' }));
    const { login } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await login({ body: { username: 'u', password: 'p' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getMe error propagation ──────────────────────────────────────────────
  test('getMe propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getMe } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await getMe({ user: { id: 1, role: 'admin' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── changePassword error propagation ─────────────────────────────────────
  test('changePassword propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const { changePassword } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await changePassword({ body: { currentPassword: 'old', newPassword: 'new' }, user: { id: 1 } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getUsers error propagation ───────────────────────────────────────────
  test('getUsers propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getUsers } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await getUsers({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createUser missing fields (line 129) ─────────────────────────────────
  test('createUser returns 400 when username/password/role missing', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { createUser } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await createUser({ body: { username: 'u' } }, res, next); // missing password and role
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ─── createUser generic db error (not 23505) → next(err) (line 146) ──────
  test('createUser propagates non-23505 db error', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async (p) => p, compare: async () => true }));
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('generic db fail'); },
    }));
    const { createUser } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await createUser({ body: { username: 'u', password: 'p', role: 'staff' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── updateUser error propagation ─────────────────────────────────────────
  test('updateUser propagates db error', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async (p) => p }));
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { updateUser } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await updateUser({ params: { id: '2' }, body: { full_name: 'Alice' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── deleteUser error propagation ─────────────────────────────────────────
  test('deleteUser propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { deleteUser } = require('../authController');
    const res = makeRes(); const next = jest.fn();
    await deleteUser({ params: { id: '99' }, user: { id: 1 } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
