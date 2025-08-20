#!/usr/bin/env bash

set -eu -o pipefail

options=(
  --dockerfile Dockerfile
  --env-file env
  # Use shared volume for package cache
  --volume agent-sandbox--global--home-npm:/home/node/.npm
  # --volume agent-sandbox--global--home-cache-yarn:/home/node/.cache/yarn
  --mount-readonly ~/.gitconfig:/home/node/.gitconfig
  --allow-write
)

# Create volumes for each node_modules directory
for path in $(fd package.json | sed -E 's,package.json$,node_modules,'); do
  mkdir -p "$path"
  options+=("--volume" "$path")
done

# Mount main worktree
git_root=$(git rev-parse --show-toplevel)
if test -f "$git_root/.git"; then
  main_worktree_path=$(sed -E 's,^gitdir: (.+)/.git/.+,\1,' < "$git_root/.git")
  options+=("--mount-writable" "$main_worktree_path:$main_worktree_path")
fi

agent-sandbox "${options[@]}" "$@"
