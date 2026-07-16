const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

function getCenter(geom) {
    let sumLon = 0, sumLat = 0, count = 0;
    const processCoords = (arr) => {
        arr.forEach(pt => {
            sumLon += pt[0];
            sumLat += pt[1];
            count++;
        });
    };

    if (geom.type === 'Polygon') {
        processCoords(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach(poly => {
            processCoords(poly[0]);
        });
    }

    if (count > 0) {
        return [sumLon / count, sumLat / count];
    }
    return [0, 0];
}

console.log("Searching for targeted features in world-napoleonic.geojson:");
const targets = [
    'haiti', 'doming', 'hispan', 'jamaica', 'barbad', 'patagon', 'mapuch', 'chile',
    'colombia', 'venezuela', 'ecuador', 'peru', 'granada', 'plata', 'argentina', 'uruguay',
    'paraguay', 'bolivia', 'ontario', 'toronto', 'canada', 'quebec', 'acadia', 'nova_scotia'
];

data.features.forEach(f => {
    const id = String(f.id).toLowerCase();
    const name = String(f.properties.name || '').toLowerCase();
    
    let matched = false;
    for (const t of targets) {
        if (id.includes(t) || name.includes(t)) {
            matched = true;
            break;
        }
    }
    
    // Also print features in southern South America (Patagonia)
    let center = getCenter(f.geometry);
    const [lon, lat] = center;
    if (lat < -35 && lon > -85 && lon < -40) {
        matched = true;
    }
    
    if (matched) {
        console.log(`- ID: "${f.id}", Name: "${f.properties.name || 'unnamed'}", Center: [${lon.toFixed(2)}, ${lat.toFixed(2)}]`);
    }
});
