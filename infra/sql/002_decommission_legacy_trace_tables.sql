-- Legacy trace chain decommission (phase 2).
-- Preconditions:
-- 1) API has been upgraded to a version where legacy trace endpoints are disabled by default.
-- 2) Observability window confirms no business traffic depends on legacy trace APIs.
-- 3) ENABLE_LEGACY_TRACE_APIS remains false in runtime environments.
--
-- Rollback strategy:
-- - Restore from DB backup/snapshot taken before this script.

BEGIN;

-- Child tables first.
DROP TABLE IF EXISTS trace_page_banners;
DROP TABLE IF EXISTS trace_events;
DROP TABLE IF EXISTS trace_verify_logs;
DROP TABLE IF EXISTS inspection_images;

-- Parent / standalone legacy tables.
DROP TABLE IF EXISTS trace_pages;
DROP TABLE IF EXISTS trace_codes;
DROP TABLE IF EXISTS inspection_reports;
DROP TABLE IF EXISTS audit_logs;

COMMIT;

