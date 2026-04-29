const db = require('../config/database')
const sysSettings = require('../config/systemSettings')

function calcCommission (price, tiers) {
  const sorted = [...tiers].sort((a, b) =>
    a.max === null ? 1 : b.max === null ? -1 : a.max - b.max
  )
  for (const tier of sorted) {
    if (tier.max === null || price <= tier.max) {
      const commission = tier.type === 'percent'
        ? Math.round(price * tier.amount / 100)
        : Number(tier.amount)
      return { commission, consignorAmount: Math.max(0, price - commission) }
    }
  }
  return { commission: 0, consignorAmount: price }
}

/**
 * GET /api/pos/search?q=...&limit=8
 * Tìm sản phẩm đang bán theo tên hoặc mã (cho autocomplete POS)
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q = '', limit = 8 } = req.query
    const term = q.trim()
    if (!term) return res.json({ success: true, data: [] })

    const result = await db.query(
      `SELECT p.id, p.name, p.code, p.sale_price,
              p.commission_amount, p.consignor_amount,
              p.condition_percent, p.consignor_id,
              c.name AS category_name, l.name AS location_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.status = 'active'
         AND (p.name ILIKE $1 OR p.code ILIKE $1)
       ORDER BY
         CASE WHEN p.code ILIKE $2 THEN 0
              WHEN p.name ILIKE $2 THEN 1
              ELSE 2 END,
         p.name
       LIMIT $3`,
      [`%${term}%`, `${term}%`, Number(limit)]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/pos/product?code=SP-XXX
 * Tra cứu sản phẩm theo mã vạch / mã sản phẩm
 */
const lookupProduct = async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ success: false, message: 'Thiếu mã sản phẩm' })

    const result = await db.query(
      `SELECT p.*, c.name AS category_name, l.name AS location_name,
              co.full_name AS consignor_name, co.id AS consignor_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN locations l ON l.id = p.location_id
       LEFT JOIN consignors co ON co.id = p.consignor_id
       WHERE p.code = $1`,
      [code.trim()]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: `Không tìm thấy sản phẩm với mã: ${code}` })
    }

    const product = result.rows[0]
    if (product.status === 'sold') {
      return res.status(409).json({ success: false, message: `Sản phẩm "${product.name}" đã được bán rồi` })
    }
    if (product.status !== 'active') {
      return res.status(409).json({ success: false, message: `Sản phẩm "${product.name}" không ở trạng thái bán (${product.status})` })
    }

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/pos/sales
 * Tạo hóa đơn bán hàng — đánh dấu tất cả sản phẩm là "sold"
 * Body: {
 *   items: [{ product_id, product_name, product_code, sale_price, commission_amount, consignor_amount, consignor_id }],
 *   customer_name, customer_phone,
 *   discount_amount, payment_method, note, location_id
 * }
 */
