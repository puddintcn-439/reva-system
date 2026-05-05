// Prevent pino transport initialization during tests by mocking logger
jest.doMock('../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))
// Avoid hitting DB when initializing CORS in app; return empty allowed origins by default
jest.doMock('../config/systemSettings', () => ({ getAllowedOrigins: async () => [] }))

describe('app basic routes', () => {
  afterEach(() => jest.resetModules())

  test('GET /docs.json returns swagger spec', async () => {
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/docs.json')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body.openapi).toBe('3.0.0')
  }, 20000)

  test('GET /health returns 200 when DB ok', async () => {
    jest.resetModules()
    jest.doMock('../config/database', () => ({ query: jest.fn().mockResolvedValue({ rows: [1] }) }))
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.db).toBe('connected')
  })

  test('GET /health returns 503 when DB throws', async () => {
    jest.resetModules()
    jest.doMock('../config/database', () => ({ query: jest.fn().mockRejectedValue(new Error('down')) }))
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/health')
    expect(res.status).toBe(503)
    expect(res.body.status).toBe('error')
    expect(res.body.db).toBe('disconnected')
  })

  test('404 handler', async () => {
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/nope')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('CORS allows exact origin from sysSettings', async () => {
    jest.resetModules()
    jest.doMock('../config/systemSettings', () => ({ getAllowedOrigins: async () => ['http://allowed.example'] }))
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/docs.json').set('Origin', 'http://allowed.example')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.example')
  })

  test('CORS allows wildcard vercel origin', async () => {
    jest.resetModules()
    jest.doMock('../config/systemSettings', () => ({ getAllowedOrigins: async () => ['https://*.vercel.app'] }))
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/docs.json').set('Origin', 'https://preview.vercel.app')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://preview.vercel.app')
  })

  test('CORS falls back to CLIENT_URL on sysSettings error', async () => {
    jest.resetModules()
    jest.doMock('../config/systemSettings', () => ({ getAllowedOrigins: async () => { throw new Error('db') } }))
    process.env.CLIENT_URL = 'http://fallback.local'
    const request = require('supertest')
    const app = require('../app')

    const res = await request(app).get('/docs.json').set('Origin', 'http://fallback.local')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://fallback.local')
    delete process.env.CLIENT_URL
  })

  test('pino-http branch initialises in non-test env', async () => {
    jest.resetModules()
    process.env.NODE_ENV = 'development'
    const mockPinoHttp = jest.fn(() => (req, res, next) => next())
    jest.doMock('pino-http', () => mockPinoHttp)
    jest.doMock('../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))

    const request = require('supertest')
    const app = require('../app')

    expect(require('pino-http')).toHaveBeenCalled()
    const res = await request(app).get('/docs.json')
    expect(res.status).toBe(200)
    delete process.env.NODE_ENV
  })
})
