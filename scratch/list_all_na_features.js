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

console.log("Listing all features in North American bounding box:");
const naFeatures = [];
data.features.forEach(f => {
    let center = getCenter(f.geometry);
    const [lon, lat] = center;
    // Bounding box for North America: Lat 24 to 85, Lon -170 to -50
    if (lat >= 22 && lat <= 85 && lon >= -170 && lon <= -50) {
        naFeatures.push({
            id: f.id,
            name: f.properties.name || 'unnamed',
            center: [lon, lat]
        });
    }
});

// Sort by latitude (North to South) then longitude (West to East)
naFeatures.sort((a, b) => b.center[1] - a.center[1]);

naFeatures.forEach(f => {
    console.log(`- ID: "${f.id}", Name: "${f.name}", Center: [${f.center[0].toFixed(2)}, ${f.center[1].toFixed(2)}]`);
});
