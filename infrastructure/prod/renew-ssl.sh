#!/usr/bin/env bash
set -euo pipefail

# Location of the cloned repo on the server
PROJECT_DIR="${PROJECT_DIR:-$HOME/personal-website}"
cd "$PROJECT_DIR"

# Ensure directories exist
mkdir -p infrastructure/nginx/ssl \
         infrastructure/nginx/certbot/www \
         infrastructure/logs/certbot

CERTBOT_IMAGE="certbot/certbot:latest"

echo "[renew-ssl] Starting certbot renew (webroot)..."
certbot_status=0
docker run --rm \
  -v "$(pwd)/infrastructure/nginx/ssl:/etc/letsencrypt" \
  -v "$(pwd)/infrastructure/nginx/certbot/www:/var/www/certbot" \
  -v "$(pwd)/infrastructure/logs/certbot:/var/log/letsencrypt" \
  "$CERTBOT_IMAGE" renew --webroot -w /var/www/certbot --quiet || certbot_status=$?

if [ "$certbot_status" -ne 0 ]; then
  echo "[renew-ssl] ERROR: certbot renew failed (exit $certbot_status); nginx not reloaded." >&2
  exit "$certbot_status"
fi

# Reload nginx if it's up. Never reload or restart after a failed config test.
NGINX_CONTAINER="portfolio-nginx-prod"
running="$(docker ps --filter "name=^${NGINX_CONTAINER}\$" --format '{{.Names}}')"
if [ "$running" = "$NGINX_CONTAINER" ]; then
  if ! docker exec "$NGINX_CONTAINER" nginx -t; then
    echo "[renew-ssl] ERROR: nginx config test failed; nginx not reloaded." >&2
    exit 1
  fi
  echo "[renew-ssl] Reloading nginx..."
  docker exec "$NGINX_CONTAINER" nginx -s reload
else
  echo "[renew-ssl] $NGINX_CONTAINER is not running; skipping reload."
fi

echo "[renew-ssl] Done."


