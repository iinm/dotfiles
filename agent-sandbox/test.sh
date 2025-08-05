#!/usr/bin/env bash

set -eu -o pipefail

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
export PATH=$SCRIPT_DIR/bin:$PATH

cd "$SCRIPT_DIR"

on_exit() {
  status=$?
  # shellcheck disable=2046
  kill $(jobs -p) &> /dev/null || true
  return "$status"
}

trap 'on_exit' EXIT

echo "case: --help option displays help message"
# when/then:
agent-sandbox --help | grep -qE "^Usage"


echo "case: no arguments display help message to stderr"
# when:
out=$(agent-sandbox 3>&1 1>/dev/null 2>&3) || status=$?
# then:
test "$status" -ne 0
grep -qE "^Usage" <<< "$out"


echo "case: unknown option causes an error"
# when:
out=$(agent-sandbox --no-such-option 3>&1 1>/dev/null 2>&3) || status=$?
# then:
test "$status" -ne 0
grep -qE "^Error: unknown option: --no-such-option" <<< "$out"


echo "case: run basic command with minimum Dockerfile"
# when/then:
agent-sandbox --dockerfile Dockerfile.minimum echo hello | grep -qE "^hello$"


echo "case: receive stdin"
# when/then:
echo hello | agent-sandbox --dockerfile Dockerfile.minimum cat | grep -qE "^hello$"


echo "case: --dry-run option displays the command that would be executed"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum touch test)
# then:
grep -qE "DRY_RUN: docker exec .+ touch test" <<< "$out"
# then:
test ! -e test


echo "case: --platform option specifies the platform for the container"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --platform linux/amd64 true)
# then:
grep -qE "DRY_RUN: docker build .+ --platform linux/amd64" <<< "$out"
grep -qE "DRY_RUN: docker run .+ --platform linux/amd64" <<< "$out"


echo "case: --tty option enables tty allocation"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --tty true)
# then:
grep -qE "DRY_RUN: docker exec .+ --tty" <<< "$out"


echo "case: --no-cache option disables the cache during the image build"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --no-cache true)
# then:
grep -qE "DRY_RUN: docker build .+ --no-cache" <<< "$out"


echo "case: --env-file option pass env file to docker run"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --env-file .env true)
# then:
grep -qE "DRY_RUN: docker run .+ --env-file .env" <<< "$out"


echo "case: --volume option creates and mounts volume"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --volume bin true)
# then:
grep -qE " --mount type=volume,source=agent-sandbox--agent-sandbox-.+--bin,target=/.+/agent-sandbox/bin,consistency=delegated" <<< "$out"


echo "case: --mount-* option mounts host directory"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --mount-readonly bin:/mnt/bin-readonly --mount-writable bin:/mnt/bin-writable true)
# then:
grep -qE " --mount type=bind,source=/.+/agent-sandbox/bin,target=/mnt/bin-readonly,readonly,consistency=delegated" <<< "$out"
grep -qE " --mount type=bind,source=/.+/agent-sandbox/bin,target=/mnt/bin-writable,consistency=delegated" <<< "$out"


echo "case: --publish option publish port to host"
# when:
out=$(agent-sandbox --dry-run --dockerfile Dockerfile.minimum --publish 8000:8000 true)
# then:
grep -qE "DRY_RUN: docker run .+ --publish 127.0.0.1:8000:8000" <<< "$out"


echo "case: container user/group id matches host user/group id"
# shellcheck disable=SC2016
agent-sandbox --dockerfile Dockerfile.minimum bash -c 'echo $(id -u):$(id -g)' | grep -qE "$(id -u):$(id -g)"


echo "case: working directory is mounted and readable"
# when/then:
agent-sandbox --dockerfile Dockerfile.minimum cat Dockerfile.minimum | grep -qE "FROM debian"


echo "case: working directory owner is sandbox user"
# when/then:
agent-sandbox --dockerfile Dockerfile.minimum ls -ld . | grep -qE sandbox


echo "case: working directory is read-only by default"
# when:
out=$(agent-sandbox --dockerfile Dockerfile.minimum touch test 2>&1) || status=$?
# then:
test "$status" -ne 0
grep -qE "Read-only file system" <<< "$out"


echo "case: --allow-write makes working directory writable"
# when/then:
agent-sandbox --allow-write --dockerfile Dockerfile.minimum touch test && test -e test
rm -f test


echo "case: network is disabled by default"
# given:
if test "$(uname)" = "Darwin"; then
  nc -l 8000 &> /dev/null &
else
  nc -l -p 8000 &> /dev/null &
fi
nc_pid=$!
# when:
out=$(agent-sandbox --dockerfile Dockerfile.minimum busybox nc -w 2 host.docker.internal < /dev/null 8000 2>&1) || status=$?
# then:
test "$status" -ne 0
grep -qE "nc: bad address" <<< "$out"
# cleanup:
if lsof -i:8000 | grep -q "$nc_pid"; then
  kill "$nc_pid"
fi


echo "case: --allow-net allows access to domain but only 443"
# given:
if test "$(uname)" = "Darwin"; then
  nc -l 8000 &> /dev/null &
else
  nc -l -p 8000 &> /dev/null &
fi
nc_pid=$!
# when:
out=$(agent-sandbox --dockerfile Dockerfile.minimum --allow-net host.docker.internal busybox nc -w 2 host.docker.internal 8000 < /dev/null 2>&1) || status=$?
# then:
grep -qE "nc: timed out" <<< "$out"
# cleanup:
if lsof -i:8000 | grep -q "$nc_pid"; then
  kill "$nc_pid"
fi


echo "case: --allow-net allows access to host:port"
# given:
if test "$(uname)" = "Darwin"; then
  nc -l 8000 &> /dev/null &
else
  nc -l -p 8000 &> /dev/null &
fi
nc_pid=$!
# when:
out=$(agent-sandbox --dockerfile Dockerfile.minimum --allow-net host.docker.internal:8000 busybox nc -w 2 host.docker.internal 8000 < /dev/null 2>&1)
# cleanup:
if lsof -i:8000 | grep -q "$nc_pid"; then
  kill "$nc_pid"
fi


echo "case: --allow-net allows access to ip range"
# given:
if test "$(uname)" = "Darwin"; then
  nc -l 8000 &> /dev/null &
else
  nc -l -p 8000 &> /dev/null &
fi
nc_pid=$!
# when:
out=$(agent-sandbox --dockerfile Dockerfile.minimum --allow-net 0.0.0.0/0 busybox nc -w 2 8.8.8.8 443 < /dev/null 2>&1)
# cleanup:
if lsof -i:8000 | grep -q "$nc_pid"; then
  kill "$nc_pid"
fi


echo "case: run basic command with preset configuration"
# when/then:
agent-sandbox echo hello | grep -qE "^hello$"
