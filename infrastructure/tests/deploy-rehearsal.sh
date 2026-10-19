#!/usr/bin/env bash
# Rehearses deploy-release.sh against real Docker on a non-production machine: the
# production compose files, real published web images pulled anonymously from GHCR,
# and a self-signed certificate behind a mode-000 live/ directory (as certbot's
# root-owned 700 directories look to the deploy user). It deploys, rolls forward,
# exercises failures that must not disturb the running stack, and rolls back.
#
# Not run in CI: it pulls the full production image set and binds 127.0.0.1 ports
# 3000, 9090, 9100 and 9113 plus 18080/18443. It refuses to run if any
# portfolio-*-prod container already exists, and removes everything it created.
# Run: bash infrastructure/tests/deploy-rehearsal.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_NAME="kareemsasa3/personal-website"
WEB_REPO="ghcr.io/$REPO_NAME/web"
# Two published releases (commit, registry digest), as audited on 2026-10-19.
A_SHA="b780a13818309ec9ca67d0f79c72722954094fdf"
A_DIGEST="sha256:a2d01e12b7aa03cf1d34c28992d6d0fddedba0a32e42a05a83f26f59c44b3814"
B_SHA="a16c70fefc1e577b3bdfdef102d961a4b775b017"
B_DIGEST="sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07"
MISSING_SHA="0000000000000000000000000000000000000000"

if [ -n "$(docker ps -aq --filter 'name=^portfolio-.*-prod$')" ]; then
  echo "portfolio-*-prod containers already exist here; refusing to rehearse" >&2
  exit 1
fi

TMP="$(mktemp -d)"
PROJECT="$TMP/personal-website"
cleanup() {
  if [ -d "$PROJECT/infrastructure" ]; then
    chmod -R u+rwx "$PROJECT/infrastructure/nginx/ssl" 2>/dev/null || true
    (cd "$PROJECT" && GRAFANA_ADMIN_USER=rehearsal GRAFANA_ADMIN_PASSWORD=rehearsal-only \
      docker compose --project-directory "$PROJECT" --env-file infrastructure/.env \
      -f infrastructure/docker-compose.yml -f infrastructure/prod/docker-compose.prod.yml \
      -f infrastructure/prod/docker-compose.monitoring.prod.yml down --remove-orphans >/dev/null 2>&1) \
      || echo "WARNING: compose down failed; remove the rehearsal containers by hand" >&2
  fi
  # Anything compose missed that came from this project directory.
  docker ps -aq --filter "label=com.docker.compose.project.working_dir=$PROJECT" | xargs -r docker rm -f >/dev/null
  docker network rm portfolio-network-prod >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$PROJECT" "$TMP/bin"
cp -R "$ROOT/infrastructure" "$PROJECT/"
cat > "$PROJECT/infrastructure/.env" <<EOF
DOMAIN_NAME=kareemsasa.dev
WEB_IMAGE=$WEB_REPO:latest
NGINX_HTTP_PORT=18080
NGINX_HTTPS_PORT=18443
EOF
LIVE="$PROJECT/infrastructure/nginx/ssl/live"
mkdir -p "$LIVE/kareemsasa.dev"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=kareemsasa.dev" \
  -keyout "$LIVE/kareemsasa.dev/privkey.pem" -out "$LIVE/kareemsasa.dev/fullchain.pem" 2>/dev/null
chmod 000 "$LIVE"
# Keep this machine's real crontab untouched.
# shellcheck disable=SC2016 # the stub's own text, expanded when it runs
printf '#!/usr/bin/env bash\n[ "${1:-}" = -l ] && exit 1\ncat >/dev/null\n' > "$TMP/bin/crontab"
chmod +x "$TMP/bin/crontab"

failures=0
pass() { printf 'ok   %s\n' "$1"; }
bad() { printf 'FAIL %s: %s\n' "$1" "$2"; failures=$((failures + 1)); }

deploy() {
  local log="$TMP/deploy.log"
  STATUS=0
  env PATH="$TMP/bin:$PATH" PROJECT_DIR="$PROJECT" DEPLOY_ANONYMOUS_PULL=1 REPO="$REPO_NAME" \
    GRAFANA_ADMIN_USER=rehearsal GRAFANA_ADMIN_PASSWORD=rehearsal-only \
    "$@" bash "$ROOT/infrastructure/prod/deploy-release.sh" > "$log" 2>&1 || STATUS=$?
  OUTPUT="$(cat "$log")"
}
running_digest() {
  docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' \
    "$(docker inspect --format '{{.Image}}' portfolio-web-prod)" | sed -n "s|^$WEB_REPO@||p" | head -n 1
}
# Container IDs and start times: any stop, removal or recreation changes this.
stack_fingerprint() {
  docker ps -a --filter 'name=^portfolio-.*-prod$' --format '{{.ID}}' | sort \
    | xargs -r docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}} {{.State.Status}}'
}
serving() {
  curl -fsS -k -o /dev/null -m 10 --resolve kareemsasa.dev:18443:127.0.0.1 https://kareemsasa.dev:18443/
}
expect_untouched() {
  local name="$1" message="$2" before="$3"
  if [ "$STATUS" -eq 0 ]; then bad "$name" "deploy succeeded"
  elif ! grep -qF "$message" <<<"$OUTPUT"; then bad "$name" "missing '$message': $(tail -n 3 <<<"$OUTPUT")"
  elif [ "$(stack_fingerprint)" != "$before" ]; then bad "$name" "running containers changed"
  elif ! serving; then bad "$name" "site stopped serving"
  else pass "$name"; fi
}

echo "Rehearsal project: $PROJECT"

