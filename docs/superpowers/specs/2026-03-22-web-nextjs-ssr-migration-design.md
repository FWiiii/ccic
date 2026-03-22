# CCIC Web Next.js SSR Migration Design

## Goal

将 `apps/web` 从当前 `Vite + React` 单页客户端渲染应用迁移为独立的 `Next.js` 前台应用，实现全站 SSR，优先解决鉴定结果页首屏图片和首屏数据只能在浏览器二次请求后才能出现的问题。

## Background

当前前台存在以下结构性限制：

- [apps/web/src/main.tsx](/home/fw/project/ccic/apps/web/src/main.tsx) 只提供浏览器入口，没有服务端渲染入口。
- [apps/web/src/App.tsx](/home/fw/project/ccic/apps/web/src/App.tsx) 在客户端根据路径和查询参数切换页面。
- [apps/web/src/hooks/useRouteType.ts](/home/fw/project/ccic/apps/web/src/hooks/useRouteType.ts) 直接依赖 `window.location`。
- [apps/web/src/hooks/useInspectionQuery.ts](/home/fw/project/ccic/apps/web/src/hooks/useInspectionQuery.ts) 通过 `useEffect` 在浏览器端请求鉴定接口。
- 鉴定结果页的商品图片依赖接口返回的 `product.images`，因此首屏 HTML 不包含图片 URL，图片必然晚于 HTML 出现。

用户要求：

- 全站使用 SSR，不仅是带 `sn` 的结果页。
- 接受前台部署方式从静态站切换为 `nginx -> Node SSR 进程`。
- 最终需要提供 `nginx` 修改方案。
- 方案路线选择为迁移到 `Next.js`，不保留 `Vite SPA` 作为主运行形态。

## Scope

本次设计覆盖：

- `apps/web` 前台迁移到 `Next.js App Router`
- 全站 SSR：`/`、`/search`、`/feedback`、`/?sn=...`
- 首屏数据服务端预取
- 首张商品图首屏服务端输出
- 客户端交互岛保留
- 生产部署改为 `nginx -> Next.js Node SSR 进程`
- 补充 `systemd` 和 `nginx` 部署调整方案

本次设计不覆盖：

- `apps/admin` 迁移到 SSR
- `apps/api` 业务接口语义改造
- SEO 文案专项优化
- CDN 缓存策略细化到运营级配置

## Architecture Decision

采用独立前台应用迁移方案：

- `apps/web` 改为独立 `Next.js` 应用，负责页面路由、服务端渲染、首屏数据获取、客户端水合。
- `apps/api` 继续保留为后端 API 服务，继续提供公共鉴定查询接口，例如 [apps/api/src/public/public.controller.ts](/home/fw/project/ccic/apps/api/src/public/public.controller.ts)。
- `nginx` 继续作为统一入口层，但前台域名不再直接托管静态 `dist`，改为反向代理到 `apps/web` 的 Node 进程。

拒绝的替代方案：

- 保留 `Vite` 并手工补 SSR：改动可控，但用户明确选择迁移到 `Next.js`。
- 将 React SSR 合并进 `apps/api`：会导致前台渲染与 API 进程强耦合，发布和职责边界变差。

## Target URL Behavior

迁移后保留现有对外 URL 形式，避免影响已发出的二维码和外链：

- `/?sn=<value>`：鉴定结果页，服务端读取 `searchParams.sn` 后预取数据并渲染。
- `/` 且无 `sn`：显示当前查询入口页面。
- `/search`：查询页，服务端渲染页面骨架。
- `/feedback`：反馈页，服务端渲染页面骨架。

结果页的 404 / 无效 `sn` 行为改为服务端直接返回已渲染的未找到页面，而不是客户端先进入空态再切换。

## Route Design

`Next.js` 页面结构按 `App Router` 组织：

- `apps/web/app/page.tsx`
  - 负责 `/`，根据 `searchParams.sn` 决定渲染结果页或查询页。
