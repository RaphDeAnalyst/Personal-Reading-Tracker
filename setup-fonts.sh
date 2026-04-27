#!/bin/bash

# Download Material Symbols Outlined font for local hosting
# This eliminates the external network dependency

FONT_DIR="public/fonts"
FONT_FILE="$FONT_DIR/MaterialSymbolsOutlined.woff2"

echo "📦 Downloading Material Symbols Outlined font..."

mkdir -p $FONT_DIR

# Download the variable font from Google Fonts gstatic CDN
# This is the complete variable font with all weights and styles
curl -s -o "$FONT_FILE" \
  "https://fonts.gstatic.com/s/materialsymbolsoutlined/v226/kJEhBvYX7BznkSrUz8zAUodN7lQpOIFw5HeFQwZFNrk.woff2"

if [ -f "$FONT_FILE" ]; then
  FILE_SIZE=$(du -h "$FONT_FILE" | cut -f1)
  echo "✅ Font downloaded successfully ($FILE_SIZE)"
  echo "   Location: $FONT_FILE"
else
  echo "❌ Failed to download font"
  exit 1
fi

echo
echo "📝 Now run:"
echo "   npm run build"
echo "   sudo systemctl restart archivist"
