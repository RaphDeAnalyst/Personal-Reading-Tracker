#!/bin/bash
set -e

PROJECT_DIR="/home/digitalhub/work/Personal-Reading-Tracker"

echo "🔄 Rebuilding The Archivist..."
cd $PROJECT_DIR

echo "📦 Building frontend..."
npm run build

echo "🔄 Restarting service..."
sudo systemctl restart archivist

echo
echo "✅ Update complete!"
echo
echo "📖 Access your app at:"
echo "   • http://localhost"
echo "   • http://192.168.1.154"
echo
echo "📜 View logs: journalctl -u archivist -f"
