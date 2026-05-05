const router      = require('express').Router();
const { body }    = require('express-validator');
const rateLimit   = require('express-rate-limit');
const { authenticate, requirePermission } = require('../middleware/auth');
const { suggestProduct, analyzeDashboard } = require('../controllers/aiController');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Tính năng AI gợi ý và phân tích
 */

// Stricter rate limit for AI routes — prevent abuse / cost overrun
const aiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu AI, vui lòng thử lại sau 1 phút' },
});

/**
 * @swagger
 * /api/ai/suggest-product:
 *   post:
 *     summary: AI gợi ý giá bán và mô tả sản phẩm
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Áo đầm lụa hoa nhí"
 *               condition_percent:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 85
 *               category_name:
 *                 type: string
 *                 example: "Thời trang nữ"
 *     responses:
 *       200:
 *         description: Gợi ý thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggested_price: { type: number, example: 280000 }
 *                     description: { type: string }
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình (thiếu GEMINI_API_KEY)
 */
router.post(
  '/suggest-product',
  aiRateLimit,
  [
    body('name')
      .trim().notEmpty().withMessage('Tên sản phẩm là bắt buộc')
      .isLength({ max: 200 }).withMessage('Tên tối đa 200 ký tự'),
    body('condition_percent')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('Tình trạng phải từ 0–100'),
    body('category_name')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Danh mục tối đa 100 ký tự'),
  ],
  authenticate,
  requirePermission('products:view'),
  suggestProduct
);

/**
 * @swagger
 * /api/ai/analyze-dashboard:
 *   post:
 *     summary: AI phân tích và nhận xét số liệu kinh doanh Dashboard
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               total_revenue:    { type: number }
 *               total_commission: { type: number }
 *               items_sold:       { type: integer }
 *               items_active:     { type: integer }
 *               items_pending:    { type: integer }
 *               period_months:    { type: integer, minimum: 1, maximum: 24, example: 1 }
 *     responses:
 *       200:
 *         description: Nhận xét kinh doanh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary: { type: string }
 *       503:
 *         description: AI service chưa được cấu hình
 */
router.post(
  '/analyze-dashboard',
  aiRateLimit,
  [
    body('total_revenue').optional().isFloat({ min: 0 }),
    body('total_commission').optional().isFloat({ min: 0 }),
    body('items_sold').optional().isInt({ min: 0 }),
    body('items_active').optional().isInt({ min: 0 }),
    body('items_pending').optional().isInt({ min: 0 }),
    body('period_months').optional().isInt({ min: 1, max: 24 }),
  ],
  authenticate,
  requirePermission('dashboard:view'),
  analyzeDashboard
);

module.exports = router;
