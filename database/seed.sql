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
  ('admin',  '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Admin REVA',    'admin@reva.vn',  'superadmin'),
  ('staff1', '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Nhân Viên 1',   'staff1@reva.vn', 'staff')
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
  ('client_urls', 'https://reva-system-seven.vercel.app,https://*.vercel.app,https://reva.vn,http://localhost:5173,http://localhost:5174', 'Frontend URLs', 'Domain frontend được phép truy cập API, cách nhau bằng ,', FALSE),
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

-- ----------------------------------------------------------------
-- ADDITIONAL SAMPLE USERS
-- ----------------------------------------------------------------
INSERT INTO users (username, password, full_name, email, role) VALUES
  ('admin1',   '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Admin REVA',    'admin1@reva.vn',   'admin'),
  ('manager',  '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Manager REVA',  'manager@reva.vn',  'manager'),
  ('cashier',  '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Thu Ngân',      'cashier@reva.vn',  'cashier'),
  ('accountant','$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e','Kế Toán',      'accountant@reva.vn','accountant'),
  ('inventory','$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Quản Kho',      'inventory@reva.vn', 'inventory'),
  ('viewer',   '$2a$10$W0DsyQ.b3Viw3FBnrCztN.Sf5nErXBZhqbBX26HgV9Gtjb5.6ea7e', 'Người Xem',     'viewer@reva.vn',    'viewer')
ON CONFLICT (username) DO NOTHING;

-- ----------------------------------------------------------------
-- CONSIGNMENT REQUESTS (guarded inserts)
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM consignment_requests WHERE consignor_id = (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1) AND status='approved') THEN
    INSERT INTO consignment_requests (consignor_id, request_type, status, location_id, scheduled_date, notes)
    VALUES (
      (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1),
      'direct', 'approved', (SELECT id FROM locations WHERE name='HSSV Trường Chinh' LIMIT 1), CURRENT_DATE - INTERVAL '18 days', 'Yêu cầu ký gửi mẫu demo HUN-001'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM consignment_requests WHERE consignor_id = (SELECT id FROM consignors WHERE code='HUN-002' LIMIT 1) AND status='active') THEN
    INSERT INTO consignment_requests (consignor_id, request_type, status, location_id, scheduled_date, notes)
    VALUES (
      (SELECT id FROM consignors WHERE code='HUN-002' LIMIT 1),
      'online', 'active', (SELECT id FROM locations WHERE name='BRAND + HSSV Đào Duy Anh' LIMIT 1), CURRENT_DATE - INTERVAL '10 days', 'Yêu cầu ký gửi online demo HUN-002'
    );
  END IF;
END $$;

