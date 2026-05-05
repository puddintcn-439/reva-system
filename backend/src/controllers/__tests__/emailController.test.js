/* eslint-disable global-require */
describe('emailController', () => {
  beforeEach(() => { jest.resetModules(); });

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getTemplates returns data', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, name: 't' }] }) }));
    const { getTemplates } = require('../emailController');
    const req = {};
    const res = makeRes(); const next = jest.fn();
    await getTemplates(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('updateTemplate returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { updateTemplate } = require('../emailController');
    const req = { params: { key: 'x' }, body: {} };
    const res = makeRes(); const next = jest.fn();
    await updateTemplate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateTemplate returns row when updated', async () => {
    const updated = { key: 'k', name: 'n' };
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [updated] }) }));
    const { updateTemplate } = require('../emailController');
    const req = { params: { key: 'k' }, body: { subject: 's', body: 'b' } };
    const res = makeRes(); const next = jest.fn();
    await updateTemplate(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
  });

  test('createTemplate validates required fields', async () => {
    const { createTemplate } = require('../emailController');
    const req = { body: { key: '', name: '', subject: '', body: '' } };
    const res = makeRes(); const next = jest.fn();
    await createTemplate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createTemplate handles duplicate key', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw { code: '23505' }; } }));
    const { createTemplate } = require('../emailController');
    const req = { body: { key: 'a', name: 'n', subject: 's', body: 'b' } };
    const res = makeRes(); const next = jest.fn();
    await createTemplate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createTemplate returns 201 on success', async () => {
    const created = { key: 'a', name: 'n' };
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [created] }) }));
    const { createTemplate } = require('../emailController');
    const req = { body: { key: 'a', name: 'n', subject: 's', body: 'b' } };
    const res = makeRes(); const next = jest.fn();
    await createTemplate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: created }));
  });

  test('deleteTemplate returns 404 when missing', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { deleteTemplate } = require('../emailController');
    const req = { params: { key: 'x' } };
    const res = makeRes(); const next = jest.fn();
    await deleteTemplate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deleteTemplate succeeds', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ key: 'x' }] }) }));
    const { deleteTemplate } = require('../emailController');
    const req = { params: { key: 'x' } };
    const res = makeRes(); const next = jest.fn();
    await deleteTemplate(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getExpiringProducts returns rows', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1 }] }) }));
    const { getExpiringProducts } = require('../emailController');
    const req = { query: { days: '5' } };
    const res = makeRes(); const next = jest.fn();
    await getExpiringProducts(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('sendExpiringReminders returns 400 when template missing', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [] }) }));
    const { sendExpiringReminders } = require('../emailController');
    const req = { body: {} };
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('sendExpiringReminders no products returns sent 0', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/email_templates/.test(sql)) return { rows: [{ subject: 's', body: 'b' }] };
      return { rows: [] };
    } }));
    jest.doMock('../../config/email', () => ({ interpolate: (s) => s, sendMail: jest.fn().mockResolvedValue() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { sendExpiringReminders } = require('../emailController');
    const req = { body: {} };
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, sent: 0, skipped: 0 }));
  });

  test('sendExpiringReminders skips products without email', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/email_templates/.test(sql)) return { rows: [{ subject: 's', body: 'b' }] };
      return { rows: [{ id: 1, name: 'P', consignor_email: null, sale_price: 100, consign_end: '2026-05-01' }] };
    } }));
    jest.doMock('../../config/email', () => ({ interpolate: (s) => s, sendMail: jest.fn().mockResolvedValue() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { sendExpiringReminders } = require('../emailController');
    const req = { body: {} };
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, sent: 0, skipped: 1 }));
  });

  test('sendExpiringReminders sends and logs failures', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/email_templates/.test(sql)) return { rows: [{ subject: 's', body: 'b' }] };
      return { rows: [
        { id: 1, name: 'P', consignor_email: 'a@x', sale_price: 100, consign_end: '2026-05-01' },
        { id: 2, name: 'Q', consignor_email: 'b@x', sale_price: 200, consign_end: '2026-05-02' },
      ] };
    } }));
    const sendMock = jest.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('boom'));
    const loggerMock = { error: jest.fn() };
    jest.doMock('../../config/email', () => ({ interpolate: (s) => s, sendMail: sendMock }));
    jest.doMock('../../config/logger', () => loggerMock);
    const { sendExpiringReminders } = require('../emailController');
    const req = { body: {} };
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders(req, res, next);
    expect(sendMock).toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, sent: 1, skipped: 1 }));
  });

});
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
