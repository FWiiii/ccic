import type { TracePageAggregate } from "@ccic/shared-types";
import heroImageSrc from "../assets/template/mu/static/images/top13860.jpg";
import carouselImageSrc from "../assets/static/upload/image/20260130/1769762711981592.jpg";
import companyLogoSrc from "../assets/template/mu/static/picture/910612857824215040.jpg";
import companyDetailA from "../assets/template/mu/static/picture/1666591927040077430.png";
import companyDetailB from "../assets/template/mu/static/picture/1666591971967015074.jpg";
import companyDetailC from "../assets/template/mu/static/picture/1590048828117098165.jpg";

const NOW = "2026-03-13T00:00:00.000Z";

export const LOCAL_TRACE_AGGREGATE: TracePageAggregate = {
  traceCode: {
    id: "trace-local-1",
    code: "CCIC-DEMO-0001",
    productId: "product-local-1",
    verifyStatus: "VALID",
    verifyCount: 0,
    createdAt: NOW,
    firstVerifiedAt: undefined,
    lastVerifiedAt: undefined,
  },
  product: {
    id: "product-local-1",
    sku: "SKU-DEMO-001",
    name: "LOUIS VUITTON/路易威登",
    brand: "LOUIS VUITTON",
    model: "DEMO-2026",
    summary: "DEMO",
    productInfoHtml:
      "<p><strong>委托单位：港城国际<br/>核验日期：2026-1-30</strong></p><p><strong>检验结论：送检样品符合品牌方商品外观工艺特征。</strong></p>",
    companyId: "company-local-1",
    status: "PUBLISHED",
    publishedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  company: {
    id: "company-local-1",
    name: "中国检验认证集团奢侈品鉴定中心",
    shortName: "中检奢侈品鉴定",
    phone: "010-58619556",
    address: "",
    descriptionHtml:
      "<p>中检集团奢侈品鉴定中心是中检集团设立的专门从事奢侈品鉴定与培训业务的“中国”字头第三方奢侈品鉴定平台，落地在中检北京公司。中检集团奢侈品鉴定中心致力以独立于买卖各方的身份，为社会各界提供公正、诚信的奢侈品鉴定及培训服务。</p><p>中检集团奢侈品鉴定中心与中检集团溯源技术服务有限公司共同打造了中检奢侈品鉴定溯源防伪系统，向外界正式推出奢侈品鉴定溯源防伪服务。该系统应用“一品（物）一码”溯源专利防伪技术，通过扫一扫，就能随时了解奢侈品鉴定信息，真正做到鉴定溯源防伪一体化，为奢侈品市场保驾护航。经过鉴定溯源的奢侈品都会有中检中奢中心“鉴定溯源ID身份证”，“验明正身”的同时，提升消费体验，让消费者购物更放心。</p>",
    logoAssetId: "media-local-logo",
    status: "PUBLISHED",
    createdAt: NOW,
    updatedAt: NOW,
  },
  inspectionReport: {
    id: "report-local-1",
    productId: "product-local-1",
    consignorName: "港城国际",
    inspectionDate: "2026-1-30",
    conclusion: "送检样品符合品牌方商品外观工艺特征。",
    notes: [
      "备注：1、检验结果仅对送检样品负责，若标签损毁、标签涂改，显示内容无效；",
      "2、若对显示的内容和结论持有异议，需在检验日期后15日内提出，逾期不予受理；",
      "3、品牌方为商品的设计及制造方，如品牌方确认该鉴定样品为品牌方制造及销售商品，以品牌方的结论为准；",
      "4、客户信息及样品均由委托单位提供，检验结果不涉及样品品质检测等信息。",
    ],
    rawHtml: undefined,
    createdAt: NOW,
    updatedAt: NOW,
  },
  heroImage: {
    id: "media-local-hero",
    name: "hero",
    url: heroImageSrc,
    mimeType: "image/jpeg",
    sizeBytes: 0,
    createdAt: NOW,
  },
  companyLogo: {
    id: "media-local-logo",
    name: "logo",
    url: companyLogoSrc,
    mimeType: "image/jpeg",
    sizeBytes: 0,
    createdAt: NOW,
  },
  carouselImages: [
    {
      id: "media-local-carousel-1",
      name: "carousel",
      url: carouselImageSrc,
      mimeType: "image/jpeg",
      sizeBytes: 0,
      createdAt: NOW,
    },
  ],
  companyDetailImages: [
    {
      id: "media-local-company-detail-1",
      name: "company-detail-1",
      url: companyDetailA,
      mimeType: "image/png",
      sizeBytes: 0,
      createdAt: NOW,
    },
    {
      id: "media-local-company-detail-2",
      name: "company-detail-2",
      url: companyDetailB,
      mimeType: "image/jpeg",
      sizeBytes: 0,
      createdAt: NOW,
    },
    {
      id: "media-local-company-detail-3",
      name: "company-detail-3",
      url: companyDetailC,
      mimeType: "image/jpeg",
      sizeBytes: 0,
      createdAt: NOW,
    },
  ],
  detailImages: [],
  traceEvents: [
    {
      id: "event-local-1",
      traceCodeId: "trace-local-1",
      eventTime: "2026-01-30T08:00:00.000Z",
      eventType: "INSPECTION",
      title: "2026-1-30记录",
      content: "委托单位简介: 港城国际",
      sortOrder: 1,
      createdAt: NOW,
    },
    {
      id: "event-local-2",
      traceCodeId: "trace-local-1",
      eventTime: "2026-01-30T10:30:00.000Z",
      eventType: "CERTIFIED",
      title: "检验结论",
      content: "送检样品符合品牌方商品外观工艺特征。",
      sortOrder: 2,
      createdAt: NOW,
    },
  ],
};
