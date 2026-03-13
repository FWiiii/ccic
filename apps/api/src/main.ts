import cors from "cors";
import express, { type RequestHandler } from "express";
import path from "node:path";
import type {
  AdminLoginResponse,
  Company,
  MediaAsset,
  Product,
  ProductImage,
  PublishStatus,
  TraceCode,
  TraceEvent,
  TracePageAggregate,
  VerifyStatus,
} from "@ccic/shared-types";
import { mutateDb, newId, nowIso, readDb } from "./store.js";

declare global {
  namespace Express {
    interface Request {
      adminUserId?: string;
    }
  }
}

const app = express();
const port = Number(process.env.PORT ?? 4000);
const tokens = new Map<string, string>();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/static", express.static(path.resolve(process.cwd(), "public")));

const isPublishStatus = (v: unknown): v is PublishStatus => ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(v));
const isVerifyStatus = (v: unknown): v is VerifyStatus => ["VALID", "INVALID", "EXPIRED", "REVOKED"].includes(String(v));
const isTraceEventType = (v: unknown): v is TraceEvent["eventType"] => ["SUBMIT", "INSPECTION", "CERTIFIED", "UPDATED", "OTHER"].includes(String(v));
const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const userId = tokens.get(token);

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const db = await readDb();
  const user = db.adminUsers.find((x) => x.id === userId && x.status === "ACTIVE");
  if (!user) {
    res.status(401).json({ message: "Invalid user" });
    return;
  }

  req.adminUserId = user.id;
  next();
};

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ccic-api", time: nowIso() });
});

app.post("/api/admin/auth/login", async (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "").trim();

  if (!username || !password) {
    res.status(400).json({ message: "username and password are required" });
    return;
  }

  const db = await readDb();
  const user = db.adminUsers.find((x) => x.username === username && x.password === password && x.status === "ACTIVE");

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = `ccic_${newId()}`;
  tokens.set(token, user.id);

  const data: AdminLoginResponse = {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  };

  res.json({ data });
});

app.get("/api/public/traces/:code", async (req, res) => {
  const code = String(req.params.code ?? "").trim();
  if (!code) {
    res.status(400).json({ message: "trace code is required" });
    return;
  }

  const result = await mutateDb((db) => {
    const traceCode = db.traceCodes.find((x) => x.code === code);
    if (!traceCode) return { error: "NOT_FOUND" as const };

    const product = db.products.find((x) => x.id === traceCode.productId && x.status === "PUBLISHED");
    if (!product) return { error: "NOT_PUBLISHED" as const };

    const company = db.companies.find((x) => x.id === product.companyId && x.status === "PUBLISHED");
    if (!company) return { error: "NOT_PUBLISHED" as const };

    const now = nowIso();
    traceCode.verifyCount += 1;
    traceCode.lastVerifiedAt = now;
    if (!traceCode.firstVerifiedAt) traceCode.firstVerifiedAt = now;

    db.traceVerifyLogs.unshift({
      id: newId(),
      traceCodeId: traceCode.id,
      verifyAt: now,
      isValid: traceCode.verifyStatus === "VALID",
    });

    const bindings = db.productImages
      .filter((x) => x.productId === product.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const pick = (scene: ProductImage["scene"]) =>
      bindings
        .filter((x) => x.scene === scene)
        .map((x) => db.mediaAssets.find((m) => m.id === x.assetId))
        .filter((x): x is MediaAsset => Boolean(x));

    const data: TracePageAggregate = {
      traceCode,
      product,
      company,
      inspectionReport: db.inspectionReports.find((x) => x.productId === product.id),
      heroImage: pick("HERO")[0],
      companyLogo: company.logoAssetId ? db.mediaAssets.find((m) => m.id === company.logoAssetId) : undefined,
      carouselImages: pick("CAROUSEL"),
      companyDetailImages: pick("COMPANY_DETAIL"),
      detailImages: pick("DETAIL"),
      traceEvents: db.traceEvents
        .filter((x) => x.traceCodeId === traceCode.id)
        .sort((a, b) => (a.eventTime === b.eventTime ? a.sortOrder - b.sortOrder : a.eventTime > b.eventTime ? -1 : 1)),
    };

    return { data };
  });

  if ("error" in result) {
    res.status(404).json({ message: result.error === "NOT_FOUND" ? "Trace code not found" : "Trace code is not published" });
    return;
  }

  res.json(result);
});

app.use("/api/admin", requireAuth);

app.get("/api/admin/bootstrap", async (_req, res) => {
  const db = await readDb();
  res.json({
    data: {
      mediaAssets: db.mediaAssets,
      companies: db.companies,
      products: db.products,
      productImages: db.productImages,
      inspectionReports: db.inspectionReports,
      traceCodes: db.traceCodes,
      traceEvents: db.traceEvents,
    },
  });
});
app.post("/api/admin/media/upload-sign", (_req, res) => {
  const objectKey = `uploads/${Date.now()}-${newId()}.jpg`;
  res.json({
    data: {
      objectKey,
      uploadUrl: `/mock-upload/${objectKey}`,
      method: "PUT",
      headers: {},
      note: "Scaffold endpoint. Replace with object storage signed URL.",
    },
  });
});

app.get("/api/admin/media", async (_req, res) => {
  const db = await readDb();
  res.json({ data: db.mediaAssets });
});

app.post("/api/admin/media", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const url = String(req.body?.url ?? "").trim();
  if (!name || !url) {
    res.status(400).json({ message: "name and url are required" });
    return;
  }

  const data = await mutateDb((db) => {
    const item: MediaAsset = {
      id: newId(),
      name,
      url,
      mimeType: String(req.body?.mimeType ?? "image/jpeg"),
      sizeBytes: toNumber(req.body?.sizeBytes, 0),
      width: req.body?.width === undefined ? undefined : toNumber(req.body.width, 0),
      height: req.body?.height === undefined ? undefined : toNumber(req.body.height, 0),
      createdAt: nowIso(),
    };
    db.mediaAssets.unshift(item);
    return item;
  });

  res.status(201).json({ data });
});

