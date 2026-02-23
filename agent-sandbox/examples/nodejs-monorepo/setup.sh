#!/usr/bin/env bash

set -eu -o pipefail

this_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Setup sandbox
"$this_dir/run.sh" --verbose --allow-net 0.0.0.0/0 npm install

# Setup host
npm install
