# CCIC 部署与更新 SOP

适用环境：
- 服务器：Ubuntu 22.04
- 路径：`/opt/ccic`
- 进程：`systemd + nginx + PostgreSQL`
- CDN：Cloudflare

## 1. 首次部署（代码 + nginx + 域名 + CDN）

### 1.1 安装基础环境

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Shanghai
sudo apt install -y git curl nginx postgresql postgresql-contrib ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 1.2 拉取代码

```bash
sudo mkdir -p /opt/ccic
sudo chown -R deploy:deploy /opt/ccic
sudo -u deploy git clone <你的仓库地址> /opt/ccic
cd /opt/ccic
```

### 1.3 初始化数据库

```bash
sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ccic') THEN
    CREATE USER ccic WITH PASSWORD 'ccic123';
  END IF;
END
$$;
SELECT 'CREATE DATABASE ccic OWNER ccic'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ccic')\gexec
SQL

psql "postgres://ccic:ccic123@127.0.0.1:5432/ccic" -f infra/sql/001_init_schema_postgres.sql
```

### 1.4 安装依赖与 Prisma

```bash
cd /opt/ccic
npm install
npx prisma generate --schema apps/api/prisma/schema.prisma
```

### 1.5 配置环境变量

`apps/api/.env` 示例：

```env
DATABASE_URL=postgres://ccic:ccic123@127.0.0.1:5432/ccic
PORT=4000
CORS_ORIGINS=https://cciccloudl.com,https://www.cciccloudl.com,https://admin.cciccloudl.com,https://api.cciccloudl.com
ENABLE_LEGACY_TRACE_APIS=false
ADMIN_SESSION_TTL_HOURS=720
ADMIN_SESSION_CLEANUP_INTERVAL_MINUTES=60
ADMIN_SESSION_REVOKED_RETENTION_HOURS=168
ADMIN_PASSWORD_BCRYPT_COST=12
```

`apps/web/.env.production`：

```env
INTERNAL_API_BASE_URL=http://127.0.0.1:4000
NEXT_PUBLIC_API_BASE_URL=
```

### 1.6 构建三端

```bash
cd /opt/ccic
set -a && . apps/web/.env.production && set +a
npm run build:web
npm run build:admin
npm run build:api
```

### 1.7 配置 systemd

`/etc/systemd/system/ccic-api.service`：

```ini
[Unit]
Description=CCIC API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/ccic/apps/api
Environment=NODE_ENV=production
EnvironmentFile=/opt/ccic/apps/api/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/ccic-web.service`（推荐 `next start` 模式）：

```ini
[Unit]
Description=CCIC Web Next.js Service
After=network.target ccic-api.service
Wants=ccic-api.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/ccic/apps/web
Environment=NODE_ENV=production
EnvironmentFile=-/opt/ccic/apps/web/.env.production
ExecStartPre=/usr/bin/test -f /opt/ccic/apps/web/.next/BUILD_ID
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

加载与启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ccic-api ccic-web
sudo systemctl status ccic-api ccic-web --no-pager
```

### 1.8 配置 nginx

`/etc/nginx/sites-available/ccic.conf`：

```nginx
server {
    listen 80;
    server_name cciccloudl.com www.cciccloudl.com admin.cciccloudl.com api.cciccloudl.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.cciccloudl.com;
    ssl_certificate /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://127.0.0.1:4000;
    }
}

server {
    listen 443 ssl http2;
    server_name cciccloudl.com www.cciccloudl.com;
    ssl_certificate /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location /_next/static/ {
        alias /opt/ccic/apps/web/.next/static/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://127.0.0.1:4000;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.cciccloudl.com;
    ssl_certificate /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    root /opt/ccic/apps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://127.0.0.1:4000;
    }
}
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/ccic.conf /etc/nginx/sites-enabled/ccic.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 1.9 Cloudflare 域名/CDN

DNS（A 记录，均指向服务器公网 IP，建议橙云代理开启）：
- `@`
- `www`
- `admin`
- `api`

SSL/TLS：
- 模式：`Full (strict)`
- 开启：`Always Use HTTPS`

缓存规则：
- `/api/*`：Bypass cache
- `/_next/static/*`：可缓存 7 天（按需调整）

### 1.10 验收

```bash
curl -s http://127.0.0.1:4000/health
curl -I http://127.0.0.1:3000/
curl -I https://cciccloudl.com/
curl -I https://admin.cciccloudl.com/
curl -I https://api.cciccloudl.com/health
```

## 2. 日常更新上线（拉代码后发布）

### 2.1 拉取代码

```bash
cd /opt/ccic
git fetch origin
git checkout master
git pull --ff-only origin master
```

### 2.2 安装依赖并生成 Prisma

```bash
cd /opt/ccic
npm install
npx prisma generate --schema apps/api/prisma/schema.prisma
```

### 2.3 重建

```bash
cd /opt/ccic
set -a && . apps/web/.env.production && set +a
npm run build:web
npm run build:admin
npm run build:api
```

### 2.4 重启服务

```bash
sudo systemctl restart ccic-api
sudo systemctl restart ccic-web
sudo nginx -t && sudo systemctl reload nginx
```

### 2.5 发布后检查

```bash
sudo systemctl status ccic-api ccic-web --no-pager
curl -s http://127.0.0.1:4000/health
curl -I http://127.0.0.1:3000/
curl -I https://cciccloudl.com/
```

## 3. 回滚（建议每次发布前打 tag）

发布前打备份 tag：

```bash
cd /opt/ccic
git tag deploy-backup-$(date +%F-%H%M%S)
```

回滚：

```bash
cd /opt/ccic
git checkout <备份tag或旧commit>
npm install
set -a && . apps/web/.env.production && set +a
npm run build:web
npm run build:admin
npm run build:api
sudo systemctl restart ccic-api ccic-web
sudo nginx -t && sudo systemctl reload nginx
```
