#!/bin/bash
# Loads a Tauri updater signing key for desktop bundle builds.
#
# Release builds should provide TAURI_SIGNING_PRIVATE_KEY from GitHub secrets.
# Local builds use _signing/a4chat-updater.key when present. CI build checks
# fall back to a temporary throwaway key so packaging still verifies.

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCAL_KEY="$ROOT_DIR/_signing/a4chat-updater.key"

if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ] || [ -n "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; then
  echo "==> Tauri updater signing key loaded from environment"
  return 0 2>/dev/null || exit 0
fi

if [ -f "$LOCAL_KEY" ]; then
  export TAURI_SIGNING_PRIVATE_KEY_PATH="$LOCAL_KEY"
  echo "==> Tauri updater signing key loaded from _signing/"
  return 0 2>/dev/null || exit 0
fi

TEMP_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/a4chat-updater-signing"
TEMP_KEY="$TEMP_DIR/throwaway-updater.key"

mkdir -p "$TEMP_DIR"
pnpm tauri signer generate --ci --write-keys "$TEMP_KEY" >/dev/null
export TAURI_SIGNING_PRIVATE_KEY_PATH="$TEMP_KEY"
echo "==> Generated throwaway updater signing key for non-release build"
