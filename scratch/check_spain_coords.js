const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const spain = data.features.find(f => f.id === 'spain');
if (spain) {
    console.log("spain geometry type:", spain.geometry.type);
    if (spain.geometry.type === 'MultiPolygon') {
        console.log("Number of polygons:", spain.geometry.coordinates.length);
        spain.geometry.coordinates.forEach((poly, idx) => {
            let sumLon = 0, sumLat = 0, count = 0;
            poly[0].forEach(pt => {
                sumLon += pt[0];
                sumLat += pt[1];
                count++;
            });
            const lon = sumLon / count;
            const lat = sumLat / count;
            console.log(`Polygon ${idx}: Center = [${lon.toFixed(2)}, ${lat.toFixed(2)}]`);
        });
    } else {
        console.log("Not a MultiPolygon");
    }
} else {
    console.log("spain not found!");
}
