#!/usr/bin/env bash

set -euo pipefail

filename="${1?}"

test -e ./node_modules/.bin/eslint

# https://eslint.org/docs/latest/use/command-line-interface#exit-codes
(npx --no-install eslint -f json --stdin --fix-dry-run --stdin-filename "$filename" || test "$?" -lt 2) \
  | jq -e -r '.[0].output | rtrimstr("\n")'
