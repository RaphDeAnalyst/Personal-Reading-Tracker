# 🚀 Quick Start: Production Deployment

Your app is ready to run as a local production service. Here's how:

## Step 1: Run the Setup (One Time)

```bash
cd /home/digitalhub/work/Personal-Reading-Tracker
sudo bash deploy/setup.sh
```

This will:
- Install nginx
- Configure systemd to manage your app
- Start everything automatically
- Print the access URLs

**Setup takes ~2 minutes.**

## Step 2: Open Your App

Once setup completes, open your browser:

```
http://localhost
```

Or from another device on your network:

```
http://192.168.1.154
```

## Step 3: Verify It's Running

```bash
sudo systemctl status archivist
```

Should show: **active (running)**

## That's It! ✅

Your app is now:
- Running continuously in the background
- Auto-restarting on crashes
- Accessible without specifying a port
- Accessible from other devices on your network

---

## Common Commands

**View live logs:**
```bash
journalctl -u archivist -f
```

**Restart the app:**
```bash
sudo systemctl restart archivist
```

**Update after code changes:**
```bash
cd /home/digitalhub/work/Personal-Reading-Tracker
bash deploy/update.sh
```

**Stop the app:**
```bash
sudo systemctl stop archivist
```

**Start the app again:**
```bash
sudo systemctl start archivist
```

---

## Need Help?

See **DEPLOY.md** for detailed documentation and troubleshooting.
