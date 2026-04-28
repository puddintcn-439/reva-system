require('dotenv').config();
const db = require('../config/database');

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_id      VARCHAR(20) NOT NULL,
      bank_name    VARCHAR(100) NOT NULL,
      account_no   VARCHAR(50) NOT NULL,
      account_name VARCHAR(100) NOT NULL,
      is_active    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed TPBank account from existing config
  await db.query(`
    INSERT INTO bank_accounts (bank_id, bank_name, account_no, account_name, is_active)
    VALUES ('TPB', 'TPBank', '04039907885', 'NGUYEN HOANG VU', TRUE)
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ bank_accounts table ready');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
