const router = require('express').Router();
const ctrl = require('../controllers/consignorController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Consignors
 *   description: Quản lý người ký gửi
 */

/**
 * @swagger
 * /api/consignors/stats:
 *   get:
 *     summary: Thống kê người ký gửi
 *     tags: [Consignors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê
 */

/**
 * @swagger
 * /api/consignors:
 *   get:
 *     summary: Danh sách người ký gửi
 *     tags: [Consignors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách người ký gửi
 */

/**
 * @swagger
 * /api/consignors/{id}:
 *   get:
 *     summary: Chi tiết người ký gửi
 *     tags: [Consignors]
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
 *         description: Chi tiết người ký gửi
 *   put:
 *     summary: Cập nhật người ký gửi
 *     tags: [Consignors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

router.get('/stats', authenticate, requirePermission('consignors:view'), ctrl.getStats);
router.get('/', authenticate, requirePermission('consignors:view'), ctrl.getConsignors);
router.get('/:id', authenticate, requirePermission('consignors:view'), ctrl.getConsignor);
router.put('/:id', authenticate, requirePermission('consignors:manage'), ctrl.updateConsignor);

module.exports = router;
