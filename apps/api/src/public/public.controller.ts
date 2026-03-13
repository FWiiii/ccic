import { Controller, Get, HttpException, HttpStatus, Param } from "@nestjs/common";
import type { MediaAsset, ProductImage, TracePageAggregate } from "../database/database.types";
import { DatabaseService } from "../database/database.service";

@Controller("api/public")
export class PublicController {
  constructor(private readonly databaseService: DatabaseService) {}

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
}
