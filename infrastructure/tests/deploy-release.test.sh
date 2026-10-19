#!/usr/bin/env bash
# Tests infrastructure/prod/deploy-release.sh against a simulated production host.
# A stub `docker` (and `docker-compose`, `curl`, `crontab`) records every call and
# plays back scenario-controlled results, so each case can assert both the outcome
# and that nothing disruptive ran when a pre-disruption check failed.
# Run: bash infrastructure/tests/deploy-release.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/infrastructure/prod/deploy-release.sh"
TMP="$(mktemp -d)"
trap 'chmod -R u+rwx "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT

REPO_NAME="kareemsasa3/personal-website"
WEB_REPO="ghcr.io/$REPO_NAME/web"
NEW_SHA="f865e919dcece537595fb42e3a8dad69dde29b0d"
NEW_DIGEST="sha256:$(printf 'a%.0s' {1..64})"
OLD_SHA="a16c70fefc1e577b3bdfdef102d961a4b775b017"
OLD_DIGEST="sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07"
RUNNING_IMAGE="$WEB_REPO@sha256:$(printf 'b%.0s' {1..64})"

# --- Stubs --------------------------------------------------------------------
BIN="$TMP/bin"
mkdir -p "$BIN"
cat > "$BIN/docker" <<'STUB'
#!/usr/bin/env bash
set -u
S="$STUB_STATE"
echo "docker $*" >> "$S/calls"
override_image() { sed -n 's/^ *image: //p' "$1"; }
cmd="$1"; shift
case "$cmd" in
  login) cat >/dev/null; exit "${STUB_LOGIN_STATUS:-0}" ;;
  pull)
    if [ "${STUB_PULL_STATUS:-0}" != 0 ]; then
      echo "Error response from daemon: manifest unknown" >&2; exit 1
    fi
    echo "Digest: $STUB_DIGEST"; echo "Status: Downloaded newer image for $1" ;;
  image)
    shift  # inspect
    fmt=""; if [ "$1" = --format ]; then fmt="$2"; shift 2; fi
    case "$fmt" in
      *RepoDigests*) [ "$1" = "id:$STUB_PREVIOUS_IMAGE" ] && echo "$STUB_PREVIOUS_IMAGE" ;;
      *.Id*) echo "id:$1" ;;
    esac ;;
  inspect)
    fmt="$2"; name="$3"
    case "$fmt" in
      '{{.Image}}') [ -s "$S/running" ] || exit 1; echo "id:$(cat "$S/running")" ;;
      *Health*) [ "$(cat "$S/running")" = "${STUB_UNHEALTHY_IMAGE:-}" ] && echo unhealthy || echo healthy ;;
      *compose.project*) case "$name" in foreign*) echo other-project ;; *) echo personal-website ;; esac ;;
    esac ;;
  ps) for c in ${STUB_CONTAINERS:-}; do echo "$c"; done ;;
  run) exit "${STUB_CERT_CHECK_STATUS:-0}" ;;
  compose)
    args=("$@"); files=(); sub=""
    while [ $# -gt 0 ]; do
      case "$1" in
        -f) files+=("$2"); shift 2 ;;
        --env-file|--project-directory) shift 2 ;;
        *) sub="$1"; shift; break ;;
      esac
    done
    override=""
    for f in "${files[@]}"; do case "$f" in *images.override.yml) override="$f" ;; esac; done
    case "$sub" in
      config)
        [ "${STUB_CONFIG_STATUS:-0}" = 0 ] || { echo "invalid compose file" >&2; exit 1; }
        # Hand rendering to the real Compose to test its variable precedence.
        [ -n "${STUB_REAL_DOCKER:-}" ] && exec "$STUB_REAL_DOCKER" compose "${args[@]}"
        printf 'services:\n  nginx:\n    image: nginx:alpine\n  web:\n    image: %s\n' \
          "${STUB_RENDER_IMAGE:-$(override_image "$override")}" ;;
      pull) exit "${STUB_COMPOSE_PULL_STATUS:-0}" ;;
      up) override_image "$override" > "$S/running"; exit "${STUB_UP_STATUS:-0}" ;;
    esac ;;
