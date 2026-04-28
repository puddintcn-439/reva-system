require('dotenv').config();
const db = require('../config/database');

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key         VARCHAR(50) UNIQUE NOT NULL,
      name        VARCHAR(100) NOT NULL,
      subject     TEXT NOT NULL,
      body        TEXT NOT NULL,
      variables   TEXT,  -- comma-separated list of available variables
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed default templates
  await db.query(`
    INSERT INTO email_templates (key, name, subject, body, variables)
    VALUES
      (
        'expiring_soon',
        'Nhắc nhở sắp hết hạn ký gửi',
        'Sản phẩm của bạn sắp hết hạn ký gửi tại REVA',
        $body1$Xin chào {{full_name}},

Chúng tôi xin thông báo rằng sản phẩm ký gửi của bạn sắp đến ngày hết hạn:

🏷️ Sản phẩm: {{product_name}}
📦 Mã SP: {{product_code}}
💰 Giá bán: {{sale_price}}
📅 Ngày hết hạn: {{consign_end}}

Nếu bạn muốn gia hạn hoặc thu hồi sản phẩm, vui lòng liên hệ cửa hàng REVA trong thời gian sớm nhất.

Trân trọng,
Đội ngũ REVA Thanh Lý Ký Gửi
📞 Hotline: 0923002177$body1$,
        'full_name,product_name,product_code,sale_price,consign_end'
      )
    ON CONFLICT (key) DO NOTHING;
  `);

  console.log('✅ email_templates table created and seeded');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
