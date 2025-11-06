# EasyPing Docker Deployment Guide

This guide provides instructions for deploying EasyPing using Docker Compose on your own infrastructure.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Deployment Steps](#deployment-steps)
- [Common Operations](#common-operations)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Architecture](#architecture)
- [Upgrading](#upgrading)

## System Requirements

### Minimum Requirements

- **Operating System:** Ubuntu 22.04+ (or any Linux with Docker support)
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disk Space:** 20GB available
- **Docker:** 20.10+
- **Docker Compose:** 2.0+

### Recommended for Production

- **CPU:** 4 cores
- **RAM:** 8GB
- **Disk Space:** 50GB available (with room for database growth)
- **SSD storage** for database volumes

## Quick Start

For the impatient, here's a one-liner to get started on a fresh Ubuntu machine:

```bash
# Install Docker and Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose

# Add your user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Clone, configure, and start
git clone https://github.com/yourusername/easyping.git
cd easyping/docker
cp .env.example .env
nano .env  # Edit with your secrets
docker-compose up -d
```

Then visit `http://localhost` in your browser.

## Deployment Steps

### Step 1: Prerequisites Installation

#### Ubuntu/Debian

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose
sudo apt install -y docker-compose

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (allows running docker without sudo)
sudo usermod -aG docker $USER

# Logout and login again for group changes to take effect
```

#### RHEL/CentOS

```bash
# Install Docker
sudo yum install -y docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER
```

#### Verify Installation

```bash
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
# Clone the EasyPing repository
git clone https://github.com/yourusername/easyping.git
cd easyping/docker
```

### Step 3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the file with your configuration
nano .env  # or vim, vi, etc.
```

#### Required Configuration

At minimum, you MUST change these values:

```bash
# Generate strong passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
GOTRUE_JWT_SECRET=$(openssl rand -base64 32)
REALTIME_SECRET_KEY_BASE=$(openssl rand -base64 64)
```

Update the following in `.env`:

```bash
POSTGRES_PASSWORD=your_generated_password
GOTRUE_JWT_SECRET=your_generated_jwt_secret
REALTIME_SECRET_KEY_BASE=your_generated_realtime_secret
```

#### Generate API Keys

You'll need to generate Supabase API keys using your JWT secret:

1. Visit [https://jwt.io](https://jwt.io)
2. Use algorithm: `HS256`
3. Use your `GOTRUE_JWT_SECRET` as the secret
4. Generate two tokens:

**Anonymous Key (role: `anon`):**
```json
{
  "role": "anon",
  "iss": "supabase",
  "iat": 1641769200,
  "exp": 1799535600
}
```

**Service Role Key (role: `service_role`):**
```json
{
  "role": "service_role",
  "iss": "supabase",
  "iat": 1641769200,
  "exp": 1799535600
}
```

Update these in your `.env`:

```bash
SUPABASE_ANON_KEY=your_generated_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_generated_service_role_key
```

#### Optional Configuration

For production deployments:

```bash
# Set your domain name
DOMAIN=easyping.example.com
TLS_EMAIL=admin@example.com

# Configure SMTP for email notifications
GOTRUE_SMTP_HOST=smtp.gmail.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-email@gmail.com
GOTRUE_SMTP_PASS=your-app-password

# Enable Google OAuth (optional)
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

### Step 4: Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Watch logs (optional)
docker-compose logs -f
```

### Step 5: Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Test health endpoint
curl http://localhost/api/health

# Expected output:
# {"status":"healthy","timestamp":"...","services":{...},"version":"1.0.0"}
```

### Step 6: Access Application

Open your browser and navigate to:

- **Local:** `http://localhost`
- **Production:** `https://your-domain.com`

You should see the EasyPing login/signup page.

## Common Operations

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### Restart a Specific Service

```bash
docker-compose restart web
docker-compose restart postgres
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f postgres
docker-compose logs -f caddy
```

### Backup Database

```bash
# Run the backup script
./scripts/backup-db.sh

# Backups are saved to ./backups/backup_YYYYMMDD_HHMMSS.sql
```

### Restore Database

```bash
# Restore from a backup file
./scripts/restore-db.sh ./backups/backup_20250128_120000.sql
```

### Update to Latest Version

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Remove Everything (Clean Slate)

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# WARNING: This deletes all data!
```

## Troubleshooting

### Port Conflicts

**Problem:** Port 80 or 443 already in use.

**Solution:** Modify the port mapping in `docker-compose.yml`:

```yaml
caddy:
  ports:
    - "8080:80"   # Change external port
    - "8443:443"
```

### Permission Errors

**Problem:** Permission denied when running Docker commands.

**Solution:**

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

### Database Connection Errors

**Problem:** Web app can't connect to database.

**Solution:**

1. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

2. Verify PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   # Should show "healthy" status
   ```

3. Verify environment variables match in `.env`

4. Restart services:
   ```bash
   docker-compose restart
   ```

### Health Check Failures

**Problem:** Health endpoint returns 503 or times out.

**Solution:**

1. Check which services are unhealthy:
   ```bash
   curl http://localhost/api/health | jq
   ```

2. Check service logs:
   ```bash
   docker-compose logs -f web
   ```

3. Verify all dependencies are running:
   ```bash
   docker-compose ps
   ```

4. Check Supabase service connectivity:
   ```bash
   docker-compose exec web curl http://postgrest:3000
   ```

### Caddy TLS Certificate Issues

**Problem:** Browser shows "Your connection is not private" in production.

**Solution:**

1. Verify DNS is pointing to your server
2. Ensure ports 80 and 443 are open in firewall
3. Check Caddy logs:
   ```bash
   docker-compose logs caddy
   ```
4. Verify `DOMAIN` and `TLS_EMAIL` are set in `.env`

## Security Best Practices

### 1. Use Strong Passwords

Never use default passwords in production. Generate strong secrets:

```bash
openssl rand -base64 32
```

### 2. Secure Environment File

```bash
# Restrict access to .env file
chmod 600 .env

# Never commit .env to Git
echo ".env" >> .gitignore
```

### 3. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block PostgreSQL from external access (if exposed)
sudo ufw deny 54322/tcp

# Enable firewall
sudo ufw enable
```

### 4. Enable HTTPS

For production, always use a real domain with HTTPS:

```bash
# In .env
DOMAIN=easyping.example.com
TLS_EMAIL=admin@example.com
```

Caddy will automatically obtain a Let's Encrypt certificate.

### 5. Regular Security Updates

```bash
# Update Docker images regularly
docker-compose pull
docker-compose up -d

# Update host system
sudo apt update && sudo apt upgrade -y
```

### 6. Backup Strategy

- **Daily automated backups:** Set up a cron job for `./scripts/backup-db.sh`
- **Off-site backups:** Copy backups to a remote location
- **Test restores:** Periodically test your backup restoration process

### 7. Rotate Secrets

Rotate JWT secrets and passwords every 90 days:

1. Generate new secrets
2. Update `.env` file
3. Regenerate API keys with new JWT secret
4. Restart services: `docker-compose restart`

### 8. Monitor Logs

Set up log monitoring for suspicious activity:

```bash
# Watch for authentication failures
docker-compose logs -f gotrue | grep -i "failed\|error"

# Watch for unusual traffic patterns
docker-compose logs -f caddy
```

## Architecture

### Service Overview

```
Internet
  ↓
Caddy Reverse Proxy (Port 80/443)
  ↓
Next.js App Server (Port 8000 internal)
  ↓
Supabase Services:
  - PostgREST API (Port 3001)
  - GoTrue Auth (Port 9999)
  - Storage API (Port 5000)
  - Realtime (Port 4000)
  ↓
PostgreSQL Database (Port 5432)
```

**Note:** Port 8000 is used internally within the Docker network. Ports 3000-3999 are reserved for other projects on the host machine.

### Docker Networking

All services communicate via the `easyping-network` bridge network. Only Caddy exposes ports to the host machine.

### Persistent Data

Data is stored in Docker named volumes:

- `postgres_data` - Database files
- `storage_data` - Uploaded file attachments
- `caddy_data` - TLS certificates
- `caddy_config` - Caddy configuration cache

### Container Architecture

```
┌─────────────────────────────────────────┐
│           Caddy (Port 80/443)           │
│         Automatic HTTPS & Proxy         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Next.js Web App (8000)          │
│    Business Logic & API Routes          │
└─┬───────────────────────────────────┬───┘
  │                                   │
  ├───► PostgREST (3001)             │
  ├───► GoTrue Auth (9999)           │
  ├───► Storage API (5000)           │
  └───► Realtime (4000)              │
          │                          │
          └──────────┬───────────────┘
                     │
        ┌────────────▼────────────┐
        │   PostgreSQL (5432)     │
        │   Database + pgvector   │
        └─────────────────────────┘
```

## Upgrading

### Upgrade Process

1. **Backup your database:**
   ```bash
   ./scripts/backup-db.sh
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

3. **Review changelog:**
   ```bash
   git log
   ```

4. **Update environment variables** (if needed):
   - Check `.env.example` for new variables
   - Update your `.env` file accordingly

5. **Rebuild images:**
   ```bash
   docker-compose build --no-cache
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

7. **Start services:**
   ```bash
   docker-compose up -d
   ```

8. **Verify health:**
   ```bash
   curl http://localhost/api/health
   ```

### Rollback

If something goes wrong:

```bash
# Stop current version
docker-compose down

# Checkout previous version
git log --oneline
git checkout <previous-commit-hash>

# Restore database backup
./scripts/restore-db.sh ./backups/backup_<timestamp>.sql

# Restart services
docker-compose up -d
```

## Development Mode

For local development with hot reload:

```bash
# Use development override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Source code changes will auto-reload
```

## Additional Resources

- **Main Documentation:** [../README.md](../README.md)
- **Contributing Guide:** [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **Full Deployment Guide:** [../DEPLOYMENT.md](../DEPLOYMENT.md)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Docker Docs:** [https://docs.docker.com](https://docs.docker.com)
- **Caddy Docs:** [https://caddyserver.com/docs](https://caddyserver.com/docs)

## Support

For issues and questions:

- **GitHub Issues:** [https://github.com/yourusername/easyping/issues](https://github.com/yourusername/easyping/issues)
- **Discussions:** [https://github.com/yourusername/easyping/discussions](https://github.com/yourusername/easyping/discussions)
- **Documentation:** [https://docs.easyping.io](https://docs.easyping.io)

## License

EasyPing is licensed under AGPLv3. See [../LICENSE](../LICENSE) for details.
