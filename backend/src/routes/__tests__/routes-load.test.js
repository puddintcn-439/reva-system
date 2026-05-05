/* eslint-disable global-require */
describe('routes load', () => {
  beforeEach(() => { jest.resetModules(); });

  // prevent pino transport resolution
  jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }));

  test('require all route modules', () => {
    const routes = [
      '../auth', '../products', '../consignments', '../settlements', '../locations',
      '../announcements', '../purchases', '../consignors', '../pos', '../email',
      '../banks', '../systemSettings', '../upload'
    ];
    for (const r of routes) {
      const mod = require(r);
      expect(mod).toBeDefined();
    }
  });

});
