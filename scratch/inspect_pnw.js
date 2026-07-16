const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Checking features in the Pacific Northwest (-130 to -115, 42 to 55):");

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
        if (lng >= -130 && lng <= -115 && lat >= 42 && lat <= 55) {
            overlaps = true;
            break;
        }
    }
    
    if (overlaps) {
        const name = f.properties && (f.properties.NAME || f.properties.name || f.properties.ADMIN || f.properties.Entity || '');
        console.log(`[${idx}] ID: "${f.id}", Name: "${name}"`);
    }
});
