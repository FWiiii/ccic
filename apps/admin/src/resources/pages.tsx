import { useMemo } from "react";
import { useList } from "@refinedev/core";
import {
  CrudResourcePage,
  type CrudSubmitContext,
  type FieldOption,
} from "../components/CrudResourcePage";
import { TOKEN_STORAGE_KEY } from "../providers/data-provider";

const INSPECTION_AGENCY_NAME =
  "\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u5962\u4f88\u54c1\u9274\u5b9a\u4e2d\u5fc3";

type ProgressStage = "SUBMITTED" | "INSPECTING" | "COMPLETED";

const PROGRESS_STAGE_OPTIONS: FieldOption[] = [
  { label: "\u5df2\u9001\u68c0", value: "SUBMITTED" },
  { label: "\u68c0\u6d4b\u4e2d", value: "INSPECTING" },
  { label: "\u5df2\u68c0\u6d4b", value: "COMPLETED" },
];

const IMAGE_SLOT_CONFIG = [
  { key: "imageAssetId1", label: "\u9274\u5b9a\u56fe\u72471", scene: "HERO", sortOrder: 0 },
  { key: "imageAssetId2", label: "\u9274\u5b9a\u56fe\u72472", scene: "DETAIL", sortOrder: 1 },
  { key: "imageAssetId3", label: "\u9274\u5b9a\u56fe\u72473", scene: "CERT", sortOrder: 2 },
] as const;

const TRACK_EVENT_CONFIG = [
  { title: "\u5df2\u9001\u68c0", eventType: "SUBMIT" },
  { title: "\u68c0\u6d4b\u4e2d", eventType: "INSPECTION" },
  { title: "\u5df2\u68c0\u6d4b", eventType: "CERTIFIED" },
] as const;

