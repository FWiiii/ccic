# CCIC Admin Inspection Batch Create Design

## Goal

在 `apps/admin` 的鉴定单管理页新增“批量生成鉴定单”能力，支持针对同一商品、同一送检公司，按“起始 SN + 数量”连续生成多条鉴定单编号，并在遇到已存在 SN 时自动跳过冲突项。

## Background

当前后台鉴定单管理仅支持单条新增，入口位于 [apps/admin/src/resources/pages.tsx](/home/fw/project/ccic/apps/admin/src/resources/pages.tsx)，底层复用 [apps/admin/src/components/CrudResourcePage.tsx](/home/fw/project/ccic/apps/admin/src/components/CrudResourcePage.tsx) 的通用列表与弹窗表单能力。

后端当前仅提供单条鉴定单 CRUD：

- `GET /api/admin/inspections`
- `POST /api/admin/inspections`
- `PUT /api/admin/inspections/:id`
- `DELETE /api/admin/inspections/:id`

对应实现位于 [apps/api/src/admin/admin.controller.ts](/home/fw/project/ccic/apps/api/src/admin/admin.controller.ts)。

用户场景是：

- 同一个型号的产品
- 同一家送检公司
- 需要快速生成很多连续编号的鉴定单

已确认的业务规则：

- SN 生成方式选择“起始号 + 数量”连续生成
- 其它字段由用户在批量弹窗中统一填写一次后套用到全部记录
- 若号段中部分 SN 已存在，自动跳过已存在项，只创建剩余可用项

## Scope

本次设计覆盖：

- 在鉴定单管理页增加“批量生成”入口
- 增加批量生成弹窗与表单校验
- 新增后端批量创建接口
- 按连续数值规则生成 SN，并保留原始位数补零
- 对已存在 SN 执行“跳过而非整批失败”
- 生成完成后返回创建与跳过摘要
- 增加最小必要的自动化测试

本次设计不覆盖：

- 批量导入 Excel / CSV
- 非数字前缀 SN 规则
- 按模板复制图片、事件、鉴定详情等关联数据
- 已生成鉴定单的批量发布、批量删除、批量编辑
- 数据库表结构变更

## Architecture Decision

采用“前端批量弹窗 + 后端专用批量接口”的方案。

推荐原因：

- 连续 SN 生成、冲突检查、跳过策略都应由服务端统一掌控，避免前端逐条循环调用现有单条接口造成性能差、反馈碎片化和一致性问题。
- 现有 [apps/admin/src/providers/data-provider.ts](/home/fw/project/ccic/apps/admin/src/providers/data-provider.ts) 已支持标准资源 CRUD，本次批量能力可以通过 `requestJson` / 自定义请求补充，不需要扭曲通用 `dataProvider` 语义。
- 当前 `Inspection` 数据结构已包含批量创建所需全部字段，见 [apps/api/src/database/database.types.ts](/home/fw/project/ccic/apps/api/src/database/database.types.ts) 与 [apps/api/prisma/schema.prisma](/home/fw/project/ccic/apps/api/prisma/schema.prisma)，无需增加表字段。

拒绝的替代方案：

- 前端循环调用 `POST /api/admin/inspections`
  - 会把冲突处理和部分成功逻辑分散到浏览器端，不利于稳定性和后续维护。
- 批量导入文件
  - 对当前“同商品、同公司、连续号段”的固定场景明显过重。

## UI Entry Design

入口放在鉴定单管理页头部操作区，与现有“刷新”“新增”同级。

实现位置：

- [apps/admin/src/resources/pages.tsx](/home/fw/project/ccic/apps/admin/src/resources/pages.tsx)
- 必要时扩展 [apps/admin/src/components/CrudResourcePage.tsx](/home/fw/project/ccic/apps/admin/src/components/CrudResourcePage.tsx) 的 `headerActions` 使用方式，但不改动其通用新增/编辑主流程

新增按钮文案：

- `批量生成`

点击后打开独立弹窗，不复用现有“单条新增鉴定单”弹窗，避免把两套行为混进同一个表单组件。

## Batch Form Design

批量弹窗字段如下：

- `productId`：商品，必填，下拉选择
- `companyId`：送检公司，必填，下拉选择
- `startSn`：起始 SN，必填，纯数字字符串
- `count`：生成数量，必填，正整数
- `inspectionTime`：送检时间，必填，统一套用
- `result`：鉴定结果，必填，统一套用
- `status`：发布状态，必填，统一套用

交互要求：

- 默认值可复用现有单条新增逻辑的默认语义：
  - `inspectionTime` 默认当前时间 ISO 字符串
  - `result` 默认 `PENDING`
  - `status` 默认 `DRAFT`
- `count` 需要在表单层限制最小值为 `1`
- `startSn` 输入时不自动格式化，避免用户感知混乱；最终由提交校验决定是否合法

## SN Generation Rules

SN 生成规则必须固定、可预测、可测试：

1. `startSn` 必须是纯数字字符串，例如 `0000123000`
2. 将其按十进制数值递增生成 `count` 个候选 SN
3. 输出时保留 `startSn` 原始长度，左侧补零
4. 示例：
   - `startSn=0000123000`
   - `count=3`
   - 候选 SN 为 `0000123000`、`0000123001`、`0000123002`

边界规则：

- 若递增后位数超出原长度，例如 `9999 + 1 -> 10000`，仍以真实数值字符串输出，不截断
- `startSn` 只接受整数语义，不接受负数、小数、空格混排或字母前缀
- 递增实现必须使用整数安全方案处理字符串数值，不能依赖普通 `Number` 做大位数 SN 运算
- 单次生成数量设置上限，首版建议 `500`，用于控制误操作和请求耗时

