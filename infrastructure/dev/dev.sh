#!/bin/bash
set -euo pipefail

# Development script for the portfolio stack
# This script starts the services in development mode with live reloading

echo "🚀 Starting portfolio stack in DEVELOPMENT mode..."
echo "   This will start all services with live reloading enabled"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_UP_ARGS=(up)

# Check if docker-compose.dev.yml exists
if [ ! -f "$SCRIPT_DIR/docker-compose.dev.yml" ]; then
    echo "❌ Error: docker-compose.dev.yml not found!"
    echo "   Please ensure you're running this script from the dev directory"
    echo "   and that the development configuration file exists."
    exit 1
fi

cd "$REPO_ROOT"

for arg in "$@"; do
    case "$arg" in
        --build)
            COMPOSE_UP_ARGS+=(--build)
            ;;
        *)
            echo "❌ Error: Unknown option '$arg'"
            echo "   Usage: ./dev.sh [--build]"
            exit 1
            ;;
    esac
done

# Start in development mode
echo ""
echo "🔧 Starting development stack with live reloading..."
if [[ " ${COMPOSE_UP_ARGS[*]} " == *" --build "* ]]; then
    echo "   Rebuilding images and starting all services (this may take a moment)..."
else
    echo "   Reusing existing images and containers when possible for a faster startup..."
fi
docker compose \
  --project-directory "$REPO_ROOT" \
  --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/dev/docker-compose.dev.yml \
  "${COMPOSE_UP_ARGS[@]}" || exit 1

echo ""
echo "✅ Development stack successfully started!"
echo ""
echo "📱 Your services are now available at:"
echo "   • Web (Frontend):           http://localhost"
echo ""
echo "🔄 Live reloading is active for:"
echo "   • Web: React/Vite changes will hot-reload in the browser"
echo ""
echo "💡 Development Tips:"
echo "   • Check the logs above for any startup errors"
echo "   • Use 'docker compose logs -f [service-name]' to follow specific service logs"
echo "   • The frontend will automatically reload when you save changes"
echo ""
echo "⏹️  To stop the development stack, press Ctrl+C"
echo "   This will gracefully shut down all services"
