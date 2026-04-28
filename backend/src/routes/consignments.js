const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/consignmentController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Consignments
 *   description: Quản lý phiếu ký gửi
 */

/**
 * @swagger
 * /api/consignments:
 *   post:
 *     summary: Gửi yêu cầu ký gửi (public)
 *     tags: [Consignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, phone, request_type]
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               request_type:
 *                 type: string
 *                 enum: [direct, online]
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *   get:
 *     summary: Danh sách phiếu ký gửi
 *     tags: [Consignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách phiếu ký gửi
 */

/**
 * @swagger
 * /api/consignments/{id}:
 *   get:
 *     summary: Chi tiết phiếu ký gửi
 *     tags: [Consignments]
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
 *         description: Chi tiết phiếu ký gửi
 */

/**
 * @swagger
 * /api/consignments/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái phiếu ký gửi
 *     tags: [Consignments]
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
 *                 enum: [pending, approved, rejected, completed]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

// Public: submit consignment request
router.post('/', [
  body('full_name').trim().notEmpty().withMessage('Họ tên là bắt buộc'),
  body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
  body('request_type').isIn(['direct', 'online']),
], ctrl.createConsignment);

// Admin/Staff: view and manage
router.get('/', authenticate, requirePermission('consignments:view'), ctrl.getConsignments);
router.get('/:id', authenticate, requirePermission('consignments:view'), ctrl.getConsignment);
router.patch('/:id/status', authenticate, requirePermission('consignments:manage'), ctrl.updateStatus);

module.exports = router;
