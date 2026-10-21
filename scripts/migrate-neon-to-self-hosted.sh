#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
compose=("$repo_dir/scripts/compose.sh" prod)
dump_file="${1:-$repo_dir/paperdrill-neon-$(date +%Y%m%d-%H%M%S).dump}"

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
	echo "Set SOURCE_DATABASE_URL to the current Neon connection string." >&2
	exit 2
fi

if [[ -e "$dump_file" ]]; then
	echo "Refusing to overwrite existing dump file: $dump_file" >&2
	exit 1
fi

echo "Stopping application writers..."
"${compose[@]}" stop backend engine worker btc-bot sol-bot eth-bot

echo "Starting self-hosted PostgreSQL..."
"${compose[@]}" up -d --wait postgres

existing_tables="$("${compose[@]}" exec -T postgres sh -ceu 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = '\''public'\''"')"
if [[ "$existing_tables" != "0" ]]; then
	echo "Target database is not empty; refusing to restore into it." >&2
	exit 1
fi

echo "Creating Neon backup at $dump_file..."
"${compose[@]}" exec -T postgres pg_dump --format=custom --no-owner --no-privileges "$SOURCE_DATABASE_URL" > "$dump_file"

echo "Restoring backup into self-hosted PostgreSQL..."
"${compose[@]}" exec -T postgres sh -ceu 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$dump_file"

echo "Migration complete. Update DATABASE_URL in .env.prod to use postgres:5432, then run:"
echo "  ./scripts/database.sh prod migrate"
echo "  ./scripts/compose.sh prod up -d --wait --remove-orphans"
