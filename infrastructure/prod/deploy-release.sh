#!/usr/bin/env bash
# Deploys one web release to the production host. The ssh-deploy action syncs
# infrastructure/ to the host and streams this script to it over SSH (bash -s).
#
# Inputs (environment):
#   REPO             owner/repo; the image is ghcr.io/$REPO/web
#   SHA              40-character commit SHA; the image tag to deploy
#   EXPECTED_DIGEST  optional sha256:<64 hex>; the deploy fails unless the tag
#                    resolves to exactly this digest
#   GHCR_USERNAME, GHCR_TOKEN, GRAFANA_ADMIN_USER, GRAFANA_ADMIN_PASSWORD
#   PROJECT_DIR      defaults to $HOME/personal-website
#
# Order matters. Every check that can fail without touching the running stack
# runs first: input validation, image pull and digest resolution, compose
# rendering, pulling the other images, and the TLS certificate check. Only then
# are containers replaced. The web image is written into a compose override as a
# literal digest reference, so infrastructure/.env (which in production sets
# WEB_IMAGE to :latest) cannot substitute a different image.
set -euo pipefail

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

PROJECT_DIR="${PROJECT_DIR:-$HOME/personal-website}"
COMPOSE_PROJECT="personal-website"
WEB_CONTAINER="portfolio-web-prod"
NGINX_CONTAINER="portfolio-nginx-prod"
DEPLOY_WAIT_SECONDS="${DEPLOY_WAIT_SECONDS:-300}"
DEPLOY_POLL_SECONDS="${DEPLOY_POLL_SECONDS:-5}"

