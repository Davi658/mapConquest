const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');

const hasTurfInIndex = fs.readFileSync(indexPath, 'utf8').includes('turf');
const hasTurfInEditor = fs.readFileSync(editorPath, 'utf8').includes('turf');

console.log(`Turf.js in index.html: ${hasTurfInIndex}`);
console.log(`Turf.js in map-editor.js: ${hasTurfInEditor}`);
