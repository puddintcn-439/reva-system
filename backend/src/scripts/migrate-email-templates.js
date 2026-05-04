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
      ),
      (
        'consignment_approved',
        'Thông báo duyệt yêu cầu ký gửi',
        'Yêu cầu ký gửi của bạn đã được duyệt — REVA',
        $body2$Xin chào {{full_name}},

Yêu cầu ký gửi của bạn đã được REVA xem xét và CHẤP THUẬN! 🎉

📋 Mã yêu cầu: {{request_id}}
📅 Ngày gửi yêu cầu: {{created_at}}
📝 Loại: {{request_type}}
{{#scheduled_date}}📆 Lịch hẹn: {{scheduled_date}}
{{/scheduled_date}}
{{#admin_notes}}💬 Ghi chú từ REVA: {{admin_notes}}
{{/admin_notes}}

Chúng tôi sẽ liên hệ với bạn để sắp xếp lịch tiếp nhận sản phẩm.

Trân trọng,
Đội ngũ REVA Thanh Lý Ký Gửi
📞 Hotline: 0923002177$body2$,
        'full_name,request_id,created_at,request_type,scheduled_date,admin_notes'
      ),
      (
        'settlement_created',
        'Thông báo tạo quyết toán',
        'Quyết toán {{settlement_code}} đã được tạo — REVA',
        $body3$Xin chào {{full_name}},

REVA đã lập bảng quyết toán cho kỳ thanh lý của bạn:

📄 Mã quyết toán: {{settlement_code}}
📅 Kỳ: {{period_start}} → {{period_end}}
📦 Số sản phẩm đã bán: {{items_count}}
💰 Tổng doanh thu: {{total_sale}}
🏪 Hoa hồng REVA: {{total_commission}}
✅ Số tiền REVA sẽ trả bạn: {{total_payout}}

Bạn có thể tra cứu chi tiết quyết toán tại:
{{lookup_url}}

Chúng tôi sẽ liên hệ để thu xếp thanh toán sớm nhất.

Trân trọng,
Đội ngũ REVA Thanh Lý Ký Gửi
📞 Hotline: 0923002177$body3$,
        'full_name,settlement_code,period_start,period_end,items_count,total_sale,total_commission,total_payout,lookup_url'
      )
    ON CONFLICT (key) DO NOTHING;
  `);

  console.log('✅ email_templates table created and seeded');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
