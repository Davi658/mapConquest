const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Searching for any Caribbean island feature:");
data.features.forEach(f => {
    const id = String(f.id).toLowerCase();
    const name = String(f.properties.name || '').toLowerCase();
    if (id.includes('cuba') || name.includes('cuba') || id.includes('haiti') || name.includes('haiti') || 
        id.includes('doming') || name.includes('doming') || id.includes('jamaic') || name.includes('jamaic') ||
        id.includes('puerto') || name.includes('puerto') || id.includes('rico') || name.includes('rico')) {
        console.log(`- ID: "${f.id}", Name: "${f.properties.name}"`);
    }
});
