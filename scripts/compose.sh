#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
environment="${1:-}"

if [[ -z "$environment" ]]; then
	echo "Usage: scripts/compose.sh <dev|test|prod> <docker compose arguments...>" >&2
	exit 2
fi
shift

case "$environment" in
	dev | test | prod) ;;
	*)
		echo "Unknown environment: $environment (expected dev, test, or prod)" >&2
		exit 2
		;;
esac

env_file="$repo_dir/.env.$environment"
override_file="$repo_dir/compose.$environment.yml"
project_name="${PAPERDRILL_PROJECT:-paperdrill-$environment}"

if [[ ! -f "$env_file" ]]; then
	echo "Missing environment file: $env_file" >&2
	exit 1
fi

exec docker compose \
	--project-name "$project_name" \
	--env-file "$env_file" \
	--file "$repo_dir/compose.yml" \
	--file "$override_file" \
	"$@"
