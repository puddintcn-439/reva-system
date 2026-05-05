/* eslint-disable global-require */
describe('audit middleware – extra coverage', () => {
  beforeEach(() => { jest.resetModules(); });

  // Line 38: db.query().catch → logger.error when audit insert fails
  test('logs error via logger when audit db.query fails', async () => {
    const logger = { error: jest.fn() };
    jest.doMock('../../config/logger', () => logger);
    let rejectFn;
    const failingPromise = new Promise((_, rej) => { rejectFn = rej; });
    const db = { query: jest.fn().mockReturnValue(failingPromise) };
    jest.doMock('../../config/database', () => db);

    const { audit } = require('../audit');
    const req = { user: { id: 1, username: 'u' }, params: {}, body: {}, ip: '1.2.3.4' };
    const res = { statusCode: 200, json: jest.fn() };
    const next = jest.fn();

    const mw = audit('create', 'x');
    mw(req, res, next);
    res.json({ success: true, data: { id: 1 } });

    // Reject the audit insert promise
    rejectFn(new Error('audit insert failed'));

    // Wait for the .catch to run
    await new Promise((r) => setImmediate(r));
    expect(logger.error).toHaveBeenCalled();
  });
});
