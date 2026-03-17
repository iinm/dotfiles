#!/bin/sh

set -eu

this_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$this_dir"

. "$this_dir/env.sh"

uvx --with "litellm[google]" --with "botocore[crt]" "litellm[proxy]" \
    --host 127.0.0.1 --port "$PORT" \
    --config config.yaml \
    --detailed_debug

