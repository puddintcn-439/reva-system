const router = require('express').Router();
const { body } = require('express-validator');
const { login, getMe, changePassword, getUsers, createUser, updateUser, deleteUser } = require('../controllers/authController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Xác thực người dùng
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về JWT token
 *       401:
 *         description: Sai tên đăng nhập hoặc mật khẩu
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Tên đăng nhập là bắt buộc'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
], login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin người dùng hiện tại
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 *       401:
 *         description: Chưa xác thực
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại không đúng
 */
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải ít nhất 6 ký tự'),
], changePassword);

// ── User management (admin only) ──────────────────────────────
router.get('/users',     authenticate, requirePermission('users:manage'), getUsers);
router.post('/users',    authenticate, requirePermission('users:manage'), audit('create','user'), createUser);
router.put('/users/:id', authenticate, requirePermission('users:manage'), audit('update','user'), updateUser);
router.delete('/users/:id', authenticate, requirePermission('users:manage'), audit('delete','user'), deleteUser);

module.exports = router;
