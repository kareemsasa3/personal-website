#!/usr/bin/env bash
# Tests host-key verification in .github/actions/ssh-deploy/action.yml end to end.
# The action's own step scripts run, in order and as GitHub runs them
# (bash -eo pipefail, ${{ inputs.* }} substituted), inside a throwaway Ubuntu 24.04
# container (the runner's OS) against a local sshd. The container has no network,
# so nothing can reach production. Each case asserts whether the deploy got
# through, and that a rejected host key let nothing reach the server.
#
# Local only (CI does not run it). Needs Docker, network access the first time to
# build the test image, and `npm ci` in web/ (js-yaml comes from there).
# Run: bash infrastructure/tests/ssh-deploy-host-key.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The deploy account gets a non-locking password field: without PAM, sshd refuses
# any login to a locked account, keys included.
DOCKERFILE='FROM ubuntu:24.04
RUN apt-get update -qq \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
      openssh-client openssh-server netcat-openbsd >/dev/null \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd \
 && useradd -m -s /bin/bash -p "*" deploy'
IMAGE="ssh-deploy-host-key-test:$(printf '%s' "$DOCKERFILE" | sha256sum | cut -c1-12)"
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  printf '%s\n' "$DOCKERFILE" | docker build -q -t "$IMAGE" - >/dev/null
fi

# --- Keys: the client key, the trusted host key A (pinned), and an impostor B ---
KEYS="$TMP/keys"
mkdir -p "$KEYS"
for key in client hostA hostB; do
  ssh-keygen -q -t ed25519 -N '' -C "$key" -f "$KEYS/$key"
done
A="$(cut -d' ' -f1,2 "$KEYS/hostA.pub")"

# --- A stub release: the workspace the action syncs and streams to the server ---
mkdir -p "$TMP/work/infrastructure/prod"
cat > "$TMP/work/infrastructure/prod/deploy-release.sh" <<'STUB'
echo "SHA=$SHA GRAFANA_ADMIN_USER=$GRAFANA_ADMIN_USER" > ~/deploy-ran
STUB

# --- Runs inside the container: start sshd, run the steps, report the outcome --
cat > "$TMP/in-container.sh" <<'CONTAINER'
#!/bin/bash
set -u
cp /t/keys/"$SERVER_KEY" /etc/ssh/test_host_key && chmod 600 /etc/ssh/test_host_key
mkdir -p /etc/ssh/authorized && cp /t/keys/client.pub /etc/ssh/authorized/deploy
cat > /etc/ssh/test_sshd_config <<EOF
Port $SSHD_PORT
ListenAddress 127.0.0.1
HostKey /etc/ssh/test_host_key
AuthorizedKeysFile /etc/ssh/authorized/%u
PasswordAuthentication no
KbdInteractiveAuthentication no
UsePAM no
LogLevel VERBOSE
EOF
/usr/sbin/sshd -f /etc/ssh/test_sshd_config -E /tmp/sshd.log || { echo "sshd failed"; exit 99; }
if [ "$SEED_DEFAULT_KNOWN_HOSTS" = 1 ]; then
  # The presented (impostor) key in the default files must not be trusted.
  mkdir -p /root/.ssh
  echo "[127.0.0.1]:$SSHD_PORT $(cut -d' ' -f1,2 /t/keys/"$SERVER_KEY".pub)" | tee /root/.ssh/known_hosts > /etc/ssh/ssh_known_hosts
  echo "127.0.0.1 $(cut -d' ' -f1,2 /t/keys/"$SERVER_KEY".pub)" | tee -a /root/.ssh/known_hosts >> /etc/ssh/ssh_known_hosts
  # So must the other host-key sources that client config can switch on.
  printf 'KnownHostsCommand /bin/cat /root/.ssh/known_hosts\nVerifyHostKeyDNS yes\n' > /etc/ssh/ssh_config.d/99-test.conf
