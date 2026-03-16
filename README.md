# CCIC Monorepo

该仓库为三端架构：

- `apps/web`：前台追溯展示站点（按 `sn` 查询公开接口）
- `apps/admin`：后台管理（商品、送检公司、素材、鉴定单及相关轨迹）
- `apps/api`：统一后端服务（公开接口 + 后台接口）
- `packages/shared-types`：共享类型定义

## 目录

```text
apps/
  web/
  admin/
  api/
packages/
  shared-types/
infra/
  sql/
```

## 快速启动

1. 安装依赖（推荐在仓库根目录执行一次）：

```bash
npm install
```

2. 配置 API 环境变量（必须配置 `DATABASE_URL`）：

```bash
cp apps/api/.env.example apps/api/.env
```

3. 初始化 PostgreSQL 表结构：

```bash
psql "$DATABASE_URL" -f infra/sql/001_init_schema_postgres.sql
```

4. （可选）导入历史 JSON 数据：

```bash
DB_JSON_PATH="/absolute/path/to/legacy-db.json" DATABASE_URL="postgres://..." npm --prefix apps/api run db:import:json
```

说明：

- `db:import:json` 仅用于导入外部历史数据。
- 当前仓库不再内置 `apps/api/data/db.json`。
- 后端运行不支持 JSON fallback，必须连接 PostgreSQL。

5. 启动三个服务：

```bash
npm run dev:api
npm run dev:web
npm run dev:admin
```

默认地址：

- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Admin: `http://localhost:5174`

## 默认演示账号

- 后台账号：`admin`
- 后台密码：`admin123`

## 已提供关键接口

公开接口：

- `GET /api/v1/public/inspection?sn={sn}`
- `GET /api/public/inspection?sn={sn}`（兼容路径）
- `GET /api/public/traces/:code`

后台接口（鉴权）：

- `POST /api/admin/auth/login`
- `GET /api/admin/bootstrap`
- `media / companies / products / product-images / inspections / inspection-images / inspection-events` 的 CRUD
- `POST /api/admin/products/:id/publish`
- `POST /api/admin/companies/:id/publish`

## 预留目录说明

以下目录为预留扩展目录：

- `infra/nginx`
- `packages/eslint-config`
- `packages/tsconfig`

当前默认运行链路不依赖这三个目录，可按需要逐步接入。

## Legacy Trace Decommission

- Legacy trace APIs are now controlled by `ENABLE_LEGACY_TRACE_APIS` (default: `false`).
- When disabled, these endpoints return `410 Gone`:
  - `GET /api/public/traces/:code`
  - `GET /api/public/trace-pages/:sn`
  - Admin legacy trace/inspection-image endpoints under `/api/admin/*`.
- After confirming no dependency on legacy trace APIs, run:

```bash
psql "$DATABASE_URL" -f infra/sql/002_decommission_legacy_trace_tables.sql
```
