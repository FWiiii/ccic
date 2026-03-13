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
      title="\u5546\u54c1\u7ba1\u7406"
      resource="products"
      publishResource="products"
      fields={[
        { key: "name", label: "\u5546\u54c1\u540d\u79f0", required: true },
        {
          key: "companyId",
          label: "\u6240\u5c5e\u4f01\u4e1a",
          type: "select",
          required: true,
          options: companyOptions,
          tableRender: (value) => companyMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        { key: "sku", label: "SKU" },
        { key: "brand", label: "\u54c1\u724c" },
        { key: "model", label: "\u578b\u53f7" },
        { key: "summary", label: "\u6458\u8981", type: "textarea", hideInTable: true },
        { key: "productInfoHtml", label: "\u4ea7\u54c1\u8be6\u60c5HTML", type: "textarea", hideInTable: true },
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
      title="\u4f01\u4e1a\u7ba1\u7406"
      resource="companies"
      publishResource="companies"
      fields={[
        { key: "name", label: "\u4f01\u4e1a\u540d\u79f0", required: true },
        { key: "shortName", label: "\u7b80\u79f0" },
        { key: "phone", label: "\u8054\u7cfb\u7535\u8bdd" },
        { key: "address", label: "\u5730\u5740" },
        { key: "descriptionHtml", label: "\u4f01\u4e1a\u4ecb\u7ecdHTML", type: "textarea", hideInTable: true },
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
      title="\u7d20\u6750\u5e93"
      resource="media"
      fields={[
        { key: "name", label: "\u540d\u79f0", required: true },
        { key: "url", label: "URL", required: true },
        { key: "mimeType", label: "MIME" },
        { key: "sizeBytes", label: "\u5927\u5c0f(byte)", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "width", label: "\u5bbd\u5ea6", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "height", label: "\u9ad8\u5ea6", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "\u521b\u5efa\u65f6\u95f4", hideInForm: true },
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
      title="\u5546\u54c1\u56fe\u7247\u7ed1\u5b9a"
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
          label: "\u573a\u666f",
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

export function TracePagesPage() {
  return (
    <CrudResourcePage
      title="SN\u8ffd\u6eaf\u9875\u9762"
      resource="trace-pages"
      fields={[
        { key: "sn", label: "\u5546\u54c1SN", required: true },
        {
          key: "indexBannerAssetIdsCsv",
          label: "indexBanner\u7d20\u6750ID(CSV)",
          type: "textarea",
          required: true,
          hideInTable: true,
        },
        { key: "consignorName", label: "\u59d4\u6258\u5355\u4f4d" },
        { key: "inspectionDate", label: "\u6838\u9a8c\u65e5\u671f" },
        { key: "traceContent", label: "\u8ffd\u6eaf\u4fe1\u606f", type: "textarea", hideInTable: true },
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

export function TraceCodesPage() {
  const productOptions = useSelectOptions("products");
  const productMap = useMemo(
    () => new Map(productOptions.map((item) => [item.value, item.label])),
    [productOptions]
  );

  return (
    <CrudResourcePage
      title="\u8ffd\u6eaf\u7801\u7ba1\u7406"
      resource="trace-codes"
      fields={[
        { key: "code", label: "\u8ffd\u6eaf\u7801", required: true },
        {
          key: "productId",
          label: "\u5546\u54c1",
          type: "select",
          required: true,
          options: productOptions,
          tableRender: (value) => productMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "verifyStatus",
          label: "\u9a8c\u771f\u72b6\u6001",
          type: "select",
          options: [
            { label: "VALID", value: "VALID" },
            { label: "INVALID", value: "INVALID" },
            { label: "EXPIRED", value: "EXPIRED" },
            { label: "REVOKED", value: "REVOKED" },
          ],
        },
        { key: "verifyCount", label: "\u67e5\u8be2\u6b21\u6570", type: "number", hideInForm: true },
        { key: "expiresAt", label: "\u8fc7\u671f\u65f6\u95f4(ISO)" },
        { key: "lastVerifiedAt", label: "\u6700\u540e\u67e5\u8be2\u65f6\u95f4", hideInForm: true },
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
      title="\u8ffd\u6eaf\u4e8b\u4ef6"
      resource="trace-events"
      fields={[
        {
          key: "traceCodeId",
          label: "\u8ffd\u6eaf\u7801",
          type: "select",
          required: true,
          options: traceCodeOptions,
          tableRender: (value) => traceMap.get(String(value ?? "")) ?? String(value ?? "-"),
        },
        {
          key: "eventType",
          label: "\u7c7b\u578b",
          type: "select",
          options: [
            { label: "SUBMIT", value: "SUBMIT" },
            { label: "INSPECTION", value: "INSPECTION" },
            { label: "CERTIFIED", value: "CERTIFIED" },
            { label: "UPDATED", value: "UPDATED" },
            { label: "OTHER", value: "OTHER" },
          ],
        },
        { key: "title", label: "\u6807\u9898", required: true },
        { key: "content", label: "\u5185\u5bb9", type: "textarea", hideInTable: true },
        { key: "eventTime", label: "\u4e8b\u4ef6\u65f6\u95f4(ISO)" },
        { key: "sortOrder", label: "\u6392\u5e8f", type: "number", normalize: (value) => Number(value ?? 0) },
        { key: "createdAt", label: "\u521b\u5efa\u65f6\u95f4", hideInForm: true },
      ]}
    />
  );
}