# --- Inputs -----------------------------------------------------------------
: "${REPO:?missing REPO}"
: "${SHA:?missing SHA}"
EXPECTED_DIGEST="${EXPECTED_DIGEST:-}"
[[ "$REPO" =~ ^[a-z0-9_.-]+/[a-z0-9_.-]+$ ]] || fail "REPO must be a lowercase owner/repo"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || fail "SHA must be a full 40-character commit SHA"
if [ -n "$EXPECTED_DIGEST" ] && [[ ! "$EXPECTED_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  fail "EXPECTED_DIGEST must look like sha256:<64 hex characters>"
fi
if [ "${DEPLOY_ANONYMOUS_PULL:-}" != 1 ]; then
  : "${GHCR_TOKEN:?missing GHCR_TOKEN}"
  : "${GHCR_USERNAME:?missing GHCR_USERNAME}"
fi
: "${GRAFANA_ADMIN_USER:?missing GRAFANA_ADMIN_USER}"
: "${GRAFANA_ADMIN_PASSWORD:?missing GRAFANA_ADMIN_PASSWORD}"
export GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD

cd "$PROJECT_DIR"
WEB_REPO="ghcr.io/$REPO/web"

WORK_DIR="$(mktemp -d -t deploy-release-XXXXXX)"
chmod 700 "$WORK_DIR"
export DOCKER_CONFIG="$WORK_DIR/docker-config"
mkdir -p "$DOCKER_CONFIG"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Disk usage before deploy:" && df -h /
echo "Docker disk usage before deploy:"
docker system df || true

# --- Environment file -------------------------------------------------------
if [ -f infrastructure/.env ]; then
  log "Loading environment from infrastructure/.env"
  set -a
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    printf '%s' "$line" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*=' || continue
    # shellcheck disable=SC2163 # $line is NAME=value, so this exports NAME.
    export "$line"
  done < infrastructure/.env
  set +a
else
  fail "infrastructure/.env not found"
fi
[ -n "${DOMAIN_NAME:-}" ] || fail "DOMAIN_NAME is required in infrastructure/.env"
if [ -n "${WEB_IMAGE:-}" ]; then
  log "Ignoring WEB_IMAGE from the environment; the release image is pinned by digest"
fi
HTTPS_PORT="${NGINX_HTTPS_PORT:-443}"

test -f infrastructure/nginx/nginx.conf || fail "missing infrastructure/nginx/nginx.conf"
test -f infrastructure/monitoring/prometheus/prometheus.yml || fail "missing infrastructure/monitoring/prometheus/prometheus.yml"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose --project-directory "$PROJECT_DIR")
else
  COMPOSE_CMD=(docker compose --project-directory "$PROJECT_DIR")
fi
IMAGE_OVERRIDE="$WORK_DIR/compose.images.override.yml"
NETWORK_OVERRIDE="$WORK_DIR/compose.network.override.yml"
RENDERED="$WORK_DIR/compose.rendered.yml"
compose() {
  "${COMPOSE_CMD[@]}" --env-file infrastructure/.env \
    -f infrastructure/docker-compose.yml \
    -f infrastructure/prod/docker-compose.prod.yml \
    -f infrastructure/prod/docker-compose.monitoring.prod.yml \
    -f "$IMAGE_OVERRIDE" -f "$NETWORK_OVERRIDE" "$@"
}
# A literal reference, not ${WEB_IMAGE}: interpolation is what let .env win.
write_image_override() {
  cat > "$IMAGE_OVERRIDE" <<EOF
services:
  web:
    build: null
    image: $1
EOF
}
cat > "$NETWORK_OVERRIDE" <<'EOF'
networks:
  portfolio-network-prod:
    external: true
    name: portfolio-network-prod
EOF

wait_for() {
  local deadline=$((SECONDS + DEPLOY_WAIT_SECONDS))
  until "$@"; do
    [ "$SECONDS" -lt "$deadline" ] || return 1
    sleep "$DEPLOY_POLL_SECONDS"
  done
}

# --- Pre-disruption checks: nothing running is touched until all pass --------
if [ "${DEPLOY_ANONYMOUS_PULL:-}" = 1 ]; then
  log "Anonymous registry pull (rehearsal only)"
else
  log "Logging in to ghcr.io as $GHCR_USERNAME"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null \
    || fail "registry login failed; nothing was stopped"
fi

log "Pulling $WEB_REPO:$SHA"
pull_output="$(docker pull "$WEB_REPO:$SHA" 2>&1)" \
  || fail "image $WEB_REPO:$SHA could not be pulled; nothing was stopped: $(printf '%s' "$pull_output" | tail -n 1)"
digest="$(printf '%s\n' "$pull_output" | sed -n 's/^Digest: \(sha256:[0-9a-f]\{64\}\)$/\1/p' | head -n 1)"
[ -n "$digest" ] || fail "could not resolve the digest of $WEB_REPO:$SHA; nothing was stopped"
if [ -n "$EXPECTED_DIGEST" ] && [ "$digest" != "$EXPECTED_DIGEST" ]; then
  fail "$WEB_REPO:$SHA resolves to $digest, not the expected $EXPECTED_DIGEST; nothing was stopped"
fi
WEB_IMAGE="$WEB_REPO@$digest"
export WEB_IMAGE
docker image inspect "$WEB_IMAGE" >/dev/null || fail "$WEB_IMAGE is not available locally; nothing was stopped"
log "Release image: $WEB_IMAGE"

write_image_override "$WEB_IMAGE"
docker network create portfolio-network-prod >/dev/null 2>&1 || true
log "Rendering compose configuration"
( umask 077 && compose config > "$RENDERED" ) || fail "compose configuration is invalid; nothing was stopped"
if grep -q "infrastructure/infrastructure" "$RENDERED"; then
  fail "compose configuration contains a doubled infrastructure path; nothing was stopped"
fi
rendered_web_images="$(sed -n "s|^ *image: \\(${WEB_REPO}[@:].*\\)$|\\1|p" "$RENDERED" | sort -u)"
[ "$rendered_web_images" = "$WEB_IMAGE" ] \
  || fail "compose would run '$rendered_web_images' instead of $WEB_IMAGE; nothing was stopped"
grep -n "prometheus.yml\|nginx.conf\|conf.d" "$RENDERED" | head -n 50 || true

log "Pulling the remaining service images"
compose pull || fail "pulling service images failed; nothing was stopped"

# Certbot keeps live/ and archive/ root-owned with mode 700, so the deploy user
# cannot see the certificate from the host and a plain [ -f ] reports it missing.
# Check through Docker instead, which this user already runs: a read-only mount, no
# network, and only file sizes are tested. Exit 1 from test means absent; anything
# else means the check itself failed.
CERT_DIR="infrastructure/nginx/ssl"
certificate_state() {
  local live="$CERT_DIR/live/$DOMAIN_NAME" status=0
  if [ -s "$live/fullchain.pem" ] && [ -s "$live/privkey.pem" ]; then
    echo present; return
  fi
  if [ ! -e "$CERT_DIR" ]; then
    echo absent; return
  fi
  docker run --rm --network none --entrypoint /bin/sh \
    -v "$PROJECT_DIR/$CERT_DIR:/ssl:ro" nginx:alpine \
    -c 'test -s "/ssl/live/$1/fullchain.pem" && test -s "/ssl/live/$1/privkey.pem"' \
    sh "$DOMAIN_NAME" >/dev/null 2>&1 || status=$?
  case "$status" in
    0) echo present ;;
    1) echo absent ;;
    *) echo unknown ;;
  esac
}
case "$(certificate_state)" in
  present) log "TLS certificate for $DOMAIN_NAME is present" ;;
  absent) fail "no TLS certificate for $DOMAIN_NAME; provision it first (infrastructure/prod/lets-encrypt-setup.sh). Nothing was stopped" ;;
  *) fail "could not determine whether the TLS certificate for $DOMAIN_NAME exists; nothing was stopped" ;;
esac

