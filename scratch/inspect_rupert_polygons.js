const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const rupert = data.features[149];
console.log("Rupert's Land geometry type:", rupert.geometry.type);
console.log("Number of polygons:", rupert.geometry.coordinates.length);

rupert.geometry.coordinates.forEach((poly, pIdx) => {
    const coords = poly[0];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    coords.forEach(c => {
        const lng = c[0];
        const lat = c[1];
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    console.log(`  Polygon [${pIdx}] has ${coords.length} points.`);
    console.log(`    BBox: Lng [${minLng.toFixed(3)}, ${maxLng.toFixed(3)}], Lat [${minLat.toFixed(3)}, ${maxLat.toFixed(3)}]`);
});
