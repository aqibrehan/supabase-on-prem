# Production Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  React SPA  │────▶│ Nginx / CDN  │     │  PostgreSQL 16          │
│  (Browser)  │     │  (port 80)   │     │  (HOST — not Docker)    │
└─────────────┘     └──────┬───────┘     │  port 5432              │
                           │             └────────▲──────▲─────────┘
                   ┌───────▼───────┐              │      │
                   │  FastAPI      │──────────────┘      │
                   │  (port 8000)  │                     │
                   │  Docker       │         ┌───────────┘
                   └───────────────┘         │
                                     ┌───────┴──────────┐
                                     │  Supabase Docker  │
                                     │  (Auth, Realtime, │
                                     │   Storage, Studio)│
                                     └──────────────────┘
```

## Step 1: Server Prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl docker.io docker-compose-plugin ufw
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

## Step 2: Firewall

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw allow 8000/tcp     # API (or restrict to internal)
# DO NOT expose 5432 publicly
sudo ufw enable
```

## Step 3: Clone & Configure

```bash
git clone <your-repo-url> /opt/product-app
cd /opt/product-app

# Backend env
cp backend/.env.example backend/.env
nano backend/.env
# Set real DATABASE_PASSWORD, JWT_SECRET_KEY, etc.
```

## Step 4: Deploy PostgreSQL on Host

Follow `docs/01-postgresql-setup.md` completely.

## Step 5: Deploy Backend + Frontend via Docker

```bash
cd /opt/product-app
docker compose up -d --build
```

Verify:

```bash
# Health check
curl http://localhost:8000/health
# Should return: {"status":"healthy","version":"1.0.0"}

# Frontend
curl -s http://localhost:3000 | head -5
```

## Step 6: Deploy Supabase (Optional)

Follow `docs/02-supabase-onprem-config.md`.

## Step 7: Reverse Proxy with Nginx (Host)

Install nginx on the host (not Docker) for TLS termination:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

```nginx
# /etc/nginx/sites-available/product-app
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/product-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS
sudo certbot --nginx -d yourdomain.com
```

## Step 8: Logging & Monitoring

### Application Logs

```bash
# View backend logs
docker logs -f product-api

# View frontend logs
docker logs -f product-ui
```

### PostgreSQL Logs

```bash
tail -f /var/lib/postgresql/16/main/pg_log/postgresql-$(date +%Y-%m-%d).log
```

### Log Rotation (already handled)
- PostgreSQL: daily log files via `log_filename` setting
- Docker: configure in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

## Step 9: Systemd Auto-Start

Docker Compose services already have `restart: unless-stopped`. For extra safety:

```bash
# /etc/systemd/system/product-app.service
[Unit]
Description=Product App Docker Compose
After=docker.service postgresql.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/product-app
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable product-app
```

## Environment Configuration Summary

| Variable | Where | Example |
|---|---|---|
| `DATABASE_HOST` | backend `.env` | `host.docker.internal` |
| `DATABASE_PASSWORD` | backend `.env` | Strong random password |
| `JWT_SECRET_KEY` | backend `.env` | `openssl rand -hex 64` output |
| `AUTH_MODE` | backend `.env` | `jwt` or `supabase` |
| `CORS_ORIGINS` | backend `.env` | `["https://yourdomain.com"]` |
| `VITE_API_URL` | frontend build | `/api/v1` (proxied by nginx) |

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user | No |
| `POST` | `/api/v1/auth/login` | Login, get JWT | No |
| `GET` | `/api/v1/products` | List products (paginated, searchable) | Yes |
| `GET` | `/api/v1/products/{id}` | Get single product | Yes |
| `POST` | `/api/v1/products` | Create product | Yes |
| `PATCH` | `/api/v1/products/{id}` | Update product | Yes |
| `DELETE` | `/api/v1/products/{id}` | Delete product | Yes |
| `GET` | `/health` | Health check | No |

### Query Parameters for `GET /api/v1/products`

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page (max 100) |
| `search` | string | null | Search in name & description |
| `min_price` | float | null | Minimum price filter |
| `max_price` | float | null | Maximum price filter |
