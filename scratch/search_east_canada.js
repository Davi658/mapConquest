const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Searching by name/ID query:");
data.features.forEach(f => {
    const id = String(f.id).toLowerCase();
    const name = String(f.properties.name || '').toLowerCase();
    if (id.includes('newfound') || id.includes('labrador') || name.includes('newfound') || name.includes('labrador')) {
        console.log(`- ID: "${f.id}", Name: "${f.properties.name}"`);
    }
});
