-- ================================================================
-- Seed Data for H.U.N Thanh Ly Ky Gui
-- ================================================================

-- Admin user (password: Admin@123)
INSERT INTO users (username, password, full_name, email, role) VALUES
('admin', '$2b$10$rQZ9uAVQXzQb8FxPmzNWxOqRRESmh.2TByMoJlVRrEFR1Jx0tPYAm', 'Admin HUN', 'admin@hun.vn', 'admin'),
('staff1', '$2b$10$rQZ9uAVQXzQb8FxPmzNWxOqRRESmh.2TByMoJlVRrEFR1Jx0tPYAm', 'Nhân Viên 1', 'staff1@hun.vn', 'staff');

-- Locations
INSERT INTO locations (name, address, phone, type, sort_order) VALUES
('HSSV Trường Chinh', 'Cuối ngõ 109 Trường Chinh, Hà Nội', '0923002177', 'HSSV', 1),
('HSSV Dịch Vọng Hậu', '48 Dịch Vọng Hậu, Hà Nội', '0397710510', 'HSSV', 2),
('BRAND + HSSV Đào Duy Anh', '07 Đào Duy Anh, Hà Nội', '0972865615', 'BRAND+HSSV', 3);

-- Announcements
INSERT INTO announcements (content, is_active, sort_order) VALUES
('✦THÔNG BÁO: CƠ SỞ 321 ĐÊ LA THÀNH CHUYỂN SANG NGÕ 109 TRƯỜNG CHINH TỪ 04/04', true, 1),
('✦CHUYÊN THU MUA TÚI HIỆU & BRAND TẠI 07 ĐÀO DUY ANH', true, 2);

-- Categories
INSERT INTO categories (name, slug, sort_order) VALUES
('Quần áo nữ', 'quan-ao-nu', 1),
('Quần áo nam', 'quan-ao-nam', 2),
('Túi xách', 'tui-xach', 3),
('Giày dép', 'giay-dep', 4),
('Phụ kiện', 'phu-kien', 5),
('Nước hoa', 'nuoc-hoa', 6),
('Mỹ phẩm', 'my-pham', 7);

-- Sample consignors
INSERT INTO consignors (full_name, phone, email, code) VALUES
('Nguyễn Thị An', '0901234567', 'an@example.com', 'HUN-001'),
('Trần Thị Bình', '0912345678', 'binh@example.com', 'HUN-002'),
('Lê Thị Cúc', '0923456789', 'cuc@example.com', 'HUN-003');
