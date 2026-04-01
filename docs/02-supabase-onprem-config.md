# Supabase Self-Hosted — Connect to External PostgreSQL

Supabase self-hosted runs as a set of Docker containers (Auth, Realtime, Storage, PostgREST, Studio, etc.) that all connect to a PostgreSQL database. In our setup, PostgreSQL is **installed directly on the server** — not inside Docker.

## 1. Clone Supabase Docker

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

## 2. Edit `.env` to Point to Host PostgreSQL

Open `.env` and set:

```env
############
# Database — pointing to the HOST PostgreSQL (not the bundled container)
############
POSTGRES_HOST=host.docker.internal   # For Docker Desktop (Mac/Windows)
# POSTGRES_HOST=172.17.0.1           # For Linux (Docker bridge gateway)
POSTGRES_PORT=5432
POSTGRES_DB=products_db
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Connection string used by multiple services
DATABASE_URL=postgresql://supabase_admin:CHANGE_ME@host.docker.internal:5432/products_db
```

## 3. Remove the Bundled `db` Container

Edit `docker-compose.yml` and either:

**Option A:** Comment out the entire `db:` service block.

**Option B:** Override with a compose file:

```yaml
# docker-compose.override.yml
services:
  db:
    image: alpine
    entrypoint: ["echo", "Using external PostgreSQL"]
    restart: "no"
```

## 4. Create Supabase Roles in Your External PostgreSQL

Supabase services expect specific roles. Run this on your host PostgreSQL:

```bash
sudo -u postgres psql -d products_db
```

```sql
-- Supabase required roles
CREATE ROLE supabase_admin WITH LOGIN PASSWORD 'CHANGE_ME' SUPERUSER;
CREATE ROLE authenticator WITH LOGIN PASSWORD 'CHANGE_ME' NOINHERIT;
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- Grant role inheritance
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Supabase schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant schema usage
GRANT USAGE ON SCHEMA auth TO supabase_admin, authenticator, service_role;
GRANT USAGE ON SCHEMA storage TO supabase_admin, authenticator, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" SCHEMA extensions;
```

## 5. Generate JWT Keys

```bash
# Generate a new JWT secret (use this in both Supabase .env and your FastAPI .env)
openssl rand -hex 64
```

Set in Supabase `.env`:

```env
JWT_SECRET=<output-from-above>
ANON_KEY=<generate-at-supabase.com/docs/guides/self-hosting#api-keys>
SERVICE_ROLE_KEY=<generate-at-supabase.com/docs/guides/self-hosting#api-keys>
```

## 6. Allow Docker Network in `pg_hba.conf`

Ensure your `pg_hba.conf` (from Step 1 guide) allows connections from Docker's bridge network:

```
host    products_db    supabase_admin    172.16.0.0/12    scram-sha-256
host    products_db    authenticator     172.16.0.0/12    scram-sha-256
```

## 7. Start Supabase Services

```bash
cd supabase/docker
docker compose up -d
```

Verify:

```bash
docker compose ps
# All services should be "Up" except the overridden db service
```

Access Studio at: `http://<server-ip>:3000`

## 8. Using Supabase Auth with FastAPI

If using `AUTH_MODE=supabase` in FastAPI:

1. Set the same `JWT_SECRET` in both Supabase and FastAPI `.env` files
2. Frontend sends auth requests to Supabase Auth (`/auth/v1/signup`, `/auth/v1/token`)
3. Supabase returns a JWT signed with the shared secret
4. FastAPI validates that same JWT using `PyJWT` with the shared secret
5. All services trust the same token — zero duplication

```env
# In FastAPI .env
AUTH_MODE=supabase
JWT_SECRET_KEY=<same-jwt-secret-as-supabase>
SUPABASE_URL=http://<server-ip>:8000
```
