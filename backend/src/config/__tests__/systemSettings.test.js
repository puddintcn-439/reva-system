const path = require('path')

// Mock the database module used by systemSettings
describe('systemSettings.getJwtSecret', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.JWT_SECRET
  })

  test('returns DB value if present', async () => {
    jest.resetModules()
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'jwt_secret', value: 'from-db-secret' }] }),
      getClient: jest.fn()
    }))
    const sysSettings = require('../systemSettings')
    const val = await sysSettings.getJwtSecret()
    expect(val).toBe('from-db-secret')
  })

  test('returns environment JWT_SECRET if DB empty', async () => {
    jest.resetModules()
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      getClient: jest.fn()
    }))
    process.env.JWT_SECRET = 'from-env'
    const sysSettings = require('../systemSettings')
    const val = await sysSettings.getJwtSecret()
    expect(val).toBe('from-env')
  })

  test('returns empty string when no secret configured', async () => {
    jest.resetModules()
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      getClient: jest.fn()
    }))
    delete process.env.JWT_SECRET
    const sysSettings = require('../systemSettings')
    const val = await sysSettings.getJwtSecret()
    expect(val).toBe('')
  })
})
