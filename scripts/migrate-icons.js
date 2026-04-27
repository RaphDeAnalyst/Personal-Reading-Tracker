#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
const files = [];

function walkDir(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(full);
    }
  });
}

walkDir(srcDir);

console.log(`Found ${files.length} TypeScript files to process`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  // Replace material symbols icons with Lucide icons
  Object.entries(iconMap).forEach(([materialName, lucideName]) => {
    // Match: <span className="material-symbols-outlined" ... >iconName</span>
    const regex = new RegExp(
      `<span\\s+className="material-symbols-outlined[^"]*"[^>]*>${materialName}</span>`,
      'g'
    );
    content = content.replace(regex, `<${lucideName} className="w-6 h-6" />`);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`✓ Updated ${path.relative(srcDir, file)}`);
  }
});

console.log('Icon migration complete!');
