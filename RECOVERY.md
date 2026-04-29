# 🔄 Device Recovery & Setup Guide
## Complete Setup Instructions for The Archivist

**Last Updated:** April 29, 2026  
**Version:** 1.0  
**Status:** Production-Ready

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Preparation](#environment-preparation)
3. [Project Setup](#project-setup)
4. [Configuration](#configuration)
5. [Database Initialization](#database-initialization)
6. [Running the Application](#running-the-application)
7. [Local Hosting & Network Access](#local-hosting--network-access)
8. [Production-like Persistent Setup](#production-like-persistent-setup)
9. [Verification Checklist](#verification-checklist)
10. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
11. [Backup & Data Recovery](#backup--data-recovery)

---

## 🔧 Prerequisites

### Required Software
- **Node.js:** v18.0.0 or higher (minimum, v20+ recommended)
- **npm:** v9.0.0 or higher (comes with Node.js)
- **Git:** Latest version (for cloning the repository)
- **SQLite3:** (included in better-sqlite3, no separate installation needed)

### Operating System
- **Linux** (Ubuntu 20.04+ / Debian / any modern distro)
- **macOS** (10.14+)
- **Windows** (with WSL2 recommended for smooth development)

### Verify Prerequisites
```bash
node --version        # Should be v18.0.0 or higher
npm --version         # Should be v9.0.0 or higher
git --version         # Should be v2.30.0 or higher
```

### System Resources
- **Disk Space:** 500 MB minimum (plus space for database and uploads)
- **RAM:** 2 GB minimum (4 GB recommended)
- **Network:** Internet access for initial `npm install` and API calls

---

## 🌍 Environment Preparation

### 1. Choose a Working Directory
```bash
# Create a directory for the project
mkdir -p ~/projects
cd ~/projects

# Or use your preferred location
cd /path/to/your/workspace
```

### 2. Install Node.js (if not already installed)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
# Using Homebrew
brew install node@20
brew link node@20

# Or download from https://nodejs.org
```

**Windows (WSL2):**
```bash
# Inside your WSL terminal
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Create Directory Structure (Important!)
```bash
# These directories MUST exist for the app to function
mkdir -p uploads      # For PDF and cover image storage
mkdir -p backups      # For automated daily database backups
mkdir -p dist         # For production build artifacts (created by build process)
```

---

## 📦 Project Setup

### Step 1: Clone the Repository
```bash
# Using HTTPS (recommended for new machines)
git clone https://github.com/RaphDeAnalyst/Personal-Reading-Tracker.git
cd Personal-Reading-Tracker

# Or if you have SSH configured:
git clone git@github.com:RaphDeAnalyst/Personal-Reading-Tracker.git
cd Personal-Reading-Tracker
```

### Step 2: Verify Repository State
```bash
# Check branch status
git status

# You should be on `main` branch
# Output: "On branch main"
```

### Step 3: Install Dependencies
```bash
# This downloads all Node packages to node_modules/
# Takes 2-5 minutes depending on internet speed
npm install

# Verify installation succeeded
npm list --depth=0
```

**Expected output (key packages):**
- express@4.21.2
- react@19.0.0
- better-sqlite3@12.9.0
- vite@6.2.0
- typescript@5.8.2

### Step 4: Check File Structure
```bash
# Verify critical files exist
ls -la | grep -E "server.ts|package.json|vite.config.ts|tsconfig.json"

# Should see:
# server.ts
# package.json
# vite.config.ts
# tsconfig.json
```

---

## ⚙️ Configuration

### Step 1: Create Environment File

The app requires a `.env.local` file (optional for basic development):

```bash
# Create the file
cat > .env.local << 'EOF'
# GEMINI_API_KEY is OPTIONAL for local development
# Only needed if using Gemini AI features (metadata extraction from ISBN)
# Obtain from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY="your_api_key_here"

# DATABASE_URL specifies where the SQLite database is stored
# Default (if not set): ./reading_tracker.db
# Can be an absolute path or relative to project root
# DATABASE_URL="/path/to/reading_tracker.db"

# PORT for the Express server
# Default (if not set): 3000
# PORT=3000
EOF
```

**Notes:**
- If `.env.local` doesn't exist, defaults are used (reading_tracker.db, port 3000)
- GEMINI_API_KEY is entirely optional; the app works fine without it
- For production: create `.env` file (not `.env.local`)

### Step 2: Verify Configuration
```bash
# Check environment is loaded (optional)
npm run lint

# Should complete with no TypeScript errors
```

### Step 3: Directory Permissions
```bash
# Ensure uploads directory is writable
chmod 755 uploads

# Ensure backups directory is writable
chmod 755 backups

# Check current user owns the directories
ls -la | grep -E "uploads|backups"
```

---

## 🗄️ Database Initialization

### Automatic Initialization (RECOMMENDED)

The database is **automatically created and migrated** when you first start the server.

```bash
# Starting the server triggers database setup
npm run dev

# You should see output like:
# "Initializing database connection at reading_tracker.db..."
# "Running database migrations..."
# "✓ Database initialized successfully"
```

**What happens automatically:**
1. SQLite database file is created (`reading_tracker.db`)
2. All tables are created with proper schema:
   - `books` (with title, author, pages, status, etc.)
   - `logs` (daily reading progress)
   - `reflections` (notes and ratings)
   - `tags` (for categorizing books)
   - `book_tags` (junction table)
   - `reading_goals` (annual reading targets)
   - `goal_completions` (immutable completion history)
   - `completion_reflections` (reflection snapshots)
3. All indexes are created for performance
4. Foreign key constraints are enabled
5. WAL (Write-Ahead Logging) mode is enabled for better concurrency

### Verify Database Creation
```bash
# Check if database file exists
ls -lh reading_tracker.db

# Should show a file (likely 64 KB initially)

# Inspect database schema (optional)
sqlite3 reading_tracker.db ".tables"
# Should list: books, logs, reflections, tags, book_tags, reading_goals, goal_completions, completion_reflections
```

### Starting Fresh with Clean Database

If you need to reset everything:

```bash
# ⚠️ WARNING: This deletes all data
rm reading_tracker.db
rm reading_tracker.db-shm reading_tracker.db-wal 2>/dev/null || true

# Restart the server to regenerate
npm run dev
```

### Restoring from Backup

If you have a previous backup:

```bash
# Backups are stored in ./backups/ directory
ls -la backups/

# To restore a backup:
cp backups/reading_tracker.backup.2026-04-29T10-17-00.db reading_tracker.db
rm reading_tracker.db-shm reading_tracker.db-wal 2>/dev/null || true

# Restart the server
npm run dev
```

---

## 🚀 Running the Application

### Development Mode (Recommended for Active Work)

**Terminal 1: Start the Development Server**
```bash
npm run dev

# Expected output:
# VITE v6.2.0 ready in XXX ms
# ➜  Local:   http://localhost:3000
# ➜  Ready
```

This gives you:
- Hot module reloading (changes appear instantly without full refresh)
- Full TypeScript checking
- Easy debugging via browser DevTools
- Fast iteration during development

**Access the app:**
```bash
# Open in browser
open http://localhost:3000      # macOS
xdg-open http://localhost:3000  # Linux
start http://localhost:3000     # Windows
```

### Production Build & Testing

If you want to test the production build locally:

```bash
# Build the project
npm run build

# Should create ./dist/ directory with optimized files

# Preview the production build
npm run preview

# Output: ➜  Local: http://localhost:4173

# Open in browser to test production version
open http://localhost:4173
```

### TypeScript Type Checking

```bash
# Check for type errors without running
npm run lint

# Should report "No errors"
```

---

## 🌐 Local Hosting & Network Access

### Accessing from localhost (Same Machine)

**Development Server:**
```bash
# Already available at http://localhost:3000
# No additional setup needed
```

### Accessing from Other Machines on Local Network

**Step 1: Find Your Local IP**

```bash
# Linux/macOS:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows (in PowerShell):
ipconfig

# Look for IPv4 Address (typically 192.168.x.x or 10.0.x.x)
# Example: 192.168.1.105
```

**Step 2: Modify Server to Listen on 0.0.0.0**

The app already listens on `0.0.0.0` by default, so you should be able to access it from other machines:

```bash
# From another machine on the same network:
# http://192.168.1.105:3000  (replace with your IP)
```

**Step 3: Firewall Configuration (if needed)**

```bash
# Linux: Allow port 3000 through firewall
sudo ufw allow 3000/tcp

# Verify:
sudo ufw status
```

### Testing Network Access

```bash
# From the main machine, verify server is listening:
netstat -tuln | grep 3000

# Should show: 0.0.0.0:3000 LISTEN

# From another machine on the network:
curl http://192.168.1.105:3000
# Should return HTML (the React app)
```

---

## 🔄 Production-like Persistent Setup (Using PM2)

If you want the app to run continuously and restart on reboot:

### Install PM2 Globally

```bash
npm install -g pm2

# Verify installation
pm2 --version
```

### Create PM2 Ecosystem Config

Create `ecosystem.config.cjs` in project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'the-archivist',
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'reading_tracker.db'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### Start the App with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.cjs

# Check status
pm2 status

# View logs
pm2 logs the-archivist

# Stop the application
pm2 stop the-archivist

# Restart it
pm2 restart the-archivist
```

### Enable Auto-start on Boot

```bash
# Save PM2 startup configuration
pm2 startup

# Follow the output instructions (usually requires sudo)
sudo env PATH=$PATH:/usr/local/bin pm2 startup -u $(whoami) --hp $(eval echo ~$(whoami))

# Save current PM2 process list
pm2 save

# Verify it's saved
pm2 startup

# On next reboot, the app starts automatically
```

### Monitor with PM2 Dashboard (Optional)

```bash
# Install PM2 Plus (optional, free tier available)
pm2 plus

# Or use the web dashboard
pm2 web
# Access at http://localhost:9615
```

---

## ✅ Verification Checklist

### Pre-Launch Checks

- [ ] Node.js v18+ installed: `node --version`
- [ ] npm v9+ installed: `npm --version`
- [ ] Git installed: `git --version`
- [ ] Repository cloned: `git status` shows "On branch main"
- [ ] Dependencies installed: `npm list --depth=0` shows all packages
- [ ] `.env.local` file exists (if needed)
- [ ] `uploads/` directory exists and is writable
- [ ] `backups/` directory exists and is writable

### Launch Checks

```bash
npm run dev

# Wait for output showing "Ready" status
# Check no errors in console
```

- [ ] App starts without errors
- [ ] Console shows "Database initialized"
- [ ] No "EADDRINUSE" errors (port 3000 conflict)
- [ ] No TypeScript errors

### Functional Verification

**Test 1: App Loads**
```bash
# Browser: http://localhost:3000
# Should see dashboard with no books
```
- [ ] Dashboard loads and displays "Empty Section"

**Test 2: Add a Physical Book**
```bash
# Click "+ Add Book"
# Fill in:
#   - Title: "Test Book"
#   - Author: "Test Author"
#   - Pages: "300"
#   - Mode: "PHYSICAL"
# Click "Add to Library"
```
- [ ] Book appears in dashboard
- [ ] Toast shows success message
- [ ] Database file size increased

**Test 3: Log Reading Progress**
```bash
# Click the new book
# Click "Log Progress"
# Enter current page: "50"
# Click "Save"
```
- [ ] Reading log created
- [ ] Book current_page updated to 50
- [ ] Progress bar shows ~17% (50/300)

**Test 4: Add Digital Book (PDF)**
```bash
# Click "+ Add Book"
# Choose Mode: "DIGITAL"
# Fill in title, author, pages
# Upload a test PDF (any PDF works)
# Click "Add to Library"
```
- [ ] PDF uploaded successfully
- [ ] File appears in uploads/ directory
- [ ] Book has PDF icon in sidebar

**Test 5: Open PDF Reader**
```bash
# Click the PDF book
# Click "Open & Read"
# Should see PDF viewer
```
- [ ] PDF renders without errors
- [ ] Page navigation works
- [ ] Current page updates

**Test 6: Write Reflection**
```bash
# From book detail, click "Write Reflection"
# Fill in: Rating (5), Learning, Application, Disagreement
# Click "Save"
```
- [ ] Reflection saved
- [ ] Reflection appears in ReflectionsIndex
- [ ] Editable

**Test 7: Mark as Completed**
```bash
# From book detail, mark as "COMPLETED"
```
- [ ] Status changes to "COMPLETED"
- [ ] Book moves to "Completed" tab
- [ ] Reflection snapshot saved to archive

**Test 8: Insights Dashboard**
```bash
# Click "Insights" in sidebar
# Should see stats and charts
```
- [ ] Stats update correctly
- [ ] Charts render without errors
- [ ] Monthly reading chart displays

**Test 9: Reading Archive**
```bash
# Click "Archive" in sidebar
# Should see completed books
```
- [ ] Archive displays completed books
- [ ] Can view book details from archive
- [ ] Metadata (cover, pages, ISBN) displays correctly

**Test 10: API Endpoints**
```bash
# Test a few API calls:
curl http://localhost:3000/api/books
# Should return JSON array of books

curl http://localhost:3000/api/insights
# Should return statistics

curl http://localhost:3000/api/dashboard/status
# Should return current reading status
```
- [ ] All endpoints return valid JSON
- [ ] No 500 errors in console
- [ ] Network tab shows successful requests (200 status)

### Data Integrity Check

```bash
# Inspect database
sqlite3 reading_tracker.db

# Check record counts:
sqlite> SELECT COUNT(*) FROM books;
sqlite> SELECT COUNT(*) FROM logs;
sqlite> SELECT COUNT(*) FROM reflections;

# Should match what you see in the app
sqlite> .quit
```

---

## 🚨 Common Issues & Troubleshooting

### Issue 1: Port 3000 Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Option A: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option B: Use a different port
PORT=3001 npm run dev

# Option C: Find what's using the port
lsof -i :3000
netstat -tuln | grep 3000

# Kill the specific PID
kill -9 <PID>
```

### Issue 2: Database Locked / Corrupted

**Symptom:**
```
Error: database is locked
Error: cannot open shared object file
```

**Solution:**

```bash
# Remove temporary database files
rm reading_tracker.db-shm reading_tracker.db-wal

# Restart the server
npm run dev

# If still locked, reset completely (WARNING: loses data):
rm reading_tracker.db reading_tracker.db-shm reading_tracker.db-wal
npm run dev  # Recreates empty database
```

### Issue 3: PDF Upload Fails

**Symptom:**
```
Error: Only PDF files are allowed
File is not being saved to uploads/
```

**Solution:**

```bash
# Check file type
file your-file.pdf

# Ensure mimetype is application/pdf
# Test with a known PDF:
# Download from: https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample-link-document.pdf

# Check uploads directory permissions
ls -la uploads/
chmod 755 uploads/

# Restart server
npm run dev
```

### Issue 4: Dependencies Installation Fails

**Symptom:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Try install again with legacy dependency resolver
npm install --legacy-peer-deps

# Or use npm v9+:
npm install

# If still fails, check Node version:
node --version  # Should be v18+

# Update Node if necessary
nvm install 20
nvm use 20
npm install
```

### Issue 5: Changes Not Hot-Reloading

**Symptom:**
Changes to files don't automatically refresh in browser during `npm run dev`

**Solution:**

```bash
# Check if HMR is disabled in environment
echo $DISABLE_HMR  # Should be unset or "false"

# If it's "true", unset it:
unset DISABLE_HMR
npm run dev

# Or set explicitly:
DISABLE_HMR=false npm run dev
```

### Issue 6: "Cannot find module" TypeScript Error

**Symptom:**
```
Cannot find module '@/types' or its corresponding type declarations
```

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify tsconfig paths are correct:
grep -A3 '"paths"' tsconfig.json
# Should show: "@/*": ["./*"]

# Clear TypeScript cache:
npm run lint  # Should pass with no errors now
```

### Issue 7: Gemini API Errors (if using AI features)

**Symptom:**
```
Error: GEMINI_API_KEY not found
or
Error: 401 Unauthorized from Gemini API
```

**Solution:**

```bash
# This is optional! The app works without it.
# If you want to use Gemini for ISBN lookups:

# 1. Get API key from: https://makersuite.google.com/app/apikey
# 2. Add to .env.local:
echo 'GEMINI_API_KEY="your_key_here"' >> .env.local

# 3. Restart server:
npm run dev

# Or just skip ISBN lookups - they're entirely optional
```

### Issue 8: React/Vite Build Errors

**Symptom:**
```
Error: Failed to parse source map
or
Error: Maximum call stack size exceeded
```

**Solution:**

```bash
# Clean build artifacts
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build

# Check for circular imports or large files:
du -sh dist/  # Shouldn't exceed 2 MB

# If still failing, check Node version:
node --version  # Should be v18+
```

### Issue 9: File Upload Path Issues

**Symptom:**
Uploads folder not creating, or files not finding uploaded PDFs

**Solution:**

```bash
# Verify uploads directory exists and is in git
ls -la uploads/
git status uploads/

# If missing, recreate:
mkdir -p uploads
touch uploads/.gitkeep
git add uploads/.gitkeep

# Check server is serving static files:
curl http://localhost:3000/uploads/
# Should return HTML or list (if directory listing enabled)
```

### Issue 10: Database Migrations Stuck

**Symptom:**
Server hangs or crashes with "ALTER TABLE" errors

**Solution:**

```bash
# Check database integrity
sqlite3 reading_tracker.db "PRAGMA integrity_check;"
# Should return "ok"

# If not, backup and reset:
cp reading_tracker.db reading_tracker.db.backup
rm reading_tracker.db reading_tracker.db-shm reading_tracker.db-wal

# Restart to regenerate
npm run dev
```

---

## 📦 Backup & Data Recovery

### Automated Daily Backups

The app automatically creates daily backups at 2 AM:

```bash
# View backups
ls -la backups/

# Example output:
# reading_tracker.backup.2026-04-29T02-00-00.db
# reading_tracker.backup.2026-04-28T02-00-00.db
# reading_tracker.backup.2026-04-27T02-00-00.db
```

**Backup Retention:**
- Backups older than 30 days are automatically deleted
- Keep at least 3-4 recent backups for emergency recovery

### Manual Backup

```bash
# Create a manual backup anytime
sqlite3 reading_tracker.db ".backup backups/reading_tracker.backup.manual-$(date +%Y-%m-%d-%H%M%S).db"

# Or using cp:
cp reading_tracker.db "backups/reading_tracker.backup.manual-$(date +%Y-%m-%d-%H%M%S).db"
```

### Restore from Backup

```bash
# List available backups
ls -la backups/ | grep reading_tracker.backup

# Choose one to restore:
cp "backups/reading_tracker.backup.2026-04-28T02-00-00.db" reading_tracker.db

# Remove temporary WAL files
rm reading_tracker.db-shm reading_tracker.db-wal 2>/dev/null || true

# Restart server
npm run dev

# Verify data is restored:
curl http://localhost:3000/api/books
# Should show your previous books
```

### Export Data (Manual Backup for Export)

```bash
# Create a full backup for archival
sqlite3 reading_tracker.db ".dump" > reading_tracker.sql

# This creates a SQL dump that can be imported anywhere
# To restore:
# sqlite3 new_database.db < reading_tracker.sql
```

### Monitor Backup Creation

```bash
# Watch the logs (if using PM2):
pm2 logs the-archivist

# Check backup size:
du -sh backups/
ls -lhS backups/ | head -5  # Largest backups first
```

---

## 📱 Development Workflow (Post-Setup)

### Daily Development

```bash
# Start your work
npm run dev

# Make changes to src/ files
# Changes auto-reload in browser

# When ready to commit:
git status
git add .
git commit -m "Your message"
git push origin main
```

### Testing Before Deployment

```bash
# Type check
npm run lint

# Build production version
npm run build

# Preview production build
npm run preview

# Visit http://localhost:4173 to test
```

### Deploying Changes

```bash
# After pushing to GitHub:
git push origin main

# From deployment machine:
git pull origin main
npm install  # If dependencies changed
npm run build
pm2 restart the-archivist
```

---

## 🎯 Success Indicators

✅ You've successfully set up when:

1. `npm run dev` starts without errors
2. Browser opens app at `http://localhost:3000`
3. Dashboard displays "Empty Section" initially
4. Can add a book and see it appear
5. Can log reading progress
6. Can write reflections
7. Insights tab shows statistics
8. Archive tab shows completed books
9. No errors in browser console
10. Database file exists and is growing in size

---

## 📞 Getting Help

If something is broken:

1. Check this guide's troubleshooting section
2. Run `npm run lint` to catch type errors
3. Check browser console (F12) for JavaScript errors
4. Check terminal output for server errors
5. Try resetting the database:
   ```bash
   rm reading_tracker.db* && npm run dev
   ```
6. Check GitHub issues: https://github.com/RaphDeAnalyst/Personal-Reading-Tracker

---

## 🔐 Security Notes

- **Never commit `.env.local`** with real API keys to GitHub
- Use `.gitignore` to exclude sensitive files (it's already configured)
- Keep `node_modules/` out of version control
- Regularly update dependencies: `npm update`
- Review backup files permissions: `chmod 600 backups/*`

---

**You're all set! Enjoy using The Archivist on your new machine.** 📚✨
