/* eslint-disable global-require */
describe('systemSettingsController – extra SMTP config coverage', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('testSmtp returns 400 if cfg.user or cfg.pass missing', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({ host: 'h' }) }));
    const { testSmtp } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await testSmtp({ body: { to: 'a@b.com' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
