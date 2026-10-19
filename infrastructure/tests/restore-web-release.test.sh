#!/usr/bin/env bash
# Tests infrastructure/prod/restore-web-release.sh against a simulated host.
# A stub `docker` (and `curl`) records every call; each case checks the outcome and
# that nothing changed unless --execute was given and every check passed.
# Run: bash infrastructure/tests/restore-web-release.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/infrastructure/prod/restore-web-release.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

WEB_REPO="ghcr.io/kareemsasa3/personal-website/web"
GOOD="$WEB_REPO@sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07"
BROKEN="$WEB_REPO@sha256:$(printf 'b%.0s' {1..64})"

BIN="$TMP/bin"
mkdir -p "$BIN"
cat > "$BIN/docker" <<'STUB'
#!/usr/bin/env bash
set -u
S="$STUB_STATE"
echo "docker $*" >> "$S/calls"
cmd="$1"; shift
case "$cmd" in
  image)
    shift  # inspect
    fmt=""; if [ "$1" = --format ]; then fmt="$2"; shift 2; fi
    [[ " ${STUB_LOCAL_IMAGES:-} " == *" $1 "* ]] || exit 1
    [ -n "$fmt" ] && echo "id:$1"; exit 0 ;;
  network) [ "${STUB_NETWORK:-1}" = 1 ] || exit 1 ;;
  inspect)
    fmt="$2"
    [ -s "$S/running" ] || exit 1
    case "$fmt" in
      '{{.Image}}') echo "id:$(cat "$S/running")" ;;
      *Health*) [ "$(cat "$S/running")" = "${STUB_UNHEALTHY:-}" ] && echo unhealthy || echo healthy ;;
    esac ;;
  compose)
    [ "$1" = version ] && exit "${STUB_COMPOSE_V2_STATUS:-0}"
    args=("$@"); files=(); sub=""
    while [ $# -gt 0 ]; do
      case "$1" in
        -f) files+=("$2"); shift 2 ;;
        --env-file|--project-directory) shift 2 ;;
        *) sub="$1"; shift; break ;;
      esac
    done
    override=""; for f in "${files[@]}"; do case "$f" in *images.yml) override="$f" ;; esac; done
    case "$sub" in
      config)
        [ -n "${STUB_REAL_DOCKER:-}" ] && exec "$STUB_REAL_DOCKER" compose "${args[@]}"
        printf 'name: personal-website\nservices:\n  nginx:\n    image: nginx:alpine\n  web:\n    image: %s\n' \
          "${STUB_RENDER_IMAGE:-$(sed -n 's/^ *image: //p' "$override")}" ;;
      up) sed -n 's/^ *image: //p' "$override" > "$S/running" ;;
    esac ;;
