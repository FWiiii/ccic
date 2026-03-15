import { Client } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publishStatuses = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const verifyStatuses = new Set(["VALID", "INVALID", "EXPIRED", "REVOKED"]);
const inspectionStatuses = new Set(["DRAFT", "REVIEWED", "PUBLISHED", "REVOKED"]);
const inspectionResults = new Set(["PASS", "FAIL", "PENDING"]);
const productImageScenes = new Set(["HERO", "CAROUSEL", "COMPANY_DETAIL", "DETAIL"]);
const inspectionImageScenes = new Set(["HERO", "DETAIL", "CERT", "OTHER"]);
const traceEventTypes = new Set(["SUBMIT", "INSPECTION", "CERTIFIED", "UPDATED", "OTHER"]);
const inspectionEventTypes = new Set([
  "SUBMIT",
  "SAMPLE_RECEIVED",
  "INSPECTION",
  "CERTIFIED",
  "PUBLISHED",
  "OTHER",
]);

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeTimestamp = (value, fallback = null) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
};

const normalizeDate = (value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!matched) {
      return null;
    }

    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`;
  }

  return parsed.toISOString().slice(0, 10);
};

const toNumber = (value, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const nowIso = () => new Date().toISOString();

const normalizeStatus = (value, allowedSet, fallback) => {
  const normalized = String(value ?? "").trim().toUpperCase();
  return allowedSet.has(normalized) ? normalized : fallback;
};

const parseCsv = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const apiRoot = path.resolve(scriptDir, "..");
  const defaultJsonPath = path.join(apiRoot, "data", "db.json");
  const jsonPath = process.env.DB_JSON_PATH ? path.resolve(process.env.DB_JSON_PATH) : defaultJsonPath;

  const rawText = await readFile(jsonPath, "utf8");
  const raw = JSON.parse(rawText);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const counts = new Map();
  const bump = (key) => counts.set(key, (counts.get(key) ?? 0) + 1);

  const adminUsers = asArray(raw.adminUsers);
  const mediaAssets = asArray(raw.mediaAssets);
  const companies = asArray(raw.companies);
  const products = asArray(raw.products);
  const productImages = asArray(raw.productImages);
  const inspectionReports = asArray(raw.inspectionReports);
  const inspections = asArray(raw.inspections);
  const inspectionImages = asArray(raw.inspectionImages);
  const inspectionEvents = asArray(raw.inspectionEvents);
  const tracePages = asArray(raw.tracePages);
  const traceCodes = asArray(raw.traceCodes);
  const traceEvents = asArray(raw.traceEvents);
  const traceVerifyLogs = asArray(raw.traceVerifyLogs);
  const auditLogs = asArray(raw.auditLogs);

  const adminIds = new Set(adminUsers.map((item) => String(item.id ?? "")).filter(Boolean));
  const mediaIds = new Set(mediaAssets.map((item) => String(item.id ?? "")).filter(Boolean));
  const companyIds = new Set(companies.map((item) => String(item.id ?? "")).filter(Boolean));
  const productIds = new Set(products.map((item) => String(item.id ?? "")).filter(Boolean));
  const inspectionIds = new Set(inspections.map((item) => String(item.id ?? "")).filter(Boolean));
  const traceCodeIds = new Set(traceCodes.map((item) => String(item.id ?? "")).filter(Boolean));

  try {
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE TABLE
        audit_logs,
        trace_verify_logs,
        trace_events,
        trace_codes,
        trace_page_banners,
        trace_pages,
        inspection_events,
        inspection_images,
        inspections,
        inspection_reports,
        product_images,
        products,
        companies,
        media_assets,
        admin_sessions,
        admin_users
      RESTART IDENTITY CASCADE
    `);

    for (const item of adminUsers) {
      const id = String(item.id ?? "").trim();
      if (!id) {
        continue;
      }

      await client.query(
        `
          INSERT INTO admin_users (
            id, username, password, display_name, role, status, created_at, updated_at, last_login_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          id,
          String(item.username ?? "").trim(),
          String(item.password ?? "").trim() || "admin123",
          String(item.displayName ?? item.display_name ?? item.username ?? "admin").trim() || "admin",
          normalizeStatus(item.role, new Set(["SUPER_ADMIN", "EDITOR", "VIEWER"]), "EDITOR"),
          normalizeStatus(item.status, new Set(["ACTIVE", "DISABLED"]), "ACTIVE"),
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          normalizeTimestamp(item.lastLoginAt, null),
        ]
      );

      bump("admin_users");
    }

    for (const item of mediaAssets) {
      const id = String(item.id ?? "").trim();
      if (!id) {
        continue;
      }

      await client.query(
        `
          INSERT INTO media_assets (
            id, url, name, mime_type, size_bytes, width, height, created_at, created_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          id,
          String(item.url ?? "").trim(),
          String(item.name ?? id).trim() || id,
          String(item.mimeType ?? item.mime_type ?? "image/jpeg").trim() || "image/jpeg",
          Math.max(0, toNumber(item.sizeBytes ?? item.size_bytes, 0)),
          item.width === undefined ? null : Math.max(1, toNumber(item.width, 1)),
          item.height === undefined ? null : Math.max(1, toNumber(item.height, 1)),
          normalizeTimestamp(item.createdAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
        ]
      );

      bump("media_assets");
    }

    for (const item of companies) {
      const id = String(item.id ?? "").trim();
      if (!id) {
        continue;
      }

      const logoAssetId = String(item.logoAssetId ?? item.logo_asset_id ?? "").trim();

      await client.query(
        `
          INSERT INTO companies (
            id, name, short_name, phone, address, description_html, logo_asset_id,
            status, created_at, updated_at, created_by, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
        [
          id,
          String(item.name ?? "").trim(),
          String(item.shortName ?? item.short_name ?? "").trim() || null,
          String(item.phone ?? "").trim() || null,
          String(item.address ?? "").trim() || null,
          String(item.descriptionHtml ?? item.description_html ?? "") || null,
          mediaIds.has(logoAssetId) ? logoAssetId : null,
          normalizeStatus(item.status, publishStatuses, "DRAFT"),
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
          adminIds.has(String(item.updatedBy ?? "").trim()) ? String(item.updatedBy).trim() : null,
        ]
      );

      bump("companies");
    }

    for (const item of products) {
      const id = String(item.id ?? "").trim();
      const companyId = String(item.companyId ?? item.company_id ?? "").trim();
      if (!id || !companyIds.has(companyId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO products (
            id, sku, name, brand, model, material, summary, product_info_html,
            company_id, status, published_at, created_at, updated_at, created_by, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        `,
        [
          id,
          String(item.sku ?? "").trim() || null,
          String(item.name ?? "").trim(),
          String(item.brand ?? "").trim() || null,
          String(item.model ?? "").trim() || null,
          String(item.material ?? "").trim() || null,
          String(item.summary ?? "") || null,
          String(item.productInfoHtml ?? item.product_info_html ?? "") || null,
          companyId,
          normalizeStatus(item.status, publishStatuses, "DRAFT"),
          normalizeTimestamp(item.publishedAt, null),
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
          adminIds.has(String(item.updatedBy ?? "").trim()) ? String(item.updatedBy).trim() : null,
        ]
      );

      bump("products");
    }

    for (const item of productImages) {
      const id = String(item.id ?? "").trim();
      const productId = String(item.productId ?? item.product_id ?? "").trim();
      const assetId = String(item.assetId ?? item.asset_id ?? "").trim();
      if (!id || !productIds.has(productId) || !mediaIds.has(assetId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO product_images (
            id, product_id, asset_id, scene, sort_order, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (product_id, asset_id, scene) DO NOTHING
        `,
        [
          id,
          productId,
          assetId,
          normalizeStatus(item.scene, productImageScenes, "DETAIL"),
          Math.max(0, toNumber(item.sortOrder ?? item.sort_order, 0)),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("product_images");
    }

    for (const item of inspectionReports) {
      const id = String(item.id ?? "").trim();
      const productId = String(item.productId ?? item.product_id ?? "").trim();
      if (!id || !productIds.has(productId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO inspection_reports (
            id, product_id, consignor_name, inspection_date, conclusion, notes, raw_html,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
        `,
        [
          id,
          productId,
          String(item.consignorName ?? item.consignor_name ?? "").trim() || null,
          normalizeDate(item.inspectionDate ?? item.inspection_date),
          String(item.conclusion ?? "") || null,
          JSON.stringify(asArray(item.notes)),
          String(item.rawHtml ?? item.raw_html ?? "") || null,
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
          adminIds.has(String(item.updatedBy ?? "").trim()) ? String(item.updatedBy).trim() : null,
        ]
      );

      bump("inspection_reports");
    }

    for (const item of inspections) {
      const id = String(item.id ?? "").trim();
      const productId = String(item.productId ?? item.product_id ?? "").trim();
      const companyId = String(item.companyId ?? item.company_id ?? "").trim();
      if (!id || !productIds.has(productId) || !companyIds.has(companyId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO inspections (
            id, sn, product_id, company_id, inspection_time, result, status, conclusion,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
        [
          id,
          String(item.sn ?? "").trim(),
          productId,
          companyId,
          normalizeTimestamp(item.inspectionTime ?? item.inspection_time, nowIso()),
          normalizeStatus(item.result, inspectionResults, "PENDING"),
          normalizeStatus(item.status, inspectionStatuses, "DRAFT"),
          String(item.conclusion ?? "") || null,
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
          adminIds.has(String(item.updatedBy ?? "").trim()) ? String(item.updatedBy).trim() : null,
        ]
      );

      bump("inspections");
    }

    for (const item of inspectionImages) {
      const id = String(item.id ?? "").trim();
      const inspectionId = String(item.inspectionId ?? item.inspection_id ?? "").trim();
      const assetId = String(item.assetId ?? item.asset_id ?? "").trim();
      if (!id || !inspectionIds.has(inspectionId) || !mediaIds.has(assetId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO inspection_images (
            id, inspection_id, asset_id, scene, sort_order, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (inspection_id, asset_id, scene) DO NOTHING
        `,
        [
          id,
          inspectionId,
          assetId,
          normalizeStatus(item.scene, inspectionImageScenes, "OTHER"),
          Math.max(0, toNumber(item.sortOrder ?? item.sort_order, 0)),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("inspection_images");
    }

    for (const item of inspectionEvents) {
      const id = String(item.id ?? "").trim();
      const inspectionId = String(item.inspectionId ?? item.inspection_id ?? "").trim();
      if (!id || !inspectionIds.has(inspectionId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO inspection_events (
            id, inspection_id, event_time, event_type, title, content, sort_order, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          id,
          inspectionId,
          normalizeTimestamp(item.eventTime ?? item.event_time, nowIso()),
          normalizeStatus(item.eventType ?? item.event_type, inspectionEventTypes, "OTHER"),
          String(item.title ?? "").trim(),
          String(item.content ?? "") || null,
          Math.max(0, toNumber(item.sortOrder ?? item.sort_order, 0)),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("inspection_events");
    }

    for (const item of tracePages) {
      const id = String(item.id ?? "").trim();
      const sn = String(item.sn ?? "").trim();
      if (!id || !sn) {
        continue;
      }

      await client.query(
        `
          INSERT INTO trace_pages (
            id, sn, consignor_name, inspection_date, trace_content, status,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          id,
          sn,
          String(item.consignorName ?? item.consignor_name ?? "").trim() || null,
          normalizeDate(item.inspectionDate ?? item.inspection_date),
          String(item.traceContent ?? item.trace_content ?? "") || null,
          normalizeStatus(item.status, publishStatuses, "DRAFT"),
          normalizeTimestamp(item.createdAt, nowIso()),
          normalizeTimestamp(item.updatedAt, nowIso()),
          adminIds.has(String(item.createdBy ?? "").trim()) ? String(item.createdBy).trim() : null,
          adminIds.has(String(item.updatedBy ?? "").trim()) ? String(item.updatedBy).trim() : null,
        ]
      );

      bump("trace_pages");

      const bannerIds = parseCsv(item.indexBannerAssetIdsCsv ?? item.index_banner_asset_ids_csv);
      for (let index = 0; index < bannerIds.length; index += 1) {
        const assetId = bannerIds[index];
        if (!mediaIds.has(assetId)) {
          continue;
        }

        await client.query(
          `
            INSERT INTO trace_page_banners (
              id, trace_page_id, asset_id, sort_order, created_at
            ) VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (trace_page_id, asset_id) DO NOTHING
          `,
          [`${id}-banner-${index}`, id, assetId, index, normalizeTimestamp(item.createdAt, nowIso())]
        );

        bump("trace_page_banners");
      }
    }

    for (const item of traceCodes) {
      const id = String(item.id ?? "").trim();
      const productId = String(item.productId ?? item.product_id ?? "").trim();
      if (!id || !productIds.has(productId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO trace_codes (
            id, code, product_id, verify_status, verify_count,
            first_verified_at, last_verified_at, expires_at, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          id,
          String(item.code ?? "").trim(),
          productId,
          normalizeStatus(item.verifyStatus ?? item.verify_status, verifyStatuses, "VALID"),
          Math.max(0, toNumber(item.verifyCount ?? item.verify_count, 0)),
          normalizeTimestamp(item.firstVerifiedAt ?? item.first_verified_at, null),
          normalizeTimestamp(item.lastVerifiedAt ?? item.last_verified_at, null),
          normalizeTimestamp(item.expiresAt ?? item.expires_at, null),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("trace_codes");
    }

    for (const item of traceEvents) {
      const id = String(item.id ?? "").trim();
      const traceCodeId = String(item.traceCodeId ?? item.trace_code_id ?? "").trim();
      if (!id || !traceCodeIds.has(traceCodeId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO trace_events (
            id, trace_code_id, event_time, event_type, title, content, sort_order, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          id,
          traceCodeId,
          normalizeTimestamp(item.eventTime ?? item.event_time, nowIso()),
          normalizeStatus(item.eventType ?? item.event_type, traceEventTypes, "OTHER"),
          String(item.title ?? "").trim(),
          String(item.content ?? "") || null,
          Math.max(0, toNumber(item.sortOrder ?? item.sort_order, 0)),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("trace_events");
    }

    for (const item of traceVerifyLogs) {
      const id = String(item.id ?? "").trim();
      const traceCodeId = String(item.traceCodeId ?? item.trace_code_id ?? "").trim();
      if (!id || !traceCodeIds.has(traceCodeId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO trace_verify_logs (
            id, trace_code_id, verify_at, is_valid, client_ip, user_agent, referer, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          id,
          traceCodeId,
          normalizeTimestamp(item.verifyAt ?? item.verify_at, nowIso()),
          Boolean(item.isValid ?? item.is_valid),
          String(item.clientIp ?? item.client_ip ?? "").trim() || null,
          String(item.userAgent ?? item.user_agent ?? "") || null,
          String(item.referer ?? "") || null,
          normalizeTimestamp(item.createdAt ?? item.verifyAt ?? item.verify_at, nowIso()),
        ]
      );

      bump("trace_verify_logs");
    }

    for (const item of auditLogs) {
      const id = String(item.id ?? "").trim();
      if (!id) {
        continue;
      }

      const actorUserId = String(item.actorUserId ?? item.actor_user_id ?? "").trim();

      await client.query(
        `
          INSERT INTO audit_logs (
            id, actor_user_id, action, entity_type, entity_id, detail, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
        `,
        [
          id,
          adminIds.has(actorUserId) ? actorUserId : null,
          String(item.action ?? "UNKNOWN").trim() || "UNKNOWN",
          String(item.entityType ?? item.entity_type ?? "UNKNOWN").trim() || "UNKNOWN",
          String(item.entityId ?? item.entity_id ?? "").trim() || null,
          JSON.stringify(item.detail && typeof item.detail === "object" ? item.detail : {}),
          normalizeTimestamp(item.createdAt, nowIso()),
        ]
      );

      bump("audit_logs");
    }

    await client.query("COMMIT");

    console.log("Import completed:");
    for (const [table, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`- ${table}: ${count}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
