import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { DatabaseService } from "../database/database.service";
import type {
  Company,
  Inspection,
  InspectionEvent,
  InspectionImage,
  MediaAsset,
  Product,
  ProductImage,
  PublishStatus,
  TraceCode,
  TraceEvent,
  TracePage,
  VerifyStatus,
} from "../database/database.types";

const isPublishStatus = (value: unknown): value is PublishStatus =>
  ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(value));

const isVerifyStatus = (value: unknown): value is VerifyStatus =>
  ["VALID", "INVALID", "EXPIRED", "REVOKED"].includes(String(value));

const isTraceEventType = (value: unknown): value is TraceEvent["eventType"] =>
  ["SUBMIT", "INSPECTION", "CERTIFIED", "UPDATED", "OTHER"].includes(String(value));

const isProductImageScene = (value: unknown): value is ProductImage["scene"] =>
  ["HERO", "CAROUSEL", "COMPANY_DETAIL", "DETAIL"].includes(String(value));

const isInspectionStatus = (value: unknown): value is Inspection["status"] =>
  ["DRAFT", "REVIEWED", "PUBLISHED", "REVOKED"].includes(String(value));

const isInspectionResult = (value: unknown): value is Inspection["result"] =>
  ["PASS", "FAIL", "PENDING"].includes(String(value));

const isInspectionImageScene = (value: unknown): value is InspectionImage["scene"] =>
  ["HERO", "DETAIL", "CERT", "OTHER"].includes(String(value));

const isInspectionEventType = (value: unknown): value is InspectionEvent["eventType"] =>
  ["SUBMIT", "SAMPLE_RECEIVED", "INSPECTION", "CERTIFIED", "PUBLISHED", "OTHER"].includes(String(value));

const toNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const parseAssetIdsCsv = (value: unknown) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

