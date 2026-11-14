#!/usr/bin/env bash
# Use an isolated copy of the source, preserving the developer's checkout.
set -euo pipefail

IMAGE=${1:?usage: bash infrastructure/tests/dev-container.test.sh IMAGE}
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK_DIR=$(mktemp -d)
CONTAINER="web-dev-nonroot-test-$$"
VOLUME="web-dev-nonroot-deps-$$"
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then docker logs "$CONTAINER" >&2 || true; fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir "$WORK_DIR/source"
tar --exclude=node_modules --exclude=build --exclude='.env*' -C "$REPO_ROOT/web" -cf - . \
  | tar -C "$WORK_DIR/source" -xf -
fixture="$WORK_DIR/source/src/nonroot-smoke-fixture.js"
printf 'export const marker = "before-nonroot-edit";\n' > "$fixture"

docker volume create "$VOLUME" >/dev/null
docker run -d --name "$CONTAINER" --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount "type=bind,source=$WORK_DIR/source,target=/app" \
  --mount "type=volume,source=$VOLUME,target=/app/node_modules" \
  -p 127.0.0.1::5173 "$IMAGE" >/dev/null
origin="http://$(docker port "$CONTAINER" 5173/tcp)"

uid=$(docker exec "$CONTAINER" id -u)
[ "$uid" -ne 0 ] || { echo "Development container user is root" >&2; exit 1; }
docker exec "$CONTAINER" sh -c 'test "$(awk "/^Uid:/ { print \$2 }" /proc/1/status)" -ne 0'
docker exec "$CONTAINER" node -e 'const fs = require("node:fs"); for (const path of ["/app/node_modules/.nonroot-cache-probe", "/home/node/.nonroot-home-probe", "/app/src/.nonroot-source-probe"]) { fs.writeFileSync(path, "ok"); fs.unlinkSync(path); }'

wait_for_text() {
  local path=$1 expected=$2 body
  for _ in $(seq 1 60); do
    if body=$(curl -fsS --max-time 3 "$origin$path" 2>/dev/null) && [[ "$body" == *"$expected"* ]]; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $path to contain $expected" >&2
  return 1
}

wait_for_text / '<html'
wait_for_text /@vite/client 'WebSocket'
wait_for_text /src/nonroot-smoke-fixture.js before-nonroot-edit
printf 'export const marker = "after-nonroot-edit";\n' > "$fixture"
wait_for_text /src/nonroot-smoke-fixture.js after-nonroot-edit
echo "Vite serves source updates with writable dependency/cache volumes as uid $uid."
