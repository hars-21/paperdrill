#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
action="${1:-}"
tag="${2:-}"
registry="ghcr.io/hars-21"
platform="linux/amd64"
services=(backend engine worker bot)

if [[ "$action" != "build" && "$action" != "push" ]]; then
	echo "Usage: scripts/images.sh <build|push> <image-version>" >&2
	exit 2
fi

if [[ ! "$tag" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Image tag must use MAJOR.MINOR.PATCH, for example 1.0.0" >&2
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
