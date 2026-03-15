# CCIC Monorepo

该仓库已拆分为三端架构：

- `apps/web`：前台追溯展示站点（按追溯码请求聚合接口）
- `apps/admin`：后台管理（商品、图片、企业、追溯码、追溯事件 CRUD + 发布）
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

分别安装依赖：

```bash
npm --prefix apps/api install
npm --prefix apps/web install
npm --prefix apps/admin install
```

启动三个服务（建议开三个终端）：

```bash
npm run dev:api
npm run dev:web
npm run dev:admin
```

默认地址：

- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Admin: `http://localhost:5174`

## 默认演示数据

- 演示追溯码：`CCIC-DEMO-0001`
- 后台账号：`admin`
- 后台密码：`admin123`

数据文件：`apps/api/data/db.json`

## PostgreSQL 初始化与导入

1. 执行建表脚本：

```bash
psql "$DATABASE_URL" -f infra/sql/001_init_schema_postgres.sql
```

2. 导入当前 JSON 演示数据：

```bash
DATABASE_URL="postgres://..." npm --prefix apps/api run db:import:json
```

可选环境变量：

- `DB_JSON_PATH`：指定待导入 JSON 路径（默认 `apps/api/data/db.json`）

## 已提供关键接口

公开接口：

- `GET /api/public/traces/:code`

后台接口（鉴权）：

- `POST /api/admin/auth/login`
- `GET /api/admin/bootstrap`
- `media / companies / products / product-images / trace-codes / trace-events` 的 CRUD
- `POST /api/admin/products/:id/publish`
- `POST /api/admin/companies/:id/publish`
