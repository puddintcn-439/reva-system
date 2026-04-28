-- ================================================================
-- Seed Data — REVA Thanh Lý Ký Gửi
-- Chạy sau schema.sql
-- ================================================================

-- ----------------------------------------------------------------
-- PERMISSIONS
-- ----------------------------------------------------------------
INSERT INTO permissions (name, description) VALUES
  ('dashboard:view',      'Xem tổng quan'),
  ('pos:sale',            'Tạo / xử lý đơn bán hàng (POS)'),
  ('pos:history',         'Xem lịch sử bán hàng'),
  ('consignments:view',   'Xem yêu cầu ký gửi'),
  ('consignments:manage', 'Duyệt / sửa yêu cầu ký gửi'),
  ('products:view',       'Xem sản phẩm'),
  ('products:manage',     'Thêm / sửa / xóa sản phẩm'),
  ('consignors:view',     'Xem thông tin khách hàng'),
  ('consignors:manage',   'Sửa thông tin khách hàng'),
  ('settlements:view',    'Xem quyết toán'),
  ('settlements:manage',  'Tạo / duyệt / thanh toán quyết toán'),
  ('purchases:view',      'Xem yêu cầu thu mua'),
  ('purchases:manage',    'Cập nhật trạng thái thu mua'),
  ('settings:manage',     'Quản lý cài đặt (cơ sở, thông báo, ngân hàng, email)'),
  ('settings:system',     'Quản lý cài đặt hệ thống cấp cao (SMTP, CORS, JWT)'),
  ('users:manage',        'Quản lý tài khoản người dùng'),
  ('reports:view',        'Xem báo cáo / thống kê')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------
-- ROLE PERMISSIONS
-- ----------------------------------------------------------------
-- superadmin: tất cả
INSERT INTO role_permissions (role, permission)
SELECT 'superadmin', name FROM permissions
ON CONFLICT DO NOTHING;

-- admin: tất cả trừ settings:system
INSERT INTO role_permissions (role, permission)
SELECT 'admin', name FROM permissions WHERE name != 'settings:system'
ON CONFLICT DO NOTHING;

-- manager
INSERT INTO role_permissions (role, permission) VALUES
  ('manager', 'dashboard:view'),
  ('manager', 'pos:sale'),
  ('manager', 'pos:history'),
  ('manager', 'consignments:view'),
  ('manager', 'consignments:manage'),
  ('manager', 'products:view'),
  ('manager', 'products:manage'),
  ('manager', 'consignors:view'),
  ('manager', 'consignors:manage'),
  ('manager', 'settlements:view'),
  ('manager', 'purchases:view'),
  ('manager', 'purchases:manage'),
  ('manager', 'reports:view')
ON CONFLICT DO NOTHING;

-- staff
INSERT INTO role_permissions (role, permission) VALUES
  ('staff', 'dashboard:view'),
  ('staff', 'pos:sale'),
  ('staff', 'pos:history'),
  ('staff', 'consignments:view'),
  ('staff', 'consignments:manage'),
  ('staff', 'products:view'),
  ('staff', 'products:manage'),
  ('staff', 'consignors:view'),
  ('staff', 'consignors:manage'),
  ('staff', 'purchases:view'),
  ('staff', 'purchases:manage')
ON CONFLICT DO NOTHING;

-- cashier
INSERT INTO role_permissions (role, permission) VALUES
  ('cashier', 'pos:sale'),
  ('cashier', 'pos:history'),
  ('cashier', 'products:view')
ON CONFLICT DO NOTHING;

-- accountant
INSERT INTO role_permissions (role, permission) VALUES
  ('accountant', 'dashboard:view'),
  ('accountant', 'pos:history'),
  ('accountant', 'settlements:view'),
  ('accountant', 'settlements:manage'),
  ('accountant', 'reports:view')
ON CONFLICT DO NOTHING;

-- inventory
INSERT INTO role_permissions (role, permission) VALUES
  ('inventory', 'products:view'),
  ('inventory', 'products:manage'),
  ('inventory', 'settings:manage')
ON CONFLICT DO NOTHING;

-- viewer
INSERT INTO role_permissions (role, permission) VALUES
  ('viewer', 'dashboard:view'),
  ('viewer', 'pos:history'),
  ('viewer', 'products:view'),
  ('viewer', 'settlements:view'),
  ('viewer', 'reports:view')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- USERS
-- password hash = Admin@123 (bcrypt rounds=10)
-- Sau khi login, đổi password ngay qua trang Mật khẩu
-- ----------------------------------------------------------------
INSERT INTO users (username, password, full_name, email, role) VALUES
  ('admin',  '$2b$10$rQZ9uAVQXzQb8FxPmzNWxOqRRESmh.2TByMoJlVRrEFR1Jx0tPYAm', 'Admin REVA',    'admin@reva.vn',  'superadmin'),
  ('staff1', '$2b$10$rQZ9uAVQXzQb8FxPmzNWxOqRRESmh.2TByMoJlVRrEFR1Jx0tPYAm', 'Nhân Viên 1',   'staff1@reva.vn', 'staff')
