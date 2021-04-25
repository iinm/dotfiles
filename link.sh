#!/usr/bin/env bash

set -eu -o pipefail

list_files() {
  local src_root="${1}"
  # ~/.*
  find "$src_root" -maxdepth 1 -type f -name '.*'
  # ~/.config/*
  find "$src_root/.config" -mindepth 1 -maxdepth 1 -type d
}

src_root=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

for src in $(list_files "$src_root"); do
  dest=$(sed "s,^$src_root,$HOME," <<< "$src")
  if test -e "$dest"; then
    echo "warn: $dest is already exist. skip." >&2
    continue
  fi
  ln -vs "$src" "$dest"
done
