/* eslint-disable global-require */
describe('audit middleware', () => {
  beforeEach(() => { jest.resetModules(); });

  test('logs to db when response successful and user present', async () => {
    const db = { query: jest.fn().mockResolvedValue({}) };
    jest.doMock('../../config/database', () => db);
    const logger = { error: jest.fn() };
    jest.doMock('../../config/logger', () => logger);

    const { audit } = require('../audit');
    const req = { user: { id: 1, username: 'u' }, params: {}, body: {}, ip: '1.2.3.4' };
    const res = { statusCode: 200, json: jest.fn() };
    const next = jest.fn();

    const mw = audit('create', 'x');
    mw(req, res, next);
    // call wrapped json
    res.json({ success: true, data: { id: 1 } });
    // allow promise microtask
    await Promise.resolve();
    expect(db.query).toHaveBeenCalled();
  });

});
