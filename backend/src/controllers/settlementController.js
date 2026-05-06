const db = require('../config/database');
const { validationResult } = require('express-validator');
const { sendTemplateEmail } = require('../config/email');
const logger = require('../config/logger');
const sysSettings = require('../config/systemSettings');

// Format helpers reused across functions
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

/** Fire-and-forget settlement_created email for one settlement record + consignor */
async function _sendSettlementEmail(settlement, consignorEmail, consignorName, itemCount) {
  try {
    const cfg = await sysSettings.getSmtpConfig();
    const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'https://reva.vn';
    const lookupUrl = `${clientUrl}/sales?code=${encodeURIComponent(settlement.code)}`;
    sendTemplateEmail('settlement_created', consignorEmail, {
      full_name:        consignorName || 'Quý khách',
      settlement_code:  settlement.code,
      period_start:     fmtDate(settlement.period_start),
      period_end:       fmtDate(settlement.period_end),
      items_count:      String(itemCount),
      total_sale:       fmtMoney(settlement.total_sale),
      total_commission: fmtMoney(settlement.total_commission),
      total_payout:     fmtMoney(settlement.total_payout),
      lookup_url:       lookupUrl,
    });
  } catch (err) {
    logger.error({ err }, '[EMAIL] settlement_created trigger error');
  }
}

/**
 * GET /api/settlements/lookup?code=HUN-001
 * Public: customer looks up their settlement.
 */
const lookupSettlement = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã tra cứu hoặc số điện thoại' });

    // Search by settlement code, consignor code, or phone number
    const result = await db.query(
      `SELECT s.*, co.full_name, co.phone
       FROM settlements s
       LEFT JOIN consignors co ON co.id = s.consignor_id
       WHERE s.code = $1 OR co.code = $1 OR co.phone = $1
       ORDER BY s.created_at DESC`,
      [code.toUpperCase()]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quyết toán. Vui lòng kiểm tra lại mã khách hàng, mã quyết toán hoặc số điện thoại.',
      });
    }

    // Fetch items for each settlement
    const settlements = await Promise.all(result.rows.map(async (s) => {
      const items = await db.query(
        `SELECT * FROM settlement_items WHERE settlement_id = $1 ORDER BY created_at`,
        [s.id]
      );
      return { ...s, items: items.rows };
    }));

    // Fetch current consignment status for this consignor
    const consignorId = result.rows[0]?.consignor_id;
    let consignment_summary = null;
    if (consignorId) {
      const [statusRes, activeRes, pendingPayoutRes] = await Promise.all([
        db.query(
          `SELECT status, COUNT(*) AS count FROM products WHERE consignor_id = $1 GROUP BY status`,
          [consignorId]
        ),
        db.query(
          `SELECT id, name, code, sale_price, consignor_amount, status, consign_start, consign_end, condition_percent
           FROM products WHERE consignor_id = $1 AND status IN ('active', 'pending')
           ORDER BY consign_end ASC NULLS LAST, created_at DESC`,
          [consignorId]
        ),
        db.query(
          `SELECT id, name, code, sale_price, consignor_amount, sold_at
           FROM products WHERE consignor_id = $1 AND status = 'sold'
             AND id NOT IN (SELECT product_id FROM settlement_items WHERE product_id IS NOT NULL)
           ORDER BY sold_at DESC`,
          [consignorId]
        ),
      ]);
      consignment_summary = {
        by_status: statusRes.rows,
        active_products: activeRes.rows,
        pending_payout: pendingPayoutRes.rows,
      };
    }

    res.json({ success: true, data: settlements, consignment_summary });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settlements  (admin/staff)
 */
