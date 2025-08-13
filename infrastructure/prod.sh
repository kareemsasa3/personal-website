#!/bin/bash
set -euo pipefail

# Production wrapper script
# This script calls the production script in the prod directory

echo "🚀 Production Environment Wrapper"
echo "   Redirecting to prod/prod.sh..."
echo ""

# Change to the prod directory and run the production script
cd "$(dirname "$0")/prod" && ./prod.sh