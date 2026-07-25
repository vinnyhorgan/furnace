#!/usr/bin/env bash
set -euo pipefail

build_dir="${1:-build/web-kri}"
jobs="${CMAKE_BUILD_PARALLEL_LEVEL:-4}"
cache_dir="${EM_CACHE:-/tmp/furnace-emscripten-cache}"

EM_CACHE="$cache_dir" emcmake cmake -S . -B "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release
EM_CACHE="$cache_dir" cmake --build "$build_dir" -j"$jobs"

install --mode=0644 res/web/coi-serviceworker.js "$build_dir/coi-serviceworker.js"
install --mode=0644 res/icon_16x16.svg "$build_dir/favicon.svg"

echo "kri web build: $build_dir/furnace.html"
