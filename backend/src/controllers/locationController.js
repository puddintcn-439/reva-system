const db = require('../config/database');

const getLocations = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM locations WHERE is_active = TRUE ORDER BY sort_order'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const getAllLocations = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM locations ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createLocation = async (req, res, next) => {
  try {
    const { name, address, phone, type, map_url, sort_order } = req.body;
    const result = await db.query(
      `INSERT INTO locations (name, address, phone, type, map_url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, address, phone, type, map_url, sort_order || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateLocation = async (req, res, next) => {
  try {
    const fields = ['name','address','phone','type','map_url','sort_order','is_active'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        let val = req.body[f];

        // Normalize empty strings for optional text fields to NULL
        if (val === '' && ['phone', 'type', 'map_url'].includes(f)) {
          val = null;
        }

        // Handle numeric sort_order: skip updating if empty/null to avoid NOT NULL violation
        if (f === 'sort_order') {
          if (val === '' || val == null) {
            continue; // do not include sort_order in update if not provided
          }
          val = Number(val);
          if (Number.isNaN(val)) continue;
        }

        // Coerce boolean-like values for is_active
        if (f === 'is_active') {
          if (typeof val === 'string') {
            const v = val.toLowerCase();
            if (v === '1' || v === 'true' || v === 'on') val = true;
            else if (v === '0' || v === 'false' || v === 'off') val = false;
            else continue; // skip invalid boolean
          } else {
            val = Boolean(val);
          }
        }

        params.push(val);
        updates.push(`${f} = $${idx++}`);
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteLocation = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM locations WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy cơ sở' });
    res.json({ success: true, message: 'Đã xóa cơ sở' });
  } catch (err) { next(err); }
};

module.exports = { getLocations, getAllLocations, createLocation, updateLocation, deleteLocation };
