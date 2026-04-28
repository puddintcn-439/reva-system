require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hun_consignment',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  // Fix categories
  const categories = [
    { name: 'Quần áo nữ',  slug: 'quan-ao-nu' },
    { name: 'Quần áo nam', slug: 'quan-ao-nam' },
    { name: 'Túi xách',    slug: 'tui-xach' },
    { name: 'Giày dép',    slug: 'giay-dep' },
    { name: 'Phụ kiện',    slug: 'phu-kien' },
    { name: 'Nước hoa',    slug: 'nuoc-hoa' },
    { name: 'Mỹ phẩm',     slug: 'my-pham' },
  ];
  for (const c of categories) {
    await pool.query('UPDATE categories SET name = $1 WHERE slug = $2', [c.name, c.slug]);
  }
  console.log('✅ Fixed categories');

  // Fix locations
  const locations = [
    { name: 'HSSV Trường Chinh',           address: 'Cuối ngõ 109 Trường Chinh, Hà Nội',  phone: '0923002177' },
    { name: 'HSSV Dịch Vọng Hậu',          address: '48 Dịch Vọng Hậu, Hà Nội',           phone: '0397710510' },
    { name: 'BRAND + HSSV Đào Duy Anh',    address: '07 Đào Duy Anh, Hà Nội',             phone: '0972865615' },
  ];
  for (const l of locations) {
    await pool.query('UPDATE locations SET name = $1, address = $2 WHERE phone = $3', [l.name, l.address, l.phone]);
  }
  console.log('✅ Fixed locations');

  // Fix announcements
  await pool.query(`UPDATE announcements SET content = $1 WHERE sort_order = 1`,
    ['✦THÔNG BÁO: CƠ SỞ 321 ĐÊ LA THÀNH CHUYỂN SANG NGÕ 109 TRƯỜNG CHINH TỪ 04/04']);
  await pool.query(`UPDATE announcements SET content = $1 WHERE sort_order = 2`,
    ['✦CHUYÊN THU MUA TÚI HIỆU & BRAND TẠI 07 ĐÀO DUY ANH']);
  console.log('✅ Fixed announcements');

  // Fix consignors
  const consignors = [
    { name: 'Nguyễn Thị An',  code: 'HUN-001' },
    { name: 'Trần Thị Bình',  code: 'HUN-002' },
    { name: 'Lê Thị Cúc',     code: 'HUN-003' },
  ];
  for (const c of consignors) {
    await pool.query('UPDATE consignors SET full_name = $1 WHERE code = $2', [c.name, c.code]);
  }
  console.log('✅ Fixed consignors');

  // Fix users
  await pool.query('UPDATE users SET full_name = $1 WHERE username = $2', ['Admin HUN', 'admin']);
  await pool.query('UPDATE users SET full_name = $1 WHERE username = $2', ['Nhân Viên 1', 'staff1']);
  console.log('✅ Fixed users');

  pool.end();
  console.log('\nDone! All Vietnamese text fixed.');
}

run().catch(e => { console.error(e.message); pool.end(); });
