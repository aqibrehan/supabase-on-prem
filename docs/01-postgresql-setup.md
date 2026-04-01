# PostgreSQL On-Server Installation & Configuration

## 1. Install PostgreSQL 16 (Ubuntu/Debian)

```bash
# Add official PostgreSQL repo
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \
  sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
```

## 2. Verify Service

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

## 3. Create Database, Role & Extensions

```bash
sudo -u postgres psql
```

```sql
-- Create the application database
CREATE DATABASE products_db;

-- Create app user with a STRONG password
CREATE ROLE app_user WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE products_db TO app_user;

-- Connect to the database to create extensions
\c products_db

-- Extensions required by Supabase and our app
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";        -- Supabase JWT support
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Grant schema usage
GRANT ALL ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
```

## 4. Configure `pg_hba.conf` for Network Access

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Add these lines (adjust CIDR to your network):

```
# Allow app_user from Docker network
host    products_db     app_user    172.16.0.0/12    scram-sha-256

# Allow Supabase services
host    products_db     supabase_admin  172.16.0.0/12    scram-sha-256

# Allow from localhost
host    all             all         127.0.0.1/32     scram-sha-256
```

## 5. Configure `postgresql.conf` for Production

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Key settings:

```ini
listen_addresses = '*'              # Accept connections from all interfaces
port = 5432
max_connections = 200

# Memory (tune for your server RAM)
shared_buffers = 1GB                # 25% of total RAM
effective_cache_size = 3GB          # 75% of total RAM
work_mem = 16MB
maintenance_work_mem = 256MB

# WAL & Checkpoints
wal_level = replica
max_wal_size = 2GB
min_wal_size = 512MB
checkpoint_completion_target = 0.9

# Logging
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 500    # Log slow queries (>500ms)
log_statement = 'ddl'
```

Restart after changes:

```bash
sudo systemctl restart postgresql
```

## 6. Connection String

```
postgresql+asyncpg://app_user:CHANGE_ME_STRONG_PASSWORD@<SERVER_IP>:5432/products_db
```

## 7. Backup Strategy

### Automated Daily Backups (cron)

```bash
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql
```

Create backup script:

```bash
sudo nano /usr/local/bin/pg_backup.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="products_db"
RETENTION_DAYS=30

# Dump
pg_dump -U postgres -Fc "$DB_NAME" > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Prune old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: ${DB_NAME}_${TIMESTAMP}.dump"
```

```bash
sudo chmod +x /usr/local/bin/pg_backup.sh
```

Add cron job (daily at 2 AM):

```bash
sudo crontab -u postgres -e
```

```
0 2 * * * /usr/local/bin/pg_backup.sh >> /var/log/pg_backup.log 2>&1
```

### Restore

```bash
pg_restore -U postgres -d products_db --clean --if-exists /var/backups/postgresql/products_db_20260331.dump
```
