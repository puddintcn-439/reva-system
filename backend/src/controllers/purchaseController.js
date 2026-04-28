const db = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * POST /api/purchases  - Public: submit purchase request (Thu Mua)
 */
const createPurchaseRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { full_name, phone, email, item_type, quantity_kg, description, location_id } = req.body;
    const result = await db.query(
      `INSERT INTO purchase_requests
         (full_name, phone, email, item_type, quantity_kg, description, location_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [full_name, phone, email, item_type, quantity_kg, description, location_id]
    );
    res.status(201).json({
      success: true,
      message: 'Yêu cầu thu mua đã được ghi nhận. Chúng tôi sẽ liên hệ bạn sớm!',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/purchases  (admin/staff)
 */
const getPurchaseRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE status = $1'; }
    const offset = (Number(page) - 1) * Number(limit);
    const countResult = await db.query(`SELECT COUNT(*) FROM purchase_requests ${where}`, params);
    const total = parseInt(countResult.rows[0].count);
    const lIdx = params.length + 1;
    params.push(Number(limit), offset);
    const result = await db.query(
      `SELECT pr.*, l.name AS location_name FROM purchase_requests pr
       LEFT JOIN locations l ON l.id = pr.location_id
       ${where} ORDER BY pr.created_at DESC LIMIT $${lIdx} OFFSET $${lIdx + 1}`,
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
 * PATCH /api/purchases/:id/status  (admin/staff)
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const result = await db.query(
      `UPDATE purchase_requests SET status=$1, admin_notes=$2 WHERE id=$3 RETURNING *`,
      [status, admin_notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPurchaseRequest, getPurchaseRequests, updateStatus };
