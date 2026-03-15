# CCIC 鉴定查询项目实施方案（合并版）

最后更新：2026-03-15

## 1. 业务目标

二维码打开地址：

- `http://localhost:5173/trace?sn=0000123456`

其中 `sn` 是商品检验码。前台需要根据 `sn` 展示：

- 商品名称
- 送检公司名称
- 送检时间
- 检测图片
- 检测历史轨迹
- 鉴定结论（PASS/FAIL/PENDING）

固定业务约束：

- 鉴定机构固定为：`中国检验认证集团奢侈品鉴定中心`
- 后台选择的公司是“送检公司”（如“省向体育”）

## 2. 当前项目结构（以代码为准）

```text
ccic/
├─ apps/
│  ├─ web/                      # 前台（Vite + React）
│  ├─ admin/                    # 后台（Refine + Ant Design）
│  └─ api/                      # 后端（NestJS）
├─ packages/
│  └─ shared-types/             # 共享类型
├─ infra/
│  └─ sql/001_init_schema_postgres.sql
├─ docs/
│  └─ bootstrap-scaffold.md
└─ IMPLEMENTATION_PLAN.md       # 本文档（权威）
```

## 3. 已完成（按当前代码）

### 3.1 数据模型（JSON 存储）

已引入 inspection 聚合模型：

- `inspections`
- `inspectionImages`
- `inspectionEvents`
- `products`
- `companies`（用于“送检公司”）
- `mediaAssets`

数据文件：`apps/api/data/db.json`

### 3.2 公开接口

已实现：

- `GET /api/v1/public/inspection?sn={sn}`
- 兼容：`GET /api/public/inspection?sn={sn}`

返回包含：

- `inspectionAgencyName`（固定机构）
- `inspection`
- `product`
- `company`（送检公司）
- `images`
- `events`

### 3.3 后台模块（已精简）

后台仅保留以下业务模块：

- 鉴定单（`inspections`）
- 检测图片（`inspection-images`）
- 检测轨迹（`inspection-events`）
- 商品（`products`）
- 送检公司（`companies`）
- 素材（`media`）

旧“trace-*”相关后台前端菜单已移除。

### 3.4 后台管理 API（当前可用）

- `POST /api/admin/auth/login`
- `GET/POST/PUT/DELETE /api/admin/inspections`
- `POST /api/admin/inspections/:id/publish`
- `GET/POST/PUT/DELETE /api/admin/inspection-images`
- `GET/POST/PUT/DELETE /api/admin/inspection-events`
- `GET/POST/PUT/DELETE /api/admin/products`
- `GET/POST/PUT/DELETE /api/admin/companies`
- `GET/POST/PUT/DELETE /api/admin/media`

## 4. 管理流程建议（按当前系统）

1. 在“送检公司管理”维护送检方信息
2. 在“商品管理”维护商品基础信息
3. 在“鉴定单管理”创建 SN 并选择商品 + 送检公司
4. 在“检测图片”上传并绑定图片
5. 在“检测轨迹”维护时间线
6. 将鉴定单状态流转到 `PUBLISHED`
7. 前台通过 `sn` 查询展示

## 5. 待完成路线（合并后的统一路线图）

### 5.1 P1（优先）

- 前台 `apps/web` 接入 `GET /api/v1/public/inspection?sn=...`，替换静态写死内容
- 根据 `inspectionAgencyName` 固定展示鉴定机构

### 5.2 P2

- 清理后端历史 trace 接口（`trace-codes / trace-pages / trace-events`）或转为只读兼容层
- 更新 README，避免旧接口和旧模块描述混淆

### 5.3 P3

- 存储从 JSON 迁移到 PostgreSQL（可参考 `infra/sql/001_init_schema_postgres.sql`）
- 引入更完整的权限/审计模型（RBAC + 审计日志）

## 6. 部署与运维建议

- 路由建议：
  - `/` -> `apps/web`
  - `/admin` -> `apps/admin`
  - `/api` -> `apps/api`
- 图片建议使用对象存储，数据库仅存元数据
- 当前 JSON 方案适合开发联调，不建议生产环境直接使用
