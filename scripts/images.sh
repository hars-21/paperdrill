#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
action="${1:-}"
tag="${2:-}"
registry="ghcr.io/hars-21"
platform="linux/amd64"
services=(backend engine worker bot)

if [[ "$action" != "build" && "$action" != "push" ]]; then
	echo "Usage: scripts/images.sh <build|push> <release-tag>" >&2
	exit 2
fi

if [[ -z "$tag" || "$tag" == "latest" ]]; then
	echo "Use an explicit immutable release tag, for example v1.0.0 or sha-abc1234" >&2
	exit 2
fi

for service in "${services[@]}"; do
	image="$registry/paperdrill-$service:$tag"

	if [[ "$action" == "build" ]]; then
		build_args=(--platform "$platform" --pull --tag "$image")
		if [[ "$service" != "bot" ]]; then
			build_args+=(--target runner)
		fi
		docker build "${build_args[@]}" "$repo_dir/$service"
	else
		docker push "$image"
	fi
done

echo "$action complete for $registry/paperdrill-{backend,engine,worker,bot}:$tag"