ON CONFLICT (username) DO NOTHING;

-- ----------------------------------------------------------------
-- LOCATIONS
-- ----------------------------------------------------------------
INSERT INTO locations (name, address, phone, type, sort_order) VALUES
  ('HSSV Trường Chinh',        'Cuối ngõ 109 Trường Chinh, Hà Nội', '0923002177', 'HSSV',       1),
  ('HSSV Dịch Vọng Hậu',       '48 Dịch Vọng Hậu, Hà Nội',         '0397710510', 'HSSV',       2),
  ('BRAND + HSSV Đào Duy Anh', '07 Đào Duy Anh, Hà Nội',           '0972865615', 'BRAND+HSSV', 3)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- ANNOUNCEMENTS
-- ----------------------------------------------------------------
INSERT INTO announcements (content, is_active, sort_order) VALUES
  ('✦THÔNG BÁO: CƠ SỞ 321 ĐÊ LA THÀNH CHUYỂN SANG NGÕ 109 TRƯỜNG CHINH TỪ 04/04', true, 1),
  ('✦CHUYÊN THU MUA TÚI HIỆU & BRAND TẠI 07 ĐÀO DUY ANH', true, 2)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Quần áo nữ', 'quan-ao-nu', 1),
  ('Quần áo nam', 'quan-ao-nam', 2),
  ('Túi xách',   'tui-xach',   3),
  ('Giày dép',   'giay-dep',   4),
  ('Phụ kiện',   'phu-kien',   5),
  ('Nước hoa',   'nuoc-hoa',   6),
  ('Mỹ phẩm',    'my-pham',    7)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- BANK ACCOUNTS
-- ----------------------------------------------------------------
INSERT INTO bank_accounts (bank_id, bank_name, account_no, account_name, is_active) VALUES
  ('TPB', 'TPBank', '04039907885', 'NGUYEN HOANG VU', TRUE)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- EMAIL TEMPLATES
-- ----------------------------------------------------------------
INSERT INTO email_templates (key, name, subject, body, variables) VALUES
  (
    'expiring_soon',
    'Nhắc nhở sắp hết hạn ký gửi',
    'Sản phẩm của bạn sắp hết hạn ký gửi tại REVA',
    $body$Xin chào {{full_name}},

Chúng tôi xin thông báo rằng sản phẩm ký gửi của bạn sắp đến ngày hết hạn:

🏷️ Sản phẩm: {{product_name}}
📦 Mã SP: {{product_code}}
💰 Giá bán: {{sale_price}}
📅 Ngày hết hạn: {{consign_end}}

Nếu bạn muốn gia hạn hoặc thu hồi sản phẩm, vui lòng liên hệ cửa hàng REVA trong thời gian sớm nhất.

Trân trọng,
Đội ngũ REVA Thanh Lý Ký Gửi
📞 Hotline: 0923002177$body$,
    'full_name,product_name,product_code,sale_price,consign_end'
  )
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- SYSTEM SETTINGS
-- ----------------------------------------------------------------
INSERT INTO system_settings (key, value, label, description, is_secret) VALUES
  ('smtp_host',   '',                      'SMTP Host',        'Ví dụ: smtp.gmail.com',                                    FALSE),
  ('smtp_port',   '587',                   'SMTP Port',        '587 (TLS) hoặc 465 (SSL)',                                 FALSE),
  ('smtp_secure', 'false',                 'SMTP Secure',      'true nếu dùng port 465',                                   FALSE),
  ('smtp_user',   '',                      'SMTP Username',    'Địa chỉ email gửi',                                        TRUE),
  ('smtp_pass',   '',                      'SMTP Password',    'App Password (không phải mật khẩu đăng nhập Gmail)',        TRUE),
  ('smtp_from',   'REVA <noreply@reva.vn>','SMTP From',        'Tên + email hiển thị khi gửi',                             FALSE),
  ('client_urls', 'https://reva-system-seven.vercel.app,https://reva.vn', 'Frontend URLs',    'Domain frontend được phép truy cập API, cách nhau bằng ,', FALSE),
  ('jwt_secret',  '',                      'JWT Secret',       'Chuỗi bí mật ký token. Để trống = dùng biến môi trường',   TRUE)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- SAMPLE CONSIGNORS (có thể xoá sau)
-- ----------------------------------------------------------------
INSERT INTO consignors (full_name, phone, email, code) VALUES
  ('Nguyễn Thị An',  '0901234567', 'an@example.com',   'HUN-001'),
  ('Trần Thị Bình',  '0912345678', 'binh@example.com', 'HUN-002'),
  ('Lê Thị Cúc',     '0923456789', 'cuc@example.com',  'HUN-003')
ON CONFLICT (code) DO NOTHING;

