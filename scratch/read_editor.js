const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');
const lines = fs.readFileSync(editorPath, 'utf8').split('\n');

console.log("Searching for 'pm' or 'geoman' in map-editor.js:");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('pm') || line.toLowerCase().includes('geoman')) {
        console.log(`[Line ${idx + 1}] ${line.trim()}`);
    }
});
