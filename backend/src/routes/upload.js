const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const { randomUUID } = require('crypto')
const fs = require('fs')
const { authenticate } = require('../middleware/auth')

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')
// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '')
    cb(null, `${randomUUID()}${ext || '.jpg'}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF'))
  },
})

/**
 * POST /api/upload/image
 * Upload a single product image. Returns { url } pointing to /uploads/<filename>
 */
router.post('/image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file ảnh' })
  const url = `/uploads/${req.file.filename}`
  res.json({ success: true, url })
})

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File quá lớn (tối đa 5 MB)' })
  }
  res.status(400).json({ success: false, message: err.message || 'Lỗi upload' })
})

module.exports = router
