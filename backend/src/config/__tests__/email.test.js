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

  test('sendMail sends via transporter when SMTP is configured', async () => {
    jest.resetModules();
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'real-id' });
    jest.doMock('nodemailer', () => ({
      createTransport: () => ({ sendMail }),
    }));
    jest.doMock('../systemSettings', () => ({
      getSmtpConfig: async () => ({ host: 'smtp.test', port: 587, secure: false, user: 'u', pass: 'p', from: 'from@x' }),
    }));
    jest.doMock('../logger', () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
    const email = require('../email');
    const info = await email.sendMail('to@x.com', 'Subject', 'Body text\nline2');
    expect(info.messageId).toBe('real-id');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@x.com', subject: 'Subject' }));
  });

  test('sendTemplateEmail sends when template is found', async () => {
    jest.resetModules();
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'tpl-id' });
    jest.doMock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));
    jest.doMock('../systemSettings', () => ({
      getSmtpConfig: async () => ({ host: 'smtp.test', port: 587, secure: false, user: 'u', pass: 'p', from: 'f@x' }),
    }));
    jest.doMock('../database', () => ({
      query: async () => ({ rows: [{ subject: 'Hello {{name}}', body: 'Hi {{name}}' }] }),
    }));
    jest.doMock('../logger', () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
    const email = require('../email');
    await expect(email.sendTemplateEmail('welcome', 'u@x.com', { name: 'Alice' })).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalled();
  });

  test('sendTemplateEmail catches and logs db errors silently', async () => {
    jest.resetModules();
    jest.doMock('../database', () => ({ query: async () => { throw new Error('db fail'); } }));
    jest.doMock('../systemSettings', () => ({ getSmtpConfig: async () => ({}) }));
    jest.doMock('../logger', () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
    const email = require('../email');
    await expect(email.sendTemplateEmail('tpl', 'u@x.com')).resolves.toBeUndefined();
  });
});