- `apps/web/app/search/page.tsx`
  - 负责 `/search`。
- `apps/web/app/feedback/page.tsx`
  - 负责 `/feedback`。
- `apps/web/app/layout.tsx`
  - 负责全局 HTML 外壳、全局样式加载和共享页框。

该结构允许外部 URL 保持不变，同时不再需要一个客户端入口组件统一判断路径。

## Data Flow

### Result Page

结果页服务端数据流如下：

1. `app/page.tsx` 在服务端读取 `searchParams.sn`。
2. 若 `sn` 为空，直接渲染查询页。
3. 若 `sn` 非空，服务端请求 `apps/api` 的公共鉴定接口：
   - `GET /api/v1/public/inspection?sn=<value>`
4. 服务端拿到鉴定数据后，在页面层完成展示模型整理：
   - 商品名
   - 送检方/公司名
   - 鉴定时间
   - 鉴定结论
   - 商品图片列表
5. 页面 HTML 直接输出首屏结构和首张图片 URL。
6. 客户端 hydrate 后仅接管交互能力，不再负责决定首屏内容。

### Search and Feedback Pages

- `/search` 与 `/feedback` 不需要依赖首屏鉴定接口。
- 这两个页面仍使用 SSR 输出 HTML，但保留客户端交互行为。
- 若后续需要动态读取查询参数或客户端校验，使用客户端组件承接，不影响全站 SSR 架构。

### Client Revalidation

- 首屏主路径以服务端数据为准。
- 客户端可保留轻量补拉能力，用于页面驻留后的重新校验或交互刷新。
- 客户端补拉不能覆盖“首屏由服务端直接输出”的主目标。

## Data Access Design

新增前台内部数据访问层，职责如下：

- 在服务端环境中调用 API 时优先使用 `INTERNAL_API_BASE_URL`。
- 在确实需要客户端发请求的场景中使用 `NEXT_PUBLIC_API_BASE_URL`。
- 对鉴定查询接口统一做错误分类：
  - `200`：正常数据
  - `404`：渲染未找到页
  - 其他状态：渲染错误提示页或错误消息区

约束：

- 页面组件不得直接散落写 `fetch("/api/...")`。
- 当前 [apps/web/src/api/publicInspection.ts](/home/fw/project/ccic/apps/web/src/api/publicInspection.ts) 的请求和类型定义需要迁移到 Next 可同时供服务端与客户端使用的位置。
- 与 React 无关的展示模型整理逻辑应提炼为纯函数，不能继续依赖 Hook 才能运行。

## Component Boundary Design

采用“服务端页面 + 客户端交互岛”的边界：

### Server Components

以下内容优先以服务端可渲染组件承接：

- 页面级组件
- 页面骨架
- 商品摘要展示
- 页脚
- 首屏文案和结果信息
- 未找到页和错误页的静态部分

现有可直接迁移或轻量改造的组件包括：

- [apps/web/src/components/ProductSummary.tsx](/home/fw/project/ccic/apps/web/src/components/ProductSummary.tsx)
- [apps/web/src/components/PageFooter.tsx](/home/fw/project/ccic/apps/web/src/components/PageFooter.tsx)
- [apps/web/src/components/HeroImage.tsx](/home/fw/project/ccic/apps/web/src/components/HeroImage.tsx)
- [apps/web/src/pages/SearchPage.tsx](/home/fw/project/ccic/apps/web/src/pages/SearchPage.tsx)
- [apps/web/src/pages/FeedbackPage.tsx](/home/fw/project/ccic/apps/web/src/pages/FeedbackPage.tsx)
- [apps/web/src/pages/TraceNotFoundPage.tsx](/home/fw/project/ccic/apps/web/src/pages/TraceNotFoundPage.tsx)

### Client Components

以下内容保留为客户端组件：

