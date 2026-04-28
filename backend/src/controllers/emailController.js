const db = require('../config/database');
const { interpolate, sendMail } = require('../config/email');

/**
 * GET /api/email-templates
 */
const getTemplates = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM email_templates ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

/**
 * PUT /api/email-templates/:key
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { subject, body, name } = req.body;
    const result = await db.query(
      `UPDATE email_templates
       SET subject=$1, body=$2, name=COALESCE($3, name), updated_at=NOW()
       WHERE key=$4 RETURNING *`,
      [subject, body, name, req.params.key]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy template' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/**
 * POST /api/email/templates
 */
const createTemplate = async (req, res, next) => {
  try {
    const { key, name, subject, body, variables } = req.body;
    if (!key || !name || !subject || !body) {
      return res.status(400).json({ success: false, message: 'key, name, subject, body là bắt buộc' });
    }
    const result = await db.query(
      `INSERT INTO email_templates (key, name, subject, body, variables)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [key.toLowerCase().replace(/\s+/g, '_'), name, subject, body, variables || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Key đã tồn tại' });
    next(err);
  }
};

/**
 * DELETE /api/email/templates/:key
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM email_templates WHERE key=$1 RETURNING key', [req.params.key]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy template' });
    res.json({ success: true, message: 'Đã xóa template' });
  } catch (err) { next(err); }
};

/**
 * GET /api/products/expiring?days=3
 * Products whose consign_end is within `days` days and status = 'active'
 */
const getExpiringProducts = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '3');
    const result = await db.query(
      `SELECT p.*, co.full_name, co.email AS consignor_email, co.phone AS consignor_phone, co.code AS consignor_code
       FROM products p
       LEFT JOIN consignors co ON co.id = p.consignor_id
       WHERE p.status = 'active'
         AND p.consign_end IS NOT NULL
         AND p.consign_end BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 * INTERVAL '1 day')
       ORDER BY p.consign_end ASC`,
      [days]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

/**
 * POST /api/email-templates/send-expiring
 * Body: { product_ids: [...], days: 3 }  (empty product_ids = send to all expiring)
 */
const sendExpiringReminders = async (req, res, next) => {
  try {
    const days = parseInt(req.body.days || '3');
    const filterIds = req.body.product_ids; // optional array
    const templateKey = req.body.template_key || 'expiring_soon';

    // Fetch template
    const tpl = await db.query('SELECT * FROM email_templates WHERE key=$1', [templateKey]);
    if (!tpl.rows.length) return res.status(400).json({ success: false, message: 'Không tìm thấy template email' });
    const template = tpl.rows[0];

    // Fetch expiring products
    let query = `
      SELECT p.*, co.full_name, co.email AS consignor_email, co.phone AS consignor_phone
      FROM products p
      LEFT JOIN consignors co ON co.id = p.consignor_id
      WHERE p.status = 'active'
        AND p.consign_end IS NOT NULL
        AND p.consign_end BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 * INTERVAL '1 day')
    `;
    const params = [days];
    if (filterIds && filterIds.length) {
      params.push(filterIds);
      query += ` AND p.id = ANY($2)`;
    }
    query += ' ORDER BY co.id, p.consign_end';

    const products = await db.query(query, params);

    if (!products.rows.length) {
      return res.json({ success: true, sent: 0, skipped: 0, message: 'Không có sản phẩm nào sắp hết hạn' });
    }

    let sent = 0, skipped = 0;
    const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
    const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

    for (const p of products.rows) {
      if (!p.consignor_email) { skipped++; continue; }

      const vars = {
        full_name: p.full_name || 'Quý khách',
        product_name: p.name,
        product_code: p.code || '',
        sale_price: fmtMoney(p.sale_price),
        consign_end: fmt(p.consign_end),
      };

      const subject = interpolate(template.subject, vars);
      const body = interpolate(template.body, vars);

      try {
        await sendMail(p.consignor_email, subject, body);
        sent++;
      } catch (mailErr) {
        console.error(`Failed to send to ${p.consignor_email}:`, mailErr.message);
        skipped++;
      }
    }

    res.json({
      success: true,
      sent,
      skipped,
      message: `Đã gửi ${sent} email${skipped ? `, bỏ qua ${skipped} (không có email)` : ''}`,
    });
  } catch (err) { next(err); }
};

module.exports = { getTemplates, createTemplate, updateTemplate, deleteTemplate, getExpiringProducts, sendExpiringReminders };
