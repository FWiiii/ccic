import { Controller, Get, HttpException, HttpStatus, Param, Query } from "@nestjs/common";
import type { MediaAsset, ProductImage, PublicInspectionAggregate, PublicInspectionTraceStatus, TracePageAggregate } from "../database/database.types";
import { DatabaseService } from "../database/database.service";

const parseAssetIdsCsv = (value: unknown) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const INSPECTION_AGENCY_NAME = "\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u5962\u4f88\u54c1\u9274\u5b9a\u4e2d\u5fc3";

const TRACE_STEPS: PublicInspectionAggregate["display"]["traceInfo"]["steps"] = [
  { status: "SUBMITTED", label: "\u5df2\u9001\u68c0", reached: false },
  { status: "INSPECTING", label: "\u68c0\u6d4b\u4e2d", reached: false },
  { status: "COMPLETED", label: "\u5df2\u68c0\u6d4b", reached: false },
];

const TRACE_STATUS_RANK: Record<PublicInspectionTraceStatus, number> = {
  SUBMITTED: 1,
  INSPECTING: 2,
  COMPLETED: 3,
};

const formatVerificationDate = (value: string) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const resolveTraceStatus = (
  inspectionStatus: PublicInspectionAggregate["inspection"]["status"],
  events: PublicInspectionAggregate["events"]
): PublicInspectionTraceStatus => {
  if (events.some((item) => item.eventType === "CERTIFIED" || item.eventType === "PUBLISHED")) {
    return "COMPLETED";
  }

  if (events.some((item) => item.eventType === "INSPECTION" || item.eventType === "SAMPLE_RECEIVED")) {
    return "INSPECTING";
  }

  if (inspectionStatus === "PUBLISHED" || inspectionStatus === "REVOKED") {
    return "COMPLETED";
  }

  if (inspectionStatus === "REVIEWED") {
    return "INSPECTING";
  }

  return "SUBMITTED";
};

const buildTraceSteps = (
  currentStatus: PublicInspectionTraceStatus
): PublicInspectionAggregate["display"]["traceInfo"]["steps"] => {
  const currentRank = TRACE_STATUS_RANK[currentStatus];

  return TRACE_STEPS.map((item) => ({
    ...item,
    reached: TRACE_STATUS_RANK[item.status] <= currentRank,
  }));
};

const isLegacyTraceApiEnabled = () => String(process.env.ENABLE_LEGACY_TRACE_APIS ?? "").toLowerCase() === "true";

@Controller(["api/public", "api/v1/public"])
export class PublicController {
  constructor(private readonly databaseService: DatabaseService) {}

  private assertLegacyTraceApiEnabled() {
    if (isLegacyTraceApiEnabled()) {
      return;
    }

    throw new HttpException(
      {
        message: "Legacy trace API is decommissioned. Set ENABLE_LEGACY_TRACE_APIS=true to temporarily re-enable.",
      },
      HttpStatus.GONE
    );
  }

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

    const productImages: PublicInspectionAggregate["product"]["images"] = db.productImages
      .filter((item) => item.productId === product.id)
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
      .filter((item): item is PublicInspectionAggregate["product"]["images"][number] => Boolean(item));

    const events = db.inspectionEvents
      .filter((item) => item.inspectionId === inspection.id)
      .sort((a, b) =>
        a.eventTime === b.eventTime ? a.sortOrder - b.sortOrder : a.eventTime > b.eventTime ? -1 : 1
      );

    const currentStatus = resolveTraceStatus(inspection.status, events);

    const data: PublicInspectionAggregate = {
      inspectionAgencyName: INSPECTION_AGENCY_NAME,
      inspection,
      product: {
        ...product,
        name: product.name,
        images: productImages,
      },
      company: {
        ...company,
        name: company.name,
      },
      events,
      display: {
        productName: product.name,
        consignorName: company.name,
        verificationDate: formatVerificationDate(inspection.inspectionTime),
        traceInfo: {
          currentStatus,
          steps: buildTraceSteps(currentStatus),
        },
      },
    };

    return { data };
  }

  @Get("traces/:code")
  async getTrace(@Param("code") rawCode: string) {
    this.assertLegacyTraceApiEnabled();

    const code = String(rawCode ?? "").trim();

    if (!code) {
      throw new HttpException({ message: "trace code is required" }, HttpStatus.BAD_REQUEST);
    }

    const db = await this.databaseService.readDb();
    const traceCode = db.traceCodes.find((item) => item.code === code);

    if (!traceCode) {
      throw new HttpException({ message: "Trace code not found" }, HttpStatus.NOT_FOUND);
    }

    const product = db.products.find((item) => item.id === traceCode.productId && item.status === "PUBLISHED");
    if (!product) {
      throw new HttpException({ message: "Trace code is not published" }, HttpStatus.NOT_FOUND);
    }

    const company = db.companies.find((item) => item.id === product.companyId && item.status === "PUBLISHED");
    if (!company) {
      throw new HttpException({ message: "Trace code is not published" }, HttpStatus.NOT_FOUND);
    }

    const now = this.databaseService.nowIso();
    await this.databaseService.recordTraceVerification(traceCode.id, traceCode.verifyStatus === "VALID");

    const bindings = db.productImages
      .filter((item) => item.productId === product.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const pickByScene = (scene: ProductImage["scene"]) =>
      bindings
        .filter((item) => item.scene === scene)
        .map((item) => db.mediaAssets.find((media) => media.id === item.assetId))
        .filter((item): item is MediaAsset => Boolean(item));

    const data: TracePageAggregate = {
      traceCode: {
        ...traceCode,
        verifyCount: traceCode.verifyCount + 1,
        firstVerifiedAt: traceCode.firstVerifiedAt ?? now,
        lastVerifiedAt: now,
      },
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
  }

  @Get("trace-pages/:sn")
  async getTracePageBySn(@Param("sn") rawSn: string) {
    this.assertLegacyTraceApiEnabled();

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

