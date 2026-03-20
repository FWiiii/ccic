# CCIC 上线实施手册（Ubuntu 22.04 版）

更新时间：2026-03-17  
适用场景：1 台 Ubuntu 22.04 服务器 + 1 个域名 + Cloudflare CDN + 当前 `ccic` 仓库

## 0. 部署目标

完成以下线上地址：

1. `https://example.com`（前台 `apps/web`）
2. `https://admin.example.com`（后台 `apps/admin`）
3. `https://api.example.com`（API `apps/api`）

---

## 1. 先准备变量（整篇命令可复用）

先登录服务器（或本地终端）后，按实际值替换并执行：

```bash
DOMAIN_ROOT=example.com
DOMAIN_WWW=www.example.com
DOMAIN_ADMIN=admin.example.com
DOMAIN_API=api.example.com
SERVER_IP=你的服务器公网IP
REPO_URL=你的git仓库地址
DEPLOY_USER=deploy
DB_NAME=ccic
DB_USER=ccic
DB_PASS='请替换为强密码'
```

---

## 2. 服务器初始化（安全 + 基础工具）

### 2.1 连接服务器

```bash
ssh root@${SERVER_IP}
```

### 2.2 更新系统并设置时区

```bash
apt update && apt upgrade -y
timedatectl set-timezone Asia/Shanghai
```

### 2.3 创建部署用户

```bash
adduser ${DEPLOY_USER}
usermod -aG sudo ${DEPLOY_USER}
```

### 2.4 配置 SSH 免密登录（推荐）

在你本地电脑执行：

```bash
ssh-copy-id ${DEPLOY_USER}@${SERVER_IP}
```

### 2.5 禁用 root 远程和密码登录

编辑 SSH 配置：

```bash
nano /etc/ssh/sshd_config
```

确认至少包含以下项：

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

重启 SSH：

```bash
systemctl restart ssh
```

### 2.6 开启防火墙

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

---

## 3. 安装运行环境（Nginx + Node + PostgreSQL + Git）

### 3.1 安装基础包

```bash
apt install -y curl git nginx postgresql postgresql-contrib ca-certificates gnupg
```

### 3.2 安装 Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

### 3.3 启动并设置服务自启

```bash
systemctl enable nginx
systemctl enable postgresql
systemctl start nginx
systemctl start postgresql
```

---

## 4. 初始化 PostgreSQL

### 4.1 创建数据库与用户

```bash
sudo -u postgres psql <<EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
\q
EOF
```

### 4.2 验证连接

```bash
psql "postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" -c "\dt"
```

---

## 5. 拉代码并安装依赖

### 5.1 切换到部署用户

```bash
su - ${DEPLOY_USER}
```

### 5.2 拉取仓库到 `/opt/ccic`

```bash
sudo mkdir -p /opt/ccic
sudo chown ${DEPLOY_USER}:${DEPLOY_USER} /opt/ccic
cd /opt/ccic
git clone ${REPO_URL} .
```

### 5.3 安装依赖

```bash
cd /opt/ccic
npm ci
```

---

## 6. 配置项目环境变量

### 6.1 创建 API 环境文件

```bash
cd /opt/ccic
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

建议配置如下（按你域名改）：

```text
DATABASE_URL=postgres://ccic:你的强密码@127.0.0.1:5432/ccic
PORT=4000
CORS_ORIGINS=https://example.com,https://www.example.com,https://admin.example.com,https://api.example.com
ENABLE_LEGACY_TRACE_APIS=false
ADMIN_SESSION_TTL_HOURS=720
ADMIN_SESSION_CLEANUP_INTERVAL_MINUTES=60
ADMIN_SESSION_REVOKED_RETENTION_HOURS=168
ADMIN_PASSWORD_BCRYPT_COST=12

R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_S3_ENDPOINT=
R2_PUBLIC_BASE_URL=
R2_UPLOAD_PREFIX=uploads
R2_SIGN_EXPIRES_SECONDS=300
```

---

## 7. 初始化数据库表结构

```bash
cd /opt/ccic
psql "postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" -f infra/sql/001_init_schema_postgres.sql
```

---

## 8. 构建项目

```bash
cd /opt/ccic
npm run build:web
npm run build:admin
npm run build:api
```

构建产物：

1. `/opt/ccic/apps/web/dist`
2. `/opt/ccic/apps/admin/dist`
3. `/opt/ccic/apps/api/dist`

---

## 9. 启动 API（systemd 守护）

### 9.1 创建服务文件

```bash
sudo tee /etc/systemd/system/ccic-api.service > /dev/null <<'EOF'
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
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

### 9.2 启动并设为开机自启

```bash
sudo systemctl daemon-reload
sudo systemctl enable ccic-api
sudo systemctl start ccic-api
sudo systemctl status ccic-api --no-pager
```

### 9.3 查看实时日志

```bash
sudo journalctl -u ccic-api -f
```

---

## 10. 配置 Nginx（三域名：web/admin/api）

### 10.1 写 Nginx 配置（HTTP 阶段）

```bash
sudo tee /etc/nginx/sites-available/ccic.conf > /dev/null <<'EOF'
# API
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:4000;
    }
}

# Web
server {
    listen 80;
    server_name example.com www.example.com;

    root /opt/ccic/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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

# Admin
server {
    listen 80;
    server_name admin.example.com;

    root /opt/ccic/apps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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
EOF
```

