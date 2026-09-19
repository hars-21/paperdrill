#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
compose=("$repo_dir/scripts/compose.sh" prod)

"${compose[@]}" config --quiet
"${compose[@]}" pull backend engine worker
"$repo_dir/scripts/database.sh" prod prepare
"${compose[@]}" up -d --wait --remove-orphans
