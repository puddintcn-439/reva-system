const jwt = require('jsonwebtoken');
const db = require('../config/database');
const sysSettings = require('../config/systemSettings');

// ─────────────────────────────────────────────────────────────
// In-process cache: role → Set<permission>
// Invalidated on first miss; reloads lazily from DB.
// ─────────────────────────────────────────────────────────────
let _permCache = null;

async function getPermissionsForRole(role) {
  if (!_permCache) {
    const result = await db.query('SELECT role, permission FROM role_permissions');
    _permCache = {};
    for (const row of result.rows) {
      if (!_permCache[row.role]) _permCache[row.role] = new Set();
      _permCache[row.role].add(row.permission);
    }
  }
  return _permCache[role] || new Set();
}

/** Call this after changing role_permissions in DB to force reload. */
const invalidatePermCache = () => { _permCache = null; };

// ─────────────────────────────────────────────────────────────

/**
 * Verify JWT and attach user to req.user.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Không có token xác thực' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = await sysSettings.getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const result = await db.query(
      'SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ' });
    }
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

/**
 * Optional auth: attach user if token present, otherwise continue as guest.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const secret = await sysSettings.getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const result = await db.query(
      'SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
  } catch { /* ignore invalid token */ }
  next();
};

/**
 * Only allow admin role.
 */
const requireAdmin = (req, res, next) => {
  // Allow both admin and superadmin to pass admin-only checks
  if (!['superadmin', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }
  next();
};

/**
 * Allow admin and staff roles (block 'cashier', 'others', etc.).
 */
const requireStaff = (req, res, next) => {
  // Staff routes should allow admin and superadmin as well
  if (!['superadmin', 'admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }
  next();
};

/**
 * Permission-based access control.
 * Usage: router.post('/', authenticate, requirePermission('settlements:manage'), ctrl.create)
 */
const requirePermission = (permission) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực' });
    }
    const perms = await getPermissionsForRole(req.user.role);
    if (!perms.has(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thực hiện thao tác này',
        required: permission,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, optionalAuth, requireAdmin, requireStaff, requirePermission, invalidatePermCache };
