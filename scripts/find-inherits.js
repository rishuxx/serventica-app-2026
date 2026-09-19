const fs = require('fs');
const bundle = fs.readFileSync('metro_bundle_debug.js', 'utf8');

const regex = /\(0,\s*([a-zA-Z0-9_$]+)\)\(\s*([a-zA-Z0-9_$]+),\s*([^)]+)\)/g;
let match;
const results = [];

// Look for anything that calls inherits
const inheritsIndex = bundle.indexOf('function _inherits(');
console.log('Inherits definition index:', inheritsIndex);

// Let's find all module definitions that contain _inherits
const modules = bundle.split('__d(function');
console.log('Total modules:', modules.length);

for (let i = 0; i < modules.length; i++) {
  const mod = modules[i];
  if (mod.includes('_inherits')) {
    const fileMatch = mod.match(/"([^"]+\.(?:tsx|ts|jsx|js))"/);
    const fileName = fileMatch ? fileMatch[1] : 'unknown';
    
    // Find what is extending what
    const extMatches = [...mod.matchAll(/\(0,\s*[^)]+inherits[^)]*\)\(\s*([a-zA-Z0-9_$]+),\s*([^)]+)\)/g)];
    for (const m of extMatches) {
      console.log(`[Module ${i}] File: ${fileName} -> ${m[1]} extends ${m[2]}`);
    }
  }
}
