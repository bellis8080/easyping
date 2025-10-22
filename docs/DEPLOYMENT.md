# EasyPing Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-01-22
**Audience:** Self-hosters, DevOps teams

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Domain and DNS Setup](#domain-and-dns-setup)
4. [SSL Certificate Configuration](#ssl-certificate-configuration)
5. [Docker Compose Deployment](#docker-compose-deployment)
6. [Environment Variables](#environment-variables)
7. [First-Run Setup](#first-run-setup)
8. [Email Service Configuration](#email-service-configuration)
9. [Backup and Restore](#backup-and-restore)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

---

## System Requirements

**Minimum Specifications:**
- **OS:** Ubuntu 22.04 LTS, Debian 12, or Fedora 38+ (64-bit)
- **CPU:** 2 cores
- **RAM:** 4GB (8GB recommended)
- **Storage:** 20GB free disk space (SSD recommended)
- **Network:** Static IP or dynamic DNS, ports 80 and 443 accessible

**Software Dependencies:**
- Docker 24.0+ (`docker --version`)
- Docker Compose 2.20+ (`docker-compose --version`)
- Git 2.30+ (for cloning repository)

**Installation Commands (Ubuntu/Debian):**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

---

## Pre-Deployment Checklist

Before deploying EasyPing, ensure you have:

- [ ] Domain name registered (e.g., `support.yourcompany.com`)
- [ ] DNS A record configured pointing to your server IP
- [ ] Server accessible via SSH with sudo privileges
- [ ] Firewall configured to allow ports 80 (HTTP) and 443 (HTTPS)
- [ ] (Optional) Email SMTP credentials for custom notifications
- [ ] (Optional) AI provider API key (OpenAI, Anthropic, or Azure OpenAI)
- [ ] Backup strategy planned for database and uploaded files

---

## Domain and DNS Setup

### Step 1: Register a Domain

Choose a subdomain or domain for your EasyPing instance:
- **Subdomain:** `support.yourcompany.com` (recommended)
- **Root domain:** `easyping.yourcompany.com`

**Domain Registrars:**
- Namecheap, GoDaddy, Cloudflare Registrar, Google Domains

### Step 2: Configure DNS A Record

Point your domain to your server's public IP address:

**Example DNS Configuration:**
```
Type: A
Name: support (or @ for root domain)
Value: 203.0.113.45 (your server IP)
TTL: 300 (5 minutes)
```

**Using Cloudflare (Optional):**
- Create A record as above
- Set "Proxy status" to "DNS only" (orange cloud OFF) initially
- After SSL working, enable "Proxied" for DDoS protection

**Verify DNS Propagation:**
```bash
# Check DNS resolution
dig support.yourcompany.com

# Or use nslookup
nslookup support.yourcompany.com

# Wait until DNS propagates (can take 5 minutes to 48 hours)
```

### Step 3: Dynamic DNS (Optional for Home/ISP)

If using dynamic IP (home internet, changing IP):

**DynamicDNS Providers:**
- DuckDNS (free): `support.duckdns.org`
- No-IP (free tier available)
- Dynu (free)

**Setup:**
1. Create account and subdomain on provider
2. Install DDNS client on server to auto-update IP
3. Use provider's subdomain in EasyPing configuration

---

## SSL Certificate Configuration

EasyPing uses **Caddy** as reverse proxy with automatic HTTPS via Let's Encrypt.

### Automatic SSL (Default - Recommended)

Caddy automatically obtains and renews SSL certificates when:
1. Domain has valid DNS A record pointing to server
2. Ports 80 and 443 are accessible from internet
3. Domain is specified in `DOMAIN` environment variable

**No manual certificate configuration needed!**

### Self-Signed Certificate (Development/Local)

For local testing without domain:

**Caddyfile configuration:**
```
https://localhost {
    tls internal
    reverse_proxy web:3000
}
```

**Access:** `https://localhost` (browser will show security warning - accept it)

### Firewall Configuration

**UFW (Ubuntu/Debian):**
```bash
# Allow SSH (don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Firewalld (Fedora/RHEL):**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Docker Compose Deployment

### Step 1: Clone Repository

```bash
# Clone EasyPing repository
git clone https://github.com/yourusername/easyping.git
cd easyping

# Navigate to docker directory
cd docker
```

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Required Environment Variables:**
```bash
# Domain (replace with your domain)
DOMAIN=support.yourcompany.com

# PostgreSQL Database
POSTGRES_PASSWORD=your_secure_postgres_password_here

# JWT Secret (generate random string)
JWT_SECRET=your_jwt_secret_here_use_openssl_rand_base64_32

# Supabase Configuration (auto-generated by Supabase CLI)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=generated_anon_key
SUPABASE_SERVICE_ROLE_KEY=generated_service_key

# Next.js App
NEXT_PUBLIC_APP_URL=https://support.yourcompany.com
```

**Generate Secure Secrets:**
```bash
# Generate PostgreSQL password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32
```

### Step 3: Pull and Start Services

```bash
# Pull latest Docker images
docker-compose pull

# Start all services in background
docker-compose up -d

# Watch logs (Ctrl+C to exit)
docker-compose logs -f

# Check service health
docker-compose ps
```

**Expected Output:**
```
NAME                STATUS              PORTS
easyping-postgres   Up (healthy)        5432/tcp
easyping-web        Up (healthy)        3000/tcp
easyping-caddy      Up (healthy)        80/tcp, 443/tcp
supabase-auth       Up (healthy)        9999/tcp
supabase-storage    Up (healthy)        5000/tcp
```

### Step 4: Verify Deployment

```bash
# Check web app health
curl http://localhost:3000/api/health

# Access via domain
curl https://support.yourcompany.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:00:00Z",
  "services": {
    "database": "connected",
    "auth": "operational",
    "storage": "operational"
  }
}
```

---

## Environment Variables

**Complete `.env` Reference:**

```bash
# ==================== DOMAIN CONFIGURATION ====================
DOMAIN=support.yourcompany.com

# ==================== DATABASE ====================
POSTGRES_DB=easyping
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# ==================== SUPABASE ====================
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_jwt_secret

# ==================== NEXT.JS APP ====================
NEXT_PUBLIC_APP_URL=https://support.yourcompany.com
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# ==================== EMAIL (OPTIONAL) ====================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=EasyPing Support

# ==================== MONITORING (OPTIONAL) ====================
ERROR_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
UPTIME_CHECK_URL=https://uptime-robot-check-url

# ==================== AI PROVIDER (CONFIGURED VIA UI) ====================
# AI configuration managed through setup wizard and settings UI
# API keys encrypted and stored in database
```

---

## First-Run Setup

### Step 1: Access Setup Wizard

1. Open browser and navigate to: `https://support.yourcompany.com`
2. Setup wizard appears automatically on first access

### Step 2: Complete Setup Form

**Organization Details:**
- Organization name: `Your Company IT Support`
- Organization domain: `yourcompany.com` (optional, for email matching)

**Admin Account:**
- Admin email: `admin@yourcompany.com`
- Admin password: Strong password (12+ characters)
- Confirm password

**AI Provider (Optional):**
- Select provider: OpenAI, Anthropic, or Azure OpenAI
- Enter API key
- Select model (GPT-3.5-turbo recommended for cost)
- Click "Test Connection" to validate

### Step 3: Complete Setup

- Click "Complete Setup"
- Redirected to dashboard
- Setup wizard will not appear again

---

## Email Service Configuration

### Option 1: Supabase Auth Email (Default)

**No configuration required** - password resets handled by Supabase Auth SMTP.

**Limitations:**
- Generic email templates
- "From" address is Supabase-managed
- Limited customization

### Option 2: External SMTP (Recommended for Production)

**Supported Providers:**
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 1,000 emails/month)
- **AWS SES** (pay-per-use, very cheap)
- **SMTP2GO**, **Postmark**, etc.

**SendGrid Setup Example:**

1. Create SendGrid account: https://sendgrid.com
2. Generate API key: Settings → API Keys → Create API Key
3. Add to `.env`:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your_api_key_here
   SMTP_FROM_EMAIL=support@yourcompany.com
   SMTP_FROM_NAME=Your Company Support
   ```
4. Restart services: `docker-compose restart`

**Email Template Customization:**
- Templates located in: `apps/web/src/emails/`
- Edit HTML/React components for branding
- Rebuild Docker image after changes

---

## Backup and Restore

### Database Backup

**Automated Daily Backups (Recommended):**

```bash
# Create backup script
nano /opt/easyping-backup.sh
```

**Backup Script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/easyping-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
docker exec easyping-postgres pg_dump -U postgres easyping > \
  $BACKUP_DIR/easyping_db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/easyping_db_$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: easyping_db_$DATE.sql.gz"
```

**Schedule Daily Backups (Cron):**
```bash
# Make script executable
chmod +x /opt/easyping-backup.sh

# Add to cron (runs daily at 2 AM)
crontab -e

# Add line:
0 2 * * * /opt/easyping-backup.sh >> /var/log/easyping-backup.log 2>&1
```

### Storage Backup (Uploaded Files)

```bash
# Backup Supabase Storage volume
docker run --rm \
  -v easyping_storage:/source \
  -v /opt/easyping-backups:/backup \
  alpine tar czf /backup/storage_$(date +%Y%m%d).tar.gz -C /source .
```

### Restore from Backup

**Restore Database:**
```bash
# Stop services
docker-compose down

# Restore from backup
gunzip -c /opt/easyping-backups/easyping_db_20250122.sql.gz | \
  docker exec -i easyping-postgres psql -U postgres easyping

# Start services
docker-compose up -d
```

---

## Monitoring and Maintenance

### Health Checks

**Manual Check:**
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f web
docker-compose logs -f postgres

# Check resource usage
docker stats
```

**External Uptime Monitoring (Recommended):**

**UptimeRobot (Free):**
1. Create account: https://uptimerobot.com
2. Add HTTP(s) monitor: `https://support.yourcompany.com/api/health`
3. Alert via email when down

**Healthchecks.io (Free):**
1. Create account: https://healthchecks.io
2. Create check with 24-hour interval
3. Add to cron: `curl -fsS https://hc-ping.com/your-uuid > /dev/null`

### Updates

**Check for Updates:**
```bash
cd /path/to/easyping
git fetch origin
git log --oneline HEAD..origin/main
```

**Apply Updates:**
```bash
# Backup first!
/opt/easyping-backup.sh

# Pull latest code
git pull origin main

# Pull updated Docker images
docker-compose pull

# Restart services (includes migrations)
docker-compose up -d

# Verify health
docker-compose ps
curl https://support.yourcompany.com/api/health
```

### Log Rotation

Docker logs can grow large over time:

```bash
# View log sizes
docker-compose logs --tail=0 | wc -l

# Configure log rotation in docker-compose.yml:
services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Troubleshooting

### Issue: Cannot Access EasyPing via Domain

**Symptoms:** Browser shows "This site can't be reached" or "Connection refused"

**Diagnosis:**
```bash
# Check DNS resolution
dig support.yourcompany.com +short
# Should return your server IP

# Check Docker services running
docker-compose ps
# All services should show "Up (healthy)"

# Check Caddy logs
docker-compose logs caddy
# Look for SSL certificate errors

# Check firewall
sudo ufw status
# Ports 80 and 443 should be ALLOW
```

**Solutions:**
- DNS not propagated: Wait 5-60 minutes after DNS changes
- Firewall blocking: Open ports 80 and 443 (`sudo ufw allow 80,443/tcp`)
- Caddy not running: `docker-compose restart caddy`
- Domain incorrect: Update `DOMAIN` in `.env` and restart

---

### Issue: 502 Bad Gateway

**Symptoms:** Browser shows "502 Bad Gateway" error

**Diagnosis:**
```bash
# Check Next.js app status
docker-compose logs web
# Look for errors or "Listening on port 3000"

# Check Caddy reverse proxy config
docker-compose exec caddy cat /etc/caddy/Caddyfile
```

**Solutions:**
- Next.js app crashed: `docker-compose restart web`
- Database connection issue: Check `POSTGRES_PASSWORD` in `.env`
- Memory issue: Server out of RAM, check `docker stats`

---

### Issue: SSL Certificate Not Issued

**Symptoms:** Browser shows "Not Secure" or "NET::ERR_CERT_AUTHORITY_INVALID"

**Diagnosis:**
```bash
# Check Caddy logs for Let's Encrypt errors
docker-compose logs caddy | grep -i "certificate"

# Verify DNS points to server
dig support.yourcompany.com +short
```

**Solutions:**
- DNS not pointing to server: Fix A record and wait
- Port 80 blocked: Let's Encrypt requires port 80 for HTTP challenge
- Domain unreachable from internet: Check firewall, router port forwarding
- Rate limit hit: Let's Encrypt has rate limits, use staging first

**Staging Certificate (Testing):**

Edit `docker/Caddyfile`:
```
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

support.yourcompany.com {
    reverse_proxy web:3000
}
```

---

### Issue: Setup Wizard Doesn't Appear

**Symptoms:** Accessing EasyPing shows login page instead of setup wizard

**Cause:** Organization already exists in database

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
docker-compose down
docker volume rm easyping_postgres_data
docker-compose up -d
```

---

### Issue: Email Notifications Not Sending

**Diagnosis:**
```bash
# Check SMTP configuration
docker-compose exec web env | grep SMTP

# Test SMTP connection
docker-compose exec web npx nodemailer-test \
  --host=$SMTP_HOST \
  --port=$SMTP_PORT \
  --user=$SMTP_USER \
  --pass=$SMTP_PASSWORD
```

**Solutions:**
- Incorrect SMTP credentials: Verify with provider dashboard
- SMTP port blocked: Some ISPs block port 25, use 587 or 465
- Missing environment variables: Check `.env` file
- Using Supabase default: Configure external SMTP for custom emails

---

## Support and Resources

**Documentation:**
- GitHub Repository: https://github.com/yourusername/easyping
- Community Forum: https://github.com/yourusername/easyping/discussions
- Bug Reports: https://github.com/yourusername/easyping/issues

**Community:**
- Discord Server: [Link]
- Reddit: r/easyping

**Professional Support:**
- Enterprise support available via ServicePing.me

---

**End of Deployment Guide**