- 轮播切换
- 图片预览弹层
- 顶部 tab 切换
- 触摸滑动
- 需要 `useState` / DOM 事件 / 浏览器 API 的局部交互

现有客户端交互组件包括：

- [apps/web/src/components/ProductCarousel.tsx](/home/fw/project/ccic/apps/web/src/components/ProductCarousel.tsx)
- [apps/web/src/components/ImagePreviewModal.tsx](/home/fw/project/ccic/apps/web/src/components/ImagePreviewModal.tsx)
- [apps/web/src/components/TopTabs.tsx](/home/fw/project/ccic/apps/web/src/components/TopTabs.tsx)

### Logic Migration Rules

- [apps/web/src/hooks/useRouteType.ts](/home/fw/project/ccic/apps/web/src/hooks/useRouteType.ts) 不再作为主路由判定层保留。
- [apps/web/src/hooks/useInspectionQuery.ts](/home/fw/project/ccic/apps/web/src/hooks/useInspectionQuery.ts) 不再决定首屏内容，可重构为客户端兜底刷新能力，或在首版迁移中删除。
- [apps/web/src/hooks/useInspectionDisplayModel.ts](/home/fw/project/ccic/apps/web/src/hooks/useInspectionDisplayModel.ts) 的数据整理逻辑应迁移为纯函数模块，供服务端页面和客户端组件共同使用。

## Image Rendering Strategy

图片优化目标不是单纯切换图片组件，而是让图片 URL 在服务端首屏就可用。

设计要求：

- 首张商品图必须在服务端已拿到 URL，并包含在首屏 HTML 中。
- 轮播首张图应以高优先级加载。
- 非首图保留懒加载。
- 若使用 `next/image`，需要为远程媒体域名补充 `next.config.js` 白名单配置。
- 若首版为了降低迁移复杂度保留原生 `img`，也必须保留 SSR 首图直出和后续懒加载策略。

第一版允许两种实现方式，但默认推荐：

- 首版先保留现有 `<img>` 渲染结构，优先完成 SSR 数据流迁移。
- 第二步再视需要切换到 `next/image`。

这样能避免把“框架迁移风险”和“远程图片配置风险”绑死在一个提交里。

## Styling and Asset Strategy

保留现有样式资产为主：

- 继续复用 [apps/web/src/assets/template/mu/static/css](/home/fw/project/ccic/apps/web/src/assets/template/mu/static/css)
- 继续复用 [apps/web/src/styles/app.css](/home/fw/project/ccic/apps/web/src/styles/app.css)
- 将当前浏览器入口中的全局样式导入迁移到 `app/layout.tsx` 或 Next 允许的全局样式入口

约束：

- 首版迁移不做 UI 视觉重构。
- 保持现有页面外观和信息结构基本一致。
- 样式导入顺序需与现有入口接近，减少迁移后的视觉回归。

## Error Handling

服务端渲染需要明确区分三类状态：

- 缺少 `sn`
  - 渲染查询页，不视为错误。
- `sn` 存在但接口返回 `404`
  - 渲染未找到页。
- `sn` 存在但接口请求失败或返回异常
  - 渲染错误提示区，并保留当前已有的人工联系提示。

要求：

- 不允许服务端直接把接口异常以原始堆栈暴露给用户。
- 错误映射规则应集中在数据访问层，而不是散落在多个页面组件中。

## Deployment Design

生产环境部署从“静态站”切换为“Node SSR 服务”：

- `apps/web` 不再产出 `dist` 作为主前台部署物。
- 改为标准 `Next.js build + start` 运行方式。
- 推荐启用 `output: "standalone"`，降低生产依赖和运行目录复杂度。
- 新增 `ccic-web.service`，常驻监听本地端口，例如 `127.0.0.1:3000`。
- `apps/api` 继续通过 `ccic-api.service` 监听 `127.0.0.1:4000`。

建议的生产职责分配：

- `nginx`
  - TLS 终止
  - 域名分发
  - 静态资源缓存
  - 反向代理到 `web` / `api`
