import { useMemo, useState } from "react";
import { useInvalidate, useList } from "@refinedev/core";
import { Button, Upload, message } from "antd";
import {
  CrudResourcePage,
  type CrudSubmitContext,
  type FieldOption,
} from "../components/CrudResourcePage";
import { requestJson } from "../providers/api-client";

const INSPECTION_AGENCY_NAME =
  "\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u5962\u4f88\u54c1\u9274\u5b9a\u4e2d\u5fc3";

const PRODUCT_IMAGE_SLOT_CONFIG = [
  { key: "productImageAssetId1", scene: "HERO", sortOrder: 0 },
  { key: "productImageAssetId2", scene: "CAROUSEL", sortOrder: 1 },
  { key: "productImageAssetId3", scene: "DETAIL", sortOrder: 2 },
] as const;

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const data = await requestJson<T>(path, init);
  return data as T;
}

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

type UploadSignResponse = {
  bucket?: string;
  objectKey: string;
  uploadUrl: string;
  method?: string;
  headers?: Record<string, string>;
  publicUrl: string;
  expiresIn?: number;
};

const readImageDimensions = (file: File) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = Number.isFinite(image.naturalWidth) ? image.naturalWidth : undefined;
      const height = Number.isFinite(image.naturalHeight) ? image.naturalHeight : undefined;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({});
    };

    image.src = objectUrl;
  });

async function listProductImages(productId: string) {
  return asArray(
    await adminRequest<unknown>(`/api/admin/product-images?productId=${encodeURIComponent(productId)}`)
  );
}

async function resolveProductId(context: CrudSubmitContext) {
  const fromContext = String(context.recordId ?? "").trim();
  if (fromContext) {
    return fromContext;
  }

  return String(context.savedRecord?.id ?? "").trim();
}

async function syncProductImages(productId: string, formValues: Record<string, unknown>) {
  const images = [];

  for (const slot of PRODUCT_IMAGE_SLOT_CONFIG) {
    const assetId = toOptionalString(formValues[slot.key]);

    if (!assetId) {
      continue;
    }

    images.push({
      assetId,
      scene: slot.scene,
      sortOrder: slot.sortOrder,
    });
  }

  await adminRequest("/api/admin/product-images/replace", {
    method: "POST",
    body: JSON.stringify({
      productId,
      images,
    }),
  });
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
        { key: "conclusion", label: "\u9274\u5b9a\u7ed3\u8bba", hideInForm: true },
        { key: "updatedAt", label: "\u66f4\u65b0\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}

export function ProductsPage() {
  const companyOptions = useSelectOptions("companies");
  const mediaOptions = useSelectOptions("media");

  const companyMap = useMemo(
    () => new Map(companyOptions.map((item) => [item.value, item.label])),
    [companyOptions]
  );

  return (
    <CrudResourcePage
      title={"\u5546\u54c1\u7ba1\u7406"}
      resource="products"
      publishResource="products"
      loadEditFormValues={async (record) => {
        const productId = String(record.id ?? "").trim();
        if (!productId) {
          return {};
        }

        const bindings = await listProductImages(productId);

        const byScene = new Map<string, string>();
        const bySort = new Map<number, string>();

        for (const binding of bindings) {
          const assetId = String(binding.assetId ?? "").trim();
          const scene = String(binding.scene ?? "").toUpperCase();
          const sortOrder = Number(binding.sortOrder ?? 0);

          if (!assetId) {
            continue;
          }

          if (scene) {
            byScene.set(scene, assetId);
          }

          if (Number.isFinite(sortOrder)) {
            bySort.set(sortOrder, assetId);
          }
        }

        return {
          productImageAssetId1: byScene.get("HERO") ?? bySort.get(0),
          productImageAssetId2: byScene.get("CAROUSEL") ?? bySort.get(1),
          productImageAssetId3: byScene.get("DETAIL") ?? bySort.get(2),
        };
      }}
      onAfterSubmit={async (context) => {
        const productId = await resolveProductId(context);
        if (!productId) {
          throw new Error("\u4fdd\u5b58\u5546\u54c1\u540e\u672a\u83b7\u53d6\u5230ID");
        }

        await syncProductImages(productId, context.formValues);
      }}
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
        {
          key: "productImageAssetId1",
          label: "\u5546\u54c1\u56fe\u72471",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "productImageAssetId2",
          label: "\u5546\u54c1\u56fe\u72472",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "productImageAssetId3",
          label: "\u5546\u54c1\u56fe\u72473",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
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
  const [uploading, setUploading] = useState(false);
  const invalidate = useInvalidate();

  const uploadImageToR2 = async (file: File) => {
    setUploading(true);

    try {
      const contentType = file.type || "application/octet-stream";
      const uploadSign = await adminRequest<UploadSignResponse>("/api/admin/media/upload-sign", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType,
        }),
      });

      const uploadHeaders = new Headers(uploadSign.headers ?? {});
      if (!uploadHeaders.has("Content-Type")) {
        uploadHeaders.set("Content-Type", contentType);
      }

      const uploadResponse = await fetch(uploadSign.uploadUrl, {
        method: uploadSign.method || "PUT",
        headers: uploadHeaders,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`上传文件失败 (HTTP ${uploadResponse.status})`);
      }

      const { width, height } = await readImageDimensions(file);

      await adminRequest("/api/admin/media", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          url: uploadSign.publicUrl,
          bucket: uploadSign.bucket,
          objectKey: uploadSign.objectKey,
          mimeType: contentType,
          sizeBytes: file.size,
          width,
          height,
        }),
      });

      await invalidate({
        resource: "media",
        invalidates: ["list", "many", "detail"],
      });

      message.success("上传成功，已写入素材库");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      message.error(`上传失败：${detail}`);
    } finally {
      setUploading(false);
    }
  };

  const uploadAction = (
    <Upload
      accept="image/*"
      showUploadList={false}
      beforeUpload={(file) => {
        void uploadImageToR2(file as File);
        return false;
      }}
    >
      <Button loading={uploading}>上传素材到 R2</Button>
    </Upload>
  );

  return (
    <CrudResourcePage
      title={"\u7d20\u6750\u5e93"}
      resource="media"
      headerActions={uploadAction}
      allowCreate={false}
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
