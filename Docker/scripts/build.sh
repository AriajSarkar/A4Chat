#!/bin/bash

set -e

# Ensure we're in the right directory
cd /app

# Verify npm is available
which npm || (echo "npm not found in PATH" && exit 1)

# Run the build
echo "Starting build process..."
npm run make

# Verify the build
./Docker/scripts/verify-build.sh

# Copy artifacts to mounted volume
if [ -d "/app/out/make" ]; then
    mkdir -p /dist
    cp -r /app/out/make/* /dist/
    echo "Build artifacts copied to dist directory"
fi
