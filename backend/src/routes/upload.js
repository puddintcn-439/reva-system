const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const { randomUUID } = require('crypto')
const fs = require('fs')
const { authenticate } = require('../middleware/auth')

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Always use memory storage — works on Vercel (no writable filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF'))
  },
})

/**
 * Upload buffer to Supabase Storage and return the public URL.
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET (default: "products")
 */
async function uploadToSupabase (buffer, mimeType, filename) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  const bucket      = process.env.SUPABASE_BUCKET || 'products'
  const objectPath  = `images/${filename}`

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase Storage error ${res.status}: ${text}`)
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
}

/**
 * Fallback: write buffer to local uploads/ directory (dev only).
 */
function saveLocally (buffer, filename) {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}

/**
 * POST /api/upload/image
 * Upload a single product image.
 * Production: stores in Supabase Storage, returns public CDN URL.
 * Dev (no SUPABASE_URL): stores in local uploads/, returns /uploads/<filename>.
 */
router.post('/image', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file ảnh' })

    const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '')
    const filename = `${randomUUID()}${ext || '.jpg'}`

    let url
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      url = await uploadToSupabase(req.file.buffer, req.file.mimetype, filename)
    } else {
      url = saveLocally(req.file.buffer, filename)
    }

    res.json({ success: true, url })
  } catch (err) {
    next(err)
  }
})

// Multer + general error handler for this router
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File quá lớn (tối đa 5 MB)' })
  }
  res.status(400).json({ success: false, message: err.message || 'Lỗi upload' })
})

// Export helper functions for testing while keeping default export as router
module.exports = router
module.exports.uploadToSupabase = uploadToSupabase
module.exports.saveLocally = saveLocally