const getSettlements = async (req, res, next) => {
  try {
    const { status, consignor_id, page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const params = [];
    const conds = [];
    let idx = 1;

    if (status)       { params.push(status);       conds.push(`s.status = $${idx++}`); }
    if (consignor_id) { params.push(consignor_id); conds.push(`s.consignor_id = $${idx++}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * safeLimit;

    const countResult = await db.query(`SELECT COUNT(*) FROM settlements s ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await db.query(
      `SELECT s.*, co.full_name, co.phone
       FROM settlements s
       LEFT JOIN consignors co ON co.id = s.consignor_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: Number(page), limit: safeLimit, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/settlements  (admin/staff)
 */
const createSettlement = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { consignor_id, period_start, period_end, notes } = req.body;

    await client.query('BEGIN');

    // Get sold products in duration for this consignor — lock rows to prevent double-settlement
    const products = await client.query(
      `SELECT * FROM products
       WHERE consignor_id = $1 AND status = 'sold'
         AND sold_at BETWEEN $2 AND $3
         AND id NOT IN (
           SELECT product_id FROM settlement_items WHERE product_id IS NOT NULL
         )
       FOR UPDATE`,
      [consignor_id, period_start, period_end]
    );

    const totalSale       = products.rows.reduce((s, p) => s + Number(p.sale_price), 0);
    const totalCommission = products.rows.reduce((s, p) => s + Number(p.commission_amount), 0);
    const totalPayout     = products.rows.reduce((s, p) => s + Number(p.consignor_amount), 0);

    if (totalPayout === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: products.rows.length === 0
          ? 'Không có sản phẩm đã bán nào trong khoảng thời gian này chưa được quyết toán.'
          : 'Số tiền quyết toán bằng 0, không thể tạo quyết toán.',
      });
    }

    const code = `QT-${Date.now().toString().slice(-8)}`;

    const s = await client.query(
      `INSERT INTO settlements
         (consignor_id, code, period_start, period_end, total_sale, total_commission, total_payout, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [consignor_id, code, period_start, period_end, totalSale, totalCommission, totalPayout, notes]
    );

    // Insert items
    for (const p of products.rows) {
      await client.query(
        `INSERT INTO settlement_items
           (settlement_id, product_id, product_name, product_code, sale_price, commission, consignor_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [s.rows[0].id, p.id, p.name, p.code, p.sale_price, p.commission_amount, p.consignor_amount]
      );
    }

    await client.query('COMMIT');
    const saved = s.rows[0];
    res.status(201).json({ success: true, data: saved });

    // Fire-and-forget email to consignor
    try {
      const coRow = await db.query('SELECT full_name, email FROM consignors WHERE id = $1', [consignor_id]);
      if (coRow.rows.length && coRow.rows[0].email) {
        _sendSettlementEmail(saved, coRow.rows[0].email, coRow.rows[0].full_name, products.rows.length);
      }
    } catch (mailErr) {
      logger.error({ err: mailErr }, '[EMAIL] settlement_created lookup error');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * POST /api/settlements/bulk  (admin/staff)
 * Tạo quyết toán cho tất cả khách hàng có sản phẩm đã bán trong kỳ
 */
const bulkCreateSettlements = async (req, res, next) => {
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) {
    return res.status(400).json({ success: false, message: 'Cần chọn khoảng thời gian' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Find all consignors with unsettled sold products in period
    const consignorRows = await client.query(
      `SELECT DISTINCT p.consignor_id
       FROM products p
       WHERE p.status = 'sold'
         AND p.sold_at BETWEEN $1 AND $2
         AND p.consignor_id IS NOT NULL
         AND p.id NOT IN (
           SELECT product_id FROM settlement_items WHERE product_id IS NOT NULL
         )`,
      [period_start, period_end]
    );

    if (!consignorRows.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Không có khách hàng nào có sản phẩm chưa quyết toán trong khoảng thời gian này.',
      });
    }

    const created = [];
    const skipped = [];
    const baseTs = Date.now().toString().slice(-6);

    for (let i = 0; i < consignorRows.rows.length; i++) {
      const { consignor_id } = consignorRows.rows[i];
      const products = await client.query(
        `SELECT * FROM products
         WHERE consignor_id = $1 AND status = 'sold'
           AND sold_at BETWEEN $2 AND $3
           AND id NOT IN (
             SELECT product_id FROM settlement_items WHERE product_id IS NOT NULL
           )`,
        [consignor_id, period_start, period_end]
      );

      const totalSale       = products.rows.reduce((s, p) => s + Number(p.sale_price), 0);
      const totalCommission = products.rows.reduce((s, p) => s + Number(p.commission_amount), 0);
      const totalPayout     = products.rows.reduce((s, p) => s + Number(p.consignor_amount), 0);

      if (totalPayout === 0) { skipped.push(consignor_id); continue; }

      const code = `QT-${baseTs}-${String(i + 1).padStart(3, '0')}`;
      const s = await client.query(
        `INSERT INTO settlements
           (consignor_id, code, period_start, period_end, total_sale, total_commission, total_payout)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [consignor_id, code, period_start, period_end, totalSale, totalCommission, totalPayout]
      );

      for (const p of products.rows) {
        await client.query(
          `INSERT INTO settlement_items
             (settlement_id, product_id, product_name, product_code, sale_price, commission, consignor_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [s.rows[0].id, p.id, p.name, p.code, p.sale_price, p.commission_amount, p.consignor_amount]
        );
      }

      created.push({ settlement: s.rows[0], consignor_id, itemCount: products.rows.length });
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      count: created.length,
      skipped: skipped.length,
      message: `Đã tạo ${created.length} quyết toán${skipped.length ? `, bỏ qua ${skipped.length} khách có số tiền = 0` : ''}.`,
    });

    // Fire-and-forget emails for each created settlement
    for (const { settlement, consignor_id: cid, itemCount } of created) {
      try {
        const coRow = await db.query('SELECT full_name, email FROM consignors WHERE id = $1', [cid]);
        if (coRow.rows.length && coRow.rows[0].email) {
          _sendSettlementEmail(settlement, coRow.rows[0].email, coRow.rows[0].full_name, itemCount);
        }
      } catch (mailErr) {
        logger.error({ err: mailErr }, '[EMAIL] bulk settlement_created email error');
      }
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/settlements/:id/pay  (admin/staff)
 */
const markPaid = async (req, res, next) => {
  try {
    const { payment_notes } = req.body;
    const check = await db.query('SELECT status FROM settlements WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy quyết toán' });
    if (check.rows[0].status === 'paid') {
      return res.status(400).json({ success: false, message: 'Quyết toán đã được thanh toán rồi' });
    }
    if (check.rows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Không thể thanh toán quyết toán đã hủy' });
    }
    const result = await db.query(
      `UPDATE settlements SET status='paid', paid_at=NOW(), payment_notes=$2 WHERE id=$1 RETURNING *`,
      [req.params.id, payment_notes || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/settlements/:id  (admin/staff)
 * Only allowed when total_payout = 0
 */
const deleteSettlement = async (req, res, next) => {
  try {
    const check = await db.query('SELECT total_payout FROM settlements WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy quyết toán' });
    if (Number(check.rows[0].total_payout) !== 0) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể xóa quyết toán có giá trị = 0' });
    }
    await db.query('DELETE FROM settlements WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa quyết toán' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settlements/:id  (admin/staff)
 */
const getSettlement = async (req, res, next) => {
  try {
    const s = await db.query(
      `SELECT s.*, co.full_name, co.phone, co.code AS consignor_code,
              co.bank_id, co.bank_account_no, co.bank_account_name
       FROM settlements s
       LEFT JOIN consignors co ON co.id = s.consignor_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!s.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy quyết toán' });

    const items = await db.query(
      'SELECT * FROM settlement_items WHERE settlement_id = $1', [req.params.id]
    );
    res.json({ success: true, data: { ...s.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/settlements/:id/cancel  (admin/staff)
 * Only allowed when status = 'pending'
 */
const cancelSettlement = async (req, res, next) => {
  try {
    const check = await db.query('SELECT status, total_payout FROM settlements WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy quyết toán' });
    const { status, total_payout } = check.rows[0];
    if (status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Quyết toán đã được hủy rồi' });
    }
    const isZeroValue = Number(total_payout) === 0;
    if (status !== 'pending' && !isZeroValue) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy quyết toán ở trạng thái chờ thanh toán hoặc có giá trị bằng 0' });
    }
    const result = await db.query(
      `UPDATE settlements SET status='cancelled' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { lookupSettlement, getSettlements, createSettlement, bulkCreateSettlements, markPaid, getSettlement, cancelSettlement, deleteSettlement };
