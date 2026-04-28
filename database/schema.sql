-- ================================================================
-- H.U.N Thanh Ly Ky Gui - Database Schema
-- PostgreSQL
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- USERS (Admin accounts)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100),
  email       VARCHAR(100) UNIQUE,
  role        VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('superadmin', 'admin', 'staff')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- LOCATIONS (Store branches)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255) NOT NULL,
  phone       VARCHAR(20),
  type        VARCHAR(50),        -- e.g. 'HSSV', 'BRAND+HSSV'
  map_url     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ANNOUNCEMENTS (Ticker messages)
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
-- CONSIGNORS (Customers who consign items)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NOT NULL,
  email       VARCHAR(100),
  address     TEXT,
  code        VARCHAR(20) UNIQUE,   -- Lookup code for customer
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- CATEGORIES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------
-- PRODUCTS (Consigned items)
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
  sale_price          NUMERIC(12, 0) NOT NULL,  -- Price set for sale
  commission_amount   NUMERIC(12, 0),           -- Computed commission for HUN
  consignor_amount    NUMERIC(12, 0),           -- Amount consignor receives
  image_url           TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('pending', 'active', 'sold', 'returned', 'expired')),
  code                VARCHAR(30) UNIQUE,       -- Product code (for tracking)
  consign_start       DATE,
  consign_end         DATE,
  sold_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- SETTLEMENTS (Quyet toan - payment to consignor)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consignor_id      UUID REFERENCES consignors(id) ON DELETE SET NULL,
  code              VARCHAR(20) UNIQUE NOT NULL,  -- Customer lookup code
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  total_sale        NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total_commission  NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total_payout      NUMERIC(12, 0) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- SETTLEMENT ITEMS (Products included in a settlement)
-- ----------------------------------------------------------------
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
-- PURCHASE REQUESTS (Thu Mua - Buyout requests)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(100),
  item_type     VARCHAR(50),     -- 'no_brand' | 'brand' | 'accessories'
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
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_consignor    ON products(consignor_id);
CREATE INDEX IF NOT EXISTS idx_products_location     ON products(location_id);
CREATE INDEX IF NOT EXISTS idx_settlements_code      ON settlements(code);
CREATE INDEX IF NOT EXISTS idx_settlements_consignor ON settlements(consignor_id);
CREATE INDEX IF NOT EXISTS idx_consignors_phone      ON consignors(phone);
CREATE INDEX IF NOT EXISTS idx_consignors_code       ON consignors(code);

-- ----------------------------------------------------------------
-- UPDATED_AT trigger function
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','locations','announcements','consignors',
    'consignment_requests','products','settlements','purchase_requests']
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t);
  END LOOP;
END;
$$;
