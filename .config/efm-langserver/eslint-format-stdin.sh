#!/usr/bin/env bash

set -euo pipefail

filename="${1?}"

(npx --no-install eslint -f json --stdin --fix-dry-run --stdin-filename "$filename" || true) \
  | jq -e -r '.[0].output | rtrimstr("\n")'