-- ----------------------------------------------------------------
-- PRODUCTS (with commission calculation pre-filled)
-- ----------------------------------------------------------------
INSERT INTO products (request_id, consignor_id, location_id, category_id, name, description, condition_percent, sale_price, commission_amount, consignor_amount, image_url, status, code, consign_start, consign_end)
VALUES
(
  (SELECT id FROM consignment_requests WHERE consignor_id = (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1) LIMIT 1),
  (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1),
  (SELECT id FROM locations WHERE name='HSSV Trường Chinh' LIMIT 1),
  (SELECT id FROM categories WHERE slug='quan-ao-nu' LIMIT 1),
  'Áo khoác nữ Zara size M', 'Áo khoác Zara, tình trạng tốt, size M', 90, 700000, 140000, 560000, NULL, 'active', 'RV-0001', CURRENT_DATE - INTERVAL '17 days', CURRENT_DATE + INTERVAL '43 days'
),
(
  (SELECT id FROM consignment_requests WHERE consignor_id = (SELECT id FROM consignors WHERE code='HUN-002' LIMIT 1) LIMIT 1),
  (SELECT id FROM consignors WHERE code='HUN-002' LIMIT 1),
  (SELECT id FROM locations WHERE name='BRAND + HSSV Đào Duy Anh' LIMIT 1),
  (SELECT id FROM categories WHERE slug='tui-xach' LIMIT 1),
  'Túi LV second-hand', 'Túi LV authentic, có vết xước nhẹ', 85, 3500000, 1050000, 2450000, NULL, 'active', 'RV-0002', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '48 days'
),
(
  (SELECT id FROM consignment_requests WHERE consignor_id = (SELECT id FROM consignors WHERE code='HUN-003' LIMIT 1) LIMIT 1),
  (SELECT id FROM consignors WHERE code='HUN-003' LIMIT 1),
  (SELECT id FROM locations WHERE name='HSSV Dịch Vọng Hậu' LIMIT 1),
  (SELECT id FROM categories WHERE slug='giay-dep' LIMIT 1),
  'Giày Nike Air 42', 'Giày Nike Air, size 42, like new', 95, 1200000, 300000, 900000, NULL, 'active', 'RV-0003', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days'
),
(
  NULL,
  (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1),
  (SELECT id FROM locations WHERE name='HSSV Trường Chinh' LIMIT 1),
  (SELECT id FROM categories WHERE slug='quan-ao-nu' LIMIT 1),
  'Đầm dạ hội vintage', 'Đầm dạ hội cổ điển, kích thước S', 88, 1500000, 300000, 1200000, NULL, 'active', 'RV-0004', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '40 days'
),
(
  NULL,
  (SELECT id FROM consignors WHERE code='HUN-002' LIMIT 1),
  (SELECT id FROM locations WHERE name='BRAND + HSSV Đào Duy Anh' LIMIT 1),
  (SELECT id FROM categories WHERE slug='my-pham' LIMIT 1),
  'Set mỹ phẩm Chanel mini', 'Bộ mini Chanel, đầy đủ sản phẩm', 90, 2000000, 600000, 1400000, NULL, 'active', 'RV-0005', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '52 days'
),
(
  NULL,
  (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1),
  (SELECT id FROM locations WHERE name='BRAND + HSSV Đào Duy Anh' LIMIT 1),
  (SELECT id FROM categories WHERE slug='nuoc-hoa' LIMIT 1),
  'Nước hoa Dior 50ml', 'Nước hoa Dior 50ml, gần đầy', 92, 3200000, 800000, 2400000, NULL, 'active', 'RV-0006', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '55 days'
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------
-- SALES + SALE_ITEMS (sample transactions)
-- ----------------------------------------------------------------
INSERT INTO sales (invoice_code, customer_name, customer_phone, total_amount, discount_amount, final_amount, payment_method, note, location_id, created_by, created_at)
VALUES (
  'INV-2026-0001', 'Khách lẻ', '0909999999', 1900000, 0, 1900000, 'cash', 'Thanh toán trực tiếp', (SELECT id FROM locations WHERE name='HSSV Trường Chinh' LIMIT 1), (SELECT id FROM users WHERE username='staff1' LIMIT 1), NOW()
)
ON CONFLICT (invoice_code) DO NOTHING;

DO $$
DECLARE s_id UUID;
BEGIN
  SELECT id INTO s_id FROM sales WHERE invoice_code='INV-2026-0001';
  IF s_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s_id AND product_code = 'RV-0001') THEN
    INSERT INTO sale_items (sale_id, product_id, product_name, product_code, sale_price, commission_amount, consignor_amount, consignor_id)
    VALUES (s_id, (SELECT id FROM products WHERE code='RV-0001' LIMIT 1), 'Áo khoác nữ Zara size M', 'RV-0001', 700000, 140000, 560000, (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1));
  END IF;
  IF s_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s_id AND product_code = 'RV-0003') THEN
    INSERT INTO sale_items (sale_id, product_id, product_name, product_code, sale_price, commission_amount, consignor_amount, consignor_id)
    VALUES (s_id, (SELECT id FROM products WHERE code='RV-0003' LIMIT 1), 'Giày Nike Air 42', 'RV-0003', 1200000, 300000, 900000, (SELECT id FROM consignors WHERE code='HUN-003' LIMIT 1));
  END IF;
