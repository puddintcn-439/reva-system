/* eslint-disable global-require */
describe('authController', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('login returns 400 when validation fails', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => false, array: () => [{ msg: 'err' }] }) }));
    const { login } = require('../authController');
    const req = { body: {} };
    const res = makeRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, errors: expect.any(Array) }));
  });

  test('login returns 401 when user not found', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { login } = require('../authController');
    const req = { body: { username: 'nope', password: 'x' } };
    const res = makeRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('login returns 401 when password mismatch', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/FROM users/.test(sql)) return { rows: [{ id: 1, username: 'u', password: 'h', role: 'staff', is_active: true }] };
      return { rows: [] };
    } }));
    jest.doMock('bcryptjs', () => ({ compare: async () => false }));
    const { login } = require('../authController');
    const req = { body: { username: 'u', password: 'bad' } };
    const res = makeRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('login succeeds and returns token + user without password', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/FROM users/.test(sql)) return { rows: [{ id: 2, username: 'u', password: 'h', role: 'admin', full_name: 'F', email: 'e', is_active: true }] };
      if (/role_permissions/.test(sql)) return { rows: [{ permission: 'a' }, { permission: 'b' }] };
      return { rows: [] };
    } }));
    jest.doMock('bcryptjs', () => ({ compare: async () => true }));
    jest.doMock('jsonwebtoken', () => ({ sign: () => 'TOK' }));
    jest.doMock('../../config/systemSettings', () => ({ getJwtSecret: async () => 's' }));

    const { login } = require('../authController');
    const req = { body: { username: 'u', password: 'good' } };
    const res = makeRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'TOK' }));
    const out = res.json.mock.calls[0][0];
    expect(out.user).toBeDefined();
    expect(out.user.password).toBeUndefined();
    expect(out.user.permissions).toEqual(expect.arrayContaining(['a','b']));
  });

  test('getMe returns 401 when user not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { getMe } = require('../authController');
    const req = { user: { id: 9, role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await getMe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('getMe returns user with permissions', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/FROM users/.test(sql)) return { rows: [{ id: 3, username: 'x', full_name: 'F', email: 'e', role: 'staff', is_active: true }] };
      if (/role_permissions/.test(sql)) return { rows: [{ permission: 'p1' }] };
      return { rows: [] };
    } }));
    const { getMe } = require('../authController');
    const req = { user: { id: 3, role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await getMe(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const out = res.json.mock.calls[0][0];
    expect(out.user.permissions).toEqual(expect.arrayContaining(['p1']));
  });

  test('changePassword returns 400 on validation error', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => false, array: () => [] }) }));
    const { changePassword } = require('../authController');
    const req = { body: {}, user: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await changePassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('changePassword returns 400 when current password mismatch', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [{ password: 'h' }] }) }));
    jest.doMock('bcryptjs', () => ({ compare: async () => false }));
    const { changePassword } = require('../authController');
    const req = { body: { currentPassword: 'x', newPassword: 'y' }, user: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await changePassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('changePassword succeeds and updates password', async () => {
    jest.doMock('express-validator', () => ({ validationResult: () => ({ isEmpty: () => true }) }));
    const mockQueries = [];
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      mockQueries.push(sql);
      if (/SELECT password/.test(sql)) return { rows: [{ password: 'old' }] };
      return { rows: [] };
    } }));
    jest.doMock('bcryptjs', () => ({ compare: async () => true, hash: async () => 'newhash' }));
    const { changePassword } = require('../authController');
    const req = { body: { currentPassword: 'ok', newPassword: 'new' }, user: { id: 4 } };
    const res = makeRes();
    const next = jest.fn();
    await changePassword(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockQueries.some(q => /UPDATE users SET password/.test(q))).toBe(true);
  });

  test('createUser validates inputs and rejects invalid role', async () => {
    const { createUser } = require('../authController');
    const req = { body: { username: 'a', password: 'p', role: 'invalid' } };
    const res = makeRes();
    const next = jest.fn();
    await createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createUser returns 201 on success', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async () => 'h' }));
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 9, username: 'a' }] }) }));
    const { createUser } = require('../authController');
    const req = { body: { username: 'a', password: 'p', role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('createUser returns 409 on duplicate', async () => {
    jest.doMock('bcryptjs', () => ({ hash: async () => 'h' }));
    jest.doMock('../../config/database', () => ({ query: async () => { const e = new Error('dup'); e.code = '23505'; throw e; } }));
    const { createUser } = require('../authController');
    const req = { body: { username: 'a', password: 'p', role: 'staff' } };
    const res = makeRes();
    const next = jest.fn();
    await createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('updateUser rejects invalid role', async () => {
    const { updateUser } = require('../authController');
    const req = { body: { role: 'nope' }, params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await updateUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateUser returns 400 when nothing to update', async () => {
    const { updateUser } = require('../authController');
    const req = { body: {}, params: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await updateUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteUser prevents deleting self', async () => {
    const { deleteUser } = require('../authController');
    const req = { params: { id: '5' }, user: { id: 5 } };
    const res = makeRes();
    const next = jest.fn();
    await deleteUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteUser returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { deleteUser } = require('../authController');
    const req = { params: { id: '7' }, user: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await deleteUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deleteUser succeeds when found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 8 }] }) }));
    const { deleteUser } = require('../authController');
    const req = { params: { id: '8' }, user: { id: 1 } };
    const res = makeRes();
    const next = jest.fn();
    await deleteUser(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
