const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-board.js');
const editorPath = path.join(__dirname, '..', 'src', 'interfaces', 'map-editor.js');

const checkFile = (filepath, name) => {
    if (!fs.existsSync(filepath)) {
        console.log(`${name} does not exist`);
        return;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    console.log(`=== Matches in ${name} ===`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('Polygon') || line.includes('LineString') || line.includes('Geometry') || line.includes('toGeoJSON')) {
            console.log(`[Line ${idx + 1}] ${line.trim()}`);
        }
    });
};

checkFile(boardPath, 'map-board.js');
checkFile(editorPath, 'map-editor.js');
