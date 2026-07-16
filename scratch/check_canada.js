const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// Function to calculate center of polygon/multipolygon
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

console.log("Analyzing Canada region features:");
data.features.forEach(f => {
    let center = getCenter(f.geometry);
    const [lon, lat] = center;
    // Canada region box: Lat > 45, Lon between -145 and -50
    if (lat > 42 && lon < -45 && lon > -145) {
        console.log(`- ID: "${f.id}", Name: "${f.properties.name || 'unnamed'}", Center: [${lon.toFixed(2)}, ${lat.toFixed(2)}]`);
    }
});
