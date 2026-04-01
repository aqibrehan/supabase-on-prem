# Supabase On-Prem — Full Stack CRUD Application

> Production-ready full stack application with **Supabase self-hosted services** connected to an **on-premises PostgreSQL database** (not inside Docker).

![Architecture](https://img.shields.io/badge/Architecture-On--Premises-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2018-4169E1)
![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-3FCF8E)

## Architecture

```
React (Frontend - port 5173)
      |  Axios
FastAPI (Backend - port 9000)
      |  asyncpg
PostgreSQL (On-Prem Server - port 5432)   <-- DATA SAFE HERE
      ^  host.docker.internal
Supabase Services (Docker - optional)
(Auth, REST, Realtime, Storage, Studio, Edge Functions)
```

**Key Design Decision:** PostgreSQL runs directly on the host server, NOT inside Docker. All Supabase services run in Docker and connect to the host database via `host.docker.internal`. This ensures data persistence, safety, and compliance with on-premises requirements.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Axios, Tailwind CSS, React Router |
| Backend | FastAPI (async), SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 18 (on-premises, not Docker) |
| Auth | JWT (PyJWT + bcrypt) / Supabase Auth (dual-mode) |
| Supabase | Self-hosted: Studio, Kong, GoTrue, PostgREST, Realtime, Storage, Edge Functions |
| DevOps | Docker Compose, Nginx |

## Project Structure

```
supabase-On-prem/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, dependencies, logging
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── repositories/   # Data access layer (Repository Pattern)
│   │   ├── services/       # Business logic layer
│   │   ├── routers/        # API endpoints
│   │   ├── middleware/      # Error handling, timing
│   │   └── main.py         # FastAPI app entry point
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client + API service layer
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth context (React Context API)
│   │   ├── hooks/          # Custom hooks (useProducts)
│   │   └── pages/          # Login, ProductList, ProductForm
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── supabase/
│   └── docker/
│       ├── docker-compose.yml    # All Supabase services
│       ├── .env                  # Supabase configuration
│       └── volumes/
│           ├── api/kong.yml      # Kong API Gateway config
│           └── functions/        # Edge Functions (Deno)
├── docs/
│   ├── 01-postgresql-setup.md    # PostgreSQL installation guide
│   ├── 02-supabase-onprem-config.md  # Supabase self-hosting guide
│   └── 03-production-deployment.md   # Deployment guide
├── docker-compose.yml            # Backend + Frontend containers
└── README.md
```

## Features

### Backend (FastAPI)
- Async CRUD APIs with UUID primary keys
- Repository Pattern + Service Layer (clean architecture)
- Pagination, search, and price filtering
- JWT authentication with bcrypt password hashing
- Dual auth mode: built-in JWT or Supabase Auth
- Connection pooling (asyncpg, configurable pool size)
- Error handling middleware with request timing
- Environment-based configuration (Pydantic Settings)

### Frontend (React)
- Login / Register with JWT token management
- Product List with search, pagination
- Add / Edit / Delete products
- Protected routes with auth context
- Axios interceptors (auto-attach token, 401 redirect)
- Tailwind CSS for clean UI
- Form validation

### Supabase Self-Hosted
- Studio Dashboard (Table Editor, SQL Editor)
- PostgREST (auto-generated REST API)
- GoTrue (authentication service)
- Realtime (WebSocket subscriptions)
- Storage (file uploads)
- Edge Functions (Deno serverless functions)
- Kong API Gateway

## Quick Start

### Prerequisites
- PostgreSQL 16+ installed on host
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### 1. Database Setup

```bash
# Create database and user in PostgreSQL
psql -U postgres
```
```sql
CREATE DATABASE products_db;
CREATE ROLE app_user WITH LOGIN PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE products_db TO app_user;
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # Edit with your credentials
pip install -r requirements.txt
uvicorn app.main:app --port 9000 --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # Opens at http://localhost:5173
```

### 4. Supabase (Optional)

```bash
cd supabase/docker
# Edit .env with your PostgreSQL credentials
docker compose up -d
```

Access Studio at `http://localhost:3100`

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/auth/register` | Register new user | No |
| `POST` | `/api/v1/auth/login` | Login, get JWT | No |
| `GET` | `/api/v1/products` | List products (paginated) | Yes |
| `GET` | `/api/v1/products/{id}` | Get single product | Yes |
| `POST` | `/api/v1/products` | Create product | Yes |
| `PATCH` | `/api/v1/products/{id}` | Update product | Yes |
| `DELETE` | `/api/v1/products/{id}` | Delete product | Yes |
| `GET` | `/health` | Health check | No |

### Query Parameters (GET /products)

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20, max: 100) |
| `search` | string | Search in name & description |
| `min_price` | float | Minimum price filter |
| `max_price` | float | Maximum price filter |

## Data Flow

All paths lead to the **same on-premises PostgreSQL**:

```
React App  ──► FastAPI ──► asyncpg ──┐
Studio UI  ──► pg_meta ─────────────►├──► PostgreSQL (Host)
REST API   ──► PostgREST ───────────►│    products_db
Edge Fn    ──► Supabase Client ─────►┘    port 5432
```

## Use Cases

This architecture is ideal for:
- **Banking / Fintech** — Data sovereignty requirements
- **Healthcare** — HIPAA compliance, patient data on-prem
- **Government / Defense** — Classified data, no cloud
- **Enterprise** — Clients demanding on-prem deployment

## Documentation

- [PostgreSQL Setup Guide](docs/01-postgresql-setup.md)
- [Supabase On-Prem Configuration](docs/02-supabase-onprem-config.md)
- [Production Deployment Guide](docs/03-production-deployment.md)

## License

MIT