app.put("/api/admin/media/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.mediaAssets.find((x) => x.id === req.params.id);
    if (!item) return null;
    if (req.body?.name !== undefined) item.name = String(req.body.name);
    if (req.body?.url !== undefined) item.url = String(req.body.url);
    if (req.body?.mimeType !== undefined) item.mimeType = String(req.body.mimeType);
    if (req.body?.sizeBytes !== undefined) item.sizeBytes = toNumber(req.body.sizeBytes, item.sizeBytes);
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Media not found" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/media/:id", async (req, res) => {
  const result = await mutateDb((db) => {
    const id = req.params.id;
    if (db.productImages.some((x) => x.assetId === id) || db.companies.some((x) => x.logoAssetId === id)) {
      return "IN_USE" as const;
    }

    const index = db.mediaAssets.findIndex((x) => x.id === id);
    if (index < 0) return "NOT_FOUND" as const;
    db.mediaAssets.splice(index, 1);
    return "OK" as const;
  });

  if (result === "IN_USE") {
    res.status(409).json({ message: "Media is in use" });
    return;
  }

  if (result === "NOT_FOUND") {
    res.status(404).json({ message: "Media not found" });
    return;
  }

  res.status(204).send();
});

app.get("/api/admin/companies", async (_req, res) => {
  const db = await readDb();
  res.json({ data: db.companies });
});

app.post("/api/admin/companies", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ message: "name is required" });
    return;
  }

  const now = nowIso();
  const data = await mutateDb((db) => {
    const item: Company = {
      id: newId(),
      name,
      shortName: req.body?.shortName ? String(req.body.shortName) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
      address: req.body?.address ? String(req.body.address) : undefined,
      descriptionHtml: req.body?.descriptionHtml ? String(req.body.descriptionHtml) : undefined,
      logoAssetId: req.body?.logoAssetId ? String(req.body.logoAssetId) : undefined,
      status: isPublishStatus(req.body?.status) ? req.body.status : "DRAFT",
      createdAt: now,
      updatedAt: now,
    };
    db.companies.unshift(item);
    return item;
  });

  res.status(201).json({ data });
});