@UseGuards(AdminAuthGuard)
@Controller("api/admin")
export class AdminController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get("bootstrap")
  async bootstrap() {
    const db = await this.databaseService.readDb();

    return {
      data: {
        mediaAssets: db.mediaAssets,
        companies: db.companies,
        products: db.products,
        productImages: db.productImages,
        inspectionReports: db.inspectionReports,
        inspections: db.inspections,
        inspectionImages: db.inspectionImages,
        inspectionEvents: db.inspectionEvents,
        traceCodes: db.traceCodes,
        tracePages: db.tracePages,
        traceEvents: db.traceEvents,
      },
    };
  }

  @Post("media/upload-sign")
  uploadSign() {
    const objectKey = `uploads/${Date.now()}-${this.databaseService.newId()}.jpg`;

    return {
      data: {
        objectKey,
        uploadUrl: `/mock-upload/${objectKey}`,
        method: "PUT",
        headers: {},
        note: "Scaffold endpoint. Replace with object storage signed URL.",
      },
    };
  }

  @Get("media")
  async listMedia() {
    const db = await this.databaseService.readDb();
    return { data: db.mediaAssets };
  }

  @Post("media")
  async createMedia(@Body() body: Record<string, unknown>) {
    const name = String(body?.name ?? "").trim();
    const url = String(body?.url ?? "").trim();

    if (!name || !url) {
      throw new HttpException({ message: "name and url are required" }, HttpStatus.BAD_REQUEST);
    }

    const data = await this.databaseService.mutateDb((db) => {
      const item: MediaAsset = {
        id: this.databaseService.newId(),
        name,
        url,
        mimeType: String(body?.mimeType ?? "image/jpeg"),
        sizeBytes: toNumber(body?.sizeBytes, 0),
        width: body?.width === undefined ? undefined : toNumber(body.width, 0),
        height: body?.height === undefined ? undefined : toNumber(body.height, 0),
        createdAt: this.databaseService.nowIso(),
      };

      db.mediaAssets.unshift(item);
      return item;
    });

    return { data };
  }

  @Put("media/:id")
  async updateMedia(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.mediaAssets.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.name !== undefined) {
        item.name = String(body.name);
      }

      if (body?.url !== undefined) {
        item.url = String(body.url);
      }

      if (body?.mimeType !== undefined) {
        item.mimeType = String(body.mimeType);
      }

      if (body?.sizeBytes !== undefined) {
        item.sizeBytes = toNumber(body.sizeBytes, item.sizeBytes);
      }

      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Media not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Delete("media/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@Param("id") id: string) {
    const result = await this.databaseService.mutateDb((db) => {
      if (
        db.productImages.some((item) => item.assetId === id) ||
        db.inspectionImages.some((item) => item.assetId === id) ||
        db.companies.some((item) => item.logoAssetId === id) ||
        db.tracePages.some((item) => parseAssetIdsCsv(item.indexBannerAssetIdsCsv).includes(id))
      ) {
        return "IN_USE" as const;
      }

      const index = db.mediaAssets.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return "NOT_FOUND" as const;
      }

      db.mediaAssets.splice(index, 1);
      return "OK" as const;
    });

    if (result === "IN_USE") {
      throw new HttpException({ message: "Media is in use" }, HttpStatus.CONFLICT);
    }

    if (result === "NOT_FOUND") {
      throw new HttpException({ message: "Media not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Get("companies")
  async listCompanies() {
    const db = await this.databaseService.readDb();
    return { data: db.companies };
  }

  @Post("companies")
  async createCompany(@Body() body: Record<string, unknown>) {
    const name = String(body?.name ?? "").trim();
    if (!name) {
      throw new HttpException({ message: "name is required" }, HttpStatus.BAD_REQUEST);
    }

    const now = this.databaseService.nowIso();
    const data = await this.databaseService.mutateDb((db) => {
      const item: Company = {
        id: this.databaseService.newId(),
        name,
        shortName: body?.shortName ? String(body.shortName) : undefined,
        phone: body?.phone ? String(body.phone) : undefined,
        address: body?.address ? String(body.address) : undefined,
        descriptionHtml: body?.descriptionHtml ? String(body.descriptionHtml) : undefined,
        logoAssetId: body?.logoAssetId ? String(body.logoAssetId) : undefined,
        status: isPublishStatus(body?.status) ? body.status : "DRAFT",
        createdAt: now,
        updatedAt: now,
      };

      db.companies.unshift(item);
      return item;
    });

    return { data };
  }

  @Put("companies/:id")
  async updateCompany(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.companies.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.name !== undefined) {
        item.name = String(body.name);
      }

      if (body?.shortName !== undefined) {
        item.shortName = String(body.shortName);
      }

      if (body?.phone !== undefined) {
        item.phone = String(body.phone);
      }

      if (body?.address !== undefined) {
        item.address = String(body.address);
      }

      if (body?.descriptionHtml !== undefined) {
        item.descriptionHtml = String(body.descriptionHtml);
      }

      if (body?.logoAssetId !== undefined) {
        item.logoAssetId = String(body.logoAssetId);
      }

      if (body?.status !== undefined && isPublishStatus(body.status)) {
        item.status = body.status;
      }

      item.updatedAt = this.databaseService.nowIso();
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Company not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Delete("companies/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompany(@Param("id") id: string) {
    const result = await this.databaseService.mutateDb((db) => {
      if (db.products.some((item) => item.companyId === id) || db.inspections.some((item) => item.companyId === id)) {
        return "IN_USE" as const;
      }

      const index = db.companies.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return "NOT_FOUND" as const;
      }

      db.companies.splice(index, 1);
      return "OK" as const;
    });

    if (result === "IN_USE") {
      throw new HttpException({ message: "Company is used by products" }, HttpStatus.CONFLICT);
    }

    if (result === "NOT_FOUND") {
      throw new HttpException({ message: "Company not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Post("companies/:id/publish")
  async publishCompany(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const status = body?.status;

    if (!isPublishStatus(status)) {
      throw new HttpException(
        { message: "status must be DRAFT/PUBLISHED/ARCHIVED" },
        HttpStatus.BAD_REQUEST
      );
    }

    const data = await this.databaseService.mutateDb((db) => {
      const item = db.companies.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      item.status = status;
      item.updatedAt = this.databaseService.nowIso();
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Company not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Get("products")
  async listProducts() {
    const db = await this.databaseService.readDb();
    return { data: db.products };
  }

  @Post("products")
  async createProduct(@Body() body: Record<string, unknown>) {
    const name = String(body?.name ?? "").trim();
    const companyId = String(body?.companyId ?? "").trim();

    if (!name || !companyId) {
      throw new HttpException(
        { message: "name and companyId are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    const now = this.databaseService.nowIso();
    const data = await this.databaseService.mutateDb((db) => {
      if (!db.companies.some((item) => item.id === companyId)) {
        return null;
      }

      const item: Product = {
        id: this.databaseService.newId(),
        sku: body?.sku ? String(body.sku) : undefined,
        name,
        brand: body?.brand ? String(body.brand) : undefined,
        model: body?.model ? String(body.model) : undefined,
        summary: body?.summary ? String(body.summary) : undefined,
        productInfoHtml: body?.productInfoHtml ? String(body.productInfoHtml) : undefined,
        companyId,
        status: isPublishStatus(body?.status) ? body.status : "DRAFT",
        publishedAt: undefined,
        createdAt: now,
        updatedAt: now,
      };

      db.products.unshift(item);
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "companyId does not exist" }, HttpStatus.BAD_REQUEST);
    }

    return { data };
  }

  @Put("products/:id")
  async updateProduct(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.products.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.name !== undefined) {
        item.name = String(body.name);
      }

      if (body?.sku !== undefined) {
        item.sku = String(body.sku);
      }

      if (body?.brand !== undefined) {
        item.brand = String(body.brand);
      }

      if (body?.model !== undefined) {
        item.model = String(body.model);
      }

      if (body?.summary !== undefined) {
        item.summary = String(body.summary);
      }

      if (body?.productInfoHtml !== undefined) {
        item.productInfoHtml = String(body.productInfoHtml);
      }

      if (body?.status !== undefined && isPublishStatus(body.status)) {
        item.status = body.status;
      }

      if (body?.companyId !== undefined) {
        const companyId = String(body.companyId);
        if (!db.companies.some((company) => company.id === companyId)) {
          return null;
        }

        item.companyId = companyId;
      }

      item.updatedAt = this.databaseService.nowIso();
      return item;
    });

    if (!data) {
      throw new HttpException(
        { message: "Product not found or payload invalid" },
        HttpStatus.NOT_FOUND
      );
    }

    return { data };
  }

  @Delete("products/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.products.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.products.splice(index, 1);
      db.productImages = db.productImages.filter((item) => item.productId !== id);
      db.inspectionReports = db.inspectionReports.filter((item) => item.productId !== id);
      const inspectionIds = new Set(db.inspections.filter((item) => item.productId === id).map((item) => item.id));
      db.inspections = db.inspections.filter((item) => item.productId !== id);
      db.inspectionImages = db.inspectionImages.filter((item) => !inspectionIds.has(item.inspectionId));
      db.inspectionEvents = db.inspectionEvents.filter((item) => !inspectionIds.has(item.inspectionId));

      const traceIds = new Set(db.traceCodes.filter((item) => item.productId === id).map((item) => item.id));
      db.traceCodes = db.traceCodes.filter((item) => item.productId !== id);
      db.traceEvents = db.traceEvents.filter((item) => !traceIds.has(item.traceCodeId));
      db.traceVerifyLogs = db.traceVerifyLogs.filter((item) => !traceIds.has(item.traceCodeId));

      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Product not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Post("products/:id/publish")
  async publishProduct(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const status = body?.status;

    if (!isPublishStatus(status)) {
      throw new HttpException(
        { message: "status must be DRAFT/PUBLISHED/ARCHIVED" },
        HttpStatus.BAD_REQUEST
      );
    }

    const data = await this.databaseService.mutateDb((db) => {
      const item = db.products.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      item.status = status;
      item.updatedAt = this.databaseService.nowIso();
      item.publishedAt = status === "PUBLISHED" ? this.databaseService.nowIso() : undefined;
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Product not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Get("product-images")
  async listProductImages(@Query("productId") queryProductId?: string) {
    const productId = String(queryProductId ?? "").trim();
    const db = await this.databaseService.readDb();

    return {
      data: productId ? db.productImages.filter((item) => item.productId === productId) : db.productImages,
    };
  }

  @Post("product-images")
  async createProductImage(@Body() body: Record<string, unknown>) {
    const productId = String(body?.productId ?? "").trim();
    const assetId = String(body?.assetId ?? "").trim();
    const scene = String(body?.scene ?? "").trim();

    if (!productId || !assetId || !scene) {
      throw new HttpException(
        { message: "productId, assetId and scene are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!isProductImageScene(scene)) {
      throw new HttpException({ message: "scene is invalid" }, HttpStatus.BAD_REQUEST);
    }

    const data = await this.databaseService.mutateDb((db) => {
      if (!db.products.some((item) => item.id === productId) || !db.mediaAssets.some((item) => item.id === assetId)) {
        return null;
      }

      const item: ProductImage = {
        id: this.databaseService.newId(),
        productId,
        assetId,
        scene,
        sortOrder: toNumber(body?.sortOrder, 0),
        createdAt: this.databaseService.nowIso(),
      };

      db.productImages.push(item);
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "productId or assetId does not exist" }, HttpStatus.BAD_REQUEST);
    }

    return { data };
  }

  @Put("product-images/:id")
  async updateProductImage(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.productImages.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.assetId !== undefined) {
        const assetId = String(body.assetId);
        if (!db.mediaAssets.some((entry) => entry.id === assetId)) {
          return null;
        }

        item.assetId = assetId;
      }

      if (body?.scene !== undefined) {
        const scene = String(body.scene);
        if (!isProductImageScene(scene)) {
          return null;
        }

        item.scene = scene;
      }

      if (body?.sortOrder !== undefined) {
        item.sortOrder = toNumber(body.sortOrder, item.sortOrder);
      }

      return item;
    });

    if (!data) {
      throw new HttpException(
        { message: "Product image not found or payload invalid" },
        HttpStatus.BAD_REQUEST
      );
    }

    return { data };
  }

  @Delete("product-images/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductImage(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.productImages.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.productImages.splice(index, 1);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Product image not found" }, HttpStatus.NOT_FOUND);
    }
  }


  @Get("inspections")
  async listInspections(
    @Query("sn") querySn?: string,
    @Query("productId") queryProductId?: string,
    @Query("companyId") queryCompanyId?: string,
    @Query("status") queryStatus?: string
  ) {
    const sn = String(querySn ?? "").trim();
    const productId = String(queryProductId ?? "").trim();
    const companyId = String(queryCompanyId ?? "").trim();
    const status = String(queryStatus ?? "").trim();

    if (status && !isInspectionStatus(status)) {
      throw new HttpException(
        { message: "status must be DRAFT/REVIEWED/PUBLISHED/REVOKED" },
        HttpStatus.BAD_REQUEST
      );
    }

    const db = await this.databaseService.readDb();

    return {
      data: db.inspections.filter(
        (item) =>
          (!sn || item.sn === sn) &&
          (!productId || item.productId === productId) &&
          (!companyId || item.companyId === companyId) &&
          (!status || item.status === status)
      ),
    };
  }

  @Post("inspections")
  async createInspection(@Body() body: Record<string, unknown>) {
    const sn = String(body?.sn ?? "").trim();
    const productId = String(body?.productId ?? "").trim();
    const companyId = String(body?.companyId ?? "").trim();

    if (!sn || !productId || !companyId) {
      throw new HttpException(
        { message: "sn, productId and companyId are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    const resultValue = body?.result;
    if (resultValue !== undefined && !isInspectionResult(resultValue)) {
      throw new HttpException(
        { message: "result must be PASS/FAIL/PENDING" },
        HttpStatus.BAD_REQUEST
      );
    }

    const statusValue = body?.status;
    if (statusValue !== undefined && !isInspectionStatus(statusValue)) {
      throw new HttpException(
        { message: "status must be DRAFT/REVIEWED/PUBLISHED/REVOKED" },
        HttpStatus.BAD_REQUEST
      );
    }

    const inspectionTimeRaw = body?.inspectionTime;
    const inspectionTime =
      inspectionTimeRaw === undefined ? this.databaseService.nowIso() : String(inspectionTimeRaw).trim();

    if (!inspectionTime) {
      throw new HttpException({ message: "inspectionTime is invalid" }, HttpStatus.BAD_REQUEST);
    }

    const now = this.databaseService.nowIso();

    const result = await this.databaseService.mutateDb((db) => {
      if (db.inspections.some((item) => item.sn === sn)) {
        return { error: "SN_EXISTS" as const };
      }

      const product = db.products.find((item) => item.id === productId);
      if (!product) {
        return { error: "PRODUCT_NOT_FOUND" as const };
      }

      const company = db.companies.find((item) => item.id === companyId);
      if (!company) {
        return { error: "COMPANY_NOT_FOUND" as const };
      }

      const productNameSnapshotRaw =
        body?.productNameSnapshot === undefined ? "" : String(body.productNameSnapshot ?? "").trim();
      const companyNameSnapshotRaw =
        body?.companyNameSnapshot === undefined ? "" : String(body.companyNameSnapshot ?? "").trim();
      const conclusionRaw = body?.conclusion === undefined ? "" : String(body.conclusion ?? "");

      const item: Inspection = {
        id: this.databaseService.newId(),
        sn,
        productId,
        companyId,
        inspectionTime,
        result: isInspectionResult(resultValue) ? resultValue : "PENDING",
        status: isInspectionStatus(statusValue) ? statusValue : "DRAFT",
        conclusion: conclusionRaw.trim() ? conclusionRaw : undefined,
        productNameSnapshot: productNameSnapshotRaw || product.name,
        companyNameSnapshot: companyNameSnapshotRaw || company.name,
        createdAt: now,
        updatedAt: now,
      };

      db.inspections.unshift(item);
      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "SN_EXISTS") {
        throw new HttpException({ message: "sn already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        {
          message: result.error === "PRODUCT_NOT_FOUND" ? "productId does not exist" : "companyId does not exist",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Put("inspections/:id")
  async updateInspection(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const result = await this.databaseService.mutateDb((db) => {
      const item = db.inspections.find((entry) => entry.id === id);
      if (!item) {
        return { error: "NOT_FOUND" as const };
      }

      if (body?.sn !== undefined) {
        const sn = String(body.sn ?? "").trim();
        if (!sn) {
          return { error: "SN_REQUIRED" as const };
        }

        if (db.inspections.some((entry) => entry.sn === sn && entry.id !== id)) {
          return { error: "SN_EXISTS" as const };
        }

        item.sn = sn;
      }

      if (body?.productId !== undefined) {
        const productId = String(body.productId ?? "").trim();
        if (!productId) {
          return { error: "PRODUCT_REQUIRED" as const };
        }

        const product = db.products.find((entry) => entry.id === productId);
        if (!product) {
          return { error: "PRODUCT_NOT_FOUND" as const };
        }

        item.productId = productId;
        if (body?.productNameSnapshot === undefined) {
          item.productNameSnapshot = product.name;
        }
      }

      if (body?.companyId !== undefined) {
        const companyId = String(body.companyId ?? "").trim();
        if (!companyId) {
          return { error: "COMPANY_REQUIRED" as const };
        }

        const company = db.companies.find((entry) => entry.id === companyId);
        if (!company) {
          return { error: "COMPANY_NOT_FOUND" as const };
        }

        item.companyId = companyId;
        if (body?.companyNameSnapshot === undefined) {
          item.companyNameSnapshot = company.name;
        }
      }

      if (body?.inspectionTime !== undefined) {
        const inspectionTime = String(body.inspectionTime ?? "").trim();
        if (!inspectionTime) {
          return { error: "INSPECTION_TIME_REQUIRED" as const };
        }

        item.inspectionTime = inspectionTime;
      }

      if (body?.result !== undefined) {
        const resultValue = body.result;
        if (!isInspectionResult(resultValue)) {
          return { error: "INVALID_RESULT" as const };
        }

        item.result = resultValue;
      }

      if (body?.status !== undefined) {
        const statusValue = body.status;
        if (!isInspectionStatus(statusValue)) {
          return { error: "INVALID_STATUS" as const };
        }

        item.status = statusValue;
      }

      if (body?.conclusion !== undefined) {
        const conclusion = String(body.conclusion ?? "");
        item.conclusion = conclusion.trim() ? conclusion : undefined;
      }

      if (body?.productNameSnapshot !== undefined) {
        const productNameSnapshot = String(body.productNameSnapshot ?? "").trim();
        item.productNameSnapshot = productNameSnapshot || undefined;
      }

      if (body?.companyNameSnapshot !== undefined) {
        const companyNameSnapshot = String(body.companyNameSnapshot ?? "").trim();
        item.companyNameSnapshot = companyNameSnapshot || undefined;
      }

      item.updatedAt = this.databaseService.nowIso();
      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        throw new HttpException({ message: "Inspection not found" }, HttpStatus.NOT_FOUND);
      }

      if (result.error === "SN_EXISTS") {
        throw new HttpException({ message: "sn already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        {
          message:
            result.error === "INVALID_RESULT"
              ? "result must be PASS/FAIL/PENDING"
              : result.error === "INVALID_STATUS"
                ? "status must be DRAFT/REVIEWED/PUBLISHED/REVOKED"
                : result.error === "PRODUCT_NOT_FOUND"
                  ? "productId does not exist"
                  : result.error === "COMPANY_NOT_FOUND"
                    ? "companyId does not exist"
                    : result.error === "SN_REQUIRED"
                      ? "sn is required"
                      : result.error === "PRODUCT_REQUIRED"
                        ? "productId is required"
                        : result.error === "COMPANY_REQUIRED"
                          ? "companyId is required"
                          : "inspectionTime is required",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Delete("inspections/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInspection(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.inspections.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.inspections.splice(index, 1);
      db.inspectionImages = db.inspectionImages.filter((entry) => entry.inspectionId !== id);
      db.inspectionEvents = db.inspectionEvents.filter((entry) => entry.inspectionId !== id);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Inspection not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Post("inspections/:id/publish")
  async publishInspection(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const statusValue = body?.status;

    if (!isInspectionStatus(statusValue)) {
      throw new HttpException(
        { message: "status must be DRAFT/REVIEWED/PUBLISHED/REVOKED" },
        HttpStatus.BAD_REQUEST
      );
    }

    const data = await this.databaseService.mutateDb((db) => {
      const item = db.inspections.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      item.status = statusValue;
      item.updatedAt = this.databaseService.nowIso();
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Inspection not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Get("inspection-images")
  async listInspectionImages(@Query("inspectionId") queryInspectionId?: string) {
    const inspectionId = String(queryInspectionId ?? "").trim();
    const db = await this.databaseService.readDb();

    return {
      data: inspectionId
        ? db.inspectionImages.filter((item) => item.inspectionId === inspectionId)
        : db.inspectionImages,
    };
  }

  @Post("inspection-images")
  async createInspectionImage(@Body() body: Record<string, unknown>) {
    const inspectionId = String(body?.inspectionId ?? "").trim();
    const assetId = String(body?.assetId ?? "").trim();
    const scene = String(body?.scene ?? "").trim();

    if (!inspectionId || !assetId || !scene) {
      throw new HttpException(
        { message: "inspectionId, assetId and scene are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!isInspectionImageScene(scene)) {
      throw new HttpException({ message: "scene is invalid" }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.databaseService.mutateDb((db) => {
      if (!db.inspections.some((item) => item.id === inspectionId)) {
        return { error: "INSPECTION_NOT_FOUND" as const };
      }

      if (!db.mediaAssets.some((item) => item.id === assetId)) {
        return { error: "ASSET_NOT_FOUND" as const };
      }

      if (
        db.inspectionImages.some(
          (item) => item.inspectionId === inspectionId && item.assetId === assetId && item.scene === scene
        )
      ) {
        return { error: "BINDING_EXISTS" as const };
      }

      const item: InspectionImage = {
        id: this.databaseService.newId(),
        inspectionId,
        assetId,
        scene,
        sortOrder: toNumber(body?.sortOrder, 0),
        createdAt: this.databaseService.nowIso(),
      };

      db.inspectionImages.push(item);
      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "BINDING_EXISTS") {
        throw new HttpException({ message: "Inspection image binding already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        { message: result.error === "INSPECTION_NOT_FOUND" ? "inspectionId does not exist" : "assetId does not exist" },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Put("inspection-images/:id")
  async updateInspectionImage(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const result = await this.databaseService.mutateDb((db) => {
      const item = db.inspectionImages.find((entry) => entry.id === id);
      if (!item) {
        return { error: "NOT_FOUND" as const };
      }

      if (body?.inspectionId !== undefined) {
        const inspectionId = String(body.inspectionId ?? "").trim();
        if (!inspectionId) {
          return { error: "INSPECTION_REQUIRED" as const };
        }

        if (!db.inspections.some((entry) => entry.id === inspectionId)) {
          return { error: "INSPECTION_NOT_FOUND" as const };
        }

        item.inspectionId = inspectionId;
      }

      if (body?.assetId !== undefined) {
        const assetId = String(body.assetId ?? "").trim();
        if (!assetId) {
          return { error: "ASSET_REQUIRED" as const };
        }

        if (!db.mediaAssets.some((entry) => entry.id === assetId)) {
          return { error: "ASSET_NOT_FOUND" as const };
        }

        item.assetId = assetId;
      }

      if (body?.scene !== undefined) {
        const scene = String(body.scene ?? "").trim();
        if (!isInspectionImageScene(scene)) {
          return { error: "INVALID_SCENE" as const };
        }

        item.scene = scene;
      }

      if (body?.sortOrder !== undefined) {
        item.sortOrder = toNumber(body.sortOrder, item.sortOrder);
      }

      if (
        db.inspectionImages.some(
          (entry) =>
            entry.id !== item.id &&
            entry.inspectionId === item.inspectionId &&
            entry.assetId === item.assetId &&
            entry.scene === item.scene
        )
      ) {
        return { error: "BINDING_EXISTS" as const };
      }

      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        throw new HttpException({ message: "Inspection image not found" }, HttpStatus.NOT_FOUND);
      }

      if (result.error === "BINDING_EXISTS") {
        throw new HttpException({ message: "Inspection image binding already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        {
          message:
            result.error === "INSPECTION_NOT_FOUND"
              ? "inspectionId does not exist"
              : result.error === "ASSET_NOT_FOUND"
                ? "assetId does not exist"
                : result.error === "INSPECTION_REQUIRED"
                  ? "inspectionId is required"
                  : result.error === "ASSET_REQUIRED"
                    ? "assetId is required"
                    : "scene is invalid",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Delete("inspection-images/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInspectionImage(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.inspectionImages.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.inspectionImages.splice(index, 1);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Inspection image not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Get("inspection-events")
  async listInspectionEvents(@Query("inspectionId") queryInspectionId?: string) {
    const inspectionId = String(queryInspectionId ?? "").trim();
    const db = await this.databaseService.readDb();

    return {
      data: inspectionId
        ? db.inspectionEvents.filter((item) => item.inspectionId === inspectionId)
        : db.inspectionEvents,
    };
  }

  @Post("inspection-events")
  async createInspectionEvent(@Body() body: Record<string, unknown>) {
    const inspectionId = String(body?.inspectionId ?? "").trim();
    const title = String(body?.title ?? "").trim();

    if (!inspectionId || !title) {
      throw new HttpException(
        { message: "inspectionId and title are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    const eventTypeValue = body?.eventType;
    if (eventTypeValue !== undefined && !isInspectionEventType(eventTypeValue)) {
      throw new HttpException(
        { message: "eventType is invalid" },
        HttpStatus.BAD_REQUEST
      );
    }

    const eventTimeRaw = body?.eventTime;
    const eventTime = eventTimeRaw === undefined ? this.databaseService.nowIso() : String(eventTimeRaw).trim();
    if (!eventTime) {
      throw new HttpException({ message: "eventTime is invalid" }, HttpStatus.BAD_REQUEST);
    }

    const data = await this.databaseService.mutateDb((db) => {
      if (!db.inspections.some((entry) => entry.id === inspectionId)) {
        return null;
      }

      const item: InspectionEvent = {
        id: this.databaseService.newId(),
        inspectionId,
        eventTime,
        eventType: isInspectionEventType(eventTypeValue) ? eventTypeValue : "OTHER",
        title,
        content: body?.content ? String(body.content) : undefined,
        sortOrder: toNumber(body?.sortOrder, 0),
        createdAt: this.databaseService.nowIso(),
      };

      db.inspectionEvents.unshift(item);
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "inspectionId does not exist" }, HttpStatus.BAD_REQUEST);
    }

    return { data };
  }

  @Put("inspection-events/:id")
  async updateInspectionEvent(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const result = await this.databaseService.mutateDb((db) => {
      const item = db.inspectionEvents.find((entry) => entry.id === id);
      if (!item) {
        return { error: "NOT_FOUND" as const };
      }

      if (body?.inspectionId !== undefined) {
        const inspectionId = String(body.inspectionId ?? "").trim();
        if (!inspectionId) {
          return { error: "INSPECTION_REQUIRED" as const };
        }

        if (!db.inspections.some((entry) => entry.id === inspectionId)) {
          return { error: "INSPECTION_NOT_FOUND" as const };
        }

        item.inspectionId = inspectionId;
      }

      if (body?.title !== undefined) {
        const title = String(body.title ?? "").trim();
        if (!title) {
          return { error: "TITLE_REQUIRED" as const };
        }

        item.title = title;
      }

      if (body?.content !== undefined) {
        const content = String(body.content ?? "");
        item.content = content.trim() ? content : undefined;
      }

      if (body?.eventType !== undefined) {
        const eventType = body.eventType;
        if (!isInspectionEventType(eventType)) {
          return { error: "INVALID_EVENT_TYPE" as const };
        }

        item.eventType = eventType;
      }

      if (body?.eventTime !== undefined) {
        const eventTime = String(body.eventTime ?? "").trim();
        if (!eventTime) {
          return { error: "EVENT_TIME_REQUIRED" as const };
        }

        item.eventTime = eventTime;
      }

      if (body?.sortOrder !== undefined) {
        item.sortOrder = toNumber(body.sortOrder, item.sortOrder);
      }

      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        throw new HttpException({ message: "Inspection event not found" }, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        {
          message:
            result.error === "INSPECTION_NOT_FOUND"
              ? "inspectionId does not exist"
              : result.error === "INSPECTION_REQUIRED"
                ? "inspectionId is required"
                : result.error === "TITLE_REQUIRED"
                  ? "title is required"
                  : result.error === "EVENT_TIME_REQUIRED"
                    ? "eventTime is required"
                    : "eventType is invalid",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Delete("inspection-events/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInspectionEvent(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.inspectionEvents.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.inspectionEvents.splice(index, 1);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Inspection event not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Get("trace-pages")
  async listTracePages() {
    const db = await this.databaseService.readDb();
    return { data: db.tracePages };
  }

  @Post("trace-pages")
  async createTracePage(@Body() body: Record<string, unknown>) {
    const sn = String(body?.sn ?? "").trim();

    if (!sn) {
      throw new HttpException({ message: "sn is required" }, HttpStatus.BAD_REQUEST);
    }

    const indexBannerAssetIdsCsv = String(body?.indexBannerAssetIdsCsv ?? "").trim();
    const now = this.databaseService.nowIso();

    const result = await this.databaseService.mutateDb((db) => {
      if (db.tracePages.some((item) => item.sn === sn)) {
        return { error: "SN_EXISTS" as const };
      }

      const assetIds = parseAssetIdsCsv(indexBannerAssetIdsCsv);
      if (assetIds.some((assetId) => !db.mediaAssets.some((asset) => asset.id === assetId))) {
        return { error: "ASSET_NOT_FOUND" as const };
      }

      const status = body?.status;
      if (status !== undefined && !isPublishStatus(status)) {
        return { error: "INVALID_STATUS" as const };
      }

      const item: TracePage = {
        id: this.databaseService.newId(),
        sn,
        indexBannerAssetIdsCsv,
        consignorName: body?.consignorName ? String(body.consignorName).trim() : undefined,
        inspectionDate: body?.inspectionDate ? String(body.inspectionDate).trim() : undefined,
        traceContent: body?.traceContent ? String(body.traceContent) : undefined,
        status: isPublishStatus(status) ? status : "DRAFT",
        createdAt: now,
        updatedAt: now,
      };

      db.tracePages.unshift(item);
      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "SN_EXISTS") {
        throw new HttpException({ message: "sn already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        { message: result.error === "ASSET_NOT_FOUND" ? "index banner asset does not exist" : "status is invalid" },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Put("trace-pages/:id")
  async updateTracePage(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const result = await this.databaseService.mutateDb((db) => {
      const item = db.tracePages.find((entry) => entry.id === id);
      if (!item) {
        return { error: "NOT_FOUND" as const };
      }

      if (body?.sn !== undefined) {
        const sn = String(body.sn ?? "").trim();
        if (!sn) {
          return { error: "SN_REQUIRED" as const };
        }

        if (db.tracePages.some((entry) => entry.sn === sn && entry.id !== id)) {
          return { error: "SN_EXISTS" as const };
        }

        item.sn = sn;
      }

      if (body?.indexBannerAssetIdsCsv !== undefined) {
        const indexBannerAssetIdsCsv = String(body.indexBannerAssetIdsCsv ?? "").trim();
        const assetIds = parseAssetIdsCsv(indexBannerAssetIdsCsv);
        if (assetIds.some((assetId) => !db.mediaAssets.some((asset) => asset.id === assetId))) {
          return { error: "ASSET_NOT_FOUND" as const };
        }

        item.indexBannerAssetIdsCsv = indexBannerAssetIdsCsv;
      }

      if (body?.status !== undefined) {
        if (!isPublishStatus(body.status)) {
          return { error: "INVALID_STATUS" as const };
        }

        item.status = body.status;
      }

      if (body?.consignorName !== undefined) {
        const consignorName = String(body.consignorName ?? "").trim();
        item.consignorName = consignorName || undefined;
      }

      if (body?.inspectionDate !== undefined) {
        const inspectionDate = String(body.inspectionDate ?? "").trim();
        item.inspectionDate = inspectionDate || undefined;
      }

      if (body?.traceContent !== undefined) {
        const traceContent = String(body.traceContent ?? "");
        item.traceContent = traceContent.trim() ? traceContent : undefined;
      }

      item.updatedAt = this.databaseService.nowIso();
      return { data: item };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        throw new HttpException({ message: "Trace page not found" }, HttpStatus.NOT_FOUND);
      }

      if (result.error === "SN_EXISTS") {
        throw new HttpException({ message: "sn already exists" }, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        {
          message:
            result.error === "ASSET_NOT_FOUND"
              ? "index banner asset does not exist"
              : result.error === "SN_REQUIRED"
                ? "sn is required"
                : "status is invalid",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Delete("trace-pages/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTracePage(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.tracePages.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.tracePages.splice(index, 1);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Trace page not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Put("trace-pages/by-sn/:sn")
  async upsertTracePageBySn(@Param("sn") rawSn: string, @Body() body: Record<string, unknown>) {
    const sn = String(rawSn ?? "").trim();

    if (!sn) {
      throw new HttpException({ message: "sn is required" }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.databaseService.mutateDb((db) => {
      const existing = db.tracePages.find((entry) => entry.sn === sn);
      const status = body?.status;
      if (status !== undefined && !isPublishStatus(status)) {
        return { error: "INVALID_STATUS" as const };
      }

      const hasBannerPayload = body?.indexBannerAssetIdsCsv !== undefined;
      const indexBannerAssetIdsCsv = hasBannerPayload
        ? String(body.indexBannerAssetIdsCsv ?? "").trim()
        : undefined;

      if (indexBannerAssetIdsCsv !== undefined) {
        const assetIds = parseAssetIdsCsv(indexBannerAssetIdsCsv);
        if (assetIds.some((assetId) => !db.mediaAssets.some((asset) => asset.id === assetId))) {
          return { error: "ASSET_NOT_FOUND" as const };
        }
      }

      const now = this.databaseService.nowIso();

      if (!existing) {
        const item: TracePage = {
          id: this.databaseService.newId(),
          sn,
          indexBannerAssetIdsCsv: indexBannerAssetIdsCsv ?? "",
          consignorName: body?.consignorName ? String(body.consignorName).trim() : undefined,
          inspectionDate: body?.inspectionDate ? String(body.inspectionDate).trim() : undefined,
          traceContent: body?.traceContent ? String(body.traceContent) : undefined,
          status: isPublishStatus(status) ? status : "DRAFT",
          createdAt: now,
          updatedAt: now,
        };

        db.tracePages.unshift(item);
        return { data: item };
      }

      if (indexBannerAssetIdsCsv !== undefined) {
        existing.indexBannerAssetIdsCsv = indexBannerAssetIdsCsv;
      }

      if (body?.consignorName !== undefined) {
        const consignorName = String(body.consignorName ?? "").trim();
        existing.consignorName = consignorName || undefined;
      }

      if (body?.inspectionDate !== undefined) {
        const inspectionDate = String(body.inspectionDate ?? "").trim();
        existing.inspectionDate = inspectionDate || undefined;
      }

      if (body?.traceContent !== undefined) {
        const traceContent = String(body.traceContent ?? "");
        existing.traceContent = traceContent.trim() ? traceContent : undefined;
      }

      if (status !== undefined && isPublishStatus(status)) {
        existing.status = status;
      }

      existing.updatedAt = now;
      return { data: existing };
    });

    if ("error" in result) {
      throw new HttpException(
        { message: result.error === "ASSET_NOT_FOUND" ? "index banner asset does not exist" : "status is invalid" },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }
  @Get("trace-codes")
  async listTraceCodes() {
    const db = await this.databaseService.readDb();
    return { data: db.traceCodes };
  }

  @Post("trace-codes")
  async createTraceCode(@Body() body: Record<string, unknown>) {
    const code = String(body?.code ?? "").trim();
    const productId = String(body?.productId ?? "").trim();

    if (!code || !productId) {
      throw new HttpException({ message: "code and productId are required" }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.databaseService.mutateDb((db) => {
      if (db.traceCodes.some((item) => item.code === code)) {
        return { error: "CODE_EXISTS" as const };
      }

      if (!db.products.some((item) => item.id === productId)) {
        return { error: "PRODUCT_NOT_FOUND" as const };
      }

      const item: TraceCode = {
        id: this.databaseService.newId(),
        code,
        productId,
        verifyStatus: isVerifyStatus(body?.verifyStatus) ? body.verifyStatus : "VALID",
        verifyCount: 0,
        firstVerifiedAt: undefined,
        lastVerifiedAt: undefined,
        expiresAt: body?.expiresAt ? String(body.expiresAt) : undefined,
        createdAt: this.databaseService.nowIso(),
      };

      db.traceCodes.unshift(item);
      return { data: item };
    });

    if ("error" in result) {
      throw new HttpException(
        { message: result.error },
        result.error === "CODE_EXISTS" ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Put("trace-codes/:id")
  async updateTraceCode(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.traceCodes.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.code !== undefined) {
        const nextCode = String(body.code).trim();
        if (db.traceCodes.some((entry) => entry.code === nextCode && entry.id !== item.id)) {
          return null;
        }

        item.code = nextCode;
      }

      if (body?.productId !== undefined) {
        const productId = String(body.productId);
        if (!db.products.some((entry) => entry.id === productId)) {
          return null;
        }

        item.productId = productId;
      }

      if (body?.verifyStatus !== undefined && isVerifyStatus(body.verifyStatus)) {
        item.verifyStatus = body.verifyStatus;
      }

      if (body?.expiresAt !== undefined) {
        item.expiresAt = String(body.expiresAt);
      }

      return item;
    });

    if (!data) {
      throw new HttpException(
        { message: "Trace code not found or payload invalid" },
        HttpStatus.BAD_REQUEST
      );
    }

    return { data };
  }

  @Delete("trace-codes/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTraceCode(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.traceCodes.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.traceCodes.splice(index, 1);
      db.traceEvents = db.traceEvents.filter((entry) => entry.traceCodeId !== id);
      db.traceVerifyLogs = db.traceVerifyLogs.filter((entry) => entry.traceCodeId !== id);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Trace code not found" }, HttpStatus.NOT_FOUND);
    }
  }

  @Get("trace-events")
  async listTraceEvents(@Query("traceCodeId") queryTraceCodeId?: string) {
    const traceCodeId = String(queryTraceCodeId ?? "").trim();
    const db = await this.databaseService.readDb();

    return {
      data: traceCodeId ? db.traceEvents.filter((item) => item.traceCodeId === traceCodeId) : db.traceEvents,
    };
  }

  @Post("trace-events")
  async createTraceEvent(@Body() body: Record<string, unknown>) {
    const traceCodeId = String(body?.traceCodeId ?? "").trim();
    const title = String(body?.title ?? "").trim();

    if (!traceCodeId || !title) {
      throw new HttpException(
        { message: "traceCodeId and title are required" },
        HttpStatus.BAD_REQUEST
      );
    }

    const data = await this.databaseService.mutateDb((db) => {
      if (!db.traceCodes.some((entry) => entry.id === traceCodeId)) {
        return null;
      }

      const item: TraceEvent = {
        id: this.databaseService.newId(),
        traceCodeId,
        eventTime: body?.eventTime ? String(body.eventTime) : this.databaseService.nowIso(),
        eventType: isTraceEventType(body?.eventType) ? body.eventType : "OTHER",
        title,
        content: body?.content ? String(body.content) : undefined,
        sortOrder: toNumber(body?.sortOrder, 0),
        createdAt: this.databaseService.nowIso(),
      };

      db.traceEvents.unshift(item);
      return item;
    });

    if (!data) {
      throw new HttpException({ message: "traceCodeId does not exist" }, HttpStatus.BAD_REQUEST);
    }

    return { data };
  }

  @Put("trace-events/:id")
  async updateTraceEvent(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const data = await this.databaseService.mutateDb((db) => {
      const item = db.traceEvents.find((entry) => entry.id === id);
      if (!item) {
        return null;
      }

      if (body?.title !== undefined) {
        item.title = String(body.title);
      }

      if (body?.content !== undefined) {
        item.content = String(body.content);
      }

      if (body?.eventType !== undefined && isTraceEventType(body.eventType)) {
        item.eventType = body.eventType;
      }

      if (body?.eventTime !== undefined) {
        item.eventTime = String(body.eventTime);
      }

      if (body?.sortOrder !== undefined) {
        item.sortOrder = toNumber(body.sortOrder, item.sortOrder);
      }

      return item;
    });

    if (!data) {
      throw new HttpException({ message: "Trace event not found" }, HttpStatus.NOT_FOUND);
    }

    return { data };
  }

  @Delete("trace-events/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTraceEvent(@Param("id") id: string) {
    const ok = await this.databaseService.mutateDb((db) => {
      const index = db.traceEvents.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return false;
      }

      db.traceEvents.splice(index, 1);
      return true;
    });

    if (!ok) {
      throw new HttpException({ message: "Trace event not found" }, HttpStatus.NOT_FOUND);
    }
  }
}

