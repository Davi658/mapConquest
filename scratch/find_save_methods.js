const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');
const lines = fs.readFileSync(editorPath, 'utf8').split('\n');

console.log("Searching for 'save' or 'server' in map-editor.js:");
lines.forEach((line, idx) => {
    const l = line.toLowerCase();
    if (l.includes('save') || l.includes('server') || l.includes('endpoint') || l.includes('fetch')) {
        console.log(`[Line ${idx + 1}] ${line.trim()}`);
    }
});