app.put("/api/admin/companies/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.companies.find((x) => x.id === req.params.id);
    if (!item) return null;
    if (req.body?.name !== undefined) item.name = String(req.body.name);
    if (req.body?.shortName !== undefined) item.shortName = String(req.body.shortName);
    if (req.body?.phone !== undefined) item.phone = String(req.body.phone);
    if (req.body?.address !== undefined) item.address = String(req.body.address);
    if (req.body?.descriptionHtml !== undefined) item.descriptionHtml = String(req.body.descriptionHtml);
    if (req.body?.logoAssetId !== undefined) item.logoAssetId = String(req.body.logoAssetId);
    if (req.body?.status !== undefined && isPublishStatus(req.body.status)) item.status = req.body.status;
    item.updatedAt = nowIso();
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Company not found" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/companies/:id", async (req, res) => {
  const result = await mutateDb((db) => {
    const id = req.params.id;
    if (db.products.some((x) => x.companyId === id)) return "IN_USE" as const;
    const index = db.companies.findIndex((x) => x.id === id);
    if (index < 0) return "NOT_FOUND" as const;
    db.companies.splice(index, 1);
    return "OK" as const;
  });

  if (result === "IN_USE") {
    res.status(409).json({ message: "Company is used by products" });
    return;
  }

  if (result === "NOT_FOUND") {
    res.status(404).json({ message: "Company not found" });
    return;
  }

  res.status(204).send();
});

