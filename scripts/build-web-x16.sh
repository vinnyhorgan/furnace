#!/usr/bin/env bash
set -euo pipefail

build_dir="${1:-build/web-x16}"
jobs="${CMAKE_BUILD_PARALLEL_LEVEL:-4}"
cache_dir="${EM_CACHE:-/tmp/furnace-emscripten-cache}"

EM_CACHE="$cache_dir" emcmake cmake -S . -B "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release
EM_CACHE="$cache_dir" cmake --build "$build_dir" -j"$jobs"

echo "Commander X16 web build: $build_dir/furnace.html"
