#!/bin/sh

set -eu

this_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$this_dir"

. "$this_dir/env.sh"

curl "http://localhost:$PORT/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3-flash",
    "messages": [
      {"role": "user", "content": "こんにちは。"}
    ]
  }'