app.post("/api/admin/companies/:id/publish", async (req, res) => {
  const status = req.body?.status;
  if (!isPublishStatus(status)) {
    res.status(400).json({ message: "status must be DRAFT/PUBLISHED/ARCHIVED" });
    return;
  }

  const data = await mutateDb((db) => {
    const item = db.companies.find((x) => x.id === req.params.id);
    if (!item) return null;
    item.status = status;
    item.updatedAt = nowIso();
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Company not found" });
    return;
  }

  res.json({ data });
});
app.get("/api/admin/products", async (_req, res) => {
  const db = await readDb();
  res.json({ data: db.products });
});

app.post("/api/admin/products", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const companyId = String(req.body?.companyId ?? "").trim();
  if (!name || !companyId) {
    res.status(400).json({ message: "name and companyId are required" });
    return;
  }

  const now = nowIso();
  const data = await mutateDb((db) => {
    if (!db.companies.some((x) => x.id === companyId)) return null;

    const item: Product = {
      id: newId(),
      sku: req.body?.sku ? String(req.body.sku) : undefined,
      name,
      brand: req.body?.brand ? String(req.body.brand) : undefined,
      model: req.body?.model ? String(req.body.model) : undefined,
      summary: req.body?.summary ? String(req.body.summary) : undefined,
      productInfoHtml: req.body?.productInfoHtml ? String(req.body.productInfoHtml) : undefined,
      companyId,
      status: isPublishStatus(req.body?.status) ? req.body.status : "DRAFT",
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.products.unshift(item);
    return item;
  });

  if (!data) {
    res.status(400).json({ message: "companyId does not exist" });
    return;
  }

  res.status(201).json({ data });
});

app.put("/api/admin/products/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.products.find((x) => x.id === req.params.id);
    if (!item) return null;

    if (req.body?.name !== undefined) item.name = String(req.body.name);
    if (req.body?.sku !== undefined) item.sku = String(req.body.sku);
    if (req.body?.brand !== undefined) item.brand = String(req.body.brand);
    if (req.body?.model !== undefined) item.model = String(req.body.model);
    if (req.body?.summary !== undefined) item.summary = String(req.body.summary);
    if (req.body?.productInfoHtml !== undefined) item.productInfoHtml = String(req.body.productInfoHtml);
    if (req.body?.status !== undefined && isPublishStatus(req.body.status)) item.status = req.body.status;
    if (req.body?.companyId !== undefined) {
      const companyId = String(req.body.companyId);
      if (!db.companies.some((company) => company.id === companyId)) return null;
      item.companyId = companyId;
    }

    item.updatedAt = nowIso();
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Product not found or payload invalid" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/products/:id", async (req, res) => {
  const ok = await mutateDb((db) => {
    const id = req.params.id;
    const index = db.products.findIndex((x) => x.id === id);
    if (index < 0) return false;
    db.products.splice(index, 1);
    db.productImages = db.productImages.filter((x) => x.productId !== id);
    db.inspectionReports = db.inspectionReports.filter((x) => x.productId !== id);
    const traceIds = new Set(db.traceCodes.filter((x) => x.productId === id).map((x) => x.id));
    db.traceCodes = db.traceCodes.filter((x) => x.productId !== id);
    db.traceEvents = db.traceEvents.filter((x) => !traceIds.has(x.traceCodeId));
    db.traceVerifyLogs = db.traceVerifyLogs.filter((x) => !traceIds.has(x.traceCodeId));
    return true;
  });

  if (!ok) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  res.status(204).send();
});

app.post("/api/admin/products/:id/publish", async (req, res) => {
  const status = req.body?.status;
  if (!isPublishStatus(status)) {
    res.status(400).json({ message: "status must be DRAFT/PUBLISHED/ARCHIVED" });
    return;
  }

  const data = await mutateDb((db) => {
    const item = db.products.find((x) => x.id === req.params.id);
    if (!item) return null;
    item.status = status;
    item.updatedAt = nowIso();
    item.publishedAt = status === "PUBLISHED" ? nowIso() : undefined;
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  res.json({ data });
});

app.get("/api/admin/product-images", async (req, res) => {
  const productId = String(req.query.productId ?? "").trim();
  const db = await readDb();
  const data = productId ? db.productImages.filter((x) => x.productId === productId) : db.productImages;
  res.json({ data });
});

app.post("/api/admin/product-images", async (req, res) => {
  const productId = String(req.body?.productId ?? "").trim();
  const assetId = String(req.body?.assetId ?? "").trim();
  const scene = String(req.body?.scene ?? "").trim();
  if (!productId || !assetId || !scene) {
    res.status(400).json({ message: "productId, assetId and scene are required" });
    return;
  }

  const allowedScene = ["HERO", "CAROUSEL", "COMPANY_DETAIL", "DETAIL"];
  if (!allowedScene.includes(scene)) {
    res.status(400).json({ message: "scene is invalid" });
    return;
  }

  const data = await mutateDb((db) => {
    if (!db.products.some((x) => x.id === productId) || !db.mediaAssets.some((x) => x.id === assetId)) {
      return null;
    }

    const item: ProductImage = {
      id: newId(),
      productId,
      assetId,
      scene: scene as ProductImage["scene"],
      sortOrder: toNumber(req.body?.sortOrder, 0),
      createdAt: nowIso(),
    };
    db.productImages.push(item);
    return item;
  });

  if (!data) {
    res.status(400).json({ message: "productId or assetId does not exist" });
    return;
  }

  res.status(201).json({ data });
});

app.put("/api/admin/product-images/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.productImages.find((x) => x.id === req.params.id);
    if (!item) return null;

    if (req.body?.assetId !== undefined) {
      const assetId = String(req.body.assetId);
      if (!db.mediaAssets.some((x) => x.id === assetId)) return null;
      item.assetId = assetId;
    }

    if (req.body?.scene !== undefined) {
      const scene = String(req.body.scene);
      if (!["HERO", "CAROUSEL", "COMPANY_DETAIL", "DETAIL"].includes(scene)) return null;
      item.scene = scene as ProductImage["scene"];
    }

    if (req.body?.sortOrder !== undefined) item.sortOrder = toNumber(req.body.sortOrder, item.sortOrder);
    return item;
  });

  if (!data) {
    res.status(400).json({ message: "Product image not found or payload invalid" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/product-images/:id", async (req, res) => {
  const ok = await mutateDb((db) => {
    const index = db.productImages.findIndex((x) => x.id === req.params.id);
    if (index < 0) return false;
    db.productImages.splice(index, 1);
    return true;
  });

  if (!ok) {
    res.status(404).json({ message: "Product image not found" });
    return;
  }

  res.status(204).send();
});
app.get("/api/admin/trace-codes", async (_req, res) => {
  const db = await readDb();
  res.json({ data: db.traceCodes });
});

app.post("/api/admin/trace-codes", async (req, res) => {
  const code = String(req.body?.code ?? "").trim();
  const productId = String(req.body?.productId ?? "").trim();
  if (!code || !productId) {
    res.status(400).json({ message: "code and productId are required" });
    return;
  }

  const result = await mutateDb((db) => {
    if (db.traceCodes.some((x) => x.code === code)) return { error: "CODE_EXISTS" as const };
    if (!db.products.some((x) => x.id === productId)) return { error: "PRODUCT_NOT_FOUND" as const };

    const item: TraceCode = {
      id: newId(),
      code,
      productId,
      verifyStatus: isVerifyStatus(req.body?.verifyStatus) ? req.body.verifyStatus : "VALID",
      verifyCount: 0,
      firstVerifiedAt: undefined,
      lastVerifiedAt: undefined,
      expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : undefined,
      createdAt: nowIso(),
    };

    db.traceCodes.unshift(item);
    return { data: item };
  });

  if ("error" in result) {
    res.status(result.error === "CODE_EXISTS" ? 409 : 400).json({ message: result.error });
    return;
  }

  res.status(201).json(result);
});

app.put("/api/admin/trace-codes/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.traceCodes.find((x) => x.id === req.params.id);
    if (!item) return null;

    if (req.body?.code !== undefined) {
      const code = String(req.body.code).trim();
      if (db.traceCodes.some((x) => x.code === code && x.id !== item.id)) return null;
      item.code = code;
    }

    if (req.body?.productId !== undefined) {
      const productId = String(req.body.productId);
      if (!db.products.some((x) => x.id === productId)) return null;
      item.productId = productId;
    }

    if (req.body?.verifyStatus !== undefined && isVerifyStatus(req.body.verifyStatus)) item.verifyStatus = req.body.verifyStatus;
    if (req.body?.expiresAt !== undefined) item.expiresAt = String(req.body.expiresAt);
    return item;
  });

  if (!data) {
    res.status(400).json({ message: "Trace code not found or payload invalid" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/trace-codes/:id", async (req, res) => {
  const ok = await mutateDb((db) => {
    const id = req.params.id;
    const index = db.traceCodes.findIndex((x) => x.id === id);
    if (index < 0) return false;
    db.traceCodes.splice(index, 1);
    db.traceEvents = db.traceEvents.filter((x) => x.traceCodeId !== id);
    db.traceVerifyLogs = db.traceVerifyLogs.filter((x) => x.traceCodeId !== id);
    return true;
  });

  if (!ok) {
    res.status(404).json({ message: "Trace code not found" });
    return;
  }

  res.status(204).send();
});

app.get("/api/admin/trace-events", async (req, res) => {
  const traceCodeId = String(req.query.traceCodeId ?? "").trim();
  const db = await readDb();
  const data = traceCodeId ? db.traceEvents.filter((x) => x.traceCodeId === traceCodeId) : db.traceEvents;
  res.json({ data });
});

app.post("/api/admin/trace-events", async (req, res) => {
  const traceCodeId = String(req.body?.traceCodeId ?? "").trim();
  const title = String(req.body?.title ?? "").trim();

  if (!traceCodeId || !title) {
    res.status(400).json({ message: "traceCodeId and title are required" });
    return;
  }

  const data = await mutateDb((db) => {
    if (!db.traceCodes.some((x) => x.id === traceCodeId)) return null;

    const item: TraceEvent = {
      id: newId(),
      traceCodeId,
      eventTime: req.body?.eventTime ? String(req.body.eventTime) : nowIso(),
      eventType: isTraceEventType(req.body?.eventType) ? req.body.eventType : "OTHER",
      title,
      content: req.body?.content ? String(req.body.content) : undefined,
      sortOrder: toNumber(req.body?.sortOrder, 0),
      createdAt: nowIso(),
    };

    db.traceEvents.unshift(item);
    return item;
  });

  if (!data) {
    res.status(400).json({ message: "traceCodeId does not exist" });
    return;
  }

  res.status(201).json({ data });
});

app.put("/api/admin/trace-events/:id", async (req, res) => {
  const data = await mutateDb((db) => {
    const item = db.traceEvents.find((x) => x.id === req.params.id);
    if (!item) return null;
    if (req.body?.title !== undefined) item.title = String(req.body.title);
    if (req.body?.content !== undefined) item.content = String(req.body.content);
    if (req.body?.eventType !== undefined && isTraceEventType(req.body.eventType)) item.eventType = req.body.eventType;
    if (req.body?.eventTime !== undefined) item.eventTime = String(req.body.eventTime);
    if (req.body?.sortOrder !== undefined) item.sortOrder = toNumber(req.body.sortOrder, item.sortOrder);
    return item;
  });

  if (!data) {
    res.status(404).json({ message: "Trace event not found" });
    return;
  }

  res.json({ data });
});

app.delete("/api/admin/trace-events/:id", async (req, res) => {
  const ok = await mutateDb((db) => {
    const index = db.traceEvents.findIndex((x) => x.id === req.params.id);
    if (index < 0) return false;
    db.traceEvents.splice(index, 1);
    return true;
  });

  if (!ok) {
    res.status(404).json({ message: "Trace event not found" });
    return;
  }

  res.status(204).send();
});

app.listen(port, () => {
  console.log(`ccic-api is running on http://localhost:${port}`);
});