esac
exit 0
STUB
printf '#!/usr/bin/env bash\nexit 0\n' > "$BIN/curl"
chmod +x "$BIN"/*

failures=0
pass() { printf 'ok   %s\n' "$1"; }
bad() { printf 'FAIL %s: %s\n' "$1" "$2"; failures=$((failures + 1)); }

setup() {
  CASE="$TMP/$1"; PROJECT="$CASE/project"; STATE="$CASE/state"
  mkdir -p "$STATE" "$PROJECT/infrastructure/prod"
  : > "$STATE/calls"
  echo "$BROKEN" > "$STATE/running"
  touch "$PROJECT/infrastructure/docker-compose.yml" "$PROJECT/infrastructure/prod/docker-compose.prod.yml" \
    "$PROJECT/infrastructure/prod/docker-compose.monitoring.prod.yml"
  printf 'DOMAIN_NAME=kareemsasa.dev\nWEB_IMAGE=%s:latest\n' "$WEB_REPO" > "$PROJECT/infrastructure/.env"
}
# run_restore [VAR=value ...] -- [script args]; no GHCR or Grafana credentials are set.
run_restore() {
  local vars=()
  while [ $# -gt 0 ] && [ "$1" != -- ]; do vars+=("$1"); shift; done
  shift
  STATUS=0
  OUTPUT="$(env -u GHCR_TOKEN -u GRAFANA_ADMIN_USER -u GRAFANA_ADMIN_PASSWORD PATH="$BIN:$PATH" \
    HOME="$CASE" PROJECT_DIR="$PROJECT" STUB_STATE="$STATE" STUB_LOCAL_IMAGES="$GOOD $BROKEN" \
    RESTORE_WAIT_SECONDS=0 RESTORE_POLL_SECONDS=0 "${vars[@]}" bash "$SCRIPT" "$@" 2>&1)" || STATUS=$?
}
changed() { grep -E '^docker compose .* up( |$)|^docker (pull|login|rm|stop|run) ' "$STATE/calls" || true; }
refused() {
  local name="$1" message="$2"
  if [ "$STATUS" -eq 0 ]; then bad "$name" "succeeded"
  elif [ -n "$(changed)" ]; then bad "$name" "changed something: $(changed)"
  elif ! grep -qF -- "$message" <<<"$OUTPUT"; then bad "$name" "missing '$message': $OUTPUT"
  else pass "$name"; fi
}

setup no-image;      run_restore -- --execute
refused "no release given: refuses, there is no default" "--image is required"
grep -q '^docker ' "$STATE/calls" && bad "no image" "docker was called"

setup tag;           run_restore -- --image "$WEB_REPO:latest" --execute
refused ":latest is refused" "tags such as :latest are refused"

setup short-digest;  run_restore -- --image "$WEB_REPO@sha256:4230f4" --execute
refused "a truncated digest is refused" "must be ghcr.io/<owner>/<repo>/web@sha256:<64 hex>"

setup not-local;     run_restore STUB_LOCAL_IMAGES="$BROKEN" -- --image "$GOOD" --execute
refused "image missing from the host: refuses and does not pull" "This script does not pull"

setup no-compose-v2; run_restore STUB_COMPOSE_V2_STATUS=1 -- --image "$GOOD" --execute
refused "no Compose v2: refuses" "Docker Compose v2"

setup no-network;    run_restore STUB_NETWORK=0 -- --image "$GOOD" --execute
refused "missing Docker network: refuses" "network portfolio-network-prod does not exist"

setup no-env;        rm "$PROJECT/infrastructure/.env"; run_restore -- --image "$GOOD" --execute
refused "missing .env: refuses" "missing $PROJECT/infrastructure/.env"

setup no-domain;     echo "WEB_IMAGE=x" > "$PROJECT/infrastructure/.env"; run_restore -- --image "$GOOD" --execute
refused "missing DOMAIN_NAME: refuses" "DOMAIN_NAME is not set"

setup mismatch;      run_restore STUB_RENDER_IMAGE="$WEB_REPO:latest" -- --image "$GOOD" --execute
refused "compose resolving web to another image: refuses" "compose resolves web to '$WEB_REPO:latest'"

setup dry-run;       run_restore -- --image "$GOOD"
if [ "$STATUS" -ne 0 ]; then bad "preflight" "exit $STATUS: $OUTPUT"
elif [ -n "$(changed)" ]; then bad "preflight" "changed something: $(changed)"
elif ! grep -qF "Nothing was changed" <<<"$OUTPUT"; then bad "preflight" "$OUTPUT"
else pass "without --execute: preflight passes and changes nothing"; fi

setup execute;       run_restore -- --image "$GOOD" --execute
if [ "$STATUS" -ne 0 ]; then bad "restore" "exit $STATUS: $OUTPUT"
elif [ "$(cat "$STATE/running")" != "$GOOD" ]; then bad "restore" "running $(cat "$STATE/running")"
elif ! grep -qE '^docker compose .* up -d --no-build --pull never web nginx$' "$STATE/calls"; then bad "restore" "unexpected up: $(changed)"
elif grep -qE '^docker (pull|login) ' "$STATE/calls"; then bad "restore" "contacted the registry"
elif ! grep -qF "manual-restore $GOOD" "$PROJECT/.deploy/releases.log"; then bad "restore" "not recorded"
else pass "--execute restores web and nginx only, with --pull never and no registry or production secrets"; fi

setup unhealthy;     run_restore STUB_UNHEALTHY="$GOOD" -- --image "$GOOD" --execute
if [ "$STATUS" -eq 0 ]; then bad "unhealthy" "reported success"
elif ! grep -qF "did not become healthy" <<<"$OUTPUT"; then bad "unhealthy" "$OUTPUT"
else pass "a restored image that does not become healthy is reported as a failure"; fi

# Real Compose renders the production compose files, with WEB_IMAGE=:latest in
# both .env and the shell.
REAL_DOCKER="$(PATH="${PATH//$BIN:/}" command -v docker || true)"
if [ -n "$REAL_DOCKER" ] && "$REAL_DOCKER" compose version >/dev/null 2>&1; then
  setup real-compose
  cp "$ROOT/infrastructure/docker-compose.yml" "$PROJECT/infrastructure/"
  cp "$ROOT/infrastructure/prod/docker-compose.prod.yml" "$ROOT/infrastructure/prod/docker-compose.monitoring.prod.yml" \
    "$PROJECT/infrastructure/prod/"
  run_restore STUB_REAL_DOCKER="$REAL_DOCKER" WEB_IMAGE="$WEB_REPO:latest" -- --image "$GOOD"
  if [ "$STATUS" -eq 0 ] && grep -qF "Compose resolves web to the requested digest" <<<"$OUTPUT"; then
    pass "real docker compose resolves web to the requested digest despite WEB_IMAGE=:latest"
  else bad "real compose" "exit $STATUS: $OUTPUT"; fi
else
  echo "skip real compose: docker compose not available"
fi

# Nothing that deploys or runs on the host may invoke the restore. CI only lints it
# and runs this test, which never reaches a host.
if grep -rn "restore-web-release" "$ROOT/.github/workflows/deploy.yml" "$ROOT/.github/actions" \
     "$ROOT/infrastructure" --exclude-dir=tests --exclude=restore-web-release.sh; then
  bad "not automated" "referenced on the deploy path (above)"
else pass "no deploy workflow, action or host script invokes the restore"; fi

if [ "$failures" -ne 0 ]; then printf '%d restore case(s) failed\n' "$failures"; exit 1; fi
echo "restore-web-release: all cases passed"
