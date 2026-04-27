# Production Deployment Guide

## Overview

The Archivist is now configured to run as a production-grade local service using systemd (process management) and nginx (reverse proxy). The app runs continuously in the background, auto-restarts on crash, and is accessible at `http://localhost` or `http://192.168.1.154` without needing to specify a port.

## One-Time Setup

Run the setup script once to install and configure everything:

```bash
cd /home/digitalhub/work/Personal-Reading-Tracker
sudo bash deploy/setup.sh
```

This script will:
1. Kill any existing app process on port 3000
2. Install npm dependencies (including `tsx` which is now required at runtime)
3. Install nginx (if not already installed)
4. Configure systemd service for The Archivist
5. Configure nginx as a reverse proxy
6. Start both services
7. Show you the access URLs

**The setup script requires `sudo` because it needs to:**
- Install system packages (nginx)
- Write to `/etc/systemd/system/` and `/etc/nginx/`
- Start system services

## Accessing Your App

Once setup is complete, open your browser to:

- **Local:** `http://localhost`
- **Network:** `http://192.168.1.154`

No port number needed — nginx handles port 80 and proxies to the app running on port 3000.

## Updating the App

When you make code changes, rebuild and restart:

```bash
cd /home/digitalhub/work/Personal-Reading-Tracker
bash deploy/update.sh
```

This rebuilds the frontend and restarts the service.

## Monitoring & Logs

### Check Service Status
```bash
sudo systemctl status archivist
```

### View Live Logs
```bash
journalctl -u archivist -f
```

### View Historical Logs
```bash
journalctl -u archivist --since "1 hour ago"
journalctl -u archivist --since "today"
```

### View nginx Access/Error Logs
```bash
# Recent requests
tail -f /var/log/nginx/archivist.access.log

# nginx errors
tail -f /var/log/nginx/archivist.error.log
```

## Troubleshooting

### App won't start
Check the logs:
```bash
journalctl -u archivist -n 50
```

Look for errors about missing files, permissions, or port conflicts.

### Port 3000 already in use
The setup script kills the old process, but if it doesn't work:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### nginx won't start
Test the config:
```bash
sudo nginx -t
```

Check for syntax errors, then restart:
```bash
sudo systemctl restart nginx
```

### Can't reach the app from another device
- Verify the app is running: `systemctl status archivist`
- Verify nginx is running: `systemctl status nginx`
- Verify port 80 is listening: `ss -tlnp | grep :80`
- Check your network IP: `hostname -I` — use that IP instead of 192.168.1.154 if different
- Check firewall: `sudo ufw status` (if enabled, you may need `sudo ufw allow 80`)

## Service Management

### Start the service
```bash
sudo systemctl start archivist
```

### Stop the service
```bash
sudo systemctl stop archivist
```

### Restart the service
```bash
sudo systemctl restart archivist
```

### Disable auto-start on boot
```bash
sudo systemctl disable archivist
```

### Re-enable auto-start on boot
```bash
sudo systemctl enable archivist
```

## How It Works

### systemd Service (`archivist.service`)
- Runs `/usr/bin/node` directly, pointing to tsx in node_modules
- Loads environment from `.env` (sets `NODE_ENV=production`, `PORT=3000`)
- Auto-restarts on crash with 5-second delay
- Logs to systemd journal (viewable via `journalctl`)
- Runs as user `digitalhub`

### nginx Reverse Proxy (`archivist.nginx`)
- Listens on port 80 (standard HTTP)
- Proxies all requests to `http://127.0.0.1:3000`
- Allows uploads up to 50MB
- Sets proxy headers (`X-Real-IP`, `X-Forwarded-For`, `Host`)
- Caches static uploaded files (`/uploads/`)
- Logs to `/var/log/nginx/archivist.{access,error}.log`

### Environment (`.env`)
- `NODE_ENV=production` — tells Express to serve `dist/` instead of using Vite dev server
- `PORT=3000` — app listens on localhost:3000, nginx proxies from port 80

## What's Different from Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Start command | `npm run dev` | `npm start` (via systemd) |
| Frontend serving | Vite dev server + HMR | Pre-built static files in `dist/` |
| Process management | Manual (tied to terminal) | systemd (background, auto-restart) |
| HTTP port | 3000 (exposed to user) | 80 (via nginx reverse proxy) |
| Environment | NODE_ENV not set | NODE_ENV=production |
| Log output | Console | systemd journal + nginx logs |

## Performance Notes

- The pre-built `dist/` includes minified JS/CSS — faster than dev builds
- Backups still run daily at 2 AM (automatic via cron in the app)
- Uploads and PDFs are served through nginx (handles caching, compression)
- Requests to Gemini API happen server-side (metadata enrichment) — frontend never sees the API key

## Reverting to Development Mode

If you need to go back to development mode:

```bash
# Stop the service
sudo systemctl stop archivist

# Go back to dev
cd /home/digitalhub/work/Personal-Reading-Tracker
npm run dev
```

The app will run at `http://localhost:3000` again in dev mode with Vite hot-reload.

---

**That's it!** Your Personal Reading Tracker is now a production-grade local service. 📚✨


**Future updates:** If Google ever updates the font, run bash setup-fonts.sh to re-download the latest version.                                       


 # Create nginx cache directory
  sudo mkdir -p /var/cache/nginx/archivist                                                                                                          
  sudo chown -R www-data:www-data /var/cache/nginx/archivist
                                                                                                                                                    
  # Copy updated nginx config                               
  sudo cp /home/digitalhub/work/Personal-Reading-Tracker/deploy/archivist.nginx /etc/nginx/sites-available/archivist
                                                                                                                                                    
  # Test and reload nginx
  sudo nginx -t                                                                                                                                     
  sudo systemctl restart nginx                              
                                                                                                                                                    
  # Restart app
  sudo systemctl restart archivist   