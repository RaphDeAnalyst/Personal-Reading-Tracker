#!/bin/bash
set -e

PROJECT_DIR="/home/digitalhub/work/Personal-Reading-Tracker"
SERVICE_NAME="archivist"

echo "========================================"
echo "The Archivist: Production Setup"
echo "========================================"
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use: sudo bash deploy/setup.sh)"
   exit 1
fi

# Step 1: Kill existing process on port 3000
echo "🛑 Checking for processes on port 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    PID=$(lsof -ti :3000)
    echo "   Found process $PID on port 3000, killing..."
    kill -9 $PID || true
    sleep 1
else
    echo "   Port 3000 is free ✓"
fi
echo

# Step 2: Install npm dependencies (picks up tsx in dependencies)
echo "📦 Installing npm dependencies..."
cd $PROJECT_DIR
npm install --omit=dev
echo "   Dependencies installed ✓"
echo

# Step 3: Install nginx
echo "🌐 Installing nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get update > /dev/null
    apt-get install -y nginx > /dev/null
    echo "   nginx installed ✓"
else
    echo "   nginx already installed ✓"
fi
echo

# Step 4: Copy systemd service file
echo "⚙️  Setting up systemd service..."
cp $PROJECT_DIR/deploy/archivist.service /etc/systemd/system/
chmod 644 /etc/systemd/system/archivist.service
echo "   Service file copied ✓"
echo

# Step 5: Copy nginx config
echo "🔧 Setting up nginx reverse proxy..."
cp $PROJECT_DIR/deploy/archivist.nginx /etc/nginx/sites-available/archivist
chmod 644 /etc/nginx/sites-available/archivist

# Create symlink in sites-enabled
if [ -e /etc/nginx/sites-enabled/archivist ]; then
    rm /etc/nginx/sites-enabled/archivist
fi
ln -s /etc/nginx/sites-available/archivist /etc/nginx/sites-enabled/archivist
echo "   nginx config installed ✓"

# Remove default nginx site to avoid conflicts
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    echo "   Default nginx site disabled ✓"
fi
echo

# Step 6: Test nginx config
echo "🧪 Testing nginx configuration..."
if nginx -t > /dev/null 2>&1; then
    echo "   nginx config is valid ✓"
else
    echo "❌ nginx config test failed. Run: nginx -t"
    exit 1
fi
echo

# Step 7: Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload
echo "   Daemon reloaded ✓"
echo

# Step 8: Enable and start archivist service
echo "🚀 Starting archivist service..."
systemctl enable archivist
systemctl restart archivist
sleep 2

if systemctl is-active --quiet archivist; then
    echo "   Service started successfully ✓"
else
    echo "❌ Failed to start service. Check logs: journalctl -u archivist -n 20"
    exit 1
fi
echo

# Step 9: Enable and start nginx
echo "🌐 Starting nginx..."
systemctl enable nginx
systemctl restart nginx
sleep 1

if systemctl is-active --quiet nginx; then
    echo "   nginx started successfully ✓"
else
    echo "❌ Failed to start nginx. Check: nginx -t"
    exit 1
fi
echo

# Step 10: Status summary
echo "========================================"
echo "✨ Setup Complete!"
echo "========================================"
echo
echo "📚 The Archivist is now running as a production service"
echo
echo "📖 Access your app at:"
echo "   • http://localhost"
echo "   • http://192.168.1.154"
echo
echo "🔍 Check service status:"
echo "   sudo systemctl status archivist"
echo
echo "📜 View live logs:"
echo "   journalctl -u archivist -f"
echo
echo "🔌 View nginx logs:"
echo "   tail -f /var/log/nginx/archivist.access.log"
echo
echo "🔄 To update the app:"
echo "   cd $PROJECT_DIR && npm run build && sudo systemctl restart archivist"
echo
