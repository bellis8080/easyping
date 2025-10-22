# Deployment Architecture

## Docker Compose Deployment

Complete Docker Compose stack for self-hosted EasyPing deployment.

**Deployment Steps:**

1. **Prepare Server (Ubuntu 22.04+):**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

2. **Deploy EasyPing:**
```bash
# Clone repository
git clone https://github.com/yourusername/easyping.git
cd easyping/docker

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Pull and start services
docker-compose pull
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs -f web
```

3. **Access Application:**
```
https://your-domain.com
```

## CI/CD Pipeline

**GitHub Actions Workflow:**
- **On PR:** Lint, typecheck, test, build
- **On Merge to Main:** Build Docker image, push to Docker Hub
- **On Tag (v*.*.*):** Create GitHub release, publish versioned image

## Backup Strategy

**Database Backups:**
```bash
# Daily automated backup
docker exec easyping-postgres pg_dump -U postgres > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i easyping-postgres psql -U postgres < backup_20250121.sql
```

**Storage Backups:**
```bash
# Backup uploaded files
docker cp easyping-storage:/var/lib/storage ./storage_backup
```

---
