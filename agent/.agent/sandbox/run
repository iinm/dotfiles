#!/usr/bin/env bash

set -eu -o pipefail

agent-sandbox --dockerfile .agent/sandbox/Dockerfile \
  --volume agent-sandbox--global--home-npm:/home/node/.npm \
  --volume node_modules \
  --mount-readonly ~/.gitconfig:/home/node/.gitconfig \
  --allow-write \
  --allow-net bedrock-runtime.ap-northeast-1.amazonaws.com \
  "$@"
