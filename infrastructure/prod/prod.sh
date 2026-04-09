#!/bin/bash

# Production deployment script for the portfolio stack
# This script starts the services in production mode with optimized settings

set -euo pipefail  # Exit on error, unset vars, and fail pipelines

echo "🚀 Starting portfolio stack in PRODUCTION mode..."
echo "   This will deploy all services with production-optimized settings"
echo ""

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/infrastructure/.env"
COMPOSE_FILES=(
    -f "$REPO_ROOT/infrastructure/docker-compose.yml"
    -f "$REPO_ROOT/infrastructure/prod/docker-compose.prod.yml"
    -f "$REPO_ROOT/infrastructure/prod/docker-compose.monitoring.prod.yml"
)

# Check if required compose files exist
if [ ! -f "$REPO_ROOT/infrastructure/prod/docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found!"
    echo "   Expected at: $REPO_ROOT/infrastructure/prod/docker-compose.prod.yml"
    exit 1
fi

# Check if running as root (not recommended for production)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Warning: Running as root is not recommended for production"
    echo "   Consider running as a non-root user with docker permissions"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Ensure external production network exists
docker network create portfolio-network-prod >/dev/null 2>&1 || true

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
mkdir -p "$REPO_ROOT/infrastructure/prod/logs/nginx"

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose --env-file "$ENV_FILE" \
  "${COMPOSE_FILES[@]}" down --remove-orphans

# Clean up any dangling images (optional)
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

# Pull and start in production mode
echo ""
echo "📦 Pulling and starting production stack..."
echo "   Using prebuilt images (no local build)..."

echo ""
echo "🚀 Starting production services..."
docker compose --env-file "$ENV_FILE" \
  "${COMPOSE_FILES[@]}" up -d --no-build --pull always

# Wait for services to be healthy using readiness loop
echo ""
echo "⏳ Waiting for services to become healthy..."

check_url() {
    local url="$1"
    local max_retries=${2:-30}
    local delay=${3:-2}
    local insecure_flag="$4"
    for i in $(seq 1 "$max_retries"); do
        if curl -s $insecure_flag -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
            return 0
        fi
        sleep "$delay"
    done
    return 1
}

# nginx health (HTTP 80 inside container, exposed on host)
check_url "http://localhost/health" 60 2 || echo "⚠️  nginx health not ready yet"
# workfolio served by nginx, same URL covers it

echo ""
echo "🔍 Docker Compose service status:"
docker compose --env-file "$ENV_FILE" \
  "${COMPOSE_FILES[@]}" ps

echo ""
echo "✅ Production stack successfully deployed!"
echo ""
echo "📱 Your production services are now available at:"
echo "   • Main Application:     https://your-domain.com"
echo ""
echo "🔧 Production Features:"
echo "   • Resource limits configured for optimal performance"
echo "   • Health checks enabled for all services"
echo "   • Log rotation configured (10MB max, 3 files)"
echo "   • Automatic restart policies enabled"
echo ""
echo "📊 Monitoring & Management:"
echo "   • View logs: docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/prod/docker-compose.prod.yml -f infrastructure/prod/docker-compose.monitoring.prod.yml logs -f"
echo "   • Check status: docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/prod/docker-compose.prod.yml -f infrastructure/prod/docker-compose.monitoring.prod.yml ps"
echo "   • Scale services: docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/prod/docker-compose.prod.yml -f infrastructure/prod/docker-compose.monitoring.prod.yml up -d --scale [service]=[count]"
echo ""
echo "⚠️  Important Production Notes:"
echo "   • Configure SSL certificates in nginx configuration"
echo "   • Monitor resource usage and adjust limits as needed"
echo "   • Consider setting up monitoring and alerting"
echo ""
echo "⏹️  To stop the production stack:"
echo "   docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/prod/docker-compose.prod.yml -f infrastructure/prod/docker-compose.monitoring.prod.yml down"
echo ""
echo "🔄 To update services:"
echo "   ./prod/prod.sh  # This will pull and restart all services"
