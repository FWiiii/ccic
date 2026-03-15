import { Controller, Get, HttpException, HttpStatus, Param, Query } from "@nestjs/common";
import type {
  MediaAsset,
  ProductImage,
  PublicInspectionAggregate,
  TracePageAggregate,
} from "../database/database.types";
import { DatabaseService } from "../database/database.service";

const parseAssetIdsCsv = (value: unknown) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const INSPECTION_AGENCY_NAME = "中国检验认证集团奢侈品鉴定中心";

@Controller(["api/public", "api/v1/public"])
export class PublicController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get("inspection")
  async getInspectionBySn(@Query("sn") rawSn: string) {
    const sn = String(rawSn ?? "").trim();

    if (!sn) {
      throw new HttpException({ message: "sn is required" }, HttpStatus.BAD_REQUEST);
    }

    const db = await this.databaseService.readDb();
    const inspection = db.inspections.find((item) => item.sn === sn && item.status === "PUBLISHED");

    if (!inspection) {
      throw new HttpException({ message: "Inspection not found" }, HttpStatus.NOT_FOUND);
    }

    const product = db.products.find((item) => item.id === inspection.productId);
    const company = db.companies.find((item) => item.id === inspection.companyId);

    if (!product || !company) {
      throw new HttpException({ message: "Inspection data is incomplete" }, HttpStatus.CONFLICT);
    }

    const assetById = new Map(db.mediaAssets.map((asset) => [asset.id, asset]));

    const images: PublicInspectionAggregate["images"] = db.inspectionImages
      .filter((item) => item.inspectionId === inspection.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const asset = assetById.get(item.assetId);
        if (!asset) {
          return null;
        }

        return {
          ...asset,
          scene: item.scene,
          sortOrder: item.sortOrder,
        };
      })
      .filter((item): item is PublicInspectionAggregate["images"][number] => Boolean(item));

    const events = db.inspectionEvents
      .filter((item) => item.inspectionId === inspection.id)
      .sort((a, b) =>
        a.eventTime === b.eventTime ? a.sortOrder - b.sortOrder : a.eventTime > b.eventTime ? -1 : 1
      );

    const data: PublicInspectionAggregate = {
      inspectionAgencyName: INSPECTION_AGENCY_NAME,
      inspection,
      product: {
        ...product,
        name: inspection.productNameSnapshot?.trim() || product.name,
      },
      company: {
        ...company,
        name: inspection.companyNameSnapshot?.trim() || company.name,
      },
      images,
      events,
    };

    return { data };
  }

  @Get("traces/:code")
  async getTrace(@Param("code") rawCode: string) {
    const code = String(rawCode ?? "").trim();

    if (!code) {
      throw new HttpException({ message: "trace code is required" }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.databaseService.mutateDb((db) => {
      const traceCode = db.traceCodes.find((item) => item.code === code);
      if (!traceCode) {
        return { error: "NOT_FOUND" as const };
      }

      const product = db.products.find((item) => item.id === traceCode.productId && item.status === "PUBLISHED");
      if (!product) {
        return { error: "NOT_PUBLISHED" as const };
      }

      const company = db.companies.find((item) => item.id === product.companyId && item.status === "PUBLISHED");
      if (!company) {
        return { error: "NOT_PUBLISHED" as const };
      }

      const now = this.databaseService.nowIso();
      traceCode.verifyCount += 1;
      traceCode.lastVerifiedAt = now;
      if (!traceCode.firstVerifiedAt) {
        traceCode.firstVerifiedAt = now;
      }

      db.traceVerifyLogs.unshift({
        id: this.databaseService.newId(),
        traceCodeId: traceCode.id,
        verifyAt: now,
        isValid: traceCode.verifyStatus === "VALID",
      });

      const bindings = db.productImages
        .filter((item) => item.productId === product.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const pickByScene = (scene: ProductImage["scene"]) =>
        bindings
          .filter((item) => item.scene === scene)
          .map((item) => db.mediaAssets.find((media) => media.id === item.assetId))
          .filter((item): item is MediaAsset => Boolean(item));

      const data: TracePageAggregate = {
        traceCode,
        product,
        company,
        inspectionReport: db.inspectionReports.find((item) => item.productId === product.id),
        heroImage: pickByScene("HERO")[0],
        companyLogo: company.logoAssetId
          ? db.mediaAssets.find((item) => item.id === company.logoAssetId)
          : undefined,
        carouselImages: pickByScene("CAROUSEL"),
        companyDetailImages: pickByScene("COMPANY_DETAIL"),
        detailImages: pickByScene("DETAIL"),
        traceEvents: db.traceEvents
          .filter((item) => item.traceCodeId === traceCode.id)
          .sort((a, b) =>
            a.eventTime === b.eventTime ? a.sortOrder - b.sortOrder : a.eventTime > b.eventTime ? -1 : 1
          ),
      };

      return { data };
    });

    if ("error" in result) {
      throw new HttpException(
        {
          message: result.error === "NOT_FOUND" ? "Trace code not found" : "Trace code is not published",
        },
        HttpStatus.NOT_FOUND
      );
    }

    return result;
  }

  @Get("trace-pages/:sn")
  async getTracePageBySn(@Param("sn") rawSn: string) {
    const sn = String(rawSn ?? "").trim();

    if (!sn) {
      throw new HttpException({ message: "sn is required" }, HttpStatus.BAD_REQUEST);
    }

    const db = await this.databaseService.readDb();
    const tracePage = db.tracePages.find((item) => item.sn === sn && item.status === "PUBLISHED");

    if (!tracePage) {
      throw new HttpException({ message: "Trace page not found" }, HttpStatus.NOT_FOUND);
    }

    const indexBannerImages = parseAssetIdsCsv(tracePage.indexBannerAssetIdsCsv)
      .map((assetId) => db.mediaAssets.find((item) => item.id === assetId))
      .filter((item): item is MediaAsset => Boolean(item));

    return {
      data: {
        sn: tracePage.sn,
        indexBannerImages,
        productInfo: {
          consignorName: tracePage.consignorName ?? "",
          inspectionDate: tracePage.inspectionDate ?? "",
        },
        traceInfo: {
          content: tracePage.traceContent ?? "",
        },
      },
    };
  }
}
