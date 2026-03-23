# Nginx 配置模板

当前仓库的前台站点已从静态 `apps/web/dist` 切换为 Next.js SSR。

本目录提供生产模板：

- `ccic-web-ssr.conf.example`
  - 前台域名 `example.com` / `www.example.com` 走 `nginx -> ccic-web(127.0.0.1:3000)`
  - `/_next/static/` 由 `nginx` 直接读取 `apps/web/.next/static`
  - `/api/` 继续反代到 `ccic-api(127.0.0.1:4000)`
  - `admin.example.com` 仍按静态站托管 `apps/admin/dist`

建议用法：

1. 将仓库中的示例文件复制到 `/etc/nginx/sites-available/ccic.conf`
2. 按实际域名、证书路径和部署目录替换占位值
3. 确认 `ccic-web.service` 已监听 `127.0.0.1:3000`
4. 执行 `sudo nginx -t && sudo systemctl reload nginx`
