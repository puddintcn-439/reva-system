const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const sysSettings = require('../config/systemSettings');

/** Fetch permissions array for a given role from DB */
async function getPermissions(role) {
  try {
    const result = await db.query(
      'SELECT permission FROM role_permissions WHERE role = $1',
      [role]
    );
    return result.rows.map((r) => r.permission);
  } catch {
    // role_permissions table may not exist yet (migration pending)
    return [];
  }
}

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
      [username]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const permissions = await getPermissions(user.role);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      await sysSettings.getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userInfo } = user;
    res.json({ success: true, token, user: { ...userInfo, permissions } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, u.is_active,
              u.location_id, l.name AS location_name, u.created_at
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }
    const permissions = await getPermissions(req.user.role);
    res.json({ success: true, user: { ...result.rows[0], permissions } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/users  (admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, u.is_active, u.created_at,
              u.location_id, l.name AS location_name
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       ORDER BY u.created_at`
    );
    res.json({ success: true, users: result.rows });
  } catch (err) { next(err); }
};

/**
 * POST /api/auth/users  (admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, password, full_name, email, role, location_id } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'username, password và role là bắt buộc' });
    }
    const VALID_ROLES = ['superadmin','admin','manager','staff','cashier','accountant','inventory','viewer'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, password, full_name, email, role, location_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, email, role, location_id, is_active, created_at`,
      [username, hash, full_name || null, email || null, role, location_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Username hoặc email đã tồn tại' });
    }
    next(err);
  }
};

/**
 * PUT /api/auth/users/:id  (admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { full_name, email, role, is_active, password, location_id } = req.body;
    const VALID_ROLES = ['superadmin','admin','manager','staff','cashier','accountant','inventory','viewer'];
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    const updates = []; const params = []; let idx = 1;
    if (full_name !== undefined)  { params.push(full_name);  updates.push(`full_name=$${idx++}`); }
    if (email !== undefined)      { params.push(email);      updates.push(`email=$${idx++}`); }
    if (role !== undefined)       { params.push(role);       updates.push(`role=$${idx++}`); }
    if (is_active !== undefined)  { params.push(is_active);  updates.push(`is_active=$${idx++}`); }
    if ('location_id' in req.body){ params.push(location_id || null); updates.push(`location_id=$${idx++}`); }
    if (password)                 { const h = await bcrypt.hash(password, 10); params.push(h); updates.push(`password=$${idx++}`); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Không có gì để cập nhật' });

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(',')} WHERE id=$${idx} RETURNING id,username,full_name,email,role,location_id,is_active`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/auth/users/:id  (admin only — cannot delete self)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Không thể xóa chính mình' });
    }
    const result = await db.query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    res.json({ success: true, message: 'Đã xóa tài khoản' });
  } catch (err) { next(err); }
};

module.exports = { login, getMe, changePassword, getUsers, createUser, updateUser, deleteUser };
