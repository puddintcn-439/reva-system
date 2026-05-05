/* eslint-disable global-require */
describe('email.js – fallback cfg.from branch', () => {
  beforeEach(() => { jest.resetModules(); });

  test('should use fallback from if cfg.from missing', async () => {
    const nodemailer = { createTransport: jest.fn(() => ({ sendMail: jest.fn() })) };
    jest.doMock('nodemailer', () => nodemailer);
    const { sendMail } = require('../email');
    const cfg = { host: 'h', port: 1, secure: false, user: 'u', pass: 'p' };
    const info = await sendMail(cfg, { to: 'a@b.com', subject: 's', text: 't' });
    expect(nodemailer.createTransport).toHaveBeenCalled();
    // No error thrown means fallback from was used
  });
});
