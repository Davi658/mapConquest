const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const newSpain = data.features.find(f => f.id === 'vice_royalty_of_new_spain');
if (newSpain) {
    console.log("vice_royalty_of_new_spain geometry type:", newSpain.geometry.type);
    if (newSpain.geometry.type === 'MultiPolygon') {
        console.log("Number of polygons:", newSpain.geometry.coordinates.length);
        
        // Let's compute the center of each polygon in MultiPolygon to see if some are in the Caribbean
        newSpain.geometry.coordinates.forEach((poly, idx) => {
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
    }
} else {
    console.log("vice_royalty_of_new_spain not found!");
}
