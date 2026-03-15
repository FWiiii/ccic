-- CCIC initial schema (PostgreSQL)
-- File: infra/sql/001_init_schema_postgres.sql
-- Purpose: align with current API runtime model and support JSON -> PostgreSQL migration

BEGIN;

-- 1) Admin users and roles
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'EDITOR'
    CHECK (role IN ('SUPER_ADMIN', 'EDITOR', 'VIEWER')),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'DISABLED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Admin sessions (replace in-memory tokens)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Media metadata (binaries should be stored in object storage)
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  bucket VARCHAR(128),
  object_key VARCHAR(512),
  sha256 CHAR(64),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket, object_key),
  UNIQUE (sha256)
);

-- 4) Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(100),
  phone VARCHAR(50),
  address VARCHAR(500),
  description_html TEXT,
  logo_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku VARCHAR(64) UNIQUE,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  material TEXT,
  summary TEXT,
  product_info_html TEXT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at TIMESTAMPTZ,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Product image bindings
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  scene VARCHAR(32) NOT NULL
    CHECK (scene IN ('HERO', 'CAROUSEL', 'COMPANY_DETAIL', 'DETAIL')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, asset_id, scene)
);

-- 7) Inspection report (legacy trace aggregate support)
CREATE TABLE IF NOT EXISTS inspection_reports (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  consignor_name VARCHAR(200),
  inspection_date DATE,
  conclusion TEXT,
  notes JSONB NOT NULL DEFAULT '[]'::JSONB,
  raw_html TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) Inspections (SN-based query source)
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  sn VARCHAR(128) NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  inspection_time TIMESTAMPTZ NOT NULL,
  result VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (result IN ('PASS', 'FAIL', 'PENDING')),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'REVOKED')),
  conclusion TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9) Inspection image bindings
CREATE TABLE IF NOT EXISTS inspection_images (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  scene VARCHAR(32) NOT NULL
    CHECK (scene IN ('HERO', 'DETAIL', 'CERT', 'OTHER')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inspection_id, asset_id, scene)
);

-- 10) Inspection timeline events
CREATE TABLE IF NOT EXISTS inspection_events (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'OTHER'
    CHECK (event_type IN ('SUBMIT', 'SAMPLE_RECEIVED', 'INSPECTION', 'CERTIFIED', 'PUBLISHED', 'OTHER')),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11) Trace pages by SN (for not-found fallback page)
CREATE TABLE IF NOT EXISTS trace_pages (
  id TEXT PRIMARY KEY,
  sn VARCHAR(128) NOT NULL UNIQUE,
  consignor_name VARCHAR(200),
  inspection_date DATE,
  trace_content TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12) Trace page banner image bindings (replaces CSV asset ids)
CREATE TABLE IF NOT EXISTS trace_page_banners (
  id TEXT PRIMARY KEY,
  trace_page_id TEXT NOT NULL REFERENCES trace_pages(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trace_page_id, asset_id)
);

-- 13) Trace codes (legacy public trace endpoint)
CREATE TABLE IF NOT EXISTS trace_codes (
  id TEXT PRIMARY KEY,
  code VARCHAR(128) NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  verify_status VARCHAR(16) NOT NULL DEFAULT 'VALID'
    CHECK (verify_status IN ('VALID', 'INVALID', 'EXPIRED', 'REVOKED')),
  verify_count INTEGER NOT NULL DEFAULT 0 CHECK (verify_count >= 0),
  first_verified_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14) Trace timeline events
CREATE TABLE IF NOT EXISTS trace_events (
  id TEXT PRIMARY KEY,
  trace_code_id TEXT NOT NULL REFERENCES trace_codes(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'OTHER'
    CHECK (event_type IN ('SUBMIT', 'INSPECTION', 'CERTIFIED', 'UPDATED', 'OTHER')),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15) Trace verify logs
CREATE TABLE IF NOT EXISTS trace_verify_logs (
  id TEXT PRIMARY KEY,
  trace_code_id TEXT NOT NULL REFERENCES trace_codes(id) ON DELETE CASCADE,
  verify_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_valid BOOLEAN NOT NULL,
  client_ip INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16) Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function for updated_at
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

DROP TRIGGER IF EXISTS trg_inspections_updated_at ON inspections;
CREATE TRIGGER trg_inspections_updated_at
BEFORE UPDATE ON inspections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trace_pages_updated_at ON trace_pages;
CREATE TRIGGER trg_trace_pages_updated_at
BEFORE UPDATE ON trace_pages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_revoked ON admin_sessions (user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products (company_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_scene_sort ON product_images (product_id, scene, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspections_product_id ON inspections (product_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections (company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status_time ON inspections (status, inspection_time DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_images_inspection_scene_sort ON inspection_images (inspection_id, scene, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspection_events_inspection_time ON inspection_events (inspection_id, event_time DESC, sort_order);
CREATE INDEX IF NOT EXISTS idx_trace_pages_sn_status ON trace_pages (sn, status);
CREATE INDEX IF NOT EXISTS idx_trace_page_banners_page_sort ON trace_page_banners (trace_page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trace_codes_product_id ON trace_codes (product_id);
CREATE INDEX IF NOT EXISTS idx_trace_codes_status ON trace_codes (verify_status);
CREATE INDEX IF NOT EXISTS idx_trace_events_code_time ON trace_events (trace_code_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_trace_verify_logs_code_time ON trace_verify_logs (trace_code_id, verify_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at DESC);

COMMIT;
