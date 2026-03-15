import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import type { Database } from "./database.types";

const dataPath = path.resolve(process.cwd(), "data", "db.json");

type DbRow = Record<string, unknown>;

const EMPTY_DB: Database = {
  adminUsers: [],
  mediaAssets: [],
  companies: [],
  products: [],
  productImages: [],
  inspectionReports: [],
  inspections: [],
  inspectionImages: [],
  inspectionEvents: [],
  traceCodes: [],
  tracePages: [],
  traceEvents: [],
  traceVerifyLogs: [],
  auditLogs: [],
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asOptionalString = (value: unknown) => {
  const text = asString(value).trim();
  return text ? text : undefined;
};

const asNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const asOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const num = asNumber(value, Number.NaN);
  return Number.isFinite(num) ? num : undefined;
};

const asIsoString = (value: unknown, fallback: string) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const text = asString(value).trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toISOString();
};

const asOptionalIsoString = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return asIsoString(value, "");
};

const asOptionalDateString = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = asString(value).trim();
  if (!text) {
    return undefined;
  }

  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matched) {
    return `${matched[1]}-${matched[2]}-${matched[3]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
};

const parseCsv = (value: unknown) =>
  asString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly postgresUrl = asString(process.env.DATABASE_URL).trim();
  private readonly pgPool = this.postgresUrl ? new Pool({ connectionString: this.postgresUrl }) : null;

  async onModuleDestroy() {
    if (!this.pgPool) {
      return;
    }

    await this.pgPool.end().catch(() => undefined);
  }

  private async ensureDataFile() {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });

    try {
      await fs.access(dataPath);
    } catch {
      await fs.writeFile(dataPath, JSON.stringify(EMPTY_DB, null, 2), "utf8");
    }
  }

  private normalizeDbShape(parsed: Partial<Database>): Database {
    return {
      ...EMPTY_DB,
      ...parsed,
      adminUsers: parsed.adminUsers ?? [],
      mediaAssets: parsed.mediaAssets ?? [],
      companies: parsed.companies ?? [],
      products: parsed.products ?? [],
      productImages: parsed.productImages ?? [],
      inspectionReports: parsed.inspectionReports ?? [],
      inspections: parsed.inspections ?? [],
      inspectionImages: parsed.inspectionImages ?? [],
      inspectionEvents: parsed.inspectionEvents ?? [],
      traceCodes: parsed.traceCodes ?? [],
      tracePages: parsed.tracePages ?? [],
      traceEvents: parsed.traceEvents ?? [],
      traceVerifyLogs: parsed.traceVerifyLogs ?? [],
      auditLogs: parsed.auditLogs ?? [],
    };
  }

  private async readJsonDb(): Promise<Database> {
    await this.ensureDataFile();
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    return this.normalizeDbShape(parsed);
  }

  private async writeJsonDb(db: Database): Promise<void> {
    await fs.writeFile(dataPath, JSON.stringify(db, null, 2), "utf8");
  }

  private async withPgClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pgPool) {
      throw new Error("PostgreSQL pool is not initialized");
    }

    const client = await this.pgPool.connect();

    try {
      return await handler(client);
    } finally {
      client.release();
    }
  }

  private async readDbFromPostgres(): Promise<Database> {
    if (!this.pgPool) {
      throw new Error("PostgreSQL pool is not initialized");
    }

    const [
      adminUsersResult,
      mediaAssetsResult,
      companiesResult,
      productsResult,
      productImagesResult,
      inspectionReportsResult,
      inspectionsResult,
      inspectionImagesResult,
      inspectionEventsResult,
      traceCodesResult,
      tracePagesResult,
      tracePageBannersResult,
      traceEventsResult,
      traceVerifyLogsResult,
      auditLogsResult,
    ] = await Promise.all([
      this.pgPool.query<DbRow>(
        "SELECT id, username, password, display_name, role, status, created_at, updated_at FROM admin_users"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, url, name, mime_type, size_bytes, width, height, created_at FROM media_assets"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, name, short_name, phone, address, description_html, logo_asset_id, status, created_at, updated_at FROM companies"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, sku, name, brand, model, material, summary, product_info_html, company_id, status, published_at, created_at, updated_at FROM products"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, product_id, asset_id, scene, sort_order, created_at FROM product_images ORDER BY sort_order ASC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, product_id, consignor_name, inspection_date, conclusion, notes, raw_html, created_at, updated_at FROM inspection_reports"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, sn, product_id, company_id, inspection_time, result, status, conclusion, created_at, updated_at FROM inspections"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, inspection_id, asset_id, scene, sort_order, created_at FROM inspection_images ORDER BY sort_order ASC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, inspection_id, event_time, event_type, title, content, sort_order, created_at FROM inspection_events ORDER BY event_time DESC, sort_order ASC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, code, product_id, verify_status, verify_count, first_verified_at, last_verified_at, expires_at, created_at FROM trace_codes"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, sn, consignor_name, inspection_date, trace_content, status, created_at, updated_at FROM trace_pages"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, trace_page_id, asset_id, sort_order, created_at FROM trace_page_banners ORDER BY sort_order ASC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, trace_code_id, event_time, event_type, title, content, sort_order, created_at FROM trace_events ORDER BY event_time DESC, sort_order ASC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, trace_code_id, verify_at, is_valid, client_ip, user_agent FROM trace_verify_logs ORDER BY verify_at DESC"
      ),
      this.pgPool.query<DbRow>(
        "SELECT id, actor_user_id, action, entity_type, entity_id, detail, created_at FROM audit_logs ORDER BY created_at DESC"
      ),
    ]);

    const now = this.nowIso();

    const tracePageBannerMap = new Map<string, Array<{ assetId: string; sortOrder: number }>>();
    for (const row of tracePageBannersResult.rows) {
      const tracePageId = asString(row.trace_page_id).trim();
      const assetId = asString(row.asset_id).trim();

      if (!tracePageId || !assetId) {
        continue;
      }

      const list = tracePageBannerMap.get(tracePageId) ?? [];
      list.push({
        assetId,
        sortOrder: asNumber(row.sort_order, 0),
      });
      tracePageBannerMap.set(tracePageId, list);
    }

    for (const list of tracePageBannerMap.values()) {
      list.sort((left, right) => left.sortOrder - right.sortOrder);
    }

    return {
      adminUsers: adminUsersResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        username: asString(row.username),
        password: asString(row.password),
        displayName: asString(row.display_name),
        role: asString(row.role) as "SUPER_ADMIN" | "EDITOR" | "VIEWER",
        status: asString(row.status) as "ACTIVE" | "DISABLED",
        createdAt: asIsoString(row.created_at, now),
        updatedAt: asIsoString(row.updated_at, now),
      })),
      mediaAssets: mediaAssetsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        url: asString(row.url),
        name: asString(row.name),
        mimeType: asString(row.mime_type),
        sizeBytes: asNumber(row.size_bytes, 0),
        width: asOptionalNumber(row.width),
        height: asOptionalNumber(row.height),
        createdAt: asIsoString(row.created_at, now),
      })),
      companies: companiesResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        name: asString(row.name),
        shortName: asOptionalString(row.short_name),
        phone: asOptionalString(row.phone),
        address: asOptionalString(row.address),
        descriptionHtml: asOptionalString(row.description_html),
        logoAssetId: asOptionalString(row.logo_asset_id),
        status: asString(row.status) as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        createdAt: asIsoString(row.created_at, now),
        updatedAt: asIsoString(row.updated_at, now),
      })),
      products: productsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        sku: asOptionalString(row.sku),
        name: asString(row.name),
        brand: asOptionalString(row.brand),
        model: asOptionalString(row.model),
        material: asOptionalString(row.material),
        summary: asOptionalString(row.summary),
        productInfoHtml: asOptionalString(row.product_info_html),
        companyId: asString(row.company_id),
        status: asString(row.status) as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        publishedAt: asOptionalIsoString(row.published_at),
        createdAt: asIsoString(row.created_at, now),
        updatedAt: asIsoString(row.updated_at, now),
      })),
      productImages: productImagesResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        productId: asString(row.product_id),
        assetId: asString(row.asset_id),
        scene: asString(row.scene) as "HERO" | "CAROUSEL" | "COMPANY_DETAIL" | "DETAIL",
        sortOrder: asNumber(row.sort_order, 0),
        createdAt: asIsoString(row.created_at, now),
      })),
      inspectionReports: inspectionReportsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        productId: asString(row.product_id),
        consignorName: asOptionalString(row.consignor_name),
        inspectionDate: asOptionalDateString(row.inspection_date),
        conclusion: asOptionalString(row.conclusion),
        notes: asArray<unknown>(row.notes).map((item) => asString(item)),
        rawHtml: asOptionalString(row.raw_html),
        createdAt: asIsoString(row.created_at, now),
        updatedAt: asIsoString(row.updated_at, now),
      })),
      inspections: inspectionsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        sn: asString(row.sn),
        productId: asString(row.product_id),
        companyId: asString(row.company_id),
        inspectionTime: asIsoString(row.inspection_time, now),
        result: asString(row.result) as "PASS" | "FAIL" | "PENDING",
        status: asString(row.status) as "DRAFT" | "REVIEWED" | "PUBLISHED" | "REVOKED",
        conclusion: asOptionalString(row.conclusion),
        createdAt: asIsoString(row.created_at, now),
        updatedAt: asIsoString(row.updated_at, now),
      })),
      inspectionImages: inspectionImagesResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        inspectionId: asString(row.inspection_id),
        assetId: asString(row.asset_id),
        scene: asString(row.scene) as "HERO" | "DETAIL" | "CERT" | "OTHER",
        sortOrder: asNumber(row.sort_order, 0),
        createdAt: asIsoString(row.created_at, now),
      })),
      inspectionEvents: inspectionEventsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        inspectionId: asString(row.inspection_id),
        eventTime: asIsoString(row.event_time, now),
        eventType: asString(row.event_type) as
          | "SUBMIT"
          | "SAMPLE_RECEIVED"
          | "INSPECTION"
          | "CERTIFIED"
          | "PUBLISHED"
          | "OTHER",
        title: asString(row.title),
        content: asOptionalString(row.content),
        sortOrder: asNumber(row.sort_order, 0),
        createdAt: asIsoString(row.created_at, now),
      })),
      traceCodes: traceCodesResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        code: asString(row.code),
        productId: asString(row.product_id),
        verifyStatus: asString(row.verify_status) as "VALID" | "INVALID" | "EXPIRED" | "REVOKED",
        verifyCount: asNumber(row.verify_count, 0),
        firstVerifiedAt: asOptionalIsoString(row.first_verified_at),
        lastVerifiedAt: asOptionalIsoString(row.last_verified_at),
        expiresAt: asOptionalIsoString(row.expires_at),
        createdAt: asIsoString(row.created_at, now),
      })),
      tracePages: tracePagesResult.rows.map((row: DbRow) => {
        const id = asString(row.id);
        const banners = tracePageBannerMap.get(id) ?? [];

        return {
          id,
          sn: asString(row.sn),
          indexBannerAssetIdsCsv: banners.map((item) => item.assetId).join(","),
          consignorName: asOptionalString(row.consignor_name),
          inspectionDate: asOptionalDateString(row.inspection_date),
          traceContent: asOptionalString(row.trace_content),
          status: asString(row.status) as "DRAFT" | "PUBLISHED" | "ARCHIVED",
          createdAt: asIsoString(row.created_at, now),
          updatedAt: asIsoString(row.updated_at, now),
        };
      }),
      traceEvents: traceEventsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        traceCodeId: asString(row.trace_code_id),
        eventTime: asIsoString(row.event_time, now),
        eventType: asString(row.event_type) as "SUBMIT" | "INSPECTION" | "CERTIFIED" | "UPDATED" | "OTHER",
        title: asString(row.title),
        content: asOptionalString(row.content),
        sortOrder: asNumber(row.sort_order, 0),
        createdAt: asIsoString(row.created_at, now),
      })),
      traceVerifyLogs: traceVerifyLogsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        traceCodeId: asString(row.trace_code_id),
        verifyAt: asIsoString(row.verify_at, now),
        isValid: Boolean(row.is_valid),
        clientIp: asOptionalString(row.client_ip),
        userAgent: asOptionalString(row.user_agent),
      })),
      auditLogs: auditLogsResult.rows.map((row: DbRow) => ({
        id: asString(row.id),
        actorUserId: asOptionalString(row.actor_user_id),
        action: asString(row.action),
        entityType: asString(row.entity_type),
        entityId: asOptionalString(row.entity_id),
        detail:
          row.detail && typeof row.detail === "object" && !Array.isArray(row.detail)
            ? (row.detail as Record<string, unknown>)
            : {},
        createdAt: asIsoString(row.created_at, now),
      })),
    };
  }

  private async writeDbToPostgres(db: Database): Promise<void> {
    await this.withPgClient(async (client) => {
      const run = (sql: string, params?: unknown[]) => client.query(sql, params);

      await run("BEGIN");

      try {
        await run(`
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

        for (const item of db.adminUsers) {
          await run(
            `
              INSERT INTO admin_users (
                id, username, password, display_name, role, status, created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              item.id,
              item.username,
              item.password,
              item.displayName,
              item.role,
              item.status,
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of db.mediaAssets) {
          await run(
            `
              INSERT INTO media_assets (
                id, url, name, mime_type, size_bytes, width, height, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              item.id,
              item.url,
              item.name,
              item.mimeType,
              item.sizeBytes,
              item.width ?? null,
              item.height ?? null,
              item.createdAt,
            ]
          );
        }

        for (const item of db.companies) {
          await run(
            `
              INSERT INTO companies (
                id, name, short_name, phone, address, description_html, logo_asset_id,
                status, created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `,
            [
              item.id,
              item.name,
              item.shortName ?? null,
              item.phone ?? null,
              item.address ?? null,
              item.descriptionHtml ?? null,
              item.logoAssetId ?? null,
              item.status,
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of db.products) {
          await run(
            `
              INSERT INTO products (
                id, sku, name, brand, model, material, summary, product_info_html,
                company_id, status, published_at, created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `,
            [
              item.id,
              item.sku ?? null,
              item.name,
              item.brand ?? null,
              item.model ?? null,
              item.material ?? null,
              item.summary ?? null,
              item.productInfoHtml ?? null,
              item.companyId,
              item.status,
              item.publishedAt ?? null,
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of db.productImages) {
          await run(
            `
              INSERT INTO product_images (
                id, product_id, asset_id, scene, sort_order, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6)
              ON CONFLICT (product_id, asset_id, scene) DO NOTHING
            `,
            [item.id, item.productId, item.assetId, item.scene, item.sortOrder, item.createdAt]
          );
        }

        for (const item of db.inspectionReports) {
          await run(
            `
              INSERT INTO inspection_reports (
                id, product_id, consignor_name, inspection_date, conclusion, notes, raw_html,
                created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
            `,
            [
              item.id,
              item.productId,
              item.consignorName ?? null,
              item.inspectionDate ?? null,
              item.conclusion ?? null,
              JSON.stringify(item.notes ?? []),
              item.rawHtml ?? null,
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of db.inspections) {
          await run(
            `
              INSERT INTO inspections (
                id, sn, product_id, company_id, inspection_time, result, status, conclusion,
                created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `,
            [
              item.id,
              item.sn,
              item.productId,
              item.companyId,
              item.inspectionTime,
              item.result,
              item.status,
              item.conclusion ?? null,
              item.createdAt,
              item.updatedAt,
            ]
          );
        }

        for (const item of db.inspectionImages) {
          await run(
            `
              INSERT INTO inspection_images (
                id, inspection_id, asset_id, scene, sort_order, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6)
              ON CONFLICT (inspection_id, asset_id, scene) DO NOTHING
            `,
            [item.id, item.inspectionId, item.assetId, item.scene, item.sortOrder, item.createdAt]
          );
        }

        for (const item of db.inspectionEvents) {
          await run(
            `
              INSERT INTO inspection_events (
                id, inspection_id, event_time, event_type, title, content, sort_order, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              item.id,
              item.inspectionId,
              item.eventTime,
              item.eventType,
              item.title,
              item.content ?? null,
              item.sortOrder,
              item.createdAt,
            ]
          );
        }

        for (const item of db.tracePages) {
          await run(
            `
              INSERT INTO trace_pages (
                id, sn, consignor_name, inspection_date, trace_content, status, created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              item.id,
              item.sn,
              item.consignorName ?? null,
              item.inspectionDate ?? null,
              item.traceContent ?? null,
              item.status,
              item.createdAt,
              item.updatedAt,
            ]
          );

          const bannerAssetIds = parseCsv(item.indexBannerAssetIdsCsv);
          for (let index = 0; index < bannerAssetIds.length; index += 1) {
            const assetId = bannerAssetIds[index];
            await run(
              `
                INSERT INTO trace_page_banners (
                  id, trace_page_id, asset_id, sort_order, created_at
                ) VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (trace_page_id, asset_id) DO NOTHING
              `,
              [`${item.id}-banner-${index}`, item.id, assetId, index, item.createdAt]
            );
          }
        }

        for (const item of db.traceCodes) {
          await run(
            `
              INSERT INTO trace_codes (
                id, code, product_id, verify_status, verify_count,
                first_verified_at, last_verified_at, expires_at, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `,
            [
              item.id,
              item.code,
              item.productId,
              item.verifyStatus,
              item.verifyCount,
              item.firstVerifiedAt ?? null,
              item.lastVerifiedAt ?? null,
              item.expiresAt ?? null,
              item.createdAt,
            ]
          );
        }

        for (const item of db.traceEvents) {
          await run(
            `
              INSERT INTO trace_events (
                id, trace_code_id, event_time, event_type, title, content, sort_order, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              item.id,
              item.traceCodeId,
              item.eventTime,
              item.eventType,
              item.title,
              item.content ?? null,
              item.sortOrder,
              item.createdAt,
            ]
          );
        }

        for (const item of db.traceVerifyLogs) {
          await run(
            `
              INSERT INTO trace_verify_logs (
                id, trace_code_id, verify_at, is_valid, client_ip, user_agent, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7)
            `,
            [
              item.id,
              item.traceCodeId,
              item.verifyAt,
              item.isValid,
              item.clientIp ?? null,
              item.userAgent ?? null,
              item.verifyAt,
            ]
          );
        }

        for (const item of db.auditLogs) {
          await run(
            `
              INSERT INTO audit_logs (
                id, actor_user_id, action, entity_type, entity_id, detail, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
            `,
            [
              item.id,
              item.actorUserId ?? null,
              item.action,
              item.entityType,
              item.entityId ?? null,
              JSON.stringify(item.detail ?? {}),
              item.createdAt,
            ]
          );
        }

        await run("COMMIT");
      } catch (error) {
        await run("ROLLBACK");
        throw error;
      }
    });
  }

  async readDb(): Promise<Database> {
    if (!this.pgPool) {
      return this.readJsonDb();
    }

    try {
      return await this.readDbFromPostgres();
    } catch (error) {
      this.logger.warn("Failed to read PostgreSQL, fallback to JSON data", error as Error);
      return this.readJsonDb();
    }
  }

  async writeDb(db: Database): Promise<void> {
    if (!this.pgPool) {
      await this.writeJsonDb(db);
      return;
    }

    await this.writeDbToPostgres(db);
    await this.writeJsonDb(db);
  }

  async mutateDb<T>(mutator: (db: Database) => T): Promise<T> {
    const db = await this.readDb();
    const result = mutator(db);
    await this.writeDb(db);
    return result;
  }

  nowIso() {
    return new Date().toISOString();
  }

  newId() {
    return randomUUID();
  }
}