## API Contract Design

新增接口：

- `POST /api/admin/inspections/batch-create`

请求体：

```json
{
  "productId": "product-id",
  "companyId": "company-id",
  "startSn": "0000123000",
  "count": 100,
  "inspectionTime": "2026-03-23T10:00:00.000Z",
  "result": "PENDING",
  "status": "DRAFT"
}
```

成功响应：

```json
{
  "data": {
    "createdCount": 96,
    "skippedCount": 4,
    "created": [
      {
        "id": "inspection-id",
        "sn": "0000123000",
        "productId": "product-id",
        "companyId": "company-id",
        "inspectionTime": "2026-03-23T10:00:00.000Z",
        "result": "PENDING",
        "status": "DRAFT",
        "conclusion": "待出结果",
        "createdAt": "2026-03-23T10:01:00.000Z",
        "updatedAt": "2026-03-23T10:01:00.000Z"
      }
    ],
    "skippedSnList": ["0000123007", "0000123011"]
  }
}
```

错误响应：

- `400`
  - `productId` / `companyId` 缺失
  - `startSn` 非纯数字
  - `count` 非法或超上限
  - `inspectionTime` 为空
  - `result` / `status` 不在允许枚举中
- `400`
  - `productId` 或 `companyId` 不存在

本接口不应因为存在部分重复 SN 而返回错误；重复项属于正常“跳过”结果。

即使全部候选 SN 都已存在，只要请求体合法，接口仍返回 `200`，其中：

- `createdCount = 0`
- `skippedCount = count`
- `created = []`

## Backend Logic Design

实现位于 [apps/api/src/admin/admin.controller.ts](/home/fw/project/ccic/apps/api/src/admin/admin.controller.ts)。

服务端处理流程：

1. 解析并校验请求体
2. 校验商品、公司是否存在
3. 生成完整候选 SN 列表
4. 查询现有鉴定单中已占用的 SN
5. 将候选列表拆分为：
   - 可创建列表
   - 跳过列表
6. 为可创建列表批量构造 `Inspection` 记录：
   - `id` 使用现有 `databaseService.newId()`
   - `conclusion` 使用现有 `resolveInspectionConclusion`
   - `createdAt` / `updatedAt` 统一使用当前时间
7. 将新记录插入数据库
8. 返回 `createdCount / skippedCount / created / skippedSnList`

设计要求：

- 使用单次批量请求完成，而不是复用单条接口循环创建
- 跳过列表按 SN 升序或生成顺序返回，保持结果可预期
- 可创建记录的顺序必须与候选号段顺序一致，便于用户核对

## Admin Feedback Design

前端提交成功后显示摘要提示：

- 仅创建成功、无跳过：
  - `成功生成 100 条鉴定单`
- 同时存在创建与跳过：
  - `成功生成 96 条，跳过 4 条`

若存在跳过项，界面应继续向用户展示冲突 SN 摘要：

- 首版可使用 `message.success` + `Modal.info`
- 或使用一条更长的成功提示，附带前若干个 `skippedSnList`

首版建议：

- 成功 toast 展示总结果
- 若 `skippedCount > 0`，再弹出信息框展示前 `20` 个跳过 SN，超出则以“等 N 个”收尾

提交成功后必须刷新鉴定单列表。

## Data Model Impact

本次不修改数据库 schema。

原因：

- 批量生成仅是创建 `inspections` 记录的新入口
- 现有 `Inspection` 模型字段已完整覆盖本次需求
- 与 `inspection_images`、`inspection_events` 等附属表无直接联动要求

## Validation Rules

前后端都需要做输入校验，但以服务端为最终准绳。

前端校验：

- 必填项不能为空
- `count >= 1`
- `count <= 500`
- `startSn` 必须匹配纯数字格式

后端校验：

- 重新校验上述全部规则
- `productId` / `companyId` 必须存在
- `result` 必须为 `PASS | FAIL | PENDING`
- `status` 必须为 `DRAFT | REVIEWED | PUBLISHED | REVOKED`

## Testing Strategy

首版至少覆盖以下自动化测试：

### API Behavior

- 正常生成连续 SN，验证补零规则正确
- 部分 SN 已存在时，仅跳过冲突项，其余照常创建
- `startSn` 非数字时报错
- `count` 小于 `1` 或大于上限时报错
- `productId` / `companyId` 不存在时报错

### Admin Behavior

- 批量弹窗能正常提交必填字段
- 成功后触发列表刷新
- 有跳过项时能正确展示摘要信息

若当前仓库缺少前端自动化测试基础设施，允许首版至少补足后端接口级测试，并在实现说明中明确 admin 侧采用手工验证。

## Rollout Notes

这是纯后台能力增强：

- 不影响前台 `apps/web` SSR 页面
- 不影响现有单条鉴定单新增/编辑流程
- 不需要数据库迁移

发布风险主要集中在：

- SN 递增与补零逻辑
- 跳过重复 SN 时的结果统计是否准确
- 前端成功提示是否与实际创建结果一致

## Open Questions Resolved

以下需求已在设计阶段确认，不再留作实现时猜测：

- SN 规则：使用“起始号 + 数量”连续生成
- 字段套用：`inspectionTime / result / status` 在批量弹窗中统一填写一次
- 冲突策略：已存在 SN 自动跳过，不整批失败
