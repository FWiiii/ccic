import { useState, type ReactNode } from "react";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  useCreate,
  useCustomMutation,
  useDelete,
  useUpdate,
} from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import {
  Button,
  Empty,
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

  if (typeof value === "string") {
    const isoDateTimePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

    if (isoDateTimePattern.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = parsed.getMonth() + 1;
        const day = parsed.getDate();
        const hour = String(parsed.getHours()).padStart(2, "0");
        const minute = String(parsed.getMinutes()).padStart(2, "0");
        const second = String(parsed.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
    }
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatBytes(value: unknown) {
  const bytes = Number(value ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      okText: "删除",
      cancelText: "取消",
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

  let columns: TableColumnsType<Record<string, unknown>> = fields
    .filter(
      (field) =>
        !field.hideInTable &&
        !(resource === "media" && ["mimeType", "sizeBytes", "width", "height"].includes(field.key))
    )
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

  if (resource === "media") {
    const mediaInfoColumn = {
      title: "图片信息",
      key: "assetInfo",
      dataIndex: "assetInfo",
      render: (_value: unknown, record: Record<string, unknown>) => {
        const width = Number(record.width ?? 0);
        const height = Number(record.height ?? 0);
        const hasResolution =
          Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
        const sizeText = formatBytes(record.sizeBytes);

        if (hasResolution && sizeText !== "-") {
          return `${width} x ${height} | ${sizeText}`;
        }

        if (hasResolution) {
          return `${width} x ${height}`;
        }

        return sizeText;
      },
    };

    const urlColumnIndex = columns.findIndex((column) => String(column.key ?? "") === "url");
    if (urlColumnIndex >= 0) {
      columns.splice(urlColumnIndex + 1, 0, mediaInfoColumn);
    } else {
      columns.unshift(mediaInfoColumn);
    }
  }

  columns.push({
    title: "操作",
    key: "actions",
    width: 260,
    render: (_: unknown, record: Record<string, unknown>) => (
      <Space wrap className="crud-action-space" size={4}>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => void openEdit(record)}>
          {"编辑"}
        </Button>
        {publishResource ? (
          <>
            <Button
              size="small"
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => void publish(record, "PUBLISHED")}
            >
              {"发布"}
            </Button>
            <Button size="small" type="text" icon={<StopOutlined />} onClick={() => void publish(record, "DRAFT")}>
              {"下线"}
            </Button>
          </>
        ) : null}
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
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

  const pagination =
    tableProps.pagination && typeof tableProps.pagination === "object"
      ? {
          ...tableProps.pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number, range: [number, number]) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }
      : tableProps.pagination;

  const totalRecords =
    tableProps.pagination && typeof tableProps.pagination === "object"
      ? Number(tableProps.pagination.total ?? 0)
      : 0;

  return (
    <div className="crud-page">
      <div className="crud-header">
        <div className="crud-header-main">
          <h2>{title}</h2>
          <span className="crud-subtitle">共 {totalRecords} 条记录</span>
        </div>
        <Space className="crud-header-actions" size={[8, 8]} wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void tableQueryResult?.refetch()}>
            {"刷新"}
          </Button>
          {headerActions}
          {allowCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {"新增"}
            </Button>
          ) : null}
        </Space>
      </div>

      <div className="crud-table-card">
        <Table
          {...tableProps}
          rowKey="id"
          columns={columns}
          loading={Boolean(loading)}
          size="middle"
          pagination={pagination}
          rowClassName={(_, index) => (index !== undefined && index % 2 === 0 ? "crud-row-even" : "crud-row-odd")}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />,
          }}
          scroll={{ x: 1200 }}
        />
      </div>

      <Modal
        className="crud-modal"
        open={isModalOpen}
        title={editingRecord ? `编辑${title}` : `新增${title}`}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={Boolean(creating || updating || loadingFormValues)}
        okText="保存"
        cancelText="取消"
        maskClosable={false}
        destroyOnClose
        width={860}
      >
        <Form form={form} layout="vertical" className="crud-form-grid" onFinish={(values) => void submitForm(values)}>
          <div className="crud-form-grid-inner">
            {fields.filter((field) => !field.hideInForm).map((field) => {
              const fieldType = field.type ?? "text";
              const isFullWidthField =
                fieldType === "textarea" ||
                field.key.toLowerCase().includes("html") ||
                field.key.toLowerCase().includes("description");

              return (
                <Form.Item
                  className={isFullWidthField ? "crud-field-full" : "crud-field-half"}
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
          </div>
        </Form>
      </Modal>
    </div>
  );
}
