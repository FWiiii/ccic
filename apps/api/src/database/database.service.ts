import { randomBytes, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AdminSession,
  AdminUser,
  AuditLog,
  Company,
  Database,
  Inspection,
  InspectionEvent,
  InspectionImage,
  InspectionReport,
  MediaAsset,
  Product,
  ProductImage,
  TraceCode,
  TraceEvent,
  TracePage,
  TraceVerifyLog,
} from "./database.types";
import { PrismaService } from "./prisma.service";

type Identifiable = { id: string };

type TracePageBannerRow = {
  id: string;
  tracePageId: string;
  assetId: string;
  sortOrder: number;
  createdAt: string;
};

const EMPTY_DB: Database = {
  adminUsers: [],
  adminSessions: [],
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

const toDate = (value: unknown, fallback = new Date()) => {
  if (value instanceof Date) {
    return value;
  }

  const text = asString(value).trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
};

const toOptionalDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = toDate(value, new Date(Number.NaN));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const toOptionalDateOnly = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) {
    return null;
  }

  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matched) {
    return new Date(`${matched[1]}-${matched[2]}-${matched[3]}T00:00:00.000Z`);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.toISOString().slice(0, 10) + "T00:00:00.000Z");
};

const toIsoString = (value: unknown, fallback: string) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const text = asString(value).trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
};

const toOptionalIsoString = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return toIsoString(value, "");
};

