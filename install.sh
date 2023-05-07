#!/usr/bin/env bash

# Setup script for GitHub Codespaces
# https://docs.github.com/en/codespaces/customizing-your-codespace/personalizing-github-codespaces-for-your-account#dotfiles

set -eu -o pipefail

git clone https://github.com/iinm/dotfiles ~/dotfiles
cd ~/dotfiles
./dotfiles setup
