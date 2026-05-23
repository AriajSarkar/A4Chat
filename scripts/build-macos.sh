#!/bin/bash
# build-macos.sh - Build unsigned macOS DMG
# Usage: scripts/build-macos.sh [target]
# Example: scripts/build-macos.sh
#          scripts/build-macos.sh aarch64-apple-darwin

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_DIR/release"
TARGET="${1:-}"

cd "$ROOT_DIR"

bash scripts/sync-version.sh

echo "==> Building macOS DMG (unsigned)..."
if [ -n "$TARGET" ]; then
  echo "    target: $TARGET"
  pnpm tauri build --bundles dmg --target "$TARGET"
else
  pnpm tauri build --bundles dmg
fi

mkdir -p "$RELEASE_DIR"
find "$ROOT_DIR/src-tauri/target/release/bundle" -type f -name "*.dmg" -exec cp {} "$RELEASE_DIR/" \;

if ! compgen -G "$RELEASE_DIR/*.dmg" > /dev/null; then
  echo "❌ No macOS DMG found"
  exit 1
fi

echo ""
echo "=========================================="
echo "  macOS DMG copied to: release/"
ls -lh "$RELEASE_DIR"/*.dmg
echo "=========================================="