END $$;

-- cập nhật trạng thái sản phẩm thành sold
UPDATE products SET status='sold', sold_at = (SELECT created_at FROM sales WHERE invoice_code='INV-2026-0001') WHERE code IN ('RV-0001','RV-0003');

-- ----------------------------------------------------------------
-- SETTLEMENTS + SETTLEMENT_ITEMS
-- ----------------------------------------------------------------
INSERT INTO settlements (consignor_id, code, period_start, period_end, total_sale, total_commission, total_payout, status, paid_at, notes, created_at, updated_at)
VALUES (
  (SELECT id FROM consignors WHERE code='HUN-001' LIMIT 1), 'SETTLE-2026-0001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 700000, 140000, 560000, 'pending', NULL, 'Quyết toán mẫu cho HUN-001', NOW(), NOW()
)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE sett_id UUID;
BEGIN
  SELECT id INTO sett_id FROM settlements WHERE code='SETTLE-2026-0001';
  IF sett_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM settlement_items WHERE settlement_id = sett_id AND product_code = 'RV-0001') THEN
    INSERT INTO settlement_items (settlement_id, product_id, product_name, product_code, sale_price, commission, consignor_amount)
    VALUES (sett_id, (SELECT id FROM products WHERE code='RV-0001' LIMIT 1), 'Áo khoác nữ Zara size M', 'RV-0001', 700000, 140000, 560000);
  END IF;
END $$;

INSERT INTO settlements (consignor_id, code, period_start, period_end, total_sale, total_commission, total_payout, status, paid_at, notes, created_at, updated_at)
VALUES (
  (SELECT id FROM consignors WHERE code='HUN-003' LIMIT 1), 'SETTLE-2026-0002', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 1200000, 300000, 900000, 'pending', NULL, 'Quyết toán mẫu cho HUN-003', NOW(), NOW()
)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE sett2 UUID;
BEGIN
  SELECT id INTO sett2 FROM settlements WHERE code='SETTLE-2026-0002';
  IF sett2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM settlement_items WHERE settlement_id = sett2 AND product_code = 'RV-0003') THEN
    INSERT INTO settlement_items (settlement_id, product_id, product_name, product_code, sale_price, commission, consignor_amount)
    VALUES (sett2, (SELECT id FROM products WHERE code='RV-0003' LIMIT 1), 'Giày Nike Air 42', 'RV-0003', 1200000, 300000, 900000);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- PURCHASE REQUESTS (sample)
-- ----------------------------------------------------------------
INSERT INTO purchase_requests (full_name, phone, email, item_type, quantity_kg, description, status, admin_notes, location_id, created_at, updated_at)
VALUES
  ('Người mua A', '0911222333', 'buyerA@example.com', 'vải', 12.50, 'Cần thu mua vải cổ điển', 'pending', NULL, (SELECT id FROM locations WHERE name='HSSV Dịch Vọng Hậu' LIMIT 1), NOW(), NOW()),
  ('Người mua B', '0911333444', 'buyerB@example.com', 'đồng hồ', NULL, 'Tìm đồng hồ vintage', 'pending', NULL, (SELECT id FROM locations WHERE name='BRAND + HSSV Đào Duy Anh' LIMIT 1), NOW(), NOW())
;

-- ----------------------------------------------------------------
-- AUDIT LOG SAMPLE
-- ----------------------------------------------------------------
INSERT INTO audit_logs (user_id, username, action, resource, resource_id, details, ip_address)
VALUES ((SELECT id FROM users WHERE username='admin' LIMIT 1), 'admin', 'seed:insert', 'seed.sql', NULL, '{"note":"Initial comprehensive seed"}', '127.0.0.1');



