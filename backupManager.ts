import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BackupConfig {
  db: InstanceType<typeof Database>;
  dbPath: string;
  backupDir: string;
  retentionDays: number;
}

export function initializeBackupManager(config: BackupConfig) {
  const { db, backupDir, retentionDays = 30 } = config;

  if (!fs.existsSync(backupDir)) {
    console.log('Creating backups directory...');
    fs.mkdirSync(backupDir, { recursive: true });
  }

  function cleanupOldBackups() {
    try {
      const files = fs.readdirSync(backupDir);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`Removed old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  async function performBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFileName = `reading_tracker.backup.${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFileName);

      // Use better-sqlite3's online backup API — safe for concurrent reads/writes
      await db.backup(backupPath);
      console.log(`Database backup created: ${backupFileName}`);

      cleanupOldBackups();
    } catch (error) {
      console.error('Error performing backup:', error);
    }
  }

  const task = cron.schedule('0 2 * * *', async () => {
    console.log('Daily backup initiated...');
    await performBackup();
  });

  console.log('Backup scheduler initialized (daily at 2 AM)');

  return { performBackup, task };
}
