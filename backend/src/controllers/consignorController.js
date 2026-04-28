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

// Admin dashboard stats
const getStats = async (req, res, next) => {
  try {
    const [products, consignors, settlements, requests] = await Promise.all([
      db.query(`SELECT 
        COUNT(*) FILTER (WHERE status='active') AS active_count,
        COUNT(*) FILTER (WHERE status='sold') AS sold_count,
        COUNT(*) FILTER (WHERE status='pending') AS pending_count,
        SUM(sale_price) FILTER (WHERE status='sold') AS total_revenue,
        SUM(commission_amount) FILTER (WHERE status='sold') AS total_commission,
        SUM(consignor_amount) FILTER (WHERE status='sold') AS total_payout_all
        FROM products`),
      db.query('SELECT COUNT(*) FROM consignors'),
      db.query(`SELECT 
        COUNT(*) FILTER (WHERE status='pending') AS pending_count,
        SUM(total_payout) FILTER (WHERE status='pending') AS pending_payout
        FROM settlements`),
      db.query(`SELECT COUNT(*) FILTER (WHERE status='pending') AS pending FROM consignment_requests`),
    ]);
    res.json({
      success: true,
      data: {
        products: products.rows[0],
        consignors: { total: consignors.rows[0].count },
        settlements: settlements.rows[0],
        consignment_requests: requests.rows[0],
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getConsignors, getConsignor, updateConsignor, getStats };
