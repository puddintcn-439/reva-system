const db = require('../config/database');
const settings = require('../config/systemSettings');
const nodemailer = require('nodemailer');

/** GET /api/system-settings */
const getAll = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT key, value, label, description, is_secret, updated_at
       FROM system_settings ORDER BY key`
    );
    // Mask secret values in response
    const rows = result.rows.map((r) => ({
      ...r,
      value: r.is_secret && r.value ? '••••••••' : r.value,
    }));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

/** PATCH /api/system-settings — body: { key: value, ... } */
const updateMany = async (req, res, next) => {
  try {
    const map = req.body;
    if (typeof map !== 'object' || Array.isArray(map)) {
      return res.status(400).json({ success: false, message: 'Body phải là object { key: value }' });
    }

    // Only allow known keys
    const allowed = new Set([
      'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from',
      'client_urls', 'jwt_secret',
    ]);
    const filtered = {};
    for (const [k, v] of Object.entries(map)) {
      if (allowed.has(k)) filtered[k] = String(v ?? '');
    }

    await settings.setMany(filtered);
    res.json({ success: true, message: 'Đã lưu cài đặt' });
  } catch (err) { next(err); }
};

/** POST /api/system-settings/test-smtp — kiểm tra kết nối SMTP */
const testSmtp = async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Thiếu email nhận thử' });

    const cfg = await settings.getSmtpConfig();
    if (!cfg.host || !cfg.user || !cfg.pass) {
      return res.status(400).json({ success: false, message: 'Chưa cấu hình SMTP đầy đủ' });
    }

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: cfg.from,
      to,
      subject: 'REVA — Test SMTP thành công',
      text: 'Email này xác nhận cài đặt SMTP của bạn đang hoạt động.',
    });

    res.json({ success: true, message: `Đã gửi email thử tới ${to}` });
  } catch (err) {
    res.status(400).json({ success: false, message: `SMTP lỗi: ${err.message}` });
  }
};

module.exports = { getAll, updateMany, testSmtp };
