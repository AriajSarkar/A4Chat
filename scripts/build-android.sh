#!/bin/bash
# build-android.sh - Build Android release APK(s)
# Usage: scripts/build-android.sh [arch]
#   arch: all (default), aarch64, armv7, i686, x86_64

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_DIR/release"
ARCH="${1:-all}"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"
TAURI_PROPERTIES="$ROOT_DIR/src-tauri/gen/android/app/tauri.properties"

cd "$ROOT_DIR"

bash scripts/sync-version.sh

APP_VERSION=$(grep -m1 '^version' "$CARGO_TOML" | sed 's/version = "\([^"]*\)"/\1/' | tr -d '\r')
if [ -z "$APP_VERSION" ]; then
  echo "❌ Could not detect app version from src-tauri/Cargo.toml"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH_RAW <<< "$APP_VERSION"
PATCH="${PATCH_RAW%%[^0-9]*}"
if ! [[ "$MAJOR" =~ ^[0-9]+$ && "$MINOR" =~ ^[0-9]+$ && "$PATCH" =~ ^[0-9]+$ ]]; then
  echo "❌ Unsupported semver format in Cargo.toml: $APP_VERSION"
  exit 1
fi

# Keep Android versionCode monotonic and update-safe
ANDROID_VERSION_CODE=$((MAJOR * 1000000 + MINOR * 1000 + PATCH))

mkdir -p "$(dirname "$TAURI_PROPERTIES")"
cat > "$TAURI_PROPERTIES" <<EOF
tauri.android.versionName=$APP_VERSION
tauri.android.versionCode=$ANDROID_VERSION_CODE
EOF
echo "==> Android version metadata: versionName=$APP_VERSION versionCode=$ANDROID_VERSION_CODE"

JNI_LIBS_DIR="$ROOT_DIR/src-tauri/gen/android/app/src/main/jniLibs"
if [ -d "$JNI_LIBS_DIR" ]; then
  echo "==> Cleaning stale JNI libs: $JNI_LIBS_DIR"
  rm -rf "$JNI_LIBS_DIR"
fi

# Version label for artifact names
TAG_VERSION="${GITHUB_REF_NAME:-}"
TAG_VERSION="${TAG_VERSION#v}"
VERSION="${A4CHAT_VERSION:-$TAG_VERSION}"
if [ -z "$VERSION" ]; then
  VERSION="$APP_VERSION"
fi
VERSION_PREFIX=""
if [ -n "$VERSION" ]; then
  VERSION_PREFIX="${VERSION}_"
fi

case "$ARCH" in
  all|aarch64|armv7|i686|x86_64) ;;
  *)
    echo "❌ Unsupported Android arch: $ARCH"
    echo "Usage: scripts/build-android.sh [all|aarch64|armv7|i686|x86_64]"
    exit 1
    ;;
esac

echo "==> Building Android APK(s) for: $ARCH"
if [ "$ARCH" = "all" ]; then
  pnpm tauri android build --apk true
else
  pnpm tauri android build --apk true --target "$ARCH"
fi

mkdir -p "$RELEASE_DIR"

mapfile -t APKS < <(find "$ROOT_DIR/src-tauri/gen/android/app/build/outputs/apk" -type f -path "*/release/*.apk")
if [ "${#APKS[@]}" -eq 0 ]; then
  echo "❌ No release APKs found under src-tauri/gen/android/app/build/outputs/apk"
  exit 1
fi

EXPECTED_ABI=""
case "$ARCH" in
  aarch64) EXPECTED_ABI="arm64-v8a" ;;
  armv7) EXPECTED_ABI="armeabi-v7a" ;;
  i686) EXPECTED_ABI="x86" ;;
  x86_64) EXPECTED_ABI="x86_64" ;;
esac

OUTPUT_APKS=()
index=0
for apk in "${APKS[@]}"; do
  index=$((index + 1))

  ABI_CSV=""
  if command -v unzip >/dev/null 2>&1; then
    ABI_CSV=$(unzip -Z1 "$apk" "lib/*/*.so" 2>/dev/null | awk -F/ '{print $2}' | sort -u | paste -sd, -)
    if [ -n "$ABI_CSV" ]; then
      echo "    APK ABI(s): $ABI_CSV"
    fi
  fi

  if [ -n "$EXPECTED_ABI" ] && [ -n "$ABI_CSV" ]; then
    if [[ ",$ABI_CSV," != *",$EXPECTED_ABI,"* ]]; then
      echo "❌ Built APK does not contain expected ABI '$EXPECTED_ABI' for arch '$ARCH'"
      exit 1
    fi
  fi

  if [ "$ARCH" = "all" ]; then
    OUTPUT_NAME="A4Chat_${VERSION_PREFIX}universal.apk"
  else
    OUTPUT_NAME="A4Chat_${VERSION_PREFIX}${ARCH}.apk"
  fi

  if [ "${#APKS[@]}" -gt 1 ]; then
    OUTPUT_NAME="${OUTPUT_NAME%.apk}_${index}.apk"
  fi

  OUTPUT_PATH="$RELEASE_DIR/$OUTPUT_NAME"
  cp "$apk" "$OUTPUT_PATH"
  OUTPUT_APKS+=("$OUTPUT_PATH")
done

echo ""
echo "=========================================="
echo "  Android APK(s) copied to: release/"
ls -lh "${OUTPUT_APKS[@]}"
echo "=========================================="
