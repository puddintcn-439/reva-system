const path = require('path')

// Mock the database module used by systemSettings
describe('systemSettings module', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.JWT_SECRET
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.SMTP_FROM
    delete process.env.CLIENT_URL
  })

  test('get returns DB value when present', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'k', value: 'v' }] }),
      getClient: jest.fn()
    }))
    const sys = require('../systemSettings')
    const res = await sys.get('k')
    expect(res).toBe('v')
  })

  test('get uses env fallback when DB value empty', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'e', value: '' }] }),
      getClient: jest.fn()
    }))
    process.env.MY_FALLBACK = 'from-env'
    const sys = require('../systemSettings')
    const res = await sys.get('e', 'MY_FALLBACK')
    expect(res).toBe('from-env')
  })

  test('getSmtpConfig prefers DB values and parses types', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [
        { key: 'smtp_host', value: 'smtp.db' },
        { key: 'smtp_port', value: '2525' },
        { key: 'smtp_secure', value: 'true' },
        { key: 'smtp_user', value: 'dbuser' },
        { key: 'smtp_pass', value: 'dbpass' },
        { key: 'smtp_from', value: 'Me <me@db>' }
      ]}),
      getClient: jest.fn()
    }))
    const sys = require('../systemSettings')
    const cfg = await sys.getSmtpConfig()
    expect(cfg.host).toBe('smtp.db')
    expect(cfg.port).toBe(2525)
    expect(cfg.secure).toBe(true)
    expect(cfg.user).toBe('dbuser')
    expect(cfg.pass).toBe('dbpass')
    expect(cfg.from).toBe('Me <me@db>')
  })

  test('getSmtpConfig falls back to env and default from', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      getClient: jest.fn()
    }))
    process.env.SMTP_HOST = 'smtp.env'
    process.env.SMTP_PORT = '1234'
    process.env.SMTP_SECURE = 'false'
    process.env.SMTP_USER = 'envuser'
    process.env.SMTP_PASS = 'envpass'
    // do not set SMTP_FROM to verify default
    const sys = require('../systemSettings')
    const cfg = await sys.getSmtpConfig()
    expect(cfg.host).toBe('smtp.env')
    expect(cfg.port).toBe(1234)
    expect(cfg.secure).toBe(false)
    expect(cfg.user).toBe('envuser')
    expect(cfg.pass).toBe('envpass')
    expect(cfg.from).toBe('REVA <noreply@reva.vn>')
  })

  test('getAllowedOrigins uses DB and appends vercel wildcard', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'client_urls', value: 'https://a.com, https://b.com' }] }),
      getClient: jest.fn()
    }))
    const sys = require('../systemSettings')
    const list = await sys.getAllowedOrigins()
    expect(list).toEqual(expect.arrayContaining(['https://a.com', 'https://b.com', 'https://*.vercel.app']))
  })

  test('getAllowedOrigins falls back to env and avoids duplicate vercel entry', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      getClient: jest.fn()
    }))
    process.env.CLIENT_URL = 'https://x.com, https://*.vercel.app'
    const sys = require('../systemSettings')
    const list = await sys.getAllowedOrigins()
    // should include x.com and vercel wildcard only once
    expect(list.filter(u => u === 'https://*.vercel.app').length).toBe(1)
    expect(list).toEqual(expect.arrayContaining(['https://x.com', 'https://*.vercel.app']))
  })

  test('loadAll handles DB errors and get returns empty when no env fallback', async () => {
    // simulate DB throwing (table missing) to exercise catch branch
    jest.doMock('../database', () => ({
      query: jest.fn().mockRejectedValue(new Error('no table')),
      getClient: jest.fn()
    }))
    const sys = require('../systemSettings')
    const res = await sys.get('missing')
    expect(res).toBe('')
  })

  test('getJwtSecret returns DB value, env fallback, or empty', async () => {
    // DB value present
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'jwt_secret', value: 'dbsecret' }] }),
      getClient: jest.fn()
    }))
    let sys = require('../systemSettings')
    let val = await sys.getJwtSecret()
    expect(val).toBe('dbsecret')

    // DB empty, env fallback
    jest.resetModules()
    jest.doMock('../database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), getClient: jest.fn() }))
    process.env.JWT_SECRET = 'envsecret'
    sys = require('../systemSettings')
    val = await sys.getJwtSecret()
    expect(val).toBe('envsecret')

    // DB empty, no env -> empty string
    jest.resetModules()
    jest.doMock('../database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), getClient: jest.fn() }))
    delete process.env.JWT_SECRET
    sys = require('../systemSettings')
    val = await sys.getJwtSecret()
    expect(val).toBe('')
  })

  test('set calls db.query and invalidates cache (observed via subsequent get)', async () => {
    // db.query should return success for INSERT and return rows for SELECT
    const q = jest.fn((sql) => {
      if (/SELECT\s+key/i.test(sql)) {
        return Promise.resolve({ rows: [{ key: 'k', value: 'newval' }] })
      }
      return Promise.resolve({})
    })
    jest.doMock('../database', () => ({ query: q, getClient: jest.fn() }))
    const sys = require('../systemSettings')
    await sys.set('k', 'newval')
    const val = await sys.get('k')
    expect(val).toBe('newval')
    // ensure the INSERT was called at least once
    expect(q).toHaveBeenCalled()
  })

  test('setMany commits transaction and releases client', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce() // insert 1
        .mockResolvedValueOnce() // insert 2
        .mockResolvedValueOnce(), // COMMIT
      release: jest.fn()
    }
    const dbMock = { getClient: jest.fn().mockResolvedValue(client) }
    jest.doMock('../database', () => dbMock)
    const sys = require('../systemSettings')
    await sys.setMany({ a: '1', b: '2' })
    expect(client.query).toHaveBeenCalled()
    expect(client.query.mock.calls[0][0]).toMatch(/BEGIN/)
    // Last call before release should be COMMIT
    expect(client.query.mock.calls.slice(-1)[0][0]).toMatch(/COMMIT/)
    expect(client.release).toHaveBeenCalled()
  })

  test('setMany rolls back on error and rethrows', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce() // insert 1
        .mockRejectedValueOnce(new Error('boom')) // insert 2 fails
        .mockResolvedValueOnce(), // ROLLBACK
      release: jest.fn()
    }
    const dbMock = { getClient: jest.fn().mockResolvedValue(client) }
    jest.doMock('../database', () => dbMock)
    const sys = require('../systemSettings')
    await expect(sys.setMany({ a: '1', b: '2' })).rejects.toThrow('boom')
    expect(client.query).toHaveBeenCalled()
    // ensure ROLLBACK was called (third or subsequent calls include ROLLBACK)
    expect(client.query.mock.calls.some(c => /ROLLBACK/.test(c[0]))).toBe(true)
    expect(client.release).toHaveBeenCalled()
  })

  test('getCommissionTiers parses JSON and falls back on invalid JSON', async () => {
    // valid JSON
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'commission_tiers', value: '[{"max":1}]' }] }),
      getClient: jest.fn()
    }))
    let sys = require('../systemSettings')
    let tiers = await sys.getCommissionTiers()
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers[0].max).toBe(1)

    // invalid JSON -> fallback default
    jest.resetModules()
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [{ key: 'commission_tiers', value: 'not-json' }] }),
      getClient: jest.fn()
    }))
    sys = require('../systemSettings')
    tiers = await sys.getCommissionTiers()
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length).toBeGreaterThanOrEqual(3)
  })

  test('getSmtpConfig uses default port 587 when missing', async () => {
    jest.doMock('../database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), getClient: jest.fn() }))
    // ensure no env SMTP_PORT
    delete process.env.SMTP_PORT
    delete process.env.SMTP_HOST
    const sys = require('../systemSettings')
    const cfg = await sys.getSmtpConfig()
    expect(cfg.port).toBe(587)
  })

  test('getAllowedOrigins falls back to localhost when DB and env missing', async () => {
    jest.doMock('../database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), getClient: jest.fn() }))
    delete process.env.CLIENT_URL
    const sys = require('../systemSettings')
    const list = await sys.getAllowedOrigins()
    expect(list).toEqual(expect.arrayContaining(['http://localhost:5173', 'https://*.vercel.app']))
  })

  test('setMany returns early on empty map without getting client', async () => {
    const getClient = jest.fn(() => { throw new Error('should not be called') })
    jest.doMock('../database', () => ({ getClient }))
    const sys = require('../systemSettings')
    await expect(sys.setMany({})).resolves.toBeUndefined()
    expect(getClient).not.toHaveBeenCalled()
  })

  test('getCommissionTiers returns default when DB has no value', async () => {
    jest.doMock('../database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), getClient: jest.fn() }))
    const sys = require('../systemSettings')
    const tiers = await sys.getCommissionTiers()
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers[0].label).toBeDefined()
  })

  test('loadAll maps DB rows including null values', async () => {
    jest.doMock('../database', () => ({
      query: jest.fn().mockResolvedValue({ rows: [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: null }
      ]}),
      getClient: jest.fn()
    }))
    const sys = require('../systemSettings')
    const a = await sys.get('a')
    const b = await sys.get('b')
    const c = await sys.get('c')
    expect(a).toBe('1')
    expect(b).toBe('2')
    expect(c).toBe('')
  })

})
