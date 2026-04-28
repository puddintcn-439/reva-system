const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/purchaseController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Purchases
 *   description: Quản lý yêu cầu thu mua
 */

/**
 * @swagger
 * /api/purchases:
 *   post:
 *     summary: Gửi yêu cầu thu mua (public)
 *     tags: [Purchases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, phone, item_type]
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               item_type:
 *                 type: string
 *                 enum: [no_brand, brand, accessories]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *   get:
 *     summary: Danh sách yêu cầu thu mua
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu thu mua
 */

/**
 * @swagger
 * /api/purchases/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái yêu cầu thu mua
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

router.post('/', [
  body('full_name').trim().notEmpty().withMessage('Họ tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('item_type').isIn(['no_brand', 'brand', 'accessories']),
], ctrl.createPurchaseRequest);

router.get('/', authenticate, requirePermission('purchases:view'), ctrl.getPurchaseRequests);
router.patch('/:id/status', authenticate, requirePermission('purchases:manage'), ctrl.updateStatus);

module.exports = router;
