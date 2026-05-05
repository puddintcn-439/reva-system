-- ================================================================
-- REVA Thanh Ly Ky Gui - Complete Database Schema
-- PostgreSQL — includes all migrations
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100),
  email       VARCHAR(100) UNIQUE,
  role        VARCHAR(20) NOT NULL DEFAULT 'staff'
              CHECK (role IN ('superadmin','admin','manager','staff','cashier','accountant','inventory','viewer')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- REFRESH TOKENS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ----------------------------------------------------------------
-- PERMISSIONS & RBAC
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  name        VARCHAR(60) PRIMARY KEY,
  description VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role        VARCHAR(20) NOT NULL,
  permission  VARCHAR(60) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
  PRIMARY KEY (role, permission)
);

-- ----------------------------------------------------------------
-- AUDIT LOGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(50),
  action      VARCHAR(50) NOT NULL,
  resource    VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, resource);

-- ----------------------------------------------------------------
-- SYSTEM SETTINGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  label       VARCHAR(200),
  description TEXT,
  is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default commission_tiers setting (used by backend/frontend). Idempotent.
INSERT INTO system_settings (key, value, label, description, is_secret) VALUES
  ('commission_tiers',
   '[{"max":60000,"type":"fixed","amount":20000,"label":"Dưới 60k"},{"max":130000,"type":"fixed","amount":30000,"label":"60k – 130k"},{"max":null,"type":"percent","amount":25,"label":"Trên 130k"}]',
   'Phí ký gửi',
   'Công thức tính phí ký gửi theo khoảng giá (JSON)',
   FALSE
  )
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- LOCATIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255) NOT NULL,
  phone       VARCHAR(20),
  type        VARCHAR(50),
  map_url     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ANNOUNCEMENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- BANK ACCOUNTS
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- EMAIL TEMPLATES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  variables   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CONSIGNORS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NOT NULL,
  email       VARCHAR(100),
  address     TEXT,
  code              VARCHAR(20) UNIQUE,
  notes             TEXT,
  bank_id           VARCHAR(20),
  bank_account_no   VARCHAR(50),
  bank_account_name VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consignors_phone ON consignors(phone);
CREATE INDEX IF NOT EXISTS idx_consignors_code  ON consignors(code);

-- ----------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------
-- CONSIGNMENT REQUESTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignment_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consignor_id    UUID REFERENCES consignors(id) ON DELETE SET NULL,
  request_type    VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (request_type IN ('direct', 'online')),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled')),
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  scheduled_date  DATE,
  notes           TEXT,
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id          UUID REFERENCES consignment_requests(id) ON DELETE SET NULL,
  consignor_id        UUID REFERENCES consignors(id) ON DELETE SET NULL,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  condition_percent   INTEGER NOT NULL DEFAULT 90 CHECK (condition_percent BETWEEN 0 AND 100),
  sale_price          NUMERIC(12, 0) NOT NULL,
  commission_amount   NUMERIC(12, 0),
  consignor_amount    NUMERIC(12, 0),
  image_url           TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('pending', 'active', 'sold', 'returned', 'expired')),
  code                VARCHAR(30) UNIQUE,
  consign_start       DATE,
  consign_end         DATE,
  sold_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_status    ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_consignor ON products(consignor_id);
CREATE INDEX IF NOT EXISTS idx_products_location  ON products(location_id);

-- ----------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20) UNIQUE NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ----------------------------------------------------------------
-- SALES (POS)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_code     VARCHAR(20) UNIQUE NOT NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    VARCHAR(100),
  customer_phone   VARCHAR(20),
  total_amount     NUMERIC(12,0) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
  final_amount     NUMERIC(12,0) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(20) NOT NULL DEFAULT 'cash'
                      CHECK (payment_method IN ('cash', 'transfer', 'mixed')),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_reference   VARCHAR(255),
  paid_at             TIMESTAMPTZ,
  cancel_reason       TEXT,
  cancelled_at        TIMESTAMPTZ,
  note                TEXT,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_code);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);

CREATE TABLE IF NOT EXISTS sale_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id           UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name      VARCHAR(255) NOT NULL,
  product_code      VARCHAR(30),
  sale_price        NUMERIC(12,0) NOT NULL,
  commission_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  consignor_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
  consignor_id      UUID REFERENCES consignors(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

-- ----------------------------------------------------------------
-- SALE RETURNS (trả hàng / hoàn tiền)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_returns (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id        UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  refund_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
  reason         TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_returns_sale ON sale_returns(sale_id);

CREATE TABLE IF NOT EXISTS sale_return_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id     UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  sale_item_id  UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name  VARCHAR(255) NOT NULL,
  product_code  VARCHAR(30),
  sale_price    NUMERIC(12,0) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_return ON sale_return_items(return_id);
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consignor_id      UUID REFERENCES consignors(id) ON DELETE SET NULL,
  code              VARCHAR(20) UNIQUE NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  total_sale        NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total_commission  NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total_payout      NUMERIC(12, 0) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at           TIMESTAMPTZ,
  payment_notes     TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlements_code      ON settlements(code);
CREATE INDEX IF NOT EXISTS idx_settlements_consignor ON settlements(consignor_id);

CREATE TABLE IF NOT EXISTS settlement_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id     UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name      VARCHAR(255) NOT NULL,
  product_code      VARCHAR(30),
  sale_price        NUMERIC(12, 0) NOT NULL,
  commission        NUMERIC(12, 0) NOT NULL,
  consignor_amount  NUMERIC(12, 0) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PURCHASE REQUESTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(100),
  item_type     VARCHAR(50),
  quantity_kg   NUMERIC(6,2),
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'contacted', 'completed', 'rejected')),
  admin_notes   TEXT,
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- INBOX (internal team chat)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbox_threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(200) NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages(thread_id, created_at);

-- ----------------------------------------------------------------
-- UPDATED_AT trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','locations','announcements','consignors',
    'consignment_requests','products','settlements',
    'purchase_requests','bank_accounts','email_templates','customers','inbox_threads'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;
