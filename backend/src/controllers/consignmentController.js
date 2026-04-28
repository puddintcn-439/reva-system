const db = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * POST /api/consignments  - Public: submit consignment request
 */
const createConsignment = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const {
      full_name, phone, email, address,
      request_type, location_id, scheduled_date, notes,
    } = req.body;

    await client.query('BEGIN');

    // Upsert consignor by phone
    let consignorId;
    const existingConsignor = await client.query(
      'SELECT id FROM consignors WHERE phone = $1', [phone]
    );
    if (existingConsignor.rows.length) {
      consignorId = existingConsignor.rows[0].id;
      await client.query(
        'UPDATE consignors SET full_name=$1, email=$2, address=$3 WHERE id=$4',
        [full_name, email, address, consignorId]
      );
    } else {
      // Generate a lookup code
      const code = `HUN-${Date.now().toString().slice(-6)}`;
      const newConsignor = await client.query(
        `INSERT INTO consignors (full_name, phone, email, address, code)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [full_name, phone, email, address, code]
      );
      consignorId = newConsignor.rows[0].id;
    }

    // Coerce empty strings to null for nullable fields to avoid type errors (uuid/date)
    const locationIdParam = location_id && String(location_id).trim() !== '' ? location_id : null;
    const scheduledDateParam = scheduled_date && String(scheduled_date).trim() !== '' ? scheduled_date : null;

    const requestResult = await client.query(
      `INSERT INTO consignment_requests
         (consignor_id, request_type, location_id, scheduled_date, notes, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [consignorId, request_type || 'direct', locationIdParam, scheduledDateParam, notes]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Yêu cầu ký gửi đã được ghi nhận. Chúng tôi sẽ liên hệ bạn sớm!',
      data: requestResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/consignments  (admin/staff)
 */
const getConsignments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conds = [];
    let idx = 1;

    if (status) { params.push(status); conds.push(`cr.status = $${idx++}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await db.query(`SELECT COUNT(*) FROM consignment_requests cr ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(Number(limit), offset);
    const result = await db.query(
      `SELECT cr.*, co.full_name, co.phone, co.email, co.code AS consignor_code,
              l.name AS location_name
       FROM consignment_requests cr
       LEFT JOIN consignors co ON co.id = cr.consignor_id
       LEFT JOIN locations l ON l.id = cr.location_id
       ${where}
       ORDER BY cr.created_at DESC
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
 * GET /api/consignments/:id  (admin/staff)
 */
const getConsignment = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT cr.*, co.full_name, co.phone, co.email, co.address, co.code AS consignor_code,
              l.name AS location_name, l.address AS location_address
       FROM consignment_requests cr
       LEFT JOIN consignors co ON co.id = cr.consignor_id
       LEFT JOIN locations l ON l.id = cr.location_id
       WHERE cr.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/consignments/:id/status  (admin/staff)
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const result = await db.query(
      `UPDATE consignment_requests SET status=$1, admin_notes=$2 WHERE id=$3 RETURNING *`,
      [status, admin_notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createConsignment, getConsignments, getConsignment, updateStatus };
