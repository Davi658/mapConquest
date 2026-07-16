const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');
const content = fs.readFileSync(editorPath, 'utf8');

// Regex to find methods: e.g. "methodName(args) {"
const matches = content.matchAll(/^\s+([a-zA-Z0-9_]+)\s*\(.*?\)\s*\{/gm);

console.log("Methods in MapEditorController:");
for (const match of matches) {
    console.log(`  - ${match[1]}`);
}
