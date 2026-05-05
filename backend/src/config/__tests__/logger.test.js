/* eslint-disable global-require */
describe('logger', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
  });

  test('exports pino logger with common methods', () => {
    const logger = require('../logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
