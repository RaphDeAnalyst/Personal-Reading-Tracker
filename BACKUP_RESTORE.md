# Automated Backup & Restore Guide

## Backup System

Your Personal Reading Tracker now has **automatic daily backups** enabled!

### How It Works
- ⏰ **Schedule:** Daily at 2 AM (configurable)
- 📁 **Location:** `backups/` folder in your project directory
- 💾 **Retention:** Keeps last 30 days of backups automatically
- 📝 **Format:** `reading_tracker.backup.YYYY-MM-DDTHH-mm-ss.db`

Example backup folder structure:
```
backups/
├── reading_tracker.backup.2026-04-27T02-00-00.db
├── reading_tracker.backup.2026-04-26T02-00-00.db
├── reading_tracker.backup.2026-04-25T02-00-00.db
└── ... (older backups auto-deleted after 30 days)
```

## How to Restore a Backup

### Step 1: Stop the app
Press `Ctrl+C` in your terminal where the dev server is running.

### Step 2: Identify the backup you want
Look in the `backups/` folder and find the backup file with the date/time you want to restore:
- `reading_tracker.backup.2026-04-27T02-00-00.db` (April 27 at 2 AM)
- `reading_tracker.backup.2026-04-26T02-00-00.db` (April 26 at 2 AM)

### Step 3: Restore the backup
Copy the backup file and replace the current database:

**On Mac/Linux:**
```bash
cp backups/reading_tracker.backup.2026-04-27T02-00-00.db reading_tracker.db
```

**On Windows (PowerShell):**
```powershell
Copy-Item -Path "backups\reading_tracker.backup.2026-04-27T02-00-00.db" -Destination "reading_tracker.db"
```

### Step 4: Restart the app
```bash
npm run dev
```

Your app will now load with all data from the backup! ✅

## Backup Notes

- **Automatic:** You don't need to do anything — backups run at 2 AM daily
- **Safe:** The original `reading_tracker.db` is never modified during backup
- **File-based:** SQLite is a single file, so restoring is as simple as copying a file
- **No data migration needed:** Just swap the file and restart the app

## Optional: Manual Backup

If you want to create a backup right now without waiting for 2 AM, you can:

**On Mac/Linux:**
```bash
cp reading_tracker.db backups/reading_tracker.backup.manual-$(date +%Y-%m-%dT%H-%M-%S).db
```

**On Windows (PowerShell):**
```powershell
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
Copy-Item -Path "reading_tracker.db" -Destination "backups\reading_tracker.backup.manual-$timestamp.db"
```

## Troubleshooting

### Backup isn't being created
- Check that the `backups/` folder exists (it's created automatically on first startup)
- Check server logs when app starts — you should see "⏰ Backup scheduler initialized"
- Make sure `node-cron` dependency is installed: `npm install`

### Restore isn't working
- Make sure you've stopped the dev server before replacing the database file
- Verify the backup file exists and has `.db` extension
- Restart the server after copying the backup file

### Want to change backup time?
Edit `backupManager.ts` line with the cron schedule:
```typescript
// Current: daily at 2 AM
cron.schedule('0 2 * * *', () => {
  // Change '0 2' to another time:
  // '0 3' = 3 AM
  // '0 0' = midnight
  // '30 18' = 6:30 PM
```

---

**That's it!** Your backups are now running automatically. You're protected! 📚✨
