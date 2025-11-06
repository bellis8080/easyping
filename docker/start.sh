#!/bin/bash
# EasyPing Docker Deployment Startup Script
# This script handles the complete deployment in one command

set -e

cd "$(dirname "$0")"

echo "========================================="
echo "EasyPing Docker Deployment"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Please copy .env.example to .env and configure it:"
  echo "  cp .env.example .env"
  echo "  nano .env"
  exit 1
fi

echo "Step 1: Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

echo ""
echo "Step 2: Building Docker images..."
docker-compose build

echo ""
echo "Step 3: Starting services..."
docker-compose up -d

echo ""
echo "Step 4: Waiting for PostgreSQL to be ready..."
sleep 5
until docker exec easyping-postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "  Still waiting for PostgreSQL..."
  sleep 2
done
echo "  PostgreSQL is ready!"

echo ""
echo "Step 5: Initializing database..."
./scripts/init-db.sh

echo ""
echo "Step 6: Restarting services to pick up database changes..."
docker-compose restart postgrest gotrue web

echo ""
echo "Step 7: Waiting for services to be fully ready..."
sleep 10

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Services Status:"
docker-compose ps
echo ""
echo "Access the application:"
echo "  - HTTP:  http://localhost"
echo "  - HTTPS: https://localhost (self-signed certificate)"
echo ""
echo "Health Check:"
echo "  curl -k https://localhost/api/health"
echo ""
echo "View Logs:"
echo "  docker-compose logs -f web"
echo ""
echo "Stop Services:"
echo "  docker-compose down"
echo ""
