const db = require('../config/database');

const getConsignors = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = 'WHERE full_name ILIKE $1 OR phone ILIKE $1 OR code ILIKE $1';
    }
    const offset = (Number(page) - 1) * Number(limit);
    const countResult = await db.query(`SELECT COUNT(*) FROM consignors ${where}`, params);
    const total = parseInt(countResult.rows[0].count);
    const lIdx = params.length + 1;
    params.push(Number(limit), offset);
    const result = await db.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM products WHERE consignor_id = c.id) AS product_count,
         (SELECT COUNT(*) FROM products WHERE consignor_id = c.id AND status='sold') AS sold_count
       FROM consignors c ${where}
       ORDER BY c.created_at DESC
       LIMIT $${lIdx} OFFSET $${lIdx + 1}`,
      params
    );
    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

const getConsignor = async (req, res, next) => {
  try {
    const c = await db.query('SELECT * FROM consignors WHERE id=$1', [req.params.id]);
    if (!c.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    const products = await db.query(
      'SELECT * FROM products WHERE consignor_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    const settlements = await db.query(
      'SELECT * FROM settlements WHERE consignor_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: { ...c.rows[0], products: products.rows, settlements: settlements.rows } });
  } catch (err) { next(err); }
};

const updateConsignor = async (req, res, next) => {
  try {
    const { full_name, phone, email, address, notes } = req.body;
    const result = await db.query(
      `UPDATE consignors SET full_name=$1, phone=$2, email=$3, address=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [full_name, phone, email, address, notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// Admin dashboard stats — optimized: single DB roundtrip + cache (Redis if configured)
const cache = require('../lib/cache');
const STATS_TTL = 15; // seconds

const getStats = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:stats:v1';
    const cached = await cache.get(cacheKey);
    if (cached) {
      try { return res.json({ success: true, data: JSON.parse(cached) }); } catch (e) {}
    }

    const q = await db.query(`
      SELECT
        (SELECT json_build_object(
          'active_count', COUNT(*) FILTER (WHERE status='active'),
          'sold_count', COUNT(*) FILTER (WHERE status='sold'),
          'pending_count', COUNT(*) FILTER (WHERE status='pending'),
          'total_revenue', SUM(sale_price) FILTER (WHERE status='sold'),
          'total_commission', SUM(commission_amount) FILTER (WHERE status='sold'),
          'total_payout_all', SUM(consignor_amount) FILTER (WHERE status='sold')
        ) FROM products) AS products,
        (SELECT COUNT(*) FROM consignors) AS consignors_total,
        (SELECT json_build_object(
          'pending_count', COUNT(*) FILTER (WHERE status='pending'),
          'pending_payout', SUM(total_payout) FILTER (WHERE status='pending')
        ) FROM settlements) AS settlements,
        (SELECT json_build_object('pending', COUNT(*) FILTER (WHERE status='pending')) FROM consignment_requests) AS consignment_requests
    `);

    const row = q.rows[0] || {};
    const data = {
      products: row.products || {},
      consignors: { total: parseInt(row.consignors_total || 0, 10) },
      settlements: row.settlements || {},
      consignment_requests: row.consignment_requests || {},
    };

    // cache the JSON string
    try { await cache.set(cacheKey, JSON.stringify(data), STATS_TTL); } catch (e) {}

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getConsignors, getConsignor, updateConsignor, getStats };
