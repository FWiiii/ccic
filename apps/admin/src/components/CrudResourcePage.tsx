import { useState, type ReactNode } from "react";
import {
  useCreate,
  useCustomMutation,
  useDelete,
  useUpdate,
} from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
  type TableColumnsType,
} from "antd";

export type FieldType = "text" | "textarea" | "number" | "select";

export interface FieldOption {
  label: string;
  value: string;
}

export interface CrudFilter {
  field: string;
  operator?: "eq" | "contains";
  value: unknown;
}

export interface CrudFieldConfig {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: FieldOption[];
  hideInTable?: boolean;
  hideInForm?: boolean;
  normalize?: (value: unknown) => unknown;
  tableRender?: (value: unknown, record: Record<string, unknown>) => ReactNode;
}

export interface CrudSubmitContext {
  mode: "create" | "edit";
  recordId?: string;
  formValues: Record<string, unknown>;
  requestPayload: Record<string, unknown>;
  savedRecord?: Record<string, unknown>;
}

export interface CrudResourcePageProps {
  title: string;
  resource: string;
  fields: CrudFieldConfig[];
  headerActions?: ReactNode;
  allowCreate?: boolean;
  publishResource?: "products" | "companies";
  permanentFilters?: CrudFilter[];
  submitOverrides?: Record<string, unknown>;
  createInitialValues?: Record<string, unknown>;
  syncWithLocation?: boolean;
  loadEditFormValues?: (
    record: Record<string, unknown>
  ) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  onAfterSubmit?: (context: CrudSubmitContext) => Promise<void> | void;
}

function renderCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

