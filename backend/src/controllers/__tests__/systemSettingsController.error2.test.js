/* eslint-disable global-require */
describe('systemSettingsController.js – error branches', () => {
  beforeEach(() => { jest.resetModules(); });

  test('updateMany handles setMany error', async () => {
    jest.doMock('../../config/systemSettings', () => ({ setMany: async () => { throw new Error('setMany fail'); } }));
    const { updateMany } = require('../systemSettingsController');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await updateMany({ body: { smtp_host: 'h' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('testSmtp handles getSmtpConfig error', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => { throw new Error('smtp fail'); } }));
    const { testSmtp } = require('../systemSettingsController');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await testSmtp({ body: { to: 'a@b.com' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
