/* eslint-disable global-require */
describe('emailController', () => {
  beforeEach(() => { jest.resetModules(); });
  jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }));
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getTemplates and expiring products', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [{ id: 1 }] }) }));
    const { getTemplates, getExpiringProducts } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await getTemplates({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    await getExpiringProducts({ query: {} }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('createTemplate validation and duplicate key', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw { code: '23505' }; } }));
    const { createTemplate } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await createTemplate({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('sendExpiringReminders no template and product handling', async () => {
    const dbMock = jest.fn().mockImplementation(async (sql, params) => {
      if (/FROM email_templates/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    jest.doMock('../../config/database', () => ({ query: dbMock }));
    const { sendExpiringReminders } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

});
