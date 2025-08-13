#!/bin/bash
set -euo pipefail

# Development wrapper script
# This script calls the development script in the dev directory

echo "🔧 Development Environment Wrapper"
echo "   Redirecting to dev/dev.sh..."
echo ""

# Change to the dev directory and run the development script
cd "$(dirname "$0")/dev" && ./dev.sh