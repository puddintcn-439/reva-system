/* eslint-disable global-require */
describe('logger.js – pino transport branch', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
  });

  test('should use pino-pretty transport in dev', () => {
    const pino = jest.fn(() => ({}));
    pino.stdTimeFunctions = { isoTime: jest.fn() };
    jest.doMock('pino', () => pino);
    const logger = require('../logger');
    expect(pino).toHaveBeenCalledWith(expect.objectContaining({
      transport: expect.any(Object)
    }));
  });
});
