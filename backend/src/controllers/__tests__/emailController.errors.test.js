/* eslint-disable global-require */
describe('emailController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── getTemplates error propagation (line 12) ─────────────────────────────
  test('getTemplates propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { getTemplates } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await getTemplates({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── updateTemplate error propagation (line 29) ───────────────────────────
  test('updateTemplate propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { updateTemplate } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await updateTemplate({ params: { key: 'tpl' }, body: { subject: 'S', body: 'B' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createTemplate non-23505 error propagation (line 49) ─────────────────
  test('createTemplate propagates non-duplicate db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('generic db fail'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { createTemplate } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await createTemplate({ body: { key: 'k', name: 'n', subject: 's', body: 'b' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── deleteTemplate error propagation (line 61) ───────────────────────────
  test('deleteTemplate propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { deleteTemplate } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await deleteTemplate({ params: { key: 'tpl' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getExpiringProducts error propagation (line 82) ──────────────────────
  test('getExpiringProducts propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { getExpiringProducts } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await getExpiringProducts({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── sendExpiringReminders with filterIds (lines 111-112) ─────────────────
  test('sendExpiringReminders uses filterIds when product_ids provided', async () => {
    let querySql = '';
    jest.doMock('../../config/database', () => ({
      query: async (sql, params) => {
        querySql = sql;
        if (/email_templates/.test(sql)) return { rows: [{ key: 'expiring_soon', subject: 'Hi {{full_name}}', body: 'Your {{product_name}} expires' }] };
        return { rows: [] }; // products query → no products
      },
    }));
    jest.doMock('../../config/email', () => ({
      interpolate: (tmpl, vars) => tmpl.replace(/{{(\w+)}}/g, (_, k) => vars[k] || ''),
      sendMail: jest.fn(),
    }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { sendExpiringReminders } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders({ body: { product_ids: [1, 2, 3] } }, res, next);
    // filterIds branch should have added AND p.id = ANY($2)
    expect(querySql).toContain('ANY');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── sendExpiringReminders error propagation (line 155) ───────────────────
  test('sendExpiringReminders propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    jest.doMock('../../config/email', () => ({ interpolate: jest.fn(), sendMail: jest.fn() }));
    jest.doMock('../../config/logger', () => ({ error: jest.fn() }));
    const { sendExpiringReminders } = require('../emailController');
    const res = makeRes(); const next = jest.fn();
    await sendExpiringReminders({ body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
