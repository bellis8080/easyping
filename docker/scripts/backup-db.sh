#!/bin/bash
# Database backup script for EasyPing
# Creates a timestamped PostgreSQL database dump

set -e

# Configuration
CONTAINER_NAME="easyping-postgres"
DB_USER="postgres"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔄 Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: Container '${CONTAINER_NAME}' is not running${NC}"
    exit 1
fi

# Create backup
echo "📦 Creating backup: ${BACKUP_FILE}"
if docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" --clean --if-exists > "${BACKUP_FILE}"; then
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "📊 Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "📁 Backup location: ${BACKUP_FILE}"

    # List recent backups
    echo ""
    echo "📋 Recent backups:"
    ls -lh "${BACKUP_DIR}"/backup_*.sql | tail -5
else
    echo -e "${RED}❌ Backup failed!${NC}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Optional: Keep only last 30 backups
echo ""
echo "🧹 Cleaning old backups (keeping last 30)..."
cd "${BACKUP_DIR}"
ls -t backup_*.sql | tail -n +31 | xargs -r rm -f
echo -e "${GREEN}✅ Cleanup completed${NC}"
