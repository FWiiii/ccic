-- CCIC initial schema (PostgreSQL)
-- File: infra/sql/001_init_schema_postgres.sql
-- Purpose: align with apps/api/prisma/schema.prisma

BEGIN;

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL,
  last_login_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  expires_at TIMESTAMP(3),
  last_used_at TIMESTAMP(3),
  revoked_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  bucket VARCHAR(128),
  object_key VARCHAR(512),
  sha256 CHAR(64),
  created_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(100),
  phone VARCHAR(50),
  address VARCHAR(500),
  description_html TEXT,
  logo_asset_id TEXT,
  status VARCHAR(16) NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku VARCHAR(64) UNIQUE,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  material TEXT,
  summary TEXT,
  product_info_html TEXT,
  company_id TEXT NOT NULL,
  status VARCHAR(16) NOT NULL,
  published_at TIMESTAMP(3),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  scene VARCHAR(32) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, asset_id, scene)
);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE,
  consignor_name VARCHAR(200),
  inspection_date DATE,
  conclusion TEXT,
  notes JSONB NOT NULL,
  raw_html TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  sn VARCHAR(128) NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  inspection_time TIMESTAMP(3) NOT NULL,
  result VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  conclusion TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_images (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  scene VARCHAR(32) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE (inspection_id, asset_id, scene)
);

CREATE TABLE IF NOT EXISTS inspection_events (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  event_time TIMESTAMP(3) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace_pages (
  id TEXT PRIMARY KEY,
  sn VARCHAR(128) NOT NULL UNIQUE,
  consignor_name VARCHAR(200),
  inspection_date DATE,
  trace_content TEXT,
  status VARCHAR(16) NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace_page_banners (
  id TEXT PRIMARY KEY,
  trace_page_id TEXT NOT NULL REFERENCES trace_pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE (trace_page_id, asset_id)
);

CREATE TABLE IF NOT EXISTS trace_codes (
  id TEXT PRIMARY KEY,
  code VARCHAR(128) NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  verify_status VARCHAR(16) NOT NULL,
  verify_count INTEGER NOT NULL DEFAULT 0,
  first_verified_at TIMESTAMP(3),
  last_verified_at TIMESTAMP(3),
  expires_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace_events (
  id TEXT PRIMARY KEY,
  trace_code_id TEXT NOT NULL,
  event_time TIMESTAMP(3) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace_verify_logs (
  id TEXT PRIMARY KEY,
  trace_code_id TEXT NOT NULL,
  verify_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  is_valid BOOLEAN NOT NULL,
  client_ip INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id TEXT,
  detail JSONB NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_revoked ON admin_sessions (user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products (company_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_scene_sort ON product_images (product_id, scene, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspections_product_id ON inspections (product_id);
CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections (company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status_time ON inspections (status, inspection_time);
CREATE INDEX IF NOT EXISTS idx_inspection_images_inspection_scene_sort ON inspection_images (inspection_id, scene, sort_order);
CREATE INDEX IF NOT EXISTS idx_inspection_events_inspection_time ON inspection_events (inspection_id, event_time, sort_order);
CREATE INDEX IF NOT EXISTS idx_trace_pages_sn_status ON trace_pages (sn, status);
CREATE INDEX IF NOT EXISTS idx_trace_page_banners_page_sort ON trace_page_banners (trace_page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trace_codes_product_id ON trace_codes (product_id);
CREATE INDEX IF NOT EXISTS idx_trace_codes_status ON trace_codes (verify_status);
CREATE INDEX IF NOT EXISTS idx_trace_events_code_time ON trace_events (trace_code_id, event_time);
CREATE INDEX IF NOT EXISTS idx_trace_verify_logs_code_time ON trace_verify_logs (trace_code_id, verify_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at);

COMMIT;
