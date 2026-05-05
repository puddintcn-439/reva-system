const router = require('express').Router();
const { query } = require('express-validator');
const ctrl = require('../controllers/reportController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Xuất báo cáo Excel
 */

/**
 * @swagger
 * /api/reports/export/financial:
 *   get:
 *     summary: Xuất báo cáo tài chính ra Excel
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Ngày bắt đầu (mặc định 1 năm trước)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: Ngày kết thúc (mặc định hôm nay)
 *     responses:
 *       200:
 *         description: File Excel báo cáo tài chính
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Tham số ngày không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.get(
  '/export/financial',
  [
    query('date_from').optional().isDate().withMessage('date_from phải là ngày hợp lệ (YYYY-MM-DD)'),
    query('date_to').optional().isDate().withMessage('date_to phải là ngày hợp lệ (YYYY-MM-DD)'),
  ],
  authenticate,
  requirePermission('dashboard:view'),
  ctrl.exportFinancial
);

/**
 * @swagger
 * /api/reports/export/inventory:
 *   get:
 *     summary: Xuất báo cáo tồn kho ra Excel
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, sold, pending, returned, expired]
 *         description: Lọc theo trạng thái (bỏ trống để lấy tất cả)
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo vị trí
 *     responses:
 *       200:
 *         description: File Excel tồn kho
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.get(
  '/export/inventory',
  [
    query('status').optional().isIn(['active', 'sold', 'pending', 'returned', 'expired'])
      .withMessage('status phải là: active, sold, pending, returned, expired'),
    query('category_id').optional().isUUID().withMessage('category_id phải là UUID hợp lệ'),
    query('location_id').optional().isUUID().withMessage('location_id phải là UUID hợp lệ'),
  ],
  authenticate,
  requirePermission('products:view'),
  ctrl.exportInventory
);

module.exports = router;
