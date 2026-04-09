#!/usr/bin/env bash
set -euo pipefail

# Development wrapper script
# This script calls the development script in the dev directory

echo "🔧 Development Environment Wrapper"
echo "   Redirecting to dev/dev.sh..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$SCRIPT_DIR/dev/dev.sh" "$@"
