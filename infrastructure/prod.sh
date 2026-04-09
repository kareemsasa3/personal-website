#!/usr/bin/env bash
set -euo pipefail

# Production wrapper script
# This script calls the production script in the prod directory

echo "🚀 Production Environment Wrapper"
echo "   Redirecting to prod/prod.sh..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$SCRIPT_DIR/prod/prod.sh" "$@"
