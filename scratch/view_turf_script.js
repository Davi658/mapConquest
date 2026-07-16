const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const lines = fs.readFileSync(indexPath, 'utf8').split('\n');

console.log("Searching for 'turf' script tags in index.html:");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('turf')) {
        console.log(`[Line ${idx + 1}] ${line.trim()}`);
    }
});
