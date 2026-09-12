#!/bin/sh

set -u

compose() {
	docker compose -p paperdrill-benchmark -f compose.test.yml "$@"
}

cleanup() {
	compose down --volumes --remove-orphans
}

trap cleanup EXIT INT TERM

status=0

compose down --volumes --remove-orphans || true
compose build || status=$?

if [ "$status" -eq 0 ]; then
	compose up -d --wait backend engine worker || status=$?
fi

if [ "$status" -eq 0 ]; then
	(
		set -a
		. ./.env.test
		set +a

		if [ "$NODE_ENV" != "test" ] || [ "$TEST_ENVIRONMENT" != "integration" ]; then
			echo "Refusing to benchmark outside the test environment" >&2
			exit 1
		fi

		export API_URL="http://127.0.0.1:8001"

		cd benchmarks
		bun run bench:api
	) || status=$?
fi

if [ "$status" -ne 0 ]; then
	compose ps
	compose logs --no-color backend engine worker postgres redis setup
fi

exit "$status"