deploy SHA="$A_SHA" EXPECTED_DIGEST="$A_DIGEST"
if [ "$STATUS" -ne 0 ]; then bad "initial deploy" "$(tail -n 5 <<<"$OUTPUT")"; echo "$OUTPUT"; exit 1; fi
if [ "$(running_digest)" = "$A_DIGEST" ]; then
  pass "initial deploy runs release A by digest despite WEB_IMAGE=:latest in .env"
else bad "initial deploy" "running $(running_digest)"; fi
if grep -q certbot <<<"$OUTPUT"; then bad "initial deploy" "certbot ran"
else pass "certificate behind a mode-000 live/ is found without certbot"; fi
if [ "$(stack_fingerprint | wc -l)" -lt 7 ]; then
  bad "container fingerprint" "expected the full stack, got: $(stack_fingerprint)"
fi

others_before="$(stack_fingerprint | grep -v '^/portfolio-web-prod ')"

deploy SHA="$B_SHA" EXPECTED_DIGEST="$B_DIGEST"
if [ "$STATUS" -eq 0 ] && [ "$(running_digest)" = "$B_DIGEST" ] && serving; then
  pass "roll forward to release B ($B_SHA)"
else bad "roll forward" "status $STATUS, running $(running_digest): $(tail -n 3 <<<"$OUTPUT")"; fi
grep -qF "Previous web image: $WEB_REPO@$A_DIGEST" <<<"$OUTPUT" || bad "roll forward" "previous image not recorded"
if grep -q "Removing container" <<<"$OUTPUT"; then bad "roll forward" "removed a project container"
elif [ "$(stack_fingerprint | grep -v '^/portfolio-web-prod ')" != "$others_before" ]; then
  bad "roll forward" "containers other than web were recreated"
else pass "roll forward recreates only the web container"; fi

before="$(stack_fingerprint)"
deploy SHA="$MISSING_SHA"
expect_untouched "unavailable image leaves every container running untouched" "could not be pulled; nothing was stopped" "$before"

deploy SHA="$A_SHA" EXPECTED_DIGEST="$B_DIGEST"
expect_untouched "digest mismatch leaves every container running untouched" "not the expected $B_DIGEST" "$before"

cp "$PROJECT/infrastructure/prod/docker-compose.prod.yml" "$TMP/prod.yml.bak"
echo "  bogus: [" >> "$PROJECT/infrastructure/prod/docker-compose.prod.yml"
deploy SHA="$A_SHA" EXPECTED_DIGEST="$A_DIGEST"
cp "$TMP/prod.yml.bak" "$PROJECT/infrastructure/prod/docker-compose.prod.yml"
expect_untouched "invalid compose file leaves every container running untouched" "compose configuration is invalid" "$before"

chmod 700 "$LIVE"; mv "$LIVE" "$TMP/live.bak"; mkdir -p "$LIVE"; chmod 000 "$LIVE"
deploy SHA="$A_SHA" EXPECTED_DIGEST="$A_DIGEST"
chmod 700 "$LIVE"; rmdir "$LIVE"; mv "$TMP/live.bak" "$LIVE"; chmod 000 "$LIVE"
expect_untouched "absent certificate fails without issuance and without touching containers" "no TLS certificate for kareemsasa.dev" "$before"

deploy SHA="$A_SHA" EXPECTED_DIGEST="$A_DIGEST"
if [ "$STATUS" -eq 0 ] && [ "$(running_digest)" = "$A_DIGEST" ] && serving; then
  pass "rollback to release A by commit and digest"
else bad "rollback" "status $STATUS, running $(running_digest): $(tail -n 3 <<<"$OUTPUT")"; fi

# --- Emergency restore: no GitHub, no deploy script, no registry, no secrets -----
restore() {
  STATUS=0
  OUTPUT="$(env -u GHCR_TOKEN -u GHCR_USERNAME -u GRAFANA_ADMIN_USER -u GRAFANA_ADMIN_PASSWORD \
    PROJECT_DIR="$PROJECT" bash "$ROOT/infrastructure/prod/restore-web-release.sh" "$@" 2>&1)" || STATUS=$?
}
monitoring_fingerprint() { stack_fingerprint | grep -Ev '^/portfolio-(web|nginx)-prod '; }
docker rm -f portfolio-web-prod >/dev/null
docker stop portfolio-nginx-prod >/dev/null
if serving; then bad "emergency setup" "site still serving"; fi
before="$(stack_fingerprint)"; monitoring_before="$(monitoring_fingerprint)"

restore --image "$WEB_REPO@$B_DIGEST"
if [ "$STATUS" -eq 0 ] && grep -qF "Nothing was changed" <<<"$OUTPUT" && [ "$(stack_fingerprint)" = "$before" ]; then
  pass "emergency preflight with the site down passes and changes nothing"
else bad "emergency preflight" "status $STATUS: $(tail -n 3 <<<"$OUTPUT")"; fi

restore --image "$WEB_REPO:latest" --execute
if [ "$STATUS" -ne 0 ] && [ "$(stack_fingerprint)" = "$before" ]; then pass "emergency restore refuses a tag"
else bad "emergency tag" "status $STATUS"; fi

restore --image "$WEB_REPO@$B_DIGEST" --execute
if [ "$STATUS" -eq 0 ] && [ "$(running_digest)" = "$B_DIGEST" ] && serving \
   && [ "$(monitoring_fingerprint)" = "$monitoring_before" ]; then
  pass "emergency restore of release B by digest: web recreated, nginx started, monitoring untouched"
else bad "emergency restore" "status $STATUS, running $(running_digest): $(tail -n 3 <<<"$OUTPUT")"; fi

tail -n 2 "$PROJECT/.deploy/releases.log"
if [ "$failures" -ne 0 ]; then printf '%d rehearsal check(s) failed\n' "$failures"; exit 1; fi
echo "deploy rehearsal: all checks passed"
