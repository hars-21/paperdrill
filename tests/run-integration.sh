#!/bin/sh

set -u

compose() {
	./scripts/compose.sh test "$@"
}

cleanup() {
	compose down --volumes --remove-orphans
}

trap cleanup EXIT INT TERM

status=0

compose down --volumes --remove-orphans || true

compose build || status=$?

if [ "$status" -eq 0 ]; then
	compose up -d --wait postgres redis || status=$?
fi

if [ "$status" -eq 0 ]; then
	./scripts/database.sh test prepare || status=$?
fi

if [ "$status" -eq 0 ]; then
	compose up -d --wait backend engine worker || status=$?
fi

if [ "$status" -eq 0 ]; then
	(
		set -a
		. ./.env.test
		set +a

		export API_BASE_URL="http://127.0.0.1:8001"
		export DATABASE_URL="postgresql://postgres:password@127.0.0.1:5434/paperdrill_test"
		export REDIS_URL="redis://127.0.0.1:6381"

		cd tests
		bun run test
	) || status=$?
fi

if [ "$status" -ne 0 ]; then
	compose ps
	compose logs --no-color backend engine worker
fi

exit "$status"