function safeParseJson<T>(text: string): T | null {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  const headers = new Headers(init?.headers || {});

  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  const payload = safeParseJson<{ data?: T; message?: unknown; error?: unknown }>(responseText);

  if (!response.ok) {
    const message =
      (typeof payload?.message === "string" && payload.message) ||
      (typeof payload?.error === "string" && payload.error) ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  if (payload?.data !== undefined) {
    return payload.data;
  }

  return (payload as unknown as T) ?? (undefined as T);
}

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function inferProgressStage(events: Array<Record<string, unknown>>): ProgressStage {
  const combined = events.map((item) => `${String(item.eventType ?? "")} ${String(item.title ?? "")}`);

  if (combined.some((entry) => entry.includes("CERTIFIED") || entry.includes("\u5df2\u68c0\u6d4b"))) {
    return "COMPLETED";
  }

  if (
    combined.some(
      (entry) =>
        entry.includes("INSPECTION") ||
        entry.includes("SAMPLE_RECEIVED") ||
        entry.includes("\u68c0\u6d4b\u4e2d")
    )
  ) {
    return "INSPECTING";
  }

  return "SUBMITTED";
}

function buildEventTimes(inspectionTime: unknown) {
  const raw = String(inspectionTime ?? "").trim();
  const baseDate = new Date(raw);
  const start = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

  return [0, 1, 2].map((offsetMinutes) =>
    new Date(start.getTime() + offsetMinutes * 60_000).toISOString()
  );
}

async function listInspectionImages(inspectionId: string) {
  return asArray(
    await adminRequest<unknown>(`/api/admin/inspection-images?inspectionId=${encodeURIComponent(inspectionId)}`)
  );
}

async function listInspectionEvents(inspectionId: string) {
  return asArray(
    await adminRequest<unknown>(`/api/admin/inspection-events?inspectionId=${encodeURIComponent(inspectionId)}`)
  );
}

async function resolveInspectionId(context: CrudSubmitContext) {
  const fromContext = String(context.recordId ?? "").trim();
  if (fromContext) {
    return fromContext;
  }

  const sn = String(
    context.savedRecord?.sn ?? context.requestPayload.sn ?? context.formValues.sn ?? ""
  ).trim();

  if (!sn) {
    return "";
  }

  const rows = asArray(await adminRequest<unknown>(`/api/admin/inspections?sn=${encodeURIComponent(sn)}`));
  return String(rows[0]?.id ?? "").trim();
}

async function syncInspectionImages(inspectionId: string, formValues: Record<string, unknown>) {
  const existing = await listInspectionImages(inspectionId);

  await Promise.all(
    existing.map(async (item) => {
      const id = String(item.id ?? "").trim();
      if (!id) {
        return;
      }

      await adminRequest(`/api/admin/inspection-images/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    })
  );

  for (const slot of IMAGE_SLOT_CONFIG) {
    const assetId = toOptionalString(formValues[slot.key]);

    if (!assetId) {
      continue;
    }

    await adminRequest("/api/admin/inspection-images", {
      method: "POST",
      body: JSON.stringify({
        inspectionId,
        assetId,
        scene: slot.scene,
        sortOrder: slot.sortOrder,
      }),
    });
  }
}

async function syncInspectionTrack(
  inspectionId: string,
  stage: ProgressStage,
  inspectionTime: unknown
) {
  const existing = await listInspectionEvents(inspectionId);

  await Promise.all(
    existing.map(async (item) => {
      const id = String(item.id ?? "").trim();
      if (!id) {
        return;
      }

      await adminRequest(`/api/admin/inspection-events/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    })
  );

  const eventCount = stage === "SUBMITTED" ? 1 : stage === "INSPECTING" ? 2 : 3;
  const eventTimes = buildEventTimes(inspectionTime);

  for (let index = 0; index < eventCount; index += 1) {
    const config = TRACK_EVENT_CONFIG[index];

    await adminRequest("/api/admin/inspection-events", {
      method: "POST",
      body: JSON.stringify({
        inspectionId,
        eventType: config.eventType,
        title: config.title,
        eventTime: eventTimes[index],
        sortOrder: index,
      }),
    });
  }
}

function useSelectOptions(resource: string, labelField = "name") {
  const { data } = useList<Record<string, unknown>>({
    resource,
    pagination: { mode: "off" },
    queryOptions: {
      staleTime: 60_000,
    },
  });

  return useMemo(() => {
    const rows = data?.data ?? [];

    return rows.map((row) => {
      const id = String(row.id ?? "");
      const label = String(row[labelField] ?? row.name ?? row.code ?? row.sn ?? id);

      return {
        label,
        value: id,
      } satisfies FieldOption;
    });
  }, [data, labelField]);
}

export function InspectionsPage() {
  const productOptions = useSelectOptions("products");
  const companyOptions = useSelectOptions("companies");
  const mediaOptions = useSelectOptions("media");

  const productMap = useMemo(
    () => new Map(productOptions.map((item) => [item.value, item.label])),
    [productOptions]
  );
  const companyMap = useMemo(
    () => new Map(companyOptions.map((item) => [item.value, item.label])),
    [companyOptions]
  );

  return (
    <CrudResourcePage
      title={`\u9274\u5b9a\u5355\u7ba1\u7406\uff08\u9274\u5b9a\u673a\u6784\u56fa\u5b9a\uff1a${INSPECTION_AGENCY_NAME}\uff09`}
      resource="inspections"
      createInitialValues={{ progressStage: "SUBMITTED" }}
      loadEditFormValues={async (record) => {
        const inspectionId = String(record.id ?? "").trim();
        if (!inspectionId) {
          return { progressStage: "SUBMITTED" as ProgressStage };
        }

        const [images, events] = await Promise.all([
          listInspectionImages(inspectionId),
          listInspectionEvents(inspectionId),
        ]);

        const assetByScene = new Map<string, string>();
        const assetBySort = new Map<number, string>();

        for (const image of images) {
          const assetId = toOptionalString(image.assetId);
          if (!assetId) {
            continue;
          }

          const scene = String(image.scene ?? "").toUpperCase();
          const sortOrder = Number(image.sortOrder ?? 0);

          if (scene) {
            assetByScene.set(scene, assetId);
          }

          if (Number.isFinite(sortOrder)) {
            assetBySort.set(sortOrder, assetId);
          }
        }

        return {
          imageAssetId1: assetByScene.get("HERO") ?? assetBySort.get(0),
          imageAssetId2: assetByScene.get("DETAIL") ?? assetBySort.get(1),
          imageAssetId3: assetByScene.get("CERT") ?? assetBySort.get(2),
          progressStage: inferProgressStage(events),
        };
      }}
      onAfterSubmit={async (context) => {
        const inspectionId = await resolveInspectionId(context);
        if (!inspectionId) {
          throw new Error("\u4fdd\u5b58\u9274\u5b9a\u5355\u540e\u672a\u83b7\u53d6\u5230ID");
        }

        const stageRaw = String(context.formValues.progressStage ?? "SUBMITTED").toUpperCase();
        const stage: ProgressStage =
          stageRaw === "INSPECTING" || stageRaw === "COMPLETED" ? (stageRaw as ProgressStage) : "SUBMITTED";

        await syncInspectionImages(inspectionId, context.formValues);
        await syncInspectionTrack(
          inspectionId,
          stage,
          context.savedRecord?.inspectionTime ??
            context.requestPayload.inspectionTime ??
            context.formValues.inspectionTime
        );
      }}
      fields={[
        { key: "sn", label: "\u68c0\u9a8c\u7801SN", required: true },
        {
          key: "productId",
          label: "\u5546\u54c1",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "companyId",
          label: "\u9001\u68c0\u516c\u53f8",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "inspectionTime", label: "\u9001\u68c0\u65f6\u95f4(ISO)", required: true },
        {
          key: "result",
          label: "\u9274\u5b9a\u7ed3\u679c",
          type: "select",
          required: true,
          options: [
            { label: "PASS", value: "PASS" },
            { label: "FAIL", value: "FAIL" },
            { label: "PENDING", value: "PENDING" },
          ],
        },
        {
          key: "status",
          label: "\u53d1\u5e03\u72b6\u6001",
          type: "select",
          required: true,
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "REVIEWED", value: "REVIEWED" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "REVOKED", value: "REVOKED" },
          ],
        },
        { key: "conclusion", label: "\u9274\u5b9a\u7ed3\u8bba", type: "textarea", hideInTable: true },
        {
          key: "progressStage",
          label: "\u8f68\u8ff9\u9636\u6bb5",
          type: "select",
          required: true,
          hideInTable: true,
          options: PROGRESS_STAGE_OPTIONS,
        },
        {
          key: "imageAssetId1",
          label: "\u9274\u5b9a\u56fe\u72471",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "imageAssetId2",
          label: "\u9274\u5b9a\u56fe\u72472",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "imageAssetId3",
          label: "\u9274\u5b9a\u56fe\u72473",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        { key: "productNameSnapshot", label: "\u5546\u54c1\u540d\u79f0\u5feb\u7167", hideInTable: true },
        { key: "companyNameSnapshot", label: "\u9001\u68c0\u516c\u53f8\u5feb\u7167", hideInTable: true },
        { key: "updatedAt", label: "\u66f4\u65b0\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}

export function ProductsPage() {
  const companyOptions = useSelectOptions("companies");
  const companyMap = useMemo(
    () => new Map(companyOptions.map((item) => [item.value, item.label])),
    [companyOptions]
  );

  return (
    <CrudResourcePage
      title={"\u5546\u54c1\u7ba1\u7406"}
      resource="products"
      publishResource="products"
      fields={[
        { key: "name", label: "\u5546\u54c1\u540d\u79f0", required: true },
        {
          key: "companyId",
          label: "\u9ed8\u8ba4\u9001\u68c0\u516c\u53f8",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "sku", label: "SKU" },
        { key: "brand", label: "\u54c1\u724c" },
        { key: "model", label: "\u578b\u53f7" },
        { key: "material", label: "\u6750\u8d28" },
        { key: "summary", label: "\u6458\u8981", type: "textarea", hideInTable: true },
        { key: "productInfoHtml", label: "\u5546\u54c1\u8be6\u60c5HTML", type: "textarea", hideInTable: true },
        {
          key: "status",
          label: "\u53d1\u5e03\u72b6\u6001",
          type: "select",
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "ARCHIVED", value: "ARCHIVED" },
          ],
        },
        { key: "updatedAt", label: "\u66f4\u65b0\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}

export function ProductImagesPage() {
  const productOptions = useSelectOptions("products");
  const mediaOptions = useSelectOptions("media");

  const productMap = useMemo(
    () => new Map(productOptions.map((item) => [item.value, item.label])),
    [productOptions]
  );
  const mediaMap = useMemo(
    () => new Map(mediaOptions.map((item) => [item.value, item.label])),
    [mediaOptions]
  );

  return (
    <CrudResourcePage
      title={"\u5546\u54c1\u56fe\u7247\u7ba1\u7406\uff08\u5148\u5728\u7d20\u6750\u5e93\u4e0a\u4f20\u56fe\u7247\uff0c\u518d\u5728\u6b64\u7ed1\u5b9a\u5230\u5546\u54c1\uff09"}
      resource="product-images"
      fields={[
        {
          key: "productId",
          label: "\u5546\u54c1",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "assetId",
          label: "\u7d20\u6750",
          type: "select",
          required: true,
          options: mediaOptions,
          tableRender: (value) => mediaMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "scene",
          label: "\u5546\u54c1\u56fe\u573a\u666f",
          type: "select",
          required: true,
          options: [
            { label: "HERO", value: "HERO" },
            { label: "CAROUSEL", value: "CAROUSEL" },
            { label: "COMPANY_DETAIL", value: "COMPANY_DETAIL" },
            { label: "DETAIL", value: "DETAIL" },
          ],
        },
        { key: "sortOrder", label: "\u6392\u5e8f", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "\u521b\u5efa\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}

export function CompaniesPage() {
  const mediaOptions = useSelectOptions("media");
  const mediaMap = useMemo(
    () => new Map(mediaOptions.map((item) => [item.value, item.label])),
    [mediaOptions]
  );

  return (
    <CrudResourcePage
      title={"\u9001\u68c0\u516c\u53f8\u7ba1\u7406"}
      resource="companies"
      publishResource="companies"
      fields={[
        { key: "name", label: "\u9001\u68c0\u516c\u53f8\u540d\u79f0", required: true },
        { key: "shortName", label: "\u7b80\u79f0" },
        { key: "phone", label: "\u8054\u7cfb\u7535\u8bdd" },
        { key: "address", label: "\u5730\u5740" },
        { key: "descriptionHtml", label: "\u516c\u53f8\u4ecb\u7ecdHTML", type: "textarea", hideInTable: true },
        {
          key: "logoAssetId",
          label: "Logo\u7d20\u6750",
          type: "select",
          options: mediaOptions,
          tableRender: (value) => mediaMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "status",
          label: "\u53d1\u5e03\u72b6\u6001",
          type: "select",
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "ARCHIVED", value: "ARCHIVED" },
          ],
        },
        { key: "updatedAt", label: "\u66f4\u65b0\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}

export function MediaPage() {
  return (
    <CrudResourcePage
      title={"\u7d20\u6750\u5e93"}
      resource="media"
      fields={[
        { key: "name", label: "\u540d\u79f0", required: true },
        { key: "url", label: "URL", required: true },
        { key: "mimeType", label: "MIME\u7c7b\u578b" },
        { key: "sizeBytes", label: "\u5927\u5c0f(byte)", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "width", label: "\u5bbd\u5ea6", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "height", label: "\u9ad8\u5ea6", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "\u521b\u5efa\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}