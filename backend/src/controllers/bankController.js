const db = require('../config/database');

// GET /api/banks  — public (for POS QR)
const getBanks = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM bank_accounts ORDER BY created_at');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/banks/active  — public, returns single active bank
const getActiveBank = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM bank_accounts WHERE is_active = TRUE LIMIT 1'
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) { next(err); }
};

// POST /api/banks
const createBank = async (req, res, next) => {
  try {
    const { bank_id, bank_name, account_no, account_name } = req.body;
    if (!bank_id || !bank_name || !account_no || !account_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }
    const result = await db.query(
      `INSERT INTO bank_accounts (bank_id, bank_name, account_no, account_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [bank_id.toUpperCase(), bank_name, account_no, account_name.toUpperCase()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/banks/:id
const updateBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bank_id, bank_name, account_no, account_name } = req.body;
    const result = await db.query(
      `UPDATE bank_accounts
       SET bank_id = $1, bank_name = $2, account_no = $3, account_name = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [bank_id.toUpperCase(), bank_name, account_no, account_name.toUpperCase(), id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/banks/:id/set-active  — set as default payment bank
const setActiveBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE bank_accounts SET is_active = FALSE');
    const result = await db.query(
      'UPDATE bank_accounts SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/banks/:id
const deleteBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM bank_accounts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getBanks, getActiveBank, createBank, updateBank, setActiveBank, deleteBank };