export function CrudResourcePage({
  title,
  resource,
  fields,
  headerActions,
  allowCreate = true,
  publishResource,
  permanentFilters,
  submitOverrides,
  createInitialValues,
  syncWithLocation = true,
  loadEditFormValues,
  onAfterSubmit,
}: CrudResourcePageProps) {
  const [form] = Form.useForm();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [loadingFormValues, setLoadingFormValues] = useState(false);

  const { tableProps, tableQueryResult } = useTable<Record<string, unknown>>({
    resource,
    pagination: {
      mode: "server",
      pageSize: 10,
    },
    syncWithLocation,
    filters: permanentFilters?.length
      ? {
          permanent: permanentFilters.map((item) => ({
            field: item.field,
            operator: item.operator ?? "eq",
            value: item.value,
          })),
        }
      : undefined,
  });

  const { mutateAsync: createMutate, isLoading: creating } = useCreate();
  const { mutateAsync: updateMutate, isLoading: updating } = useUpdate();
  const { mutateAsync: deleteMutate, isLoading: deleting } = useDelete();
  const { mutateAsync: customMutate, isLoading: customLoading } = useCustomMutation();

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const openCreate = () => {
    if (!allowCreate) {
      return;
    }

    setEditingRecord(null);
    form.resetFields();

    if (createInitialValues) {
      form.setFieldsValue(createInitialValues);
    }

    setModalOpen(true);
  };

  const openEdit = async (record: Record<string, unknown>) => {
    setEditingRecord(record);

    const initialValues = fields.reduce<Record<string, unknown>>((result, field) => {
      result[field.key] = record[field.key];
      return result;
    }, {});

    form.setFieldsValue(initialValues);
    setModalOpen(true);

    if (!loadEditFormValues) {
      return;
    }

    setLoadingFormValues(true);
    try {
      const extraValues = await loadEditFormValues(record);
      if (extraValues && Object.keys(extraValues).length) {
        form.setFieldsValue({ ...initialValues, ...extraValues });
      }
    } catch {
      message.error("\u52a0\u8f7d\u7f16\u8f91\u6570\u636e\u5931\u8d25");
    } finally {
      setLoadingFormValues(false);
    }
  };

  const submitForm = async (values: Record<string, unknown>) => {
    const payload = fields.reduce<Record<string, unknown>>((result, field) => {
      if (!(field.key in values)) {
        return result;
      }

      const raw = values[field.key];
      const normalized = field.normalize ? field.normalize(raw) : raw;

      if (normalized === "" || normalized === null) {
        result[field.key] = undefined;
      } else {
        result[field.key] = normalized;
      }

      return result;
    }, {});

    const requestPayload = {
      ...payload,
      ...(submitOverrides ?? {}),
    };

    const mode: CrudSubmitContext["mode"] = editingRecord?.id ? "edit" : "create";
    let savedRecord: Record<string, unknown> | undefined;
    let recordId: string | undefined;

    if (mode === "edit") {
      const result = (await updateMutate({
        resource,
        id: String(editingRecord?.id),
        values: requestPayload,
      })) as { data?: Record<string, unknown> };

      savedRecord = result?.data;
      recordId = String(editingRecord?.id ?? "").trim() || undefined;
    } else {
      const result = (await createMutate({
        resource,
        values: requestPayload,
      })) as { data?: Record<string, unknown> };

      savedRecord = result?.data;
      const createdId = String(savedRecord?.id ?? "").trim();
      recordId = createdId || undefined;
    }

    if (onAfterSubmit) {
      await onAfterSubmit({
        mode,
        recordId,
        formValues: values,
        requestPayload,
        savedRecord,
      });
    }

    message.success(mode === "edit" ? "\u66f4\u65b0\u6210\u529f" : "\u521b\u5efa\u6210\u529f");
    closeModal();
    await tableQueryResult?.refetch();
  };

  const handleDelete = (record: Record<string, unknown>) => {
    Modal.confirm({
      title: "\u786e\u8ba4\u5220\u9664",
      content: "\u8be5\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\uff0c\u662f\u5426\u7ee7\u7eed\uff1f",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMutate({
          resource,
          id: String(record.id),
        });

        message.success("\u5220\u9664\u6210\u529f");
        await tableQueryResult?.refetch();
      },
    });
  };

  const publish = async (record: Record<string, unknown>, status: "PUBLISHED" | "DRAFT") => {
    if (!publishResource) {
      return;
    }

    await customMutate({
      url: `/api/admin/${publishResource}/${record.id}/publish`,
      method: "post",
      values: { status },
    });

    message.success(status === "PUBLISHED" ? "\u53d1\u5e03\u6210\u529f" : "\u5df2\u4e0b\u7ebf");
    await tableQueryResult?.refetch();
  };

  const columns: TableColumnsType<Record<string, unknown>> = fields
    .filter((field) => !field.hideInTable)
    .map((field) => ({
      title: field.label,
      dataIndex: field.key,
      key: field.key,
      render: (value: unknown, record: Record<string, unknown>) => {
        if (field.tableRender) {
          return field.tableRender(value, record);
        }

        if (field.key === "status" && typeof value === "string") {
          const statusColorMap: Record<string, string> = {
            DRAFT: "orange",
            REVIEWED: "blue",
            PUBLISHED: "green",
            REVOKED: "red",
            ARCHIVED: "default",
          };

          return <Tag color={statusColorMap[value] ?? "default"}>{value}</Tag>;
        }

        if (field.key === "result" && typeof value === "string") {
          const resultColorMap: Record<string, string> = {
            PASS: "green",
            FAIL: "red",
            PENDING: "orange",
          };

          return <Tag color={resultColorMap[value] ?? "default"}>{value}</Tag>;
        }

        return renderCellValue(value);
      },
    }));

  columns.push({
    title: "\u64cd\u4f5c",
    key: "actions",
    width: 260,
    render: (_: unknown, record: Record<string, unknown>) => (
      <Space wrap>
        <Button size="small" onClick={() => void openEdit(record)}>
          {"\u7f16\u8f91"}
        </Button>
        {publishResource ? (
          <>
            <Button size="small" type="primary" onClick={() => void publish(record, "PUBLISHED")}>
              {"\u53d1\u5e03"}
            </Button>
            <Button size="small" onClick={() => void publish(record, "DRAFT")}>
              {"\u4e0b\u7ebf"}
            </Button>
          </>
        ) : null}
        <Button size="small" danger onClick={() => handleDelete(record)}>
          {"\u5220\u9664"}
        </Button>
      </Space>
    ),
  });

  const loading =
    tableQueryResult?.isLoading ||
    tableQueryResult?.isFetching ||
    creating ||
    updating ||
    deleting ||
    customLoading;

  return (
    <div className="crud-page">
      <div className="crud-header">
        <h2>{title}</h2>
        <Space>
          {headerActions}
          <Button onClick={() => void tableQueryResult?.refetch()}>{"\u5237\u65b0"}</Button>
          {allowCreate ? (
            <Button type="primary" onClick={openCreate}>
              {"\u65b0\u589e"}
            </Button>
          ) : null}
        </Space>
      </div>

      <Table
        {...tableProps}
        rowKey="id"
        columns={columns}
        loading={Boolean(loading)}
        scroll={{ x: 1200 }}
      />

      <Modal
        open={isModalOpen}
        title={editingRecord ? `\u7f16\u8f91${title}` : `\u65b0\u589e${title}`}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={Boolean(creating || updating || loadingFormValues)}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submitForm(values)}>
          {fields.filter((field) => !field.hideInForm).map((field) => {
            const fieldType = field.type ?? "text";

            return (
              <Form.Item
                key={field.key}
                name={field.key}
                label={field.label}
                rules={
                  field.required
                    ? [{ required: true, message: `\u8bf7\u8f93\u5165${field.label}` }]
                    : undefined
                }
              >
                {fieldType === "textarea" ? (
                  <Input.TextArea rows={4} />
                ) : fieldType === "number" ? (
                  <InputNumber style={{ width: "100%" }} />
                ) : fieldType === "select" ? (
                  <Select
                    allowClear={!field.required}
                    options={field.options ?? []}
                    showSearch
                    optionFilterProp="label"
                  />
                ) : (
                  <Input />
                )}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
}
