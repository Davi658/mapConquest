const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// Florida bounds: longitude -88 to -79, latitude 24 to 31
console.log("Checking features overlapping Florida coordinates (-88 to -79, 24 to 31):");

data.features.forEach((f, idx) => {
    let coords = [];
    if (!f.geometry) return;
    if (f.geometry.type === 'Polygon') {
        coords = f.geometry.coordinates[0];
    } else if (f.geometry.type === 'MultiPolygon') {
        coords = f.geometry.coordinates.flatMap(p => p[0]);
    }
    
    let overlaps = false;
    for (const c of coords) {
        const lng = c[0];
        const lat = c[1];
        if (lng >= -88 && lng <= -79 && lat >= 24 && lat <= 31) {
            overlaps = true;
            break;
        }
    }
    
    if (overlaps) {
        const name = f.properties && (f.properties.NAME || f.properties.name || f.properties.ADMIN || '');
        console.log(`[${idx}] ID: "${f.id}", Name: "${name}"`);
    }
});
