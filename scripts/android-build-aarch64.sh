#!/usr/bin/env sh
set -eu

pnpm tauri android build --apk --target aarch64
