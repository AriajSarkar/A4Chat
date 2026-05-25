#!/bin/bash

# Default to the Windows Local AppData directory using the user's home path
# This avoids hardcoding system info (like your username)
LOCAL_APP_DATA="$HOME/AppData/Local"

COMFY_PYTHON="$LOCAL_APP_DATA/ComfyUI/.venv/Scripts/python.exe"
COMFY_MAIN="$LOCAL_APP_DATA/Programs/ComfyUI/resources/ComfyUI/main.py"
COMFY_BASE="$LOCAL_APP_DATA/ComfyUI"

# Check if the python executable actually exists at that path
if [ ! -f "$COMFY_PYTHON" ]; then
  echo "Error: ComfyUI python executable not found at $COMFY_PYTHON"
  echo "Make sure ComfyUI is installed in the default location."
  exit 1
fi

# Start the server using the exact command that worked
echo "Starting ComfyUI Server..."
"$COMFY_PYTHON" "$COMFY_MAIN" --listen 0.0.0.0 --base-directory "$COMFY_BASE" --enable-cors-header "*"
