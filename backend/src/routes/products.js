const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/productController');
const { authenticate, requirePermission, optionalAuth } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Quản lý sản phẩm
 */

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Lấy danh sách danh mục
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Danh sách danh mục
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lấy danh sách sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, sold, reserved]
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm có phân trang
 *   post:
 *     summary: Tạo sản phẩm mới
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sale_price, condition_percent]
 *             properties:
 *               name:
 *                 type: string
 *               sale_price:
 *                 type: number
 *               condition_percent:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               category_id:
 *                 type: integer
 *               consignor_id:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo sản phẩm thành công
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Lấy chi tiết sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết sản phẩm
 *       404:
 *         description: Không tìm thấy sản phẩm
 *   put:
 *     summary: Cập nhật sản phẩm
 *     tags: [Products]
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
 *     summary: Xóa sản phẩm (Admin)
 *     tags: [Products]
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

// Public
router.get('/categories', ctrl.getCategories);
router.get('/commission-tiers', ctrl.getCommissionTiersPublic);
router.get('/', optionalAuth, ctrl.getProducts);
router.get('/:id', optionalAuth, ctrl.getProduct);

// Staff / Admin
router.post('/bulk', authenticate, requirePermission('products:manage'), ctrl.bulkCreateProducts);

router.post('/', authenticate, requirePermission('products:manage'), [
  body('name').trim().notEmpty().withMessage('Tên sản phẩm là bắt buộc'),
  body('sale_price').isNumeric().withMessage('Giá bán phải là số'),
  body('condition_percent').isInt({ min: 0, max: 100 }),
], ctrl.createProduct);

router.put('/:id', authenticate, requirePermission('products:manage'), audit('update','product'), ctrl.updateProduct);

// Rút hàng về (returned)
router.patch('/:id/return', authenticate, requirePermission('products:manage'), audit('return','product'), ctrl.returnProduct);

router.delete('/:id', authenticate, requirePermission('products:manage'), audit('delete','product'), ctrl.deleteProduct);

// Hết hạn hàng loạt
router.post('/expire-batch', authenticate, requirePermission('products:manage'), audit('expire_batch','product'), ctrl.expireBatch);

module.exports = router;
