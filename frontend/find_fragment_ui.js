const fs = require('fs');
const path = 'D:/projects/puzzle-fusion-engine/frontend/src/app/dashboard/fusion/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find the end of the file (last lines)
console.log('Total lines:', lines.length);
console.log('Last 5 lines:');
for (let i = lines.length - 5; i < lines.length; i++) {
  console.log(`[${i+1}]: ${lines[i]}`);
}

// Find the fragment button section
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('toggleFragmentWithLimit') && lines[i].includes('className')) {
    console.log(`\nFragment button around line ${i+1}:`);
    for (let j = Math.max(0, i-2); j < Math.min(lines.length, i+10); j++) {
      console.log(`[${j+1}]: ${lines[j]}`);
    }
    break;
  }
}