const createSale = async (req, res, next) => {
  const { items, customer_name, customer_phone, discount_amount = 0,
          payment_method = 'cash', note, location_id } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Giỏ hàng trống' })
  }

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    // Verify all products are still active (race condition check)
    const ids = items.map(i => i.product_id).filter(Boolean)
    if (ids.length > 0) {
      const check = await client.query(
        `SELECT id, name, status FROM products WHERE id = ANY($1)`,
        [ids]
      )
      const notAvail = check.rows.filter(r => r.status !== 'active')
      if (notAvail.length > 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          success: false,
          message: `Sản phẩm đã bán hoặc không còn bán: ${notAvail.map(r => r.name).join(', ')}`,
        })
      }
    }

    // Invoice code: HD + YYMMDD + 4 random digits
    const now = new Date()
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '')
    const invoiceCode = `HD${dateStr}${Math.floor(1000 + Math.random() * 9000)}`

    const totalAmount = items.reduce((s, i) => s + Number(i.sale_price), 0)
    const disc = Math.min(Number(discount_amount) || 0, totalAmount)
    const finalAmount = totalAmount - disc

    // Create sale record
    const saleResult = await client.query(
      `INSERT INTO sales
         (invoice_code, customer_name, customer_phone, total_amount,
          discount_amount, final_amount, payment_method, note, location_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [invoiceCode, customer_name || null, customer_phone || null,
       totalAmount, disc, finalAmount, payment_method,
       note || null, location_id || null, req.user?.id || null]
    )
    const sale = saleResult.rows[0]

    // Load commission tiers once for this transaction
    const tiers = await sysSettings.getCommissionTiers()

    // Insert sale items + mark products sold
    for (const item of items) {
      const price = Number(item.sale_price)
      const { commission, consignorAmount } = calcCommission(price, tiers)

      await client.query(
        `INSERT INTO sale_items
           (sale_id, product_id, product_name, product_code,
            sale_price, commission_amount, consignor_amount, consignor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [sale.id, item.product_id || null, item.product_name,
         item.product_code || null, price,
         commission, consignorAmount,
         item.consignor_id || null]
      )

      if (item.product_id) {
        await client.query(
          `UPDATE products SET status = 'sold', sold_at = NOW() WHERE id = $1`,
          [item.product_id]
        )
      }
    }

    await client.query('COMMIT')

    // Return full sale with items for receipt printing
    const fullSale = await db.query(
      `SELECT s.*,
              json_agg(si.* ORDER BY si.created_at) AS items
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [sale.id]
    )

    res.status(201).json({ success: true, data: fullSale.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

/**
 * GET /api/pos/sales
 * Danh sách hóa đơn (admin)
 */
const getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, date, date_from, date_to, payment_method, search } = req.query
    const params = []
    const conds = []
    let idx = 1

    if (date) {
      params.push(date)
      conds.push(`s.created_at::date = $${idx++}`)
    }
    if (date_from) { params.push(date_from); conds.push(`s.created_at::date >= $${idx++}`) }
    if (date_to)   { params.push(date_to);   conds.push(`s.created_at::date <= $${idx++}`) }
    if (payment_method) { params.push(payment_method); conds.push(`s.payment_method = $${idx++}`) }
    if (search) {
      params.push(`%${search}%`)
      conds.push(`(s.invoice_code ILIKE $${idx} OR s.customer_name ILIKE $${idx} OR s.customer_phone ILIKE $${idx})`)
      idx++
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const offset = (Number(page) - 1) * Number(limit)

    const countResult = await db.query(`SELECT COUNT(*) FROM sales s ${where}`, params)
    const total = parseInt(countResult.rows[0].count)

    params.push(Number(limit), offset)
    const result = await db.query(
      `SELECT s.*, l.name AS location_name,
              u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
       FROM sales s
       LEFT JOIN locations l ON l.id = s.location_id
       LEFT JOIN users u ON u.id = s.created_by
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    )

    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/pos/sales/:id
 * Chi tiết 1 hóa đơn
 */
const getSale = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.*, l.name AS location_name, u.full_name AS created_by_name,
              json_agg(si.* ORDER BY si.created_at) AS items
       FROM sales s
       LEFT JOIN locations l ON l.id = s.location_id
       LEFT JOIN users u ON u.id = s.created_by
       JOIN sale_items si ON si.sale_id = s.id
       WHERE s.id = $1
       GROUP BY s.id, l.name, u.full_name`,
      [req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/pos/sales/:id/mark-paid
 * Nhân viên xác nhận đã nhận tiền → cập nhật status = 'paid'
 */
const markSalePaid = async (req, res, next) => {
  try {
    const { id } = req.params
    const { payment_reference } = req.body
    const result = await db.query(
      `UPDATE sales
       SET status = 'paid', paid_at = NOW(), payment_reference = $2
       WHERE id = $1 AND status != 'paid'
       RETURNING *`,
      [id, payment_reference || null]
    )
    if (!result.rows.length) {
      const check = await db.query('SELECT status FROM sales WHERE id = $1', [id])
      if (!check.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' })
      if (check.rows[0].status === 'paid') return res.json({ success: true, message: 'Đã xác nhận trước đó', data: check.rows[0] })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/pos/sales/:id/cancel
 * Hủy hóa đơn (chỉ admin) — khôi phục sản phẩm về 'active'
 */
const cancelSale = async (req, res, next) => {
  const client = await db.getClient()
  try {
    const { id } = req.params
    const { cancel_reason } = req.body

    await client.query('BEGIN')

    const saleRes = await client.query(
      `SELECT id, status, invoice_code FROM sales WHERE id = $1`, [id]
    )
    if (!saleRes.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' })
    }
    const sale = saleRes.rows[0]
    if (sale.status === 'cancelled') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Hóa đơn đã được hủy trước đó' })
    }

    // Restore all products in this sale back to 'active'
    await client.query(
      `UPDATE products p
       SET status = 'active', sold_at = NULL
       FROM sale_items si
       WHERE si.sale_id = $1 AND si.product_id = p.id`,
      [id]
    )

    // Mark sale as cancelled
    const updated = await client.query(
      `UPDATE sales SET status = 'cancelled', cancel_reason = $2, cancelled_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, cancel_reason || null]
    )

    await client.query('COMMIT')
    res.json({ success: true, data: updated.rows[0], message: `Đã hủy hóa đơn ${sale.invoice_code}` })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

module.exports = { searchProducts, lookupProduct, createSale, getSales, getSale, markSalePaid, cancelSale }
