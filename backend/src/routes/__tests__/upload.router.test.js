/* eslint-disable global-require */
describe('upload router', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_KEY
    delete process.env.SUPABASE_BUCKET
  })

  test('POST /upload/image returns 400 when no file', async () => {
    jest.resetModules()
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))
    jest.doMock('../../middleware/auth', () => ({ authenticate: (req, res, next) => next() }))
    // mock multer to call next without attaching req.file
    jest.doMock('multer', () => {
      const fn = () => ({ single: () => (req, res, next) => next() })
      fn.memoryStorage = jest.fn()
      return fn
    })

    const express = require('express')
    const uploadRouter = require('../../routes/upload')
    const request = require('supertest')
    const app = express()
    app.use(express.json())
    app.use('/upload', uploadRouter)

    const res = await request(app).post('/upload/image')
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Không có file/i)
  })

  test('POST /upload/image uses supabase when env present', async () => {
    jest.resetModules()
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))
    jest.doMock('../../middleware/auth', () => ({ authenticate: (req, res, next) => next() }))
    // mock multer to attach req.file
    jest.doMock('multer', () => {
      const fn = () => ({ single: () => (req, res, next) => { req.file = { buffer: Buffer.from('a'), originalname: 'file.png', mimetype: 'image/png' }; next() } })
      fn.memoryStorage = jest.fn()
      return fn
    })

    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_KEY = 'svc'
    process.env.SUPABASE_BUCKET = 'products'

    global.fetch = jest.fn().mockResolvedValue({ ok: true })

    const express = require('express')
    const uploadRouter = require('../../routes/upload')
    const request = require('supertest')
    const app = express()
    app.use(express.json())
    app.use('/upload', uploadRouter)

    const res = await request(app).post('/upload/image')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.url).toMatch(/^https:\/\/supabase\.test\/storage\/v1\/object\/public\/products\/images\/.*\.png$/)

    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_KEY
    delete process.env.SUPABASE_BUCKET
    delete global.fetch
  })

  test('POST /upload/image falls back to local save when no SUPABASE env', async () => {
    jest.resetModules()
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))
    jest.doMock('../../middleware/auth', () => ({ authenticate: (req, res, next) => next() }))
    jest.doMock('multer', () => {
      const fn = () => ({ single: () => (req, res, next) => { req.file = { buffer: Buffer.from('a'), originalname: 'file.png', mimetype: 'image/png' }; next() } })
      fn.memoryStorage = jest.fn()
      return fn
    })

    const fs = require('fs')
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const express = require('express')
    const uploadRouter = require('../../routes/upload')
    const request = require('supertest')
    const app = express()
    app.use(express.json())
    app.use('/upload', uploadRouter)

    const res = await request(app).post('/upload/image')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.url).toMatch(/^\/uploads\//)

    fs.existsSync.mockRestore()
    fs.mkdirSync.mockRestore()
    fs.writeFileSync.mockRestore()
  })

  test('POST /upload/image returns file size limit error', async () => {
    jest.resetModules()
    jest.doMock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), child: () => ({ info: jest.fn(), error: jest.fn() }) }))
    jest.doMock('../../middleware/auth', () => ({ authenticate: (req, res, next) => next() }))
    // multer middleware will call next(err) with code LIMIT_FILE_SIZE
    jest.doMock('multer', () => {
      const fn = () => ({ single: () => (req, res, next) => { const err = new Error('Too large'); err.code = 'LIMIT_FILE_SIZE'; next(err); } })
      fn.memoryStorage = jest.fn()
      return fn
    })

    const express = require('express')
    const uploadRouter = require('../../routes/upload')
    const request = require('supertest')
    const app = express()
    app.use(express.json())
    app.use('/upload', uploadRouter)

    const res = await request(app).post('/upload/image')
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/quá lớn/i)
  })

})
