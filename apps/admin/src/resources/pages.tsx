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
      title="鉴定单管理（鉴定机构固定：中国检验认证集团奢侈品鉴定中心）"
      resource="inspections"
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
          options: [
            { label: "PASS", value: "PASS" },
            { label: "FAIL", value: "FAIL" },
            { label: "PENDING", value: "PENDING" },
          ],
        },
        {
          key: "status",
          label: "发布状态",
          type: "select",
          required: true,
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "REVIEWED", value: "REVIEWED" },
            { label: "PUBLISHED", value: "PUBLISHED" },
            { label: "REVOKED", value: "REVOKED" },
          ],
        },
        { key: "conclusion", label: "鉴定结论", type: "textarea", hideInTable: true },
        { key: "productNameSnapshot", label: "商品名称快照", hideInTable: true },
        { key: "companyNameSnapshot", label: "送检公司快照", hideInTable: true },
        { key: "updatedAt", label: "更新时间", hideInForm: true },
      ]}
    />
  );
}

export function InspectionImagesPage() {
  const inspectionOptions = useSelectOptions("inspections", "sn");
  const mediaOptions = useSelectOptions("media");

  const inspectionMap = useMemo(
    () => new Map(inspectionOptions.map((item) => [item.value, item.label])),
    [inspectionOptions]
  );
  const mediaMap = useMemo(
    () => new Map(mediaOptions.map((item) => [item.value, item.label])),
    [mediaOptions]
  );

  return (
    <CrudResourcePage
      title="检测图片管理"
      resource="inspection-images"
      fields={[
        {
          key: "inspectionId",
          label: "鉴定单(SN)",
          type: "select",
          required: true,
          options: inspectionOptions,
          tableRender: (value) => inspectionMap.get(String(value ?? "")) ?? String(value ?? "-"),
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
          label: "图片场景",
          type: "select",
          required: true,
          options: [
            { label: "HERO", value: "HERO" },
            { label: "DETAIL", value: "DETAIL" },
            { label: "CERT", value: "CERT" },
            { label: "OTHER", value: "OTHER" },
          ],
        },
        { key: "sortOrder", label: "排序", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "创建时间", hideInForm: true },
      ]}
    />
  );
}

export function InspectionEventsPage() {
  const inspectionOptions = useSelectOptions("inspections", "sn");
  const inspectionMap = useMemo(
    () => new Map(inspectionOptions.map((item) => [item.value, item.label])),
    [inspectionOptions]
  );

  return (
    <CrudResourcePage
      title="检测轨迹管理"
      resource="inspection-events"
      fields={[
        {
          key: "inspectionId",
          label: "鉴定单(SN)",
          type: "select",
          required: true,
          options: inspectionOptions,
          tableRender: (value) => inspectionMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "eventType",
          label: "事件类型",
          type: "select",
          options: [
            { label: "SUBMIT", value: "SUBMIT" },
            { label: "SAMPLE_RECEIVED", value: "SAMPLE_RECEIVED" },
            { label: "INSPECTION", value: "INSPECTION" },
            { label: "CERTIFIED", value: "CERTIFIED" },
            { label: "PUBLISHED", value: "PUBLISHED" },
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
          label: "默认送检公司",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "sku", label: "SKU" },
        { key: "brand", label: "品牌" },
        { key: "model", label: "型号" },
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
      title="送检公司管理"
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
  return (
    <CrudResourcePage
      title="素材库"
      resource="media"
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