注意：将 `example.com`、`admin.example.com`、`api.example.com` 替换成你的真实域名。

### 10.2 启用站点并重载

```bash
sudo ln -sf /etc/nginx/sites-available/ccic.conf /etc/nginx/sites-enabled/ccic.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Cloudflare 接入（DNS + CDN）

### 11.1 添加站点到 Cloudflare

1. 登录 Cloudflare 控制台。
2. 添加域名 `example.com`。
3. 选择套餐（可先 Free）。

### 11.2 配置 DNS 记录（A 记录）

添加以下记录并指向同一个服务器 IP：

1. `@` -> `SERVER_IP`（Proxied）
2. `www` -> `SERVER_IP`（Proxied）
3. `admin` -> `SERVER_IP`（Proxied）
4. `api` -> `SERVER_IP`（Proxied）

### 11.3 在注册商修改 NS

把域名注册商里的 nameserver 改为 Cloudflare 分配的两条 NS，等待生效。

---

## 12. 配置 HTTPS（Cloudflare Origin CA 推荐）

### 12.1 在 Cloudflare 生成源站证书

路径：`SSL/TLS` -> `Origin Server` -> `Create Certificate`  
证书主机名填：

1. `example.com`
2. `*.example.com`

### 12.2 在服务器保存证书和私钥

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo chmod 700 /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.crt
sudo nano /etc/ssl/cloudflare/origin.key
sudo chmod 600 /etc/ssl/cloudflare/origin.key
```

### 12.3 将 Nginx 配置改为 HTTPS

编辑：

```bash
sudo nano /etc/nginx/sites-available/ccic.conf
```

替换为：

```nginx
server {
    listen 80;
    server_name example.com www.example.com admin.example.com api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;
    ssl_certificate     /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:4000;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    ssl_certificate     /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;
    root /opt/ccic/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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

server {
    listen 443 ssl http2;
    server_name admin.example.com;
    ssl_certificate     /etc/ssl/cloudflare/origin.crt;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;
    root /opt/ccic/apps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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

应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 12.4 Cloudflare SSL 设置

1. SSL/TLS 模式：`Full (strict)`
2. 打开 `Always Use HTTPS`

---

## 13. Cloudflare 缓存与安全规则

### 13.1 Cache Rule：API 不缓存

条件：

```text
URI Path starts with /api/
```

动作：

```text
Cache eligibility = Bypass cache
```

### 13.2 Cache Rule：静态资源缓存

条件：

```text
URI Path matches *.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)
```

动作：

```text
Cache eligibility = Eligible for cache
Edge TTL = 7 days（按需调整）
```

### 13.3 WAF + 限流

1. 开启 Cloudflare Managed WAF Rules。
2. 对 `/api/admin/auth/login` 配置 Rate Limiting。  
   建议：同 IP 每分钟 > 10 次，阻断 10 分钟。

---

## 14. 数据库备份（每日自动）

### 14.1 创建备份脚本

```bash
sudo mkdir -p /opt/ccic/scripts
sudo tee /opt/ccic/scripts/backup-postgres.sh > /dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/backups/ccic"
mkdir -p "\$BACKUP_DIR"

TS=\$(date +%F_%H-%M-%S)
FILE="\$BACKUP_DIR/ccic_\${TS}.sql.gz"

pg_dump "postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" | gzip > "\$FILE"
find "\$BACKUP_DIR" -type f -name "ccic_*.sql.gz" -mtime +14 -delete
EOF
sudo chmod +x /opt/ccic/scripts/backup-postgres.sh
```

### 14.2 加入定时任务

```bash
crontab -e
```

加入：

```cron
30 2 * * * /opt/ccic/scripts/backup-postgres.sh >> /var/log/ccic-backup.log 2>&1
```

### 14.3 恢复命令（演练必须做一次）

```bash
gunzip -c /opt/backups/ccic/ccic_xxx.sql.gz | psql "postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
```

---

## 15. 发布流程（每次上线）

```bash
sudo su - ${DEPLOY_USER}
cd /opt/ccic
git pull
npm ci
npm run build:web
npm run build:admin
npm run build:api
sudo systemctl restart ccic-api
sudo nginx -t && sudo systemctl reload nginx
```

---

## 16. 验收清单（上线前逐条检查）

1. `https://example.com` 可访问。
2. `https://admin.example.com` 可访问并登录成功。
3. `https://api.example.com/health` 返回 `ok: true`。
4. Cloudflare SSL 模式为 `Full (strict)`。
5. `/api/*` 未被 CDN 缓存。
6. `systemctl status ccic-api` 为 `active (running)`。
7. 备份脚本可执行并有产出文件。

---

## 17. 常见问题排查

### 17.1 502 Bad Gateway

```bash
sudo systemctl status ccic-api --no-pager
sudo journalctl -u ccic-api -n 200 --no-pager
```

### 17.2 数据库连接失败

```bash
systemctl status postgresql --no-pager
psql "postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" -c "select 1;"
```

### 17.3 Nginx 配置错误

```bash
sudo nginx -t
sudo tail -n 200 /var/log/nginx/error.log
```

### 17.4 HTTPS 重定向循环

1. 检查 Cloudflare SSL 模式必须是 `Full (strict)`。
2. 检查 Nginx 是否只做一次 HTTP->HTTPS 跳转。

