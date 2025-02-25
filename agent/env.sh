#!/usr/bin/env bash

set -eu -o pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export TAVILY_API_KEY="$(cat "$this_dir/.secrets/tavily-api-key.txt")"
export OPENAI_API_KEY="$(cat "$this_dir/.secrets/openai-api-key.txt")"

# export LANGFUSE_BASEURL="http://localhost:3000"
# export LANGFUSE_SECRET_KEY="$(cat "$this_dir/.secrets/langfuse-secret-key.txt")"
# export LANGFUSE_PUBLIC_KEY="$(cat "$this_dir/.secrets/langfuse-public-key.txt")"

exec "$@"