- `ccic-web`
  - Next SSR 渲染
  - 页面 HTML 响应
- `ccic-api`
  - 业务数据接口

## Nginx Change Plan

当前前台域名配置以静态托管为核心，类似：

```nginx
root /opt/ccic/apps/web/dist;
index index.html;

location / {
    try_files $uri $uri/ /index.html;
}
```

迁移后前台域名配置改为反向代理至 Next SSR 进程：

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    client_max_body_size 20m;

    location /_next/static/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_pass http://127.0.0.1:3000;
    }

    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:4000;
    }
}
```

`apps/admin` 如未迁移，继续保持静态托管即可。

## Systemd Change Plan

新增前台服务：

- 服务名：`ccic-web.service`
- 工作目录：`/opt/ccic/apps/web`
- 启动命令：
  - 若使用标准模式：`next start -p 3000`
  - 若使用 standalone：`node .next/standalone/server.js`

服务要求：

- 自动重启
- 仅监听本机地址
- 环境变量中注入 API 基地址和运行模式

## Migration Strategy

迁移分为五个阶段：

1. 初始化 `Next.js` 基础骨架和脚本，替换 `Vite` 为主入口
2. 迁移全局样式和静态资源，恢复现有视觉表现
3. 迁移结果页 SSR 数据流，确保 `/?sn=...` 服务端可直出
4. 迁移 `/search` 和 `/feedback` 页面
5. 补齐生产构建、`systemd`、`nginx` 配置和上线验证

阶段要求：

- 在任一阶段结束时，前台都应保持可运行。
- 结果页 SSR 是最关键验收点。
- 完成前不得保留“Vite SPA 和 Next SSR 双主入口并行”的长期结构。

## Verification Strategy

设计要求后续实现至少覆盖以下验证：

- 本地启动 Next 开发服务器并访问：
  - `/`
  - `/?sn=<valid-sn>`
  - `/?sn=<invalid-sn>`
  - `/search`
  - `/feedback`
- 查看结果页首屏 HTML，确认商品首图 URL 已出现在服务端输出中。
- 验证客户端 hydrate 后：
  - 轮播可滑动
  - tab 可切换
  - 图片预览弹层可打开关闭
- 验证接口错误、404、缺少 `sn` 三类分支。
- 验证生产构建和 Node 启动流程可运行。
- 验证 `nginx` 转发后前台、后台、API 三域名互不冲突。

## Risks

主要风险如下：

- 现有前台页面结构由单个 [apps/web/src/App.tsx](/home/fw/project/ccic/apps/web/src/App.tsx) 管理，迁到 App Router 时容易出现职责拆分不清。
- 当前样式资产偏传统，迁入 Next 后若全局样式导入顺序不一致，容易出现视觉回归。
- 若直接同时引入 `next/image` 和远程媒体白名单配置，可能增加首轮迁移复杂度。
- 生产部署方式变化会影响现有上线脚本和运维手册。

风险缓解策略：

- 先完成 SSR 数据流，再考虑图片组件升级。
- 先保持 URL 和视觉结构不变。
- 将部署变更写成明确的 `systemd` 与 `nginx` 配置更新项，不依赖隐含约定。

## Acceptance Criteria

当且仅当以下条件全部满足，认为该设计目标达成：

- `apps/web` 已迁移到 `Next.js` 并作为独立前台应用运行。
- 全站页面由服务端渲染输出 HTML。
- `/?sn=<valid-sn>` 首屏 HTML 中包含商品首图 URL 和核心鉴定信息。
- `/?sn=<invalid-sn>` 服务端直接渲染未找到页。
- `/search` 和 `/feedback` 通过 Next 页面交付，不再依赖原始 SPA 路由分支。
- 前台生产部署改为 `nginx -> ccic-web Node SSR`。
- 提供可落地的 `nginx` 配置修改方案。

