#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const iconMap = {
  add: 'Plus',
  add_circle: 'PlusCircle',
  arrow_back: 'ArrowLeft',
  arrow_drop_down: 'ChevronDown',
  arrow_drop_up: 'ChevronUp',
  arrow_forward: 'ArrowRight',
  auto_stories: 'BookOpen',
  book: 'Book',
  check_circle: 'CheckCircle',
  chevron_left: 'ChevronLeft',
  chevron_right: 'ChevronRight',
  close: 'X',
  delete: 'Trash2',
  edit: 'Edit',
  edit_note: 'Edit',
  event_note: 'Calendar',
  format_quote: 'Quote',
  help: 'HelpCircle',
  history_edu: 'Clock',
  import_contacts: 'Download',
  info: 'Info',
  landscape: 'Landscape',
  lock_open: 'Lock',
  menu: 'Menu',
  menu_book: 'BookOpen',
  picture_as_pdf: 'FileText',
  psychology: 'Brain',
  search: 'Search',
  search_off: 'SearchX',
  settings: 'Settings',
  star: 'Star',
  target: 'Target',
  trending_up: 'TrendingUp',
  upload_file: 'Upload',
};

const srcDir = path.join(__dirname, '..', 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Replace all material-symbols-outlined spans with Lucide icons
  // Handle: <span className="material-symbols-outlined..." ...>iconName</span>
  content = content.replace(
    /<span[^>]*className="[^"]*material-symbols-outlined[^"]*"[^>]*>([a-z_]+)<\/span>/g,
    (match, iconName) => {
      const lucideIcon = iconMap[iconName] || 'Zap';
      return `<${lucideIcon} className="w-6 h-6" />`;
    }
  );

  // Also handle variations with style or other attributes before/after className
  content = content.replace(
    /<span[^>]*material-symbols-outlined[^>]*>([a-z_]+)<\/span>/g,
    (match, iconName) => {
      const lucideIcon = iconMap[iconName] || 'Zap';
      return `<${lucideIcon} className="w-6 h-6" />`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const items = fs.readdirSync(dir);
  let updated = 0;

  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory() && item !== 'node_modules') {
      updated += walkDir(full);
    } else if ((item.endsWith('.tsx') || item.endsWith('.ts')) && item !== 'iconMap.ts') {
      if (processFile(full)) {
        console.log(`✓ ${path.relative(srcDir, full)}`);
        updated++;
      }
    }
  });

  return updated;
}

console.log('Converting Material Symbols to Lucide React icons...\n');
const updated = walkDir(srcDir);
console.log(`\n✅ Converted ${updated} files`);
console.log('\nNext steps:');
console.log('1. Add Lucide imports to each component');
console.log('2. Remove material-symbols-outlined CSS class');
console.log('3. Remove Google Fonts links from index.html');
