#!/bin/bash

echo "Verifying build artifacts..."
if [ -d "/app/out/make" ]; then
    echo "✓ Build directory exists"
    echo "Checking build artifacts:"
    
    # Check DEB package
    if [ -d "/app/out/make/deb/x64" ]; then
        if ls /app/out/make/deb/x64/*.deb 1> /dev/null 2>&1; then
            echo "✓ DEB package found"
        else
            echo "✗ DEB package not found"
        fi
    fi

    # Check RPM package
    if [ -d "/app/out/make/rpm/x64" ]; then
        if ls /app/out/make/rpm/x64/*.rpm 1> /dev/null 2>&1; then
            echo "✓ RPM package found"
        else
            echo "✗ RPM package not found"
        fi
    fi

    # Check Windows package
    if [ -d "/app/out/make/squirrel.windows/x64" ]; then
        if ls /app/out/make/squirrel.windows/x64/*.exe 1> /dev/null 2>&1; then
            echo "✓ Windows package found"
        else
            echo "✗ Windows package not found"
        fi
    fi

    # Show full directory structure
    echo "Directory structure:"
    ls /app/out/make

    # If any package exists, consider it a success
    if [ -n "$(find /app/out/make -type f \( -name "*.deb" -o -name "*.rpm" -o -name "*.exe" \))" ]; then
        echo "✓ At least one package was built successfully"
        exit 0
    else
        echo "✗ No packages were built"
        exit 1
    fi
else
    echo "✗ Build directory not found"
    exit 1
fi
