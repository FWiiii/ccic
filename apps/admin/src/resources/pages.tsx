import { useMemo, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { useInvalidate, useList } from "@refinedev/core";
import { Button, Form, Input, InputNumber, Modal, Select, Upload, message } from "antd";
import {
  CrudResourcePage,
  type CrudSubmitContext,
  type FieldOption,
} from "../components/CrudResourcePage";
import { requestJson } from "../providers/api-client";

const INSPECTION_AGENCY_NAME =
  "中国检验认证集团奢侈品鉴定中心";
const MAX_INSPECTION_BATCH_COUNT = 500;

const INSPECTION_RESULT_OPTIONS = [
  { label: "PASS", value: "PASS" },
  { label: "FAIL", value: "FAIL" },
  { label: "PENDING", value: "PENDING" },
] satisfies FieldOption[];

const INSPECTION_STATUS_OPTIONS = [
  { label: "DRAFT", value: "DRAFT" },
  { label: "REVIEWED", value: "REVIEWED" },
  { label: "PUBLISHED", value: "PUBLISHED" },
  { label: "REVOKED", value: "REVOKED" },
] satisfies FieldOption[];

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

type InspectionBatchCreateResponse = {
  data?: {
    createdCount?: number;
    skippedCount?: number;
    skippedSnList?: unknown[];
  };
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
  const [batchForm] = Form.useForm();
  const [isBatchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const invalidate = useInvalidate();
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

  const openBatchModal = () => {
    batchForm.resetFields();
    batchForm.setFieldsValue({
      inspectionTime: new Date().toISOString(),
      result: "PENDING",
      status: "DRAFT",
      count: 1,
    });
    setBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setBatchModalOpen(false);
    setBatchSubmitting(false);
    batchForm.resetFields();
  };

  const submitBatchCreate = async (values: Record<string, unknown>) => {
    setBatchSubmitting(true);

    try {
      const payload = {
        productId: String(values.productId ?? "").trim(),
        companyId: String(values.companyId ?? "").trim(),
        startSn: String(values.startSn ?? "").trim(),
        count: Number(values.count ?? 0),
        inspectionTime: String(values.inspectionTime ?? "").trim(),
        result: String(values.result ?? "").trim(),
        status: String(values.status ?? "").trim(),
      };

      const response = await adminRequest<InspectionBatchCreateResponse>("/api/admin/inspections/batch-create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdCount = Number(response?.data?.createdCount ?? 0);
      const skippedCount = Number(response?.data?.skippedCount ?? 0);
      const skippedSnList = asArray(response?.data?.skippedSnList).map((item) => String(item ?? "").trim()).filter(Boolean);

      message.success(
        skippedCount > 0 ? `成功生成 ${createdCount} 条，跳过 ${skippedCount} 条` : `成功生成 ${createdCount} 条鉴定单`
      );

      closeBatchModal();
      await invalidate({
        resource: "inspections",
        invalidates: ["list", "many", "detail"],
      });

      if (skippedCount > 0) {
        const visibleSnList = skippedSnList.slice(0, 20);
        const remainingCount = Math.max(0, skippedCount - visibleSnList.length);

        Modal.info({
          title: "部分 SN 已存在，已自动跳过",
          width: 560,
          content: (
            <div>
              <p>本次跳过的 SN 如下：</p>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{visibleSnList.join("\n")}</pre>
              {remainingCount > 0 ? <p style={{ marginTop: 12 }}>等 {remainingCount} 个</p> : null}
            </div>
          ),
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      message.error(`批量生成失败：${detail}`);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const batchAction = (
    <>
      <Button onClick={openBatchModal}>批量生成</Button>
      <Modal
        open={isBatchModalOpen}
        title="批量生成鉴定单"
        onCancel={closeBatchModal}
        onOk={() => batchForm.submit()}
        confirmLoading={batchSubmitting}
        okText="开始生成"
        cancelText="取消"
        maskClosable={false}
        destroyOnHidden
        width={720}
      >
        <Form form={batchForm} layout="vertical" onFinish={(values) => void submitBatchCreate(values)}>
          <div className="crud-form-grid-inner">
            <Form.Item className="crud-field-half" name="productId" label="商品" rules={[{ required: true, message: "请选择商品" }]}>
              <Select options={productOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="companyId"
              label="送检公司"
              rules={[{ required: true, message: "请选择送检公司" }]}
            >
              <Select options={companyOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="startSn"
              label="起始 SN"
              rules={[
                { required: true, message: "请输入起始 SN" },
                { pattern: /^\d+$/, message: "起始 SN 必须为纯数字" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="count"
              label="生成数量"
              rules={[
                { required: true, message: "请输入生成数量" },
                {
                  validator: async (_rule, value) => {
                    const count = Number(value);
                    if (Number.isInteger(count) && count >= 1 && count <= MAX_INSPECTION_BATCH_COUNT) {
                      return;
                    }

                    throw new Error(`生成数量必须是 1-${MAX_INSPECTION_BATCH_COUNT} 的整数`);
                  },
                },
              ]}
            >
              <InputNumber style={{ width: "100%" }} min={1} max={MAX_INSPECTION_BATCH_COUNT} precision={0} />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="inspectionTime"
              label="送检时间(ISO)"
              rules={[{ required: true, message: "请输入送检时间" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="result"
              label="鉴定结果"
              rules={[{ required: true, message: "请选择鉴定结果" }]}
            >
              <Select options={INSPECTION_RESULT_OPTIONS} optionFilterProp="label" />
            </Form.Item>
            <Form.Item
              className="crud-field-half"
              name="status"
              label="发布状态"
              rules={[{ required: true, message: "请选择发布状态" }]}
            >
              <Select options={INSPECTION_STATUS_OPTIONS} optionFilterProp="label" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );

  return (
    <CrudResourcePage
      title={`鉴定单管理（鉴定机构固定：${INSPECTION_AGENCY_NAME}）`}
      resource="inspections"
      headerActions={batchAction}
      fields={[
        { key: "sn", label: "检验码SN", required: true },
        {
          key: "productId",
          label: "商品",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "companyId",
          label: "送检公司",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "inspectionTime", label: "送检时间(ISO)", required: true },
        {
          key: "result",
          label: "鉴定结果",
          type: "select",
          required: true,
          options: INSPECTION_RESULT_OPTIONS,
        },
        {
          key: "status",
          label: "发布状态",
          type: "select",
          required: true,
          options: INSPECTION_STATUS_OPTIONS,
        },
        { key: "conclusion", label: "鉴定结论", hideInForm: true },
        { key: "updatedAt", label: "更新时间", hideInForm: true },
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
      title={"商品管理"}
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
          throw new Error("保存商品后未获取到ID");
        }

        await syncProductImages(productId, context.formValues);
      }}
      fields={[
        { key: "name", label: "商品名称", required: true },
        {
          key: "companyId",
          label: "默认送检公司",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "sku", label: "SKU" },
        { key: "brand", label: "品牌" },
        { key: "model", label: "型号" },
        { key: "material", label: "材质" },
        {
          key: "productImageAssetId1",
          label: "商品图片1",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "productImageAssetId2",
          label: "商品图片2",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        {
          key: "productImageAssetId3",
          label: "商品图片3",
          type: "select",
          hideInTable: true,
          options: mediaOptions,
        },
        { key: "summary", label: "摘要", type: "textarea", hideInTable: true },
        { key: "productInfoHtml", label: "商品详情HTML", type: "textarea", hideInTable: true },
        {
          key: "status",
          label: "发布状态",
          type: "select",
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "ARCHIVED", value: "ARCHIVED" },
          ],
        },
        { key: "updatedAt", label: "更新时间", hideInForm: true },
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
      title={"送检公司管理"}
      resource="companies"
      publishResource="companies"
      fields={[
        { key: "name", label: "送检公司名称", required: true },
        { key: "shortName", label: "简称" },
        { key: "phone", label: "联系电话" },
        { key: "address", label: "地址" },
        { key: "descriptionHtml", label: "公司介绍HTML", type: "textarea", hideInTable: true },
        {
          key: "logoAssetId",
          label: "Logo素材",
          type: "select",
          options: mediaOptions,
          tableRender: (value) => mediaMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "status",
          label: "发布状态",
          type: "select",
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "ARCHIVED", value: "ARCHIVED" },
          ],
        },
        { key: "updatedAt", label: "更新时间", hideInForm: true },
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
      <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
        上传素材
      </Button>
    </Upload>
  );

  return (
    <CrudResourcePage
      title={"素材库"}
      resource="media"
      headerActions={uploadAction}
      allowCreate={false}
      fields={[
        { key: "name", label: "名称", required: true },
        { key: "url", label: "URL", required: true },
        { key: "mimeType", label: "MIME类型" },
        { key: "sizeBytes", label: "大小(byte)", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "width", label: "宽度", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "height", label: "高度", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "创建时间", hideInForm: true },
      ]}
    />
  );
}

export function UsersPage() {
  return (
    <CrudResourcePage
      title={"用户管理"}
      resource="users"
      allowEdit={false}
      createInitialValues={{
        role: "EDITOR",
        status: "ACTIVE",
      }}
      fields={[
        { key: "username", label: "用户名", required: true },
        { key: "displayName", label: "显示名称", required: true },
        { key: "password", label: "登录密码", required: true, hideInTable: true },
        {
          key: "role",
          label: "角色",
          type: "select",
          required: true,
          options: [
            { label: "SUPER_ADMIN", value: "SUPER_ADMIN" },
            { label: "EDITOR", value: "EDITOR" },
            { label: "VIEWER", value: "VIEWER" },
          ],
        },
        {
          key: "status",
          label: "状态",
          type: "select",
          required: true,
          options: [
            { label: "ACTIVE", value: "ACTIVE" },
            { label: "DISABLED", value: "DISABLED" },
          ],
        },
        { key: "createdAt", label: "创建时间", hideInForm: true },
        { key: "updatedAt", label: "更新时间", hideInForm: true },
      ]}
    />
  );
}
