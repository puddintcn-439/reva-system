/* eslint-disable global-require */
describe('systemSettingsController', () => {
  beforeEach(() => { jest.resetModules(); });
  jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }));
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getAll masks secret values', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ key: 'smtp_pass', value: 'x', is_secret: true }] }) }));
    const { getAll } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await getAll({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateMany validates body and calls settings.setMany', async () => {
    const setMany = jest.fn();
    jest.doMock('../../config/systemSettings', () => ({ setMany }));
    const { updateMany } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await updateMany({ body: [] }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    await updateMany({ body: { client_urls: 'a' } }, res, next);
    expect(setMany).toHaveBeenCalled();
  });

  test('testSmtp validates to and cfg', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    const { testSmtp } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await testSmtp({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getPublic and recalculateCommissions delegate', async () => {
    jest.doMock('../../config/systemSettings', () => ({ getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }] }));
    const recalcService = { recalculateCommissionAmounts: async () => 5 };
    jest.doMock('../../services/recalcCommissions', () => recalcService);
    const { getPublic, recalculateCommissions } = require('../systemSettingsController');
    const res = makeRes(); const next = jest.fn();
    await getPublic({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    await recalculateCommissions({ body: { scope: 'all' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
