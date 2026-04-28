const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/bankController');

/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: Quản lý tài khoản ngân hàng / thông tin chuyển khoản
 */

/**
 * @swagger
 * /api/banks:
 *   get:
 *     summary: Danh sách ngân hàng (public)
 *     tags: [Banks]
 *     responses:
 *       200:
 *         description: Danh sách ngân hàng
 *   post:
 *     summary: Tạo ngân hàng mới
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, account_number]
 *             properties:
 *               name:
 *                 type: string
 *               account_number:
 *                 type: string
 *               branch:
 *                 type: string
 *               owner:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/banks/active:
 *   get:
 *     summary: Lấy thông tin ngân hàng đang active (dùng cho POS QR)
 *     tags: [Banks]
 *     responses:
 *       200:
 *         description: Ngân hàng active
 */

/**
 * @swagger
 * /api/banks/{id}:
 *   put:
 *     summary: Cập nhật thông tin ngân hàng
 *     tags: [Banks]
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
 *     summary: Xóa ngân hàng
 *     tags: [Banks]
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

/**
 * @swagger
 * /api/banks/{id}/set-active:
 *   patch:
 *     summary: Đặt ngân hàng là active
 *     tags: [Banks]
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
 *         description: Đã đặt active
 */

router.get('/',            ctrl.getBanks);          // public — Settings & POS
router.get('/active',      ctrl.getActiveBank);     // public — POS QR
router.post('/',           authenticate, requirePermission('settings:manage'), ctrl.createBank);
router.put('/:id',         authenticate, requirePermission('settings:manage'), ctrl.updateBank);
router.patch('/:id/set-active', authenticate, requirePermission('settings:manage'), ctrl.setActiveBank);
router.delete('/:id',      authenticate, requirePermission('settings:manage'), ctrl.deleteBank);

module.exports = router;
