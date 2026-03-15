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

export type InspectionResult = "PASS" | "FAIL" | "PENDING";
export type InspectionStatus = "DRAFT" | "REVIEWED" | "PUBLISHED" | "REVOKED";
export type InspectionImageScene = "HERO" | "DETAIL" | "CERT" | "OTHER";
export type InspectionEventType =
  | "SUBMIT"
  | "SAMPLE_RECEIVED"
  | "INSPECTION"
  | "CERTIFIED"
  | "PUBLISHED"
  | "OTHER";

export interface Inspection {
  id: string;
  sn: string;
  productId: string;
  companyId: string;
  inspectionTime: string;
  result: InspectionResult;
  status: InspectionStatus;
  conclusion?: string;
  productNameSnapshot?: string;
  companyNameSnapshot?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionImage {
  id: string;
  inspectionId: string;
  assetId: string;
  scene: InspectionImageScene;
  sortOrder: number;
  createdAt: string;
}

export interface InspectionEvent {
  id: string;
  inspectionId: string;
  eventTime: string;
  eventType: InspectionEventType;
  title: string;
  content?: string;
  sortOrder: number;
  createdAt: string;
}

export interface PublicInspectionAggregateImage extends MediaAsset {
  scene: InspectionImageScene;
  sortOrder: number;
}

export interface PublicInspectionAggregate {
  inspectionAgencyName: string;
  inspection: Inspection;
  product: Product;
  company: Company;
  images: PublicInspectionAggregateImage[];
  events: InspectionEvent[];
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

export interface TracePage {
  id: string;
  sn: string;
  indexBannerAssetIdsCsv: string;
  consignorName?: string;
  inspectionDate?: string;
  traceContent?: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
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

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "SUPER_ADMIN" | "EDITOR" | "VIEWER";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

export interface TraceVerifyLog {
  id: string;
  traceCodeId: string;
  verifyAt: string;
  isValid: boolean;
  clientIp?: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Database {
  adminUsers: AdminUser[];
  mediaAssets: MediaAsset[];
  companies: Company[];
  products: Product[];
  productImages: ProductImage[];
  inspectionReports: InspectionReport[];
  inspections: Inspection[];
  inspectionImages: InspectionImage[];
  inspectionEvents: InspectionEvent[];
  traceCodes: TraceCode[];
  tracePages: TracePage[];
  traceEvents: TraceEvent[];
  traceVerifyLogs: TraceVerifyLog[];
  auditLogs: AuditLog[];
}
