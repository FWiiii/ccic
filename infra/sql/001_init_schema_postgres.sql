-- CCIC initial schema (PostgreSQL)
-- File: infra/sql/001_init_schema_postgres.sql
-- Purpose: support web trace page + admin CMS in v1

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Admin users and RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'EDITOR'
    CHECK (role IN ('SUPER_ADMIN', 'EDITOR', 'VIEWER')),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'DISABLED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Media metadata (image binaries are stored in object storage)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket VARCHAR(128) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  sha256 CHAR(64),
  uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket, object_key),
  UNIQUE (sha256)
);

-- 3) Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(100),
  phone VARCHAR(50),
  address VARCHAR(500),
  description_html TEXT,
  logo_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(64) UNIQUE,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  summary TEXT,
  product_info_html TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Product image bindings
-- scene mapping examples:
-- HERO (top image), CAROUSEL (product gallery), COMPANY_DETAIL (company tab images), DETAIL (other detail images)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  scene VARCHAR(32) NOT NULL
    CHECK (scene IN ('HERO', 'CAROUSEL', 'COMPANY_DETAIL', 'DETAIL')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, asset_id, scene)
);

-- 6) Inspection report (ProductInfoTab data)
CREATE TABLE IF NOT EXISTS inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  consignor_name VARCHAR(200),
  inspection_date DATE,
  conclusion TEXT,
  notes JSONB NOT NULL DEFAULT '[]'::JSONB,
  raw_html TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) Trace codes
CREATE TABLE IF NOT EXISTS trace_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  verify_status VARCHAR(16) NOT NULL DEFAULT 'VALID'
    CHECK (verify_status IN ('VALID', 'INVALID', 'EXPIRED', 'REVOKED')),
  verify_count INTEGER NOT NULL DEFAULT 0,
  first_verified_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) Trace timeline events (TraceInfoTab data)
CREATE TABLE IF NOT EXISTS trace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_code_id UUID NOT NULL REFERENCES trace_codes(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'OTHER'
    CHECK (event_type IN ('SUBMIT', 'INSPECTION', 'CERTIFIED', 'UPDATED', 'OTHER')),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9) Verify logs for scan analytics
CREATE TABLE IF NOT EXISTS trace_verify_logs (
  id BIGSERIAL PRIMARY KEY,
  trace_code_id UUID NOT NULL REFERENCES trace_codes(id) ON DELETE CASCADE,
  verify_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_valid BOOLEAN NOT NULL,
  client_ip INET,
  user_agent TEXT,
  referer TEXT
);

-- 10) Audit logs for admin operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generic trigger to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inspection_reports_updated_at ON inspection_reports;
CREATE TRIGGER trg_inspection_reports_updated_at
BEFORE UPDATE ON inspection_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON media_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products (company_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_scene_sort ON product_images (product_id, scene, sort_order);
CREATE INDEX IF NOT EXISTS idx_trace_codes_product_id ON trace_codes (product_id);
CREATE INDEX IF NOT EXISTS idx_trace_codes_status ON trace_codes (verify_status);
CREATE INDEX IF NOT EXISTS idx_trace_events_code_time ON trace_events (trace_code_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_trace_verify_logs_code_time ON trace_verify_logs (trace_code_id, verify_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at DESC);

COMMIT;
