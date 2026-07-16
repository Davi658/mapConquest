const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const lines = fs.readFileSync(indexPath, 'utf8').split('\n');

console.log("Searching for 'geometry-tools-modal' in index.html:");
let printing = false;
let openBrackets = 0;

lines.forEach((line, idx) => {
    if (line.includes('id="geometry-tools-modal"')) {
        printing = true;
    }
    
    if (printing) {
        console.log(`[Line ${idx + 1}] ${line}`);
        // Count opening and closing divs to stop printing at the end of the container
        const opens = (line.match(/<div/g) || []).length;
        const closes = (line.match(/<\/div>/g) || []).length;
        openBrackets += opens - closes;
        if (openBrackets < 0 || (idx > 300 && line.includes('</section>'))) {
            printing = false;
        }
    }
});
