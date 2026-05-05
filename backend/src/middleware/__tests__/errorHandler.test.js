// Mock logger so importing errorHandler does not initialise pino transports
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn()
}))

const { errorHandler, createError } = require('../errorHandler')

describe('errorHandler middleware', () => {
  test('handles 500 errors and returns generic message in production', () => {
    const req = { method: 'GET', url: '/x', user: null, log: { error: jest.fn() } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const err = new Error('boom')
    err.statusCode = 500

    process.env.NODE_ENV = 'production'

    errorHandler(err, req, res, null)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalled()
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.message).toBe('Lỗi máy chủ nội bộ')
  })

  test('returns provided message for non-500 errors', () => {
    const req = { method: 'POST', url: '/y', user: null, log: { warn: jest.fn() } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const err = createError('Bad input', 400)

    process.env.NODE_ENV = 'development'

    errorHandler(err, req, res, null)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.message).toBe('Bad input')
    // In development, stack is included
    expect(body.stack).toBeDefined()
  })

  test('includes userId in log when available and createError default', () => {
    const logMock = { error: jest.fn() }
    const req = { method: 'GET', url: '/who', user: { id: 'user-1' }, log: logMock }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const err = new Error('server fail')
    // default status for createError is 400; ensure createError uses default
    const generated = createError('some', undefined)
    expect(generated.statusCode).toBe(400)

    err.statusCode = 500
    process.env.NODE_ENV = 'production'

    errorHandler(err, req, res, null)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(logMock.error).toHaveBeenCalled()
    const logged = logMock.error.mock.calls[0][0]
    expect(logged.userId).toBe('user-1')
  })

  test('falls back to global logger and uses default 500 when err.statusCode missing', () => {
    // require the mocked global logger
    const globalLogger = require('../../config/logger')
    const req = { method: 'GET', url: '/fallback', user: null }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const err = new Error('no status')

    delete process.env.NODE_ENV

    errorHandler(err, req, res, null)

    // global logger (mock) should have been used
    expect(globalLogger.error).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
