const db = require('../config/database');

const getAnnouncements = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM announcements WHERE is_active=TRUE ORDER BY sort_order, created_at'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const getAllAnnouncements = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM announcements ORDER BY sort_order, created_at');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { content, sort_order } = req.body;
    const result = await db.query(
      `INSERT INTO announcements (content, sort_order) VALUES ($1,$2) RETURNING *`,
      [content, sort_order || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const { content, is_active, sort_order } = req.body;
    const result = await db.query(
      `UPDATE announcements SET content=$1, is_active=$2, sort_order=$3 WHERE id=$4 RETURNING *`,
      [content, is_active, sort_order, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await db.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (err) { next(err); }
};

module.exports = { getAnnouncements, getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
