#!/bin/sh

set -eu

this_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$this_dir"

. "$this_dir/env.sh"

openai_compatible() {
  curl -X POST "http://localhost:$PORT/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gemini-3-flash-preview",
      "messages": [
        {"role": "user", "content": "こんにちは。"}
      ]
    }'
}

vertex_ai() {
  curl -X POST "http://localhost:$PORT/vertex_ai/v1/projects/${VERTEXAI_PROJECT}/locations/global/publishers/google/models/gemini-3-flash-preview:generateContent" \
    -H "Content-Type: application/json" \
    -d '{
      "contents":[{
        "role": "user", 
        "parts":[{"text": "How are you doing today?"}]
      }]
    }'
}

bedrock() {
  curl -X POST "http://localhost:$PORT/bedrock/model/claude-haiku-4-5/invoke" \
    -H 'Content-Type: application/json' \
    -d '{
      "messages": [{"role": "user", "content": [{"type": "text", "text": "Hello"}]}],
      "max_tokens": 1024,
      "anthropic_version": "bedrock-2023-05-31"
    }'
}

"$@"
