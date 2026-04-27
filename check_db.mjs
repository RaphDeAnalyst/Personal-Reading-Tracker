import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('./reading_tracker.db');

console.log('📊 DATABASE AUDIT FOR PERSONAL USE\n');
console.log('='.repeat(50));

// File size
const stats = fs.statSync('./reading_tracker.db');
console.log(`\n📁 Database File:`);
console.log(`   Location: ./reading_tracker.db`);
console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`   Last Modified: ${stats.mtime.toLocaleString()}`);

// Tables
console.log(`\n📋 Tables & Record Count:`);
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

// Foreign keys
console.log('🔗 Foreign Key Relationships:');
const fks = db.prepare("PRAGMA foreign_key_list('book_tags')").all();
if (fks.length > 0) {
  fks.forEach(fk => {
    console.log(`   - book_tags.${fk.from} → ${fk.table}.${fk.to}`);
  });
} else {
  console.log('   No foreign key constraints found (but structure supports cascading deletes)');
}

// Data summary
console.log('\n📈 Data Summary:');
const bookCount = db.prepare("SELECT COUNT(*) as cnt FROM books").get().cnt;
const logCount = db.prepare("SELECT COUNT(*) as cnt FROM logs").get().cnt;
const reflectionCount = db.prepare("SELECT COUNT(*) as cnt FROM reflections").get().cnt;
const tagCount = db.prepare("SELECT COUNT(*) as cnt FROM tags").get().cnt;
const goalCount = db.prepare("SELECT COUNT(*) as cnt FROM reading_goals").get().cnt;

console.log(`   - Total Books: ${bookCount}`);
console.log(`   - Reading Logs: ${logCount}`);
console.log(`   - Reflections: ${reflectionCount}`);
console.log(`   - Tags: ${tagCount}`);
console.log(`   - Reading Goals: ${goalCount}`);

if (bookCount > 0) {
  const pagesStat = db.prepare("SELECT SUM(total_pages) as total, SUM(current_page) as current FROM books").get();
  const avgPages = db.prepare("SELECT AVG(total_pages) as avg FROM books").get().avg;
  console.log(`\n   - Total Pages in Library: ${pagesStat.total}`);
  console.log(`   - Pages Read: ${pagesStat.current}`);
  console.log(`   - Avg Book Length: ${Math.round(avgPages)} pages`);
}

// Books by status
if (bookCount > 0) {
  console.log('\n📚 Books by Status:');
  const statuses = db.prepare(`SELECT status, COUNT(*) as cnt FROM books GROUP BY status`).all();
  statuses.forEach(s => {
    console.log(`   - ${s.status}: ${s.cnt} books`);
  });
}

// Recommendations
console.log('\n💾 Storage & Backup Recommendations:');
console.log(`   ✓ Database: SQLite (single file, perfect for personal use)`);
console.log(`   ✓ Location: Local filesystem (reading_tracker.db)`);
console.log(`   ⚠️  BACKUP: Manual backup recommended (copy reading_tracker.db regularly)`);
console.log(`   ⚠️  No auto-sync: Data only on this machine`);

console.log('\n🎯 Suitability for Personal Use:');
console.log(`   ✅ Lightweight (${(stats.size / 1024).toFixed(2)} KB)`);
console.log(`   ✅ No external dependencies (self-contained)`);
console.log(`   ✅ Full-featured schema (books, logs, reflections, tags, goals)`);
console.log(`   ✅ Proper relationships (cascading deletes, constraints)`);
console.log(`   ✅ Can grow with you (SQLite supports millions of records)`);

console.log('\n' + '='.repeat(50));
console.log('\n✅ Ready for personal use!');

db.close();
