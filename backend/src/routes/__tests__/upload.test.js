const { uploadToSupabase, saveLocally } = require('../../routes/upload')

describe('upload helpers', () => {
  afterEach(() => {
    jest.resetAllMocks()
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_KEY
    delete process.env.SUPABASE_BUCKET
  })

  test('uploadToSupabase success returns URL', async () => {
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_KEY = 'svc'
    process.env.SUPABASE_BUCKET = 'products'

    global.fetch = jest.fn().mockResolvedValue({ ok: true })

    const url = await uploadToSupabase(Buffer.from('a'), 'image/png', 'file.png')

    expect(global.fetch).toHaveBeenCalled()
    expect(url).toBe('https://supabase.test/storage/v1/object/public/products/images/file.png')
  })

  test('uploadToSupabase throws when supabase returns non-ok', async () => {
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_KEY = 'svc'
    process.env.SUPABASE_BUCKET = 'products'

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'bad' })

    await expect(uploadToSupabase(Buffer.from('a'), 'image/png', 'file.png'))
      .rejects.toThrow('Supabase Storage error 500: bad')
  })

  test('saveLocally writes file and returns path', () => {
    const fs = require('fs')
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const url = saveLocally(Buffer.from('a'), 'file.png')
    expect(url).toBe('/uploads/file.png')

    fs.existsSync.mockRestore()
    fs.mkdirSync.mockRestore()
    fs.writeFileSync.mockRestore()
  })
})
