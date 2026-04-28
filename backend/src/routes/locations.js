const router = require('express').Router();
const ctrl = require('../controllers/locationController');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Quản lý chi nhánh
 */

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Danh sách chi nhánh đang hoạt động (public)
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Danh sách chi nhánh
 *   post:
 *     summary: Tạo chi nhánh mới (Admin)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address]
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/locations/all:
 *   get:
 *     summary: Tất cả chi nhánh (bao gồm ẩn)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tất cả chi nhánh
 */

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Cập nhật chi nhánh (Admin)
 *     tags: [Locations]
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
 *     summary: Xóa chi nhánh (Admin)
 *     tags: [Locations]
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

router.get('/', ctrl.getLocations);
router.get('/all', authenticate, ctrl.getAllLocations);
router.post('/', authenticate, requirePermission('settings:manage'), ctrl.createLocation);
router.put('/:id', authenticate, requirePermission('settings:manage'), ctrl.updateLocation);
router.delete('/:id', authenticate, requirePermission('settings:manage'), ctrl.deleteLocation);

module.exports = router;
