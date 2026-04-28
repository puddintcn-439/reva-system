const router = require('express').Router();
const ctrl = require('../controllers/announcementController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Quản lý thông báo
 */

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Danh sách thông báo đang hoạt động (public)
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *   post:
 *     summary: Tạo thông báo mới (Admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               sort_order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/announcements/all:
 *   get:
 *     summary: Tất cả thông báo (bao gồm ẩn)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tất cả thông báo
 */

/**
 * @swagger
 * /api/announcements/{id}:
 *   put:
 *     summary: Cập nhật thông báo (Admin)
 *     tags: [Announcements]
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
 *   delete:
 *     summary: Xóa thông báo (Admin)
 *     tags: [Announcements]
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
 *         description: Xóa thành công
 */

router.get('/', ctrl.getAnnouncements);
router.get('/all', authenticate, ctrl.getAllAnnouncements);
router.post('/', authenticate, requirePermission('settings:manage'), ctrl.createAnnouncement);
router.put('/:id', authenticate, requirePermission('settings:manage'), ctrl.updateAnnouncement);
router.delete('/:id', authenticate, requirePermission('settings:manage'), ctrl.deleteAnnouncement);

module.exports = router;
