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
      message.error("加载编辑数据失败");
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

    message.success(mode === "edit" ? "更新成功" : "创建成功");
    closeModal();
    await tableQueryResult?.refetch();
  };

  const handleDelete = (record: Record<string, unknown>) => {
    Modal.confirm({
      title: "确认删除",
      content: "该操作不可撤销，是否继续？",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMutate({
          resource,
          id: String(record.id),
        });

        message.success("删除成功");
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

    message.success(status === "PUBLISHED" ? "发布成功" : "已下线");
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
    title: "操作",
    key: "actions",
    width: 260,
    render: (_: unknown, record: Record<string, unknown>) => (
      <Space wrap>
        <Button size="small" onClick={() => void openEdit(record)}>
          {"编辑"}
        </Button>
        {publishResource ? (
          <>
            <Button size="small" type="primary" onClick={() => void publish(record, "PUBLISHED")}>
              {"发布"}
            </Button>
            <Button size="small" onClick={() => void publish(record, "DRAFT")}>
              {"下线"}
            </Button>
          </>
        ) : null}
        <Button size="small" danger onClick={() => handleDelete(record)}>
          {"删除"}
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
          <Button onClick={() => void tableQueryResult?.refetch()}>{"刷新"}</Button>
          {allowCreate ? (
            <Button type="primary" onClick={openCreate}>
              {"新增"}
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
        title={editingRecord ? `编辑${title}` : `新增${title}`}
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
                    ? [{ required: true, message: `请输入${field.label}` }]
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
