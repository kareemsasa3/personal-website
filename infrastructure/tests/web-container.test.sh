#!/usr/bin/env bash
# Smoke-test a built production image without root or Linux capabilities.
set -euo pipefail

IMAGE=${1:?usage: bash infrastructure/tests/web-container.test.sh IMAGE}
CONTAINER="web-nonroot-test-$$"
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then docker logs "$CONTAINER" >&2 || true; fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --sysctl net.ipv4.ip_unprivileged_port_start=0 "$IMAGE" >/dev/null

uid=$(docker exec "$CONTAINER" id -u)
[ "$uid" -ne 0 ] || { echo "Container default user is root" >&2; exit 1; }
# Check the actual master process too, not just docker exec's default user.
docker exec "$CONTAINER" sh -c 'test "$(awk "/^Uid:/ { print \$2 }" /proc/1/status)" -ne 0'
docker exec "$CONTAINER" nginx -t
docker exec "$CONTAINER" sh -c 'test ! -w /etc/nginx/nginx.conf && test ! -w /usr/share/nginx/html/index.html'

for _ in $(seq 1 70); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER")
  if [ "$health" = healthy ]; then break; fi
  if [ "$health" = unhealthy ]; then echo "Image health check failed" >&2; exit 1; fi
  sleep 1
done
[ "$health" = healthy ] || { echo "Timed out waiting for image health" >&2; exit 1; }
docker exec "$CONTAINER" curl -fsS http://127.0.0.1:80/health | grep -q healthy
docker exec "$CONTAINER" curl -fsS http://127.0.0.1:80/ | grep '<html' >/dev/null
docker exec "$CONTAINER" curl -fsS http://127.0.0.1:80/writing | grep '<html' >/dev/null
docker exec "$CONTAINER" curl -fsS http://127.0.0.1:80/simulations/traffic-simulator | grep '<html' >/dev/null
status=$(docker exec "$CONTAINER" curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80/assets/nonroot-test.js.map)
[ "$status" = 404 ] || { echo "Source-map blocking regressed: $status" >&2; exit 1; }
echo "Production image serves routes and passes health checks as uid $uid without capabilities."
