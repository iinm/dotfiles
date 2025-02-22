#!/usr/bin/env bash

set -eu -o pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export TAVILY_API_KEY="$(cat "$this_dir/.secrets/tavily-api-key.txt")"
export OPENAI_API_KEY="$(cat "$this_dir/.secrets/openai-api-key.txt")"

exec "$@"
