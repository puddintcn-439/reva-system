const db = require('../config/database');
const { validationResult } = require('express-validator');

/** Calculate commission based on HUN fee structure */
const calculateCommission = (price) => {
  price = Number(price);
  let commission, consignorAmount;
  if (price < 60000)       { commission = 20000; }
  else if (price <= 130000) { commission = 30000; }
  else                      { commission = Math.round(price * 0.25); }
  // Guard: consignorAmount must never be negative
  consignorAmount = Math.max(0, price - commission);
  commission = price - consignorAmount; // recalculate so commission + consignorAmount = price
  return { commission, consignorAmount };
};

/**
 * GET /api/products
 * Public: list active products. Admin: all products.
 */
const getProducts = async (req, res, next) => {
  try {
    const { status, category_id, location_id, consignor_id, price_min, price_max, page = 1, limit = 20, search } = req.query;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'staff';

    const params = [];
    const conds = [];
    let idx = 1;

    if (!isAdmin) {
      conds.push(`p.status = 'active'`);
    } else if (status) {
      params.push(status);
      conds.push(`p.status = $${idx++}`);
    }

    if (category_id) { params.push(category_id); conds.push(`p.category_id = $${idx++}`); }
    if (location_id)  { params.push(location_id);  conds.push(`p.location_id = $${idx++}`); }
    if (consignor_id) { params.push(consignor_id); conds.push(`p.consignor_id = $${idx++}`); }
    if (price_min)    { params.push(Number(price_min)); conds.push(`p.sale_price >= $${idx++}`); }
    if (price_max)    { params.push(Number(price_max)); conds.push(`p.sale_price <= $${idx++}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(p.name ILIKE $${idx} OR p.code ILIKE $${idx})`);
      idx++;
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(Number(limit), offset);
    const result = await db.query(
      `SELECT p.*, c.name AS category_name, l.name AS location_name,
              co.full_name AS consignor_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN locations l ON l.id = p.location_id
       LEFT JOIN consignors co ON co.id = p.consignor_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 */
const getProduct = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, c.name AS category_name, l.name AS location_name,
              co.full_name AS consignor_name, co.phone AS consignor_phone
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN locations l ON l.id = p.location_id
       LEFT JOIN consignors co ON co.id = p.consignor_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products  (admin/staff)
 */
const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const {
      request_id, consignor_id, location_id, category_id,
      name, description, condition_percent, sale_price,
      image_url, consign_start, consign_end, code,
    } = req.body;

    const { commission, consignorAmount } = calculateCommission(sale_price);

    // Auto-generate code if not provided: SP + base36 timestamp (6 chars) e.g. SP-A3F2K1
    const productCode = code || `SP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const result = await db.query(
      `INSERT INTO products
         (request_id, consignor_id, location_id, category_id, name, description,
          condition_percent, sale_price, commission_amount, consignor_amount,
          image_url, consign_start, consign_end, code, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')
       RETURNING *`,
      [request_id, consignor_id, location_id, category_id, name, description,
       condition_percent, sale_price, commission, consignorAmount,
       image_url, consign_start, consign_end, productCode]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id  (admin/staff)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = ['name','description','condition_percent','sale_price',
                    'image_url','status','location_id','category_id',
                    'consign_start','consign_end'];

    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        let val = req.body[f];

        // Required / NOT NULL fields: reject empty values
        if (['name', 'status', 'condition_percent', 'sale_price'].includes(f)) {
          if (val === '' || val == null) return res.status(400).json({ success: false, message: `${f} không hợp lệ` });
        }

        // Optional fields: treat empty string as NULL
        if (val === '' && !['name', 'status', 'condition_percent', 'sale_price'].includes(f)) {
          val = null;
        }

        // Convert numeric fields
        if (f === 'condition_percent') {
          const n = Number(val);
          if (Number.isNaN(n)) return res.status(400).json({ success: false, message: 'condition_percent không hợp lệ' });
          val = n;
        }
        if (f === 'sale_price') {
          const n = Number(val);
          if (Number.isNaN(n)) return res.status(400).json({ success: false, message: 'sale_price không hợp lệ' });
          val = n;
        }

        params.push(val);
        updates.push(`${f} = $${idx++}`);
      }
    }

    // Recalculate commission when price changes and a valid price is provided
    if (req.body.sale_price !== undefined && req.body.sale_price !== '') {
      const priceNum = Number(req.body.sale_price);
      if (Number.isNaN(priceNum)) return res.status(400).json({ success: false, message: 'sale_price không hợp lệ' });
      const { commission, consignorAmount } = calculateCommission(priceNum);
      params.push(commission);    updates.push(`commission_amount = $${idx++}`);
      params.push(consignorAmount); updates.push(`consignor_amount = $${idx++}`);
    }

    if (req.body.status === 'sold') {
      updates.push(`sold_at = NOW()`);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });

    params.push(id);
    const result = await db.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id  (admin only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    // Block deletion if product is referenced in a settlement
    const inSettlement = await db.query(
      'SELECT 1 FROM settlement_items WHERE product_id = $1 LIMIT 1', [req.params.id]
    );
    if (inSettlement.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đã có trong quyết toán. Hãy hủy quyết toán trước.',
      });
    }
    // Block deletion if product is in a non-cancelled sale
    const inSale = await db.query(
      `SELECT 1 FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE si.product_id = $1 AND s.status != 'cancelled' LIMIT 1`,
      [req.params.id]
    );
    if (inSale.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đã có trong hóa đơn bán hàng.',
      });
    }
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, message: 'Đã xóa sản phẩm' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/products/:id/return  (staff/admin)
 * Rút sản phẩm về — đánh dấu là 'returned', ghi lý do
 */
