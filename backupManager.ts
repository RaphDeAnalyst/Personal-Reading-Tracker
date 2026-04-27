import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BackupConfig {
  dbPath: string;
  backupDir: string;
  retentionDays: number;
}

export function initializeBackupManager(config: BackupConfig) {
  const { dbPath, backupDir, retentionDays = 30 } = config;

  // Ensure backups directory exists
  if (!fs.existsSync(backupDir)) {
    console.log('📚 Creating backups sanctuary...');
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Cleanup old backups
  function cleanupOldBackups() {
    try {
      const files = fs.readdirSync(backupDir);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Removed old backup: ${file}`);
        }
      });
    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error);
    }
  }

  // Perform backup
  function performBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFileName = `reading_tracker.backup.${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFileName);

      // Check if database exists before backing up
      if (!fs.existsSync(dbPath)) {
        console.log(`⚠️  Database not found at ${dbPath}, skipping backup`);
        return;
      }

      // Copy database file
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Database backup created: ${backupFileName}`);

      // Cleanup old backups
      cleanupOldBackups();
    } catch (error) {
      console.error('❌ Error performing backup:', error);
    }
  }

  // Schedule backup daily at 2 AM
  // Cron format: minute hour day-of-month month day-of-week
  const task = cron.schedule('0 2 * * *', () => {
    console.log('📖 The Archivist: Daily backup initiated...');
    performBackup();
  });

  console.log('⏰ Backup scheduler initialized (daily at 2 AM)');

  // Optional: Perform backup on startup (commented out by default)
  // performBackup();

  return { performBackup, task };
}