esac
exit 0
STUB
printf '#!/usr/bin/env bash\nexec docker compose "$@"\n' > "$BIN/docker-compose"
printf '#!/usr/bin/env bash\nexit 0\n' > "$BIN/curl"
# shellcheck disable=SC2016 # the stub's own text, expanded when it runs
printf '#!/usr/bin/env bash\n[ "${1:-}" = -l ] && exit 1\ncat >/dev/null\n' > "$BIN/crontab"
chmod +x "$BIN"/*

# --- Harness ------------------------------------------------------------------
failures=0
pass() { printf 'ok   %s\n' "$1"; }
bad() { printf 'FAIL %s: %s\n' "$1" "$2"; failures=$((failures + 1)); }

# Fresh production-like project dir and stub state for each case.
setup() {
  CASE_DIR="$TMP/case-$1"
  PROJECT="$CASE_DIR/project"
  STATE="$CASE_DIR/state"
  mkdir -p "$STATE" "$PROJECT/infrastructure/nginx/ssl/live/kareemsasa.dev" \
    "$PROJECT/infrastructure/monitoring/prometheus"
  : > "$STATE/calls"
  echo "$RUNNING_IMAGE" > "$STATE/running"
  touch "$PROJECT/infrastructure/nginx/nginx.conf" "$PROJECT/infrastructure/monitoring/prometheus/prometheus.yml"
  # Production's .env pins WEB_IMAGE to :latest; every case carries that.
  printf 'DOMAIN_NAME=kareemsasa.dev\nWEB_IMAGE=%s:latest\n' "$WEB_REPO" > "$PROJECT/infrastructure/.env"
  echo cert > "$PROJECT/infrastructure/nginx/ssl/live/kareemsasa.dev/fullchain.pem"
  echo key > "$PROJECT/infrastructure/nginx/ssl/live/kareemsasa.dev/privkey.pem"
}

# run_deploy [VAR=value ...]: runs the script; sets STATUS and OUTPUT.
run_deploy() {
  STATUS=0
  OUTPUT="$(env PATH="$BIN:$PATH" HOME="$CASE_DIR" PROJECT_DIR="$PROJECT" STUB_STATE="$STATE" \
    REPO="$REPO_NAME" SHA="$NEW_SHA" GHCR_USERNAME=ci GHCR_TOKEN=token-value \
    GRAFANA_ADMIN_USER=admin GRAFANA_ADMIN_PASSWORD=password-value \
    STUB_DIGEST="$NEW_DIGEST" STUB_PREVIOUS_IMAGE="$RUNNING_IMAGE" \
    DEPLOY_WAIT_SECONDS=0 DEPLOY_POLL_SECONDS=0 "$@" bash "$SCRIPT" 2>&1)" || STATUS=$?
}

disruptive_calls() {
  grep -E '^docker (rm|stop|kill|restart) |^docker compose( .*)? (up|down)( |$)|^docker run .*(-p |certbot)' "$STATE/calls" || true
}
expect_failure_without_disruption() {
  local name="$1" message="$2"
  if [ "$STATUS" -eq 0 ]; then bad "$name" "deploy succeeded"; return; fi
  if [ -n "$(disruptive_calls)" ]; then bad "$name" "disruptive calls: $(disruptive_calls)"; return; fi
  if ! grep -qF "$message" <<<"$OUTPUT"; then bad "$name" "missing message '$message' in: $OUTPUT"; return; fi
  pass "$name"
}
running() { cat "$STATE/running"; }

# --- Cases --------------------------------------------------------------------
setup pinned
run_deploy
if [ "$STATUS" -ne 0 ]; then bad "pinned release" "exit $STATUS: $OUTPUT"
elif [ "$(running)" != "$WEB_REPO@$NEW_DIGEST" ]; then bad "pinned release" "compose ran $(running)"
elif grep -q ':latest' "$STATE/running"; then bad "pinned release" "ran :latest"
elif ! grep -qF "Ignoring WEB_IMAGE" <<<"$OUTPUT"; then bad "pinned release" "did not report the ignored WEB_IMAGE"
elif ! grep -qF "$NEW_SHA $WEB_REPO@$NEW_DIGEST previous=$RUNNING_IMAGE" "$PROJECT/.deploy/releases.log"; then bad "pinned release" "release history not recorded"
else pass "SHA-pinned release runs its digest even though .env sets WEB_IMAGE=:latest"; fi

# Real Compose renders the production compose files. The shell exports
# WEB_IMAGE=:latest as well, the strongest source in Compose's precedence order.
REAL_DOCKER="$(PATH="${PATH//$BIN:/}" command -v docker || true)"
if [ -n "$REAL_DOCKER" ] && "$REAL_DOCKER" compose version >/dev/null 2>&1; then
  setup real-compose
  mkdir -p "$PROJECT/infrastructure/prod"
  cp "$ROOT/infrastructure/docker-compose.yml" "$PROJECT/infrastructure/"
  cp "$ROOT/infrastructure/prod/docker-compose.prod.yml" "$ROOT/infrastructure/prod/docker-compose.monitoring.prod.yml" \
    "$PROJECT/infrastructure/prod/"
  run_deploy STUB_REAL_DOCKER="$REAL_DOCKER" WEB_IMAGE="$WEB_REPO:latest"
  if [ "$STATUS" -ne 0 ]; then bad "real compose precedence" "exit $STATUS: $OUTPUT"
  elif [ "$(running)" != "$WEB_REPO@$NEW_DIGEST" ]; then bad "real compose precedence" "ran $(running)"
  else pass "real docker compose renders the pinned digest despite WEB_IMAGE=:latest in .env and the shell"; fi
else
  echo "skip real compose precedence: docker compose not available"
fi

setup render-mismatch
run_deploy STUB_RENDER_IMAGE="$WEB_REPO:latest"
expect_failure_without_disruption "rendered config that would run another image stops before disruption" "instead of $WEB_REPO@$NEW_DIGEST"

setup pull-fails
run_deploy STUB_PULL_STATUS=1
expect_failure_without_disruption "unavailable release image leaves the running stack alone" "could not be pulled; nothing was stopped"

setup login-fails
run_deploy STUB_LOGIN_STATUS=1
expect_failure_without_disruption "registry login failure leaves the running stack alone" "registry login failed"

setup config-invalid
run_deploy STUB_CONFIG_STATUS=1
expect_failure_without_disruption "invalid compose configuration stops before disruption" "compose configuration is invalid"

setup compose-pull-fails
run_deploy STUB_COMPOSE_PULL_STATUS=1
expect_failure_without_disruption "failed service image pull stops before disruption" "pulling service images failed"

setup digest-mismatch
run_deploy EXPECTED_DIGEST="$OLD_DIGEST"
expect_failure_without_disruption "image that does not match the expected digest is refused" "not the expected $OLD_DIGEST"

setup bad-sha
run_deploy SHA="latest"
expect_failure_without_disruption "a non-SHA release identity is refused" "SHA must be a full 40-character commit SHA"
if grep -q '^docker ' "$STATE/calls"; then bad "bad sha" "docker was called"; fi

setup cert-inaccessible
chmod 000 "$PROJECT/infrastructure/nginx/ssl/live"
run_deploy STUB_CERT_CHECK_STATUS=0
if [ "$STATUS" -ne 0 ]; then bad "certificate unreadable by deploy user" "exit $STATUS: $OUTPUT"
elif grep -q certbot "$STATE/calls"; then bad "certificate unreadable by deploy user" "certbot ran"
elif ! grep -q '^docker run --rm --network none .*:/ssl:ro nginx:alpine' "$STATE/calls"; then bad "certificate unreadable by deploy user" "no read-only Docker check"
else pass "certificate the deploy user cannot read is found through a read-only Docker check; no issuance"; fi
chmod 755 "$PROJECT/infrastructure/nginx/ssl/live"

setup cert-absent
rm -rf "$PROJECT/infrastructure/nginx/ssl/live"
run_deploy STUB_CERT_CHECK_STATUS=1
expect_failure_without_disruption "absent certificate fails before disruption and points to provisioning" "lets-encrypt-setup.sh"

setup cert-unknown
chmod 000 "$PROJECT/infrastructure/nginx/ssl/live"
run_deploy STUB_CERT_CHECK_STATUS=125
expect_failure_without_disruption "certificate check that cannot run fails before disruption" "could not determine whether the TLS certificate"
chmod 755 "$PROJECT/infrastructure/nginx/ssl/live"

setup dirs-uncreatable
mkdir -p "$PROJECT/infrastructure/logs"; chmod 555 "$PROJECT/infrastructure/logs"
run_deploy
expect_failure_without_disruption "a missing directory that cannot be created stops before disruption" "cannot create $PROJECT/infrastructure/logs/nginx"
chmod 755 "$PROJECT/infrastructure/logs"

setup renewal-log-unwritable
mkdir -p "$PROJECT/infrastructure/logs/nginx" "$PROJECT/infrastructure/logs/certbot" "$PROJECT/infrastructure/nginx/certbot/www"
chmod 555 "$PROJECT/infrastructure/logs/certbot"
run_deploy
if [ "$STATUS" -ne 0 ]; then bad "renewal log dir" "exit $STATUS: $OUTPUT"
elif ! grep -qF "logs/certbot is not writable" <<<"$OUTPUT"; then bad "renewal log dir" "no warning"
else pass "existing directories are left alone; an unwritable renewal log directory is reported"; fi
chmod 755 "$PROJECT/infrastructure/logs/certbot"

setup rollback
run_deploy SHA="$OLD_SHA" EXPECTED_DIGEST="$OLD_DIGEST" STUB_DIGEST="$OLD_DIGEST"
if [ "$STATUS" -ne 0 ]; then bad "rollback" "exit $STATUS: $OUTPUT"
elif [ "$(running)" != "$WEB_REPO@$OLD_DIGEST" ]; then bad "rollback" "compose ran $(running)"
elif ! grep -qF "docker pull $WEB_REPO:$OLD_SHA" "$STATE/calls"; then bad "rollback" "did not pull the selected release"
else pass "rollback to a historical SHA runs its verified digest"; fi

setup unhealthy
run_deploy STUB_UNHEALTHY_IMAGE="$WEB_REPO@$NEW_DIGEST"
if [ "$STATUS" -eq 0 ]; then bad "unhealthy release" "deploy succeeded"
elif [ "$(running)" != "$RUNNING_IMAGE" ]; then bad "unhealthy release" "previous image not restored; running $(running)"
elif ! grep -qF "previous web image $RUNNING_IMAGE is serving again" <<<"$OUTPUT"; then bad "unhealthy release" "unclear report: $OUTPUT"
else pass "unhealthy release is replaced by the previously running image and the deploy fails"; fi

setup up-fails
run_deploy STUB_UP_STATUS=1 STUB_UNHEALTHY_IMAGE="$WEB_REPO@$NEW_DIGEST"
if [ "$STATUS" -eq 0 ]; then bad "compose up failure" "deploy succeeded"
elif [ "$(running)" != "$RUNNING_IMAGE" ]; then bad "compose up failure" "previous image not restored; running $(running)"
else pass "failed container start restores the previously running image"; fi

setup foreign-container
run_deploy STUB_CONTAINERS="project1 foreign1"
if [ "$STATUS" -ne 0 ]; then bad "foreign container" "exit $STATUS: $OUTPUT"
elif ! grep -qx 'docker rm -f foreign1' "$STATE/calls"; then bad "foreign container" "foreign container not removed"
elif grep -q 'docker rm -f project1' "$STATE/calls"; then bad "foreign container" "removed a running project container"
elif grep -q 'compose.* down' "$STATE/calls"; then bad "foreign container" "stack was brought down"
else pass "only production-named containers outside the compose project are removed; no stack-wide down"; fi

setup secrets
run_deploy STUB_CONFIG_STATUS=1
if grep -qE 'token-value|password-value' <<<"$OUTPUT"; then bad "secrets" "secret value printed"
else pass "registry token and Grafana password are not printed"; fi

if [ "$failures" -ne 0 ]; then
  printf '%d deploy-release case(s) failed\n' "$failures"
  exit 1
fi
echo "deploy-release: all cases passed"
