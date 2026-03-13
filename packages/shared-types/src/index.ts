export type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type VerifyStatus = "VALID" | "INVALID" | "EXPIRED" | "REVOKED";

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  shortName?: string;
  phone?: string;
  address?: string;
  descriptionHtml?: string;
  logoAssetId?: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  brand?: string;
  model?: string;
  summary?: string;
  productInfoHtml?: string;
  companyId: string;
  status: PublishStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductImageScene = "HERO" | "CAROUSEL" | "COMPANY_DETAIL" | "DETAIL";

export interface ProductImage {
  id: string;
  productId: string;
  assetId: string;
  scene: ProductImageScene;
  sortOrder: number;
  createdAt: string;
}

export interface InspectionReport {
  id: string;
  productId: string;
  consignorName?: string;
  inspectionDate?: string;
  conclusion?: string;
  notes: string[];
  rawHtml?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TraceCode {
  id: string;
  code: string;
  productId: string;
  verifyStatus: VerifyStatus;
  verifyCount: number;
  firstVerifiedAt?: string;
  lastVerifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export type TraceEventType = "SUBMIT" | "INSPECTION" | "CERTIFIED" | "UPDATED" | "OTHER";

export interface TraceEvent {
  id: string;
  traceCodeId: string;
  eventTime: string;
  eventType: TraceEventType;
  title: string;
  content?: string;
  sortOrder: number;
  createdAt: string;
}

export interface TracePageAggregate {
  traceCode: TraceCode;
  product: Product;
  company: Company;
  inspectionReport?: InspectionReport;
  heroImage?: MediaAsset;
  companyLogo?: MediaAsset;
  carouselImages: MediaAsset[];
  companyDetailImages: MediaAsset[];
  detailImages: MediaAsset[];
  traceEvents: TraceEvent[];
}

export interface AdminLoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: "SUPER_ADMIN" | "EDITOR" | "VIEWER";
  };
}
