#!/bin/bash
# build-linux.sh - Build Linux bundles
# Usage: scripts/build-linux.sh [bundles]
# Example: scripts/build-linux.sh appimage,deb

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_DIR/release"
BUNDLES="${1:-appimage,deb}"

cd "$ROOT_DIR"

bash scripts/sync-version.sh
source scripts/updater-signing-env.sh

echo "==> Building Linux bundles: $BUNDLES"
pnpm tauri build --bundles "$BUNDLES"

mkdir -p "$RELEASE_DIR"
find "$ROOT_DIR/src-tauri/target/release/bundle" -type f -name "*.AppImage" -exec cp {} "$RELEASE_DIR/" \;
find "$ROOT_DIR/src-tauri/target/release/bundle" -type f -name "*.deb" -exec cp {} "$RELEASE_DIR/" \;
find "$ROOT_DIR/src-tauri/target/release/bundle" -type f -name "*.sig" -exec cp {} "$RELEASE_DIR/" \;

if ! compgen -G "$RELEASE_DIR/*.AppImage" > /dev/null && ! compgen -G "$RELEASE_DIR/*.deb" > /dev/null; then
  echo "❌ No Linux artifacts found"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Linux artifact(s) copied to: release/"
ls -lh "$RELEASE_DIR" | sed -n '1,200p'
echo "=========================================="
