const router = require('express').Router();
const ctrl = require('../controllers/emailController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Mẫu email và gửi thông báo qua email
 */

/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Lấy danh sách template email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách template
 *   post:
 *     summary: Tạo template email mới
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, subject, content]
 *             properties:
 *               key:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/email/templates/{key}:
 *   put:
 *     summary: Cập nhật template email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa template email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */

/**
 * @swagger
 * /api/email/expiring:
 *   get:
 *     summary: Lấy sản phẩm sắp hết hạn (dùng để gửi email nhắc)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm sắp hết hạn
 */

/**
 * @swagger
 * /api/email/send-expiring:
 *   post:
 *     summary: Gửi email nhắc cho sản phẩm sắp hết hạn
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Đã gửi email
 */

// Email templates
router.get('/templates', authenticate, requirePermission('settings:manage'), ctrl.getTemplates);
router.post('/templates', authenticate, requirePermission('settings:manage'), ctrl.createTemplate);
router.put('/templates/:key', authenticate, requirePermission('settings:manage'), ctrl.updateTemplate);
router.delete('/templates/:key', authenticate, requirePermission('settings:manage'), ctrl.deleteTemplate);

// Expiring products
router.get('/expiring', authenticate, requirePermission('settings:manage'), ctrl.getExpiringProducts);

// Send reminders
router.post('/send-expiring', authenticate, requirePermission('settings:manage'), ctrl.sendExpiringReminders);

module.exports = router;
