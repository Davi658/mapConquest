const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');
const lines = fs.readFileSync(editorPath, 'utf8').split('\n');

console.log("Searching for bindEvents in map-editor.js:");
lines.forEach((line, idx) => {
    if (line.includes('bindEvents()')) {
        console.log(`Found bindEvents() at line ${idx + 1}`);
        // print next 50 lines
        for (let i = idx; i < Math.min(lines.length, idx + 80); i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
    }
});
