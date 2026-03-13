import { useMemo } from "react";
import { useList } from "@refinedev/core";
import { CrudResourcePage, type FieldOption } from "../components/CrudResourcePage";

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
      const label = String(row[labelField] ?? row.name ?? row.code ?? id);

      return {
        label,
        value: id,
      } satisfies FieldOption;
    });
  }, [data, labelField]);
}

export function ProductsPage() {
  const companyOptions = useSelectOptions("companies");
  const companyMap = useMemo(
    () => new Map(companyOptions.map((item) => [item.value, item.label])),
    [companyOptions]
  );

  return (
    <CrudResourcePage
      title="商品管理"
      resource="products"
      publishResource="products"
      fields={[
        { key: "name", label: "商品名称", required: true },
        {
          key: "companyId",
          label: "所属企业",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "sku", label: "SKU" },
        { key: "brand", label: "品牌" },
        { key: "model", label: "型号" },
        { key: "summary", label: "摘要", type: "textarea", hideInTable: true },
        { key: "productInfoHtml", label: "产品详情HTML", type: "textarea", hideInTable: true },
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
      title="企业管理"
      resource="companies"
      publishResource="companies"
      fields={[
        { key: "name", label: "企业名称", required: true },
        { key: "shortName", label: "简称" },
        { key: "phone", label: "联系电话" },
        { key: "address", label: "地址" },
        { key: "descriptionHtml", label: "企业介绍HTML", type: "textarea", hideInTable: true },
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
  return (
    <CrudResourcePage
      title="素材库"
      resource="media"
      fields={[
        { key: "name", label: "名称", required: true },
        { key: "url", label: "URL", required: true },
        { key: "mimeType", label: "MIME" },
        { key: "sizeBytes", label: "大小(byte)", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "width", label: "宽度", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "height", label: "高度", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "创建时间", hideInForm: true },
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
      title="商品图片绑定"
      resource="product-images"
      fields={[
        {
          key: "productId",
          label: "商品",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "assetId",
          label: "素材",
          type: "select",
          required: true,
          options: mediaOptions,
          tableRender: (value) => mediaMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "scene",
          label: "场景",
          type: "select",
          required: true,
          options: [
            { label: "HERO", value: "HERO" },
            { label: "CAROUSEL", value: "CAROUSEL" },
            { label: "COMPANY_DETAIL", value: "COMPANY_DETAIL" },
            { label: "DETAIL", value: "DETAIL" },
          ],
        },
        { key: "sortOrder", label: "排序", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "创建时间", hideInForm: true },
      ]}
    />
  );
}

export function TraceCodesPage() {
  const productOptions = useSelectOptions("products");
  const productMap = useMemo(
    () => new Map(productOptions.map((item) => [item.value, item.label])),
    [productOptions]
  );

  return (
    <CrudResourcePage
      title="追溯码管理"
      resource="trace-codes"
      fields={[
        { key: "code", label: "追溯码", required: true },
        {
          key: "productId",
          label: "商品",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "verifyStatus",
          label: "验真状态",
          type: "select",
          options: [
            { label: "VALID", value: "VALID" },
            { label: "INVALID", value: "INVALID" },
            { label: "EXPIRED", value: "EXPIRED" },
            { label: "REVOKED", value: "REVOKED" },
          ],
        },
        { key: "verifyCount", label: "查询次数", type: "number", hideInForm: true },
        { key: "expiresAt", label: "过期时间(ISO)" },
        { key: "lastVerifiedAt", label: "最后查询时间", hideInForm: true },
      ]}
    />
  );
}

export function TraceEventsPage() {
  const traceCodeOptions = useSelectOptions("trace-codes", "code");
  const traceMap = useMemo(
    () => new Map(traceCodeOptions.map((item) => [item.value, item.label])),
    [traceCodeOptions]
  );

  return (
    <CrudResourcePage
      title="追溯事件"
      resource="trace-events"
      fields={[
        {
          key: "traceCodeId",
          label: "追溯码",
          type: "select",
          required: true,
          options: traceCodeOptions,
          tableRender: (value) => traceMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "eventType",
          label: "类型",
          type: "select",
          options: [
            { label: "SUBMIT", value: "SUBMIT" },
            { label: "INSPECTION", value: "INSPECTION" },
            { label: "CERTIFIED", value: "CERTIFIED" },
            { label: "UPDATED", value: "UPDATED" },
            { label: "OTHER", value: "OTHER" },
          ],
        },
        { key: "title", label: "标题", required: true },
        { key: "content", label: "内容", type: "textarea", hideInTable: true },
        { key: "eventTime", label: "事件时间(ISO)" },
        { key: "sortOrder", label: "排序", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "创建时间", hideInForm: true },
      ]}
    />
  );
}
