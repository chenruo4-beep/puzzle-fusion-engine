const fs = require('fs');
const content = fs.readFileSync('D:/projects/puzzle-fusion-engine/frontend/src/app/dashboard/fragments/page.tsx', 'utf8');
const lines = content.split('\n');

// Check for double declaration issues
const decls = {};
const issues = [];
lines.forEach((line, i) => {
  const match = line.match(/^(?:const|let|var|function|interface|type)\s+(\w+)/);
  if (match) {
    const name = match[1];
    if (decls[name]) {
      issues.push({ line: i+1, name, first: decls[name] });
    } else {
      decls[name] = i+1;
    }
  }
});

if (issues.length > 0) {
  console.log('DUPLICATE DECLARATIONS:');
  issues.forEach(i => console.log('  Line', i.line, ':', i.name, '(first at line', i.first + ')'));
} else {
  console.log('No duplicate declarations found');
}

// Check brace balance
let braceDepth = 0;
let inString = false;
let stringChar = '';
let parenDepth = 0;
let bracketDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    
    if (inString) {
      if (c === '\\') { j++; continue; }
      if (c === stringChar) inString = false;
      continue;
    }
    
    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
    } else if (c === '{') braceDepth++;
    else if (c === '}') braceDepth--;
    else if (c === '(') parenDepth++;
    else if (c === ')') parenDepth--;
    else if (c === '[') bracketDepth++;
    else if (c === ']') bracketDepth--;
  }
}

console.log('\nBrace balance at end:', braceDepth, '(0 is good)');
console.log('Paren balance at end:', parenDepth, '(0 is good)');
console.log('Bracket balance at end:', bracketDepth, '(0 is good)');

// Check specific problematic area
// The error says 'Unexpected token div at line 278' 
// Find line 275-285
console.log('\nLines 273-283:');
for (let i = 272; i < 283; i++) {
  console.log(`[${i+1}]: ${lines[i]}`);
}

// Check what interface Fragment looks like
const fragInterface = lines.findIndex(l => l.trim().startsWith('interface Fragment'));
console.log('\nFragment interface at line:', fragInterface + 1);

// Check what happens at line 277 (before return)
for (let i = 265; i < 285; i++) {
  console.log(`[${i+1}]: ${lines[i]}`);
}