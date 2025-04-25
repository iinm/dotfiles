#!/usr/bin/env bash

set -eu -o pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${AGENT_PROJECT_METADATA_DIR:=.agent}"
export AGENT_PROJECT_METADATA_DIR

if test -f "$this_dir/.secrets/openai-api-key.txt"; then
  OPENAI_API_KEY="$(cat "$this_dir/.secrets/openai-api-key.txt")"
  export OPENAI_API_KEY
fi

if test -f "$this_dir/.secrets/anthropic-api-key.txt"; then
  ANTHROPIC_API_KEY="$(cat "$this_dir/.secrets/anthropic-api-key.txt")"
  export ANTHROPIC_API_KEY
fi

if test -f "$this_dir/.secrets/gemini-api-key.txt"; then
  GEMINI_API_KEY="$(cat "$this_dir/.secrets/gemini-api-key.txt")"
  export GEMINI_API_KEY
fi

if test -f "$this_dir/.secrets/tavily-api-key.txt"; then
  TAVILY_API_KEY="$(cat "$this_dir/.secrets/tavily-api-key.txt")"
  export TAVILY_API_KEY
fi

exec "$@"
