/* eslint-disable global-require */
describe('systemSettingsController – extra branches', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('testSmtp succeeds when SMTP is fully configured', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const verify = jest.fn().mockResolvedValue(true);
    jest.doMock('nodemailer', () => ({
      createTransport: () => ({ verify, sendMail }),
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getSmtpConfig: async () => ({ host: 'smtp.test.com', port: 587, secure: false, user: 'u', pass: 'p', from: 'test@x' }),
    }));
    const { testSmtp } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await testSmtp({ body: { to: 'dest@x.com' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(verify).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalled();
  });

  test('testSmtp returns 400 when SMTP verify throws', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('auth failed'));
    jest.doMock('nodemailer', () => ({
      createTransport: () => ({ verify, sendMail: jest.fn() }),
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getSmtpConfig: async () => ({ host: 'h', port: 587, secure: false, user: 'u', pass: 'p' }),
    }));
    const { testSmtp } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await testSmtp({ body: { to: 'x@x.com' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Error propagation tests
  test('getAll propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('fail'); } }));
    const { getAll } = require('../systemSettingsController');
    const next = jest.fn();
    await getAll({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateMany propagates settings.setMany error', async () => {
    jest.doMock('../../config/systemSettings', () => ({ setMany: async () => { throw new Error('fail'); } }));
    const { updateMany } = require('../systemSettingsController');
    const next = jest.fn();
    await updateMany({ body: { smtp_host: 'x' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getPublic propagates settings.getCommissionTiers error', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => { throw new Error('fail'); } }));
    const { getPublic } = require('../systemSettingsController');
    const next = jest.fn();
    await getPublic({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('recalculateCommissions propagates service error', async () => {
    jest.doMock('../../services/recalcCommissions', () => ({ recalculateCommissionAmounts: async () => { throw new Error('fail'); } }));
    const { recalculateCommissions } = require('../systemSettingsController');
    const next = jest.fn();
    await recalculateCommissions({ body: {} }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('recalculateCommissions uses scope=all when specified', async () => {
    jest.doMock('../../services/recalcCommissions', () => ({ recalculateCommissionAmounts: async ({ scope }) => scope === 'all' ? 10 : 5 }));
    const { recalculateCommissions } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await recalculateCommissions({ body: { scope: 'all' } }, res, next);
    const out = res.json.mock.calls[0][0];
    expect(out.updated).toBe(10);
  });
});
