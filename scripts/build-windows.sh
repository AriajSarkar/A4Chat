#!/bin/bash
# build-windows.sh - Build Windows NSIS installer
# Usage: scripts/build-windows.sh [rust-target]
# Example: scripts/build-windows.sh x86_64-pc-windows-msvc
#          scripts/build-windows.sh aarch64-pc-windows-msvc

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_DIR/release"
TARGET="${1:-}"

cd "$ROOT_DIR"

bash scripts/sync-version.sh

echo "==> Building Windows NSIS..."
if [ -n "$TARGET" ]; then
  echo "    target: $TARGET"
  pnpm tauri build --bundles nsis --target "$TARGET"
else
  pnpm tauri build --bundles nsis
fi

mkdir -p "$RELEASE_DIR"
find "$ROOT_DIR/src-tauri/target" -type f -path "*/release/bundle/nsis/*.exe" -exec cp {} "$RELEASE_DIR/" \;

if ! compgen -G "$RELEASE_DIR/*.exe" > /dev/null; then
  echo "❌ No Windows NSIS installer found"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Windows installer(s) copied to: release/"
ls -lh "$RELEASE_DIR"/*.exe
echo "=========================================="
