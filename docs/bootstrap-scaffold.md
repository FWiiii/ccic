# CCIC 可开工脚手架（v1）

这版按你当前项目现状（React 前端 + 未来要接数据库与后台）设计，目标是：

- 前台只负责展示，不再硬编码商品/图片/追溯内容
- 后台负责录入、上传、发布
- API 统一对外提供查询与管理接口
- 一套数据库先跑通，后续可平滑扩展

## 1) 目录脚手架

```text
ccic/
├─ apps/
│  ├─ web/                     # 前台站点（现有）
│  │  ├─ src/
│  │  ├─ index.html
│  │  └─ ...
│  ├─ admin/                   # 后台管理系统（新增）
│  │  ├─ src/
│  │  │  ├─ pages/
│  │  │  │  ├─ products/
│  │  │  │  ├─ companies/
│  │  │  │  ├─ trace-codes/
│  │  │  │  └─ media/
│  │  │  ├─ components/
│  │  │  ├─ api/
│  │  │  └─ app.tsx
│  │  ├─ package.json
│  │  └─ vite.config.ts
│  └─ api/                     # 后端服务（新增）
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ common/            # 鉴权、错误处理、日志、中间件
│     │  ├─ modules/
│     │  │  ├─ auth/
│     │  │  ├─ media/
│     │  │  ├─ products/
│     │  │  ├─ companies/
│     │  │  └─ traces/
│     │  └─ db/
│     ├─ prisma/               # 或 drizzle 目录（二选一）
│     ├─ package.json
│     └─ tsconfig.json
├─ packages/
│  ├─ shared-types/            # 前后端共享 DTO/类型
│  │  └─ src/
│  │     ├─ trace.ts
│  │     ├─ product.ts
│  │     └─ media.ts
│  ├─ eslint-config/
│  └─ tsconfig/
├─ infra/
│  ├─ nginx/                   # 反向代理
│  └─ sql/
│     └─ 001_init_schema_postgres.sql
└─ docs/
   └─ bootstrap-scaffold.md
```

## 2) 模块职责边界

### `apps/web`（前台）

- 路由入口：`/trace/:code`（或继续保留你现有 URL 形态）
- 只调一个聚合接口：`GET /api/public/traces/{code}`
- 不直接拼接静态图片路径，统一使用接口返回 `image_url`

### `apps/admin`（后台）

- 登录与权限（RBAC）：`SUPER_ADMIN`、`EDITOR`、`VIEWER`
- 商品管理：商品基础信息、图集、展示顺序
- 企业管理：企业基础信息、企业图文介绍
- 追溯码管理：码生成、绑定商品、失效/撤销
- 追溯记录管理：时间线事件维护
- 媒体中心：上传图片、复用图片、软删除

### `apps/api`（后端）

- 对外公开接口（前台只读）
- 后台管理接口（鉴权）
- 文件上传签名接口（对象存储直传）
- 记录扫描日志、更新追溯码扫描计数

## 3) 接口最小集（先开工）

### 前台公开接口

- `GET /api/public/traces/{code}`
  - 返回：商品、企业、轮播图、企业详情图、追溯记录、产品说明

### 后台接口

- `POST /api/admin/auth/login`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/{id}`
- `GET /api/admin/companies`
- `POST /api/admin/companies`
- `POST /api/admin/media/upload-sign`
- `POST /api/admin/trace-codes`
- `PUT /api/admin/trace-codes/{id}/status`
- `POST /api/admin/trace-events`

## 4) 前台改造策略（低风险）

1. 先保留现有组件结构不动，只把硬编码数据替换成接口数据。
2. 先做 `trace page DTO` 映射层，把接口字段映射到现有组件 props。
3. 完成后再逐步把 `ProductSummary`、`ProductCarousel`、`CompanyInfoTab`、`TraceInfoTab` 从静态 import 图改成动态渲染。

## 5) 发布与部署建议

- Nginx 路由：
  - `/` -> `apps/web`
  - `/admin` -> `apps/admin`
  - `/api` -> `apps/api`
- 数据库与对象存储分离（图片不入库大字段）
- 首期先单体 API，后续再拆读写或拆媒体服务
