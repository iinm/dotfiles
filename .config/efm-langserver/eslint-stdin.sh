#!/usr/bin/env bash

set -euo pipefail

filename="${1?}"

npx --no-install eslint -f visualstudio --stdin --stdin-filename "${filename}" \
  | sed -E 's/warning|error/info/'