const toOptionalDateString = (value: unknown) => {
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

const normalizeJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const isEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const normalizeToken = (value: unknown) => asString(value).trim();

const buildDiffById = <T extends Identifiable>(previous: T[], next: T[]) => {
  const previousMap = new Map(previous.map((item) => [item.id, item] as const));
  const nextMap = new Map(next.map((item) => [item.id, item] as const));

  const toDeleteIds: string[] = [];
  for (const id of previousMap.keys()) {
    if (!nextMap.has(id)) {
      toDeleteIds.push(id);
    }
  }

  const toUpsert: T[] = [];
  for (const [id, item] of nextMap) {
    const previousItem = previousMap.get(id);
    if (!previousItem || !isEqual(previousItem, item)) {
      toUpsert.push(item);
    }
  }

  return {
    toDeleteIds,
    toUpsert,
  };
};

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly adminSessionTtlHours = asNumber(process.env.ADMIN_SESSION_TTL_HOURS, 24 * 30);
  private readonly revokedSessionRetentionHours = asNumber(
    process.env.ADMIN_SESSION_REVOKED_RETENTION_HOURS,
    24 * 7
  );
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {
    const databaseUrl = asString(process.env.DATABASE_URL).trim();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required. Set it in environment or apps/api/.env (see apps/api/.env.example). JSON fallback has been removed."
      );
    }
  }

  private cloneDb(db: Database): Database {
    if (typeof structuredClone === "function") {
      return structuredClone(db);
    }

    return JSON.parse(JSON.stringify(db)) as Database;
  }

  private async withWriteLock<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private toAdminUser(
    item: Pick<
      Prisma.AdminUserGetPayload<object>,
      "id" | "username" | "password" | "displayName" | "role" | "status" | "createdAt" | "updatedAt"
    >,
    now: string
  ): AdminUser {
    return {
      id: item.id,
      username: item.username,
      password: item.password,
      displayName: item.displayName,
      role: asString(item.role) as AdminUser["role"],
      status: asString(item.status) as AdminUser["status"],
      createdAt: toIsoString(item.createdAt, now),
      updatedAt: toIsoString(item.updatedAt, now),
    };
  }

  private buildTracePageBannerRows(tracePages: TracePage[]): TracePageBannerRow[] {
    const rows: TracePageBannerRow[] = [];

    for (const tracePage of tracePages) {
      const seenAssetIds = new Set<string>();
      const assetIds = parseCsv(tracePage.indexBannerAssetIdsCsv);
      let sortOrder = 0;

      for (const assetId of assetIds) {
        if (!assetId || seenAssetIds.has(assetId)) {
          continue;
        }

        seenAssetIds.add(assetId);
        rows.push({
          id: `${tracePage.id}-banner-${sortOrder}`,
          tracePageId: tracePage.id,
          assetId,
          sortOrder,
          createdAt: tracePage.createdAt,
        });
        sortOrder += 1;
      }
    }

    return rows;
  }

  private getSessionExpiresAt() {
    if (!Number.isFinite(this.adminSessionTtlHours) || this.adminSessionTtlHours <= 0) {
      return null;
    }

    return new Date(Date.now() + this.adminSessionTtlHours * 60 * 60 * 1000);
  }

  async readDb(): Promise<Database> {
    const [
      adminUsers,
      adminSessions,
      mediaAssets,
      companies,
      products,
      productImages,
      inspections,
      inspectionEvents,
    ] = await Promise.all([
      this.prisma.adminUser.findMany(),
      this.prisma.adminSession.findMany(),
      this.prisma.mediaAsset.findMany(),
      this.prisma.company.findMany(),
      this.prisma.product.findMany(),
      this.prisma.productImage.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      this.prisma.inspection.findMany(),
      this.prisma.inspectionEvent.findMany({ orderBy: [{ eventTime: "desc" }, { sortOrder: "asc" }] }),
    ]);

    const now = this.nowIso();

    return {
      ...EMPTY_DB,
      adminUsers: adminUsers.map((item) => this.toAdminUser(item, now)),
      adminSessions: adminSessions.map((item): AdminSession => ({
        id: item.id,
        token: item.token,
        userId: item.userId,
        expiresAt: toOptionalIsoString(item.expiresAt),
        lastUsedAt: toOptionalIsoString(item.lastUsedAt),
        revokedAt: toOptionalIsoString(item.revokedAt),
        createdAt: toIsoString(item.createdAt, now),
      })),
      mediaAssets: mediaAssets.map((item): MediaAsset => ({
        id: item.id,
        url: item.url,
        name: item.name,
        mimeType: item.mimeType,
        sizeBytes: Number(item.sizeBytes),
        width: asOptionalNumber(item.width),
        height: asOptionalNumber(item.height),
        bucket: asOptionalString(item.bucket),
        objectKey: asOptionalString(item.objectKey),
        createdAt: toIsoString(item.createdAt, now),
      })),
      companies: companies.map((item): Company => ({
        id: item.id,
        name: item.name,
        shortName: asOptionalString(item.shortName),
        phone: asOptionalString(item.phone),
        address: asOptionalString(item.address),
        descriptionHtml: asOptionalString(item.descriptionHtml),
        logoAssetId: asOptionalString(item.logoAssetId),
        status: asString(item.status) as Company["status"],
        createdAt: toIsoString(item.createdAt, now),
        updatedAt: toIsoString(item.updatedAt, now),
      })),
      products: products.map((item): Product => ({
        id: item.id,
        sku: asOptionalString(item.sku),
        name: item.name,
        brand: asOptionalString(item.brand),
        model: asOptionalString(item.model),
        material: asOptionalString(item.material),
        summary: asOptionalString(item.summary),
        productInfoHtml: asOptionalString(item.productInfoHtml),
        companyId: item.companyId,
        status: asString(item.status) as Product["status"],
        publishedAt: toOptionalIsoString(item.publishedAt),
        createdAt: toIsoString(item.createdAt, now),
        updatedAt: toIsoString(item.updatedAt, now),
      })),
      productImages: productImages.map((item): ProductImage => ({
        id: item.id,
        productId: item.productId,
        assetId: item.assetId,
        scene: asString(item.scene) as ProductImage["scene"],
        sortOrder: item.sortOrder,
        createdAt: toIsoString(item.createdAt, now),
      })),
      inspectionReports: [],
      inspections: inspections.map((item): Inspection => ({
        id: item.id,
        sn: item.sn,
        productId: item.productId,
        companyId: item.companyId,
        inspectionTime: toIsoString(item.inspectionTime, now),
        result: asString(item.result) as Inspection["result"],
        status: asString(item.status) as Inspection["status"],
        conclusion: asOptionalString(item.conclusion),
        createdAt: toIsoString(item.createdAt, now),
        updatedAt: toIsoString(item.updatedAt, now),
      })),
      inspectionEvents: inspectionEvents.map((item): InspectionEvent => ({
        id: item.id,
        inspectionId: item.inspectionId,
        eventTime: toIsoString(item.eventTime, now),
        eventType: asString(item.eventType) as InspectionEvent["eventType"],
        title: item.title,
        content: asOptionalString(item.content),
        sortOrder: item.sortOrder,
        createdAt: toIsoString(item.createdAt, now),
      })),
      inspectionImages: [],
      traceCodes: [],
      tracePages: [],
      traceEvents: [],
      traceVerifyLogs: [],
      auditLogs: [],
    };
  }

  private async applyIncrementalWrite(previousDb: Database, nextDb: Database): Promise<void> {
    const adminUserDiff = buildDiffById(previousDb.adminUsers, nextDb.adminUsers);
    const adminSessionDiff = buildDiffById(previousDb.adminSessions, nextDb.adminSessions);
    const mediaAssetDiff = buildDiffById(previousDb.mediaAssets, nextDb.mediaAssets);
    const companyDiff = buildDiffById(previousDb.companies, nextDb.companies);
    const productDiff = buildDiffById(previousDb.products, nextDb.products);
    const productImageDiff = buildDiffById(previousDb.productImages, nextDb.productImages);
    const inspectionReportDiff = buildDiffById(previousDb.inspectionReports, nextDb.inspectionReports);
    const inspectionDiff = buildDiffById(previousDb.inspections, nextDb.inspections);
    const inspectionImageDiff = buildDiffById(previousDb.inspectionImages, nextDb.inspectionImages);
    const inspectionEventDiff = buildDiffById(previousDb.inspectionEvents, nextDb.inspectionEvents);
    const tracePageDiff = buildDiffById(previousDb.tracePages, nextDb.tracePages);
    const traceCodeDiff = buildDiffById(previousDb.traceCodes, nextDb.traceCodes);
    const traceEventDiff = buildDiffById(previousDb.traceEvents, nextDb.traceEvents);
    const traceVerifyLogDiff = buildDiffById(previousDb.traceVerifyLogs, nextDb.traceVerifyLogs);
    const auditLogDiff = buildDiffById(previousDb.auditLogs, nextDb.auditLogs);

    const previousTracePageBanners = this.buildTracePageBannerRows(previousDb.tracePages);
    const nextTracePageBanners = this.buildTracePageBannerRows(nextDb.tracePages);
    const tracePageBannerDiff = buildDiffById(previousTracePageBanners, nextTracePageBanners);

    await this.prisma.$transaction(async (tx) => {
      // Delete phase (child to parent)
      if (auditLogDiff.toDeleteIds.length > 0) {
        await tx.auditLog.deleteMany({ where: { id: { in: auditLogDiff.toDeleteIds } } });
      }

      if (traceVerifyLogDiff.toDeleteIds.length > 0) {
        await tx.traceVerifyLog.deleteMany({ where: { id: { in: traceVerifyLogDiff.toDeleteIds } } });
      }

      if (traceEventDiff.toDeleteIds.length > 0) {
        await tx.traceEvent.deleteMany({ where: { id: { in: traceEventDiff.toDeleteIds } } });
      }

      if (tracePageBannerDiff.toDeleteIds.length > 0) {
        await tx.tracePageBanner.deleteMany({ where: { id: { in: tracePageBannerDiff.toDeleteIds } } });
      }

      if (inspectionEventDiff.toDeleteIds.length > 0) {
        await tx.inspectionEvent.deleteMany({ where: { id: { in: inspectionEventDiff.toDeleteIds } } });
      }

      if (inspectionImageDiff.toDeleteIds.length > 0) {
        await tx.inspectionImage.deleteMany({ where: { id: { in: inspectionImageDiff.toDeleteIds } } });
      }

      if (productImageDiff.toDeleteIds.length > 0) {
        await tx.productImage.deleteMany({ where: { id: { in: productImageDiff.toDeleteIds } } });
      }

      if (adminSessionDiff.toDeleteIds.length > 0) {
        await tx.adminSession.deleteMany({ where: { id: { in: adminSessionDiff.toDeleteIds } } });
      }

      if (traceCodeDiff.toDeleteIds.length > 0) {
        await tx.traceCode.deleteMany({ where: { id: { in: traceCodeDiff.toDeleteIds } } });
      }

      if (tracePageDiff.toDeleteIds.length > 0) {
        await tx.tracePage.deleteMany({ where: { id: { in: tracePageDiff.toDeleteIds } } });
      }

      if (inspectionDiff.toDeleteIds.length > 0) {
        await tx.inspection.deleteMany({ where: { id: { in: inspectionDiff.toDeleteIds } } });
      }

      if (inspectionReportDiff.toDeleteIds.length > 0) {
        await tx.inspectionReport.deleteMany({ where: { id: { in: inspectionReportDiff.toDeleteIds } } });
      }

      if (productDiff.toDeleteIds.length > 0) {
        await tx.product.deleteMany({ where: { id: { in: productDiff.toDeleteIds } } });
      }

      if (companyDiff.toDeleteIds.length > 0) {
        await tx.company.deleteMany({ where: { id: { in: companyDiff.toDeleteIds } } });
      }

      if (mediaAssetDiff.toDeleteIds.length > 0) {
        // Safety net: trace page banner rows may still reference media assets
        // when historical banner row ids are not aligned with generated diff ids.
        await tx.tracePageBanner.deleteMany({
          where: {
            assetId: { in: mediaAssetDiff.toDeleteIds },
          },
        });
        await tx.mediaAsset.deleteMany({ where: { id: { in: mediaAssetDiff.toDeleteIds } } });
      }

      if (adminUserDiff.toDeleteIds.length > 0) {
        await tx.adminUser.deleteMany({ where: { id: { in: adminUserDiff.toDeleteIds } } });
      }

      // Upsert phase (parent to child)
      for (const item of adminUserDiff.toUpsert) {
        await tx.adminUser.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            username: item.username,
            password: item.password,
            displayName: item.displayName,
            role: item.role,
            status: item.status,
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            username: item.username,
            password: item.password,
            displayName: item.displayName,
            role: item.role,
            status: item.status,
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of mediaAssetDiff.toUpsert) {
        await tx.mediaAsset.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            url: item.url,
            name: item.name,
            mimeType: item.mimeType,
            sizeBytes: BigInt(asNumber(item.sizeBytes, 0)),
            width: item.width ?? null,
            height: item.height ?? null,
            bucket: item.bucket ?? null,
            objectKey: item.objectKey ?? null,
            createdAt: toDate(item.createdAt),
          },
          update: {
            url: item.url,
            name: item.name,
            mimeType: item.mimeType,
            sizeBytes: BigInt(asNumber(item.sizeBytes, 0)),
            width: item.width ?? null,
            height: item.height ?? null,
            bucket: item.bucket ?? null,
            objectKey: item.objectKey ?? null,
          },
        });
      }

      for (const item of companyDiff.toUpsert) {
        await tx.company.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            name: item.name,
            shortName: item.shortName ?? null,
            phone: item.phone ?? null,
            address: item.address ?? null,
            descriptionHtml: item.descriptionHtml ?? null,
            logoAssetId: item.logoAssetId ?? null,
            status: item.status,
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            name: item.name,
            shortName: item.shortName ?? null,
            phone: item.phone ?? null,
            address: item.address ?? null,
            descriptionHtml: item.descriptionHtml ?? null,
            logoAssetId: item.logoAssetId ?? null,
            status: item.status,
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of productDiff.toUpsert) {
        await tx.product.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            sku: item.sku ?? null,
            name: item.name,
            brand: item.brand ?? null,
            model: item.model ?? null,
            material: item.material ?? null,
            summary: item.summary ?? null,
            productInfoHtml: item.productInfoHtml ?? null,
            companyId: item.companyId,
            status: item.status,
            publishedAt: toOptionalDate(item.publishedAt),
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            sku: item.sku ?? null,
            name: item.name,
            brand: item.brand ?? null,
            model: item.model ?? null,
            material: item.material ?? null,
            summary: item.summary ?? null,
            productInfoHtml: item.productInfoHtml ?? null,
            companyId: item.companyId,
            status: item.status,
            publishedAt: toOptionalDate(item.publishedAt),
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of inspectionReportDiff.toUpsert) {
        await tx.inspectionReport.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            productId: item.productId,
            consignorName: item.consignorName ?? null,
            inspectionDate: toOptionalDateOnly(item.inspectionDate),
            conclusion: item.conclusion ?? null,
            notes: (item.notes ?? []) as Prisma.InputJsonValue,
            rawHtml: item.rawHtml ?? null,
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            productId: item.productId,
            consignorName: item.consignorName ?? null,
            inspectionDate: toOptionalDateOnly(item.inspectionDate),
            conclusion: item.conclusion ?? null,
            notes: (item.notes ?? []) as Prisma.InputJsonValue,
            rawHtml: item.rawHtml ?? null,
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of inspectionDiff.toUpsert) {
        await tx.inspection.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            sn: item.sn,
            productId: item.productId,
            companyId: item.companyId,
            inspectionTime: toDate(item.inspectionTime),
            result: item.result,
            status: item.status,
            conclusion: item.conclusion ?? null,
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            sn: item.sn,
            productId: item.productId,
            companyId: item.companyId,
            inspectionTime: toDate(item.inspectionTime),
            result: item.result,
            status: item.status,
            conclusion: item.conclusion ?? null,
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of tracePageDiff.toUpsert) {
        await tx.tracePage.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            sn: item.sn,
            consignorName: item.consignorName ?? null,
            inspectionDate: toOptionalDateOnly(item.inspectionDate),
            traceContent: item.traceContent ?? null,
            status: item.status,
            createdAt: toDate(item.createdAt),
            updatedAt: toDate(item.updatedAt),
          },
          update: {
            sn: item.sn,
            consignorName: item.consignorName ?? null,
            inspectionDate: toOptionalDateOnly(item.inspectionDate),
            traceContent: item.traceContent ?? null,
            status: item.status,
            updatedAt: toDate(item.updatedAt),
          },
        });
      }

      for (const item of traceCodeDiff.toUpsert) {
        await tx.traceCode.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            code: item.code,
            productId: item.productId,
            verifyStatus: item.verifyStatus,
            verifyCount: item.verifyCount,
            firstVerifiedAt: toOptionalDate(item.firstVerifiedAt),
            lastVerifiedAt: toOptionalDate(item.lastVerifiedAt),
            expiresAt: toOptionalDate(item.expiresAt),
            createdAt: toDate(item.createdAt),
          },
          update: {
            code: item.code,
            productId: item.productId,
            verifyStatus: item.verifyStatus,
            verifyCount: item.verifyCount,
            firstVerifiedAt: toOptionalDate(item.firstVerifiedAt),
            lastVerifiedAt: toOptionalDate(item.lastVerifiedAt),
            expiresAt: toOptionalDate(item.expiresAt),
          },
        });
      }

      for (const item of productImageDiff.toUpsert) {
        await tx.productImage.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            productId: item.productId,
            assetId: item.assetId,
            scene: item.scene,
            sortOrder: item.sortOrder,
            createdAt: toDate(item.createdAt),
          },
          update: {
            productId: item.productId,
            assetId: item.assetId,
            scene: item.scene,
            sortOrder: item.sortOrder,
          },
        });
      }

      for (const item of inspectionImageDiff.toUpsert) {
        await tx.inspectionImage.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            inspectionId: item.inspectionId,
            assetId: item.assetId,
            scene: item.scene,
            sortOrder: item.sortOrder,
            createdAt: toDate(item.createdAt),
          },
          update: {
            inspectionId: item.inspectionId,
            assetId: item.assetId,
            scene: item.scene,
            sortOrder: item.sortOrder,
          },
        });
      }

      for (const item of inspectionEventDiff.toUpsert) {
        await tx.inspectionEvent.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            inspectionId: item.inspectionId,
            eventTime: toDate(item.eventTime),
            eventType: item.eventType,
            title: item.title,
            content: item.content ?? null,
            sortOrder: item.sortOrder,
            createdAt: toDate(item.createdAt),
          },
          update: {
            inspectionId: item.inspectionId,
            eventTime: toDate(item.eventTime),
            eventType: item.eventType,
            title: item.title,
            content: item.content ?? null,
            sortOrder: item.sortOrder,
          },
        });
      }

      for (const item of traceEventDiff.toUpsert) {
        await tx.traceEvent.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            traceCodeId: item.traceCodeId,
            eventTime: toDate(item.eventTime),
            eventType: item.eventType,
            title: item.title,
            content: item.content ?? null,
            sortOrder: item.sortOrder,
            createdAt: toDate(item.createdAt),
          },
          update: {
            traceCodeId: item.traceCodeId,
            eventTime: toDate(item.eventTime),
            eventType: item.eventType,
            title: item.title,
            content: item.content ?? null,
            sortOrder: item.sortOrder,
          },
        });
      }

      for (const item of traceVerifyLogDiff.toUpsert) {
        await tx.traceVerifyLog.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            traceCodeId: item.traceCodeId,
            verifyAt: toDate(item.verifyAt),
            isValid: Boolean(item.isValid),
            clientIp: item.clientIp ?? null,
            userAgent: item.userAgent ?? null,
            createdAt: toDate(item.verifyAt),
          },
          update: {
            traceCodeId: item.traceCodeId,
            verifyAt: toDate(item.verifyAt),
            isValid: Boolean(item.isValid),
            clientIp: item.clientIp ?? null,
            userAgent: item.userAgent ?? null,
          },
        });
      }

      for (const item of auditLogDiff.toUpsert) {
        await tx.auditLog.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            actorUserId: item.actorUserId ?? null,
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId ?? null,
            detail: normalizeJsonObject(item.detail) as Prisma.InputJsonValue,
            createdAt: toDate(item.createdAt),
          },
          update: {
            actorUserId: item.actorUserId ?? null,
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId ?? null,
            detail: normalizeJsonObject(item.detail) as Prisma.InputJsonValue,
          },
        });
      }

      for (const item of adminSessionDiff.toUpsert) {
        await tx.adminSession.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            token: item.token,
            userId: item.userId,
            expiresAt: toOptionalDate(item.expiresAt),
            lastUsedAt: toOptionalDate(item.lastUsedAt),
            revokedAt: toOptionalDate(item.revokedAt),
            createdAt: toDate(item.createdAt),
          },
          update: {
            token: item.token,
            userId: item.userId,
            expiresAt: toOptionalDate(item.expiresAt),
            lastUsedAt: toOptionalDate(item.lastUsedAt),
            revokedAt: toOptionalDate(item.revokedAt),
          },
        });
      }

      for (const item of tracePageBannerDiff.toUpsert) {
        await tx.tracePageBanner.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            tracePageId: item.tracePageId,
            assetId: item.assetId,
            sortOrder: item.sortOrder,
            createdAt: toDate(item.createdAt),
          },
          update: {
            tracePageId: item.tracePageId,
            assetId: item.assetId,
            sortOrder: item.sortOrder,
          },
        });
      }
    });
  }

  async writeDb(db: Database): Promise<void> {
    await this.withWriteLock(async () => {
      const previousDb = await this.readDb();
      await this.applyIncrementalWrite(previousDb, db);
    });
  }

  async mutateDb<T>(mutator: (db: Database) => T): Promise<T> {
    return this.withWriteLock(async () => {
      const previousDb = await this.readDb();
      const nextDb = this.cloneDb(previousDb);
      const result = mutator(nextDb);
      await this.applyIncrementalWrite(previousDb, nextDb);
      return result;
    });
  }

  async createAdminSession(userId: string): Promise<string> {
    const normalizedUserId = asString(userId).trim();
    if (!normalizedUserId) {
      throw new Error("userId is required");
    }

    const token = `ccic_${randomBytes(32).toString("hex")}`;
    const now = new Date();

    await this.prisma.adminSession.create({
      data: {
        id: this.newId(),
        token,
        userId: normalizedUserId,
        expiresAt: this.getSessionExpiresAt(),
        lastUsedAt: now,
        createdAt: now,
      },
    });

    return token;
  }

  async getAdminSessionUserId(token: string): Promise<string | undefined> {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      return undefined;
    }

    const now = new Date();
    const session = await this.prisma.adminSession.findUnique({
      where: { token: normalizedToken },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!session || session.revokedAt) {
      return undefined;
    }

    if (session.expiresAt && session.expiresAt.getTime() <= now.getTime()) {
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return undefined;
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastUsedAt: now },
    });

    return session.userId;
  }

  async revokeAdminSession(token: string): Promise<void> {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      return;
    }

    await this.prisma.adminSession.updateMany({
      where: {
        token: normalizedToken,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async recordTraceVerification(traceCodeId: string, isValid: boolean): Promise<void> {
    const normalizedTraceCodeId = asString(traceCodeId).trim();
    if (!normalizedTraceCodeId) {
      return;
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const traceCode = await tx.traceCode.findUnique({
        where: { id: normalizedTraceCodeId },
        select: {
          id: true,
          firstVerifiedAt: true,
        },
      });

      if (!traceCode) {
        return;
      }

      await tx.traceCode.update({
        where: { id: normalizedTraceCodeId },
        data: {
          verifyCount: {
            increment: 1,
          },
          firstVerifiedAt: traceCode.firstVerifiedAt ?? now,
          lastVerifiedAt: now,
        },
      });

      await tx.traceVerifyLog.create({
        data: {
          id: this.newId(),
          traceCodeId: normalizedTraceCodeId,
          verifyAt: now,
          isValid,
          createdAt: now,
        },
      });
    });
  }

  async cleanupExpiredAdminSessions(): Promise<number> {
    const now = new Date();

    await this.prisma.adminSession.updateMany({
      where: {
        revokedAt: null,
        expiresAt: {
          not: null,
          lte: now,
        },
      },
      data: {
        revokedAt: now,
      },
    });

    const deleteConditions: Prisma.AdminSessionWhereInput[] = [
      {
        expiresAt: {
          not: null,
          lte: now,
        },
      },
    ];

    if (Number.isFinite(this.revokedSessionRetentionHours) && this.revokedSessionRetentionHours > 0) {
      const cutoff = new Date(now.getTime() - this.revokedSessionRetentionHours * 60 * 60 * 1000);
      deleteConditions.push({
        revokedAt: {
          not: null,
          lte: cutoff,
        },
      });
    } else {
      deleteConditions.push({
        revokedAt: {
          not: null,
        },
      });
    }

    const deleted = await this.prisma.adminSession.deleteMany({
      where: {
        OR: deleteConditions,
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Cleaned ${deleted.count} expired/revoked admin sessions`);
    }

    return deleted.count;
  }

  async findAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const normalizedUsername = asString(username).trim();
    if (!normalizedUsername) {
      return undefined;
    }

    const item = await this.prisma.adminUser.findUnique({
      where: { username: normalizedUsername },
    });

    if (!item) {
      return undefined;
    }

    return this.toAdminUser(item, this.nowIso());
  }

  async findActiveAdminUserById(userId: string): Promise<AdminUser | undefined> {
    const normalizedUserId = asString(userId).trim();
    if (!normalizedUserId) {
      return undefined;
    }

    const item = await this.prisma.adminUser.findFirst({
      where: {
        id: normalizedUserId,
        status: "ACTIVE",
      },
    });

    if (!item) {
      return undefined;
    }

    return this.toAdminUser(item, this.nowIso());
  }

  async updateAdminUserPassword(userId: string, passwordHash: string): Promise<void> {
    const normalizedUserId = asString(userId).trim();
    const normalizedHash = asString(passwordHash).trim();
    if (!normalizedUserId || !normalizedHash) {
      return;
    }

    await this.prisma.adminUser.update({
      where: { id: normalizedUserId },
      data: {
        password: normalizedHash,
        updatedAt: new Date(),
      },
    });
  }

  async touchAdminUserLastLogin(userId: string): Promise<void> {
    const normalizedUserId = asString(userId).trim();
    if (!normalizedUserId) {
      return;
    }

    const now = new Date();
    await this.prisma.adminUser.update({
      where: { id: normalizedUserId },
      data: {
        lastLoginAt: now,
        updatedAt: now,
      },
    });
  }

  nowIso() {
    return new Date().toISOString();
  }

  newId() {
    return randomUUID();
  }
}
