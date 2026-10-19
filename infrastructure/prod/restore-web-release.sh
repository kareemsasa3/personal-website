#!/usr/bin/env bash
# Emergency, operator-run restore of a known web release on the production host.
#
# For when the deploy workflow, or deploy-release.sh itself, cannot be used. It
# needs only SSH and Docker access on the host: no GitHub Actions, no registry
# access and no production secrets. Nothing runs it automatically; see
# docs/infrastructure/DEPLOYMENT_AND_ROLLBACK.md, "Emergency recovery".
#
#   restore-web-release.sh --image ghcr.io/<owner>/<repo>/web@sha256:<digest>
#       Preflight only: checks everything and changes nothing.
#   restore-web-release.sh --image ... --execute
#       Recreates web on that image, starts nginx if it is stopped, and verifies.
#
# The image must be named by digest and already be on this host. The script never
# pulls, never falls back to a tag, and touches only the web and nginx services.
set -euo pipefail

log() { printf '[restore] %s\n' "$*"; }
fail() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }
usage() { sed -n 's/^#   //p' "$0" >&2; exit 2; }

IMAGE=""
EXECUTE=0
PROJECT_DIR="${PROJECT_DIR:-$HOME/personal-website}"
RESTORE_WAIT_SECONDS="${RESTORE_WAIT_SECONDS:-180}"
RESTORE_POLL_SECONDS="${RESTORE_POLL_SECONDS:-5}"
WEB_CONTAINER="portfolio-web-prod"
NETWORK="portfolio-network-prod"

while [ $# -gt 0 ]; do
  case "$1" in
    --image) [ $# -ge 2 ] || usage; IMAGE="$2"; shift 2 ;;
    --execute) EXECUTE=1; shift ;;
    --project-dir) [ $# -ge 2 ] || usage; PROJECT_DIR="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf '[restore] unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

# --- Preflight: every check runs before anything changes -------------------------
[ -n "$IMAGE" ] || fail "--image is required; there is no default release"
[[ "$IMAGE" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+/web@sha256:[0-9a-f]{64}$ ]] \
  || fail "--image must be ghcr.io/<owner>/<repo>/web@sha256:<64 hex>; tags such as :latest are refused"

command -v docker >/dev/null || fail "docker is not installed"
command -v curl >/dev/null || fail "curl is not installed"
docker compose version >/dev/null 2>&1 \
  || fail "Docker Compose v2 ('docker compose') is required for --pull never"

cd "$PROJECT_DIR" || fail "project directory $PROJECT_DIR does not exist"
for f in infrastructure/.env infrastructure/docker-compose.yml \
  infrastructure/prod/docker-compose.prod.yml infrastructure/prod/docker-compose.monitoring.prod.yml; do
  [ -f "$f" ] || fail "missing $PROJECT_DIR/$f"
done
env_value() { sed -n "s/^$1=//p" infrastructure/.env | tail -n 1; }
DOMAIN_NAME="$(env_value DOMAIN_NAME)"
HTTPS_PORT="$(env_value NGINX_HTTPS_PORT)"
HTTPS_PORT="${HTTPS_PORT:-443}"
[ -n "$DOMAIN_NAME" ] || fail "DOMAIN_NAME is not set in infrastructure/.env"

docker image inspect "$IMAGE" >/dev/null 2>&1 \
  || fail "$IMAGE is not on this host. This script does not pull. If the registry is reachable, run 'docker pull $IMAGE' and re-run"
image_id="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
docker network inspect "$NETWORK" >/dev/null 2>&1 || fail "Docker network $NETWORK does not exist"

WORK_DIR="$(mktemp -d -t restore-web-XXXXXX)"
chmod 700 "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT
# A literal digest, not ${WEB_IMAGE}: nothing in .env or the shell can replace it.
printf 'services:\n  web:\n    build: null\n    image: %s\n' "$IMAGE" > "$WORK_DIR/images.yml"
printf 'networks:\n  %s:\n    external: true\n    name: %s\n' "$NETWORK" "$NETWORK" > "$WORK_DIR/network.yml"

# Compose interpolates the monitoring file even when only web and nginx are started.
# With only those services named, these values are not applied to any container.
if [ -z "${GRAFANA_ADMIN_USER:-}" ] || [ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]; then
  log "GRAFANA_ADMIN_* not set; using placeholders for interpolation only (monitoring is not touched)"
fi
export GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-restore-placeholder}"
export GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-restore-placeholder}"

compose() {
  docker compose --project-directory "$PROJECT_DIR" --env-file infrastructure/.env \
    -f infrastructure/docker-compose.yml \
    -f infrastructure/prod/docker-compose.prod.yml \
    -f infrastructure/prod/docker-compose.monitoring.prod.yml \
    -f "$WORK_DIR/images.yml" -f "$WORK_DIR/network.yml" "$@"
}
( umask 077 && compose config > "$WORK_DIR/rendered.yml" ) || fail "compose configuration does not render"
# The image line inside the rendered web service, whatever registry it names.
resolved="$(awk '/^[^ ]/ { section = $0 }
  section == "services:" && /^  [^ ]/ { service = $1 }
  section == "services:" && service == "web:" && /^    image: / { print $2 }' "$WORK_DIR/rendered.yml")"
[ "$resolved" = "$IMAGE" ] || fail "compose resolves web to '${resolved:-nothing}', not $IMAGE"

current="none"
if running_id="$(docker inspect --format '{{.Image}}' "$WEB_CONTAINER" 2>/dev/null)"; then
  current="$running_id"
  [ "$running_id" = "$image_id" ] && current="$running_id (already this image)"
fi
log "Image:            $IMAGE"
log "Local image ID:   $image_id"
log "Running web now:  $current"
log "Compose resolves web to the requested digest"

if [ "$EXECUTE" -ne 1 ]; then
  log "Preflight passed. Nothing was changed. Re-run with --execute to restore."
  exit 0
fi

# --- Restore -----------------------------------------------------------------------
log "Recreating web on $IMAGE and starting nginx if it is stopped (no pull)"
compose up -d --no-build --pull never web nginx || fail "compose up failed; inspect 'docker ps -a'"

restored() {
  [ "$(docker inspect --format '{{.Image}}' "$WEB_CONTAINER" 2>/dev/null)" = "$image_id" ] || return 1
  [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$WEB_CONTAINER")" = healthy ] || return 1
  curl -fsS -k -o /dev/null -m 10 --resolve "$DOMAIN_NAME:$HTTPS_PORT:127.0.0.1" "https://$DOMAIN_NAME:$HTTPS_PORT/"
}
deadline=$((SECONDS + RESTORE_WAIT_SECONDS))
until restored; do
  [ "$SECONDS" -lt "$deadline" ] || fail "web on $IMAGE did not become healthy and served through nginx within ${RESTORE_WAIT_SECONDS}s"
  sleep "$RESTORE_POLL_SECONDS"
done

mkdir -p "$PROJECT_DIR/.deploy"
printf '%s\n' "$IMAGE" > "$PROJECT_DIR/.deploy/current-web-image"
printf '%s manual-restore %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$IMAGE" >> "$PROJECT_DIR/.deploy/releases.log"
log "Restored: $IMAGE is healthy and served by nginx at https://$DOMAIN_NAME:$HTTPS_PORT/"
