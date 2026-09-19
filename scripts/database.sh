#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
environment="${1:-}"
action="${2:-}"
compose=("$repo_dir/scripts/compose.sh" "$environment")

case "$environment" in
	dev | test | prod) ;;
	*)
		echo "Usage: scripts/database.sh <dev|test|prod> <migrate|seed|prepare>" >&2
		exit 2
		;;
esac

migrate() {
	"${compose[@]}" run --rm --no-deps backend bun prisma migrate deploy
}

seed() {
	"${compose[@]}" run --rm --no-deps backend bun prisma db seed
}

case "$action" in
	migrate)
		migrate
		;;
	seed)
		seed
		;;
	prepare)
		migrate
		seed
		;;
	*)
		echo "Usage: scripts/database.sh <dev|test|prod> <migrate|seed|prepare>" >&2
		exit 2
		;;
esac
