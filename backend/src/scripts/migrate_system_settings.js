/**
 * Migration: create system_settings table.
 * Usage: node src/scripts/migrate_system_settings.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/database');

const SQL = `
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  label       VARCHAR(200),
  description TEXT,
  is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default SMTP settings (empty — admin fills in via UI)
INSERT INTO system_settings (key, value, label, description, is_secret) VALUES
  ('smtp_host',   '',                'SMTP Host',       'Ví dụ: smtp.gmail.com',                     FALSE),
  ('smtp_port',   '587',             'SMTP Port',       '587 (TLS) hoặc 465 (SSL)',                  FALSE),
  ('smtp_secure', 'false',           'SMTP Secure',     'true nếu dùng port 465',                    FALSE),
  ('smtp_user',   '',                'SMTP Username',   'Địa chỉ email gửi',                          TRUE),
  ('smtp_pass',   '',                'SMTP Password',   'App Password (không phải mật khẩu đăng nhập)', TRUE),
  ('smtp_from',   'REVA <noreply@reva.vn>', 'SMTP From', 'Tên + email hiển thị khi gửi',             FALSE),
  ('client_urls', 'https://reva.vn', 'Frontend URLs',   'Domain frontend được phép, phân cách bằng dấu phẩy', FALSE),
  ('jwt_secret',  '',                'JWT Secret',      'Chuỗi bí mật ký token đăng nhập. Nếu để trống sẽ dùng biến môi trường JWT_SECRET', TRUE)
ON CONFLICT (key) DO NOTHING;
`;

async function run() {
  try {
    await db.query(SQL);
    console.log('✅ system_settings table created and seeded');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
