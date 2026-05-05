const express = require('express');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/inboxController');

const router = express.Router();

// All inbox routes require authentication + inbox:view
router.use(authenticate, requirePermission('inbox:view'));

// Reusable UUID param validator
const uuidParam = (name) => param(name).isUUID().withMessage(`${name} không hợp lệ`);

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

/**
 * @swagger
 * tags:
 *   name: Inbox
 *   description: Hội thoại nội bộ
 */

// ─── Threads ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /inbox/threads:
 *   get:
 *     summary: Danh sách hội thoại
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/threads', ctrl.getThreads);

/**
 * @swagger
 * /inbox/threads:
 *   post:
 *     summary: Tạo hội thoại mới
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 */
router.post(
  '/threads',
  [body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống').isLength({ max: 200 })],
  validate,
  ctrl.createThread
);

/**
 * @swagger
 * /inbox/threads/{id}/close:
 *   patch:
 *     summary: Đóng hội thoại
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/threads/:id/close',  [uuidParam('id'), validate], requirePermission('inbox:manage'), ctrl.closeThread);

/**
 * @swagger
 * /inbox/threads/{id}/reopen:
 *   patch:
 *     summary: Mở lại hội thoại đã đóng
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/threads/:id/reopen', [uuidParam('id'), validate], requirePermission('inbox:manage'), ctrl.reopenThread);

/**
 * @swagger
 * /inbox/threads/{id}:
 *   delete:
 *     summary: Xóa hội thoại
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/threads/:id', [uuidParam('id'), validate], requirePermission('inbox:manage'), ctrl.deleteThread);

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /inbox/threads/{id}/messages:
 *   get:
 *     summary: Lấy tin nhắn trong hội thoại
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lấy tin nhắn sau timestamp này (dùng cho polling)
 */
router.get(
  '/threads/:id/messages',
  [uuidParam('id'), query('after').optional().isISO8601()],
  validate,
  ctrl.getMessages
);

/**
 * @swagger
 * /inbox/threads/{id}/messages:
 *   post:
 *     summary: Gửi tin nhắn vào hội thoại
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *                 maxLength: 4000
 */
router.post(
  '/threads/:id/messages',
  [uuidParam('id'), body('body').trim().notEmpty().withMessage('Nội dung không được để trống').isLength({ max: 4000 })],
  validate,
  ctrl.postMessage
);

/**
 * @swagger
 * /inbox/messages/{id}:
 *   delete:
 *     summary: Xóa tin nhắn
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/messages/:id', [uuidParam('id'), validate], ctrl.deleteMessage);

module.exports = router;
