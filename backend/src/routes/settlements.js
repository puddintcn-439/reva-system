const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/settlementController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

/**
 * @swagger
 * tags:
 *   name: Settlements
 *   description: Quản lý thanh toán ký gửi
 */

/**
 * @swagger
 * /api/settlements/lookup:
 *   get:
 *     summary: Tra cứu thanh toán (public)
 *     tags: [Settlements]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kết quả tra cứu
 */

/**
 * @swagger
 * /api/settlements:
 *   get:
 *     summary: Danh sách thanh toán
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách thanh toán
 *   post:
 *     summary: Tạo phiếu thanh toán
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consignor_id, period_start, period_end]
 *             properties:
 *               consignor_id:
 *                 type: integer
 *               period_start:
 *                 type: string
 *                 format: date
 *               period_end:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Tạo phiếu thành công
 */

/**
 * @swagger
 * /api/settlements/{id}:
 *   get:
 *     summary: Chi tiết phiếu thanh toán
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết phiếu
 */

/**
 * @swagger
 * /api/settlements/{id}/pay:
 *   patch:
 *     summary: Đánh dấu đã thanh toán
 *     tags: [Settlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Đã cập nhật trạng thái
 */

// Public: lookup
router.get('/lookup', ctrl.lookupSettlement);

// Admin/Staff
router.get('/', authenticate, requirePermission('settlements:view'), ctrl.getSettlements);
router.post('/', authenticate, requirePermission('settlements:manage'), audit('create','settlement'), [
  body('consignor_id').notEmpty().withMessage('Cần chọn khách hàng'),
  body('period_start').isDate(),
  body('period_end').isDate(),
], ctrl.createSettlement);
router.post('/bulk', authenticate, requirePermission('settlements:manage'), audit('bulk_create','settlement'), ctrl.bulkCreateSettlements);
router.get('/:id', authenticate, requirePermission('settlements:view'), ctrl.getSettlement);
router.patch('/:id/pay', authenticate, requirePermission('settlements:manage'), audit('mark_paid','settlement'), ctrl.markPaid);
router.patch('/:id/cancel', authenticate, requirePermission('settlements:manage'), audit('cancel','settlement'), ctrl.cancelSettlement);
router.delete('/:id', authenticate, requirePermission('settlements:manage'), audit('delete','settlement'), ctrl.deleteSettlement);

module.exports = router;
