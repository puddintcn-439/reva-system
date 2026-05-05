/* eslint-disable global-require */
describe('email helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    // mock logger to avoid pino transport resolution during tests
    jest.doMock('../logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));
  });

  test('interpolate replaces placeholders and leaves unknown intact', () => {
    const email = require('../email');
    expect(email.interpolate('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice');
    expect(email.interpolate('Missing {{x}}', {})).toBe('Missing {{x}}');
  });

  test('sendMail returns dev-console when no SMTP configured', async () => {
    jest.resetModules();
    jest.doMock('../systemSettings', () => ({ getSmtpConfig: async () => ({ host: '', user: '', pass: '' }) }));
    const email = require('../email');
    const res = await email.sendMail('test@x.com', 'sub', 'body');
    expect(res).toHaveProperty('messageId', 'dev-console');
  });

  test('sendTemplateEmail does nothing when no recipient', async () => {
    jest.resetModules();
    const email = require('../email');
    await expect(email.sendTemplateEmail('any', null)).resolves.toBeUndefined();
  });

  test('sendTemplateEmail logs and returns when template not found', async () => {
    jest.resetModules();
    jest.doMock('../systemSettings', () => ({ getSmtpConfig: async () => ({ host: '', user: '', pass: '' }) }));
    jest.doMock('../database', () => ({ query: async () => ({ rows: [] }) }));
    const email = require('../email');
    await expect(email.sendTemplateEmail('not_found', 'user@x.com')).resolves.toBeUndefined();
  });
});