fi
cp -r /t/work /work && cd /work
failed=none
status=0
for step in /t/steps/*.sh; do
  bash --noprofile --norc -eo pipefail "$step" > "/tmp/$(basename "$step").log" 2>&1 || {
    status=$?; failed=$(basename "$step" .sh); break; }
done
sleep 0.2
synced=0; [ -d /home/deploy/personal-website/infrastructure ] && synced=1
deployed=0; [ -f /home/deploy/deploy-ran ] && deployed=1
connections=$(grep -c "Connection from" /tmp/sshd.log)
echo "RESULT failed=$failed status=$status synced=$synced deployed=$deployed connections=$connections"
cat /tmp/*.sh.log
CONTAINER

# --- Writes the action's steps as runnable scripts for one set of inputs -------
write_steps() {  # inputs JSON, output dir
  node - "$ROOT" "$1" "$2" <<'NODE'
const [root, inputsJson, out] = process.argv.slice(2);
const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { createRequire } = require("node:module");
const yaml = createRequire(`${root}/web/package.json`)("js-yaml");
const action = yaml.load(readFileSync(`${root}/.github/actions/ssh-deploy/action.yml`, "utf8"));
const inputs = JSON.parse(inputsJson);
const value = (name) => inputs[name] ?? action.inputs[name].default ?? "";
const substitute = (text) => {
  const done = String(text).replace(/\$\{\{\s*inputs\.([A-Za-z_]+)\s*\}\}/g, (_, n) => value(n));
  if (done.includes("${{")) throw new Error(`unsupported expression in: ${text}`);
  return done;
};
const quote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
mkdirSync(out, { recursive: true });
action.runs.steps.forEach((step, i) => {
  const env = Object.entries(step.env ?? {}).map(([k, v]) => `export ${k}=${quote(substitute(v))}\n`).join("");
  writeFileSync(`${out}/${i + 1}.sh`, env + substitute(step.run));
});
NODE
}

PASS=0
FAIL=0
LAST_LOG=""
# run_case NAME KNOWN_HOSTS PORT_INPUT SSHD_PORT SERVER_KEY SEED EXPECT
#   EXPECT is "deploy" (full success) or "reject:<step>" (stops at that step with
#   nothing synced or deployed; a rejection in step 1 also means no connection).
run_case() {
  local name="$1" known_hosts="$2" port="$3" sshd_port="$4" server_key="$5" seed="$6" expect="$7"
  local dir="$TMP/case" inputs out result
  rm -rf "$dir" && mkdir -p "$dir"
  # Credential inputs are throwaway values made per run (one with a space, for the
  # remote quoting), so the file holds no credential-shaped literals.
  inputs="$(KH="$known_hosts" PORT="$port" CLIENT="$(cat "$KEYS/client")"$'\n' \
    FAKE="fake-$RANDOM$RANDOM" node -e '
    const fake = process.env.FAKE;
    process.stdout.write(JSON.stringify({
      host: "127.0.0.1", user: "deploy", port: process.env.PORT,
      ssh_key: process.env.CLIENT, known_hosts: process.env.KH,
      ghcr_username: fake + "-u", ghcr_token: fake + "-t", grafana_admin_user: fake + "-g",
      grafana_admin_password: fake + " p", repository: "Owner/Repo",
      sha: "f865e919dcece537595fb42e3a8dad69dde29b0d" }))')"
  write_steps "$inputs" "$dir/steps"
  cp -r "$KEYS" "$dir/keys" && cp -r "$TMP/work" "$dir/work" && cp "$TMP/in-container.sh" "$dir/"
  out="$(docker run --rm --network none -v "$dir:/t:ro" \
    -e SERVER_KEY="$server_key" -e SSHD_PORT="$sshd_port" -e SEED_DEFAULT_KNOWN_HOSTS="$seed" \
    "$IMAGE" bash /t/in-container.sh 2>&1)" || true
  LAST_LOG="$out"
  result="$(printf '%s\n' "$out" | grep '^RESULT' || echo "RESULT missing")"
  local ok=0
  case "$expect" in
    # The sync, the deploy step's TCP pre-check (nc -z) and the deploy itself.
    deploy) [[ "$result" == "RESULT failed=none status=0 synced=1 deployed=1 connections=3" ]] && ok=1 ;;
    reject:1) [[ "$result" == "RESULT failed=1 status="[1-9]*" synced=0 deployed=0 connections=0" ]] && ok=1 ;;
    reject:2) [[ "$result" == "RESULT failed=2 status=255 synced=0 deployed=0 connections="[1-9]* ]] \
      && printf '%s\n' "$out" | grep -q "Host key verification failed" && ok=1 ;;
  esac
  if [ "$ok" = 1 ]; then
    PASS=$((PASS + 1)); echo "ok   - $name ($result)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL - $name (expected $expect, got $result)"
    printf '%s\n' "$out" | sed 's/^/       /'
  fi
}

hashed() {  # known_hosts line -> the same entry with the host name hashed
  printf '%s\n' "$1" > "$TMP/hash_me" && ssh-keygen -q -H -f "$TMP/hash_me" >/dev/null 2>&1 && cat "$TMP/hash_me"
}

# Accepted: the pinned key matches the key the server presents.
run_case "pinned key on a custom port" "[127.0.0.1]:2222 $A" 2222 2222 hostA 0 deploy
run_case "pinned key on port 22" "127.0.0.1 $A" 22 22 hostA 0 deploy
run_case "pinned key on port 22 (empty port input)" "127.0.0.1 $A" "" 22 hostA 0 deploy
run_case "hashed known_hosts entry" "$(hashed "[127.0.0.1]:2222 $A")" 2222 2222 hostA 0 deploy
run_case "comments, blank lines and CRLF are tolerated" \
  "$(printf '# prod\r\n[127.0.0.1]:2222 %s\r\n\r\n   \r\n' "$A")" 2222 2222 hostA 0 deploy
if printf '%s\n' "$LAST_LOG" | grep -q "Trusted host key fingerprint"; then
  PASS=$((PASS + 1)); echo "ok   - the trusted fingerprint is logged"
else
  FAIL=$((FAIL + 1)); echo "FAIL - the trusted fingerprint is not logged"
fi

# Rejected at connection time: the server presents a key other than the pinned one.
run_case "server presents an untrusted key" "[127.0.0.1]:2222 $A" 2222 2222 hostB 0 reject:2
run_case "untrusted key in the default known_hosts files and KnownHostsCommand" "[127.0.0.1]:2222 $A" 2222 2222 hostB 1 reject:2

# Rejected before any connection: the pinned material is missing or unusable.
run_case "missing known_hosts" "" 2222 2222 hostA 0 reject:1
run_case "only comments" "# nothing here" 2222 2222 hostA 0 reject:1
run_case "not a known_hosts entry" "not a key line" 2222 2222 hostA 0 reject:1
run_case "a valid entry next to an invalid one" "[127.0.0.1]:2222 $A
junk junk" 2222 2222 hostA 0 reject:1
run_case "truncated key" "[127.0.0.1]:2222 ${A:0:40}" 2222 2222 hostA 0 reject:1
run_case "key without a host field" "$A" 2222 2222 hostA 0 reject:1
run_case "entry for port 22 when deploying to a custom port" "127.0.0.1 $A" 2222 2222 hostA 0 reject:1
run_case "entry for another host" "[192.0.2.10]:2222 $A" 2222 2222 hostA 0 reject:1

echo "pass $PASS, fail $FAIL"
[ "$FAIL" -eq 0 ]
