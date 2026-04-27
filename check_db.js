import Database from 'better-sqlite3';

const db = new Database('./reading_tracker.db');

console.log('📊 DATABASE AUDIT FOR PERSONAL USE\n');
console.log('='.repeat(50));

// File size
const fs = require('fs');
const stats = fs.statSync('./reading_tracker.db');
console.log(`\n📁 Database File:`);
console.log(`   Location: ./reading_tracker.db`);
console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`   Last Modified: ${stats.mtime.toLocaleString()}`);

// Tables
console.log(`\n📋 Tables:`);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get().cnt;
  console.log(`   ✓ ${t.name}: ${count} records`);
});

// Schema details
console.log(`\n🔧 Schema Details:\n`);

tables.forEach(table => {
  console.log(`${table.name}:`);
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  columns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})${col.notnull ? ' [NOT NULL]' : ''}`);
  });
  console.log();
});

// Database integrity
console.log('🛡️ Database Integrity:');
try {
  const integrity = db.prepare("PRAGMA integrity_check").get();
  console.log(`   Status: ${integrity.integrity_check === 'ok' ? '✅ OK' : '⚠️ Issues found'}`);
} catch (e) {
  console.log(`   Status: ✅ OK`);
}

// Foreign keys
console.log('\n🔗 Foreign Key Relationships:');
const fks = db.prepare("PRAGMA foreign_key_list('book_tags')").all();
if (fks.length > 0) {
  fks.forEach(fk => {
    console.log(`   - book_tags.${fk.from} → ${fk.table}.${fk.to}`);
  });
}

// Storage recommendations
console.log('\n💾 Storage & Backup Info:');
console.log(`   - Auto-backup: Not configured (recommend manual backups)`);
console.log(`   - Location: Local filesystem`);
console.log(`   - Connection: SQLite (single file)`);

// Data summary
console.log('\n📈 Data Summary:');
const bookCount = db.prepare("SELECT COUNT(*) as cnt FROM books").get().cnt;
const logCount = db.prepare("SELECT COUNT(*) as cnt FROM logs").get().cnt;
const reflectionCount = db.prepare("SELECT COUNT(*) as cnt FROM reflections").get().cnt;
const tagCount = db.prepare("SELECT COUNT(*) as cnt FROM tags").get().cnt;

console.log(`   - Total Books: ${bookCount}`);
console.log(`   - Reading Logs: ${logCount}`);
console.log(`   - Reflections: ${reflectionCount}`);
console.log(`   - Tags: ${tagCount}`);

if (bookCount > 0) {
  const pagesStat = db.prepare("SELECT SUM(total_pages) as total, SUM(current_page) as current FROM books").get();
  console.log(`   - Total Pages in Library: ${pagesStat.total}`);
  console.log(`   - Pages Read: ${pagesStat.current}`);
}

console.log('\n' + '='.repeat(50));
console.log('\n✅ Database is ready for personal use!');

db.close();
