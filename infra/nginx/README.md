# Nginx 预留目录

该目录用于后续放置网关/反向代理配置模板（例如本地联调或生产部署的 `server` 配置）。

当前仓库默认开发流程（`npm run dev:*`）不依赖本目录。

建议后续在此目录新增：

- `default.conf`（基础反代）
- `docker-compose` 相关引用（如需要）
