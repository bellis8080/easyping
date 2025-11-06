#!/bin/bash
# Database restore script for EasyPing
# Restores a PostgreSQL database from a backup file

set -e

# Configuration
CONTAINER_NAME="easyping-postgres"
DB_USER="postgres"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo "Usage: $0 <backup_file.sql>"
    echo "Example: $0 ./backups/backup_20250128_120000.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}❌ Error: Backup file '${BACKUP_FILE}' not found${NC}"
    exit 1
fi

echo "🔄 Starting database restore..."
echo "📁 Backup file: ${BACKUP_FILE}"
echo "📊 File size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: Container '${CONTAINER_NAME}' is not running${NC}"
    exit 1
fi

# Warning prompt
echo -e "${YELLOW}⚠️  WARNING: This will overwrite all existing data in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Create backup of current database before restoring
echo "💾 Creating safety backup of current database..."
SAFETY_BACKUP="./backups/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p "./backups"
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" --clean --if-exists > "${SAFETY_BACKUP}" || {
    echo -e "${YELLOW}⚠️  Warning: Could not create safety backup${NC}"
}

# Restore database
echo "📥 Restoring database from backup..."
if docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" < "${BACKUP_FILE}"; then
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
    echo "💾 Safety backup saved to: ${SAFETY_BACKUP}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    echo "💾 Original database backup: ${SAFETY_BACKUP}"
    exit 1
fi

echo ""
echo "🎉 Restore completed!"
echo "📝 Note: You may need to restart the application for changes to take effect."
echo "   Run: docker-compose restart web"
