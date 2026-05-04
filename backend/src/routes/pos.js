const router = require('express').Router()
const ctrl = require('../controllers/posController')
const { authenticate, requirePermission } = require('../middleware/auth')
const { audit } = require('../middleware/audit')

/**
 * @swagger
 * tags:
 *   name: POS
 *   description: Điểm bán hàng / Hóa đơn POS
 */

/**
 * @swagger
 * /api/pos/search:
 *   get:
 *     summary: Tìm kiếm sản phẩm cho POS (autocomplete)
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 */

/**
 * @swagger
 * /api/pos/product:
 *   get:
 *     summary: Tra cứu sản phẩm theo mã vạch
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin sản phẩm
 */

/**
 * @swagger
 * /api/pos/sales:
 *   post:
 *     summary: Tạo hóa đơn POS
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Hóa đơn tạo thành công
 *   get:
 *     summary: Danh sách hóa đơn POS
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách hóa đơn
 */

/**
 * @swagger
 * /api/pos/sales/{id}:
 *   get:
 *     summary: Chi tiết hóa đơn POS
 *     tags: [POS]
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
 *         description: Chi tiết hóa đơn
 */

// Tìm kiếm sản phẩm theo tên / mã (autocomplete)
router.get('/search', authenticate, requirePermission('pos:sale'), ctrl.searchProducts)

// Tra cứu sản phẩm theo mã vạch (cần login)
router.get('/product', authenticate, requirePermission('pos:sale'), ctrl.lookupProduct)

// Tra cứu tên khách hàng theo số điện thoại
router.get('/customer', authenticate, requirePermission('pos:sale'), ctrl.lookupCustomer)

// Danh sách khách hàng
router.get('/customers', authenticate, requirePermission('pos:history'), ctrl.getCustomers)

// Chi tiết khách hàng
router.get('/customers/:id', authenticate, requirePermission('pos:history'), ctrl.getCustomer)

// Tạo hóa đơn
router.post('/sales', authenticate, requirePermission('pos:sale'), ctrl.createSale)

// Danh sách hóa đơn
router.get('/sales', authenticate, requirePermission('pos:history'), ctrl.getSales)

/**
 * @swagger
 * /api/pos/sales/{id}/mark-paid:
 *   patch:
 *     summary: Xác nhận đã nhận tiền, cập nhật hóa đơn thành paid
 *     tags: [POS]
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
 *             properties:
 *               payment_reference:
 *                 type: string
 *                 description: Mã tham chiếu giao dịch ngân hàng (tuỳ chọn)
 *     responses:
 *       200:
 *         description: Đã cập nhật trạng thái paid
 */

// Chi tiết hóa đơn
router.get('/sales/:id', authenticate, requirePermission('pos:history'), ctrl.getSale)

// Xác nhận đã nhận tiền
router.patch('/sales/:id/mark-paid', authenticate, requirePermission('pos:sale'), ctrl.markSalePaid)

// Hủy hóa đơn (chỉ admin) — khôi phục sản phẩm về active
router.patch('/sales/:id/cancel', authenticate, requirePermission('settlements:manage'), audit('cancel', 'sale'), ctrl.cancelSale)

// Trả hàng / hoàn tiền (partial hoặc toàn bộ)
router.post('/sales/:id/return', authenticate, requirePermission('settlements:manage'), audit('return', 'sale'), ctrl.createReturn)

// Lấy danh sách phiếu trả hàng của hóa đơn
router.get('/sales/:id/returns', authenticate, requirePermission('pos:history'), ctrl.getReturns)

module.exports = router