# nginx bind-mounts the first two; the renewal cron job appends its log to the third,
# and cannot run if that redirect fails. Create whichever is missing now, while a
# failure still changes nothing. Existing directories are left as they are.
for dir in infrastructure/nginx/certbot/www infrastructure/logs/nginx infrastructure/logs/certbot; do
  [ -d "$dir" ] || mkdir -p "$dir" \
    || fail "cannot create $PROJECT_DIR/$dir; create it on the host (its parent may be owned by root). Nothing was stopped"
done
if [ ! -w infrastructure/logs/certbot ]; then
  log "WARNING: infrastructure/logs/certbot is not writable by $(id -un); the certificate renewal cron job cannot write its log"
fi

# Record what is running now, so an unhealthy release can be reverted.
previous_image=""
if previous_id="$(docker inspect --format '{{.Image}}' "$WEB_CONTAINER" 2>/dev/null)"; then
  previous_image="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$previous_id" \
    | grep -m 1 "^$WEB_REPO@sha256:" || true)"
fi
log "Previous web image: ${previous_image:-none recorded}"

# --- Replace containers ------------------------------------------------------
# Containers with production names that this compose project does not manage would
# block container creation. Project containers are left running; compose recreates
# only the services whose configuration changed.
for id in $(docker ps -aq --filter 'name=^portfolio-.*-prod$'); do
  project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null || true)"
  if [ "$project" != "$COMPOSE_PROJECT" ]; then
    log "Removing container $id (compose project '${project:-none}')"
    docker rm -f "$id" >/dev/null
  fi
done

# The proxy's own /health answers without reaching the web container, so check the
# container directly: it runs the pinned image, its healthcheck passes, and the
# proxy serves the site from it.
web_serving() {
  local image_id running_id
  image_id="$(docker image inspect --format '{{.Id}}' "$1")" || return 1
  running_id="$(docker inspect --format '{{.Image}}' "$WEB_CONTAINER" 2>/dev/null)" || return 1
  [ "$running_id" = "$image_id" ] || return 1
  [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$WEB_CONTAINER")" = healthy ] || return 1
  curl -fsS -k -o /dev/null -m 10 --resolve "$DOMAIN_NAME:$HTTPS_PORT:127.0.0.1" "https://$DOMAIN_NAME:$HTTPS_PORT/"
}

log "Starting services"
started=1
compose up -d --no-build --remove-orphans || started=0
compose ps || true

if [ "$started" = 1 ]; then
  log "Waiting for the web release to serve"
fi
if [ "$started" = 0 ] || ! wait_for web_serving "$WEB_IMAGE"; then
  if [ -n "$previous_image" ] && [ "$previous_image" != "$WEB_IMAGE" ]; then
    log "Release is not serving; restoring $previous_image"
    write_image_override "$previous_image"
    compose up -d --no-build web
    if wait_for web_serving "$previous_image"; then
      fail "release $WEB_IMAGE did not become healthy; the previous web image $previous_image is serving again"
    fi
    fail "release $WEB_IMAGE did not become healthy, and the previous web image $previous_image did not recover either"
  fi
  fail "release $WEB_IMAGE did not become healthy and no previous web image was recorded"
fi
log "Web release is serving"

log "Post-up: nginx config test"
docker exec "$NGINX_CONTAINER" nginx -t || fail "nginx config test failed; the web release is serving"

monitoring_healthy() {
  curl -fsS -m 5 http://localhost:9090/-/healthy >/dev/null 2>&1 &&
    curl -fsS -m 5 http://localhost:3000/api/health >/dev/null 2>&1
}
log "Waiting for monitoring services"
wait_for monitoring_healthy || fail "monitoring health checks failed (Prometheus or Grafana); the web release is serving"
log "Monitoring services healthy"

# Release history outside infrastructure/, which every deploy overwrites.
mkdir -p "$PROJECT_DIR/.deploy"
printf '%s\n' "$WEB_IMAGE" > "$PROJECT_DIR/.deploy/current-web-image"
printf '%s %s %s previous=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SHA" "$WEB_IMAGE" "${previous_image:-none}" \
  >> "$PROJECT_DIR/.deploy/releases.log"

echo "Disk usage after deploy:" && df -h /
echo "Docker disk usage after deploy:"
docker system df || true

log "Ensuring daily cert renewal cron job exists"
CRON_LINE="0 3 * * * bash -lc 'PROJECT_DIR=\"$HOME/personal-website\" $HOME/personal-website/infrastructure/prod/renew-ssl.sh >> $HOME/personal-website/infrastructure/logs/certbot/cron.log 2>&1'"
(crontab -l 2>/dev/null || true) | grep -F "$HOME/personal-website/infrastructure/prod/renew-ssl.sh" >/dev/null 2>&1 || \
( (crontab -l 2>/dev/null || true; echo "$CRON_LINE") | crontab - )

log "Deployed $WEB_IMAGE ($SHA)"
