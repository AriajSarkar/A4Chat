#!/bin/bash
# sync-version.sh - Syncs version from Cargo.toml to package.json, tauri.conf.json, and AppMeta.ts
# Single source of truth: src-tauri/Cargo.toml

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"
PACKAGE_JSON="$ROOT_DIR/package.json"
TAURI_CONF="$ROOT_DIR/src-tauri/tauri.conf.json"
APP_META_TS="$ROOT_DIR/src/lib/AppMeta.ts"

# Extract version from Cargo.toml
VERSION=$(grep -m1 '^version' "$CARGO_TOML" | sed 's/version = "\([^"]*\)"/\1/' | tr -d '\r')

if [ -z "$VERSION" ]; then
    echo "❌ Could not find version in Cargo.toml"
    exit 1
fi

# Update package.json
CURRENT_PKG=$(grep -m1 '"version"' "$PACKAGE_JSON" | sed 's/.*"version": "\([^"]*\)".*/\1/')
if [ "$VERSION" = "$CURRENT_PKG" ]; then
    echo "✓ package.json already at v$VERSION"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$PACKAGE_JSON"
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$PACKAGE_JSON"
    fi
    echo "✓ Updated package.json to v$VERSION"
fi

# Update tauri.conf.json
CURRENT_TAURI=$(grep -m1 '"version"' "$TAURI_CONF" | sed 's/.*"version": "\([^"]*\)".*/\1/')
if [ "$VERSION" = "$CURRENT_TAURI" ]; then
    echo "✓ tauri.conf.json already at v$VERSION"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$TAURI_CONF"
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$TAURI_CONF"
    fi
    echo "✓ Updated tauri.conf.json to v$VERSION"
fi

# Update AppMeta.ts
CURRENT_META=$(grep 'APP_VERSION' "$APP_META_TS" | sed 's/.*"\([^"]*\)".*/\1/')
if [ "$VERSION" = "$CURRENT_META" ]; then
    echo "✓ AppMeta.ts already at v$VERSION"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$VERSION\"/" "$APP_META_TS"
    else
        sed -i "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$VERSION\"/" "$APP_META_TS"
    fi
    echo "✓ Updated AppMeta.ts to v$VERSION"
fi
