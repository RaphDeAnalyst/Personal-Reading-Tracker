#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const iconsUsed = {
  'components/App.tsx': ['Menu', 'X', 'MoreVertical', 'Plus', 'BookOpen'],
  'components/Dashboard.tsx': ['Book', 'Search', 'SearchX', 'Plus', 'Clock', 'Target', 'TrendingUp'],
  'components/InsightsView.tsx': ['TrendingUp', 'Star', 'Brain', 'Clock'],
  'components/AddBook.tsx': ['Upload', 'X'],
  'components/BookDetailView.tsx': ['BookOpen', 'Edit', 'Trash2', 'X'],
  'components/ReflectionIndexView.tsx': ['ArrowLeft', 'Edit'],
  'components/Sidebar.tsx': ['X', 'Moon', 'Sun'],
  'components/LogProgressView.tsx': ['ArrowLeft'],
  'components/PDFReader.tsx': ['ChevronLeft', 'ChevronRight', 'X'],
  'components/ReflectionView.tsx': ['ArrowLeft'],
  'components/SuccessView.tsx': ['CheckCircle', 'ArrowRight'],
};

function addImports(filePath, icons) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Get unique icons and filter out duplicates
  const uniqueIcons = [...new Set(icons)];

  // Check if lucide-react is already imported
  if (content.includes('from \'lucide-react\'')) {
    console.log(`✓ ${path.basename(filePath)} already has Lucide imports`);
    return;
  }

  // Add import after the first import statement
  const importLine = `import { ${uniqueIcons.join(', ')} } from 'lucide-react';\n`;

  // Find the last import line and add after it
  const importRegex = /^import .+ from ['"'].+['"'];$/m;
  const matches = content.match(new RegExp(importRegex, 'gm'));

  if (matches) {
    const lastImport = matches[matches.length - 1];
    content = content.replace(lastImport, lastImport + '\n' + importLine);
  } else {
    // If no imports found, add at the beginning
    content = importLine + content;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Added Lucide imports to ${path.basename(filePath)}`);
}

console.log('Adding Lucide React imports...\n');

Object.entries(iconsUsed).forEach(([file, icons]) => {
  const fullPath = path.join(srcDir, file);
  if (fs.existsSync(fullPath)) {
    addImports(fullPath, icons);
  }
});

console.log('\n✅ Lucide imports added!');
