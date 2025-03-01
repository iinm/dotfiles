#!/usr/bin/env bash

set -eu -o pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if test -f "$this_dir/.secrets/openai-api-key.txt"; then
  OPENAI_API_KEY="$(cat "$this_dir/.secrets/openai-api-key.txt")"
  export OPENAI_API_KEY
fi

if test -f "$this_dir/.secrets/anthropic-api-key.txt"; then
  ANTHROPIC_API_KEY="$(cat "$this_dir/.secrets/anthropic-api-key.txt")"
  export ANTHROPIC_API_KEY
fi

if test -f "$this_dir/.secrets/tavily-api-key.txt"; then
  TAVILY_API_KEY="$(cat "$this_dir/.secrets/tavily-api-key.txt")"
  export TAVILY_API_KEY
fi

# export LANGFUSE_BASEURL="http://localhost:3000"
# export LANGFUSE_SECRET_KEY="$(cat "$this_dir/.secrets/langfuse-secret-key.txt")"
# export LANGFUSE_PUBLIC_KEY="$(cat "$this_dir/.secrets/langfuse-public-key.txt")"

exec "$@"
