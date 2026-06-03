#!/bin/bash

# A simple frontend smoke test to ensure the UI hasn't been broken.
echo "Running frontend smoke test..."

FRONTEND_DIR="/home/joshua/Workflow/phonethagoras"

if [ ! -f "$FRONTEND_DIR/public/index.html" ]; then
  echo "❌ FAIL: index.html is missing!"
  exit 1
fi

# Ensure all scripts are properly loaded
if ! grep -q '<script src="js/ai.js"></script>' "$FRONTEND_DIR/public/index.html"; then
  echo "❌ FAIL: ai.js script tag missing in index.html"
  exit 1
fi

if ! grep -q '<script src="js/chat.js"></script>' "$FRONTEND_DIR/public/index.html"; then
  echo "❌ FAIL: chat.js script tag missing in index.html"
  exit 1
fi

if ! grep -q 'id="chat-document-viewer"' "$FRONTEND_DIR/public/index.html"; then
  echo "❌ FAIL: document viewer structure missing in index.html"
  exit 1
fi

echo "✅ SUCCESS: Frontend smoke tests passed!"
exit 0