const returnProduct = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const check = await db.query('SELECT status FROM products WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    const { status } = check.rows[0];
    if (status === 'sold') {
      return res.status(400).json({ success: false, message: 'Sản phẩm đã bán không thể rút về. Hãy hủy hóa đơn trước.' });
    }
    if (status === 'returned') {
      return res.status(400).json({ success: false, message: 'Sản phẩm đã được rút về trước đó.' });
    }
    const result = await db.query(
      `UPDATE products SET status = 'returned', description =
         CASE WHEN description IS NULL OR description = '' THEN $2
              ELSE description || E'\n[Rút hàng: ' || $2 || ']' END
       WHERE id = $1 RETURNING *`,
      [req.params.id, reason || 'Rút hàng theo yêu cầu']
    );
    res.json({ success: true, data: result.rows[0], message: 'Đã đánh dấu rút hàng' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/expire-batch  (staff/admin)
 * Hết hạn hàng loạt: active products where consign_end < today
 */
const expireBatch = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE products SET status = 'expired'
       WHERE status = 'active'
         AND consign_end IS NOT NULL
         AND consign_end < CURRENT_DATE
       RETURNING id, code, name, consign_end`
    );
    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
      message: `Đã chuyển ${result.rowCount} sản phẩm hết hạn sang trạng thái 'expired'.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/bulk  (admin/staff)
 * Body: { products: [...], shared: { consignor_id, location_id, consign_start, consign_end, status } }
 */
const bulkCreateProducts = async (req, res, next) => {
  const { products, shared = {} } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không được rỗng' });
  }
  if (products.length > 100) {
    return res.status(400).json({ success: false, message: 'Tối đa 100 sản phẩm mỗi lần' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const created = [];

    for (const item of products) {
      const name = (item.name || '').trim();
      if (!name) continue;

      const salePrice = Number(item.sale_price);
      if (!salePrice || salePrice <= 0) continue;

      const { commission, consignorAmount } = calculateCommission(salePrice);
      const productCode = (item.code || '').trim() || `SP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const consignorId   = item.consignor_id   || shared.consignor_id   || null;
      const locationId    = item.location_id    || shared.location_id    || null;
      const categoryId    = item.category_id    || shared.category_id    || null;
      const consignStart  = item.consign_start  || shared.consign_start  || null;
      const consignEnd    = item.consign_end    || shared.consign_end    || null;
      const status        = item.status         || shared.status         || 'active';
      const conditionPct  = item.condition_percent != null ? item.condition_percent : 90;

      const result = await client.query(
        `INSERT INTO products
           (consignor_id, location_id, category_id, name, description,
            condition_percent, sale_price, commission_amount, consignor_amount,
            image_url, consign_start, consign_end, code, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [consignorId, locationId, categoryId, name, item.description || null,
         conditionPct, salePrice, commission, consignorAmount,
         item.image_url || null, consignStart, consignEnd, productCode, status]
      );
      created.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getProducts, getProduct, createProduct, bulkCreateProducts, updateProduct, deleteProduct, getCategories, returnProduct, expireBatch };
